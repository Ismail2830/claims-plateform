'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { AlertTriangle, RefreshCw, ChevronRight } from 'lucide-react';
import RoleBasedLayout from '@/components/layout/RoleBasedLayout';
import { useAdminAuth } from '@/app/hooks/useAdminAuth';

export default function ManagerSeniorEscalatedPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, logout, token } = useAdminAuth();

  const { data, isLoading, mutate } = useSWR(
    token ? [`/api/manager-senior/claims?status=UNDER_EXPERTISE&limit=50`, token] : null,
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

  const allClaims = data?.data ?? [];
  // Filter HIGH/CRITICAL priority for "escalated" view
  const claims = allClaims.filter((c: { priority: string }) =>
    ['HIGH', 'CRITICAL'].includes(c.priority)
  );

  return (
    <RoleBasedLayout role="MANAGER_SENIOR" user={user} onLogout={logout}>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Cas escaladés</h2>
            <p className="text-sm text-gray-500 mt-0.5">Dossiers urgents nécessitant une attention immédiate</p>
          </div>
          <button onClick={() => mutate()} className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <RefreshCw className="h-4 w-4" /> Actualiser
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 animate-pulse flex gap-4">
                <div className="h-10 w-10 rounded-lg bg-gray-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 rounded bg-gray-100" />
                  <div className="h-3 w-48 rounded bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        ) : claims.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white py-16 text-center">
            <AlertTriangle className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">Aucun cas escaladé</p>
          </div>
        ) : (
          <div className="space-y-3">
            {claims.map((c: {
              claimId: string; claimNumber: string; claimType: string;
              status: string; priority: string; estimatedAmount: string | null;
              client?: { firstName: string; lastName: string };
              assignedUser?: { firstName: string; lastName: string };
            }) => (
              <div key={c.claimId} className="flex items-center gap-4 rounded-xl border border-red-100 bg-red-50 p-5 cursor-pointer hover:border-red-200 transition-all" onClick={() => router.push('/dashboard/manager-senior/claims')}>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">#{c.claimNumber}</p>
                  <p className="text-sm text-gray-500 truncate">
                    {c.client?.firstName} {c.client?.lastName} · {c.claimType}
                    {c.assignedUser && ` · Expert: ${c.assignedUser.firstName}`}
                  </p>
                </div>
                <div className="text-right shrink-0 space-y-1">
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${c.priority === 'CRITICAL' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>{c.priority}</span>
                  {c.estimatedAmount && <p className="text-xs text-gray-500">{parseFloat(c.estimatedAmount).toLocaleString('fr-MA')} MAD</p>}
                </div>
                <ChevronRight className="h-4 w-4 text-gray-300 shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>
    </RoleBasedLayout>
  );
}
