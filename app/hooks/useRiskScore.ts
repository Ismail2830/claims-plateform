/**
 * useRiskScore — polls GET /api/claims/[id] every 2 seconds until
 * the AI scoring is complete (scoreRisque !== null), then stops.
 *
 * Usage:
 *   const { score, label, decision, confidence, isScoring } = useRiskScore(claimId, token);
 */

'use client';

import { useEffect, useRef, useState } from 'react';

export interface RiskScoreResult {
  /** Risk score 0-100, or null while scoring is in progress. */
  score:      number | null;
  /** Human-readable label: "Faible" | "Moyen" | "Élevé" | "Suspicieux" */
  label:      string | null;
  /** IA decision: "Auto-approuver" | "Révision manuelle" | "Escalader / Enquête" */
  decision:   string | null;
  /** Model confidence percentage (0-100). */
  confidence: number | null;
  /** True while waiting for the ML service to return a score. */
  isScoring:  boolean;
}

const POLL_INTERVAL_MS = 2000;

/**
 * Polls the claim API until the AI risk score is available.
 *
 * @param claimId - UUID of the claim to score.
 * @param token   - Bearer auth token for the request.
 * @returns RiskScoreResult with current score state.
 */
export function useRiskScore(
  claimId: string | null | undefined,
  token:   string | null | undefined,
): RiskScoreResult {
  const [result, setResult] = useState<RiskScoreResult>({
    score:      null,
    label:      null,
    decision:   null,
    confidence: null,
    isScoring:  true,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!claimId || !token) {
      setResult(prev => ({ ...prev, isScoring: false }));
      return;
    }

    const fetchScore = async () => {
      try {
        const res = await fetch(`/api/claims/${claimId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) return; // keep polling on transient errors

        const data = await res.json() as {
          scoreRisque?:     number | null;
          labelRisque?:     string | null;
          decisionIa?:      string | null;
          scoreConfidence?: number | null;
        };

        if (data.scoreRisque !== null && data.scoreRisque !== undefined) {
          // Score is ready — stop polling
          setResult({
            score:      data.scoreRisque,
            label:      data.labelRisque     ?? null,
            decision:   mapDecision(data.decisionIa ?? null),
            confidence: data.scoreConfidence ?? null,
            isScoring:  false,
          });

          if (intervalRef.current !== null) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      } catch {
        // Network error — keep polling silently
      }
    };

    // Run once immediately, then every 2 seconds
    void fetchScore();
    intervalRef.current = setInterval(() => { void fetchScore(); }, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [claimId, token]);

  return result;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Maps Prisma DecisionIA enum value to human-readable French string. */
function mapDecision(value: string | null): string | null {
  const map: Record<string, string> = {
    AUTO_APPROUVER:    'Auto-approuver',
    REVISION_MANUELLE: 'Révision manuelle',
    ESCALADER:         'Escalader / Enquête',
  };
  return value ? (map[value] ?? value) : null;
}
