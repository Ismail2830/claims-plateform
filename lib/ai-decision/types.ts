// ─── AI Decision Engine — Types ───────────────────────────────────────────────

export type AIRecommendation = 'APPROVE' | 'REJECT' | 'ESCALATE';

export type FactorResult = 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'CRITICAL';

export interface DecisionFactor {
  id: string;
  label: string;
  result: FactorResult;
  /** Points added (+) to approveScore or subtracted (−) from it. Negative = bad */
  impact: number;
  /** French human-readable explanation shown to the manager */
  detail: string;
}

export interface DecisionResult {
  recommendation: AIRecommendation;
  /** 0–100 */
  confidence: number;
  approveScore: number;
  rejectScore: number;
  escalateScore: number;
  factors: DecisionFactor[];
  /** Full French paragraph summarising the decision */
  reasoning: string;
}

// ─── Input shape assembled by the service before calling the engine ───────────

export interface ClaimForDecision {
  claimId: string;
  claimNumber: string;
  typeSinistre: string; // ClaimType enum value: AUTO | FIRE | WATER_DAMAGE | THEFT
  montantDeclare: number;
  /** READ from existing claim.scoreRisque — never recalculate */
  scoreRisque: number;
  /** READ from existing claim.labelRisque */
  labelRisque: string;
  clientId: string;
  createdAt: Date;
  documents: {
    documentType: string;
    status: string;
    rejectionReason?: string | null;
  }[];
  policy: {
    status: string;
    startDate: Date;
    endDate: Date;
    coverageLimit: number | null;
    type: string;
  } | null;
  clientClaimsLast12Months: number;
  clientClaimsLast90Days: number;
  hasFraudFlag: boolean;
  /** Historical average montantDeclare for same sinistre type (last 12 months) */
  avgAmountForType: number;
}

// ─── Ignored reason options ───────────────────────────────────────────────────

export const IGNORED_REASON_OPTIONS: Record<string, string> = {
  ADDITIONAL_INFO_AVAILABLE: "J'ai des informations supplémentaires",
  DISAGREE_WITH_ANALYSIS:    "Je ne suis pas d'accord avec l'analyse",
  POLICY_EXCEPTION:          'Exception de politique interne',
  CLIENT_RELATIONSHIP:       'Relation client particulière',
  OTHER:                     'Autre raison',
} as const;
