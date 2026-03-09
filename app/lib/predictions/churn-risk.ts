import { prisma } from '@/app/lib/prisma';
import { Prisma } from '@prisma/client';
import { ChurnClientData, ChurnStats, ChurnFactors, getChurnLabel } from './prediction-utils';

// ─── Main Calculation ─────────────────────────────────────────────────────────

export async function calculateChurnRisks(): Promise<void> {
  const now = new Date();

  // Fetch all active clients
  const clients = await prisma.client.findMany({
    where: { status: 'ACTIVE' },
    select: { clientId: true, firstName: true, lastName: true, email: true },
  });

  if (clients.length === 0) return;

  const clientIds = clients.map(c => c.clientId);

  // Factor 1: Rejected claims per client
  const rejectedRaw = await prisma.claim.groupBy({
    by: ['clientId'],
    where: { clientId: { in: clientIds }, status: 'REJECTED' },
    _count: { claimId: true },
  });
  const rejectedMap = new Map(rejectedRaw.map(r => [r.clientId, r._count.claimId]));

  // Factor 2: Avg resolution days (use updatedAt for resolved claims)
  type ResolutionRow = { client_id: string; avg_days: number };
  const resolutionRaw = await prisma.$queryRaw<ResolutionRow[]>`
    SELECT
      client_id,
      EXTRACT(EPOCH FROM AVG(updated_at - created_at)) / 86400.0 AS avg_days
    FROM claims
    WHERE client_id = ANY(${clientIds}::uuid[])
      AND status IN ('APPROVED','IN_PAYMENT','CLOSED','REJECTED')
    GROUP BY client_id
  `;
  const resolutionMap = new Map(resolutionRaw.map(r => [r.client_id, Number(r.avg_days)]));

  // Factor 3: Min days to policy renewal
  type RenewalRow = { client_id: string; min_days: number };
  const renewalRaw = await prisma.$queryRaw<RenewalRow[]>`
    SELECT
      client_id,
      MIN(end_date - CURRENT_DATE) AS min_days
    FROM policies
    WHERE client_id = ANY(${clientIds}::uuid[])
      AND status = 'ACTIVE'
    GROUP BY client_id
  `;
  const renewalMap = new Map(renewalRaw.map(r => [r.client_id, Number(r.min_days)]));

  // Factor 4: Days since last claim
  type LastClaimRow = { client_id: string; last_claim: Date };
  const lastClaimRaw = await prisma.$queryRaw<LastClaimRow[]>`
    SELECT
      client_id,
      MAX(created_at) AS last_claim
    FROM claims
    WHERE client_id = ANY(${clientIds}::uuid[])
    GROUP BY client_id
  `;
  const lastClaimMap = new Map(lastClaimRaw.map(r => [r.client_id, new Date(r.last_claim)]));

  // Factor 5: Complaint messages (from client sender)
  type ComplaintRow = { client_sender_id: string; complaint_count: number };
  const complaintRaw = await prisma.$queryRaw<ComplaintRow[]>`
    SELECT
      client_sender_id,
      COUNT(*)::int AS complaint_count
    FROM messages
    WHERE client_sender_id = ANY(${clientIds}::uuid[])
      AND (
        content ILIKE '%plainte%'
        OR content ILIKE '%insatisfait%'
        OR content ILIKE '%déçu%'
        OR content ILIKE '%avocat%'
        OR content ILIKE '%tribunal%'
      )
    GROUP BY client_sender_id
  `;
  const complaintMap = new Map(complaintRaw.map(r => [r.client_sender_id, Number(r.complaint_count)]));

  // Active policy count per client
  const policyRaw = await prisma.policy.groupBy({
    by: ['clientId'],
    where: { clientId: { in: clientIds }, status: 'ACTIVE' },
    _count: { policyId: true },
  });
  const policyMap = new Map(policyRaw.map(r => [r.clientId, r._count.policyId]));

  // Delete existing churn results
  await prisma.predictionResult.deleteMany({
    where: { module: 'CHURN_RISK' },
  });

  const validUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // Calculate score per client and bulk insert
  const results = [];
  for (const client of clients) {
    const id = client.clientId;
    let score = 0;
    const factorPoints: Record<string, number> = {};

    // Factor 1: Rejected claims
    const rejected = rejectedMap.get(id) ?? 0;
    let rejectedPoints = 0;
    if (rejected >= 3) rejectedPoints = 35;
    else if (rejected === 2) rejectedPoints = 25;
    else if (rejected === 1) rejectedPoints = 10;
    factorPoints['Réclamations rejetées'] = rejectedPoints;
    score += rejectedPoints;

    // Factor 2: Avg resolution days
    const avgDays = resolutionMap.get(id) ?? 0;
    let resolutionPoints = 0;
    if (avgDays > 14) resolutionPoints = 20;
    else if (avgDays > 7) resolutionPoints = 10;
    factorPoints['Délai de traitement'] = resolutionPoints;
    score += resolutionPoints;

    // Factor 3: Policy renewal proximity
    const minDays = renewalMap.get(id) ?? 999;
    let renewalPoints = 0;
    if (minDays < 14) renewalPoints = 20;
    else if (minDays < 30) renewalPoints = 10;
    factorPoints['Renouvellement proche'] = renewalPoints;
    score += renewalPoints;

    // Factor 4: Inactivity
    const lastClaim = lastClaimMap.get(id);
    let inactivityPoints = 0;
    if (lastClaim) {
      const daysSince = Math.floor((now.getTime() - lastClaim.getTime()) / 86400000);
      if (daysSince > 180) inactivityPoints = 15;
      else if (daysSince > 90) inactivityPoints = 8;
      factorPoints['Inactivité'] = inactivityPoints;
    } else {
      inactivityPoints = 15; // Never filed → very inactive
      factorPoints['Inactivité'] = inactivityPoints;
    }
    score += inactivityPoints;

    // Factor 5: Complaints
    const complaints = complaintMap.get(id) ?? 0;
    let complaintPoints = 0;
    if (complaints >= 2) complaintPoints = 10;
    else if (complaints === 1) complaintPoints = 5;
    factorPoints['Plaintes messages'] = complaintPoints;
    score += complaintPoints;

    const finalScore = Math.min(score, 100);

    // Main reason = factor with most points
    const mainReason = Object.entries(factorPoints).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Aucun facteur';
    const { label } = getChurnLabel(finalScore);

    const factors: ChurnFactors = {
      rejectedClaims: rejected,
      avgResolutionDays: Math.round(avgDays),
      minDaysToRenewal: minDays === 999 ? -1 : minDays,
      daysSinceLastClaim: lastClaim
        ? Math.floor((now.getTime() - lastClaim.getTime()) / 86400000)
        : -1,
      complaintsCount: complaints,
    };

    results.push({
      module: 'CHURN_RISK' as const,
      targetId: id,
      targetType: 'CLIENT',
      score: finalScore,
      data: {
        label,
        mainReason,
        factors,
        firstName: client.firstName,
        lastName: client.lastName,
        email: client.email,
        activePoliciesCount: policyMap.get(id) ?? 0,
        lastClaimDate: lastClaim ? lastClaim.toISOString() : null,
      },
      confidence: 0.75,
      validUntil,
    });
  }

  // Bulk create
  await prisma.predictionResult.createMany({
    data: results.map(r => ({ ...r, data: r.data as unknown as Prisma.InputJsonValue })),
  });
}

// ─── Read Helpers ─────────────────────────────────────────────────────────────

type ChurnResultData = {
  label: string;
  mainReason: string;
  factors: ChurnFactors;
  firstName: string;
  lastName: string;
  email: string;
  activePoliciesCount: number;
  lastClaimDate: string | null;
};

export async function getChurnRisks(
  limit = 20,
  riskLevel?: 'HIGH' | 'MEDIUM' | 'LOW',
  skip = 0
): Promise<{ clients: ChurnClientData[]; total: number }> {
  const scoreFilter =
    riskLevel === 'HIGH'
      ? { gte: 70 }
      : riskLevel === 'MEDIUM'
      ? { gte: 40, lt: 70 }
      : riskLevel === 'LOW'
      ? { lt: 40 }
      : undefined;

  const [items, total] = await Promise.all([
    prisma.predictionResult.findMany({
      where: {
        module: 'CHURN_RISK',
        ...(scoreFilter ? { score: scoreFilter } : {}),
      },
      orderBy: { score: 'desc' },
      take: limit,
      skip,
    }),
    prisma.predictionResult.count({
      where: {
        module: 'CHURN_RISK',
        ...(scoreFilter ? { score: scoreFilter } : {}),
      },
    }),
  ]);

  const clients: ChurnClientData[] = items.map(r => {
    const d = r.data as unknown as ChurnResultData;
    return {
      clientId: r.targetId ?? '',
      firstName: d.firstName,
      lastName: d.lastName,
      email: d.email,
      score: r.score ?? 0,
      label: d.label,
      mainReason: d.mainReason,
      factors: d.factors,
      activePoliciesCount: d.activePoliciesCount,
      lastClaimDate: d.lastClaimDate,
    };
  });

  return { clients, total };
}

export async function getChurnStats(): Promise<ChurnStats & { lastUpdated: Date | null }> {
  const results = await prisma.predictionResult.findMany({
    where: { module: 'CHURN_RISK' },
    select: { score: true, createdAt: true },
  });

  let high = 0, medium = 0, low = 0;
  for (const r of results) {
    const s = r.score ?? 0;
    if (s >= 70) high++;
    else if (s >= 40) medium++;
    else low++;
  }

  const lastUpdated =
    results.length > 0
      ? results.reduce((max: Date, r: { createdAt: Date }) => (r.createdAt > max ? r.createdAt : max), results[0].createdAt)
      : null;

  return { high, medium, low, total: results.length, lastUpdated };
}
