import { prisma } from '@/app/lib/prisma';
import { Prisma } from '@prisma/client';
import { TariffRecommendation } from './prediction-utils';

// ─── Main Calculation ─────────────────────────────────────────────────────────

export async function calculateTariffRecommendations(): Promise<void> {
  const now = new Date();
  const sixtyDaysLater = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

  // Policies renewing in next 60 days
  const renewingPolicies = await prisma.policy.findMany({
    where: {
      endDate: { gte: now, lte: sixtyDaysLater },
      status: 'ACTIVE',
    },
    select: {
      policyId: true,
      policyNumber: true,
      clientId: true,
      premiumAmount: true,
      endDate: true,
      policyType: true,
      client: { select: { firstName: true, lastName: true } },
    },
  });

  if (renewingPolicies.length === 0) return;

  const clientIds = [...new Set(renewingPolicies.map(p => p.clientId))];
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

  // Risk scores and claim counts per client (last 2 years)
  type ClientRiskRow = {
    client_id: string;
    avg_score: number;
    claim_count: number;
    total_approved: number;
  };
  const riskRaw = await prisma.$queryRaw<ClientRiskRow[]>`
    SELECT
      client_id,
      AVG(COALESCE(score_risque, 0))::float AS avg_score,
      COUNT(*)::int AS claim_count,
      COALESCE(SUM(approved_amount), 0)::float AS total_approved
    FROM claims
    WHERE client_id = ANY(${clientIds}::uuid[])
      AND created_at >= ${twoYearsAgo}
    GROUP BY client_id
  `;
  const riskMap = new Map(riskRaw.map(r => [r.client_id, r]));

  // Total premium paid per client (all policies, last 2 years)
  type PremiumRow = { client_id: string; total_premium: number };
  const premiumRaw = await prisma.$queryRaw<PremiumRow[]>`
    SELECT
      client_id,
      COALESCE(SUM(premium_amount * 12), 0)::float AS total_premium
    FROM policies
    WHERE client_id = ANY(${clientIds}::uuid[])
      AND created_at >= ${twoYearsAgo}
    GROUP BY client_id
  `;
  const premiumMap = new Map(premiumRaw.map(r => [r.client_id, Number(r.total_premium)]));

  // Delete old tariff results
  await prisma.predictionResult.deleteMany({ where: { module: 'TARIFF_RECOMMENDATION' } });

  const validUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const results = [];

  for (const policy of renewingPolicies) {
    const clientData = riskMap.get(policy.clientId);
    const avgRiskScore = clientData ? Number(clientData.avg_score) : 0;
    const claimsCount = clientData ? Number(clientData.claim_count) : 0;
    const totalPaidOut = clientData ? Number(clientData.total_approved) : 0;
    const totalPremiumPaid = premiumMap.get(policy.clientId) ?? Number(policy.premiumAmount) * 12;

    const lossRatio = totalPremiumPaid > 0 ? totalPaidOut / totalPremiumPaid : 0;
    const currentPrime = Number(policy.premiumAmount);
    const daysToRenewal = Math.ceil(
      (policy.endDate.getTime() - now.getTime()) / 86400000
    );

    let adjustment = 0;
    let reason = 'Profil de risque stable';

    if (claimsCount === 0 && lossRatio === 0) {
      adjustment = -0.05;
      reason = 'Aucun sinistre — bonus sans sinistre';
    } else if (avgRiskScore < 20 && lossRatio < 0.3) {
      adjustment = -0.08;
      reason = 'Excellent historique, client fidèle';
    } else if (avgRiskScore < 40 && lossRatio < 0.6) {
      adjustment = 0;
      reason = 'Profil de risque stable';
    } else if (avgRiskScore >= 60 || lossRatio > 1.2) {
      adjustment = 0.25;
      reason = 'Risque élevé — ajustement tarifaire requis';
    } else if (avgRiskScore >= 40 || lossRatio > 0.8) {
      adjustment = 0.15;
      reason = 'Profil de risque en hausse';
    }

    const suggestedPrime = Math.round(currentPrime * (1 + adjustment) * 100) / 100;

    results.push({
      module: 'TARIFF_RECOMMENDATION' as const,
      targetId: policy.policyId,
      targetType: 'POLICY',
      data: {
        adjustment,
        reason,
        currentPrime,
        suggestedPrime,
        lossRatio,
        avgRiskScore,
        daysToRenewal,
        claimsCount,
        policyNumber: policy.policyNumber,
        policyType: policy.policyType,
        clientId: policy.clientId,
        clientName: `${policy.client.firstName} ${policy.client.lastName}`,
        endDate: policy.endDate.toISOString(),
      },
      confidence: 0.80,
      validUntil,
    });
  }

  if (results.length > 0) {
    await prisma.predictionResult.createMany({
      data: results.map(r => ({ ...r, data: r.data as unknown as Prisma.InputJsonValue })),
    });
  }
}

// ─── Read Helpers ─────────────────────────────────────────────────────────────

type TariffResultData = {
  adjustment: number;
  reason: string;
  currentPrime: number;
  suggestedPrime: number;
  lossRatio: number;
  avgRiskScore: number;
  daysToRenewal: number;
  claimsCount: number;
  policyNumber: string;
  policyType: string;
  clientId: string;
  clientName: string;
  endDate: string;
};

export async function getTariffRecommendations(
  daysToRenewal = 60,
  adjustmentType?: 'INCREASE' | 'DECREASE' | 'NEUTRAL'
): Promise<TariffRecommendation[]> {
  const results = await prisma.predictionResult.findMany({
    where: { module: 'TARIFF_RECOMMENDATION' },
    orderBy: { createdAt: 'desc' },
  });

  return results
    .map(r => {
      const d = r.data as unknown as TariffResultData;
      return {
        resultId: r.id,
        policyId: r.targetId ?? '',
        policyNumber: d.policyNumber,
        clientId: d.clientId,
        clientName: d.clientName,
        adjustment: d.adjustment,
        reason: d.reason,
        currentPrime: d.currentPrime,
        suggestedPrime: d.suggestedPrime,
        lossRatio: d.lossRatio,
        avgRiskScore: d.avgRiskScore,
        daysToRenewal: d.daysToRenewal,
        claimsCount: d.claimsCount,
        endDate: d.endDate,
        policyType: d.policyType,
      };
    })
    .filter(r => r.daysToRenewal <= daysToRenewal)
    .filter(r => {
      if (!adjustmentType) return true;
      if (adjustmentType === 'INCREASE') return r.adjustment > 0.005;
      if (adjustmentType === 'DECREASE') return r.adjustment < -0.005;
      return Math.abs(r.adjustment) <= 0.005;
    });
}

export async function applyTariffRecommendation(
  policyId: string,
  confirmedPrime: number
): Promise<void> {
  if (confirmedPrime <= 0) throw new Error('Prime invalide');

  await prisma.policy.update({
    where: { policyId },
    data: { premiumAmount: confirmedPrime, updatedAt: new Date() },
  });

  // Mark the prediction result as applied
  await prisma.predictionResult.deleteMany({
    where: { module: 'TARIFF_RECOMMENDATION', targetId: policyId },
  });
}
