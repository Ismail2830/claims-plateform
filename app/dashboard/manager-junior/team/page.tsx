'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Users, RefreshCw, BarChart3 } from 'lucide-react';
import RoleBasedLayout from '@/components/layout/RoleBasedLayout';
import { useAdminAuth } from '@/app/hooks/useAdminAuth';

export default function ManagerJuniorTeamPage() {
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
    isActive: boolean; activeClaims: number; currentWorkload: number; maxWorkload: number;
  }> = data?.data?.teamStats ?? [];

  return (
    <RoleBasedLayout role="MANAGER_JUNIOR" user={user} onLogout={logout}>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Mon équipe</h2>
            <p className="text-sm text-gray-500 mt-0.5">Experts de votre équipe</p>
          </div>
          <button onClick={() => mutate()} className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <RefreshCw className="h-4 w-4" /> Actualiser
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 animate-pulse space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-gray-100" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-4 w-28 rounded bg-gray-100" />
                    <div className="h-3 w-16 rounded bg-gray-100" />
                  </div>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100" />
              </div>
            ))}
          </div>
        ) : experts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white py-16 text-center">
            <Users className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">Aucun expert dans votre équipe</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {experts.map((expert) => {
              const pct = expert.maxWorkload > 0 ? Math.round((expert.activeClaims / expert.maxWorkload) * 100) : 0;
              return (
                <div key={expert.userId} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-bold">
                      {expert.firstName[0]}{expert.lastName[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{expert.firstName} {expert.lastName}</p>
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${expert.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {expert.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-gray-500">{expert.activeClaims} dossiers actifs / {expert.maxWorkload}</p>
                      <p className="text-xs font-semibold text-gray-700">{pct}%</p>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-orange-400' : 'bg-green-500'}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <BarChart3 className="h-3.5 w-3.5" />
                    Charge actuelle: <span className="font-medium text-gray-700">{expert.currentWorkload}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </RoleBasedLayout>
  );
}
