'use client';

import React, { useCallback } from 'react';
import { useAdminAuth } from '@/app/hooks/useAdminAuth';
import useSWR from 'swr';
import {
  TrendingUp,
  FileText,
  AlertTriangle,
  DollarSign,
  RefreshCw,
  Loader2,
  TrendingDown,
} from 'lucide-react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────
interface FinanceSummary {
  activePolicies:       number;
  expiredPolicies:      number;
  totalPremiums:        number;
  monthlyPremiums:      number;
  totalClaimsAmount:    number;
  monthlyClaimsAmount:  number;
  lossRatio:            number;
  netResult:            number;
}

interface MonthlyPoint {
  month:    string;
  premiums: number;
  claims:   number;
}

interface PolicyType {
  type:     string;
  premiums: number;
  count:    number;
}

interface LatePayment {
  policyId:     string;
  policyNumber: string;
  policyType:   string;
  premiumAmount: number;
  endDate:      string;
  daysOverdue:  number;
  client: { firstName: string; lastName: string; email: string; phone: string };
}

// ─── Fetcher ──────────────────────────────────────────────────────────────────
const swrFetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Fetch error');
  return (await res.json()).data;
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({
  title, value, sub, icon: Icon, color, trend,
}: {
  title: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color: string;
  trend?: 'up' | 'down';
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {(sub || trend) && (
        <div className="flex items-center gap-1 mt-1">
          {trend === 'up'   && <TrendingUp   className="w-3.5 h-3.5 text-green-500" />}
          {trend === 'down' && <TrendingDown  className="w-3.5 h-3.5 text-red-500" />}
          {sub && <p className="text-xs text-gray-400">{sub}</p>}
        </div>
      )}
    </div>
  );
}

const PIE_COLORS = ['#2563eb', '#7c3aed', '#0891b2', '#059669', '#d97706', '#dc2626', '#9333ea'];

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD', maximumFractionDigits: 0 }).format(n);

// ─── Main page ────────────────────────────────────────────────────────────────
export default function FinancesPage() {
  const { user } = useAdminAuth();

  const { data: summary,   isLoading: sLoading, mutate: rsummary } =
    useSWR<FinanceSummary>('/api/finances/summary',       swrFetcher, { refreshInterval: 60_000 });
  const { data: monthly,   isLoading: mLoading, mutate: rmonthly } =
    useSWR<MonthlyPoint[]>('/api/finances/monthly-chart', swrFetcher, { refreshInterval: 60_000 });
  const { data: byType,    isLoading: tLoading, mutate: rtype } =
    useSWR<PolicyType[]>('/api/finances/by-type',         swrFetcher, { refreshInterval: 60_000 });
  const { data: lateList,  isLoading: lLoading, mutate: rlate } =
    useSWR<LatePayment[]>('/api/finances/late-payments',  swrFetcher, { refreshInterval: 60_000 });

  const refresh = useCallback(() => {
    rsummary(); rmonthly(); rtype(); rlate();
  }, [rsummary, rmonthly, rtype, rlate]);

  if (!user || user.role !== 'SUPER_ADMIN') return null;

  const anyLoading = sLoading || mLoading || tLoading || lLoading;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-600 rounded-xl">
            <DollarSign className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Finances & Primes</h1>
            <p className="text-sm text-gray-500">KPIs financiers, primes encaissées et sinistres payés</p>
          </div>
        </div>
        <button onClick={refresh} disabled={anyLoading}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          <RefreshCw className={`w-4 h-4 ${anyLoading ? 'animate-spin' : ''}`} />
          Rafraîchir
        </button>
      </div>

      {/* KPI grid */}
      {sLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        </div>
      ) : summary ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <KpiCard title="Primes totales"    value={fmt(summary.totalPremiums)}       icon={TrendingUp}  color="bg-emerald-500" />
          <KpiCard title="Primes ce mois"    value={fmt(summary.monthlyPremiums)}     icon={TrendingUp}  color="bg-blue-500" />
          <KpiCard title="Sinistres payés"   value={fmt(summary.totalClaimsAmount)}   icon={TrendingDown} color="bg-red-500" />
          <KpiCard title="Ratio S/P"         value={`${(summary.lossRatio * 100).toFixed(1)}%`}
            sub={summary.lossRatio > 0.8 ? 'Élevé' : 'Normal'}
            icon={AlertTriangle}
            color={summary.lossRatio > 0.8 ? 'bg-red-500' : 'bg-amber-500'}
            trend={summary.lossRatio > 0.8 ? 'up' : undefined} />
          <KpiCard title="Polices actives"   value={summary.activePolicies.toLocaleString('fr-MA')} icon={FileText}  color="bg-indigo-500" />
          <KpiCard title="Polices expirées"  value={summary.expiredPolicies.toLocaleString('fr-MA')} icon={FileText} color="bg-gray-400" />
          <KpiCard title="Résultat net"      value={fmt(summary.netResult)}
            color={summary.netResult >= 0 ? 'bg-emerald-600' : 'bg-red-600'}
            icon={summary.netResult >= 0 ? TrendingUp : TrendingDown}
            trend={summary.netResult >= 0 ? 'up' : 'down'} />
        </div>
      ) : null}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Monthly bar chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Primes vs Sinistres (12 mois)</h2>
          {mLoading ? (
            <div className="flex items-center justify-center h-52">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={monthly ?? []} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={70} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => fmt(Number(v ?? 0))} />
                <Legend />
                <Bar    dataKey="premiums" name="Primes"    fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Line   type="monotone" dataKey="claims" name="Sinistres" stroke="#ef4444" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie chart by type */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Primes par type</h2>
          {tLoading ? (
            <div className="flex items-center justify-center h-52">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={byType ?? []} dataKey="premiums" nameKey="type" cx="50%" cy="50%" outerRadius={70}>
                    {(byType ?? []).map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => fmt(Number(v ?? 0))} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-1">
                {(byType ?? []).slice(0, 5).map((item, i) => (
                  <div key={item.type} className="flex items-center gap-2 text-xs">
                    <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-gray-600 truncate">{item.type}</span>
                    <span className="ml-auto text-gray-400">{item.count}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Late payments */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          Polices expirées récemment (90 jours)
        </h2>
        {lLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          </div>
        ) : (lateList ?? []).length === 0 ? (
          <p className="text-center text-gray-400 py-8">Aucune police expirée récemment</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Numéro</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Client</th>
                  <th className="px-4 py-3 text-left">Prime</th>
                  <th className="px-4 py-3 text-left">Expirée il y a</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(lateList ?? []).map((p) => (
                  <tr key={p.policyId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{p.policyNumber}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">{p.policyType}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-700">{p.client.firstName} {p.client.lastName}</div>
                      <div className="text-xs text-gray-400">{p.client.email}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{fmt(p.premiumAmount)}</td>
                    <td className="px-4 py-3">
                      <span className={`font-medium ${p.daysOverdue > 30 ? 'text-red-600' : 'text-amber-600'}`}>
                        {p.daysOverdue} j
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
