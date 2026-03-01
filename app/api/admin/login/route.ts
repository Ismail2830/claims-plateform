import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import bcrypt from 'bcryptjs';
import {
  signAccessToken,
  signRefreshToken,
  hashToken,
  parseDeviceName,
  buildRefreshCookieOptions,
  ADMIN_REFRESH_COOKIE,
  ADMIN_ACCESS_COOKIE,
  ACCESS_COOKIE_OPTIONS,
} from '@/app/lib/tokens';

export async function POST(request: NextRequest) {
  try {
    console.log('Admin login request received');
    
    const body = await request.json();
    console.log('Login attempt for:', body.email);
    
    const { email, password, rememberMe = false } = body;

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

    // ── Issue 15-min access token ─────────────────────────────────
    const accessToken = signAccessToken({
      userId: user.userId,
      email: user.email,
      role: user.role,
      type: 'ADMIN',
    });

    // ── Issue refresh token with duration based on rememberMe ────────────────────────
    const refreshDays = rememberMe ? 30 : 7;
    const rawRefresh  = signRefreshToken({ userId: user.userId, type: 'ADMIN' }, `${refreshDays}d`);
    const ipAddress   = request.headers.get('x-forwarded-for') ||
                        request.headers.get('x-real-ip') || 'unknown';
    const userAgent   = request.headers.get('user-agent') || 'unknown';

    await prisma.session.create({
      data: {
        userId: user.userId,
        hashedToken: hashToken(rawRefresh),
        ipAddress,
        userAgent,
        deviceName: parseDeviceName(userAgent),
        rememberMe,
        expiresAt: new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: 'USER',
        entityId: user.userId,
        action: 'LOGIN',
        description: `Admin user logged in: ${user.firstName} ${user.lastName} (${user.email})`,
        userId: user.userId,
        ipAddress,
        userAgent,
        metadata: {
          loginTime: new Date().toISOString(),
          role: user.role,
        },
        riskLevel: user.role === 'SUPER_ADMIN' ? 'HIGH' : 'MEDIUM',
      },
    });

    console.log('Admin login successful:', user.userId);

    const { passwordHash, ...userData } = user;

    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      data: { token: accessToken, user: userData },
    });

    response.cookies.set(ADMIN_REFRESH_COOKIE, rawRefresh, buildRefreshCookieOptions(rememberMe));
    response.cookies.set(ADMIN_ACCESS_COOKIE,  accessToken, ACCESS_COOKIE_OPTIONS);

    return response;

  } catch (error: any) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error during login' },
      { status: 500 }
    );
  }
}