'use client';

import React from 'react';
import useSWR from 'swr';
import { BarChart3, RefreshCw, TrendingUp, Users, FileText, CheckCircle } from 'lucide-react';
import { useAdminAuth } from '@/app/hooks/useAdminAuth';

export default function AdminAnalyticsPage() {
  const { token } = useAdminAuth();

  const { data, isLoading, mutate } = useSWR(
    token ? ['/api/admin/stats', token] : null,
    ([url, t]: [string, string]) =>
      fetch(url, { headers: { Authorization: `Bearer ${t}` } }).then((r) => {
        if (!r.ok) throw new Error('Erreur');
        return r.json();
      }),
    { refreshInterval: 60_000 }
  );

  const stats = data?.data;

  const kpis = [
    { label: 'Utilisateurs actifs',  value: stats?.activeUsers,         icon: Users,       color: 'bg-blue-100 text-blue-600' },
    { label: 'Sinistres ce mois',    value: stats?.newClaimsThisMonth,  icon: TrendingUp,  color: 'bg-green-100 text-green-600' },
    { label: 'Total sinistres',      value: stats?.totalClaims,         icon: FileText,    color: 'bg-purple-100 text-purple-600' },
    { label: 'Résolu total',         value: stats?.resolvedClaims,      icon: CheckCircle, color: 'bg-teal-100 text-teal-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Dashboards & Analytics</h2>
          <p className="text-sm text-gray-500 mt-0.5">Vue d&apos;ensemble des indicateurs clés</p>
        </div>
        <button onClick={() => mutate()} className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
          <RefreshCw className="h-4 w-4" /> Actualiser
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${k.color}`}>
              <k.icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{k.label}</p>
              <p className="text-2xl font-bold text-gray-900">
                {isLoading ? <span className="inline-block h-6 w-10 rounded bg-gray-100 animate-pulse" /> : k.value ?? 0}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-8 text-center">
        <BarChart3 className="h-12 w-12 text-blue-300 mx-auto mb-3" />
        <p className="font-semibold text-gray-700">Visualisations avancées</p>
        <p className="text-sm text-gray-400 mt-1">Les graphiques d&apos;analyse approfondie seront disponibles prochainement.</p>
      </div>
    </div>
  );
}
