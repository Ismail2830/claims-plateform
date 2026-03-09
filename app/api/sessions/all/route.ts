import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { prisma } from '@/app/lib/prisma';

/** Revoke all sessions except the caller's own. */
export async function DELETE(req: NextRequest) {
  const auth = await requireRole(req, ['SUPER_ADMIN']);
  if (!auth.ok) return auth.response;

  // Try to identify the current session token so we keep it alive
  const cookieHeader = req.headers.get('cookie') ?? '';
  const currentTokenMatch = cookieHeader.match(/(?:^|;\s*)admin_at=([^;]+)/);
  const currentToken = currentTokenMatch?.[1];

  await prisma.activeSession.deleteMany({
    where: currentToken
      ? { sessionToken: { not: currentToken } }
      : {},
  });

  return NextResponse.json({ success: true });
}
