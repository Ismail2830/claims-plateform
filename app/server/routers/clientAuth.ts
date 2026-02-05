import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, publicProcedure, clientProtected } from '../../lib/trpc';
import { authenticateClient, registerClient } from '../../lib/auth';
import { prisma } from '../../lib/prisma';

export const clientAuthRouter = createTRPCRouter({
  // Client Login
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email('Invalid email address'),
        password: z.string().min(6, 'Password must be at least 6 characters'),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const { email, password } = input;
        const result = await authenticateClient(email, password);
        
        return {
          success: true,
          message: 'Login successful',
          data: result,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: error instanceof Error ? error.message : 'Authentication failed',
        });
      }
    }),

  // Client Registration
  register: publicProcedure
    .input(
      z.object({
        cin: z.string().min(1, 'CIN is required'),
        firstName: z.string().min(1, 'First name is required'),
        lastName: z.string().min(1, 'Last name is required'),
        email: z.string().email('Invalid email address'),
        password: z.string().min(6, 'Password must be at least 6 characters'),
        phone: z.string().min(1, 'Phone number is required'),
        dateOfBirth: z.date(),
        address: z.string().min(1, 'Address is required'),
        city: z.string().min(1, 'City is required'),
        province: z.string().min(1, 'Province is required'),
        postalCode: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const client = await registerClient(input);
        
        return {
          success: true,
          message: 'Registration successful. Please verify your email.',
          data: client,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error instanceof Error ? error.message : 'Registration failed',
        });
      }
    }),

  // Get Client Profile (Protected)
  getProfile: clientProtected
    .query(async ({ ctx }) => {
      try {
        const client = await prisma.client.findUnique({
          where: { clientId: ctx.client.clientId },
          select: {
            clientId: true,
            cin: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            dateOfBirth: true,
            address: true,
            city: true,
            province: true,
            postalCode: true,
            status: true,
            emailVerified: true,
            phoneVerified: true,
            documentVerified: true,
            createdAt: true,
            lastLoginAt: true,
          },
        });

        if (!client) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Client not found',
          });
        }

        return {
          success: true,
          data: client,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch profile',
        });
      }
    }),

  // Update Client Profile (Protected)
  updateProfile: clientProtected
    .input(
      z.object({
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        phone: z.string().min(1).optional(),
        address: z.string().min(1).optional(),
        city: z.string().min(1).optional(),
        province: z.string().min(1).optional(),
        postalCode: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const updatedClient = await prisma.client.update({
          where: { clientId: ctx.client.clientId },
          data: input,
          select: {
            clientId: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            address: true,
            city: true,
            province: true,
            postalCode: true,
            updatedAt: true,
          },
        });

        return {
          success: true,
          message: 'Profile updated successfully',
          data: updatedClient,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update profile',
        });
      }
    }),

  // Get Client's Policies (Protected)
  getPolicies: clientProtected
    .query(async ({ ctx }) => {
      try {
        const policies = await prisma.policy.findMany({
          where: { clientId: ctx.client.clientId },
          select: {
            policyId: true,
            policyNumber: true,
            policyType: true,
            coverageType: true,
            startDate: true,
            endDate: true,
            premiumAmount: true,
            insuredAmount: true,
            deductible: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        });

        return {
          success: true,
          data: policies,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch policies',
        });
      }
    }),

  // Get Client's Claims (Protected)
  getClaims: clientProtected
    .input(
      z.object({
        status: z.enum(['DECLARED', 'ANALYZING', 'DOCS_REQUIRED', 'UNDER_EXPERTISE', 'IN_DECISION', 'APPROVED', 'IN_PAYMENT', 'CLOSED', 'REJECTED']).optional(),
        limit: z.number().min(1).max(100).default(10),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const where: any = { clientId: ctx.client.clientId };
        
        if (input.status) {
          where.status = input.status;
        }

        const [claims, total] = await Promise.all([
          prisma.claim.findMany({
            where,
            select: {
              claimId: true,
              claimNumber: true,
              claimType: true,
              incidentDate: true,
              declarationDate: true,
              incidentLocation: true,
              description: true,
              claimedAmount: true,
              estimatedAmount: true,
              approvedAmount: true,
              status: true,
              priority: true,
              declarationChannel: true,
              policy: {
                select: {
                  policyNumber: true,
                  policyType: true,
                },
              },
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: input.limit,
            skip: input.offset,
          }),
          prisma.claim.count({ where }),
        ]);

        return {
          success: true,
          data: {
            claims,
            total,
            hasMore: input.offset + input.limit < total,
          },
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch claims',
        });
      }
    }),

  // Create New Claim (Protected)
  createClaim: clientProtected
    .input(
      z.object({
        policyId: z.string(),
        incidentDate: z.string(),
        incidentTime: z.string(),
        incidentLocation: z.string(),
        description: z.string(),
        claimType: z.enum(['ACCIDENT', 'THEFT', 'FIRE', 'WATER_DAMAGE']),
        claimedAmount: z.number().positive(),
        damageDescription: z.string(),
        witnesses: z.array(z.object({
          name: z.string(),
          phone: z.string().optional(),
          email: z.string().email().optional()
        })).optional(),
        policeReport: z.boolean().default(false),
        policeReportNumber: z.string().optional(),
        emergencyServices: z.boolean().default(false),
        emergencyServicesDetails: z.string().optional(),
        additionalNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Verify that the policy belongs to this client and is active
        const policy = await prisma.policy.findFirst({
          where: {
            policyId: input.policyId,
            clientId: ctx.client.clientId,
            status: 'ACTIVE'
          }
        });

        if (!policy) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Policy not found or not active',
          });
        }

        // Generate unique claim number
        const claimNumber = `CLM-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
        
        // Combine date and time for incident timestamp
        const incidentDateTime = new Date(`${input.incidentDate}T${input.incidentTime}`);

        // Create the claim in a transaction
        const result = await prisma.$transaction(async (tx) => {
          // Create the claim
          const newClaim = await tx.claim.create({
            data: {
              claimNumber,
              policyId: input.policyId,
              clientId: ctx.client.clientId,
              claimType: input.claimType,
              incidentDate: incidentDateTime,
              declarationDate: new Date(),
              incidentLocation: input.incidentLocation,
              description: input.description,
              claimedAmount: input.claimedAmount,
              status: 'DECLARED',
              priority: 'NORMAL',
              declarationChannel: 'WEB',
              damageDescription: input.damageDescription,
              policeReport: input.policeReport,
              policeReportNumber: input.policeReport ? input.policeReportNumber : null,
              emergencyServices: input.emergencyServices,
              emergencyServicesDetails: input.emergencyServices ? input.emergencyServicesDetails : null,
              additionalNotes: input.additionalNotes || null
            }
          });

          // Add witnesses if any
          if (input.witnesses && input.witnesses.length > 0) {
            const validWitnesses = input.witnesses.filter(w => w.name && w.name.trim());
            
            for (const witness of validWitnesses) {
              await tx.claimWitness.create({
                data: {
                  claimId: newClaim.claimId,
                  name: witness.name,
                  phone: witness.phone || null,
                  email: witness.email || null
                }
              });
            }
          }

          // Create status history entry
          await tx.claimStatusHistory.create({
            data: {
              claimId: newClaim.claimId,
              fromStatus: null,
              toStatus: 'DECLARED',
              changedBy: ctx.client.clientId,
              reason: 'Initial claim declaration',
              notes: 'Claim created by client through web portal'
            }
          });

          // Log the activity
          await tx.auditLog.create({
            data: {
              entityType: 'CLAIM',
              entityId: newClaim.claimId,
              claimId: newClaim.claimId,
              action: 'CREATE',
              description: `Claim ${claimNumber} created by client`,
              clientId: ctx.client.clientId,
              metadata: {
                claimNumber,
                claimType: input.claimType,
                claimedAmount: input.claimedAmount,
                incidentDate: incidentDateTime.toISOString(),
                incidentLocation: input.incidentLocation
              }
            }
          });

          return newClaim;
        });

        return {
          success: true,
          message: 'Claim created successfully',
          data: {
            claimId: result.claimId,
            claimNumber: result.claimNumber,
            status: result.status,
            createdAt: result.createdAt
          }
        };

      } catch (error) {
        console.error('Error creating claim:', error);
        
        if (error instanceof TRPCError) {
          throw error;
        }
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create claim',
        });
      }
    }),

  // Verify Email (Public but requires token in input)
  verifyEmail: publicProcedure
    .input(
      z.object({
        clientId: z.string(),
        verificationCode: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // In a real app, you'd verify the code against a stored value
        const updatedClient = await prisma.client.update({
          where: { clientId: input.clientId },
          data: { emailVerified: true },
        });

        return {
          success: true,
          message: 'Email verified successfully',
        };
      } catch (error) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid verification code or client not found',
        });
      }
    }),
});