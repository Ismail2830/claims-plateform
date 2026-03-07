'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Brain,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Download,
  Eye,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Search,
  Server,
  TrendingUp,
  ShieldAlert,
  Zap,
  Activity,
} from 'lucide-react';
import { useAdminAuth } from '@/app/hooks/useAdminAuth';
import { RiskBadge } from '@/components/sinistres/RiskBadge';
import { ScoringKpiCard }  from '@/app/components/dashboard/ai-scoring/ScoringKpiCard';
import { RiskDonutChart }  from '@/app/components/dashboard/ai-scoring/RiskDonutChart';
import { RiskTrendChart }  from '@/app/components/dashboard/ai-scoring/RiskTrendChart';
import { HighRiskList }    from '@/app/components/dashboard/ai-scoring/HighRiskList';
import { BulkScoreButton } from '@/app/components/dashboard/ai-scoring/BulkScoreButton';
import type { WeeklyTrend }   from '@/app/components/dashboard/ai-scoring/RiskTrendChart';
import type { HighRiskClaim } from '@/app/components/dashboard/ai-scoring/HighRiskList';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DistributionBucket { count: number; percentage: number }

interface ScoringStats {
  distribution: {
    faible:     DistributionBucket;
    moyen:      DistributionBucket;
    eleve:      DistributionBucket;
    suspicieux: DistributionBucket;
  };
  totalScored:    number;
  totalUnscored:  number;
  avgScore:       number;
  avgConfidence:  number;
  autoApproved:   number;
  needsReview:    number;
  escalated:      number;
  fraudRate:      number;
  trendLastMonth: number;
}

interface ModelStats {
  modelVersion:     string;
  lastTrainedAt:    string | null;
  totalPredictions: number;
  avgProcessingMs:  number;
  serviceStatus:    'online' | 'offline';
}

interface ScoredClaim {
  id:              string;
  claimNumber:     string;
  clientName:      string;
  clientPhone:     string;
  typeSinistre:    string;
  montantDeclare:  number | null;
  dateDeclaration: string;
  scoreRisque:     number | null;
  labelRisque:     string | null;
  decisionIa:      string | null;
  scoreConfidence: number | null;
  assignedManager: { name: string; role: string } | null;
  statut:          string;
  scoredAt:        string | null;
}

type SortKey = 'claimNumber' | 'clientName' | 'scoreRisque' | 'montantDeclare' | 'dateDeclaration' | 'scoreConfidence';
type TabFilter = 'ALL' | 'SUSPICIEUX' | 'ELEVE' | 'MOYEN' | 'FAIBLE' | 'UNSCORED';

// ─── Constants ────────────────────────────────────────────────────────────────

const CLAIM_TYPE_FR: Record<string, string> = {
  ACCIDENT:     'Accident',
  THEFT:        'Vol',
  FIRE:         'Incendie',
  WATER_DAMAGE: 'Dégâts eaux',
};

const LABEL_FR: Record<string, string> = {
  FAIBLE:     'Faible',
  MOYEN:      'Moyen',
  ELEVE:      'Élevé',
  SUSPICIEUX: 'Suspicieux',
};

const DECISION_CONFIG: Record<string, { label: string; className: string }> = {
  AUTO_APPROUVER:    { label: 'Auto-approuvé', className: 'bg-green-100  text-green-700  border-green-200' },
  REVISION_MANUELLE: { label: 'Révision',      className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  ESCALADER:         { label: 'Escalader',     className: 'bg-red-100    text-red-700    border-red-200'    },
};

const TAB_LABELS: Record<TabFilter, string> = {
  ALL:        'Tous',
  SUSPICIEUX: '🔴 Suspicieux',
  ELEVE:      '🟠 Élevé',
  MOYEN:      '🟡 Moyen',
  FAIBLE:     '🟢 Faible',
  UNSCORED:   '⚪ Non scorés',
};

const PAGE_SIZE = 20;

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 10 }).map((_, i) => (
        <tr key={i} className="animate-pulse">
          {Array.from({ length: 10 }).map((__, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-4 bg-gray-200 rounded" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AiScoringPage() {
  useAdminAuth();
  const router = useRouter();

  // ── Data ──
  const [stats,      setStats]      = useState<ScoringStats | null>(null);
  const [modelStats, setModelStats] = useState<ModelStats | null>(null);
  const [trendData,  setTrendData]  = useState<WeeklyTrend[]>([]);
  const [highRisk,   setHighRisk]   = useState<HighRiskClaim[]>([]);

  // ── Table ──
  const [tableClaims,  setTableClaims]  = useState<ScoredClaim[]>([]);
  const [totalItems,   setTotalItems]   = useState(0);
  const [tablePage,    setTablePage]    = useState(1);
  const [activeTab,    setActiveTab]    = useState<TabFilter>('ALL');
  const [searchTerm,   setSearchTerm]   = useState('');
  const [sortKey,      setSortKey]      = useState<SortKey>('scoreRisque');
  const [sortAsc,      setSortAsc]      = useState(false);
  const [tableLoading, setTableLoading] = useState(true);

  // ── Loading ──
  const [statsLoading,  setStatsLoading]  = useState(true);
  const [chartsLoading, setChartsLoading] = useState(true);

  // ── Actions ──
  const [rescoringId,      setRescoringId]      = useState<string | null>(null);
  const [showRetrainModal, setShowRetrainModal] = useState(false);
  const [exportLoading,    setExportLoading]    = useState(false);

  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Loaders ───────────────────────────────────────────────────────────────

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const [sRes, mRes] = await Promise.all([
        fetch('/api/ai-scoring/stats'),
        fetch('/api/ai-scoring/model-stats'),
      ]);
      if (sRes.ok) setStats((await sRes.json()) as ScoringStats);
      if (mRes.ok) setModelStats((await mRes.json()) as ModelStats);
    } catch (err) {
      console.error('[AiScoring] loadStats:', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadCharts = useCallback(async () => {
    setChartsLoading(true);
    try {
      const [tRes, hRes] = await Promise.all([
        fetch('/api/ai-scoring/trends'),
        fetch('/api/ai-scoring/high-risk?limit=5'),
      ]);
      if (tRes.ok) setTrendData((await tRes.json()) as WeeklyTrend[]);
      if (hRes.ok) {
        const body = (await hRes.json()) as { data: HighRiskClaim[] };
        setHighRisk(body.data ?? []);
      }
    } catch (err) {
      console.error('[AiScoring] loadCharts:', err);
    } finally {
      setChartsLoading(false);
    }
  }, []);

  const loadTable = useCallback(async () => {
    setTableLoading(true);
    try {
      let url: string;
      if (activeTab === 'UNSCORED') {
        url = `/api/ai-scoring/unscored?page=${tablePage}&limit=${PAGE_SIZE}`;
      } else if (activeTab === 'ALL') {
        url = `/api/ai-scoring/high-risk?page=${tablePage}&limit=${PAGE_SIZE}&includeAll=true`;
      } else {
        url = `/api/ai-scoring/high-risk?page=${tablePage}&limit=${PAGE_SIZE}&labelFilter=${activeTab}`;
      }
      const res  = await fetch(url);
      if (!res.ok) return;
      const body = await res.json() as {
        data?:   ScoredClaim[];
        claims?: ScoredClaim[];
        total?:  number;
        count?:  number;
      };
      setTableClaims((body.data ?? body.claims ?? []) as ScoredClaim[]);
      setTotalItems(body.total ?? body.count ?? 0);
    } catch (err) {
      console.error('[AiScoring] loadTable:', err);
    } finally {
      setTableLoading(false);
    }
  }, [activeTab, tablePage]);

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => { loadStats(); loadCharts(); }, [loadStats, loadCharts]);
  useEffect(() => { loadTable(); }, [loadTable]);
  useEffect(() => { setTablePage(1); }, [activeTab, searchTerm]);

  // Auto refresh every 60 s
  useEffect(() => {
    refreshIntervalRef.current = setInterval(() => {
      loadStats();
      loadCharts();
    }, 60_000);
    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, [loadStats, loadCharts]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleRescoreClaim = async (claimId: string) => {
    if (rescoringId) return;
    setRescoringId(claimId);
    try {
      await fetch(`/api/claims/${claimId}/score`, { method: 'POST' });
      await Promise.all([loadTable(), loadStats()]);
    } catch (err) {
      console.error('[AiScoring] rescoreClaim:', err);
    } finally {
      setRescoringId(null);
    }
  };

  const handleExport = async () => {
    if (exportLoading) return;
    setExportLoading(true);
    try {
      // Build URL matching current tab filter, up to 5000 rows
      let url: string;
      if (activeTab === 'UNSCORED') {
        url = '/api/ai-scoring/unscored?page=1&limit=5000';
      } else if (activeTab === 'ALL') {
        url = '/api/ai-scoring/high-risk?includeAll=true&limit=5000';
      } else {
        url = `/api/ai-scoring/high-risk?labelFilter=${activeTab}&limit=5000`;
      }

      const res  = await fetch(url);
      if (!res.ok) return;
      const body = await res.json() as { data?: ScoredClaim[]; claims?: ScoredClaim[] };
      const claims = body.data ?? body.claims ?? [];

      const tabLabel = TAB_LABELS[activeTab].replace(/[^a-zA-Z]/g, '') || 'tous';
      const rows = [
        ['Dossier','Client','Téléphone','Type','Montant (MAD)','Score IA','Label','Décision IA','Confiance (%)','Gestionnaire','Statut','Scoré le'],
        ...claims.map(c => [
          c.claimNumber,
          c.clientName,
          c.clientPhone,
          CLAIM_TYPE_FR[c.typeSinistre] ?? c.typeSinistre,
          c.montantDeclare?.toLocaleString('fr-FR') ?? '',
          c.scoreRisque ?? '',
          LABEL_FR[c.labelRisque ?? ''] ?? '',
          DECISION_CONFIG[c.decisionIa ?? '']?.label ?? '',
          c.scoreConfidence ?? '',
          c.assignedManager?.name ?? '',
          c.statut,
          c.scoredAt ? new Date(c.scoredAt).toLocaleDateString('fr-FR') : '',
        ]),
      ];
      const csv  = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const href = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = href;
      a.download = `scoring-ia-${tabLabel.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(href);
    } catch (err) {
      console.error('[AiScoring] export:', err);
    } finally {
      setExportLoading(false);
    }
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(prev => !prev);
    else { setSortKey(key); setSortAsc(false); }
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const sortedClaims = [...tableClaims].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case 'scoreRisque':    cmp = (a.scoreRisque ?? -1)    - (b.scoreRisque ?? -1); break;
      case 'montantDeclare': cmp = (a.montantDeclare ?? 0)  - (b.montantDeclare ?? 0); break;
      case 'scoreConfidence':cmp = (a.scoreConfidence ?? -1)- (b.scoreConfidence ?? -1); break;
      case 'claimNumber':    cmp = a.claimNumber.localeCompare(b.claimNumber); break;
      case 'clientName':     cmp = a.clientName.localeCompare(b.clientName); break;
      case 'dateDeclaration':cmp = new Date(a.dateDeclaration).getTime() - new Date(b.dateDeclaration).getTime(); break;
    }
    return sortAsc ? cmp : -cmp;
  });

  const filteredClaims = searchTerm.trim()
    ? sortedClaims.filter(c =>
        c.claimNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.clientName.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    : sortedClaims;

  const totalDecisions = (stats?.autoApproved ?? 0) + (stats?.needsReview ?? 0) + (stats?.escalated ?? 0);
  const pctAuto        = totalDecisions > 0 ? ((stats?.autoApproved ?? 0) / totalDecisions) * 100 : 0;
  const pctRevision    = totalDecisions > 0 ? ((stats?.needsReview   ?? 0) / totalDecisions) * 100 : 0;
  const pctEscalated   = totalDecisions > 0 ? ((stats?.escalated     ?? 0) / totalDecisions) * 100 : 0;
  const totalPages     = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  // ── Column header helper ──────────────────────────────────────────────────

  function ColHeader({ label, k }: { label: string; k?: SortKey }) {
    const active = k !== undefined && sortKey === k;
    return (
      <th
        className={cn(
          'px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap',
          k && 'cursor-pointer hover:text-gray-700 select-none',
        )}
        onClick={k ? () => handleSort(k) : undefined}
      >
        <span className="flex items-center space-x-1">
          <span>{label}</span>
          {k && (
            active
              ? (sortAsc ? <ChevronUp className="w-3 h-3 text-indigo-500" /> : <ChevronDown className="w-3 h-3 text-indigo-500" />)
              : <ChevronDown className="w-3 h-3 text-gray-300" />
          )}
        </span>
      </th>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-10">

      {/* ── Section 1: Header ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-indigo-100 rounded-xl">
            <Brain className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Scoring IA</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Vue globale de l'analyse de risque par intelligence artificielle
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-3">
          {modelStats && (
            <span className={cn(
              'flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border',
              modelStats.serviceStatus === 'online'
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-red-50 text-red-700 border-red-200',
            )}>
              <span className={cn(
                'w-2 h-2 rounded-full shrink-0',
                modelStats.serviceStatus === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500',
              )} />
              <span>
                {modelStats.serviceStatus === 'online' ? 'Service IA opérationnel' : 'Service IA hors ligne'}
              </span>
            </span>
          )}

          <BulkScoreButton
            unscoredCount={stats?.totalUnscored ?? 0}
            onComplete={() => { loadStats(); loadCharts(); loadTable(); }}
          />

          <button
            onClick={handleExport}
            disabled={exportLoading}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {exportLoading
              ? <RefreshCw className="w-4 h-4 animate-spin" />
              : <Download className="w-4 h-4" />}
            <span>{exportLoading ? 'Export…' : 'Exporter CSV'}</span>
          </button>
        </div>
      </div>

      {/* ── Section 2: KPI Cards ───────────────────────────────────────── */}
      {statsLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : stats && (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <ScoringKpiCard title="Total scorés"   value={stats.totalScored}   color="blue"   icon={ShieldAlert} subtitle="dossiers analysés" />
          <ScoringKpiCard title="Non scorés"     value={stats.totalUnscored} color="orange" icon={AlertTriangle} alert={stats.totalUnscored > 0} subtitle={stats.totalUnscored > 0 ? 'à traiter' : 'aucun en attente'} />
          <ScoringKpiCard title="Score moyen"    value={stats.avgScore}      color="purple" icon={Activity}     unit="/100" trend={stats.trendLastMonth}   subtitle="tous les dossiers" />
          <ScoringKpiCard title="Taux de fraude" value={`${stats.fraudRate.toFixed(1)}%`} color={stats.fraudRate > 10 ? 'red' : 'yellow'} icon={TrendingUp} alert={stats.fraudRate > 10} subtitle="élevé + suspicieux" />
          <ScoringKpiCard title="Auto-approuvés" value={stats.autoApproved}  color="green"  icon={CheckCircle} subtitle="sans intervention" />
          <ScoringKpiCard title="À escalader"    value={stats.escalated}     color="red"    icon={Zap}         alert={stats.escalated > 0} subtitle="intervention urgente" />
        </div>
      )}

      {/* ── Section 3: Two-column ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Left 60% */}
        <div className="lg:col-span-3 space-y-6">

          {/* 3a: Donut chart */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
              <span>Distribution des risques</span>
            </h2>
            {chartsLoading ? (
              <div className="h-56 bg-gray-100 rounded-xl animate-pulse" />
            ) : stats ? (
              <RiskDonutChart data={stats.distribution} totalLabel={stats.totalScored} />
            ) : null}
          </div>

          {/* 3b: Trend chart */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
              <span>Évolution du risque sur 8 semaines</span>
            </h2>
            {chartsLoading ? (
              <div className="h-60 bg-gray-100 rounded-xl animate-pulse" />
            ) : (
              <RiskTrendChart data={trendData} />
            )}
          </div>
        </div>

        {/* Right 40% */}
        <div className="lg:col-span-2 space-y-6">

          {/* 3c: High-risk list */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <span>Dossiers à risque élevé</span>
              </h2>
              <button
                onClick={() => {
                  setActiveTab('ELEVE');
                  document.getElementById('scoring-table')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center space-x-0.5"
              >
                <span>Voir tous</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            {chartsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : (
              <HighRiskList claims={highRisk} limit={5} />
            )}
          </div>

          {/* 3d: Decision stats */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center space-x-2">
              <Activity className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>Statistiques des décisions IA</span>
            </h2>
            {statsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />)}
              </div>
            ) : stats ? (
              <div className="space-y-4">
                {/* Auto */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="flex items-center space-x-1.5 text-gray-600">
                      <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                      <span>Auto-approuvés</span>
                    </span>
                    <span className="font-semibold text-gray-800">{pctAuto.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full transition-all duration-700" style={{ width: `${pctAuto}%` }} />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{stats.autoApproved} dossiers</p>
                </div>

                {/* Révision */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="flex items-center space-x-1.5 text-gray-600">
                      <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
                      <span>Révision manuelle</span>
                    </span>
                    <span className="font-semibold text-gray-800">{pctRevision.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-500 rounded-full transition-all duration-700" style={{ width: `${pctRevision}%` }} />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{stats.needsReview} dossiers</p>
                </div>

                {/* Escalader */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="flex items-center space-x-1.5 text-gray-600">
                      <XCircle className="w-3.5 h-3.5 text-red-500" />
                      <span>Escaladés</span>
                    </span>
                    <span className="font-semibold text-gray-800">{pctEscalated.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full transition-all duration-700" style={{ width: `${pctEscalated}%` }} />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{stats.escalated} dossiers</p>
                </div>

                <div className="pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    Confiance IA moyenne:{' '}
                    <span className="font-semibold text-gray-800">{stats.avgConfidence.toFixed(1)}%</span>
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── Section 4: Full Table ──────────────────────────────────────── */}
      <div id="scoring-table" className="bg-white rounded-xl border border-gray-200 shadow-sm">

        {/* Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>Tous les dossiers scorés</span>
            {totalItems > 0 && (
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                {totalItems.toLocaleString('fr-FR')}
              </span>
            )}
          </h2>
          <div className="relative max-w-xs w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="N° dossier ou nom client…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto border-b border-gray-100">
          {(Object.keys(TAB_LABELS) as TabFilter[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 shrink-0',
                activeTab === tab
                  ? 'border-indigo-500 text-indigo-600 bg-indigo-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50',
              )}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr className="bg-gray-50">
                <ColHeader label="Dossier"      k="claimNumber" />
                <ColHeader label="Client"       k="clientName" />
                <ColHeader label="Type" />
                <ColHeader label="Montant"      k="montantDeclare" />
                <ColHeader label="Score IA"     k="scoreRisque" />
                <ColHeader label="Label" />
                <ColHeader label="Décision IA" />
                <ColHeader label="Confiance"    k="scoreConfidence" />
                <ColHeader label="Gestionnaire" />
                <ColHeader label="Actions" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {tableLoading ? (
                <TableSkeleton />
              ) : filteredClaims.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center space-y-2">
                      <ShieldAlert className="w-10 h-10 text-gray-300" />
                      <p className="text-sm text-gray-500">
                        {searchTerm ? 'Aucun résultat pour cette recherche' : 'Aucun dossier dans cette catégorie'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : filteredClaims.map(claim => {
                const labelDisplay = LABEL_FR[claim.labelRisque ?? ''] ?? claim.labelRisque ?? '—';
                const decisionCfg  = DECISION_CONFIG[claim.decisionIa ?? ''];
                const isRescoring  = rescoringId === claim.id;

                return (
                  <tr key={claim.id} className="hover:bg-gray-50 transition-colors">
                    {/* Dossier */}
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-gray-900">{claim.claimNumber}</p>
                      {claim.scoredAt && (
                        <p className="text-xs text-gray-400">
                          {new Date(claim.scoredAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                        </p>
                      )}
                    </td>

                    {/* Client */}
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-900">{claim.clientName}</p>
                      <p className="text-xs text-gray-400">{claim.clientPhone}</p>
                    </td>

                    {/* Type */}
                    <td className="px-4 py-3">
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                        {CLAIM_TYPE_FR[claim.typeSinistre] ?? claim.typeSinistre}
                      </span>
                    </td>

                    {/* Montant */}
                    <td className="px-4 py-3 text-sm text-gray-700 font-medium whitespace-nowrap">
                      {claim.montantDeclare != null
                        ? `${claim.montantDeclare.toLocaleString('fr-MA', { maximumFractionDigits: 0 })} MAD`
                        : '—'}
                    </td>

                    {/* Score IA + mini bar */}
                    <td className="px-4 py-3">
                      {claim.scoreRisque !== null ? (
                        <div className="flex items-center space-x-2 min-w-18">
                          <span className={cn(
                            'text-sm font-bold w-7 text-right leading-none',
                            claim.scoreRisque >= 80 ? 'text-red-600' :
                            claim.scoreRisque >= 61 ? 'text-orange-600' :
                            claim.scoreRisque >= 41 ? 'text-yellow-600' :
                            'text-green-600',
                          )}>
                            {claim.scoreRisque}
                          </span>
                          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full',
                                claim.scoreRisque >= 80 ? 'bg-red-500' :
                                claim.scoreRisque >= 61 ? 'bg-orange-500' :
                                claim.scoreRisque >= 41 ? 'bg-yellow-500' :
                                'bg-green-500',
                              )}
                              style={{ width: `${claim.scoreRisque}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Non scoré</span>
                      )}
                    </td>

                    {/* Label */}
                    <td className="px-4 py-3">
                      {claim.labelRisque
                        ? <RiskBadge label={labelDisplay} score={claim.scoreRisque ?? 0} size="sm" />
                        : <span className="text-xs text-gray-400">—</span>
                      }
                    </td>

                    {/* Décision IA */}
                    <td className="px-4 py-3">
                      {decisionCfg
                        ? <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium border whitespace-nowrap', decisionCfg.className)}>{decisionCfg.label}</span>
                        : <span className="text-xs text-gray-400">—</span>
                      }
                    </td>

                    {/* Confiance */}
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {claim.scoreConfidence !== null ? `${claim.scoreConfidence}%` : '—'}
                    </td>

                    {/* Gestionnaire */}
                    <td className="px-4 py-3">
                      {claim.assignedManager ? (
                        <div>
                          <p className="text-xs font-medium text-gray-800 whitespace-nowrap">{claim.assignedManager.name}</p>
                          <p className="text-xs text-gray-400">{claim.assignedManager.role.replace(/_/g, ' ')}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Non assigné</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => router.push(`/dashboard/super-admin/claims?id=${claim.id}`)}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Voir le dossier"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRescoreClaim(claim.id)}
                          disabled={!!rescoringId}
                          className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                          title="Re-scorer"
                        >
                          <RotateCcw className={cn('w-4 h-4', isRescoring && 'animate-spin')} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              {((tablePage - 1) * PAGE_SIZE) + 1}–{Math.min(tablePage * PAGE_SIZE, totalItems)} sur {totalItems.toLocaleString('fr-FR')} dossiers
            </p>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setTablePage(p => Math.max(1, p - 1))}
                disabled={tablePage === 1}
                className="p-1.5 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-700">Page {tablePage} / {totalPages}</span>
              <button
                onClick={() => setTablePage(p => Math.min(totalPages, p + 1))}
                disabled={tablePage === totalPages}
                className="p-1.5 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Section 5: Model Info ──────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-100 rounded-xl">
              <Server className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-800">Modèle IA — Informations</h2>
              <p className="text-xs text-gray-500">GradientBoosting ML Risk Classifier</p>
            </div>
          </div>
          <button
            onClick={() => setShowRetrainModal(true)}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Réentraîner le modèle</span>
          </button>
        </div>

        {modelStats ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-4 border-t border-gray-100">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Version</p>
              <p className="text-sm font-semibold text-gray-800 mt-1">{modelStats.modelVersion}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Dernière activité</p>
              <p className="text-sm font-semibold text-gray-800 mt-1">
                {modelStats.lastTrainedAt
                  ? new Date(modelStats.lastTrainedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Total prédictions</p>
              <p className="text-sm font-semibold text-gray-800 mt-1">{modelStats.totalPredictions.toLocaleString('fr-FR')}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Statut</p>
              <div className="flex items-center space-x-1.5 mt-1">
                <span className={cn(
                  'w-2 h-2 rounded-full shrink-0',
                  modelStats.serviceStatus === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500',
                )} />
                <span className={cn('text-sm font-semibold', modelStats.serviceStatus === 'online' ? 'text-green-700' : 'text-red-700')}>
                  {modelStats.serviceStatus === 'online' ? 'En ligne' : 'Hors ligne'}
                </span>
                {modelStats.avgProcessingMs > 0 && (
                  <span className="text-xs text-gray-400">({modelStats.avgProcessingMs}ms)</span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-4 mt-5 pt-4 border-t border-gray-100">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />)}
          </div>
        )}
      </div>

      {/* ── Retrain Modal ──────────────────────────────────────────────── */}
      {showRetrainModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/40" onClick={() => setShowRetrainModal(false)} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-orange-100 rounded-xl">
                  <RefreshCw className="w-5 h-5 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Réentraîner le modèle</h3>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                Cette action relancera l'entraînement complet du modèle de scoring IA avec les dernières données disponibles.
              </p>
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-6">
                ⚠️ L'opération peut prendre plusieurs minutes. Le service de scoring sera temporairement indisponible.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowRetrainModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    setShowRetrainModal(false);
                    // TODO: implement POST /api/ai-scoring/retrain when ML retrain endpoint is ready
                    console.info('[AiScoring] Retrain triggered');
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors"
                >
                  Confirmer et relancer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

