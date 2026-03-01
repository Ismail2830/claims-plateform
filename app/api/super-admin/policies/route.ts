// Super Admin Entity Management API - Policies
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { z } from 'zod';

// ── Validation schemas ───────────────────────────────────────────────────────
const ALL_POLICY_TYPES = [
  'AUTO', 'HOME', 'PROFESSIONAL', 'AGRICULTURE', 'TRANSPORT',
  'CONSTRUCTION', 'LIABILITY', 'HEALTH', 'LIFE', 'ACCIDENT',
  'ASSISTANCE', 'CREDIT', 'SURETY', 'TAKAFUL_NON_VIE', 'TAKAFUL_VIE',
] as const;

const ALL_COVERAGE_TYPES = [
  'RC_ONLY', 'THIRD_PARTY_PLUS', 'COMPREHENSIVE',
  'FIRE_ONLY', 'MULTIRISQUES', 'LANDLORD',
  'AMO_BASIC', 'COMPLEMENTAIRE', 'FULL_COVER',
  'TERM_LIFE', 'WHOLE_LIFE', 'SAVINGS', 'RETIREMENT',
  'TRC_ONLY', 'RCD_ONLY', 'TRC_AND_RCD',
  'OTHER',
] as const;

const PREMIUM_FREQUENCIES = ['MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL'] as const;

/** Generate a unique-enough policy number: POL-YYYY-XXXXXX */
function generatePolicyNumber(): string {
  const year = new Date().getFullYear();
  const rand = String(Math.floor(100000 + Math.random() * 900000));
  return `POL-${year}-${rand}`;
}

const createPolicySchema = z.object({
  clientId:         z.string().uuid(),
  policyType:       z.enum(ALL_POLICY_TYPES),
  coverageType:     z.enum(ALL_COVERAGE_TYPES).optional(),
  startDate:        z.string().transform((s) => new Date(s)),
  endDate:          z.string().transform((s) => new Date(s)),
  renewalDate:      z.string().transform((s) => new Date(s)).optional(),
  premiumAmount:    z.number().positive(),
  insuredAmount:    z.number().positive(),
  deductible:       z.number().min(0).default(0),
  premiumFrequency: z.enum(PREMIUM_FREQUENCIES).default('ANNUAL'),
  isObligatory:     z.boolean().default(false),
  isTakaful:        z.boolean().default(false),
  notes:            z.string().optional(),
});

const updatePolicySchema = z.object({
  policyNumber:     z.string().min(1).optional(),
  policyType:       z.enum(ALL_POLICY_TYPES).optional(),
  coverageType:     z.enum(ALL_COVERAGE_TYPES).optional(),
  startDate:        z.string().transform((s) => new Date(s)).optional(),
  endDate:          z.string().transform((s) => new Date(s)).optional(),
  renewalDate:      z.string().transform((s) => new Date(s)).optional(),
  premiumAmount:    z.coerce.number().positive().optional(),
  insuredAmount:    z.coerce.number().positive().optional(),
  deductible:       z.coerce.number().min(0).optional(),
  premiumFrequency: z.enum(PREMIUM_FREQUENCIES).optional(),
  isObligatory:     z.boolean().optional(),
  isTakaful:        z.boolean().optional(),
  notes:            z.string().optional(),
  status:           z.enum(['ACTIVE', 'EXPIRED', 'CANCELED', 'SUSPENDED']).optional(),
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

    // Validate dates
    if (validatedData.endDate <= validatedData.startDate) {
      return NextResponse.json(
        { success: false, error: 'End date must be after start date' },
        { status: 400 }
      );
    }

    // Auto-generate unique policy number (retry up to 5 times on collision)
    let policyNumber = '';
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generatePolicyNumber();
      const existing = await prisma.policy.findUnique({ where: { policyNumber: candidate } });
      if (!existing) { policyNumber = candidate; break; }
    }
    if (!policyNumber) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate unique policy number, please retry' },
        { status: 500 }
      );
    }

    // Create policy
    const { renewalDate, ...rest } = validatedData;
    const policy = await prisma.policy.create({
      data: {
        ...rest,
        policyNumber,
        renewalDate: renewalDate ?? validatedData.endDate,
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

    // Strip DB-only / relational fields and convert nulls to undefined
    // so the schema's .optional() fields work correctly.
    const {
      policyId: _pid,
      clientId: _cid,
      client:   _cl,
      _count,
      createdAt: _ca,
      updatedAt:  _ua,
      ...updateFields
    } = body;

    const cleanBody = Object.fromEntries(
      Object.entries(updateFields).filter(([, v]) => v !== null && v !== undefined && v !== '')
    );

    const validatedData = updatePolicySchema.parse(cleanBody);

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