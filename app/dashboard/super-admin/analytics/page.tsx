'use client';

import useSWR from 'swr';
import { useState } from 'react';
import { useAdminAuth } from '@/app/hooks/useAdminAuth';
import {
  BarChart, Bar, AreaChart, Area,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  BarChart3, DollarSign, Clock,
  Brain, MapPin, Calendar,
  FileText, CheckCircle, Loader2,
} from 'lucide-react';

import { AnalyticsKpiCard } from '@/app/components/dashboard/analytics/AnalyticsKpiCard';
import { SectionCard } from '@/app/components/dashboard/analytics/SectionCard';
import { ClaimsHeatmap } from '@/app/components/dashboard/analytics/ClaimsHeatmap';
import { ManagerPerformanceTable } from '@/app/components/dashboard/analytics/ManagerPerformanceTable';
import { ExportButton } from '@/app/components/dashboard/analytics/ExportButton';
import { formatAmount } from '@/app/lib/analytics-utils';

// ─── Stable fetcher — key is [url, period] tuple ────────────────────────────
async function analyticsFetcher([url, period]: [string, string]) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
  const sep = url.includes('?') ? '&' : '?';
  const res = await fetch(`${url}${sep}period=${period}`, {
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('Erreur analytics');
  return res.json();
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface KpiData {
  total: number; prevTotal: number; approved: number; rejected: number;
  pending: number; approvalRate: number; avgApprovedAmount: number;
  avgResolutionDays: number; avgRiskScore: number; aiCoverage: number;
}
interface EvolutionItem { date: string; total: number; approved: number; rejected: number; pending: number }
interface ByTypeItem { type: string; label: string; count: number; claimedAmount: number }
interface ByStatusItem { status: string; label: string; count: number }
interface ManagerRow {
  userId: string; firstName: string; lastName: string; role: string;
  currentWorkload: number; maxWorkload: number; total: number;
  approved: number; rejected: number; processing: number;
  approvalRate: number; avgResolutionDays: number | null;
}
interface FinancialTypeItem { type: string; label: string; claimed: number; estimated: number; approved: number }
interface MonthlyItem { month: string; amount: number }
interface FinancialTotals { claimed: number; estimated: number; approved: number }
interface RiskWeek { week: string; FAIBLE: number; MOYEN: number; ELEVE: number; SUSPICIEUX: number; unscored: number }
interface DecisionItem { label: string; key: string; count: number; color: string }
interface GeoItem { city?: string; province?: string; count: number; approvedAmount: number }
interface HeatmapCell { dayOfWeek: number; hour: number; count: number }

// ─── Palette ─────────────────────────────────────────────────────────────────
const COLORS = {
  total: '#3b82f6', approved: '#10b981', rejected: '#ef4444', pending: '#f59e0b',
  FAIBLE: '#10b981', MOYEN: '#f59e0b', ELEVE: '#f97316', SUSPICIEUX: '#ef4444',
  claimed: '#93c5fd', estimated: '#6366f1', approved2: '#10b981',
};
const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const PERIOD_OPTIONS = [
  { value: 'week', label: '7 jours' },
  { value: 'month', label: '30 jours' },
  { value: 'quarter', label: '3 mois' },
  { value: 'year', label: '12 mois' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  useAdminAuth(); // redirects if not authenticated

  const [period, setPeriod] = useState<string>('month');
  const swrOpts = { refreshInterval: 60_000, keepPreviousData: true } as const;

  const { data: kpis, isLoading: kpiLoading } = useSWR<KpiData>(['/api/analytics/kpis', period], analyticsFetcher, swrOpts);
  const { data: evolution } = useSWR<{ data: EvolutionItem[]; granularity: string }>(['/api/analytics/evolution', period], analyticsFetcher, swrOpts);
  const { data: byTypeData } = useSWR<{ byType: ByTypeItem[]; byStatus: ByStatusItem[] }>(['/api/analytics/by-type', period], analyticsFetcher, swrOpts);
  const { data: managers } = useSWR<{ data: ManagerRow[] }>(['/api/analytics/managers-performance', period], analyticsFetcher, swrOpts);
  const { data: financials } = useSWR<{ byType: FinancialTypeItem[]; monthlyPayments: MonthlyItem[]; totals: FinancialTotals }>(['/api/analytics/financials', period], analyticsFetcher, swrOpts);
  const { data: aiFraud } = useSWR<{ riskDistribution: RiskWeek[]; decisions: DecisionItem[]; avgScore: number; aiCoverage: number }>(['/api/analytics/ai-fraud', period], analyticsFetcher, swrOpts);
  const { data: geo } = useSWR<{ byCity: GeoItem[]; byProvince: GeoItem[] }>(['/api/analytics/geography', period], analyticsFetcher, swrOpts);
  const { data: heatmap } = useSWR<{ data: HeatmapCell[]; maxCount: number }>(['/api/analytics/heatmap', period], analyticsFetcher, swrOpts);

  return (
    <div className="space-y-6 pb-10" id="analytics-export-target">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Dashboards Analytics</h1>
            <p className="text-gray-500 text-xs mt-0.5">Tableaux de bord analytiques avancés</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
            {PERIOD_OPTIONS.map(o => (
              <button
                key={o.value}
                onClick={() => setPeriod(o.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  period === o.value
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <ExportButton targetId="analytics-export-target" filename="analytics-sinistres" />
        </div>
      </div>

      {/* ── Section 1: KPI Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <AnalyticsKpiCard
          title="Total sinistres"
          value={kpis?.total ?? '—'}
          current={kpis?.total}
          prev={kpis?.prevTotal}
          goodWhenPositive={false}
          icon={<FileText className="w-4 h-4 text-blue-600" />}
          iconBg="bg-blue-50"
          loading={kpiLoading}
        />
        <AnalyticsKpiCard
          title="En cours"
          value={kpis?.pending ?? '—'}
          icon={<Clock className="w-4 h-4 text-amber-600" />}
          iconBg="bg-amber-50"
          loading={kpiLoading}
        />
        <AnalyticsKpiCard
          title="Taux d'approbation"
          value={kpis ? `${kpis.approvalRate}%` : '—'}
          icon={<CheckCircle className="w-4 h-4 text-emerald-600" />}
          iconBg="bg-emerald-50"
          loading={kpiLoading}
        />
        <AnalyticsKpiCard
          title="Montant moyen approuvé"
          value={kpis ? formatAmount(kpis.avgApprovedAmount) : '—'}
          icon={<DollarSign className="w-4 h-4 text-violet-600" />}
          iconBg="bg-violet-50"
          loading={kpiLoading}
        />
        <AnalyticsKpiCard
          title="Délai moyen"
          value={kpis?.avgResolutionDays ?? '—'}
          suffix="jours"
          goodWhenPositive={false}
          icon={<Calendar className="w-4 h-4 text-sky-600" />}
          iconBg="bg-sky-50"
          loading={kpiLoading}
        />
        <AnalyticsKpiCard
          title="Couverture IA"
          value={kpis ? `${kpis.aiCoverage}%` : '—'}
          icon={<Brain className="w-4 h-4 text-pink-600" />}
          iconBg="bg-pink-50"
          loading={kpiLoading}
        />
      </div>

      {/* ── Section 2: Évolution ─────────────────────────────────────────────── */}
      <SectionCard
        title="Évolution des sinistres"
        subtitle="Nombre de sinistres déclarés sur la période"
      >
        {evolution?.data?.length ? (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={evolution.data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.total} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={COLORS.total} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradApproved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.approved} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={COLORS.approved} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="total" name="Total" stroke={COLORS.total} fill="url(#gradTotal)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="approved" name="Approuvés" stroke={COLORS.approved} fill="url(#gradApproved)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="rejected" name="Rejetés" stroke={COLORS.rejected} fill="transparent" strokeWidth={2} dot={false} strokeDasharray="4 2" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <EmptySkeleton height={260} />
        )}
      </SectionCard>

      {/* ── Section 3: Répartition par type & statut ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Par type de sinistre" subtitle="Répartition selon la nature du sinistre">
          {byTypeData?.byType?.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byTypeData.byType} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={110} />
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" horizontal={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="count" name="Sinistres" radius={[0, 4, 4, 0]}>
                  {byTypeData.byType.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptySkeleton height={220} />
          )}
        </SectionCard>

        <SectionCard title="Par statut" subtitle="Distribution actuelle par état de traitement">
          {byTypeData?.byStatus?.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={byTypeData.byStatus}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) =>
                    (percent ?? 0) > 0.04 ? `${name} (${((percent ?? 0) * 100).toFixed(0)}%)` : ''
                  }
                  labelLine={false}
                  fontSize={10}
                >
                  {byTypeData.byStatus.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptySkeleton height={220} />
          )}
        </SectionCard>
      </div>

      {/* ── Section 4: Performance managers ─────────────────────────────────── */}
      <SectionCard
        title="Performance des managers"
        subtitle="Indicateurs de performance par gestionnaire sur la période"
      >
        <ManagerPerformanceTable data={managers?.data ?? []} loading={!managers} />
      </SectionCard>

      {/* ── Section 5: Analyse financière ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard
          title="Montants par type de sinistre"
          subtitle="Déclaré vs Estimé vs Approuvé (MAD)"
          action={
            financials?.totals ? (
              <div className="text-right text-xs text-gray-500">
                <span className="font-semibold text-emerald-600">{formatAmount(financials.totals.approved)}</span> approuvé
              </div>
            ) : undefined
          }
        >
          {financials?.byType?.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={financials.byType} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => formatAmount(v).replace(' MAD', '')} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: unknown) => [formatAmount(Number(v)), '']} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="claimed" name="Déclaré" fill={COLORS.claimed} radius={[2, 2, 0, 0]} />
                <Bar dataKey="estimated" name="Estimé" fill={COLORS.estimated} radius={[2, 2, 0, 0]} />
                <Bar dataKey="approved" name="Approuvé" fill={COLORS.approved2} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptySkeleton height={220} />
          )}
        </SectionCard>

        <SectionCard title="Évolution des paiements" subtitle="Montants approuvés versés par mois (12 derniers mois)">
          {!financials ? (
            <EmptySkeleton height={220} />
          ) : financials.monthlyPayments?.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={financials.monthlyPayments} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradPayments" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => formatAmount(v).replace(' MAD', '')} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: unknown) => [formatAmount(Number(v)), 'Montant']} />
                <Area type="monotone" dataKey="amount" name="Paiements" stroke="#6366f1" fill="url(#gradPayments)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center bg-gray-50 rounded-lg" style={{ height: 220 }}>
              <p className="text-sm text-gray-400">Aucun paiement approuvé sur les 12 derniers mois.</p>
            </div>
          )}
        </SectionCard>
      </div>

      {/* ── Section 6: IA & Risque ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <SectionCard
            title="Distribution du risque dans le temps"
            subtitle="Répartition hebdomadaire par niveau de risque IA"
            action={
              aiFraud ? (
                <div className="text-xs text-gray-500">
                  Score moy. <span className="font-semibold text-gray-700">{aiFraud.avgScore}/100</span>
                  {' · '}
                  Couverture <span className="font-semibold text-blue-600">{aiFraud.aiCoverage}%</span>
                </div>
              ) : undefined
            }
          >
            {aiFraud?.riskDistribution?.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={aiFraud.riskDistribution} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="week" tick={{ fontSize: 10 }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="FAIBLE" name="Faible" stackId="a" fill={COLORS.FAIBLE} />
                  <Bar dataKey="MOYEN" name="Moyen" stackId="a" fill={COLORS.MOYEN} />
                  <Bar dataKey="ELEVE" name="Élevé" stackId="a" fill={COLORS.ELEVE} />
                  <Bar dataKey="SUSPICIEUX" name="Suspicieux" stackId="a" fill={COLORS.SUSPICIEUX} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptySkeleton height={220} />
            )}
          </SectionCard>
        </div>

        <SectionCard title="Décisions IA" subtitle="Répartition des recommandations du modèle">
          {aiFraud?.decisions?.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={aiFraud.decisions.filter(d => d.count > 0)}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="45%"
                  outerRadius={75}
                  label={({ percent }) => (percent ?? 0) > 0.05 ? `${((percent ?? 0) * 100).toFixed(0)}%` : ''}
                  labelLine={false}
                  fontSize={10}
                >
                  {aiFraud.decisions.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptySkeleton height={220} />
          )}
        </SectionCard>
      </div>

      {/* ── Section 7: Géographie ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard
          title="Top villes"
          subtitle="Nombre de sinistres déclarés par ville (Top 15)"
          action={<MapPin className="w-4 h-4 text-gray-400" />}
        >
          {geo?.byCity?.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={geo.byCity} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="city" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={90} />
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" horizontal={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="count" name="Sinistres" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptySkeleton height={260} />
          )}
        </SectionCard>

        <SectionCard
          title="Top régions"
          subtitle="Nombre de sinistres par province/région (Top 12)"
          action={<MapPin className="w-4 h-4 text-gray-400" />}
        >
          {geo?.byProvince?.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={geo.byProvince} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="province" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={100} />
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" horizontal={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="count" name="Sinistres" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptySkeleton height={260} />
          )}
        </SectionCard>
      </div>

      {/* ── Section 8: Heatmap ────────────────────────────────────────────────── */}
      <SectionCard
        title="Heatmap des déclarations"
        subtitle="Intensité des déclarations par jour de la semaine et heure de la journée"
        action={<Calendar className="w-4 h-4 text-gray-400" />}
      >
        {heatmap?.data ? (
          <ClaimsHeatmap data={heatmap.data} maxCount={heatmap.maxCount} />
        ) : (
          <EmptySkeleton height={180} />
        )}
      </SectionCard>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function EmptySkeleton({ height }: { height: number }) {
  return (
    <div
      className="flex items-center justify-center bg-gray-50 rounded-lg animate-pulse"
      style={{ height }}
    >
      <div className="flex flex-col items-center gap-2 text-gray-300">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="text-xs">Chargement…</span>
      </div>
    </div>
  );
}
