/**
 * POST /api/claims/[id]/score
 *
 * Fetches a claim + client from Prisma, calls the ML microservice,
 * maps the result to Prisma enums, and persists the score back to the DB.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import type { PolicyType } from '@prisma/client';
import { scoreLocally, isLocalMLService } from '@/app/lib/ml-scoring';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL ?? 'http://localhost:8000';

// ─── ML Type mapping ──────────────────────────────────────────────────────────
/** Maps PolicyType enum to the 5 types the ML model understands. */
const POLICY_TYPE_TO_ML: Record<PolicyType, string> = {
  AUTO:         'AUTO',
  HOME:         'HOME',
  HEALTH:       'HEALTH',
  LIFE:         'LIFE',
  CONSTRUCTION: 'CONSTRUCTION',
  PROFESSIONAL: 'HOME',
  TRANSPORT:    'AUTO',
  AGRICULTURE:  'HOME',
  LIABILITY:    'HOME',
  ACCIDENT:     'HEALTH',
  ASSISTANCE:   'HEALTH',
  CREDIT:          'LIFE',
  SURETY:          'LIFE',
  TAKAFUL_NON_VIE: 'HOME',
  TAKAFUL_VIE:     'LIFE',
};

/** Maps ML label string → DB string value (Prisma RiskLabel enum). */
const LABEL_TO_DB: Record<string, string> = {
  'Faible':     'FAIBLE',
  'Moyen':      'MOYEN',
  'Élevé':      'ELEVE',
  'Suspicieux': 'SUSPICIEUX',
};

/** Maps ML decision string → DB string value (Prisma DecisionIA enum). */
const DECISION_TO_DB: Record<string, string> = {
  'Auto-approuver':       'AUTO_APPROUVER',
  'Révision manuelle':    'REVISION_MANUELLE',
  'Escalader / Enquête':  'ESCALADER',
};

// ─── ML response type ─────────────────────────────────────────────────────────
interface MLScoreResponse {
  score_risque: number;
  label:        string;
  confidence:   number;
  decision:     string;
}

// ─── Handler ──────────────────────────────────────────────────────────────────
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
  const { id } = await params;

  // 1. Fetch claim + client + policy
  const claim = await prisma.claim.findUnique({
    where: { claimId: id },
    include: {
      client: {
        select: {
          nbSinistresPasses: true,
          montantTotalPasse: true,
          ancienneteAnnees:  true,
        },
      },
      policy: {
        select: { policyType: true },
      },
    },
  });

  if (!claim) {
    return NextResponse.json(
      { error: 'Sinistre introuvable.' },
      { status: 404 },
    );
  }

  if (!claim.client) {
    return NextResponse.json(
      { error: 'Client associé introuvable.' },
      { status: 422 },
    );
  }

  // Guard: montant must be > 0 for ML model
  const montant = Math.max(1, Number(claim.claimedAmount ?? 0));

  // 2. Calculate delai (days between incident and declaration)
  const delai = Math.floor(
    (claim.declarationDate.getTime() - claim.incidentDate.getTime()) / 86_400_000,
  );

  const { nbSinistresPasses, montantTotalPasse, ancienneteAnnees } = claim.client;
  const historique =
    nbSinistresPasses * (Number(montantTotalPasse) / (ancienneteAnnees + 1));

  // 4. Resolve ML type — prefer policy type, fallback to AUTO
  const mlType = claim.policy
    ? (POLICY_TYPE_TO_ML[claim.policy.policyType] ?? 'AUTO')
    : 'AUTO';

  // 5. Call ML microservice (or inline scoring when service is not configured)
  const mlPayload = {
    montant_declare:   montant,
    type_sinistre:     mlType,
    delai_declaration: Math.max(0, delai),
    historique_score:  Math.max(0, historique),
  };

  let mlResult: MLScoreResponse;

  if (isLocalMLService(ML_SERVICE_URL)) {
    // Inline TypeScript scoring — works on Vercel serverless without any external service
    mlResult = scoreLocally(mlPayload);
  } else {
    try {
      const response = await fetch(`${ML_SERVICE_URL}/score`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mlPayload),
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(`ML service responded ${response.status}: ${detail}`);
      }

      mlResult = await response.json() as MLScoreResponse;
    } catch {
      // External service unreachable — fall back to inline scoring
      mlResult = scoreLocally(mlPayload);
    }
  }

  // 6. Map to DB enum strings (Prisma accepts string values for enums)
  const labelRisque = (LABEL_TO_DB[mlResult.label]    ?? 'FAIBLE')   as any;
  const decisionIa  = (DECISION_TO_DB[mlResult.decision] ?? 'REVISION_MANUELLE') as any;

  // 7. Persist score to DB
  const updated = await prisma.claim.update({
    where: { claimId: id },
    data: {
      scoreRisque:     mlResult.score_risque,
      labelRisque,
      decisionIa,
      scoreConfidence: mlResult.confidence,
      scoredAt:        new Date(),
    },
  });

  return NextResponse.json({
    claimId:        updated.claimId,
    scoreRisque:    updated.scoreRisque,
    labelRisque:    updated.labelRisque,
    decisionIa:     updated.decisionIa,
    scoreConfidence: updated.scoreConfidence,
    scoredAt:       updated.scoredAt,
  });
  } catch (err) {
    console.error('[score/route] Unhandled error:', err);
    return NextResponse.json(
      { error: 'Erreur interne lors du scoring.', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
