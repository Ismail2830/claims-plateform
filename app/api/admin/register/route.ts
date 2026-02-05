import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    console.log('Admin registration request received');
    
    const body = await request.json();
    console.log('Request body:', { ...body, password: '[HIDDEN]' });
    
    const { 
      email, 
      password, 
      firstName, 
      lastName, 
      role = 'SUPER_ADMIN',
      maxWorkload = 20 
    } = body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { success: false, message: 'Email, password, firstName and lastName are required' },
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
        description: `New user account created: ${user.firstName} ${user.lastName} (${email}) with role ${role}`,
        userId: user.userId, // Self-creation for admin registration
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
        riskLevel: 'MEDIUM', // User creation is medium risk
      },
    });

    console.log('User created successfully:', user.userId);

    return NextResponse.json({
      success: true,
      message: 'Admin account created successfully',
      data: { user }
    });

  } catch (error: any) {
    console.error('Admin registration error:', error);
    
    // Handle Prisma unique constraint errors
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, message: 'Email already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Internal server error during registration' },
      { status: 500 }
    );
  }
}