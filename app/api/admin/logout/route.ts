import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { hashToken, ADMIN_REFRESH_COOKIE, ADMIN_ACCESS_COOKIE } from '@/app/lib/tokens';

export async function POST(req: NextRequest) {
  const rawRefresh = req.cookies.get(ADMIN_REFRESH_COOKIE)?.value;

  if (rawRefresh) {
    try {
      await prisma.session.updateMany({
        where: { hashedToken: hashToken(rawRefresh), isRevoked: false },
        data: { isRevoked: true },
      });
    } catch {
      // best-effort
    }
  }

  const response = NextResponse.json({ success: true, message: 'Déconnecté.' });
  response.cookies.set(ADMIN_REFRESH_COOKIE, '', { httpOnly: true, maxAge: 0, path: '/' });
  response.cookies.set(ADMIN_ACCESS_COOKIE,  '', { httpOnly: false, maxAge: 0, path: '/' });
  return response;
}
