import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import bcrypt from 'bcryptjs';
import {
  signAccessToken,
  signRefreshToken,
  hashToken,
  parseDeviceName,
  buildRefreshCookieOptions,
  CLIENT_REFRESH_COOKIE,
  CLIENT_ACCESS_COOKIE,
  ACCESS_COOKIE_OPTIONS,
} from '@/app/lib/tokens';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, rememberMe = false } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required' },
        { status: 400 }
      );
    }

    const client = await prisma.client.findUnique({
      where: { email },
      select: {
        clientId: true,
        email: true,
        cin: true,
        firstName: true,
        lastName: true,
        password: true,
        status: true,
        emailVerified: true,
        phone: true,
        twoFactorEnabled: true,
        twoFactorMethod: true,
      },
    });

    if (!client) {
      await prisma.auditLog.create({
        data: {
          entityType: 'CLIENT',
          entityId: '00000000-0000-0000-0000-000000000000',
          action: 'LOGIN',
          description: `Failed login attempt for email: ${email} - Client not found`,
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          riskLevel: 'MEDIUM',
          isSuspicious: true,
          metadata: { email, reason: 'Client not found', success: false },
        },
      });
      return NextResponse.json({ success: false, message: 'Invalid credentials' }, { status: 401 });
    }

    if (client.status !== 'ACTIVE') {
      return NextResponse.json({ success: false, message: 'Account is not active' }, { status: 401 });
    }

    const isValidPassword = await bcrypt.compare(password, client.password);
    if (!isValidPassword) {
      await prisma.auditLog.create({
        data: {
          entityType: 'CLIENT',
          entityId: client.clientId,
          action: 'LOGIN',
          description: `Failed login attempt for client: ${client.firstName} ${client.lastName} - Invalid password`,
          clientId: client.clientId,
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          riskLevel: 'MEDIUM',
          isSuspicious: true,
          metadata: { email: client.email, reason: 'Invalid password', success: false },
        },
      });
      return NextResponse.json({ success: false, message: 'Invalid credentials' }, { status: 401 });
    }

    // Issue tokens directly — 2FA email step is disabled
    const accessToken = signAccessToken({
      clientId: client.clientId,
      email: client.email,
      cin: client.cin,
      type: 'CLIENT',
    });

    const refreshDays = rememberMe ? 30 : 7;
    const rawRefresh  = signRefreshToken({ clientId: client.clientId, type: 'CLIENT' }, `${refreshDays}d`);
    const ipAddress   = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent   = request.headers.get('user-agent') || '';

    await prisma.client.update({ where: { clientId: client.clientId }, data: { lastLoginAt: new Date() } });

    await prisma.session.create({
      data: {
        clientId: client.clientId,
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
        entityType: 'CLIENT',
        entityId: client.clientId,
        action: 'LOGIN',
        description: `Successful login: ${client.firstName} ${client.lastName}`,
        clientId: client.clientId,
        ipAddress,
        userAgent,
        metadata: { email: client.email, loginTime: new Date(), success: true },
      },
    });

    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      data: { token: accessToken, client },
    });

    response.cookies.set(CLIENT_REFRESH_COOKIE, rawRefresh, buildRefreshCookieOptions(rememberMe));
    response.cookies.set(CLIENT_ACCESS_COOKIE,  accessToken, ACCESS_COOKIE_OPTIONS);

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ success: false, message: 'Login failed' }, { status: 500 });
  }
}