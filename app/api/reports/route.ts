import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { verifyAccessToken } from '@/app/lib/tokens';

function auth(req: NextRequest) {
  const h = req.headers.get('authorization');
  const cookieToken = req.cookies.get('admin_at')?.value;
  const token = h?.startsWith('Bearer ') ? h.substring(7) : cookieToken;
  if (!token) return null;
  try { return verifyAccessToken(token); } catch { return null; }
}

export async function GET(req: NextRequest) {
  const user = auth(req);
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const sp     = req.nextUrl.searchParams;
  const page   = Math.max(1, parseInt(sp.get('page') ?? '1', 10));
  const limit  = Math.min(50, Math.max(1, parseInt(sp.get('limit') ?? '20', 10)));
  const type   = sp.get('type') ?? undefined;
  const status = sp.get('status') ?? undefined;
  const format = sp.get('format') ?? undefined;

  const where: Record<string, unknown> = {};
  if (type)   where.type   = type;
  if (status) where.status = status;
  if (format) where.format = format;

  const [reports, total] = await Promise.all([
    prisma.generatedReport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip:    (page - 1) * limit,
      take:    limit,
      include: {
        generator: { select: { firstName: true, lastName: true, role: true } },
      },
    }),
    prisma.generatedReport.count({ where }),
  ]);

  return NextResponse.json({
    reports,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
