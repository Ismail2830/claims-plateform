import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/app/lib/prisma';
import { sendPasswordResetEmail } from '@/app/lib/mailer';

// Generic success — never reveal whether an email exists (prevents email enumeration)
const OK = NextResponse.json({ message: 'Email envoyé si le compte existe.' });

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email requis.' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // ── 1. Check if a Client exists ───────────────────────────────
    const client = await prisma.client.findUnique({
      where: { email: normalizedEmail },
      select: { clientId: true, firstName: true, email: true, status: true },
    });

    if (client && client.status === 'ACTIVE') {
      await createAndSendToken({ clientId: client.clientId }, client.email, client.firstName);
      return OK;
    }

    // ── 2. Check if a User (staff) exists ─────────────────────────
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { userId: true, firstName: true, email: true, isActive: true },
    });

    if (user && user.isActive) {
      await createAndSendToken({ userId: user.userId }, user.email, user.firstName);
      return OK;
    }

    // Always return the same response
    return OK;
  } catch (err) {
    console.error('[forgot-password]', err);
    // Still return the generic message on unexpected errors
    return OK;
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

async function createAndSendToken(
  owner: { clientId?: string; userId?: string },
  email: string,
  firstName: string,
) {
  // Invalidate any existing unused tokens for this user
  if (owner.clientId) {
    await prisma.passwordResetToken.updateMany({
      where: { clientId: owner.clientId, used: false },
      data: { used: true },
    });
  } else if (owner.userId) {
    await prisma.passwordResetToken.updateMany({
      where: { userId: owner.userId, used: false },
      data: { used: true },
    });
  }

  // Generate and hash token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  await prisma.passwordResetToken.create({
    data: {
      token: hashedToken,
      expiresAt,
      ...(owner.clientId ? { clientId: owner.clientId } : {}),
      ...(owner.userId ? { userId: owner.userId } : {}),
    },
  });

  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${rawToken}`;
  await sendPasswordResetEmail({ to: email, firstName, resetUrl });
}
