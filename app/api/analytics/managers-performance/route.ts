/**
 * GET /api/analytics/managers-performance
 * Returns per-manager performance metrics.
 * Query: period=week|month|quarter|year
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { verifyAccessToken } from '@/app/lib/tokens';
import { getPeriodDates } from '@/app/lib/analytics-utils';

function auth(req: NextRequest) {
  const h = req.headers.get('authorization');
  const cookieToken = req.cookies.get('admin_at')?.value;
  const token = h?.startsWith('Bearer ') ? h.substring(7) : cookieToken;
  if (!token) return null;
  try { return verifyAccessToken(token); } catch { return null; }
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const period = req.nextUrl.searchParams.get('period') ?? 'month';
  const { dateFrom, dateTo } = getPeriodDates(period);

  const managers = await prisma.user.findMany({
    where: {
      role: { in: ['MANAGER_SENIOR', 'MANAGER_JUNIOR'] },
      isActive: true,
    },
    select: {
      userId: true,
      firstName: true,
      lastName: true,
      role: true,
      currentWorkload: true,
      maxWorkload: true,
      assignedClaims: {
        where: { createdAt: { gte: dateFrom, lte: dateTo } },
        select: {
          status: true,
          declarationDate: true,
          statusHistory: {
            where: { toStatus: { in: ['APPROVED', 'REJECTED'] } },
            orderBy: { createdAt: 'asc' },
            take: 1,
            select: { createdAt: true },
          },
        },
      },
    },
    orderBy: [{ role: 'asc' }, { lastName: 'asc' }],
  });

  const data = managers.map(m => {
    const claims = m.assignedClaims;
    const total = claims.length;
    const approved = claims.filter(c => ['APPROVED', 'IN_PAYMENT', 'CLOSED'].includes(c.status)).length;
    const rejected = claims.filter(c => c.status === 'REJECTED').length;
    const processing = total - approved - rejected;

    const resolutionDays = claims
      .filter(c => c.statusHistory.length > 0)
      .map(c => {
        const resolved = c.statusHistory[0].createdAt.getTime();
        const declared = c.declarationDate.getTime();
        return (resolved - declared) / (1000 * 60 * 60 * 24);
      });
    const avgResolutionDays = resolutionDays.length > 0
      ? Math.round(resolutionDays.reduce((a, b) => a + b, 0) / resolutionDays.length)
      : null;

    return {
      userId: m.userId,
      firstName: m.firstName,
      lastName: m.lastName,
      role: m.role,
      currentWorkload: m.currentWorkload,
      maxWorkload: m.maxWorkload,
      total,
      approved,
      rejected,
      processing,
      approvalRate: total > 0 ? Math.round((approved / total) * 100) : 0,
      avgResolutionDays,
    };
  });

  return NextResponse.json({ data, period });
}
