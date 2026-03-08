/**
 * GET /api/analytics/heatmap
 * Returns a day-of-week × hour heatmap of claim declarations.
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
    where: { declarationDate: { gte: dateFrom, lte: dateTo } },
    select: { declarationDate: true },
  });

  // Initialize 7×24 grid
  const grid: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0));

  for (const c of claims) {
    const dow = c.declarationDate.getDay(); // 0=Sun…6=Sat
    const hour = c.declarationDate.getHours();
    grid[dow][hour]++;
  }

  const data: { dayOfWeek: number; hour: number; count: number }[] = [];
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      data.push({ dayOfWeek: day, hour, count: grid[day][hour] });
    }
  }

  const maxCount = Math.max(...data.map(d => d.count), 1);

  return NextResponse.json({ data, maxCount, period });
}
