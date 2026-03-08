/**
 * GET /api/analytics/kpis
 * Returns KPI cards with trend vs previous period.
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
  const { dateFrom, dateTo, prevFrom, prevTo } = getPeriodDates(period);

  const [curr, prev] = await Promise.all([
    prisma.claim.findMany({
      where: { createdAt: { gte: dateFrom, lte: dateTo } },
      select: {
        status: true,
        approvedAmount: true,
        scoreRisque: true,
        declarationDate: true,
        statusHistory: {
          where: { toStatus: { in: ['APPROVED', 'REJECTED'] } },
          orderBy: { createdAt: 'asc' },
          take: 1,
          select: { createdAt: true },
        },
      },
    }),
    prisma.claim.count({ where: { createdAt: { gte: prevFrom, lte: prevTo } } }),
  ]);

  const total = curr.length;
  const approved = curr.filter(c => c.status === 'APPROVED' || c.status === 'IN_PAYMENT' || c.status === 'CLOSED').length;
  const rejected = curr.filter(c => c.status === 'REJECTED').length;
  const pending = curr.filter(c => !['APPROVED', 'IN_PAYMENT', 'CLOSED', 'REJECTED'].includes(c.status)).length;

  const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;

  // Average approved amount
  const approvedAmounts = curr.filter(c => c.approvedAmount != null).map(c => Number(c.approvedAmount));
  const avgApprovedAmount = approvedAmounts.length > 0
    ? Math.round(approvedAmounts.reduce((a, b) => a + b, 0) / approvedAmounts.length)
    : 0;

  // Average resolution days (declarationDate → first APPROVED/REJECTED status)
  const resolutionDays = curr
    .filter(c => c.statusHistory.length > 0)
    .map(c => {
      const resolved = c.statusHistory[0].createdAt.getTime();
      const declared = c.declarationDate.getTime();
      return (resolved - declared) / (1000 * 60 * 60 * 24);
    });
  const avgResolutionDays = resolutionDays.length > 0
    ? Math.round(resolutionDays.reduce((a, b) => a + b, 0) / resolutionDays.length)
    : 0;

  // Average risk score (scoreRisque 0–100)
  const scored = curr.filter(c => c.scoreRisque != null).map(c => c.scoreRisque as number);
  const avgRiskScore = scored.length > 0
    ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length)
    : 0;
  const aiCoverage = total > 0 ? Math.round((scored.length / total) * 100) : 0;

  return NextResponse.json({
    total,
    prevTotal: prev,
    approved,
    rejected,
    pending,
    approvalRate,
    avgApprovedAmount,
    avgResolutionDays,
    avgRiskScore,
    aiCoverage,
    period,
  });
}
