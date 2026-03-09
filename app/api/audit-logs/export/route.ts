import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { prisma } from '@/app/lib/prisma';

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, ['SUPER_ADMIN']);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to   = searchParams.get('to');

  const logs = await prisma.platformAuditLog.findMany({
    where: {
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to   ? { lte: new Date(to)   } : {}),
            },
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 10_000,
  });

  const header = 'id,action,resourceType,resourceId,userId,userFullName,userRole,ipAddress,status,createdAt\n';
  const rows = logs.map((l: typeof logs[number]) =>
    [
      l.id, l.action, l.resourceType ?? '', l.resourceId ?? '',
      l.userId ?? '', l.userFullName ?? '', l.userRole ?? '',
      l.ipAddress ?? '', l.status, l.createdAt.toISOString(),
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(',')
  );

  return new NextResponse(header + rows.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="audit-logs-${Date.now()}.csv"`,
    },
  });
}
