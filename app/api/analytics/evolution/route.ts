/**
 * GET /api/analytics/evolution
 * Returns time-series claim counts by granularity.
 * Query: period=week|month|quarter|year, granularity=day|week|month
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
    select: { status: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  // Determine granularity
  const spanDays = Math.ceil((dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24));
  const granularity = spanDays <= 14 ? 'day' : spanDays <= 90 ? 'week' : 'month';

  function getBucketKey(date: Date): string {
    if (granularity === 'day') {
      return date.toISOString().slice(0, 10);
    }
    if (granularity === 'week') {
      const d = new Date(date);
      d.setDate(d.getDate() - d.getDay());
      return d.toISOString().slice(0, 10);
    }
    // month
    return date.toISOString().slice(0, 7);
  }

  const buckets: Record<string, { total: number; approved: number; rejected: number; pending: number }> = {};

  for (const c of claims) {
    const key = getBucketKey(c.createdAt);
    if (!buckets[key]) buckets[key] = { total: 0, approved: 0, rejected: 0, pending: 0 };
    buckets[key].total++;
    if (['APPROVED', 'IN_PAYMENT', 'CLOSED'].includes(c.status)) buckets[key].approved++;
    else if (c.status === 'REJECTED') buckets[key].rejected++;
    else buckets[key].pending++;
  }

  const data = Object.entries(buckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }));

  return NextResponse.json({ data, granularity, period });
}
