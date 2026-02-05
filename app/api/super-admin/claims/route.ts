// Super Admin Entity Management API - Claims
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { z } from 'zod';

// Validation schemas
const createClaimSchema = z.object({
  clientId: z.string().uuid(),
  policyId: z.string().uuid().optional(),
  claimNumber: z.string().min(1),
  claimType: z.enum(['ACCIDENT', 'THEFT', 'FIRE', 'WATER_DAMAGE']),
  incidentDate: z.string().transform((str) => new Date(str)),
  incidentLocation: z.string().optional(),
  description: z.string().min(1),
  damageDescription: z.string().optional(),
  claimedAmount: z.number().positive().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  assignedTo: z.string().uuid().optional(),
});

const updateClaimSchema = z.object({
  claimNumber: z.string().min(1).optional(),
  claimType: z.enum(['ACCIDENT', 'THEFT', 'FIRE', 'WATER_DAMAGE']).optional(),
  incidentDate: z.string().transform((str) => new Date(str)).optional(),
  incidentLocation: z.string().optional(),
  description: z.string().min(1).optional(),
  damageDescription: z.string().optional(),
  claimedAmount: z.number().positive().optional(),
  estimatedAmount: z.number().positive().optional(),
  approvedAmount: z.number().positive().optional(),
  status: z.enum(['DECLARED', 'ANALYZING', 'DOCS_REQUIRED', 'UNDER_EXPERTISE', 'IN_DECISION', 'APPROVED', 'IN_PAYMENT', 'CLOSED', 'REJECTED']).optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  assignedTo: z.string().uuid().nullable().optional(),
});

const reassignClaimsSchema = z.object({
  claimIds: z.array(z.string()),
  newExpertId: z.string().uuid().nullable(),
});

const bulkActionSchema = z.object({
  claimIds: z.array(z.string()),
  action: z.enum(['approve', 'reject', 'close', 'delete', 'prioritize']),
  reason: z.string().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
});

// GET - Fetch all claims with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const claimType = searchParams.get('claimType');
    const assignedTo = searchParams.get('assignedTo');
    const clientId = searchParams.get('clientId');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const skip = (page - 1) * limit;

    // Build filters
    const where: any = {};
    
    if (search) {
      where.OR = [
        { claimNumber: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { client: { firstName: { contains: search, mode: 'insensitive' } } },
        { client: { lastName: { contains: search, mode: 'insensitive' } } },
        { client: { email: { contains: search, mode: 'insensitive' } } },
        { policy: { policyNumber: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (claimType) {
      where.claimType = claimType;
    }

    if (assignedTo) {
      if (assignedTo === 'unassigned') {
        where.assignedTo = null;
      } else {
        where.assignedTo = assignedTo;
      }
    }

    if (clientId) {
      where.clientId = clientId;
    }

    // Fetch claims with pagination
    const [claims, totalCount] = await Promise.all([
      prisma.claim.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          client: {
            select: {
              clientId: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          policy: {
            select: {
              policyId: true,
              policyNumber: true,
              policyType: true,
              insuredAmount: true,
            },
          },
          assignedUser: {
            select: {
              userId: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
          _count: {
            select: {
              documents: true,
              comments: true,
            },
          },
        },
      }),
      prisma.claim.count({ where }),
    ]);

    // Calculate statistics
    const stats = await prisma.claim.groupBy({
      by: ['status', 'priority', 'claimType'],
      _count: true,
      _sum: {
        claimedAmount: true,
        approvedAmount: true,
      },
    });

    // Calculate workload statistics
    const workloadStats = await prisma.claim.groupBy({
      by: ['assignedTo'],
      where: {
        status: { notIn: ['CLOSED', 'REJECTED'] },
        assignedTo: { not: null },
      },
      _count: true,
    });

    // Get expert details for workload
    const expertIds = workloadStats.map(stat => stat.assignedTo).filter(Boolean);
    const experts = await prisma.user.findMany({
      where: { userId: { in: expertIds } },
      select: {
        userId: true,
        firstName: true,
        lastName: true,
        currentWorkload: true,
        maxWorkload: true,
      },
    });

    const expertWorkload = workloadStats.map(stat => ({
      expertId: stat.assignedTo,
      activeClaims: stat._count,
      expert: experts.find(e => e.userId === stat.assignedTo),
    }));

    return NextResponse.json({
      success: true,
      data: {
        claims,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
        },
        stats,
        expertWorkload,
      },
    });
  } catch (error) {
    console.error('Claims GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch claims' },
      { status: 500 }
    );
  }
}

// POST - Create new claim
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createClaimSchema.parse(body);

    // Check if client exists
    const client = await prisma.client.findUnique({
      where: { clientId: validatedData.clientId },
      select: { clientId: true, firstName: true, lastName: true, status: true },
    });

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      );
    }

    // Check if policy exists (if provided)
    let policy = null;
    if (validatedData.policyId) {
      policy = await prisma.policy.findUnique({
        where: { policyId: validatedData.policyId },
        select: { policyId: true, clientId: true, status: true, policyNumber: true },
      });

      if (!policy) {
        return NextResponse.json(
          { success: false, error: 'Policy not found' },
          { status: 404 }
        );
      }

      if (policy.clientId !== validatedData.clientId) {
        return NextResponse.json(
          { success: false, error: 'Policy does not belong to this client' },
          { status: 400 }
        );
      }

      if (policy.status !== 'ACTIVE') {
        return NextResponse.json(
          { success: false, error: 'Cannot create claim for inactive policy' },
          { status: 400 }
        );
      }
    }

    // Check if claim number already exists
    const existingClaim = await prisma.claim.findUnique({
      where: { claimNumber: validatedData.claimNumber },
    });

    if (existingClaim) {
      return NextResponse.json(
        { success: false, error: 'Claim number already exists' },
        { status: 400 }
      );
    }

    // Check if assigned expert exists and has capacity
    if (validatedData.assignedTo) {
      const expert = await prisma.user.findUnique({
        where: { userId: validatedData.assignedTo },
        select: { 
          userId: true, 
          firstName: true, 
          lastName: true, 
          role: true, 
          isActive: true,
          currentWorkload: true,
          maxWorkload: true,
        },
      });

      if (!expert) {
        return NextResponse.json(
          { success: false, error: 'Assigned expert not found' },
          { status: 404 }
        );
      }

      if (!expert.isActive) {
        return NextResponse.json(
          { success: false, error: 'Cannot assign to inactive expert' },
          { status: 400 }
        );
      }

      if (!['EXPERT', 'MANAGER_JUNIOR', 'MANAGER_SENIOR', 'SUPER_ADMIN'].includes(expert.role)) {
        return NextResponse.json(
          { success: false, error: 'User is not authorized to handle claims' },
          { status: 400 }
        );
      }

      if (expert.currentWorkload >= expert.maxWorkload) {
        return NextResponse.json(
          { success: false, error: 'Expert has reached maximum workload capacity' },
          { status: 400 }
        );
      }
    }

    // Create claim with transaction
    const claim = await prisma.$transaction(async (tx) => {
      const newClaim = await tx.claim.create({
        data: {
          ...validatedData,
          status: 'DECLARED',
          declarationDate: new Date(),
        },
        include: {
          client: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          policy: {
            select: {
              policyNumber: true,
              policyType: true,
            },
          },
          assignedUser: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      // Update expert workload if assigned
      if (validatedData.assignedTo) {
        await tx.user.update({
          where: { userId: validatedData.assignedTo },
          data: { currentWorkload: { increment: 1 } },
        });
      }

      // Create initial status history
      await tx.claimStatusHistory.create({
        data: {
          claimId: newClaim.claimId,
          toStatus: 'DECLARED',
          changedBy: null, // System-generated, no specific user
          reason: 'Claim created',
          isSystemGenerated: true,
        },
      });

      return newClaim;
    });

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        entityType: 'CLAIM',
        entityId: claim.claimId,
        claimId: claim.claimId,
        action: 'CREATE',
        description: `Claim created: ${claim.claimNumber} for ${client.firstName} ${client.lastName}`,
        newValues: { claim },
        riskLevel: 'MEDIUM',
      },
    });

    return NextResponse.json({
      success: true,
      data: claim,
      message: 'Claim created successfully',
    });
  } catch (error) {
    console.error('Claims POST error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to create claim' },
      { status: 500 }
    );
  }
}

// PUT - Update claim (Super Admin override capability)
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const claimId = searchParams.get('id');

    if (!claimId) {
      return NextResponse.json(
        { success: false, error: 'Claim ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = updateClaimSchema.parse(body);

    // Check if claim exists
    const existingClaim = await prisma.claim.findUnique({
      where: { claimId },
      include: {
        client: {
          select: { firstName: true, lastName: true },
        },
        assignedUser: {
          select: { userId: true, firstName: true, lastName: true },
        },
      },
    });

    if (!existingClaim) {
      return NextResponse.json(
        { success: false, error: 'Claim not found' },
        { status: 404 }
      );
    }

    // Check claim number uniqueness if being updated
    if (validatedData.claimNumber && validatedData.claimNumber !== existingClaim.claimNumber) {
      const claimNumberExists = await prisma.claim.findUnique({
        where: { claimNumber: validatedData.claimNumber },
      });

      if (claimNumberExists) {
        return NextResponse.json(
          { success: false, error: 'Claim number already exists' },
          { status: 400 }
        );
      }
    }

    // Handle expert assignment changes
    let workloadChanges: { oldExpertId?: string; newExpertId?: string } = {};
    
    if ('assignedTo' in validatedData) {
      if (validatedData.assignedTo !== existingClaim.assignedTo) {
        workloadChanges = {
          oldExpertId: existingClaim.assignedTo || undefined,
          newExpertId: validatedData.assignedTo || undefined,
        };

        // Validate new expert if assigning
        if (validatedData.assignedTo) {
          const newExpert = await prisma.user.findUnique({
            where: { userId: validatedData.assignedTo },
            select: { 
              userId: true, 
              isActive: true,
              role: true,
              currentWorkload: true,
              maxWorkload: true,
            },
          });

          if (!newExpert || !newExpert.isActive) {
            return NextResponse.json(
              { success: false, error: 'Invalid or inactive expert' },
              { status: 400 }
            );
          }

          if (!['EXPERT', 'MANAGER_JUNIOR', 'MANAGER_SENIOR', 'SUPER_ADMIN'].includes(newExpert.role)) {
            return NextResponse.json(
              { success: false, error: 'User is not authorized to handle claims' },
              { status: 400 }
            );
          }

          if (newExpert.currentWorkload >= newExpert.maxWorkload) {
            return NextResponse.json(
              { success: false, error: 'Expert has reached maximum workload capacity' },
              { status: 400 }
            );
          }
        }
      }
    }

    // Update claim with transaction
    const updatedClaim = await prisma.$transaction(async (tx) => {
      const updated = await tx.claim.update({
        where: { claimId },
        data: validatedData,
        include: {
          client: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          policy: {
            select: {
              policyNumber: true,
              policyType: true,
            },
          },
          assignedUser: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      // Handle workload changes
      if (workloadChanges.oldExpertId) {
        await tx.user.update({
          where: { userId: workloadChanges.oldExpertId },
          data: { currentWorkload: { decrement: 1 } },
        });
      }

      if (workloadChanges.newExpertId) {
        await tx.user.update({
          where: { userId: workloadChanges.newExpertId },
          data: { currentWorkload: { increment: 1 } },
        });
      }

      // Create status history if status changed
      if (validatedData.status && validatedData.status !== existingClaim.status) {
        await tx.claimStatusHistory.create({
          data: {
            claimId: claimId,
            fromStatus: existingClaim.status,
            toStatus: validatedData.status,
            changedBy: null, // Super Admin action, could be improved to track actual admin
            reason: 'Super Admin override',
            notes: `Status changed from ${existingClaim.status} to ${validatedData.status}`,
          },
        });
      }

      return updated;
    });

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        entityType: 'CLAIM',
        entityId: claimId,
        claimId: claimId,
        action: 'UPDATE',
        description: `Claim updated by Super Admin: ${updatedClaim.claimNumber}`,
        oldValues: { claim: existingClaim },
        newValues: { claim: updatedClaim },
        riskLevel: 'HIGH', // Super Admin override is high risk
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedClaim,
      message: 'Claim updated successfully',
    });
  } catch (error) {
    console.error('Claims PUT error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to update claim' },
      { status: 500 }
    );
  }
}

// DELETE - Delete claim (remove fraudulent or duplicate claims)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const claimId = searchParams.get('id');
    const reason = searchParams.get('reason') || 'Super Admin deletion';

    if (!claimId) {
      return NextResponse.json(
        { success: false, error: 'Claim ID is required' },
        { status: 400 }
      );
    }

    const existingClaim = await prisma.claim.findUnique({
      where: { claimId },
      include: {
        client: {
          select: { firstName: true, lastName: true },
        },
        assignedUser: {
          select: { userId: true, firstName: true, lastName: true },
        },
      },
    });

    if (!existingClaim) {
      return NextResponse.json(
        { success: false, error: 'Claim not found' },
        { status: 404 }
      );
    }

    // Delete claim and handle workload
    await prisma.$transaction(async (tx) => {
      // Reduce expert workload if assigned
      if (existingClaim.assignedTo) {
        await tx.user.update({
          where: { userId: existingClaim.assignedTo },
          data: { currentWorkload: { decrement: 1 } },
        });
      }

      // Delete related records (will cascade)
      await tx.claim.delete({
        where: { claimId },
      });
    });

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        entityType: 'CLAIM',
        entityId: claimId,
        claimId: claimId,
        action: 'DELETE',
        description: `Claim deleted: ${existingClaim.claimNumber} - Reason: ${reason}`,
        oldValues: { claim: existingClaim },
        metadata: { reason },
        riskLevel: 'CRITICAL', // Claim deletion is critical
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Claim deleted successfully',
    });
  } catch (error) {
    console.error('Claims DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete claim' },
      { status: 500 }
    );
  }
}

// PATCH - Bulk operations and reassignment
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    // Handle reassignment operation
    if (body.operation === 'reassign') {
      const { claimIds, newExpertId } = reassignClaimsSchema.parse(body);

      // Validate new expert if provided
      if (newExpertId) {
        const newExpert = await prisma.user.findUnique({
          where: { userId: newExpertId },
          select: { 
            userId: true, 
            firstName: true,
            lastName: true,
            isActive: true,
            role: true,
            currentWorkload: true,
            maxWorkload: true,
          },
        });

        if (!newExpert || !newExpert.isActive) {
          return NextResponse.json(
            { success: false, error: 'Invalid or inactive expert' },
            { status: 400 }
          );
        }

        if (!['EXPERT', 'MANAGER_JUNIOR', 'MANAGER_SENIOR', 'SUPER_ADMIN'].includes(newExpert.role)) {
          return NextResponse.json(
            { success: false, error: 'User is not authorized to handle claims' },
            { status: 400 }
          );
        }

        if (newExpert.currentWorkload + claimIds.length > newExpert.maxWorkload) {
          return NextResponse.json(
            { 
              success: false, 
              error: `Expert cannot handle ${claimIds.length} additional claims. Current: ${newExpert.currentWorkload}/${newExpert.maxWorkload}` 
            },
            { status: 400 }
          );
        }
      }

      // Get current assignments
      const claims = await prisma.claim.findMany({
        where: { claimId: { in: claimIds } },
        select: { claimId: true, claimNumber: true, assignedTo: true },
      });

      // Calculate workload changes
      const oldExperts = [...new Set(claims.map(c => c.assignedTo).filter(Boolean))];
      const workloadChanges = new Map();

      // Decrease old experts' workload
      for (const expertId of oldExperts) {
        const claimCount = claims.filter(c => c.assignedTo === expertId).length;
        workloadChanges.set(expertId, (workloadChanges.get(expertId) || 0) - claimCount);
      }

      // Increase new expert's workload
      if (newExpertId) {
        workloadChanges.set(newExpertId, (workloadChanges.get(newExpertId) || 0) + claimIds.length);
      }

      await prisma.$transaction(async (tx) => {
        // Reassign claims
        await tx.claim.updateMany({
          where: { claimId: { in: claimIds } },
          data: { assignedTo: newExpertId },
        });

        // Update workloads
        for (const [expertId, change] of workloadChanges) {
          if (change !== 0) {
            await tx.user.update({
              where: { userId: expertId },
              data: { 
                currentWorkload: change > 0 
                  ? { increment: Math.abs(change) }
                  : { decrement: Math.abs(change) }
              },
            });
          }
        }

        // Log reassignment history
        for (const claim of claims) {
          await tx.claimStatusHistory.create({
            data: {
              claimId: claim.claimId,
              fromStatus: null,
              toStatus: null,
              changedBy: null, // Super Admin action
              reason: newExpertId ? 'Claim reassigned' : 'Claim unassigned',
              notes: `Reassigned by Super Admin`,
            },
          });
        }
      });

      // Log audit trail
      await prisma.auditLog.create({
        data: {
          entityType: 'CLAIM',
          entityId: 'BULK_REASSIGNMENT',
          action: 'UPDATE',
          description: `Bulk reassignment of ${claimIds.length} claims`,
          metadata: { 
            claimIds, 
            newExpertId,
            claimCount: claimIds.length,
          },
          riskLevel: 'HIGH',
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Claims reassigned successfully',
        affectedCount: claimIds.length,
      });
    }

    // Handle bulk operations
    const { claimIds, action, reason, priority } = bulkActionSchema.parse(body);

    let result;
    let statusChange;
    
    switch (action) {
      case 'approve':
        result = await prisma.claim.updateMany({
          where: { claimId: { in: claimIds } },
          data: { status: 'APPROVED' },
        });
        statusChange = 'APPROVED';
        break;
      case 'reject':
        result = await prisma.claim.updateMany({
          where: { claimId: { in: claimIds } },
          data: { status: 'REJECTED' },
        });
        statusChange = 'REJECTED';
        break;
      case 'close':
        result = await prisma.claim.updateMany({
          where: { claimId: { in: claimIds } },
          data: { status: 'CLOSED' },
        });
        statusChange = 'CLOSED';
        break;
      case 'prioritize':
        if (!priority) {
          return NextResponse.json(
            { success: false, error: 'Priority is required for prioritize action' },
            { status: 400 }
          );
        }
        result = await prisma.claim.updateMany({
          where: { claimId: { in: claimIds } },
          data: { priority },
        });
        break;
      case 'delete':
        // Get claims to check assignments
        const claimsToDelete = await prisma.claim.findMany({
          where: { claimId: { in: claimIds } },
          select: { claimId: true, claimNumber: true, assignedTo: true },
        });

        await prisma.$transaction(async (tx) => {
          // Reduce workload for assigned experts
          const expertWorkload = new Map();
          for (const claim of claimsToDelete) {
            if (claim.assignedTo) {
              expertWorkload.set(
                claim.assignedTo, 
                (expertWorkload.get(claim.assignedTo) || 0) + 1
              );
            }
          }

          for (const [expertId, count] of expertWorkload) {
            await tx.user.update({
              where: { userId: expertId },
              data: { currentWorkload: { decrement: count } },
            });
          }

          // Delete claims
          await tx.claim.deleteMany({
            where: { claimId: { in: claimIds } },
          });
        });

        result = { count: claimsToDelete.length };
        break;
    }

    // Create status history for status changes
    if (statusChange) {
      const statusHistoryData = claimIds.map(claimId => ({
        claimId,
        toStatus: statusChange as any,
        changedBy: null, // Super Admin bulk action
        reason: reason || `Bulk ${action} by Super Admin`,
        notes: `Bulk operation performed on ${claimIds.length} claims`,
      }));

      await prisma.claimStatusHistory.createMany({
        data: statusHistoryData,
      });
    }

    // Log bulk audit trail
    await prisma.auditLog.create({
      data: {
        entityType: 'CLAIM',
        entityId: 'BULK_OPERATION',
        action: action.toUpperCase() as any,
        description: `Bulk ${action} operation on ${result.count} claims`,
        metadata: { 
          claimIds, 
          affectedCount: result.count,
          reason,
          priority,
        },
        riskLevel: 'HIGH',
      },
    });

    return NextResponse.json({
      success: true,
      message: `Bulk ${action} completed`,
      affectedCount: result.count,
    });
  } catch (error) {
    console.error('Claims PATCH error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: `Failed to perform operation` },
      { status: 500 }
    );
  }
}