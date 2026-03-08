/**
 * GET /api/analytics/ai-fraud
 * Returns AI scoring distribution by week and decision distribution.
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
    select: { labelRisque: true, decisionIa: true, scoreRisque: true, createdAt: true },
  });

  const total = claims.length;
  const scored = claims.filter(c => c.labelRisque != null);

  // Average score
  const scores = scored.filter(c => c.scoreRisque != null).map(c => c.scoreRisque as number);
  const avgScore = scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;
  const aiCoverage = total > 0 ? Math.round((scored.length / total) * 100) : 0;

  // Risk distribution by week
  function getWeekKey(date: Date): string {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay());
    return d.toISOString().slice(0, 10);
  }

  type WeekBucket = { week: string; FAIBLE: number; MOYEN: number; ELEVE: number; SUSPICIEUX: number; unscored: number };
  const weekMap: Record<string, WeekBucket> = {};
  for (const c of claims) {
    const key = getWeekKey(c.createdAt);
    if (!weekMap[key]) weekMap[key] = { week: key, FAIBLE: 0, MOYEN: 0, ELEVE: 0, SUSPICIEUX: 0, unscored: 0 };
    if (c.labelRisque) weekMap[key][c.labelRisque as keyof Omit<WeekBucket, 'week'>]++;
    else weekMap[key].unscored++;
  }
  const riskDistribution = Object.values(weekMap).sort((a, b) => a.week.localeCompare(b.week));

  // Decision distribution
  const decisionMap: Record<string, number> = { AUTO_APPROUVER: 0, REVISION_MANUELLE: 0, ESCALADER: 0, NON_SCORE: 0 };
  for (const c of claims) {
    if (c.decisionIa) decisionMap[c.decisionIa]++;
    else decisionMap.NON_SCORE++;
  }
  const decisions = [
    { label: 'Auto-approuvé', key: 'AUTO_APPROUVER', count: decisionMap.AUTO_APPROUVER, color: '#10b981' },
    { label: 'Révision manuelle', key: 'REVISION_MANUELLE', count: decisionMap.REVISION_MANUELLE, color: '#f59e0b' },
    { label: 'Escaladé', key: 'ESCALADER', count: decisionMap.ESCALADER, color: '#ef4444' },
    { label: 'Non scoré', key: 'NON_SCORE', count: decisionMap.NON_SCORE, color: '#9ca3af' },
  ];

  return NextResponse.json({ riskDistribution, decisions, avgScore, aiCoverage, total, scoredCount: scored.length, period });
}
