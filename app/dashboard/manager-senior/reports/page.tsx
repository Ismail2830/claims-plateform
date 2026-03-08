'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { BarChart2, Download, RefreshCw, FileText, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import RoleBasedLayout from '@/components/layout/RoleBasedLayout';
import { useAdminAuth } from '@/app/hooks/useAdminAuth';

export default function ManagerSeniorReportsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, logout, token } = useAdminAuth();

  const { data, isLoading } = useSWR(
    token ? ['/api/manager-senior/stats', token] : null,
    ([url, t]: [string, string]) =>
      fetch(url, { headers: { Authorization: `Bearer ${t}` } }).then((r) => {
        if (!r.ok) throw new Error('Erreur');
        return r.json();
      }),
    { refreshInterval: 60_000 }
  );

  React.useEffect(() => {
    if (!authLoading && !user) router.push('/auth/admin?reason=session_expired');
  }, [authLoading, user, router]);

  if (authLoading || !user) return null;

  const stats = data?.data;
  const breakdown: Array<{ status: string; count: number }> = stats?.statusBreakdown ?? [];

  const reportCards = [
    { title: 'Rapport mensuel', desc: 'Synthèse des sinistres du mois en cours', icon: BarChart2, color: 'bg-blue-100 text-blue-600' },
    { title: 'Rapport hebdomadaire', desc: 'Activité des 7 derniers jours', icon: TrendingUp, color: 'bg-green-100 text-green-600' },
    { title: 'Cas escaladés', desc: 'Rapport des dossiers HIGH / CRITICAL', icon: AlertTriangle, color: 'bg-red-100 text-red-600' },
    { title: 'Approbations', desc: 'Décisions prises ce mois', icon: CheckCircle, color: 'bg-orange-100 text-orange-600' },
    { title: 'Performance équipe', desc: 'Productivité et délais de traitement', icon: FileText, color: 'bg-purple-100 text-purple-600' },
  ];

  return (
    <RoleBasedLayout role="MANAGER_SENIOR" user={user} onLogout={logout}>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Rapports</h2>
          <p className="text-sm text-gray-500 mt-0.5">Générez et consultez les rapports d&apos;activité</p>
        </div>

        {/* Report cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reportCards.map((r) => (
            <div key={r.title} className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${r.color}`}>
                <r.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{r.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{r.desc}</p>
              </div>
              <button className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors shrink-0">
                <Download className="h-3.5 w-3.5" /> PDF
              </button>
            </div>
          ))}
        </div>

        {/* Status breakdown summary */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Répartition globale des sinistres</h3>
            <span className="text-xs text-gray-400">Mis à jour automatiquement</span>
          </div>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-3">
                  <div className="h-4 w-28 rounded bg-gray-100" />
                  <div className="flex-1 h-3 rounded-full bg-gray-100" />
                  <div className="h-4 w-8 rounded bg-gray-100" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {breakdown.map((item) => {
                const total = Math.max(stats?.totalClaims ?? 1, 1);
                const pct = Math.round((item.count / total) * 100);
                return (
                  <div key={item.status} className="flex items-center gap-3">
                    <span className="w-36 shrink-0 text-sm text-gray-600">{item.status}</span>
                    <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <span className="w-10 text-right text-sm font-medium text-gray-700">{item.count}</span>
                  </div>
                );
              })}
              {breakdown.length === 0 && (
                <p className="text-sm text-gray-400 py-4 text-center">Aucune donnée disponible</p>
              )}
            </div>
          )}
        </div>
      </div>
    </RoleBasedLayout>
  );
}
