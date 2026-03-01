import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { hashToken, CLIENT_REFRESH_COOKIE, CLIENT_ACCESS_COOKIE } from '@/app/lib/tokens';

export async function POST(req: NextRequest) {
  const rawRefresh = req.cookies.get(CLIENT_REFRESH_COOKIE)?.value;

  if (rawRefresh) {
    try {
      await prisma.session.updateMany({
        where: { hashedToken: hashToken(rawRefresh), isRevoked: false },
        data: { isRevoked: true },
      });
    } catch {
      // best-effort — always clear cookies
    }
  }

  const response = NextResponse.json({ success: true, message: 'Déconnecté.' });
  response.cookies.set(CLIENT_REFRESH_COOKIE, '', { httpOnly: true, maxAge: 0, path: '/' });
  response.cookies.set(CLIENT_ACCESS_COOKIE,  '', { httpOnly: false, maxAge: 0, path: '/' });
  return response;
}
