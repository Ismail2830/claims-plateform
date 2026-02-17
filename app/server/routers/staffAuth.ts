import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, publicProcedure, staffProtected, managerOnly, adminOnly, expertAndAbove } from '../../lib/trpc';
import { authenticateStaff, registerStaff } from '../../lib/auth';
import { EventBroadcaster } from '../../api/real-time/route';
import { prisma } from '../../lib/prisma';

export const staffAuthRouter = createTRPCRouter({
  // Staff Login
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
        const result = await authenticateStaff(email, password);
        
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

  // Staff Registration (Admin Only)
  register: adminOnly
    .input(
      z.object({
        email: z.string().email('Invalid email address'),
        password: z.string().min(6, 'Password must be at least 6 characters'),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        role: z.enum(['SUPER_ADMIN', 'MANAGER_SENIOR', 'MANAGER_JUNIOR', 'EXPERT']),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const user = await registerStaff(input);
        
        return {
          success: true,
          message: 'Staff member registered successfully',
          data: user,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error instanceof Error ? error.message : 'Registration failed',
        });
      }
    }),

  // Get Staff Profile (Protected)
  getProfile: staffProtected
    .query(async ({ ctx }) => {
      try {
        const user = await prisma.user.findUnique({
          where: { userId: ctx.staff.userId },
          select: {
            userId: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            currentWorkload: true,
            maxWorkload: true,
            isActive: true,
            lastLogin: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        if (!user) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'User not found',
          });
        }

        return {
          success: true,
          data: user,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch profile',
        });
      }
    }),

  // Update Staff Profile (Protected)
  updateProfile: staffProtected
    .input(
      z.object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        maxWorkload: z.number().min(1).max(100).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const updatedUser = await prisma.user.update({
          where: { userId: ctx.staff.userId },
          data: input,
          select: {
            userId: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            currentWorkload: true,
            maxWorkload: true,
            updatedAt: true,
          },
        });

        return {
          success: true,
          message: 'Profile updated successfully',
          data: updatedUser,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update profile',
        });
      }
    }),

  // Get Assigned Claims (Staff Protected)
  getAssignedClaims: staffProtected
    .input(
      z.object({
        status: z.enum(['DECLARED', 'ANALYZING', 'DOCS_REQUIRED', 'UNDER_EXPERTISE', 'IN_DECISION', 'APPROVED', 'IN_PAYMENT', 'CLOSED', 'REJECTED']).optional(),
        priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const where: any = { assignedTo: ctx.staff.userId };
        
        if (input.status) {
          where.status = input.status;
        }
        
        if (input.priority) {
          where.priority = input.priority;
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
              riskScore: true,
              fraudScore: true,
              client: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                  phone: true,
                },
              },
              policy: {
                select: {
                  policyNumber: true,
                  policyType: true,
                  insuredAmount: true,
                },
              },
              createdAt: true,
            },
            orderBy: [
              { priority: 'desc' },
              { createdAt: 'desc' },
            ],
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

  // Get All Claims (Manager Only)
  getAllClaims: managerOnly
    .input(
      z.object({
        status: z.enum(['DECLARED', 'ANALYZING', 'DOCS_REQUIRED', 'UNDER_EXPERTISE', 'IN_DECISION', 'APPROVED', 'IN_PAYMENT', 'CLOSED', 'REJECTED']).optional(),
        priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
        claimType: z.enum(['ACCIDENT', 'THEFT', 'FIRE', 'WATER_DAMAGE']).optional(),
        assignedTo: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      try {
        const where: any = {};
        
        if (input.status) where.status = input.status;
        if (input.priority) where.priority = input.priority;
        if (input.claimType) where.claimType = input.claimType;
        if (input.assignedTo) where.assignedTo = input.assignedTo;

        const [claims, total] = await Promise.all([
          prisma.claim.findMany({
            where,
            select: {
              claimId: true,
              claimNumber: true,
              claimType: true,
              incidentDate: true,
              declarationDate: true,
              claimedAmount: true,
              estimatedAmount: true,
              approvedAmount: true,
              status: true,
              priority: true,
              riskScore: true,
              fraudScore: true,
              client: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
              assignedUser: {
                select: {
                  firstName: true,
                  lastName: true,
                  role: true,
                },
              },
              policy: {
                select: {
                  policyNumber: true,
                  policyType: true,
                },
              },
              createdAt: true,
            },
            orderBy: [
              { priority: 'desc' },
              { createdAt: 'desc' },
            ],
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

  // Assign Claim to Staff (Manager Only)
  assignClaim: managerOnly
    .input(
      z.object({
        claimId: z.string(),
        assignToUserId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Check if target user exists and is active
        const targetUser = await prisma.user.findUnique({
          where: { userId: input.assignToUserId },
          select: {
            userId: true,
            currentWorkload: true,
            maxWorkload: true,
            isActive: true,
          },
        });

        if (!targetUser || !targetUser.isActive) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Target user not found or inactive',
          });
        }

        if (targetUser.currentWorkload >= targetUser.maxWorkload) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'User has reached maximum workload capacity',
          });
        }

        // Update claim assignment and user workload
        const result = await prisma.$transaction(async (tx) => {
          // Get claim details for logging
          const claim = await tx.claim.findUnique({
            where: { claimId: input.claimId },
            select: { claimNumber: true, clientId: true, assignedTo: true }
          });
          
          if (!claim) {
            throw new Error('Claim not found');
          }
          
          // Update claim assignment
          await tx.claim.update({
            where: { claimId: input.claimId },
            data: { assignedTo: input.assignToUserId },
          });
          
          // Update user workload
          await tx.user.update({
            where: { userId: input.assignToUserId },
            data: { currentWorkload: { increment: 1 } },
          });
          
          // Log assignment activity for client feed
          const assignmentAuditLog = await tx.auditLog.create({
            data: {
              entityType: 'CLAIM',
              entityId: input.claimId,
              claimId: input.claimId,
              clientId: claim.clientId,
              userId: ctx.staff.userId,
              action: 'ASSIGN',
              description: `Your claim ${claim.claimNumber} was assigned to an expert for review`,
              metadata: {
                claimNumber: claim.claimNumber,
                assignedTo: input.assignToUserId,
                assignedBy: ctx.staff.userId,
                oldAssignment: claim.assignedTo
              },
              riskLevel: 'LOW'
            }
          });
          
          return claim;
        });

        return {
          success: true,
          message: 'Claim assigned successfully',
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to assign claim',
        });
      }
    }),

  // Get Team Workload (Manager Only)
  getTeamWorkload: managerOnly
    .query(async () => {
      try {
        const users = await prisma.user.findMany({
          where: { isActive: true },
          select: {
            userId: true,
            firstName: true,
            lastName: true,
            role: true,
            currentWorkload: true,
            maxWorkload: true,
          },
          orderBy: { role: 'asc' },
        });

        return {
          success: true,
          data: users,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch team workload',
        });
      }
    }),

  // Dashboard Stats (Manager and Above)
  getDashboardStats: managerOnly
    .query(async () => {
      try {
        const [
          totalClaims,
          pendingClaims,
          approvedClaims,
          rejectedClaims,
          highPriorityClaims,
          avgProcessingTime,
        ] = await Promise.all([
          prisma.claim.count(),
          prisma.claim.count({ where: { status: 'DECLARED' } }),
          prisma.claim.count({ where: { status: 'APPROVED' } }),
          prisma.claim.count({ where: { status: 'REJECTED' } }),
          prisma.claim.count({ where: { priority: 'HIGH' } }),
          // Calculate average processing time (simplified)
          prisma.claim.findMany({
            where: {
              status: { in: ['APPROVED', 'REJECTED'] },
              createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
            },
            select: {
              createdAt: true,
              updatedAt: true,
            },
          }),
        ]);

        // Calculate average processing time in days
        const avgDays = avgProcessingTime.length > 0 
          ? avgProcessingTime.reduce((acc, claim) => 
              acc + (claim.updatedAt.getTime() - claim.createdAt.getTime()) / (1000 * 60 * 60 * 24), 0
            ) / avgProcessingTime.length 
          : 0;

        return {
          success: true,
          data: {
            totalClaims,
            pendingClaims,
            approvedClaims,
            rejectedClaims,
            highPriorityClaims,
            avgProcessingDays: Math.round(avgDays * 100) / 100,
          },
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch dashboard stats',
        });
      }
    }),
});