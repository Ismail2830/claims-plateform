import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import {
  verifyRefreshToken,
  signAccessToken,
  hashToken,
  CLIENT_REFRESH_COOKIE,
  CLIENT_ACCESS_COOKIE,
  ACCESS_COOKIE_OPTIONS,
} from '@/app/lib/tokens';

export async function POST(req: NextRequest) {
  const rawRefresh = req.cookies.get(CLIENT_REFRESH_COOKIE)?.value;

  if (!rawRefresh) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  try {
    // 1. Verify JWT signature
    const decoded = verifyRefreshToken(rawRefresh);
    if (decoded.type !== 'CLIENT') throw new Error('wrong type');

    // 2. Check session exists in DB — not revoked, not expired
    const session = await prisma.session.findFirst({
      where: {
        hashedToken: hashToken(rawRefresh),
        isRevoked: false,
        expiresAt: { gt: new Date() },
        clientId: decoded.clientId,
      },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session expirée.' }, { status: 401 });
    }

    // 3. Update last activity
    await prisma.session.update({
      where: { id: session.id },
      data: { lastActivity: new Date() },
    });

    // 4. Fetch client to build access token payload
    const client = await prisma.client.findUnique({
      where: { clientId: decoded.clientId },
      select: { clientId: true, email: true, cin: true, status: true },
    });

    if (!client || client.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Compte inactif.' }, { status: 401 });
    }

    // 5. Issue new 15-min access token
    const accessToken = signAccessToken({
      clientId: client.clientId,
      email: client.email,
      cin: client.cin,
      type: 'CLIENT',
    });

    const response = NextResponse.json({ accessToken, success: true });
    response.cookies.set(CLIENT_ACCESS_COOKIE, accessToken, ACCESS_COOKIE_OPTIONS);
    return response;
  } catch {
    return NextResponse.json({ error: 'Token invalide.' }, { status: 401 });
  }
}
