import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { generateOtp, storeOtp, sendEmailOtp } from '@/app/lib/otp';
import { ACCESS_SECRET } from '@/app/lib/tokens';

const JWT_SECRET = ACCESS_SECRET;

/** Mask email - show first 3 chars and domain */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  const visible = local.slice(0, Math.min(3, local.length));
  return `${visible}***@${domain}`;
}

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

    // Always send email OTP on every login
    const code = generateOtp();
    storeOtp('2fa', client.clientId, code);
    await sendEmailOtp(client.email, code, '2fa');

    // Short-lived pending token (5 min) — carries clientId + rememberMe preference
    const pendingToken = jwt.sign(
      { clientId: client.clientId, type: 'PENDING_2FA', rememberMe: !!rememberMe },
      JWT_SECRET,
      { expiresIn: '5m' }
    );

    return NextResponse.json({
      success: true,
      requires2FA: true,
      method: 'email' as const,
      maskedContact: maskEmail(client.email),
      pendingToken,
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ success: false, message: 'Login failed' }, { status: 500 });
  }
}