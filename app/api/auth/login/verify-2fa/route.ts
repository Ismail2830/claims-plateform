import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import jwt from 'jsonwebtoken';
import { verifyOtp } from '@/app/lib/otp';

const JWT_SECRET    = process.env.JWT_SECRET   || 'your-super-secret-jwt-key-change-this-in-production';
const JWT_EXPIRES_IN = '7d';

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
    let payload: { clientId: string; type: string };
    try {
      payload = jwt.verify(pendingToken, JWT_SECRET) as { clientId: string; type: string };
    } catch {
      return NextResponse.json(
        { success: false, message: 'Session expired. Please log in again.' },
        { status: 401 }
      );
    }

    if (payload.type !== 'PENDING_2FA') {
      return NextResponse.json({ success: false, message: 'Invalid session token' }, { status: 401 });
    }

    const { clientId } = payload;

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

    // Issue the real JWT
    const token = jwt.sign(
      { clientId: client.clientId, email: client.email, cin: client.cin, type: 'CLIENT' },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Audit log
    await prisma.auditLog.create({
      data: {
        entityType: 'CLIENT',
        entityId: client.clientId,
        action: 'LOGIN',
        description: `Successful 2FA login: ${client.firstName} ${client.lastName}`,
        clientId: client.clientId,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        metadata: { email: client.email, loginTime: new Date(), twoFactor: true, success: true },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      data: { token, client },
    });
  } catch (error) {
    console.error('2FA verify error:', error);
    return NextResponse.json({ success: false, message: '2FA verification failed' }, { status: 500 });
  }
}
