/**
 * POST /api/claims/[id]/score
 *
 * Fetches a claim + client from Prisma, calls the ML microservice,
 * maps the result to Prisma enums, and persists the score back to the DB.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { RiskLabel, DecisionIA, PolicyType } from '@prisma/client';

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

/** Maps ML label string to Prisma RiskLabel enum. */
const LABEL_TO_ENUM: Record<string, RiskLabel> = {
  'Faible':     RiskLabel.FAIBLE,
  'Moyen':      RiskLabel.MOYEN,
  'Élevé':      RiskLabel.ELEVE,
  'Suspicieux': RiskLabel.SUSPICIEUX,
};

/** Maps ML decision string to Prisma DecisionIA enum. */
const DECISION_TO_ENUM: Record<string, DecisionIA> = {
  'Auto-approuver':       DecisionIA.AUTO_APPROUVER,
  'Révision manuelle':    DecisionIA.REVISION_MANUELLE,
  'Escalader / Enquête':  DecisionIA.ESCALADER,
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

  // 2. Calculate delai (days between incident and declaration)
  const delai = Math.floor(
    (claim.declarationDate.getTime() - claim.incidentDate.getTime()) / 86_400_000,
  );

  // 3. Calculate historique_score
  const { nbSinistresPasses, montantTotalPasse, ancienneteAnnees } = claim.client;
  const historique =
    nbSinistresPasses * (Number(montantTotalPasse) / (ancienneteAnnees + 1));

  // 4. Resolve ML type — prefer policy type, fallback to AUTO
  const mlType = claim.policy
    ? (POLICY_TYPE_TO_ML[claim.policy.policyType] ?? 'AUTO')
    : 'AUTO';

  // 5. Call ML microservice
  let mlResult: MLScoreResponse;
  try {
    const response = await fetch(`${ML_SERVICE_URL}/score`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        montant_declare:   Number(claim.claimedAmount ?? 0),
        type_sinistre:     mlType,
        delai_declaration: Math.max(0, delai),
        historique_score:  Math.max(0, historique),
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`ML service responded ${response.status}: ${detail}`);
    }

    mlResult = await response.json() as MLScoreResponse;
  } catch (err) {
    return NextResponse.json(
      {
        error: 'Le service de scoring IA est temporairement indisponible. Veuillez réessayer dans quelques instants.',
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 503 },
    );
  }

  // 6. Map to Prisma enums
  const labelRisque  = LABEL_TO_ENUM[mlResult.label]    ?? RiskLabel.FAIBLE;
  const decisionIa   = DECISION_TO_ENUM[mlResult.decision] ?? DecisionIA.REVISION_MANUELLE;

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
}
