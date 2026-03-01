import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/app/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { token, newPassword } = await req.json();

    if (!token || !newPassword) {
      return NextResponse.json({ error: 'Token et mot de passe requis.' }, { status: 400 });
    }

    // ── 1. Validate password strength ────────────────────────────
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 8 caractères.' },
        { status: 400 },
      );
    }

    // ── 2. Hash incoming raw token to compare with DB ─────────────
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // ── 3. Find valid, unused, non-expired token ──────────────────
    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        token: hashedToken,
        used: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!resetToken) {
      return NextResponse.json(
        { error: 'Lien invalide ou expiré. Veuillez faire une nouvelle demande.' },
        { status: 400 },
      );
    }

    // ── 4. Hash new password ──────────────────────────────────────
    const hashed = await bcrypt.hash(newPassword, 12);

    // ── 5. Update the correct model (Client or User) ──────────────
    if (resetToken.clientId) {
      await prisma.client.update({
        where: { clientId: resetToken.clientId },
        data: { password: hashed },
      });
    } else if (resetToken.userId) {
      await prisma.user.update({
        where: { userId: resetToken.userId },
        data: { passwordHash: hashed },
      });
    } else {
      return NextResponse.json({ error: 'Token invalide.' }, { status: 400 });
    }

    // ── 6. Mark token as used ─────────────────────────────────────
    await prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { used: true },
    });

    return NextResponse.json({ message: 'Mot de passe mis à jour avec succès.' });
  } catch (err) {
    console.error('[reset-password]', err);
    return NextResponse.json(
      { error: 'Une erreur est survenue. Réessayez plus tard.' },
      { status: 500 },
    );
  }
}
