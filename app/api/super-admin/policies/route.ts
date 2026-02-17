// Super Admin Entity Management API - Policies
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { z } from 'zod';

// Validation schemas
const createPolicySchema = z.object({
  clientId: z.string().uuid(),
  policyNumber: z.string().min(1),
  policyType: z.enum(['AUTO', 'HOME', 'HEALTH', 'LIFE']),
  coverageType: z.string().optional(),
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z.string().transform((str) => new Date(str)),
  premiumAmount: z.number().positive(),
  insuredAmount: z.number().positive(),
  deductible: z.number().min(0).default(0),
});

const updatePolicySchema = z.object({
  policyNumber: z.string().min(1).optional(),
  policyType: z.enum(['AUTO', 'HOME', 'HEALTH', 'LIFE']).optional(),
  coverageType: z.string().optional(),
  startDate: z.string().transform((str) => new Date(str)).optional(),
  endDate: z.string().transform((str) => new Date(str)).optional(),
  premiumAmount: z.number().positive().optional(),
  insuredAmount: z.number().positive().optional(),
  deductible: z.number().min(0).optional(),
  status: z.enum(['ACTIVE', 'EXPIRED', 'CANCELED', 'SUSPENDED']).optional(),
});

const transferPolicySchema = z.object({
  policyId: z.string().uuid(),
  newClientId: z.string().uuid(),
});

const bulkActionSchema = z.object({
  policyIds: z.array(z.string()),
  action: z.enum(['activate', 'suspend', 'cancel', 'delete']),
});

// GET - Fetch all policies with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const policyType = searchParams.get('policyType');
    const status = searchParams.get('status');
    const clientId = searchParams.get('clientId');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const skip = (page - 1) * limit;

    // Build filters
    const where: any = {};
    
    if (search) {
      where.OR = [
        { policyNumber: { contains: search, mode: 'insensitive' } },
        { coverageType: { contains: search, mode: 'insensitive' } },
        { client: { firstName: { contains: search, mode: 'insensitive' } } },
        { client: { lastName: { contains: search, mode: 'insensitive' } } },
        { client: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (policyType) {
      where.policyType = policyType;
    }

    if (status) {
      where.status = status;
    }

    if (clientId) {
      where.clientId = clientId;
    }

    // Fetch policies with pagination
    const [policies, totalCount] = await Promise.all([
      prisma.policy.findMany({
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
              status: true,
            },
          },
          _count: {
            select: {
              claims: true,
            },
          },
        },
      }),
      prisma.policy.count({ where }),
    ]);

    // Calculate statistics
    const stats = await prisma.policy.groupBy({
      by: ['policyType', 'status'],
      _count: true,
      _sum: {
        premiumAmount: true,
        insuredAmount: true,
      },
    });

    // Calculate expiring policies (next 30 days)
    const expiringPolicies = await prisma.policy.count({
      where: {
        status: 'ACTIVE',
        endDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        policies,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
        },
        stats,
        expiringPolicies,
      },
    });
  } catch (error) {
    console.error('Policies GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch policies' },
      { status: 500 }
    );
  }
}

// POST - Create new policy
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createPolicySchema.parse(body);

    // Check if client exists and is active
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

    if (client.status !== 'ACTIVE') {
      return NextResponse.json(
        { success: false, error: 'Cannot create policy for inactive client' },
        { status: 400 }
      );
    }

    // Check if policy number already exists
    const existingPolicy = await prisma.policy.findUnique({
      where: { policyNumber: validatedData.policyNumber },
    });

    if (existingPolicy) {
      return NextResponse.json(
        { success: false, error: 'Policy number already exists' },
        { status: 400 }
      );
    }

    // Validate dates
    if (validatedData.endDate <= validatedData.startDate) {
      return NextResponse.json(
        { success: false, error: 'End date must be after start date' },
        { status: 400 }
      );
    }

    // Create policy
    const policy = await prisma.policy.create({
      data: {
        ...validatedData,
        status: 'ACTIVE',
      },
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        entityType: 'POLICY',
        entityId: policy.policyId,
        action: 'CREATE',
        description: `Policy created: ${policy.policyNumber} for ${client.firstName} ${client.lastName}`,
        newValues: { policy },
        riskLevel: 'MEDIUM',
      },
    });

    return NextResponse.json({
      success: true,
      data: policy,
      message: 'Policy created successfully',
    });
  } catch (error) {
    console.error('Policies POST error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to create policy' },
      { status: 500 }
    );
  }
}

// PUT - Update policy
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const policyId = searchParams.get('id');

    if (!policyId) {
      return NextResponse.json(
        { success: false, error: 'Policy ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = updatePolicySchema.parse(body);

    // Check if policy exists
    const existingPolicy = await prisma.policy.findUnique({
      where: { policyId },
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!existingPolicy) {
      return NextResponse.json(
        { success: false, error: 'Policy not found' },
        { status: 404 }
      );
    }

    // Check policy number uniqueness if being updated
    if (validatedData.policyNumber && validatedData.policyNumber !== existingPolicy.policyNumber) {
      const policyNumberExists = await prisma.policy.findUnique({
        where: { policyNumber: validatedData.policyNumber },
      });

      if (policyNumberExists) {
        return NextResponse.json(
          { success: false, error: 'Policy number already exists' },
          { status: 400 }
        );
      }
    }

    // Validate dates if being updated
    const startDate = validatedData.startDate || existingPolicy.startDate;
    const endDate = validatedData.endDate || existingPolicy.endDate;

    if (endDate <= startDate) {
      return NextResponse.json(
        { success: false, error: 'End date must be after start date' },
        { status: 400 }
      );
    }

    // Check for active claims if trying to cancel/suspend
    if (validatedData.status && ['CANCELED', 'SUSPENDED'].includes(validatedData.status)) {
      const activeClaims = await prisma.claim.count({
        where: {
          policyId: policyId,
          status: { notIn: ['CLOSED', 'REJECTED'] },
        },
      });

      if (activeClaims > 0) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Cannot ${validatedData.status.toLowerCase()} policy with ${activeClaims} active claims` 
          },
          { status: 400 }
        );
      }
    }

    // Update policy
    const updatedPolicy = await prisma.policy.update({
      where: { policyId },
      data: validatedData,
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        entityType: 'POLICY',
        entityId: policyId,
        action: 'UPDATE',
        description: `Policy updated: ${updatedPolicy.policyNumber}`,
        oldValues: { policy: existingPolicy },
        newValues: { policy: updatedPolicy },
        riskLevel: 'MEDIUM',
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedPolicy,
      message: 'Policy updated successfully',
    });
  } catch (error) {
    console.error('Policies PUT error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to update policy' },
      { status: 500 }
    );
  }
}

// DELETE - Delete policy
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const policyId = searchParams.get('id');

    if (!policyId) {
      return NextResponse.json(
        { success: false, error: 'Policy ID is required' },
        { status: 400 }
      );
    }

    const existingPolicy = await prisma.policy.findUnique({
      where: { policyId },
      include: {
        claims: { select: { claimId: true, status: true } },
        client: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!existingPolicy) {
      return NextResponse.json(
        { success: false, error: 'Policy not found' },
        { status: 404 }
      );
    }

    // Check for active claims
    const activeClaims = existingPolicy.claims.filter((c: any) => !['CLOSED', 'REJECTED'].includes(c.status));
    
    if (activeClaims.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot delete policy with ${activeClaims.length} active claims` 
        },
        { status: 400 }
      );
    }

    await prisma.policy.delete({
      where: { policyId },
    });

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        entityType: 'POLICY',
        entityId: policyId,
        action: 'DELETE',
        description: `Policy deleted: ${existingPolicy.policyNumber}`,
        oldValues: { policy: existingPolicy },
        riskLevel: 'HIGH',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Policy deleted successfully',
    });
  } catch (error) {
    console.error('Policies DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete policy' },
      { status: 500 }
    );
  }
}

// PATCH - Bulk operations and transfer
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    // Handle transfer operation
    if (body.operation === 'transfer') {
      const { policyId, newClientId } = transferPolicySchema.parse(body);

      // Check if policy exists
      const policy = await prisma.policy.findUnique({
        where: { policyId },
        include: {
          client: {
            select: { firstName: true, lastName: true },
          },
          claims: { select: { claimId: true, status: true } },
        },
      });

      if (!policy) {
        return NextResponse.json(
          { success: false, error: 'Policy not found' },
          { status: 404 }
        );
      }

      // Check if new client exists and is active
      const newClient = await prisma.client.findUnique({
        where: { clientId: newClientId },
        select: { clientId: true, firstName: true, lastName: true, status: true },
      });

      if (!newClient) {
        return NextResponse.json(
          { success: false, error: 'New client not found' },
          { status: 404 }
        );
      }

      if (newClient.status !== 'ACTIVE') {
        return NextResponse.json(
          { success: false, error: 'Cannot transfer policy to inactive client' },
          { status: 400 }
        );
      }

      // Check for active claims
      const activeClaims = policy.claims.filter((c: any) => !['CLOSED', 'REJECTED'].includes(c.status));
      
      if (activeClaims.length > 0) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Cannot transfer policy with ${activeClaims.length} active claims` 
          },
          { status: 400 }
        );
      }

      await prisma.$transaction(async (tx) => {
        // Transfer the policy
        await tx.policy.update({
          where: { policyId },
          data: { clientId: newClientId },
        });

        // Transfer all related claims
        await tx.claim.updateMany({
          where: { policyId },
          data: { clientId: newClientId },
        });

        // Log audit trail
        await tx.auditLog.create({
          data: {
            entityType: 'POLICY',
            entityId: policyId,
            action: 'UPDATE',
            description: `Policy transferred from ${policy.client.firstName} ${policy.client.lastName} to ${newClient.firstName} ${newClient.lastName}`,
            metadata: { 
              fromClientId: policy.clientId, 
              toClientId: newClientId,
              policyNumber: policy.policyNumber,
            },
            riskLevel: 'HIGH',
          },
        });
      });

      return NextResponse.json({
        success: true,
        message: 'Policy transferred successfully',
      });
    }

    // Handle bulk operations
    const { policyIds, action } = bulkActionSchema.parse(body);

    let result;
    
    switch (action) {
      case 'activate':
        result = await prisma.policy.updateMany({
          where: { policyId: { in: policyIds } },
          data: { status: 'ACTIVE' },
        });
        break;
      case 'suspend':
        // Check for active claims
        const policiesWithActiveClaims = await prisma.policy.findMany({
          where: { 
            policyId: { in: policyIds },
            claims: { some: { status: { notIn: ['CLOSED', 'REJECTED'] } } },
          },
          select: { policyId: true, policyNumber: true },
        });

        if (policiesWithActiveClaims.length > 0) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'Some policies have active claims',
              details: policiesWithActiveClaims,
            },
            { status: 400 }
          );
        }

        result = await prisma.policy.updateMany({
          where: { policyId: { in: policyIds } },
          data: { status: 'SUSPENDED' },
        });
        break;
      case 'cancel':
        // Check for active claims
        const policiesToCancel = await prisma.policy.findMany({
          where: { 
            policyId: { in: policyIds },
            claims: { some: { status: { notIn: ['CLOSED', 'REJECTED'] } } },
          },
          select: { policyId: true, policyNumber: true },
        });

        if (policiesToCancel.length > 0) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'Some policies have active claims',
              details: policiesToCancel,
            },
            { status: 400 }
          );
        }

        result = await prisma.policy.updateMany({
          where: { policyId: { in: policyIds } },
          data: { status: 'CANCELED' },
        });
        break;
      case 'delete':
        // Check for any claims
        const policiesWithClaims = await prisma.policy.findMany({
          where: { 
            policyId: { in: policyIds },
            claims: { some: {} },
          },
          select: { policyId: true, policyNumber: true },
        });

        if (policiesWithClaims.length > 0) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'Some policies have associated claims',
              details: policiesWithClaims,
            },
            { status: 400 }
          );
        }

        result = await prisma.policy.deleteMany({
          where: { policyId: { in: policyIds } },
        });
        break;
    }

    // Log bulk audit trail
    await prisma.auditLog.create({
      data: {
        entityType: 'POLICY',
        entityId: 'BULK_OPERATION',
        action: action.toUpperCase() as any,
        description: `Bulk ${action} operation on ${result.count} policies`,
        metadata: { policyIds, affectedCount: result.count },
        riskLevel: 'HIGH',
      },
    });

    return NextResponse.json({
      success: true,
      message: `Bulk ${action} completed`,
      affectedCount: result.count,
    });
  } catch (error) {
    console.error('Policies PATCH error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: `Failed to perform operation` },
      { status: 500 }
    );
  }
}