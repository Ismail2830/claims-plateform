'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { TrendingUp, RefreshCw, FileText, CheckSquare, AlertTriangle, Users } from 'lucide-react';
import RoleBasedLayout from '@/components/layout/RoleBasedLayout';
import { useAdminAuth } from '@/app/hooks/useAdminAuth';

export default function ManagerSeniorPerformancePage() {
  const router = useRouter();
  const { user, isLoading: authLoading, logout, token } = useAdminAuth();

  const { data, isLoading, mutate } = useSWR(
    token ? ['/api/manager-senior/stats', token] : null,
    ([url, t]: [string, string]) =>
      fetch(url, { headers: { Authorization: `Bearer ${t}` } }).then((r) => {
        if (!r.ok) throw new Error('Erreur');
        return r.json();
      }),
    { refreshInterval: 30_000 }
  );

  React.useEffect(() => {
    if (!authLoading && !user) router.push('/auth/admin?reason=session_expired');
  }, [authLoading, user, router]);

  if (authLoading || !user) return null;

  const stats = data?.data;
  const breakdown: Array<{ status: string; count: number }> = stats?.statusBreakdown ?? [];

  return (
    <RoleBasedLayout role="MANAGER_SENIOR" user={user} onLogout={logout}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Performance</h2>
            <p className="text-sm text-gray-500 mt-0.5">Vue globale de l&apos;activité</p>
          </div>
          <button onClick={() => mutate()} className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <RefreshCw className="h-4 w-4" /> Actualiser
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: 'Total sinistres',    value: stats?.totalClaims,       icon: FileText,       color: 'bg-blue-100 text-blue-600' },
            { label: 'En décision',         value: stats?.pendingApprovals,  icon: CheckSquare,    color: 'bg-orange-100 text-orange-600' },
            { label: 'Cas escaladés',       value: stats?.escalatedClaims,   icon: AlertTriangle,  color: 'bg-red-100 text-red-600' },
            { label: 'Approuvés ce mois',   value: stats?.approvedThisMonth, icon: TrendingUp,     color: 'bg-green-100 text-green-600' },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm flex items-center gap-4">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${kpi.color}`}>
                <kpi.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{kpi.label}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoading ? <span className="inline-block h-6 w-10 rounded bg-gray-100 animate-pulse" /> : kpi.value ?? 0}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Status breakdown */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Répartition par statut</h3>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
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
                const total = stats?.totalClaims ?? 1;
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
            </div>
          )}
        </div>
      </div>
    </RoleBasedLayout>
  );
}
