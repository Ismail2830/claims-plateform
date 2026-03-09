import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { prisma } from '@/app/lib/prisma';

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, ['SUPER_ADMIN']);
  if (!auth.ok) return auth.response;

  const sessions = await prisma.activeSession.findMany({
    where: { expiresAt: { gt: new Date() } },
    orderBy: { lastActivity: 'desc' },
    take: 200,
  });

  return NextResponse.json({ success: true, data: sessions });
}
