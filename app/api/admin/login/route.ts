import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

export async function POST(request: NextRequest) {
  try {
    console.log('Admin login request received');
    
    const body = await request.json();
    console.log('Login attempt for:', body.email);
    
    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        userId: true,
        username: true,
        email: true,
        passwordHash: true,
        firstName: true,
        lastName: true,
        role: true,
        currentWorkload: true,
        maxWorkload: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
      },
    });

    if (!user) {
      console.log('User not found:', email);
      return NextResponse.json(
        { success: false, message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if user is active
    if (!user.isActive) {
      console.log('User account is inactive:', email);
      return NextResponse.json(
        { success: false, message: 'Account is inactive. Please contact administrator.' },
        { status: 401 }
      );
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      console.log('Invalid password for:', email);
      return NextResponse.json(
        { success: false, message: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Update last login
    await prisma.user.update({
      where: { userId: user.userId },
      data: { lastLogin: new Date() }
    });

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.userId,
        email: user.email,
        role: user.role,
        type: 'ADMIN'
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Create audit log
    await prisma.auditLog.create({
      data: {
        entityType: 'USER',
        entityId: user.userId,
        action: 'LOGIN',
        description: `Admin user logged in: ${user.username} (${user.email})`,
        userId: user.userId,
        ipAddress: request.headers.get('x-forwarded-for') || 
                  request.headers.get('x-real-ip') || 
                  'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        metadata: {
          loginTime: new Date().toISOString(),
          role: user.role,
        },
        riskLevel: user.role === 'SUPER_ADMIN' ? 'HIGH' : 'MEDIUM',
      },
    });

    console.log('Admin login successful:', user.userId);

    // Return user data without password hash
    const { passwordHash, ...userData } = user;
    
    return NextResponse.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: userData
      }
    });

  } catch (error: any) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error during login' },
      { status: 500 }
    );
  }
}