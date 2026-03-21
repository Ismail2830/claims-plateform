'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import {
  Sparkles, RefreshCw, TrendingUp, UserMinus, Wallet,
  ShieldAlert, Tag, AlertOctagon, Mail, ChevronDown, ChevronRight, Bot,
  CheckCircle, XCircle, ArrowUp, BarChart2,
} from 'lucide-react';
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ReferenceLine, BarChart, Bar,
  PieChart, Pie, Cell,
} from 'recharts';

import { PredictionStatsCard } from '@/app/components/predictions/PredictionStatsCard';
import { ChurnClientRow } from '@/app/components/predictions/ChurnClientRow';
import { ProactiveRiskCard } from '@/app/components/predictions/ProactiveRiskCard';
import { TariffRecommendationRow } from '@/app/components/predictions/TariffRecommendationRow';
import { FraudClusterCard } from '@/app/components/predictions/FraudClusterCard';
import { PredictionConfidenceBadge } from '@/app/components/predictions/PredictionConfidenceBadge';
import {
  formatProvision,
  type ChurnClientData,
  type VolumeForecast,
  type VolumeHistorical,
  type ProvisionsData,
  type ProactiveRiskData,
  type TariffRecommendation,
  type FraudClusterAlert,
} from '@/app/lib/predictions/prediction-utils';

// ─── SWR fetcher ─────────────────────────────────────────────────────────────

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then(r => {
    if (!r.ok) throw new Error('Erreur réseau');
    return r.json();
  });

const SWR_OPTS = { refreshInterval: 300_000 };

// ─── Types for API responses ─────────────────────────────────────────────────

interface StatsData {
  lastUpdated: string | null;
  volumePeakMonth: string | null;
  churnHighRisk: number;
  totalProvisions: number;
  proactiveAlerts: number;
  tariffsPending: number;
  fraudAlerts: number;
  fraudCritical: number;
}

interface VolumeData {
  forecasts: VolumeForecast[];
  historical: VolumeHistorical[];
  peakMonth: { month: string; predicted: number } | null;
  lastUpdated: string | null;
}

interface ChurnData {
  clients: ChurnClientData[];
  stats: { high: number; medium: number; low: number; total: number };
  lastUpdated: string | null;
}

interface ProvisionsResponse {
  provisions: ProvisionsData | null;
  total: number;
  confidence: number;
  totalHistorical: number;
  lastUpdated: string | null;
}

interface ProactiveData {
  claims: ProactiveRiskData[];
  alertCount: number;
}

interface TariffData {
  recommendations: TariffRecommendation[];
  lastUpdated: string | null;
}

interface FraudData {
  clusters: FraudClusterAlert[];
  totalAlerts: number;
  criticalCount: number;
}

// ─── AI Decision Analytics types ────────────────────────────────────────────

interface AIAnalytics {
  totalDecisions: number;
  followRate: number;
  escalatesAvoided: number;
  thisMonth: number;
  accuracyByType: Record<string, { total: number; followed: number; accuracy: number }>;
  recommendationDistribution: { APPROVE: number; REJECT: number; ESCALATE: number };
  overrideReasons: { reason: string; count: number; percentage: number }[];
  confidenceAccuracy: { range: string; followed: number; total: number; rate: number | null }[];
  topOverridingManagers: { managerId: string; name: string; overrideCount: number; totalDecisions: number }[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Jamais';
  const diffH = Math.floor((Date.now() - new Date(dateStr).getTime()) / 3600000);
  if (diffH < 1) return "il y a moins d'1h";
  if (diffH < 24) return `il y a ${diffH}h`;
  return `il y a ${Math.floor(diffH / 24)}j`;
}

const CHART_COLORS = {
  blue: '#2563eb',
  green: '#16A34A',
  orange: '#D97706',
  red: '#DC2626',
};

const PROVISION_LABELS: Record<string, string> = {
  ACCIDENT: 'Accident',
  THEFT: 'Vol',
  FIRE: 'Incendie',
  WATER_DAMAGE: 'Dégât des eaux',
};

const IGNORE_REASON_LABELS: Record<string, string> = {
  ADDITIONAL_INFO_AVAILABLE: "J'ai des informations supplémentaires",
  DISAGREE_WITH_ANALYSIS:    "Pas d'accord avec l'analyse",
  POLICY_EXCEPTION:          'Exception de politique interne',
  CLIENT_RELATIONSHIP:       'Relation client particulière',
  OTHER:                     'Autre raison',
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PredictionsPage() {
  const [activeTab, setActiveTab] = useState('volume');
  const [recalculating, setRecalculating] = useState(false);
  const [recalcCooldown, setRecalcCooldown] = useState(false);
  const [churnFilter, setChurnFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [proactiveFilter, setProactiveFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM'>('ALL');
  const [tariffFilter, setTariffFilter] = useState<'ALL' | 'INCREASE' | 'DECREASE' | 'NEUTRAL'>('ALL');
  const [retentionModal, setRetentionModal] = useState<ChurnClientData | null>(null);
  const [showDismissed, setShowDismissed] = useState(false);

  // SWR hooks
  const { data: stats, mutate: mutateStats } = useSWR<StatsData>('/api/predictions/stats', fetcher, SWR_OPTS);
  const { data: volume, mutate: mutateVolume } = useSWR<VolumeData>(
    activeTab === 'volume' ? '/api/predictions/volume' : null, fetcher, SWR_OPTS
  );
  const churnUrl = `/api/predictions/churn?limit=30${churnFilter !== 'ALL' ? `&riskLevel=${churnFilter}` : ''}`;
  const { data: churn, mutate: mutateChurn } = useSWR<ChurnData>(
    activeTab === 'churn' ? churnUrl : null, fetcher, SWR_OPTS
  );
  const { data: provisions, mutate: mutateProvisions } = useSWR<ProvisionsResponse>(
    activeTab === 'provisions' ? '/api/predictions/provisions' : null, fetcher, SWR_OPTS
  );
  const proactiveMinScore = proactiveFilter === 'CRITICAL' ? 80 : proactiveFilter === 'HIGH' ? 60 : proactiveFilter === 'MEDIUM' ? 40 : 30;
  const { data: proactive, mutate: mutateProactive } = useSWR<ProactiveData>(
    activeTab === 'risks' ? `/api/predictions/proactive-risks?minScore=${proactiveMinScore}&limit=30` : null,
    fetcher, SWR_OPTS
  );
  const tariffAdjParam = tariffFilter !== 'ALL' ? `&adjustmentType=${tariffFilter}` : '';
  const { data: tariffs, mutate: mutateTariffs } = useSWR<TariffData>(
    activeTab === 'tariffs' ? `/api/predictions/tariffs${tariffAdjParam}` : null,
    fetcher, SWR_OPTS
  );
  const { data: fraud, mutate: mutateFraud } = useSWR<FraudData>(
    activeTab === 'fraud' ? `/api/predictions/fraud?includeDismissed=${showDismissed}` : null,
    fetcher, SWR_OPTS
  );
  const { data: aiAnalytics } = useSWR<AIAnalytics>(
    activeTab === 'ai-decisions' ? '/api/ai-decision/analytics' : null,
    fetcher, SWR_OPTS
  );
  const { data: alertsData } = useSWR<{ alerts: { id: string; title: string; severity: string }[] }>(
    '/api/predictions/alerts?severity=CRITICAL', fetcher, SWR_OPTS
  );

  const mutateAll = useCallback(() => {
    mutateStats(); mutateVolume(); mutateChurn(); mutateProvisions();
    mutateProactive(); mutateTariffs(); mutateFraud();
  }, [mutateStats, mutateVolume, mutateChurn, mutateProvisions, mutateProactive, mutateTariffs, mutateFraud]);

  async function handleRecalculate() {
    if (recalcCooldown || recalculating) return;
    setRecalculating(true);
    try {
      const res = await fetch('/api/predictions/recalculate', { method: 'POST', credentials: 'include' });
      if (!res.ok) throw new Error('Erreur serveur');
      mutateAll();
      setRecalcCooldown(true);
      setTimeout(() => setRecalcCooldown(false), 60_000);
    } finally {
      setRecalculating(false);
    }
  }

  async function handleApplyTariff(policyId: string, prime: number) {
    await fetch(`/api/predictions/tariffs/${policyId}/apply`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmedPrime: prime }),
    });
    mutateTariffs();
  }

  async function handleDismissFraud(alertId: string, note?: string) {
    await fetch(`/api/predictions/fraud/${alertId}/dismiss`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    });
    mutateFraud();
    mutateStats();
  }

  const criticalAlerts = alertsData?.alerts ?? [];

  const volumeChartData = (() => {
    if (!volume) return [];
    const hist = (volume.historical ?? []).map(h => ({
      month: h.monthLabel,
      actual: h.actual,
    }));
    const forecast = (volume.forecasts ?? []).map(f => ({
      month: f.monthLabel,
      predicted: f.predicted,
      lower: f.lower,
      upper: f.upper,
    }));
    return [...hist, ...forecast];
  })();

  const todayLabel = new Date().toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });

  return (
    <div className="space-y-6">
      {/* ── Page Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-xl">
            <Sparkles className="w-7 h-7 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Prédictions IA</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Analyses prédictives basées sur vos données historiques
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-gray-400 hidden sm:block">
            Dernière mise à jour: {timeAgo(stats?.lastUpdated ?? null)}
          </span>
          <Button
            onClick={handleRecalculate}
            disabled={recalculating || recalcCooldown}
            className="gap-2 bg-blue-600 hover:bg-blue-700"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 ${recalculating ? 'animate-spin' : ''}`} />
            {recalculating ? 'Recalcul en cours...' : 'Recalculer maintenant'}
          </Button>
        </div>
      </div>

      {/* ── Critical Alerts Bar ───────────────────────────────────────────────── */}
      {criticalAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertOctagon className="w-5 h-5 text-red-600" />
            <p className="text-sm font-semibold text-red-800">
              🔴 {criticalAlerts.length} alerte{criticalAlerts.length > 1 ? 's' : ''} critique{criticalAlerts.length > 1 ? 's' : ''} nécessite{criticalAlerts.length === 1 ? '' : 'nt'} votre attention
            </p>
          </div>
          <ul className="space-y-1">
            {criticalAlerts.slice(0, 3).map(a => (
              <li key={a.id} className="text-sm text-red-700 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                {a.title}
              </li>
            ))}
          </ul>
          <button
            className="text-xs text-red-600 hover:underline mt-2"
            onClick={() => setActiveTab('fraud')}
          >
            Voir toutes les alertes →
          </button>
        </div>
      )}

      {/* ── Stats Summary Row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <PredictionStatsCard
          emoji="📈"
          label="Volume"
          value={stats?.volumePeakMonth ?? '—'}
          sublabel="Mois de pic prévu"
          color="blue"
          onClick={() => setActiveTab('volume')}
        />
        <PredictionStatsCard
          emoji="🚪"
          label="Churn"
          value={stats ? `${stats.churnHighRisk} clients` : '—'}
          sublabel="À risque élevé"
          color="orange"
          isAlert={(stats?.churnHighRisk ?? 0) > 5}
          onClick={() => setActiveTab('churn')}
        />
        <PredictionStatsCard
          emoji="💰"
          label="Provisions"
          value={stats ? formatProvision(stats.totalProvisions) : '—'}
          sublabel="Estimation totale"
          color="purple"
          onClick={() => setActiveTab('provisions')}
        />
        <PredictionStatsCard
          emoji="🎯"
          label="Risques"
          value={stats ? `${stats.proactiveAlerts} alertes` : '—'}
          sublabel="Dossiers surveillés"
          color="red"
          isAlert={(stats?.proactiveAlerts ?? 0) > 0}
          onClick={() => setActiveTab('risks')}
        />
        <PredictionStatsCard
          emoji="💲"
          label="Tarifs"
          value={stats ? `${stats.tariffsPending}` : '—'}
          sublabel="Renouvellements"
          color="teal"
          onClick={() => setActiveTab('tariffs')}
        />
        <PredictionStatsCard
          emoji="🚨"
          label="Fraude"
          value={stats ? `${stats.fraudAlerts} clusters` : '—'}
          sublabel={stats?.fraudCritical ? `${stats.fraudCritical} critiques` : undefined}
          color="red"
          isAlert={(stats?.fraudCritical ?? 0) > 0}
          onClick={() => setActiveTab('fraud')}
        />
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-3 md:grid-cols-6 h-auto gap-1 p-1">
          <TabsTrigger value="volume" className="gap-1 text-xs py-2">
            <TrendingUp className="w-3.5 h-3.5" /> Volume
          </TabsTrigger>
          <TabsTrigger value="churn" className="gap-1 text-xs py-2">
            <UserMinus className="w-3.5 h-3.5" /> Churn
          </TabsTrigger>
          <TabsTrigger value="provisions" className="gap-1 text-xs py-2">
            <Wallet className="w-3.5 h-3.5" /> Provisions
          </TabsTrigger>
          <TabsTrigger value="risks" className="gap-1 text-xs py-2">
            <ShieldAlert className="w-3.5 h-3.5" /> Risques
          </TabsTrigger>
          <TabsTrigger value="tariffs" className="gap-1 text-xs py-2">
            <Tag className="w-3.5 h-3.5" /> Tarifs
          </TabsTrigger>
          <TabsTrigger value="fraud" className="gap-1 text-xs py-2">
            <AlertOctagon className="w-3.5 h-3.5" /> Fraude
          </TabsTrigger>
          <TabsTrigger value="ai-decisions" className="gap-1 text-xs py-2">
            <Bot className="w-3.5 h-3.5" /> Décisions IA
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: VOLUME ─────────────────────────────────────────────────── */}
        <TabsContent value="volume" className="mt-4 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">
              Prévision du volume de sinistres — 12 prochains mois
            </h2>
            {!volume ? (
              <Skeleton className="h-87 w-full" />
            ) : volumeChartData.length === 0 ? (
              <div className="h-87 flex items-center justify-center text-gray-400 text-sm">
                Aucune donnée. Cliquez sur &laquo; Recalculer maintenant &raquo; pour générer les prévisions.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={volumeChartData} margin={{ top: 5, right: 20, left: 0, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={55} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value, name) => {
                      const labels: Record<string, string> = {
                        actual: 'Historique',
                        predicted: 'Prédiction',
                        lower: 'Borne basse',
                        upper: 'Borne haute',
                      };
                      return [value, labels[name as string] ?? String(name)];
                    }}
                  />
                  <Legend
                    formatter={(val: string) => {
                      const labels: Record<string, string> = {
                        actual: 'Historique', predicted: 'Prédiction',
                        lower: 'Borne basse', upper: 'Borne haute',
                      };
                      return labels[val] ?? val;
                    }}
                  />
                  <ReferenceLine
                    x={todayLabel}
                    stroke="#94a3b8"
                    strokeDasharray="4 4"
                    label={{ value: "Aujourd'hui", fontSize: 9, fill: '#64748b', position: 'insideTopRight' }}
                  />
                  <Area dataKey="upper" fill={CHART_COLORS.blue} fillOpacity={0.1} stroke="none" name="upper" />
                  <Area dataKey="lower" fill="#fff" fillOpacity={1} stroke="none" name="lower" />
                  <Line type="monotone" dataKey="actual" stroke={CHART_COLORS.blue} strokeWidth={2} dot={false} name="actual" />
                  <Line type="monotone" dataKey="predicted" stroke={CHART_COLORS.blue} strokeWidth={2} strokeDasharray="5 5" dot={false} name="predicted" />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Points clés</h3>
              {!volume ? (
                <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}</div>
              ) : volume.peakMonth ? (
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span>📅</span>
                    <span>Mois de pic prévu: <strong>{volume.peakMonth.month}</strong> ({volume.peakMonth.predicted} sinistres)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>📊</span>
                    <span>{volume.forecasts.length} mois de prévisions calculés</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span>📈</span>
                    <span>Basé sur les données des {volume.historical.length} derniers mois</span>
                  </li>
                </ul>
              ) : (
                <p className="text-sm text-gray-400">Aucune prévision disponible.</p>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 overflow-x-auto">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Tableau prévisionnel</h3>
              {!volume ? (
                <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-7 w-full" />)}</div>
              ) : volume.forecasts.length === 0 ? (
                <p className="text-sm text-gray-400">Aucune donnée</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 border-b">
                      <th className="text-left pb-2 font-medium">Mois</th>
                      <th className="text-right pb-2 font-medium">Prédiction</th>
                      <th className="text-right pb-2 font-medium">Intervalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {volume.forecasts.map(f => (
                      <tr key={f.month} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-1.5 text-gray-700">{f.monthLabel}</td>
                        <td className="py-1.5 text-right font-semibold text-blue-700">{f.predicted}</td>
                        <td className="py-1.5 text-right text-gray-400 text-xs">{f.lower}–{f.upper}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── TAB 2: CHURN ──────────────────────────────────────────────────── */}
        <TabsContent value="churn" className="mt-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {!churn ? (
              [...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
            ) : (
              <>
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-red-700">{churn.stats.high}</p>
                  <p className="text-xs text-red-600 mt-0.5">🔴 Risque élevé</p>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-orange-700">{churn.stats.medium}</p>
                  <p className="text-xs text-orange-600 mt-0.5">🟠 Risque moyen</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-green-700">{churn.stats.low}</p>
                  <p className="text-xs text-green-600 mt-0.5">🟢 Risque faible</p>
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Distribution</h3>
              {!churn ? (
                <Skeleton className="h-50" />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Élevé', value: churn.stats.high },
                        { name: 'Moyen', value: churn.stats.medium },
                        { name: 'Faible', value: churn.stats.low },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {[CHART_COLORS.red, CHART_COLORS.orange, CHART_COLORS.green].map((c, i) => (
                        <Cell key={i} fill={c} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val, name) => [`${val} clients`, name]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex border-b border-gray-100 px-4 pt-3 gap-1">
                {(['ALL', 'HIGH', 'MEDIUM', 'LOW'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setChurnFilter(f)}
                    className={`px-3 py-1.5 text-xs rounded-t font-medium transition-colors ${
                      churnFilter === f ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {f === 'ALL' ? 'Tous' : f === 'HIGH' ? '🔴 Élevé' : f === 'MEDIUM' ? '🟠 Moyen' : '🟢 Faible'}
                  </button>
                ))}
              </div>
              {!churn ? (
                <div className="p-4 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : churn.clients.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-400">Aucun client avec ce niveau de risque</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 text-xs text-gray-500 uppercase border-b">
                        <th className="px-4 py-2 text-left font-medium">Client</th>
                        <th className="px-4 py-2 text-left font-medium">Score</th>
                        <th className="px-4 py-2 text-left font-medium">Raison</th>
                        <th className="px-4 py-2 text-center font-medium">Polices</th>
                        <th className="px-4 py-2 text-left font-medium">Dernier sinistre</th>
                        <th className="px-4 py-2 text-left font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {churn.clients.map(c => (
                        <ChurnClientRow
                          key={c.clientId}
                          client={c}
                          onRetentionEmail={setRetentionModal}
                          onViewClient={id => window.open(`/dashboard/admin/clients/${id}`, '_blank')}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── TAB 3: PROVISIONS ─────────────────────────────────────────────── */}
        <TabsContent value="provisions" className="mt-4 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            {!provisions ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <>
                <p className="text-sm text-blue-600 font-medium mb-1">Provision totale estimée</p>
                <p className="text-4xl font-bold text-blue-900 mb-2">{formatProvision(provisions.total)}</p>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-sm text-blue-700">Confiance:</span>
                  <Progress value={provisions.confidence * 100} className="w-32 h-2" />
                  <PredictionConfidenceBadge confidence={provisions.confidence} />
                </div>
                <p className="text-xs text-blue-500">
                  Basé sur {provisions.totalHistorical} dossiers historiques et l&apos;historique de 24 mois
                </p>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Déclaré vs Provision estimée</h3>
              {!provisions?.provisions ? (
                <Skeleton className="h-55" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={(['ACCIDENT', 'THEFT', 'FIRE', 'WATER_DAMAGE'] as const).map(type => ({
                      type: PROVISION_LABELS[type],
                      Déclaré: Math.round(provisions.provisions![type].totalDeclared),
                      'Provision': Math.round(provisions.provisions![type].estimatedPayout),
                    }))}
                    margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="type" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={val => [`${new Intl.NumberFormat('fr-FR').format(Number(val))} MAD`]} />
                    <Legend />
                    <Bar dataKey="Déclaré" fill={CHART_COLORS.blue} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Provision" fill={CHART_COLORS.green} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Détail par type</h3>
              {!provisions?.provisions ? (
                <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 border-b">
                      <th className="text-left pb-2 font-medium">Type</th>
                      <th className="text-right pb-2 font-medium">Dossiers</th>
                      <th className="text-right pb-2 font-medium">Taux appro.</th>
                      <th className="text-right pb-2 font-medium">Provision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(['ACCIDENT', 'THEFT', 'FIRE', 'WATER_DAMAGE'] as const).map(type => {
                      const p = provisions.provisions![type];
                      return (
                        <tr key={type} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-2 font-medium">{PROVISION_LABELS[type]}</td>
                          <td className="py-2 text-right text-gray-600">{p.openClaims}</td>
                          <td className="py-2 text-right text-gray-600">{(p.approvalRate * 100).toFixed(0)}%</td>
                          <td className="py-2 text-right font-semibold text-green-700">{formatProvision(p.estimatedPayout)}</td>
                        </tr>
                      );
                    })}
                    <tr className="bg-gray-50 font-bold text-sm border-t-2 border-gray-200">
                      <td className="py-2 font-bold">TOTAL</td>
                      <td className="py-2 text-right">{provisions.provisions!.TOTAL.openClaims}</td>
                      <td />
                      <td className="py-2 text-right text-blue-700">{formatProvision(provisions.provisions!.TOTAL.estimatedPayout)}</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {provisions && (
            <p className="text-xs text-gray-400 italic text-center">
              Ces estimations sont calculées sur la base des taux d&apos;approbation historiques et ne constituent pas un avis actuariel certifié.{' '}
              <PredictionConfidenceBadge confidence={provisions.confidence} />
            </p>
          )}
        </TabsContent>

        {/* ── TAB 4: PROACTIVE RISKS ────────────────────────────────────────── */}
        <TabsContent value="risks" className="mt-4 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            {!proactive ? (
              <Skeleton className="h-6 w-40" />
            ) : (
              <p className="text-sm font-medium text-gray-700">
                <strong>{proactive.claims.length}</strong> dossiers présentent un risque croissant
              </p>
            )}
            <div className="flex gap-1 flex-wrap">
              {([
                { key: 'ALL', label: 'Tous' },
                { key: 'CRITICAL', label: '🔴 Critique (>80)' },
                { key: 'HIGH', label: '🟠 Élevé (60-80)' },
                { key: 'MEDIUM', label: '🟡 Moyen (40-60)' },
              ] as const).map(f => (
                <button
                  key={f.key}
                  onClick={() => setProactiveFilter(f.key)}
                  className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                    proactiveFilter === f.key
                      ? 'bg-blue-100 text-blue-700 border-blue-200'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {!proactive ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>
          ) : proactive.claims.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <ShieldAlert className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Aucun dossier avec un risque croissant détecté</p>
            </div>
          ) : (
            proactive.claims.map(c => (
              <ProactiveRiskCard
                key={c.claimId}
                claim={c}
                onAssign={() => {}}
                onViewClaim={id => window.open(`/dashboard/manager/claims/${id}`, '_blank')}
              />
            ))
          )}
        </TabsContent>

        {/* ── TAB 5: TARIFFS ────────────────────────────────────────────────── */}
        <TabsContent value="tariffs" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            {!tariffs ? (
              <Skeleton className="h-8 w-60" />
            ) : (
              <>
                <Badge className="bg-blue-50 text-blue-700 border-blue-200 border">
                  ✅ {tariffs.recommendations.length} recommandations en attente
                </Badge>
                <Badge className="bg-green-50 text-green-700 border-green-200 border">
                  📉 {tariffs.recommendations.filter(r => r.adjustment < -0.005).length} réductions
                </Badge>
                <Badge className="bg-red-50 text-red-700 border-red-200 border">
                  📈 {tariffs.recommendations.filter(r => r.adjustment > 0.005).length} augmentations
                </Badge>
              </>
            )}
            <div className="ml-auto flex gap-1">
              {([
                { key: 'ALL', label: 'Tous' },
                { key: 'INCREASE', label: '📈 Augmentation' },
                { key: 'DECREASE', label: '📉 Réduction' },
                { key: 'NEUTRAL', label: '➡️ Stable' },
              ] as const).map(f => (
                <button
                  key={f.key}
                  onClick={() => setTariffFilter(f.key)}
                  className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                    tariffFilter === f.key
                      ? 'bg-blue-100 text-blue-700 border-blue-200'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {!tariffs ? (
              <div className="p-4 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : tariffs.recommendations.length === 0 ? (
              <div className="p-12 text-center">
                <Tag className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Aucune recommandation tarifaire pour cette sélection</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 text-xs text-gray-500 uppercase border-b">
                      <th className="px-4 py-2 text-left font-medium">Client</th>
                      <th className="px-4 py-2 text-left font-medium">Police</th>
                      <th className="px-4 py-2 text-left font-medium">Expire dans</th>
                      <th className="px-4 py-2 text-left font-medium">Prime actuelle</th>
                      <th className="px-4 py-2 text-left font-medium">Recommandation</th>
                      <th className="px-4 py-2 text-left font-medium">Nouvelle prime</th>
                      <th className="px-4 py-2 text-left font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tariffs.recommendations.map(rec => (
                      <TariffRecommendationRow
                        key={rec.policyId}
                        recommendation={rec}
                        onApply={handleApplyTariff}
                        onIgnore={() => mutateTariffs()}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── TAB 6: FRAUD ──────────────────────────────────────────────────── */}
        <TabsContent value="fraud" className="mt-4 space-y-4">
          {fraud && fraud.criticalCount > 0 && (
            <div className="bg-red-50 border border-red-300 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 text-red-600" />
                <p className="text-sm font-semibold text-red-800">
                  🔴 {fraud.criticalCount} cluster{fraud.criticalCount > 1 ? 's' : ''} de fraude critique détecté{fraud.criticalCount > 1 ? 's' : ''}
                </p>
              </div>
            </div>
          )}

          {!fraud ? (
            <div className="space-y-3">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>
          ) : fraud.clusters.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <AlertOctagon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Aucun cluster de fraude actif détecté</p>
            </div>
          ) : (
            fraud.clusters.map(alert => (
              <FraudClusterCard
                key={alert.id}
                alert={alert}
                onInvestigate={() => {}}
                onEscalate={() => {}}
                onDismiss={handleDismissFraud}
              />
            ))
          )}

          <button
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 mx-auto"
            onClick={() => setShowDismissed(v => !v)}
          >
            {showDismissed ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            {showDismissed ? 'Masquer les alertes ignorées' : 'Voir les alertes ignorées'}
          </button>
        </TabsContent>

        {/* ── TAB 7: AI DECISIONS ───────────────────────────────────────────── */}
        <TabsContent value="ai-decisions" className="mt-4 space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
              <Bot className="w-5 h-5 text-blue-600" />
              Performance des Décisions IA
            </h2>

            {/* ── KPI Cards ──────────────────────────────────────────────── */}
            {!aiAnalytics ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <p className="text-xs text-blue-600 font-medium mb-1">Taux de suivi</p>
                  <p className="text-3xl font-bold text-blue-700">{aiAnalytics.followRate}%</p>
                  <p className="text-xs text-blue-500 mt-1">managers suivant la recommandation IA</p>
                </div>
                <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                  <p className="text-xs text-green-600 font-medium mb-1">Recommandations ce mois</p>
                  <p className="text-3xl font-bold text-green-700">{aiAnalytics.thisMonth}</p>
                  <p className="text-xs text-green-500 mt-1">{aiAnalytics.totalDecisions} au total</p>
                </div>
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
                  <p className="text-xs text-orange-600 font-medium mb-1">Escalades évitées</p>
                  <p className="text-3xl font-bold text-orange-700">{aiAnalytics.escalatesAvoided}</p>
                  <p className="text-xs text-orange-500 mt-1">décisions directes suivies</p>
                </div>
              </div>
            )}

            {/* ── Charts row ─────────────────────────────────────────────── */}
            {aiAnalytics && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                {/* Pie: distribution */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1">
                    <BarChart2 className="w-4 h-4 text-gray-400" />
                    Distribution des recommandations
                  </h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Approuver', value: aiAnalytics.recommendationDistribution.APPROVE,  fill: '#16a34a' },
                          { name: 'Refuser',   value: aiAnalytics.recommendationDistribution.REJECT,   fill: '#dc2626' },
                          { name: 'Escalader', value: aiAnalytics.recommendationDistribution.ESCALATE, fill: '#f97316' },
                        ]}
                        cx="50%" cy="50%" outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }: { name?: string | number; percent?: number }) =>
                          `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`
                        }
                        labelLine={false}
                      >
                        {[
                          <Cell key="approve"  fill="#16a34a" />,
                          <Cell key="reject"   fill="#dc2626" />,
                          <Cell key="escalate" fill="#f97316" />,
                        ]}
                      </Pie>
                      <Tooltip formatter={(v) => [v, 'décisions']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Bar: follow rate by claim type */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1">
                    <TrendingUp className="w-4 h-4 text-gray-400" />
                    Taux de suivi par type de sinistre
                  </h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={Object.entries(aiAnalytics.accuracyByType).map(([type, v]) => ({
                        type,
                        accuracy: v.accuracy,
                        total: v.total,
                      }))}
                      margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="type" tick={{ fontSize: 10 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                      <Tooltip formatter={(v) => [`${v}%`, 'Taux suivi']} />
                      <Bar dataKey="accuracy" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* ── Override reasons table ────────────────────────────────── */}
            {aiAnalytics && aiAnalytics.overrideReasons.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Raisons de dérogation</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-xs text-gray-500">
                        <th className="text-left py-2 font-medium">RAISON</th>
                        <th className="text-right py-2 font-medium">NOMBRE</th>
                        <th className="text-right py-2 font-medium">% DU TOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aiAnalytics.overrideReasons.map(r => (
                        <tr key={r.reason} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2.5 text-gray-700">{IGNORE_REASON_LABELS[r.reason] ?? r.reason}</td>
                          <td className="py-2.5 text-right font-medium text-gray-900">{r.count}</td>
                          <td className="py-2.5 text-right text-gray-500">{r.percentage}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Confidence accuracy table ─────────────────────────────── */}
            {aiAnalytics && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Précision par intervalle de confiance</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-xs text-gray-500">
                        <th className="text-left py-2 font-medium">INTERVALLE CONFIANCE</th>
                        <th className="text-right py-2 font-medium">DÉCISIONS</th>
                        <th className="text-right py-2 font-medium">TAUX SUIVI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aiAnalytics.confidenceAccuracy.map(b => (
                        <tr key={b.range} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2.5 text-gray-700">{b.range}</td>
                          <td className="py-2.5 text-right text-gray-600">{b.total}</td>
                          <td className="py-2.5 text-right">
                            {b.rate !== null ? (
                              <span className={`font-medium ${
                                b.rate >= 80 ? 'text-green-600' : b.rate >= 60 ? 'text-orange-500' : 'text-red-500'
                              }`}>
                                {b.rate}%
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Top overriding managers ───────────────────────────────── */}
            {aiAnalytics && aiAnalytics.topOverridingManagers.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Managers dérogeant le plus souvent</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-xs text-gray-500">
                        <th className="text-left py-2 font-medium">MANAGER</th>
                        <th className="text-right py-2 font-medium">DÉROGATIONS</th>
                        <th className="text-right py-2 font-medium">TOTAL</th>
                        <th className="text-right py-2 font-medium">TAUX DÉROGATION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aiAnalytics.topOverridingManagers.map(m => (
                        <tr key={m.managerId} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2.5 text-gray-800 font-medium">{m.name}</td>
                          <td className="py-2.5 text-right text-red-600 font-medium">{m.overrideCount}</td>
                          <td className="py-2.5 text-right text-gray-500">{m.totalDecisions}</td>
                          <td className="py-2.5 text-right">
                            <span className={`font-medium ${
                              m.totalDecisions > 0 && (m.overrideCount / m.totalDecisions) > 0.5 ? 'text-red-500' : 'text-gray-700'
                            }`}>
                              {m.totalDecisions > 0 ? Math.round((m.overrideCount / m.totalDecisions) * 100) : 0}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {!aiAnalytics && (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Retention email modal ─────────────────────────────────────────────── */}
      <Dialog open={!!retentionModal} onOpenChange={open => !open && setRetentionModal(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Offre de fidélisation — {retentionModal?.firstName} {retentionModal?.lastName}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-xs text-gray-500 mb-2">Aperçu du message qui sera envoyé:</p>
            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 space-y-2 border border-gray-200">
              <p>Bonjour {retentionModal?.firstName},</p>
              <p>
                Dans le cadre de notre programme de fidélité, nous vous proposons une offre personnalisée
                suite à votre expérience avec nos services.
              </p>
              <p>
                En tant que client ISM Assurance, vous bénéficiez d&apos;une attention particulière de notre équipe.
                Nous souhaitons vous présenter nos nouvelles offres adaptées à vos besoins.
              </p>
              <p>Cordialement,<br />L&apos;équipe ISM Assurance</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRetentionModal(null)}>Annuler</Button>
            <Button
              className="gap-2"
              onClick={() => {
                window.open(`mailto:${retentionModal?.email}?subject=Offre de fidélisation ISM Assurance`);
                setRetentionModal(null);
              }}
            >
              <Mail className="w-4 h-4" />
              Envoyer par email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
