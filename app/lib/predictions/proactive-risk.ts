import { prisma } from '@/app/lib/prisma';
import { Prisma, ClaimStatus } from '@prisma/client';
import { ProactiveRiskData } from './prediction-utils';

// ─── Main Calculation ─────────────────────────────────────────────────────────

export async function calculateProactiveRisks(): Promise<void> {
  const now = new Date();
  const openStatuses: ClaimStatus[] = ['DECLARED', 'ANALYZING', 'DOCS_REQUIRED', 'UNDER_EXPERTISE', 'IN_DECISION'];

  const openClaims = await prisma.claim.findMany({
    where: { status: { in: openStatuses } },
    select: {
      claimId: true,
      claimNumber: true,
      claimType: true,
      clientId: true,
      claimedAmount: true,
      scoreRisque: true,
      createdAt: true,
      client: { select: { firstName: true, lastName: true } },
    },
  });

  if (openClaims.length === 0) return;

  const claimIds = openClaims.map(c => c.claimId);
  const clientIds = [...new Set(openClaims.map(c => c.clientId))];

  // Documents uploaded per claim
  const docCounts = await prisma.claimDocument.groupBy({
    by: ['claimId'],
    where: { claimId: { in: claimIds } },
    _count: { documentId: true },
  });
  const docMap = new Map(docCounts.map(d => [d.claimId, d._count.documentId]));

  // Previous high-risk claims per client
  const highRiskRaw = await prisma.claim.groupBy({
    by: ['clientId'],
    where: { clientId: { in: clientIds }, scoreRisque: { gt: 60 } },
    _count: { claimId: true },
  });
  const highRiskMap = new Map(highRiskRaw.map(r => [r.clientId, r._count.claimId]));

  // Average declared amount per claim type (last 12 months)
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  type AvgAmountRow = { claim_type: string; avg_amount: number };
  const avgAmountRaw = await prisma.$queryRaw<AvgAmountRow[]>`
    SELECT
      claim_type,
      AVG(claimed_amount)::float AS avg_amount
    FROM claims
    WHERE created_at >= ${oneYearAgo}
      AND claimed_amount IS NOT NULL
    GROUP BY claim_type
  `;
  const avgAmountMap = new Map(avgAmountRaw.map(r => [r.claim_type, Number(r.avg_amount)]));

  // Claims per client in last 90 days
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const recentClaimsRaw = await prisma.claim.groupBy({
    by: ['clientId'],
    where: { clientId: { in: clientIds }, createdAt: { gte: ninetyDaysAgo } },
    _count: { claimId: true },
  });
  const recentClaimsMap = new Map(recentClaimsRaw.map(r => [r.clientId, r._count.claimId]));

  // Delete old proactive risk results
  await prisma.predictionResult.deleteMany({ where: { module: 'PROACTIVE_RISK' } });

  const validUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const alertsToCreate: {
    module: 'PROACTIVE_RISK';
    severity: 'WARNING' | 'CRITICAL';
    title: string;
    description: string;
    targetId: string;
    targetType: string;
    metadata: Record<string, unknown>;
  }[] = [];

  const resultsToCreate = [];

  for (const claim of openClaims) {
    const signals: string[] = [];
    let riskBoost = 0;

    const daysSinceDeclaration = Math.floor(
      (now.getTime() - claim.createdAt.getTime()) / 86400000
    );
    const docsUploaded = docMap.get(claim.claimId) ?? 0;

    // Signal 1: No documents after 7 days
    if (docsUploaded === 0 && daysSinceDeclaration > 7) {
      signals.push('Aucun document après 7 jours');
      riskBoost += 20;
    }

    // Signal 2: Client history
    const prevHighRisk = highRiskMap.get(claim.clientId) ?? 0;
    if (prevHighRisk >= 2) {
      signals.push('Client avec historique de dossiers à risque');
      riskBoost += 25;
    }

    // Signal 3: Amount anomaly
    const avgAmount = avgAmountMap.get(claim.claimType) ?? 0;
    const claimedAmt = Number(claim.claimedAmount ?? 0);
    if (avgAmount > 0 && claimedAmt > avgAmount * 3) {
      signals.push('Montant 3x supérieur à la moyenne');
      riskBoost += 30;
    }

    // Signal 4: Weekend declaration
    const dow = claim.createdAt.getDay(); // 0=Sunday, 6=Saturday
    if (dow === 0 || dow === 6) {
      signals.push('Déclaré le weekend');
      riskBoost += 10;
    }

    // Signal 5: Multiple claims in 90 days
    const recentCount = recentClaimsMap.get(claim.clientId) ?? 0;
    if (recentCount >= 3) {
      signals.push('3+ sinistres en 90 jours');
      riskBoost += 20;
    }

    const originalScore = claim.scoreRisque ?? 0;
    const evolvedScore = Math.min(originalScore + riskBoost, 100);

    // Only save if risk actually increased significantly
    if (evolvedScore <= originalScore + 10 && signals.length === 0) continue;

    resultsToCreate.push({
      module: 'PROACTIVE_RISK' as const,
      targetId: claim.claimId,
      targetType: 'CLAIM',
      score: evolvedScore,
      data: {
        originalScore,
        evolvedScore,
        signals,
        riskBoost,
        claimNumber: claim.claimNumber,
        claimType: claim.claimType,
        clientName: `${claim.client.firstName} ${claim.client.lastName}`,
        clientId: claim.clientId,
        claimedAmount: claimedAmt,
        createdAt: claim.createdAt.toISOString(),
      },
      confidence: 0.78,
      validUntil,
    });

    // Create alert if high risk
    if (evolvedScore >= 70) {
      alertsToCreate.push({
        module: 'PROACTIVE_RISK',
        severity: evolvedScore >= 85 ? 'CRITICAL' : 'WARNING',
        title: `Risque croissant: ${claim.claimNumber}`,
        description: signals.join(' — '),
        targetId: claim.claimId,
        targetType: 'CLAIM',
        metadata: { evolvedScore, originalScore, signals, riskBoost },
      });
    }
  }

  if (resultsToCreate.length > 0) {
    await prisma.predictionResult.createMany({
      data: resultsToCreate.map(r => ({ ...r, data: r.data as unknown as Prisma.InputJsonValue })),
    });
  }

  // Remove old proactive alerts before inserting new
  await prisma.predictionAlert.deleteMany({ where: { module: 'PROACTIVE_RISK' } });

  if (alertsToCreate.length > 0) {
    await prisma.predictionAlert.createMany({
      data: alertsToCreate.map(a => ({ ...a, metadata: a.metadata as unknown as Prisma.InputJsonValue })),
    });
  }
}

// ─── Read Helpers ─────────────────────────────────────────────────────────────

type ProactiveResultData = {
  originalScore: number;
  evolvedScore: number;
  signals: string[];
  riskBoost: number;
  claimNumber: string;
  claimType: string;
  clientName: string;
  clientId: string;
  claimedAmount: number;
  createdAt: string;
};

export async function getProactiveRisks(
  minScore = 50,
  skip = 0,
  limit = 20
): Promise<{ claims: ProactiveRiskData[]; total: number }> {
  const [items, total] = await Promise.all([
    prisma.predictionResult.findMany({
      where: { module: 'PROACTIVE_RISK', score: { gte: minScore } },
      orderBy: { score: 'desc' },
      take: limit,
      skip,
    }),
    prisma.predictionResult.count({
      where: { module: 'PROACTIVE_RISK', score: { gte: minScore } },
    }),
  ]);

  const claims: ProactiveRiskData[] = items.map(r => {
    const d = r.data as unknown as ProactiveResultData;
    return {
      claimId: r.targetId ?? '',
      claimNumber: d.claimNumber,
      claimType: d.claimType,
      clientName: d.clientName,
      clientId: d.clientId,
      claimedAmount: d.claimedAmount,
      originalScore: d.originalScore,
      evolvedScore: d.evolvedScore,
      signals: d.signals,
      riskBoost: d.riskBoost,
      createdAt: d.createdAt,
    };
  });

  return { claims, total };
}

export async function getProactiveAlertCount(): Promise<number> {
  return prisma.predictionAlert.count({
    where: { module: 'PROACTIVE_RISK', isDismissed: false },
  });
}
