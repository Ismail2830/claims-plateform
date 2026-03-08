/**
 * GET /api/analytics/by-type
 * Returns claims grouped by claimType and by status.
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

const STATUS_LABELS: Record<string, string> = {
  DECLARED: 'Déclaré',
  ANALYZING: 'En analyse',
  DOCS_REQUIRED: 'Docs manquants',
  UNDER_EXPERTISE: 'Expertise',
  IN_DECISION: 'En décision',
  APPROVED: 'Approuvé',
  IN_PAYMENT: 'En paiement',
  CLOSED: 'Clôturé',
  REJECTED: 'Rejeté',
};

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const period = req.nextUrl.searchParams.get('period') ?? 'month';
  const { dateFrom, dateTo } = getPeriodDates(period);

  const [byTypeRaw, byStatusRaw] = await Promise.all([
    prisma.claim.groupBy({
      by: ['claimType'],
      where: { createdAt: { gte: dateFrom, lte: dateTo } },
      _count: { claimId: true },
      _sum: { claimedAmount: true },
    }),
    prisma.claim.groupBy({
      by: ['status'],
      where: { createdAt: { gte: dateFrom, lte: dateTo } },
      _count: { claimId: true },
    }),
  ]);

  const byType = byTypeRaw.map(r => ({
    type: r.claimType,
    label: TYPE_LABELS[r.claimType] ?? r.claimType,
    count: r._count.claimId,
    claimedAmount: Number(r._sum.claimedAmount ?? 0),
  }));

  const byStatus = byStatusRaw.map(r => ({
    status: r.status,
    label: STATUS_LABELS[r.status] ?? r.status,
    count: r._count.claimId,
  }));

  return NextResponse.json({ byType, byStatus, period });
}
