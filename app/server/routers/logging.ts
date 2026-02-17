import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, publicProcedure, clientProtected, staffProtected, adminOnly } from '../../lib/trpc';
import { prisma } from '../../lib/prisma';

export const loggingRouter = createTRPCRouter({
  // Create Audit Log (Internal - can be called from server-side operations)
  createAuditLog: publicProcedure
    .input(
      z.object({
        entityType: z.enum(['CLAIM', 'CLIENT', 'USER', 'POLICY', 'DOCUMENT']),
        entityId: z.string().uuid(),
        action: z.enum([
          'CREATE', 'READ', 'UPDATE', 'DELETE', 
          'LOGIN', 'LOGOUT', 'UPLOAD', 'DOWNLOAD', 
          'APPROVE', 'REJECT', 'ASSIGN', 'UNASSIGN', 
          'STATUS_CHANGE'
        ]),
        description: z.string().min(1, 'Description is required'),
        claimId: z.string().uuid().optional(),
        userId: z.string().uuid().optional(),
        clientId: z.string().uuid().optional(),
        ipAddress: z.string().optional(),
        userAgent: z.string().optional(),
        sessionId: z.string().optional(),
        oldValues: z.any().optional(),
        newValues: z.any().optional(),
        metadata: z.any().optional(),
        riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('LOW'),
        isSuspicious: z.boolean().default(false),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const auditLog = await prisma.auditLog.create({
          data: {
            entityType: input.entityType,
            entityId: input.entityId,
            action: input.action,
            description: input.description,
            claimId: input.claimId,
            userId: input.userId,
            clientId: input.clientId,
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
            sessionId: input.sessionId,
            oldValues: input.oldValues,
            newValues: input.newValues,
            metadata: input.metadata,
            riskLevel: input.riskLevel,
            isSuspicious: input.isSuspicious,
          },
        });

        return {
          success: true,
          message: 'Audit log created successfully',
          data: { logId: auditLog.logId },
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create audit log',
        });
      }
    }),

  // Get Client's Activity Logs
  getClientActivityLogs: clientProtected
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        action: z.enum([
          'CREATE', 'READ', 'UPDATE', 'DELETE', 
          'LOGIN', 'LOGOUT', 'UPLOAD', 'DOWNLOAD', 
          'APPROVE', 'REJECT', 'ASSIGN', 'UNASSIGN', 
          'STATUS_CHANGE'
        ]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const where: any = { 
          clientId: ctx.client.clientId,
          // Only show client-relevant actions
          action: { 
            in: ['LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'UPLOAD'] 
          }
        };
        
        if (input.action) {
          where.action = input.action;
        }

        const [logs, total] = await Promise.all([
          prisma.auditLog.findMany({
            where,
            select: {
              logId: true,
              entityType: true,
              action: true,
              description: true,
              createdAt: true,
              metadata: true,
            },
            orderBy: { createdAt: 'desc' },
            take: input.limit,
            skip: input.offset,
          }),
          prisma.auditLog.count({ where }),
        ]);

        return {
          success: true,
          data: {
            logs,
            pagination: {
              total,
              limit: input.limit,
              offset: input.offset,
              hasMore: input.offset + input.limit < total,
            },
          },
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch activity logs',
        });
      }
    }),

  // Get All System Logs (Admin Only)
  getSystemLogs: adminOnly
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        entityType: z.enum(['CLAIM', 'CLIENT', 'USER', 'POLICY', 'DOCUMENT']).optional(),
        action: z.enum([
          'CREATE', 'READ', 'UPDATE', 'DELETE', 
          'LOGIN', 'LOGOUT', 'UPLOAD', 'DOWNLOAD', 
          'APPROVE', 'REJECT', 'ASSIGN', 'UNASSIGN', 
          'STATUS_CHANGE'
        ]).optional(),
        riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
        isSuspicious: z.boolean().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const where: any = {};
        
        if (input.entityType) where.entityType = input.entityType;
        if (input.action) where.action = input.action;
        if (input.riskLevel) where.riskLevel = input.riskLevel;
        if (input.isSuspicious !== undefined) where.isSuspicious = input.isSuspicious;
        
        if (input.startDate || input.endDate) {
          where.createdAt = {};
          if (input.startDate) where.createdAt.gte = input.startDate;
          if (input.endDate) where.createdAt.lte = input.endDate;
        }

        const [logs, total] = await Promise.all([
          prisma.auditLog.findMany({
            where,
            include: {
              userRef: {
                select: {
                  userId: true,
                  email: true,
                  role: true,
                }
              },
              clientRef: {
                select: {
                  clientId: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                }
              },
              claim: {
                select: {
                  claimId: true,
                  claimNumber: true,
                  claimType: true,
                  status: true,
                }
              }
            },
            orderBy: { createdAt: 'desc' },
            take: input.limit,
            skip: input.offset,
          }),
          prisma.auditLog.count({ where }),
        ]);

        return {
          success: true,
          data: {
            logs,
            pagination: {
              total,
              limit: input.limit,
              offset: input.offset,
              hasMore: input.offset + input.limit < total,
            },
          },
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch system logs',
        });
      }
    }),

  // Get Suspicious Activities (Admin/Manager Only)
  getSuspiciousActivities: staffProtected
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        riskLevel: z.enum(['MEDIUM', 'HIGH', 'CRITICAL']).optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const where: any = { 
          OR: [
            { isSuspicious: true },
            { riskLevel: { in: ['MEDIUM', 'HIGH', 'CRITICAL'] } }
          ]
        };
        
        if (input.riskLevel) {
          where.riskLevel = input.riskLevel;
        }

        const [logs, total] = await Promise.all([
          prisma.auditLog.findMany({
            where,
            include: {
              userRef: {
                select: {
                  userId: true,
                  email: true,
                  role: true,
                }
              },
              clientRef: {
                select: {
                  clientId: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                }
              },
              claim: {
                select: {
                  claimId: true,
                  claimNumber: true,
                  claimType: true,
                  status: true,
                }
              }
            },
            orderBy: { createdAt: 'desc' },
            take: input.limit,
            skip: input.offset,
          }),
          prisma.auditLog.count({ where }),
        ]);

        return {
          success: true,
          data: {
            logs,
            pagination: {
              total,
              limit: input.limit,
              offset: input.offset,
              hasMore: input.offset + input.limit < total,
            },
          },
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch suspicious activities',
        });
      }
    }),

  // Get System Statistics (Admin Only)
  getSystemStats: adminOnly
    .query(async () => {
      try {
        const [
          totalLogs,
          suspiciousLogs,
          highRiskLogs,
          loginAttempts,
          recentActivity,
        ] = await Promise.all([
          prisma.auditLog.count(),
          prisma.auditLog.count({ where: { isSuspicious: true } }),
          prisma.auditLog.count({ where: { riskLevel: { in: ['HIGH', 'CRITICAL'] } } }),
          prisma.auditLog.count({ 
            where: { 
              action: { in: ['LOGIN', 'LOGOUT'] },
              createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
            } 
          }),
          prisma.auditLog.count({
            where: {
              createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } // Last hour
            }
          }),
        ]);

        return {
          success: true,
          data: {
            totalLogs,
            suspiciousLogs,
            highRiskLogs,
            loginAttempts,
            recentActivity,
            riskDistribution: {
              low: totalLogs - (suspiciousLogs + highRiskLogs),
              medium: suspiciousLogs,
              high: highRiskLogs,
            },
          },
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch system statistics',
        });
      }
    }),
});