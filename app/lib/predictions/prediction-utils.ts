// ─── Shared Types ─────────────────────────────────────────────────────────────

export interface VolumeForecast {
  month: string;          // e.g. "2026-04"
  monthLabel: string;     // e.g. "Avr 2026"
  predicted: number;
  lower: number;
  upper: number;
}

export interface VolumeHistorical {
  month: string;
  monthLabel: string;
  actual: number;
}

export interface ChurnClientData {
  clientId: string;
  firstName: string;
  lastName: string;
  email: string;
  score: number;
  label: string;
  mainReason: string;
  factors: ChurnFactors;
  activePoliciesCount: number;
  lastClaimDate: string | null;
}

export interface ChurnFactors {
  rejectedClaims: number;
  avgResolutionDays: number;
  minDaysToRenewal: number;
  daysSinceLastClaim: number;
  complaintsCount: number;
}

export interface ChurnStats {
  high: number;
  medium: number;
  low: number;
  total: number;
}

export interface ProvisionByType {
  openClaims: number;
  totalDeclared: number;
  estimatedPayout: number;
  approvalRate: number;
  paymentRatio: number;
}

export interface ProvisionsData {
  ACCIDENT: ProvisionByType;
  THEFT: ProvisionByType;
  FIRE: ProvisionByType;
  WATER_DAMAGE: ProvisionByType;
  TOTAL: {
    openClaims: number;
    totalDeclared: number;
    estimatedPayout: number;
  };
}

export interface ProactiveRiskData {
  claimId: string;
  claimNumber: string;
  claimType: string;
  clientName: string;
  clientId: string;
  claimedAmount: number;
  originalScore: number;
  evolvedScore: number;
  signals: string[];
  riskBoost: number;
  createdAt: string;
}

export interface TariffRecommendation {
  resultId: string;
  policyId: string;
  policyNumber: string;
  clientId: string;
  clientName: string;
  adjustment: number;
  reason: string;
  currentPrime: number;
  suggestedPrime: number;
  lossRatio: number;
  avgRiskScore: number;
  daysToRenewal: number;
  claimsCount: number;
  endDate: string;
  policyType: string;
}

export interface FraudClusterAlert {
  id: string;
  module: string;
  severity: string;
  title: string;
  description: string;
  metadata: FraudMetadata | null;
  isRead: boolean;
  isDismissed: boolean;
  createdAt: string;
}

export interface FraudMetadata {
  claimIds?: string[];
  pattern?: string;
  confidence?: number;
  affectedAmount?: number;
  claimCount?: number;
  historicalMultiple?: number;
}

// ─── Label Helpers ─────────────────────────────────────────────────────────────

export interface ChurnLabelResult {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  dotColor: string;
}

export function getChurnLabel(score: number): ChurnLabelResult {
  if (score >= 70) {
    return {
      label: 'Risque élevé',
      color: '#DC2626',
      bgColor: 'bg-red-100',
      textColor: 'text-red-700',
      dotColor: '🔴',
    };
  }
  if (score >= 40) {
    return {
      label: 'Risque moyen',
      color: '#D97706',
      bgColor: 'bg-orange-100',
      textColor: 'text-orange-700',
      dotColor: '🟠',
    };
  }
  return {
    label: 'Risque faible',
    color: '#16A34A',
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
    dotColor: '🟢',
  };
}

export function getRiskEvolutionLabel(original: number, evolved: number): string {
  if (evolved > original + 20) return 'Risque en forte hausse ▲▲';
  if (evolved > original + 10) return 'Risque en hausse ▲';
  return 'Stable';
}

export function formatProvision(amount: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(amount)) + ' MAD';
}

export interface AdjustmentResult {
  text: string;
  color: string;
  bgColor: string;
  icon: string;
}

export function formatAdjustment(adjustment: number): AdjustmentResult {
  if (adjustment < -0.005) {
    return {
      text: `${(adjustment * 100).toFixed(0)}%`,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      icon: '📉',
    };
  }
  if (adjustment > 0.005) {
    return {
      text: `+${(adjustment * 100).toFixed(0)}%`,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      icon: '📈',
    };
  }
  return { text: 'Stable', color: 'text-gray-500', bgColor: 'bg-gray-50', icon: '➡️' };
}

// ─── Module Config ─────────────────────────────────────────────────────────────

export type PredictionModuleName =
  | 'VOLUME_FORECAST'
  | 'CHURN_RISK'
  | 'PROVISIONING'
  | 'PROACTIVE_RISK'
  | 'TARIFF_RECOMMENDATION'
  | 'FRAUD_CLUSTER';

export interface ModuleConfig {
  label: string;
  iconName: string;
  color: string;
  description: string;
  emoji: string;
}

export function getPredictionModuleConfig(module: PredictionModuleName): ModuleConfig {
  const configs: Record<PredictionModuleName, ModuleConfig> = {
    VOLUME_FORECAST: {
      label: 'Volume',
      iconName: 'TrendingUp',
      color: 'blue',
      description: 'Prévision du volume de sinistres sur 12 mois',
      emoji: '📈',
    },
    CHURN_RISK: {
      label: 'Churn',
      iconName: 'UserMinus',
      color: 'orange',
      description: 'Risque de désabonnement client',
      emoji: '🚪',
    },
    PROVISIONING: {
      label: 'Provisions',
      iconName: 'Wallet',
      color: 'purple',
      description: 'Besoins en réserves financières',
      emoji: '💰',
    },
    PROACTIVE_RISK: {
      label: 'Risques',
      iconName: 'ShieldAlert',
      color: 'red',
      description: 'Dossiers à surveiller en priorité',
      emoji: '🎯',
    },
    TARIFF_RECOMMENDATION: {
      label: 'Tarifs',
      iconName: 'Tag',
      color: 'teal',
      description: 'Recommandations tarifaires personnalisées',
      emoji: '💲',
    },
    FRAUD_CLUSTER: {
      label: 'Fraude',
      iconName: 'AlertOctagon',
      color: 'red',
      description: 'Clusters de fraude potentielle détectés',
      emoji: '🚨',
    },
  };
  return configs[module];
}

// ─── Month label helpers ───────────────────────────────────────────────────────

export function formatMonthLabel(dateStr: string): string {
  const [year, month] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
}

export function getMonthKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function addMonths(date: Date, n: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}
