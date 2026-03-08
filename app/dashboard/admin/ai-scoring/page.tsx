'use client';

import React from 'react';
import useSWR from 'swr';
import { Brain, RefreshCw, TrendingUp, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useAdminAuth } from '@/app/hooks/useAdminAuth';

export default function AdminAIScoringPage() {
  const { token } = useAdminAuth();

  const { data, isLoading, mutate } = useSWR(
    token ? ['/api/ai-scoring', token] : null,
    ([url, t]: [string, string]) =>
      fetch(url, { headers: { Authorization: `Bearer ${t}` } }).then((r) => {
        if (!r.ok) throw new Error('Erreur');
        return r.json();
      }),
    { refreshInterval: 60_000 }
  );

  const scores: any[] = data?.data ?? data?.scores ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Scoring IA</h2>
          <p className="text-sm text-gray-500 mt-0.5">Analyse de risque automatisée</p>
        </div>
        <button onClick={() => mutate()} className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
          <RefreshCw className="h-4 w-4" /> Actualiser
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { label: 'Risque faible',   icon: CheckCircle,  color: 'bg-green-100 text-green-600',  count: isLoading ? null : scores.filter((s) => s.riskLevel === 'LOW').length },
          { label: 'Risque moyen',    icon: Clock,        color: 'bg-yellow-100 text-yellow-600', count: isLoading ? null : scores.filter((s) => s.riskLevel === 'MEDIUM').length },
          { label: 'Risque élevé',    icon: AlertTriangle, color: 'bg-red-100 text-red-600',     count: isLoading ? null : scores.filter((s) => s.riskLevel === 'HIGH').length },
        ].map((k) => (
          <div key={k.label} className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${k.color}`}>
              <k.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{k.label}</p>
              <p className="text-2xl font-bold text-gray-900">
                {isLoading ? <span className="inline-block h-6 w-8 rounded bg-gray-100 animate-pulse" /> : k.count ?? 0}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-8 text-center">
        <Brain className="h-12 w-12 text-blue-300 mx-auto mb-3" />
        <p className="font-semibold text-gray-700">Module Scoring IA</p>
        <p className="text-sm text-gray-400 mt-1">Les scores de risque sont calculés automatiquement pour chaque dossier.</p>
      </div>
    </div>
  );
}
