import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import jwt from 'jsonwebtoken';
import { verifyOtp } from '@/app/lib/otp';
import {
  signAccessToken,
  signRefreshToken,
  hashToken,
  parseDeviceName,
  buildRefreshCookieOptions,
  CLIENT_REFRESH_COOKIE,
  CLIENT_ACCESS_COOKIE,
  ACCESS_COOKIE_OPTIONS,
  ACCESS_SECRET,
} from '@/app/lib/tokens';

const JWT_SECRET = ACCESS_SECRET; // pending-2FA token uses same secret

export async function POST(request: NextRequest) {
  try {
    const { pendingToken, otp } = await request.json();

    if (!pendingToken || !otp) {
      return NextResponse.json(
        { success: false, message: 'Pending token and OTP are required' },
        { status: 400 }
      );
    }

    // Verify the pending token
    let payload: { clientId: string; type: string; rememberMe?: boolean };
    try {
      payload = jwt.verify(pendingToken, JWT_SECRET) as { clientId: string; type: string; rememberMe?: boolean };
    } catch {
      return NextResponse.json(
        { success: false, message: 'Session expired. Please log in again.' },
        { status: 401 }
      );
    }

    if (payload.type !== 'PENDING_2FA') {
      return NextResponse.json({ success: false, message: 'Invalid session token' }, { status: 401 });
    }

    const { clientId, rememberMe = false } = payload;

    // Verify the OTP
    const valid = verifyOtp('2fa', clientId, String(otp).trim());
    if (!valid) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired OTP. Please try again.' },
        { status: 401 }
      );
    }

    // Fetch client for token payload
    const client = await prisma.client.findUnique({
      where: { clientId },
      select: {
        clientId: true,
        email: true,
        cin: true,
        firstName: true,
        lastName: true,
        status: true,
        emailVerified: true,
      },
    });

    if (!client || client.status !== 'ACTIVE') {
      return NextResponse.json({ success: false, message: 'Account not found or inactive' }, { status: 401 });
    }

    // Update last login
    await prisma.client.update({ where: { clientId }, data: { lastLoginAt: new Date() } });

    // ── Issue 15-min access token ────────────────────────────────
    const accessToken = signAccessToken({
      clientId: client.clientId,
      email: client.email,
      cin: client.cin,
      type: 'CLIENT',
    });

    // ── Issue refresh token with duration based on rememberMe ─────
    const refreshDays = rememberMe ? 30 : 7;
    const rawRefresh  = signRefreshToken({ clientId: client.clientId, type: 'CLIENT' }, `${refreshDays}d`);
    const ipAddress   = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent   = request.headers.get('user-agent') || '';

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

    // Audit log
    await prisma.auditLog.create({
      data: {
        entityType: 'CLIENT',
        entityId: client.clientId,
        action: 'LOGIN',
        description: `Successful 2FA login: ${client.firstName} ${client.lastName}`,
        clientId: client.clientId,
        ipAddress,
        userAgent,
        metadata: { email: client.email, loginTime: new Date(), twoFactor: true, success: true },
      },
    });

    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      // accessToken returned in body so existing localStorage code continues to work
      data: { token: accessToken, client },
    });

    // Set cookies for middleware + auto-refresh
    response.cookies.set(CLIENT_REFRESH_COOKIE, rawRefresh, buildRefreshCookieOptions(rememberMe));
    response.cookies.set(CLIENT_ACCESS_COOKIE,  accessToken, ACCESS_COOKIE_OPTIONS);

    return response;
  } catch (error) {
    console.error('2FA verify error:', error);
    const message = process.env.NODE_ENV === 'development'
      ? `2FA verification failed: ${error instanceof Error ? error.message : String(error)}`
      : '2FA verification failed';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
