import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import {
  verifyRefreshToken,
  signAccessToken,
  hashToken,
  ADMIN_REFRESH_COOKIE,
  ADMIN_ACCESS_COOKIE,
  ACCESS_COOKIE_OPTIONS,
} from '@/app/lib/tokens';

export async function POST(req: NextRequest) {
  const rawRefresh = req.cookies.get(ADMIN_REFRESH_COOKIE)?.value;

  if (!rawRefresh) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  try {
    const decoded = verifyRefreshToken(rawRefresh);
    if (decoded.type !== 'ADMIN') throw new Error('wrong type');

    const session = await prisma.session.findFirst({
      where: {
        hashedToken: hashToken(rawRefresh),
        isRevoked: false,
        expiresAt: { gt: new Date() },
        userId: decoded.userId,
      },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session expirée.' }, { status: 401 });
    }

    await prisma.session.update({
      where: { id: session.id },
      data: { lastActivity: new Date() },
    });

    const user = await prisma.user.findUnique({
      where: { userId: decoded.userId },
      select: { userId: true, email: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Compte inactif.' }, { status: 401 });
    }

    const accessToken = signAccessToken({
      userId: user.userId,
      email: user.email,
      role: user.role,
      type: 'ADMIN',
    });

    const response = NextResponse.json({ accessToken, success: true });
    response.cookies.set(ADMIN_ACCESS_COOKIE, accessToken, ACCESS_COOKIE_OPTIONS);
    return response;
  } catch {
    return NextResponse.json({ error: 'Token invalide.' }, { status: 401 });
  }
}
