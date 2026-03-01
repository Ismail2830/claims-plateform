import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, publicProcedure, clientProtected } from '../../lib/trpc';
import { authenticateClient, registerClient, hashPassword, verifyPassword } from '../../lib/auth';
import { prisma } from '../../lib/prisma';
import { generateOtp, storeOtp, verifyOtp, sendEmailOtp } from '../../lib/otp';

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
            twoFactorEnabled: true,
            twoFactorMethod: true,
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
    }),

  // Update Client Profile (Protected)
  updateProfile: clientProtected
    .input(
      z.object({
        firstName:   z.string().min(1).max(100).optional(),
        lastName:    z.string().min(1).max(100).optional(),
        email:       z.string().email().optional(),
        phone:       z.string().min(1).optional(),
        dateOfBirth: z.string().optional(), // ISO date string YYYY-MM-DD
        cin:         z.string().min(4).optional(),
        street:      z.string().min(1).optional(), // maps to address column
        city:        z.string().min(1).optional(),
        province:    z.string().min(1).optional(),
        postalCode:  z.string().optional(),
        // country is not yet in the DB schema — ignored until a migration adds it
      })
    )
    .mutation(async ({ ctx, input }) => {
      const clientId = ctx.client.clientId;

      // ── Uniqueness checks for fields that have @unique constraints ──
      if (input.email) {
        const existing = await prisma.client.findUnique({ where: { email: input.email } });
        if (existing && existing.clientId !== clientId) {
          throw new TRPCError({ code: 'CONFLICT', message: 'Email is already in use by another account.' });
        }
      }
      if (input.phone) {
        const existing = await prisma.client.findUnique({ where: { phone: input.phone } });
        if (existing && existing.clientId !== clientId) {
          throw new TRPCError({ code: 'CONFLICT', message: 'Phone number is already in use by another account.' });
        }
      }
      if (input.cin) {
        const existing = await prisma.client.findUnique({ where: { cin: input.cin } });
        if (existing && existing.clientId !== clientId) {
          throw new TRPCError({ code: 'CONFLICT', message: 'National ID (CIN) is already in use by another account.' });
        }
      }

      // ── Build update payload (map street → address, parse dateOfBirth) ──
      const updateData: Record<string, unknown> = {};
      if (input.firstName   !== undefined) updateData.firstName   = input.firstName;
      if (input.lastName    !== undefined) updateData.lastName    = input.lastName;
      if (input.email       !== undefined) updateData.email       = input.email;
      if (input.phone       !== undefined) updateData.phone       = input.phone;
      if (input.cin         !== undefined) updateData.cin         = input.cin;
      if (input.street      !== undefined) updateData.address     = input.street; // street → address
      if (input.city        !== undefined) updateData.city        = input.city;
      if (input.province    !== undefined) updateData.province    = input.province;
      if (input.postalCode  !== undefined) updateData.postalCode  = input.postalCode;
      if (input.dateOfBirth !== undefined) {
        const parsed = new Date(input.dateOfBirth);
        if (isNaN(parsed.getTime())) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid date of birth.' });
        }
        updateData.dateOfBirth = parsed;
      }

      try {
        const updatedClient = await prisma.client.update({
          where: { clientId },
          data: updateData,
          select: {
            clientId:       true,
            firstName:      true,
            lastName:       true,
            email:          true,
            phone:          true,
            cin:            true,
            dateOfBirth:    true,
            address:        true,
            city:           true,
            province:       true,
            postalCode:     true,
            emailVerified:  true,
            phoneVerified:  true,
            documentVerified: true,
            status:         true,
            updatedAt:      true,
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

  // ─── Send Verification OTP (email or phone) ─────────────────────
  sendVerificationOtp: clientProtected
    .input(z.object({ type: z.enum(['email', 'phone']) }))
    .mutation(async ({ ctx, input }) => {
      const client = await prisma.client.findUnique({
        where: { clientId: ctx.client.clientId },
        select: { email: true, phone: true, emailVerified: true, phoneVerified: true },
      });
      if (!client) throw new TRPCError({ code: 'NOT_FOUND', message: 'Client not found' });

      if (input.type === 'email' && client.emailVerified)
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Email is already verified' });
      if (input.type === 'phone' && client.phoneVerified)
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Phone is already verified' });

      const code = generateOtp();
      const purpose = input.type === 'email' ? 'email_verify' : 'phone_verify';
      const identifier = input.type === 'email' ? client.email : client.phone;
      storeOtp(purpose, identifier, code);

      if (input.type === 'email') {
        await sendEmailOtp(client.email, code, purpose);
      } else {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Phone OTP is not available. Please use email verification.' });
      }

      return { success: true, message: `OTP sent to your ${input.type}` };
    }),

  // ─── Verify Contact OTP (email or phone) ────────────────────────
  verifyContactOtp: clientProtected
    .input(z.object({ type: z.enum(['email', 'phone']), code: z.string().length(6) }))
    .mutation(async ({ ctx, input }) => {
      const client = await prisma.client.findUnique({
        where: { clientId: ctx.client.clientId },
        select: { email: true, phone: true },
      });
      if (!client) throw new TRPCError({ code: 'NOT_FOUND', message: 'Client not found' });

      const purpose = input.type === 'email' ? 'email_verify' : 'phone_verify';
      const identifier = input.type === 'email' ? client.email : client.phone;
      const valid = verifyOtp(purpose, identifier, input.code);

      if (!valid)
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid or expired OTP' });

      const updateField = input.type === 'email' ? { emailVerified: true } : { phoneVerified: true };
      await prisma.client.update({ where: { clientId: ctx.client.clientId }, data: updateField });

      return { success: true, message: `${input.type === 'email' ? 'Email' : 'Phone'} verified successfully` };
    }),

  // ─── Update 2FA Preference ───────────────────────────────────────
  update2FAPreference: clientProtected
    .input(
      z.object({
        enabled: z.boolean(),
        method: z.enum(['email', 'phone']).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const client = await prisma.client.findUnique({
        where: { clientId: ctx.client.clientId },
        select: { emailVerified: true, phoneVerified: true },
      });
      if (!client) throw new TRPCError({ code: 'NOT_FOUND', message: 'Client not found' });

      if (input.enabled) {
        const method = input.method ?? 'email';
        if (method === 'email' && !client.emailVerified)
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Please verify your email before enabling 2FA via email' });
        if (method === 'phone' && !client.phoneVerified)
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Please verify your phone before enabling 2FA via phone' });

        await prisma.client.update({
          where: { clientId: ctx.client.clientId },
          data: { twoFactorEnabled: true, twoFactorMethod: method },
        });
        return { success: true, message: `2FA enabled via ${method}` };
      } else {
        await prisma.client.update({
          where: { clientId: ctx.client.clientId },
          data: { twoFactorEnabled: false, twoFactorMethod: null },
        });
        return { success: true, message: '2FA disabled' };
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
            _count: { select: { claims: true } },
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

  // Get Single Policy Detail with Claims (Protected)
  getPolicyDetail: clientProtected
    .input(z.object({ policyId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      try {
        const policy = await prisma.policy.findFirst({
          where: {
            policyId: input.policyId,
            clientId: ctx.client.clientId, // ownership check
          },
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
            claims: {
              select: {
                claimId: true,
                claimNumber: true,
                claimType: true,
                incidentDate: true,
                claimedAmount: true,
                approvedAmount: true,
                status: true,
                priority: true,
                createdAt: true,
              },
              orderBy: { createdAt: 'desc' },
            },
          },
        });

        if (!policy) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Policy not found' });
        }

        return { success: true, data: policy };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch policy',
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
            const validWitnesses = input.witnesses.filter((w: any) => w.name && w.name.trim());
            
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
              changedBy: null, // Client-initiated, not changed by a staff user
              reason: 'Initial claim declaration',
              notes: 'Claim created by client through web portal'
            }
          });

          // Log the activity
          const claimAuditLog = await tx.auditLog.create({
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

  // Get Dashboard Statistics (Protected)
  getDashboardStats: clientProtected
    .query(async ({ ctx }) => {
      try {
        const clientId = ctx.client.clientId;
        
        // Get claims statistics
        const [totalClaims, pendingClaims, approvedClaims, rejectedClaims] = await Promise.all([
          prisma.claim.count({ where: { clientId } }),
          prisma.claim.count({ where: { clientId, status: { in: ['DECLARED', 'ANALYZING', 'DOCS_REQUIRED', 'UNDER_EXPERTISE', 'IN_DECISION'] } } }),
          prisma.claim.count({ where: { clientId, status: 'APPROVED' } }),
          prisma.claim.count({ where: { clientId, status: 'REJECTED' } }),
        ]);

        // Get policies statistics
        const [activePolicies, totalCoverage] = await Promise.all([
          prisma.policy.count({ where: { clientId, status: 'ACTIVE' } }),
          prisma.policy.aggregate({
            where: { clientId, status: 'ACTIVE' },
            _sum: { insuredAmount: true }
          })
        ]);

        return {
          success: true,
          data: {
            totalClaims,
            pendingClaims,
            approvedClaims,
            rejectedClaims,
            activePolicies,
            // Convert Prisma Decimal to plain number for safe serialization
            totalCoverage: Number(totalCoverage._sum.insuredAmount) || 0,
          },
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch dashboard stats',
        });
      }
    }),

  // Get Recent Activities (Protected)
  getRecentActivities: clientProtected
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const clientId = ctx.client.clientId;
        
        // Get multiple types of activities in parallel
        const [auditLogs, statusHistory, documentActivities] = await Promise.all([
          // Get recent audit logs for this client
          prisma.auditLog.findMany({
            where: { clientId },
            select: {
              logId: true,
              action: true,
              description: true,
              entityType: true,
              entityId: true,
              createdAt: true,
              oldValues: true,
              newValues: true,
              metadata: true,
              claim: {
                select: {
                  claimNumber: true,
                  status: true,
                  claimedAmount: true,
                }
              }
            },
            orderBy: { createdAt: 'desc' },
            take: Math.min(input.limit * 2, 100), // Get more to have options after filtering
          }),

          // Get status changes for client's claims
          prisma.claimStatusHistory.findMany({
            where: {
              claim: { clientId }
            },
            select: {
              historyId: true,
              fromStatus: true,
              toStatus: true,
              reason: true,
              notes: true,
              createdAt: true,
              changedByUser: {
                select: {
                  firstName: true,
                  lastName: true,
                  role: true,
                }
              },
              claim: {
                select: {
                  claimNumber: true,
                  claimType: true,
                }
              }
            },
            orderBy: { createdAt: 'desc' },
            take: Math.min(input.limit, 50),
          }),

          // Get document activities for client's claims  
          prisma.claimDocument.findMany({
            where: {
              claim: { clientId },
              createdAt: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
              }
            },
            select: {
              documentId: true,
              fileName: true,
              fileType: true,
              status: true,
              createdAt: true,
              verifiedAt: true,
              uploadedByClient: true,
              uploadedByUser: {
                select: {
                  firstName: true,
                  lastName: true,
                  role: true,
                }
              },
              verifiedByUser: {
                select: {
                  firstName: true,
                  lastName: true,
                }
              },
              claim: {
                select: {
                  claimNumber: true,
                }
              }
            },
            orderBy: { createdAt: 'desc' },
            take: Math.min(input.limit, 30),
          })
        ]);

        // Combine and format all activities
        const allActivities: any[] = [];

        // Process audit logs
        auditLogs.forEach((activity) => {
          let type = 'Activity';
          let description = activity.description;
          let status: 'info' | 'success' | 'warning' | 'error' = 'info';
          
          if (activity.entityType === 'CLAIM') {
            if (activity.action === 'CREATE') {
              type = 'Claim Created';
              description = `Claim ${activity.claim?.claimNumber || 'new claim'} was submitted`;
              status = 'info';
            } else if (activity.action === 'UPDATE') {
              type = 'Claim Modified';
              
              // Try to extract specific changes from metadata or oldValues/newValues
              if (activity.metadata && typeof activity.metadata === 'object') {
                const meta = activity.metadata as any;
                if (meta.claimedAmount || meta.estimatedAmount) {
                  description = `Claim ${activity.claim?.claimNumber || ''} amounts updated`;
                } else if (meta.assignedTo) {
                  description = `Claim ${activity.claim?.claimNumber || ''} was assigned to an expert`;
                } else {
                  description = `Claim ${activity.claim?.claimNumber || ''} was updated`;
                }
              } else {
                description = `Claim ${activity.claim?.claimNumber || ''} details were modified`;
              }
              
              status = activity.claim?.status === 'APPROVED' ? 'success' : 
                       activity.claim?.status === 'REJECTED' ? 'error' : 'warning';
            } else if (activity.action === 'ASSIGN') {
              type = 'Claim Assigned';
              description = `Claim ${activity.claim?.claimNumber || ''} was assigned to an expert for review`;
              status = 'info';
            } else if (activity.action === 'STATUS_CHANGE') {
              type = 'Status Updated';
              description = `Claim ${activity.claim?.claimNumber || ''} status was updated`;
              status = 'warning';
            }
          } else if (activity.entityType === 'POLICY') {
            if (activity.action === 'CREATE') {
              type = 'Policy Issued';
              description = `New policy was issued`;
              status = 'success';
            } else if (activity.action === 'UPDATE') {
              type = 'Policy Updated';
              description = `Policy was modified`;
              status = 'info';
            }
          } else if (activity.entityType === 'DOCUMENT') {
            if (activity.action === 'UPLOAD') {
              type = 'Document Uploaded';
              description = activity.description || 'Document uploaded to your claim';
              status = 'info';
            } else if (activity.action === 'APPROVE') {
              type = 'Document Approved';
              description = activity.description || 'Your document was approved';
              status = 'success';
            } else if (activity.action === 'REJECT') {
              type = 'Document Rejected';
              description = activity.description || 'Document requires attention';
              status = 'error';
            }
          }

          allActivities.push({
            id: activity.logId,
            type,
            description,
            timestamp: activity.createdAt,
            status,
            source: 'audit'
          });
        });

        // Process status history
        statusHistory.forEach((statusChange) => {
          const statusLabels: { [key: string]: string } = {
            DECLARED: 'Submitted',
            ANALYZING: 'Under Analysis',
            DOCS_REQUIRED: 'Documents Required',
            UNDER_EXPERTISE: 'Expert Review',
            IN_DECISION: 'Decision Pending',
            APPROVED: 'Approved',
            IN_PAYMENT: 'Payment Processing',
            CLOSED: 'Closed',
            REJECTED: 'Rejected'
          };

          let description = `Claim ${statusChange.claim?.claimNumber || ''} status changed`;
          if (statusChange.fromStatus && statusChange.toStatus) {
            description = `Claim ${statusChange.claim?.claimNumber || ''} updated from ${statusLabels[statusChange.fromStatus] || statusChange.fromStatus} to ${statusLabels[statusChange.toStatus] || statusChange.toStatus}`;
          } else if (statusChange.toStatus) {
            description = `Claim ${statusChange.claim?.claimNumber || ''} status set to ${statusLabels[statusChange.toStatus] || statusChange.toStatus}`;
          }

          if (statusChange.reason) {
            description += ` - ${statusChange.reason}`;
          }

          const status: 'info' | 'success' | 'warning' | 'error' = 
            statusChange.toStatus === 'APPROVED' ? 'success' :
            statusChange.toStatus === 'REJECTED' ? 'error' :
            statusChange.toStatus === 'DOCS_REQUIRED' ? 'warning' :
            'info';

          allActivities.push({
            id: statusChange.historyId,
            type: 'Status Change',
            description,
            timestamp: statusChange.createdAt,
            status,
            source: 'status'
          });
        });

        // Process document activities
        documentActivities.forEach((doc) => {
          const fileTypeLabels: { [key: string]: string } = {
            PHOTO: 'Photo',
            PDF: 'PDF Document',
            INVOICE: 'Invoice',
            ESTIMATE: 'Repair Estimate',
            POLICE_REPORT: 'Police Report',
            MEDICAL_REPORT: 'Medical Report',
            IDENTITY_DOCUMENT: 'ID Document',
            INSURANCE_CERTIFICATE: 'Insurance Certificate',
            OTHER: 'Document'
          };

          // Document upload activity
          if (doc.uploadedByClient === clientId) {
            allActivities.push({
              id: `${doc.documentId}_upload`,
              type: 'Document Uploaded',
              description: `${fileTypeLabels[doc.fileType] || 'Document'} uploaded for claim ${doc.claim?.claimNumber || ''}`,
              timestamp: doc.createdAt,
              status: 'info' as const,
              source: 'document'
            });
          }

          // Document verification activity
          if (doc.verifiedAt && doc.status === 'VERIFIED') {
            allActivities.push({
              id: `${doc.documentId}_verified`,
              type: 'Document Verified',
              description: `${fileTypeLabels[doc.fileType] || 'Document'} verified for claim ${doc.claim?.claimNumber || ''}`,
              timestamp: doc.verifiedAt,
              status: 'success' as const,
              source: 'document'
            });
          } else if (doc.status === 'REJECTED') {
            allActivities.push({
              id: `${doc.documentId}_rejected`,
              type: 'Document Issue',
              description: `${fileTypeLabels[doc.fileType] || 'Document'} for claim ${doc.claim?.claimNumber || ''} requires attention`,
              timestamp: doc.createdAt,
              status: 'error' as const,
              source: 'document'
            });
          }
        });

        // Sort all activities by timestamp and take the requested limit
        const sortedActivities = allActivities
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, input.limit)
          .map((activity: any) => ({
            id: activity.id,
            type: activity.type,
            description: activity.description,
            timestamp: activity.timestamp,
            status: activity.status
          }));

        return {
          success: true,
          data: sortedActivities,
        };
      } catch (error) {
        console.error('Error fetching recent activities:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch recent activities',
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

  // Change Password (Protected)
  changePassword: clientProtected
    .input(
      z.object({
        currentPassword: z.string().min(1, 'Current password is required'),
        newPassword: z.string().min(8, 'New password must be at least 8 characters'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const client = await prisma.client.findUnique({
        where: { clientId: ctx.client.clientId },
        select: { password: true },
      });

      if (!client) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Client not found' });
      }

      const isValid = await verifyPassword(input.currentPassword, client.password);
      if (!isValid) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Current password is incorrect' });
      }

      const newHash = await hashPassword(input.newPassword);
      await prisma.client.update({
        where: { clientId: ctx.client.clientId },
        data: { password: newHash },
      });

      return { success: true, message: 'Password changed successfully' };
    }),
});