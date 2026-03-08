'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { BarChart3, RefreshCw } from 'lucide-react';
import RoleBasedLayout from '@/components/layout/RoleBasedLayout';
import { useAdminAuth } from '@/app/hooks/useAdminAuth';

export default function ManagerJuniorWorkloadPage() {
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

  const experts: Array<{
    userId: string; firstName: string; lastName: string;
    activeClaims: number; currentWorkload: number; maxWorkload: number; isActive: boolean;
  }> = data?.data?.teamStats ?? [];

  const totalActive = experts.reduce((s, e) => s + e.activeClaims, 0);
  const totalCapacity = experts.reduce((s, e) => s + e.maxWorkload, 0);
  const overloaded = experts.filter((e) => e.maxWorkload > 0 && e.activeClaims / e.maxWorkload >= 0.9).length;

  return (
    <RoleBasedLayout role="MANAGER_JUNIOR" user={user} onLogout={logout}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Charge de travail</h2>
            <p className="text-sm text-gray-500 mt-0.5">Répartition de la charge par expert</p>
          </div>
          <button onClick={() => mutate()} className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <RefreshCw className="h-4 w-4" /> Actualiser
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Dossiers actifs', value: isLoading ? '—' : String(totalActive) },
            { label: 'Capacité totale', value: isLoading ? '—' : String(totalCapacity) },
            { label: 'Experts surchargés', value: isLoading ? '—' : String(overloaded) },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm text-center">
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-sm text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Per-expert rows */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="animate-pulse divide-y divide-gray-50">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  <div className="h-10 w-10 rounded-full bg-gray-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-28 rounded bg-gray-100" />
                    <div className="h-2 w-full rounded-full bg-gray-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {experts.map((expert) => {
                const pct = expert.maxWorkload > 0 ? Math.round((expert.activeClaims / expert.maxWorkload) * 100) : 0;
                return (
                  <div key={expert.userId} className="flex items-center gap-4 px-5 py-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-bold">
                      {expert.firstName[0]}{expert.lastName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-gray-900">{expert.firstName} {expert.lastName}</p>
                        <p className="text-sm font-semibold text-gray-700">{expert.activeClaims}/{expert.maxWorkload} ({pct}%)</p>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-orange-400' : 'bg-green-500'}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${expert.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {expert.isActive ? 'Actif' : 'Inactif'}
                    </span>
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
