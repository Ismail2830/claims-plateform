// Super Admin Entity Management API - Clients
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

// Validation schemas
const createClientSchema = z.object({
  cin: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().min(10),
  dateOfBirth: z.string().transform((str) => new Date(str)),
  address: z.string().min(1),
  city: z.string().min(1),
  province: z.string().min(1),
  postalCode: z.string().optional(),
});

const updateClientSchema = z.object({
  cin: z.string().min(1).optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(10).optional(),
  dateOfBirth: z.string().transform((str) => new Date(str)).optional(),
  address: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  province: z.string().min(1).optional(),
  postalCode: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION', 'BLOCKED']).optional(),
  emailVerified: z.boolean().optional(),
  phoneVerified: z.boolean().optional(),
  documentVerified: z.boolean().optional(),
});

const bulkActionSchema = z.object({
  clientIds: z.array(z.string()),
  action: z.enum(['activate', 'suspend', 'block', 'delete']),
});

const mergeClientsSchema = z.object({
  primaryClientId: z.string(),
  secondaryClientId: z.string(),
});

// GET - Fetch all clients with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');
    const riskLevel = searchParams.get('riskLevel');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const skip = (page - 1) * limit;

    // Build filters
    const where: any = {};
    
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { cin: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    // Fetch clients with pagination
    const [clients, totalCount] = await Promise.all([
      prisma.client.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
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
          _count: {
            select: {
              policies: true,
              claims: true,
            },
          },
        },
      }),
      prisma.client.count({ where }),
    ]);

    // Calculate client statistics and metrics
    const stats = await prisma.client.groupBy({
      by: ['status'],
      _count: true,
    });

    // Calculate lifetime values and risk scores for each client
    const clientsWithMetrics = await Promise.all(
      clients.map(async (client) => {
        // Calculate lifetime value from policies
        const policies = await prisma.policy.findMany({
          where: { clientId: client.clientId },
          select: { premiumAmount: true, status: true },
        });

        const lifetimeValue = policies
          .filter((p: any) => p.status === 'ACTIVE')
          .reduce((sum, policy) => sum + Number(policy.premiumAmount), 0);

        // Calculate risk score based on claims
        const claims = await prisma.claim.findMany({
          where: { clientId: client.clientId },
          select: { status: true, claimedAmount: true, fraudScore: true },
        });

        const totalClaims = claims.length;
        const rejectedClaims = claims.filter((c: any) => c.status === 'REJECTED').length;
        const avgFraudScore = claims.reduce((sum, claim) => sum + Number(claim.fraudScore || 0), 0) / (totalClaims || 1);
        
        let riskScore = 'Low';
        if (avgFraudScore > 7 || rejectedClaims / (totalClaims || 1) > 0.3) {
          riskScore = 'High';
        } else if (avgFraudScore > 4 || rejectedClaims / (totalClaims || 1) > 0.1) {
          riskScore = 'Medium';
        }

        return {
          ...client,
          lifetimeValue: `MAD ${lifetimeValue.toLocaleString()}`,
          riskScore,
          totalClaims,
          rejectedClaims,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        clients: clientsWithMetrics,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
        },
        stats,
      },
    });
  } catch (error) {
    console.error('Clients GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch clients' },
      { status: 500 }
    );
  }
}

// POST - Create new client
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createClientSchema.parse(body);

    // Check if client already exists
    const existingClient = await prisma.client.findFirst({
      where: {
        OR: [
          { email: validatedData.email },
          { cin: validatedData.cin },
          { phone: validatedData.phone },
        ],
      },
    });

    if (existingClient) {
      return NextResponse.json(
        { success: false, error: 'Client with this email, CIN, or phone already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const password = await bcrypt.hash(validatedData.password, 12);

    // Create client
    const client = await prisma.client.create({
      data: {
        ...validatedData,
        password,
        status: 'ACTIVE',
      },
      select: {
        clientId: true,
        cin: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
      },
    });

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        entityType: 'CLIENT',
        entityId: client.clientId,
        action: 'CREATE',
        description: `Client created: ${client.firstName} ${client.lastName} (${client.email})`,
        newValues: { client },
        riskLevel: 'MEDIUM',
      },
    });

    return NextResponse.json({
      success: true,
      data: client,
      message: 'Client created successfully',
    });
  } catch (error) {
    console.error('Clients POST error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to create client' },
      { status: 500 }
    );
  }
}

// PUT - Update client
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('id');

    if (!clientId) {
      return NextResponse.json(
        { success: false, error: 'Client ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Strip DB-only / relational fields and convert nulls to undefined
    const {
      clientId: _cid,
      passwordHash: _ph,
      password: _pw,
      policies: _pol,
      claims: _cl,
      _count,
      createdAt: _ca,
      updatedAt: _ua,
      lastLoginAt: _lla,
      emailVerified: _ev,
      phoneVerified: _pv,
      documentVerified: _dv,
      lifetimeValue: _lv,
      riskScore: _rs,
      totalClaims: _tc,
      rejectedClaims: _rc,
      ...updateFields
    } = body;

    const cleanBody = Object.fromEntries(
      Object.entries(updateFields).filter(([, v]) => v !== null && v !== undefined && v !== '')
    );

    const validatedData = updateClientSchema.parse(cleanBody);

    // Check if client exists
    const existingClient = await prisma.client.findUnique({
      where: { clientId },
    });

    if (!existingClient) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      );
    }

    // Check uniqueness for updated fields
    if (validatedData.email || validatedData.cin || validatedData.phone) {
      const conflicts = await prisma.client.findFirst({
        where: {
          AND: [
            { clientId: { not: clientId } },
            {
              OR: [
                validatedData.email ? { email: validatedData.email } : {},
                validatedData.cin ? { cin: validatedData.cin } : {},
                validatedData.phone ? { phone: validatedData.phone } : {},
              ].filter((obj: any) => Object.keys(obj).length > 0),
            },
          ],
        },
      });

      if (conflicts) {
        return NextResponse.json(
          { success: false, error: 'Email, CIN, or phone already exists' },
          { status: 400 }
        );
      }
    }

    // Update client
    const updatedClient = await prisma.client.update({
      where: { clientId },
      data: validatedData,
      select: {
        clientId: true,
        cin: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        status: true,
        emailVerified: true,
        phoneVerified: true,
        documentVerified: true,
        updatedAt: true,
      },
    });

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        entityType: 'CLIENT',
        entityId: clientId,
        action: 'UPDATE',
        description: `Client updated: ${updatedClient.firstName} ${updatedClient.lastName}`,
        oldValues: { client: existingClient },
        newValues: { client: updatedClient },
        riskLevel: 'MEDIUM',
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedClient,
      message: 'Client updated successfully',
    });
  } catch (error) {
    console.error('Clients PUT error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to update client' },
      { status: 500 }
    );
  }
}

// DELETE - Delete client
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('id');
    const hard = searchParams.get('hard') === 'true';

    if (!clientId) {
      return NextResponse.json(
        { success: false, error: 'Client ID is required' },
        { status: 400 }
      );
    }

    const existingClient = await prisma.client.findUnique({
      where: { clientId },
      include: {
        policies: { select: { policyId: true, status: true } },
        claims: { select: { claimId: true, status: true } },
      },
    });

    if (!existingClient) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      );
    }

    // Check for active policies and claims
    const activePolicies = existingClient.policies.filter((p: any) => p.status === 'ACTIVE');
    const activeClaims = existingClient.claims.filter((c: any) => !['CLOSED', 'REJECTED'].includes(c.status));

    if (hard) {
      if (activePolicies.length > 0 || activeClaims.length > 0) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Cannot delete client with active policies or claims' 
          },
          { status: 400 }
        );
      }

      await prisma.client.delete({
        where: { clientId },
      });
    } else {
      // Soft delete
      await prisma.client.update({
        where: { clientId },
        data: { status: 'INACTIVE' },
      });
    }

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        entityType: 'CLIENT',
        entityId: clientId,
        action: 'DELETE',
        description: `Client ${hard ? 'permanently deleted' : 'deactivated'}: ${existingClient.firstName} ${existingClient.lastName}`,
        oldValues: { client: existingClient },
        riskLevel: 'HIGH',
      },
    });

    return NextResponse.json({
      success: true,
      message: `Client ${hard ? 'deleted' : 'deactivated'} successfully`,
    });
  } catch (error) {
    console.error('Clients DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete client' },
      { status: 500 }
    );
  }
}

// PATCH - Bulk operations and merge
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    // Handle merge operation
    if (body.operation === 'merge') {
      const { primaryClientId, secondaryClientId } = mergeClientsSchema.parse(body);

      // Get both clients
      const [primaryClient, secondaryClient] = await Promise.all([
        prisma.client.findUnique({ where: { clientId: primaryClientId } }),
        prisma.client.findUnique({ where: { clientId: secondaryClientId } }),
      ]);

      if (!primaryClient || !secondaryClient) {
        return NextResponse.json(
          { success: false, error: 'One or both clients not found' },
          { status: 404 }
        );
      }

      await prisma.$transaction(async (tx) => {
        // Transfer policies
        await tx.policy.updateMany({
          where: { clientId: secondaryClientId },
          data: { clientId: primaryClientId },
        });

        // Transfer claims
        await tx.claim.updateMany({
          where: { clientId: secondaryClientId },
          data: { clientId: primaryClientId },
        });

        // Transfer documents
        await tx.claimDocument.updateMany({
          where: { uploadedByClient: secondaryClientId },
          data: { uploadedByClient: primaryClientId },
        });

        // Delete secondary client
        await tx.client.delete({
          where: { clientId: secondaryClientId },
        });

        // Log audit trail
        await tx.auditLog.create({
          data: {
            entityType: 'CLIENT',
            entityId: primaryClientId,
            action: 'UPDATE',
            description: `Client merge completed: ${secondaryClient.firstName} ${secondaryClient.lastName} merged into ${primaryClient.firstName} ${primaryClient.lastName}`,
            metadata: { mergedClientId: secondaryClientId },
            riskLevel: 'HIGH',
          },
        });
      });

      return NextResponse.json({
        success: true,
        message: 'Clients merged successfully',
      });
    }

    // Handle bulk operations
    const { clientIds, action } = bulkActionSchema.parse(body);

    let result;
    
    switch (action) {
      case 'activate':
        result = await prisma.client.updateMany({
          where: { clientId: { in: clientIds } },
          data: { status: 'ACTIVE' },
        });
        break;
      case 'suspend':
        result = await prisma.client.updateMany({
          where: { clientId: { in: clientIds } },
          data: { status: 'SUSPENDED' },
        });
        break;
      case 'block':
        result = await prisma.client.updateMany({
          where: { clientId: { in: clientIds } },
          data: { status: 'BLOCKED' },
        });
        break;
      case 'delete':
        // Check for active policies/claims
        const clientsWithActive = await prisma.client.findMany({
          where: { 
            clientId: { in: clientIds },
            OR: [
              { policies: { some: { status: 'ACTIVE' } } },
              { claims: { some: { status: { notIn: ['CLOSED', 'REJECTED'] } } } },
            ],
          },
          select: { clientId: true, firstName: true, lastName: true },
        });

        if (clientsWithActive.length > 0) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'Some clients have active policies or claims',
              details: clientsWithActive,
            },
            { status: 400 }
          );
        }

        result = await prisma.client.deleteMany({
          where: { clientId: { in: clientIds } },
        });
        break;
    }

    // Log bulk audit trail
    await prisma.auditLog.create({
      data: {
        entityType: 'CLIENT',
        entityId: 'BULK_OPERATION',
        action: action.toUpperCase() as any,
        description: `Bulk ${action} operation on ${result.count} clients`,
        metadata: { clientIds, affectedCount: result.count },
        riskLevel: 'HIGH',
      },
    });

    return NextResponse.json({
      success: true,
      message: `Bulk ${action} completed`,
      affectedCount: result.count,
    });
  } catch (error) {
    console.error('Clients PATCH error:', error);
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