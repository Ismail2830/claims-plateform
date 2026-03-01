import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { verifyAccessToken } from '@/app/lib/tokens';

export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Token required' },
        { status: 401 }
      );
    }

    // Verify token using the correct access secret
    let decoded: ReturnType<typeof verifyAccessToken>;
    try {
      decoded = verifyAccessToken(token);
    } catch {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    if (decoded.type !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Invalid token type' },
        { status: 401 }
      );
    }

    // Get user profile
    const user = await prisma.user.findUnique({
      where: { userId: decoded.userId },
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
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { success: false, message: 'Account is inactive' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      data: user
    });

  } catch (error: any) {
    console.error('Admin profile error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    if (error.name === 'TokenExpiredError') {
      return NextResponse.json(
        { success: false, message: 'Token expired' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}