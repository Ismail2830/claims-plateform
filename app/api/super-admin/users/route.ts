// Super Admin Entity Management API - Users
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

// Validation schemas
const createUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  password: z.string().min(8),
  role: z.enum(['SUPER_ADMIN', 'MANAGER_SENIOR', 'MANAGER_JUNIOR', 'EXPERT']),
  maxWorkload: z.number().default(20),
});

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  role: z.enum(['SUPER_ADMIN', 'MANAGER_SENIOR', 'MANAGER_JUNIOR', 'EXPERT']).optional(),
  isActive: z.boolean().optional(),
  maxWorkload: z.number().optional(),
});

const bulkActionSchema = z.object({
  userIds: z.array(z.string()),
  action: z.enum(['activate', 'deactivate', 'delete']),
});

// GET - Fetch all users with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role');
    const status = searchParams.get('status');
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
      ];
    }

    if (role) {
      where.role = role;
    }

    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    // Fetch users with pagination
    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          userId: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          currentWorkload: true,
          maxWorkload: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              assignedClaims: true,
              documentsUploaded: true,
              statusChanges: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    // Calculate statistics
    const stats = await prisma.user.groupBy({
      by: ['role', 'isActive'],
      _count: true,
    });

    return NextResponse.json({
      success: true,
      data: {
        users,
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
    console.error('Users GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST - Create new user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createUserSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(validatedData.password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        passwordHash,
        role: validatedData.role,
        maxWorkload: validatedData.maxWorkload,
      },
      select: {
        userId: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        entityType: 'USER',
        entityId: user.userId,
        action: 'CREATE',
        description: `User created: ${user.firstName} ${user.lastName} (${user.email})`,
        newValues: { user },
        riskLevel: 'MEDIUM',
      },
    });

    return NextResponse.json({
      success: true,
      data: user,
      message: 'User created successfully',
    });
  } catch (error) {
    console.error('Users POST error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to create user' },
      { status: 500 }
    );
  }
}

// PUT - Update user
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = updateUserSchema.parse(body);

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { userId },
    });

    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Check email uniqueness if email is being updated
    if (validatedData.email && validatedData.email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: validatedData.email },
      });

      if (emailExists) {
        return NextResponse.json(
          { success: false, error: 'Email already exists' },
          { status: 400 }
        );
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { userId },
      data: validatedData,
      select: {
        userId: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        maxWorkload: true,
        updatedAt: true,
      },
    });

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        entityType: 'USER',
        entityId: userId,
        action: 'UPDATE',
        description: `User updated: ${updatedUser.firstName} ${updatedUser.lastName}`,
        oldValues: { user: existingUser },
        newValues: { user: updatedUser },
        riskLevel: 'MEDIUM',
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: 'User updated successfully',
    });
  } catch (error) {
    console.error('Users PUT error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

// DELETE - Delete user
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');
    const hard = searchParams.get('hard') === 'true';

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { userId },
      include: {
        assignedClaims: { select: { claimId: true } },
      },
    });

    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    if (hard) {
      // Hard delete - only if no assigned claims
      if (existingUser.assignedClaims.length > 0) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Cannot delete user with assigned claims. Please reassign claims first.' 
          },
          { status: 400 }
        );
      }

      await prisma.user.delete({
        where: { userId },
      });
    } else {
      // Soft delete
      await prisma.user.update({
        where: { userId },
        data: { isActive: false },
      });
    }

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        entityType: 'USER',
        entityId: userId,
        action: 'DELETE',
        description: `User ${hard ? 'permanently deleted' : 'deactivated'}: ${existingUser.firstName} ${existingUser.lastName}`,
        oldValues: { user: existingUser },
        riskLevel: 'HIGH',
      },
    });

    return NextResponse.json({
      success: true,
      message: `User ${hard ? 'deleted' : 'deactivated'} successfully`,
    });
  } catch (error) {
    console.error('Users DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}

// PATCH - Bulk operations
export async function PATCH(request: NextRequest) {
  let action = 'unknown';
  
  try {
    const body = await request.json();
    const parsed = bulkActionSchema.parse(body);
    const userIds = parsed.userIds;
    action = parsed.action;

    let result: { count: number };
    
    switch (action) {
      case 'activate':
        result = await prisma.user.updateMany({
          where: { userId: { in: userIds } },
          data: { isActive: true },
        });
        break;
      case 'deactivate':
        result = await prisma.user.updateMany({
          where: { userId: { in: userIds } },
          data: { isActive: false },
        });
        break;
      case 'delete':
        // Check for assigned claims
        const usersWithClaims = await prisma.user.findMany({
          where: { 
            userId: { in: userIds },
            assignedClaims: { some: {} },
          },
          select: { userId: true, firstName: true, lastName: true },
        });

        if (usersWithClaims.length > 0) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'Some users have assigned claims',
              details: usersWithClaims,
            },
            { status: 400 }
          );
        }

        result = await prisma.user.deleteMany({
          where: { userId: { in: userIds } },
        });
        break;
      default:
        throw new Error(`Invalid action: ${action}`);
    }

    // Log bulk audit trail
    await prisma.auditLog.create({
      data: {
        entityType: 'USER',
        entityId: 'BULK_OPERATION',
        action: action.toUpperCase() as any,
        description: `Bulk ${action} operation on ${result.count} users`,
        metadata: { userIds, affectedCount: result.count },
        riskLevel: 'HIGH',
      },
    });

    return NextResponse.json({
      success: true,
      message: `Bulk ${action} completed`,
      affectedCount: result.count,
    });
  } catch (error) {
    console.error('Users PATCH error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: `Failed to perform bulk ${action}` },
      { status: 500 }
    );
  }
}