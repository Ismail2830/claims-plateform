'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { TrendingUp, RefreshCw } from 'lucide-react';
import RoleBasedLayout from '@/components/layout/RoleBasedLayout';
import { useAdminAuth } from '@/app/hooks/useAdminAuth';

export default function ManagerJuniorPerformancePage() {
  const router = useRouter();
  const { user, isLoading: authLoading, logout, token } = useAdminAuth();

  const { data, isLoading, mutate } = useSWR(
    token ? ['/api/manager-junior/stats', token] : null,
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

  return (
    <RoleBasedLayout role="MANAGER_JUNIOR" user={user} onLogout={logout}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Performance équipe</h2>
            <p className="text-sm text-gray-500 mt-0.5">Indicateurs de performance de votre équipe</p>
          </div>
          <button onClick={() => mutate()} className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <RefreshCw className="h-4 w-4" /> Actualiser
          </button>
        </div>

        {/* KPI grid */}
        <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
          {[
            { label: 'Dossiers totaux',     value: isLoading ? undefined : stats?.totalClaims },
            { label: 'Approbations',         value: isLoading ? undefined : stats?.pendingApprovals },
            { label: 'Experts actifs',       value: isLoading ? undefined : stats?.activeExperts },
            { label: 'Nouveaux cette semaine', value: isLoading ? undefined : stats?.claimsThisWeek },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm text-center">
              <p className="text-2xl font-bold text-gray-900">
                {kpi.value === undefined ? (
                  <span className="inline-block h-6 w-12 rounded bg-gray-100 animate-pulse" />
                ) : kpi.value}
              </p>
              <p className="text-sm text-gray-500 mt-1">{kpi.label}</p>
            </div>
          ))}
        </div>

        {/* Team roster with stats */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 px-5 py-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-gray-400" />
            <h3 className="font-semibold text-gray-900">Experts — résumé</h3>
          </div>
          {isLoading ? (
            <div className="animate-pulse divide-y divide-gray-50">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  <div className="h-10 w-10 rounded-full bg-gray-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 rounded bg-gray-100" />
                    <div className="h-3 w-48 rounded bg-gray-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Expert</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Dossiers actifs</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Capacité max</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Utilisation</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(stats?.teamStats ?? []).map((expert: {
                  userId: string; firstName: string; lastName: string;
                  activeClaims: number; maxWorkload: number; isActive: boolean;
                }) => {
                  const pct = expert.maxWorkload > 0 ? Math.round((expert.activeClaims / expert.maxWorkload) * 100) : 0;
                  return (
                    <tr key={expert.userId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold shrink-0">
                            {expert.firstName[0]}{expert.lastName[0]}
                          </div>
                          <span className="font-medium text-gray-900">{expert.firstName} {expert.lastName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-600">{expert.activeClaims}</td>
                      <td className="px-5 py-3 text-gray-600">{expert.maxWorkload}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 rounded-full bg-gray-100 overflow-hidden">
                            <div className={`h-full rounded-full ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-orange-400' : 'bg-green-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                          <span className="text-xs text-gray-600">{pct}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${expert.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {expert.isActive ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </RoleBasedLayout>
  );
}
