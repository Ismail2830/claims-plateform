/**
 * GET /api/analytics/geography
 * Returns claims grouped by client city and province.
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

  const claims = await prisma.claim.findMany({
    where: { createdAt: { gte: dateFrom, lte: dateTo } },
    select: {
      approvedAmount: true,
      client: { select: { city: true, province: true } },
    },
  });

  // Group by city
  const cityMap: Record<string, { count: number; approvedAmount: number }> = {};
  const provinceMap: Record<string, { count: number; approvedAmount: number }> = {};

  for (const c of claims) {
    const city = c.client.city || 'Inconnu';
    const province = c.client.province || 'Inconnu';
    const amount = Number(c.approvedAmount ?? 0);

    if (!cityMap[city]) cityMap[city] = { count: 0, approvedAmount: 0 };
    cityMap[city].count++;
    cityMap[city].approvedAmount += amount;

    if (!provinceMap[province]) provinceMap[province] = { count: 0, approvedAmount: 0 };
    provinceMap[province].count++;
    provinceMap[province].approvedAmount += amount;
  }

  const byCity = Object.entries(cityMap)
    .map(([city, v]) => ({ city, count: v.count, approvedAmount: Math.round(v.approvedAmount) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  const byProvince = Object.entries(provinceMap)
    .map(([province, v]) => ({ province, count: v.count, approvedAmount: Math.round(v.approvedAmount) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  return NextResponse.json({ byCity, byProvince, period });
}
