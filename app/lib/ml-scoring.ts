/**
 * ml-scoring.ts — Inline TypeScript risk scoring
 *
 * Replicates the GradientBoostingClassifier from ml-service/train.py.
 * The model was trained on deterministic label rules; this module
 * implements those same rules so scoring works on Vercel serverless
 * without requiring the Python FastAPI service.
 *
 * Used as a fallback (or primary) when ML_SERVICE_URL is not configured.
 */

export interface MLInput {
  montant_declare:   number; // declared amount in MAD (> 0)
  type_sinistre:     string; // AUTO|HOME|HEALTH|LIFE|CONSTRUCTION
  delai_declaration: number; // days between incident and declaration
  historique_score:  number; // nb_sinistres × (montant_total / (anciennete + 1))
}

export interface MLResult {
  score_risque: number; // 0–100
  label:        string; // 'Faible'|'Moyen'|'Élevé'|'Suspicieux'
  confidence:   number; // 0–100
  decision:     string; // 'Auto-approuver'|'Révision manuelle'|'Escalader / Enquête'
}

// Small type-specific risk multiplier (mirrors how LabelEncoder + GBM
// learns slightly different patterns per insurance type)
const TYPE_RISK: Record<string, number> = {
  AUTO:         1.00,
  HOME:         1.05,
  HEALTH:       0.95,
  LIFE:         0.90,
  CONSTRUCTION: 1.10,
};

/**
 * Score a single claim inline.
 *
 * Label assignment rules are taken verbatim from ml-service/train.py
 * assign_label(). `historique_score / 40` approximates nb_sinistres_passes
 * (empirically: avg passe contribution ≈ 40).
 */
export function scoreLocally(input: MLInput): MLResult {
  const { montant_declare: m, delai_declaration: d, historique_score: h } = input;
  const typeMultiplier = TYPE_RISK[input.type_sinistre?.toUpperCase()] ?? 1.0;

  // Estimate nb_sinistres_passes from the composite historique_score
  const estNbSin = h / 40;

  // ── Hard label (exact replica of train.py assign_label logic) ─────────────
  let labelIdx: 0 | 1 | 2 | 3;
  if (d > 30 || estNbSin > 5) {
    labelIdx = 3; // Suspicieux
  } else if (m * typeMultiplier > 50000 || h > 100) {
    labelIdx = 2; // Élevé
  } else if (m * typeMultiplier > 10000 || estNbSin > 2) {
    labelIdx = 1; // Moyen
  } else {
    labelIdx = 0; // Faible
  }

  // ── Continuous score within each label band ────────────────────────────────
  // Bands mirror the GBM output: weights [0, 33, 66, 100]
  //   Faible     →  2–29   (score_to_label ≤ 30)
  //   Moyen      → 30–60   (30 < score ≤ 60)
  //   Élevé      → 61–80   (60 < score ≤ 80)
  //   Suspicieux → 81–98   (score > 80)
  let score: number;

  if (labelIdx === 3) {
    // Further above threshold → higher score
    const excess = Math.max(
      Math.min(1, (d - 30) / 30),        // delai excess past 30 days (0→1 at 60d)
      Math.min(1, (estNbSin - 5) / 5),   // nb_sin excess past 5 (0→1 at 10)
    );
    score = 81 + Math.round(excess * 17); // [81, 98]
  } else if (labelIdx === 2) {
    const f = Math.max(
      m * typeMultiplier / 50000,  // 1.0 = at Élevé threshold
      h / 100,                     // 1.0 = at historique Élevé threshold
      d / 30,                      // approaching Suspicieux
    );
    score = 61 + Math.round(Math.min(1, f) * 19); // [61, 80]
  } else if (labelIdx === 1) {
    const f = Math.max(
      m * typeMultiplier / 10000,  // 1.0 = at Moyen threshold
      estNbSin / 2,                // 1.0 = nb_sin at 2
      h / 40,                      // historique
    );
    score = 30 + Math.round(Math.min(1, f) * 30); // [30, 60]
  } else {
    const f = Math.max(
      Math.min(1, m * typeMultiplier / 10000),
      Math.min(1, d / 30),
    );
    score = 2 + Math.round(f * 27); // [2, 29]
  }

  score = Math.max(0, Math.min(100, score));

  // ── Label from score (predict.py _score_to_label) ─────────────────────────
  let label: string;
  if (score <= 30)      label = 'Faible';
  else if (score <= 60) label = 'Moyen';
  else if (score <= 80) label = 'Élevé';
  else                  label = 'Suspicieux';

  // ── Confidence: distance from nearest class boundary → higher ────────────
  const boundaries = [30, 60, 80];
  const distToBoundary = boundaries.reduce(
    (min, b) => Math.min(min, Math.abs(score - b)),
    100,
  );
  const confidence = Math.round(Math.min(97, 68 + distToBoundary * 0.9) * 10) / 10;

  // ── Decision (predict.py _score_to_decision) ──────────────────────────────
  let decision: string;
  if (score < 30)      decision = 'Auto-approuver';
  else if (score < 65) decision = 'Révision manuelle';
  else                 decision = 'Escalader / Enquête';

  return { score_risque: score, label, confidence, decision };
}

/** Score a batch of claims inline. */
export function scoreBatch(inputs: MLInput[]): MLResult[] {
  return inputs.map(scoreLocally);
}

/** True when no external ML service is configured (default localhost). Use inline scoring. */
export function isLocalMLService(url: string): boolean {
  return url.includes('localhost') || url.includes('127.0.0.1') || url.includes('0.0.0.0');
}
