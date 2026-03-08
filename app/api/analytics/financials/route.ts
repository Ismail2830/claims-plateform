/**
 * GET /api/analytics/financials
 * Returns financial aggregates by claim type and monthly payment trend.
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

const TYPE_LABELS: Record<string, string> = {
  ACCIDENT: 'Accident',
  THEFT: 'Vol',
  FIRE: 'Incendie',
  WATER_DAMAGE: 'Dégât des eaux',
};

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const period = req.nextUrl.searchParams.get('period') ?? 'month';
  const { dateFrom, dateTo } = getPeriodDates(period);

  const [byTypeRaw, allForTrend] = await Promise.all([
    prisma.claim.groupBy({
      by: ['claimType'],
      where: { createdAt: { gte: dateFrom, lte: dateTo } },
      _sum: { claimedAmount: true, estimatedAmount: true, approvedAmount: true },
    }),
    // Last 12 months for payment trend regardless of period
    prisma.claim.findMany({
      where: {
        status: { in: ['APPROVED', 'IN_PAYMENT', 'CLOSED'] },
        createdAt: { gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1)) },
      },
      select: { approvedAmount: true, claimedAmount: true, createdAt: true },
    }),
  ]);

  const byType = byTypeRaw.map(r => ({
    type: r.claimType,
    label: TYPE_LABELS[r.claimType] ?? r.claimType,
    claimed: Math.round(Number(r._sum.claimedAmount ?? 0)),
    estimated: Math.round(Number(r._sum.estimatedAmount ?? 0)),
    approved: Math.round(Number(r._sum.approvedAmount ?? 0)),
  }));

  // Monthly payment trend (last 12 months)
  // Use approvedAmount when available, fall back to claimedAmount so months without
  // explicit approved amounts still appear in the chart.
  const monthlyMap: Record<string, number> = {};
  for (const c of allForTrend) {
    const amount = Number(c.approvedAmount ?? c.claimedAmount ?? 0);
    const key = c.createdAt.toISOString().slice(0, 7);
    monthlyMap[key] = (monthlyMap[key] ?? 0) + amount;
  }
  const monthlyPayments = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, amount]) => ({ month, amount: Math.round(amount) }));

  // Totals for current period
  const totals = byType.reduce(
    (acc, r) => ({
      claimed: acc.claimed + r.claimed,
      estimated: acc.estimated + r.estimated,
      approved: acc.approved + r.approved,
    }),
    { claimed: 0, estimated: 0, approved: 0 },
  );

  return NextResponse.json({ byType, monthlyPayments, totals, period });
}
