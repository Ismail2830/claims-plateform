import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { prisma } from '@/app/lib/prisma';

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, ['SUPER_ADMIN']);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const page     = Math.max(1, Number(searchParams.get('page') ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') ?? 20)));
  const action   = searchParams.get('action') ?? undefined;
  const userId   = searchParams.get('userId') ?? undefined;
  const status   = searchParams.get('status') ?? undefined;
  const from     = searchParams.get('from');
  const to       = searchParams.get('to');

  const where = {
    ...(action ? { action } : {}),
    ...(userId ? { userId } : {}),
    ...(status ? { status } : {}),
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to   ? { lte: new Date(to)   } : {}),
          },
        }
      : {}),
  };

  const [total, logs] = await Promise.all([
    prisma.platformAuditLog.count({ where }),
    prisma.platformAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip:  (page - 1) * pageSize,
      take:  pageSize,
    }),
  ]);

  return NextResponse.json({
    success: true,
    data:  logs,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}
