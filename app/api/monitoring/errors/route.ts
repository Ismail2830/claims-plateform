import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { prisma } from '@/app/lib/prisma';

/** Returns the most recent FAILURE entries from PlatformAuditLog as "errors". */
export async function GET(req: NextRequest) {
  const auth = await requireRole(req, ['SUPER_ADMIN']);
  if (!auth.ok) return auth.response;

  const errors = await prisma.platformAuditLog.findMany({
    where:   { status: 'FAILURE' },
    orderBy: { createdAt: 'desc' },
    take:    50,
  });

  return NextResponse.json({ success: true, data: errors });
}
