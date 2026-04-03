import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { verifyAccessToken } from '@/app/lib/tokens';
import bcrypt from 'bcryptjs';

// Verify admin token and return user info
async function verifyAdminToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cookieToken = request.cookies.get('admin_at')?.value;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : (authHeader?.replace('Bearer ', '') || cookieToken);

  if (!token) {
    return null;
  }

  try {
    const decoded = verifyAccessToken(token);

    if (decoded.type !== 'ADMIN') {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { userId: decoded.userId },
      select: {
        userId: true,
        role: true,
        isActive: true
      }
    });

    if (!user || !user.isActive) {
      return null;
    }

    return user;
  } catch {
    return null;
  }
}

// GET /api/admin/users - Get all users
export async function GET(request: NextRequest) {
  try {
    const adminUser = await verifyAdminToken(request);
    if (!adminUser) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const role = url.searchParams.get('role');
    const isActive = url.searchParams.get('isActive');

    // Build where clause
    const where: any = {};
    if (role) {
      const roles = role.split(',').map((r) => r.trim()).filter(Boolean);
      where.role = roles.length === 1 ? roles[0] : { in: roles };
    }
    if (isActive !== null) where.isActive = isActive === 'true';

    // Get users
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
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
          _count: {
            select: {
              assignedClaims: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.user.count({ where })
    ]);

    return NextResponse.json({
      success: true,
      data: {
        users,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      }
    });

  } catch (error: any) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/users - Create new user
export async function POST(request: NextRequest) {
  try {
    const adminUser = await verifyAdminToken(request);
    if (!adminUser) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only SUPER_ADMIN can create users
    if (adminUser.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Only Super Admins can create users' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      email, 
      password, 
      firstName, 
      lastName, 
      role,
      maxWorkload = 20 
    } = body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !role) {
      return NextResponse.json(
        { success: false, message: 'Email, password, firstName, lastName and role are required' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ['SUPER_ADMIN', 'MANAGER_SENIOR', 'MANAGER_JUNIOR', 'EXPERT'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { success: false, message: 'Invalid role specified' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        email: email
      }
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        role,
        maxWorkload: parseInt(maxWorkload.toString()),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      select: {
        userId: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        maxWorkload: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        entityType: 'USER',
        entityId: user.userId,
        action: 'CREATE',
        description: `User account created by admin: ${user.firstName} ${user.lastName} (${email}) with role ${role}`,
        userId: adminUser.userId,
        ipAddress: request.headers.get('x-forwarded-for') || 
                  request.headers.get('x-real-ip') || 
                  'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        newValues: {
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        riskLevel: role === 'SUPER_ADMIN' ? 'HIGH' : 'MEDIUM',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      data: { user }
    });

  } catch (error: any) {
    console.error('Create user error:', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, message: 'Email already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}