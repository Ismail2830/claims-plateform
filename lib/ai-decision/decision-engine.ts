// ─── AI Decision Engine — Pure Calculation Function ──────────────────────────
// IMPORTANT: This function never recalculates risk score.
// It only reads the pre-existing scoreRisque + labelRisque from the claim.

import type {
  ClaimForDecision,
  DecisionFactor,
  DecisionResult,
} from './types';

// Document types required per claim type
const REQUIRED_DOCS: Record<string, string[]> = {
  AUTO:         ['PHOTO_DEGATS', 'PERMIS_CONDUIRE'],
  FIRE:         ['PHOTO_DEGATS'],
  WATER_DAMAGE: ['PHOTO_DEGATS'],
  THEFT:        ['POLICE_REPORT'],
  ACCIDENT:     ['PHOTO_DEGATS', 'RAPPORT_MEDICAL'],
};

export function calculateDecision(data: ClaimForDecision): DecisionResult {
  let approveScore = 0;
  let rejectScore = 0;
  let escalateScore = 0;
  const factors: DecisionFactor[] = [];

  const {
    scoreRisque,
    labelRisque,
    typeSinistre,
    montantDeclare,
    documents,
    policy,
    clientClaimsLast12Months,
    clientClaimsLast90Days,
    hasFraudFlag,
    avgAmountForType,
  } = data;

  // ── FACTOR 1: Risk Score (reuse EXISTING scoreRisque — never recalculate) ──
  if (scoreRisque <= 30) {
    approveScore += 40;
    factors.push({
      id:     'RISK_SCORE',
      label:  'Score de risque',
      result: 'POSITIVE',
      impact: 40,
      detail: `Score risque faible (${scoreRisque}/100) — aucune anomalie détectée`,
    });
  } else if (scoreRisque <= 60) {
    approveScore += 15;
    factors.push({
      id:     'RISK_SCORE',
      label:  'Score de risque',
      result: 'NEUTRAL',
      impact: 15,
      detail: `Score risque modéré (${scoreRisque}/100) — vigilance recommandée`,
    });
  } else if (scoreRisque <= 80) {
    rejectScore   += 25;
    escalateScore += 20;
    factors.push({
      id:     'RISK_SCORE',
      label:  'Score de risque',
      result: 'NEGATIVE',
      impact: -25,
      detail: `Score risque élevé (${scoreRisque}/100) — vérification approfondie requise`,
    });
  } else {
    rejectScore   += 45;
    escalateScore += 30;
    factors.push({
      id:     'RISK_SCORE',
      label:  'Score de risque',
      result: 'CRITICAL',
      impact: -45,
      detail: `Score risque très élevé (${scoreRisque}/100) — profil suspicieux`,
    });
  }

  // ── FACTOR 2: Document Completeness ──
  const required      = REQUIRED_DOCS[typeSinistre] ?? [];
  const approvedDocs  = documents.filter(d => d.status === 'VERIFIED');
  const rejectedDocs  = documents.filter(d => d.status === 'REJECTED' || d.status === 'PENDING_RESUBMIT');
  const approvedTypes = approvedDocs.map(d => d.documentType);
  const missingRequired = required.filter(r => !approvedTypes.includes(r));

  if (missingRequired.length === 0 && rejectedDocs.length === 0 && approvedDocs.length > 0) {
    approveScore += 25;
    factors.push({
      id:     'DOCUMENTS',
      label:  'Complétude des documents',
      result: 'POSITIVE',
      impact: 25,
      detail: `Tous les documents requis sont validés (${approvedDocs.length} document${approvedDocs.length > 1 ? 's' : ''})`,
    });
  } else {
    rejectScore += 20;
    factors.push({
      id:     'DOCUMENTS',
      label:  'Complétude des documents',
      result: missingRequired.length > 0 ? 'NEGATIVE' : 'NEUTRAL',
      impact: -20,
      detail: `${missingRequired.length} document(s) manquant(s), ${rejectedDocs.length} rejeté(s)`,
    });
  }

  // ── FACTOR 3: Amount vs Historical Average ──
  const safeAvg = avgAmountForType > 0 ? avgAmountForType : montantDeclare;
  const ratio   = montantDeclare / safeAvg;

  if (ratio <= 1.5) {
    approveScore += 15;
    factors.push({
      id:     'AMOUNT',
      label:  'Montant déclaré',
      result: 'POSITIVE',
      impact: 15,
      detail: `Montant dans la norme (${Math.round(ratio * 100)}% de la moyenne ${typeSinistre})`,
    });
  } else if (ratio <= 2.5) {
    rejectScore += 5;
    factors.push({
      id:     'AMOUNT',
      label:  'Montant déclaré',
      result: 'NEUTRAL',
      impact: -5,
      detail: `Montant légèrement supérieur à la moyenne (x${ratio.toFixed(1)})`,
    });
  } else if (ratio <= 3.5) {
    rejectScore   += 20;
    escalateScore += 15;
    factors.push({
      id:     'AMOUNT',
      label:  'Montant déclaré',
      result: 'NEGATIVE',
      impact: -20,
      detail: `Montant élevé — ${ratio.toFixed(1)}x supérieur à la moyenne du type`,
    });
  } else {
    escalateScore += 35;
    rejectScore   += 15;
    factors.push({
      id:     'AMOUNT',
      label:  'Montant déclaré',
      result: 'CRITICAL',
      impact: -35,
      detail: `Montant très anormal — ${ratio.toFixed(1)}x la moyenne (expertise requise)`,
    });
  }

  // ── FACTOR 4: Client History ──
  if (clientClaimsLast12Months === 0) {
    approveScore += 10;
    factors.push({
      id:     'CLIENT_HISTORY',
      label:  'Historique client',
      result: 'POSITIVE',
      impact: 10,
      detail: "Premier sinistre — aucun historique problématique",
    });
  } else if (clientClaimsLast12Months <= 2) {
    factors.push({
      id:     'CLIENT_HISTORY',
      label:  'Historique client',
      result: 'NEUTRAL',
      impact: 0,
      detail: `${clientClaimsLast12Months} sinistre(s) dans les 12 derniers mois`,
    });
  } else if (clientClaimsLast12Months >= 3 || clientClaimsLast90Days >= 3) {
    rejectScore   += 20;
    escalateScore += 10;
    factors.push({
      id:     'CLIENT_HISTORY',
      label:  'Historique client',
      result: 'NEGATIVE',
      impact: -20,
      detail: `${clientClaimsLast12Months} sinistres en 12 mois — fréquence anormale`,
    });
  }

  // ── FACTOR 5: Policy Validation ──
  if (policy === null) {
    rejectScore += 40;
    factors.push({
      id:     'POLICY',
      label:  "Police d'assurance",
      result: 'CRITICAL',
      impact: -40,
      detail: "Aucune police d'assurance active trouvée — rejet automatique",
    });
  } else if (policy.status !== 'ACTIVE') {
    rejectScore += 40;
    factors.push({
      id:     'POLICY',
      label:  "Police d'assurance",
      result: 'CRITICAL',
      impact: -40,
      detail: `Police ${policy.status.toLowerCase()} à la date du sinistre`,
    });
  } else if (policy.coverageLimit !== null && montantDeclare > policy.coverageLimit) {
    escalateScore += 25;
    rejectScore   += 10;
    factors.push({
      id:     'POLICY',
      label:  "Police d'assurance",
      result: 'NEGATIVE',
      impact: -25,
      detail: `Montant déclaré (${montantDeclare.toLocaleString('fr-MA')} MAD) dépasse le plafond de couverture`,
    });
  } else {
    approveScore += 10;
    factors.push({
      id:     'POLICY',
      label:  "Police d'assurance",
      result: 'POSITIVE',
      impact: 10,
      detail: "Police active et couvrant le type de sinistre déclaré",
    });
  }

  // ── FACTOR 6: Fraud Flag ──
  if (hasFraudFlag) {
    escalateScore += 40;
    rejectScore   += 20;
    factors.push({
      id:     'FRAUD',
      label:  'Indicateurs de fraude',
      result: 'CRITICAL',
      impact: -40,
      detail: "Signal de fraude potentiel détecté par le système IA",
    });
  } else {
    approveScore += 5;
    factors.push({
      id:     'FRAUD',
      label:  'Indicateurs de fraude',
      result: 'POSITIVE',
      impact: 5,
      detail: "Aucun indicateur de fraude détecté",
    });
  }

  // ── FINAL DECISION ──
  let recommendation: 'APPROVE' | 'REJECT' | 'ESCALATE';
  let confidence: number;

  // ESCALATE always wins if threshold met
  if (escalateScore >= 40) {
    recommendation = 'ESCALATE';
    confidence     = Math.min(95, 50 + escalateScore * 0.5);
  } else if (approveScore > rejectScore + 15) {
    recommendation = 'APPROVE';
    const total    = approveScore + rejectScore;
    confidence     = total > 0 ? Math.min(98, (approveScore / total) * 100) : 55;
  } else if (rejectScore > approveScore + 15) {
    recommendation = 'REJECT';
    const total    = approveScore + rejectScore;
    confidence     = total > 0 ? Math.min(98, (rejectScore / total) * 100) : 55;
  } else {
    recommendation = 'ESCALATE';
    confidence     = 55;
  }

  const confidenceRounded = Math.round(confidence);

  // ── REASONING (French) ──
  const negativeCritical = factors.filter(f => f.result === 'NEGATIVE' || f.result === 'CRITICAL');
  const topNegativeStr = negativeCritical
    .slice(0, 2)
    .map(f => f.detail)
    .join('; ');

  const escalateFactors = factors
    .filter(f => f.result === 'CRITICAL')
    .slice(0, 2)
    .map(f => f.detail)
    .join('; ');

  let reasoning: string;
  if (recommendation === 'APPROVE') {
    reasoning = `Décision suggérée\u00a0: Approuver — Score risque ${labelRisque} (${scoreRisque}/100), documents complets, montant dans la norme. Aucune anomalie détectée. (Confiance\u00a0: ${confidenceRounded}%)`;
  } else if (recommendation === 'REJECT') {
    reasoning = `Décision suggérée\u00a0: Refuser — ${topNegativeStr || 'Plusieurs critères défavorables détectés'}. Plusieurs critères défavorables détectés. (Confiance\u00a0: ${confidenceRounded}%)`;
  } else {
    const reason = escalateFactors || topNegativeStr || 'Profil de risque complexe';
    reasoning = `Dossier complexe nécessitant l'avis d'un Manager Senior — ${reason}. Décision automatique impossible avec un niveau de confiance suffisant.`;
  }

  return {
    recommendation,
    confidence:   confidenceRounded,
    approveScore,
    rejectScore,
    escalateScore,
    factors,
    reasoning,
  };
}
