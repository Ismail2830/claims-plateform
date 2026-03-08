'use client';

import React from 'react';
import useSWR from 'swr';
import { BarChart2, Download, FileBarChart, TrendingUp, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { useAdminAuth } from '@/app/hooks/useAdminAuth';

export default function AdminReportsPage() {
  const { token } = useAdminAuth();

  const { data, isLoading } = useSWR(
    token ? ['/api/admin/stats', token] : null,
    ([url, t]: [string, string]) =>
      fetch(url, { headers: { Authorization: `Bearer ${t}` } }).then((r) => {
        if (!r.ok) throw new Error('Erreur');
        return r.json();
      }),
    { refreshInterval: 60_000 }
  );

  const stats = data?.data;

  const cards = [
    { title: 'Rapport mensuel',     desc: 'Synthèse des sinistres du mois',    icon: BarChart2,    color: 'bg-blue-100 text-blue-600' },
    { title: 'Rapport hebdomadaire', desc: 'Activité des 7 derniers jours',     icon: TrendingUp,   color: 'bg-green-100 text-green-600' },
    { title: 'Cas escaladés',        desc: 'Dossiers HIGH / CRITICAL',          icon: AlertTriangle, color: 'bg-red-100 text-red-600' },
    { title: 'Approbations',         desc: 'Décisions prises ce mois',          icon: CheckCircle,  color: 'bg-orange-100 text-orange-600' },
    { title: 'Rapport utilisateurs', desc: 'Activité et rôles',                 icon: FileBarChart, color: 'bg-purple-100 text-purple-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Rapports</h2>
        <p className="text-sm text-gray-500 mt-0.5">Générez et consultez les rapports d&apos;activité</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Total sinistres', value: stats?.totalClaims, color: 'bg-blue-100 text-blue-600' },
          { label: 'Nouveaux ce mois', value: stats?.newClaimsThisMonth, color: 'bg-green-100 text-green-600' },
          { label: 'En attente', value: stats?.pendingClaims, color: 'bg-orange-100 text-orange-600' },
          { label: 'Résolus', value: stats?.resolvedClaims, color: 'bg-teal-100 text-teal-600' },
        ].map((k) => (
          <div key={k.label} className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm`}>
            <p className="text-xs text-gray-500">{k.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {isLoading ? <span className="inline-block h-6 w-12 rounded bg-gray-100 animate-pulse" /> : k.value ?? 0}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.title} className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${c.color}`}>
              <c.icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{c.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{c.desc}</p>
            </div>
            <button className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors shrink-0">
              <Download className="h-3.5 w-3.5" /> PDF
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
