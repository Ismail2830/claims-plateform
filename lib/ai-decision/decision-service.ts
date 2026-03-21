// ─── AI Decision Service ──────────────────────────────────────────────────────
// Fetches all needed claim data, calls the engine, and persists the result.

import { prisma } from '@/app/lib/prisma';
import type { AIDecision, Prisma } from '@prisma/client';
import { calculateDecision } from './decision-engine';
import type { ClaimForDecision } from './types';

// ─── computeAndSaveDecision ───────────────────────────────────────────────────

export async function computeAndSaveDecision(
  claimId: string,
  autoTriggered = true,
): Promise<AIDecision> {
  // 1. Fetch claim with all needed relations
  const claim = await prisma.claim.findUnique({
    where: { claimId },
    include: {
      documents: {
        where: { isArchived: false },
        select: {
          fileType:     true,
          status:       true,
          rejectionNote: true,
        },
      },
      policy: {
        select: {
          status:        true,
          startDate:     true,
          endDate:       true,
          insuredAmount: true,
          policyType:    true,
        },
      },
    },
  });

  if (!claim) throw new Error(`Claim ${claimId} introuvable`);

  // 2. Count client claims in last 12 months and 90 days
  const now = new Date();
  const twelveMonthsAgo = new Date(now);
  twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
  const ninetyDaysAgo = new Date(now);
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const [c12m, c90d, avgResult] = await Promise.all([
    prisma.claim.count({
      where: {
        clientId:  claim.clientId,
        claimId:   { not: claimId },
        createdAt: { gte: twelveMonthsAgo },
      },
    }),
    prisma.claim.count({
      where: {
        clientId:  claim.clientId,
        claimId:   { not: claimId },
        createdAt: { gte: ninetyDaysAgo },
      },
    }),
    prisma.claim.aggregate({
      where: {
        claimType:    claim.claimType,
        createdAt:    { gte: twelveMonthsAgo },
        claimedAmount: { not: null },
      },
      _avg: { claimedAmount: true },
    }),
  ]);

  // 3. Check for fraud flag in prediction_results
  const fraudAlert = await prisma.predictionResult.findFirst({
    where: {
      module:     'FRAUD_CLUSTER',
      targetId:   claimId,
      validUntil: { gte: now },
    },
  });

  const avgAmount = avgResult._avg.claimedAmount
    ? Number(avgResult._avg.claimedAmount)
    : Number(claim.claimedAmount ?? claim.estimatedAmount ?? 0);

  // 4. Assemble ClaimForDecision
  const input: ClaimForDecision = {
    claimId:       claim.claimId,
    claimNumber:   claim.claimNumber,
    typeSinistre:  claim.claimType,
    montantDeclare: Number(claim.claimedAmount ?? claim.estimatedAmount ?? 0),
    // EXISTING fields — never recalculate
    scoreRisque:   claim.scoreRisque ?? 50,
    labelRisque:   claim.labelRisque ?? 'Moyen',
    clientId:      claim.clientId,
    createdAt:     claim.createdAt,
    documents:     claim.documents.map(d => ({
      documentType:    d.fileType,
      status:          d.status,
      rejectionReason: d.rejectionNote ?? undefined,
    })),
    policy: claim.policy
      ? {
          status:        claim.policy.status,
          startDate:     claim.policy.startDate,
          endDate:       claim.policy.endDate,
          coverageLimit: Number(claim.policy.insuredAmount ?? 0) || null,
          type:          claim.policy.policyType,
        }
      : null,
    clientClaimsLast12Months: c12m,
    clientClaimsLast90Days:   c90d,
    hasFraudFlag:             fraudAlert !== null,
    avgAmountForType:         avgAmount,
  };

  // 5. Calculate
  const result = calculateDecision(input);

  // 6. Upsert to ai_decisions
  const saved = await prisma.aIDecision.upsert({
    where:  { claimId },
    create: {
      claimId,
      recommendation: result.recommendation,
      confidence:     result.confidence,
      approveScore:   result.approveScore,
      rejectScore:    result.rejectScore,
      escalateScore:  result.escalateScore,
      factors:        result.factors as unknown as Prisma.InputJsonValue,
      reasoning:      result.reasoning,
      autoTriggered,
      calculatedAt:   new Date(),
    },
    update: {
      recommendation: result.recommendation,
      confidence:     result.confidence,
      approveScore:   result.approveScore,
      rejectScore:    result.rejectScore,
      escalateScore:  result.escalateScore,
      factors:        result.factors as unknown as Prisma.InputJsonValue,
      reasoning:      result.reasoning,
      autoTriggered,
      followedByUser: null,
      ignoredReason:  null,
      calculatedAt:   new Date(),
    },
  });

  return saved;
}

// ─── getDecision ─────────────────────────────────────────────────────────────

export async function getDecision(claimId: string): Promise<AIDecision | null> {
  return prisma.aIDecision.findUnique({ where: { claimId } });
}

// ─── recordFeedback ───────────────────────────────────────────────────────────

export async function recordFeedback(
  claimId: string,
  followedByUser: boolean,
  ignoredReason?: string,
): Promise<void> {
  await prisma.aIDecision.update({
    where: { claimId },
    data:  { followedByUser, ignoredReason: ignoredReason ?? null },
  });
}
