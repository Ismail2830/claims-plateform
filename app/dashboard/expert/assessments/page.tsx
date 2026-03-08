'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardCheck, ChevronRight, RefreshCw, PlusCircle } from 'lucide-react';
import RoleBasedLayout from '@/components/layout/RoleBasedLayout';
import { useAdminAuth } from '@/app/hooks/useAdminAuth';
import useSWR from 'swr';

export default function ExpertAssessmentsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, logout, token } = useAdminAuth();

  const { data, isLoading, error, mutate } = useSWR(
    token ? [`/api/expert/claims?limit=50&status=UNDER_EXPERTISE`, token] : null,
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

  const claims = data?.data ?? [];

  return (
    <RoleBasedLayout role="EXPERT" user={user} onLogout={logout}>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Évaluations</h2>
            <p className="text-sm text-gray-500 mt-0.5">Dossiers en cours d&apos;expertise assignés à vous</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => mutate()} className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              <RefreshCw className="h-4 w-4" /> Actualiser
            </button>
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Impossible de charger les évaluations.
          </div>
        ) : isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
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
            <ClipboardCheck className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">Aucun dossier en cours d&apos;expertise</p>
            <p className="text-sm text-gray-400 mt-1">Les dossiers avec le statut &quot;En expertise&quot; apparaîtront ici</p>
          </div>
        ) : (
          <div className="space-y-3">
            {claims.map((c: {
              claimId: string; claimNumber: string; claimType: string;
              priority: string; updatedAt: string;
              client?: { firstName: string; lastName: string };
              _count?: { documents: number };
            }) => (
              <div
                key={c.claimId}
                className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm cursor-pointer hover:border-blue-200 hover:shadow-md transition-all"
                onClick={() => router.push('/dashboard/expert/claims')}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                  <ClipboardCheck className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">Dossier #{c.claimNumber}</p>
                  <p className="text-sm text-gray-500 truncate">
                    {c.client?.firstName} {c.client?.lastName} · {c.claimType}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    c.priority === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                    c.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>{c.priority}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(c.updatedAt).toLocaleDateString('fr-MA')}</p>
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
