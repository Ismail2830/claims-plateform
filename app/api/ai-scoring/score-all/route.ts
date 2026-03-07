import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import type { PolicyType } from '@prisma/client';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL ?? 'http://localhost:8000';

const POLICY_TYPE_TO_ML: Record<PolicyType, string> = {
  AUTO:            'AUTO',
  HOME:            'HOME',
  HEALTH:          'HEALTH',
  LIFE:            'LIFE',
  CONSTRUCTION:    'CONSTRUCTION',
  PROFESSIONAL:    'HOME',
  TRANSPORT:       'AUTO',
  AGRICULTURE:     'HOME',
  LIABILITY:       'HOME',
  ACCIDENT:        'HEALTH',
  ASSISTANCE:      'HEALTH',
  CREDIT:          'LIFE',
  SURETY:          'LIFE',
  TAKAFUL_NON_VIE: 'HOME',
  TAKAFUL_VIE:     'LIFE',
};

const LABEL_TO_DB: Record<string, string> = {
  'Faible':     'FAIBLE',
  'Moyen':      'MOYEN',
  'Élevé':      'ELEVE',
  'Suspicieux': 'SUSPICIEUX',
};

const DECISION_TO_DB: Record<string, string> = {
  'Auto-approuver':      'AUTO_APPROUVER',
  'Révision manuelle':   'REVISION_MANUELLE',
  'Escalader / Enquête': 'ESCALADER',
};

interface MLSingleInput {
  montant_declare:   number;
  type_sinistre:     string;
  delai_declaration: number;
  historique_score:  number;
}

interface MLSingleResult {
  score_risque: number;
  label:        string;
  confidence:   number;
  decision:     string;
}

interface MLBatchResponse {
  results: MLSingleResult[];
  total:   number;
}

export async function POST() {
  const startTime = Date.now();

  try {
    // 1. Fetch all claims without a score, including client/policy info
    const unscoredClaims = await prisma.claim.findMany({
      where: { scoreRisque: null },
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

    if (unscoredClaims.length === 0) {
      return NextResponse.json({ scored: 0, failed: 0, duration_ms: Date.now() - startTime });
    }

    // 2. Build ML payloads
    const payloads: MLSingleInput[] = unscoredClaims.map(claim => {
      const montant = Math.max(1, Number(claim.claimedAmount ?? 0));
      const delai   = Math.max(
        0,
        Math.floor((claim.declarationDate.getTime() - claim.incidentDate.getTime()) / 86_400_000),
      );
      const { nbSinistresPasses, montantTotalPasse, ancienneteAnnees } = claim.client;
      const historique = nbSinistresPasses * (Number(montantTotalPasse) / (ancienneteAnnees + 1));
      const mlType = claim.policy ? (POLICY_TYPE_TO_ML[claim.policy.policyType] ?? 'AUTO') : 'AUTO';

      return {
        montant_declare:   montant,
        type_sinistre:     mlType,
        delai_declaration: delai,
        historique_score:  Math.max(0, historique),
      };
    });

    // 3. Call ML service batch endpoint
    let mlResults: MLSingleResult[];
    try {
      const response = await fetch(`${ML_SERVICE_URL}/score/batch`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payloads),
        signal:  AbortSignal.timeout(30_000),
      });

      if (!response.ok) {
        throw new Error(`ML service responded ${response.status}`);
      }

      const batchResponse = (await response.json()) as MLBatchResponse;
      mlResults = batchResponse.results;
    } catch (mlErr) {
      return NextResponse.json(
        {
          error:  'Service IA indisponible',
          detail: mlErr instanceof Error ? mlErr.message : String(mlErr),
        },
        { status: 503 },
      );
    }

    // 4. Persist scores with batch updates
    let scored = 0;
    let failed = 0;

    await Promise.allSettled(
      unscoredClaims.map(async (claim, idx) => {
        const result = mlResults[idx];
        if (!result) { failed++; return; }

        try {
          const labelRisque = (LABEL_TO_DB[result.label]        ?? 'FAIBLE')           as Parameters<typeof prisma.claim.update>[0]['data']['labelRisque'];
          const decisionIa  = (DECISION_TO_DB[result.decision]  ?? 'REVISION_MANUELLE') as Parameters<typeof prisma.claim.update>[0]['data']['decisionIa'];

          await prisma.claim.update({
            where: { claimId: claim.claimId },
            data: {
              scoreRisque:     result.score_risque,
              labelRisque,
              decisionIa,
              scoreConfidence: result.confidence,
              scoredAt:        new Date(),
            },
          });
          scored++;
        } catch {
          failed++;
        }
      }),
    );

    return NextResponse.json({
      scored,
      failed,
      duration_ms: Date.now() - startTime,
    });
  } catch (err) {
    console.error('[ai-scoring/score-all] Error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
