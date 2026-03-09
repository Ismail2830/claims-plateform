import { prisma } from '@/app/lib/prisma';
import { Prisma, ClaimStatus } from '@prisma/client';
import { ProvisionsData, ProvisionByType } from './prediction-utils';

type ClaimTypeKey = 'ACCIDENT' | 'THEFT' | 'FIRE' | 'WATER_DAMAGE';

// ─── Main Calculation ─────────────────────────────────────────────────────────

export async function calculateProvisions(): Promise<void> {
  const openStatuses: ClaimStatus[] = ['DECLARED', 'ANALYZING', 'DOCS_REQUIRED', 'UNDER_EXPERTISE', 'IN_DECISION'];
  const claimTypes: ClaimTypeKey[] = ['ACCIDENT', 'THEFT', 'FIRE', 'WATER_DAMAGE'];

  // Fetch open claims grouped by type
  const openClaims = await prisma.claim.groupBy({
    by: ['claimType'],
    where: { status: { in: openStatuses } },
    _count: { claimId: true },
    _sum: { claimedAmount: true },
  });

  // Historical approval rate per type (last 12 months)
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const historicalAll = await prisma.claim.groupBy({
    by: ['claimType', 'status'],
    where: {
      createdAt: { gte: oneYearAgo },
      claimType: { in: claimTypes },
    },
    _count: { claimId: true },
    _sum: { claimedAmount: true, approvedAmount: true },
  });

  // Build approval rate and payment ratio per type
  type TypeStats = {
    total: number;
    approved: number;
    totalDeclared: number;
    totalApproved: number;
  };

  const typeStats: Record<string, TypeStats> = {};
  for (const row of historicalAll) {
    const t = row.claimType as string;
    if (!typeStats[t]) typeStats[t] = { total: 0, approved: 0, totalDeclared: 0, totalApproved: 0 };
    typeStats[t].total += row._count.claimId;
    typeStats[t].totalDeclared += Number(row._sum.claimedAmount ?? 0);
    if (row.status === 'APPROVED' || row.status === 'IN_PAYMENT' || row.status === 'CLOSED') {
      typeStats[t].approved += row._count.claimId;
      typeStats[t].totalApproved += Number(row._sum.approvedAmount ?? 0);
    }
  }

  const openMap = new Map(openClaims.map(r => [r.claimType as string, r]));

  const provisions: ProvisionsData = {
    ACCIDENT: buildTypeProvision('ACCIDENT', openMap, typeStats),
    THEFT: buildTypeProvision('THEFT', openMap, typeStats),
    FIRE: buildTypeProvision('FIRE', openMap, typeStats),
    WATER_DAMAGE: buildTypeProvision('WATER_DAMAGE', openMap, typeStats),
    TOTAL: { openClaims: 0, totalDeclared: 0, estimatedPayout: 0 },
  };

  claimTypes.forEach(t => {
    provisions.TOTAL.openClaims += provisions[t].openClaims;
    provisions.TOTAL.totalDeclared += provisions[t].totalDeclared;
    provisions.TOTAL.estimatedPayout += provisions[t].estimatedPayout;
  });

  // Confidence based on historical data points
  const totalHistorical = Object.values(typeStats).reduce((sum, s) => sum + s.total, 0);
  const confidence =
    totalHistorical > 100 ? 0.90 :
    totalHistorical > 50  ? 0.80 :
    totalHistorical > 20  ? 0.70 : 0.60;

  const validUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await prisma.predictionResult.deleteMany({
    where: { module: 'PROVISIONING', targetType: 'PLATFORM' },
  });

  await prisma.predictionResult.create({
    data: {
      module: 'PROVISIONING',
      targetType: 'PLATFORM',
      data: { provisions, totalHistorical } as unknown as Prisma.InputJsonValue,
      confidence,
      validUntil,
    },
  });
}

function buildTypeProvision(
  type: string,
  openMap: Map<string, { _count: { claimId: number }; _sum: { claimedAmount: unknown } }>,
  statsMap: Record<string, { total: number; approved: number; totalDeclared: number; totalApproved: number }>
): ProvisionByType {
  const open = openMap.get(type);
  const stats = statsMap[type];

  const openClaims = open?._count.claimId ?? 0;
  const totalDeclared = Number(open?._sum.claimedAmount ?? 0);

  if (!stats || stats.total === 0) {
    return { openClaims, totalDeclared, estimatedPayout: totalDeclared * 0.5, approvalRate: 0.5, paymentRatio: 0.75 };
  }

  const approvalRate = stats.approved / stats.total;
  const paymentRatio = stats.totalDeclared > 0 ? stats.totalApproved / stats.totalDeclared : 0.75;
  const estimatedPayout = totalDeclared * approvalRate * paymentRatio;

  return { openClaims, totalDeclared, estimatedPayout, approvalRate, paymentRatio };
}

// ─── Read Helpers ─────────────────────────────────────────────────────────────

export async function getProvisions(): Promise<{
  provisions: ProvisionsData;
  confidence: number;
  totalHistorical: number;
  lastUpdated: Date | null;
} | null> {
  const result = await prisma.predictionResult.findFirst({
    where: { module: 'PROVISIONING', targetType: 'PLATFORM' },
    orderBy: { createdAt: 'desc' },
  });
  if (!result) return null;
  const data = result.data as unknown as { provisions: ProvisionsData; totalHistorical: number };
  return {
    provisions: data.provisions,
    confidence: result.confidence,
    totalHistorical: data.totalHistorical ?? 0,
    lastUpdated: result.createdAt,
  };
}

export async function getProvisionTotal(): Promise<number> {
  const data = await getProvisions();
  return data?.provisions.TOTAL.estimatedPayout ?? 0;
}
