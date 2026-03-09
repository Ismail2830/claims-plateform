'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAdminAuth } from '@/app/hooks/useAdminAuth';
import useSWR from 'swr';
import {
  Activity,
  Database,
  Cpu,
  MemoryStick,
  Users,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Loader2,
  Clock,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────
interface HealthData {
  status: string;
  uptimeDays: number;
  uptimeHours: number;
  database: { status: string; totalClaims: number; totalUsers: number; totalDocuments: number };
  memory: { percent: number; usedMB: number; totalMB: number };
  cpu: { percent: number | null };
  activeSessions: number;
}

interface MetricBucket {
  hour: string;
  claims: number;
  documents: number;
}

interface CronJob {
  name: string;
  schedule: string;
  status: 'ok' | 'warning' | 'error';
  description: string;
}

// ─── Fetcher ──────────────────────────────────────────────────────────────────
const swrFetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Fetch error');
  return (await res.json()).data;
};

// ─── Health card ──────────────────────────────────────────────────────────────
function HealthCard({
  title, value, sub, icon: Icon, color,
}: {
  title: string;
  value: React.ReactNode;
  sub?: string;
  icon: React.ElementType;
  color: string;
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
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { icon: React.ElementType; cls: string; label: string }> = {
    ok:      { icon: CheckCircle,   cls: 'text-green-600 bg-green-50',  label: 'OK' },
    warning: { icon: AlertTriangle, cls: 'text-amber-600 bg-amber-50',  label: 'Avertissement' },
    error:   { icon: XCircle,       cls: 'text-red-600   bg-red-50',    label: 'Erreur' },
    healthy: { icon: CheckCircle,   cls: 'text-green-600 bg-green-50',  label: 'Sain' },
  };
  const { icon: Icon, cls, label } = map[status] ?? map.ok;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cls}`}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </span>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function MonitoringPage() {
  const { user } = useAdminAuth();

  const { data: health, isLoading: hLoading, mutate: refetchHealth } =
    useSWR<HealthData>('/api/monitoring/health', swrFetcher, { refreshInterval: 30_000 });

  const { data: metrics, isLoading: mLoading, mutate: refetchMetrics } =
    useSWR<MetricBucket[]>('/api/monitoring/metrics', swrFetcher, { refreshInterval: 60_000 });

  const { data: cronJobs, isLoading: cLoading } =
    useSWR<CronJob[]>('/api/monitoring/cron-jobs', swrFetcher);

  const refresh = useCallback(() => {
    refetchHealth();
    refetchMetrics();
  }, [refetchHealth, refetchMetrics]);

  if (!user || user.role !== 'SUPER_ADMIN') return null;

  const anyLoading = hLoading || mLoading;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 rounded-xl">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Monitoring</h1>
            <p className="text-sm text-gray-500">Santé système, performances et tâches planifiées</p>
          </div>
        </div>
        <button onClick={refresh} disabled={anyLoading}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          <RefreshCw className={`w-4 h-4 ${anyLoading ? 'animate-spin' : ''}`} />
          Rafraîchir
        </button>
      </div>

      {/* KPI cards */}
      {hLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : health ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <HealthCard
              title="Statut"
              value={<StatusBadge status={health.status} />}
              sub={`Uptime ${health.uptimeDays}j ${health.uptimeHours}h`}
              icon={Activity}
              color="bg-green-500"
            />
            <HealthCard
              title="Mémoire"
              value={`${health.memory.percent}%`}
              sub={`${health.memory.usedMB} MB / ${health.memory.totalMB} MB`}
              icon={MemoryStick}
              color={health.memory.percent > 80 ? 'bg-red-500' : 'bg-blue-500'}
            />
            <HealthCard
              title="CPU"
              value={health.cpu.percent !== null ? `${health.cpu.percent}%` : 'N/A'}
              icon={Cpu}
              color="bg-purple-500"
            />
            <HealthCard
              title="Sessions actives"
              value={health.activeSessions}
              icon={Users}
              color="bg-indigo-500"
            />
          </div>

          {/* DB stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Total sinistres',  value: health.database.totalClaims },
              { label: 'Utilisateurs',     value: health.database.totalUsers },
              { label: 'Documents',        value: health.database.totalDocuments },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
                <Database className="w-5 h-5 text-blue-400 shrink-0" />
                <div>
                  <p className="text-xl font-bold text-gray-900">{value.toLocaleString('fr-MA')}</p>
                  <p className="text-xs text-gray-400">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {/* 24h metrics chart */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Activité des dernières 24 heures</h2>
        {mLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={metrics ?? []} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="claims"    name="Sinistres"  stroke="#2563eb" fill="#dbeafe" strokeWidth={2} />
              <Area type="monotone" dataKey="documents" name="Documents"  stroke="#7c3aed" fill="#ede9fe" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Cron jobs */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400" />
          Tâches planifiées
        </h2>
        {cLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {(cronJobs ?? []).map((job) => (
              <div key={job.name} className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">{job.description}</p>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">{job.name} · {job.schedule}</p>
                </div>
                <StatusBadge status={job.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
