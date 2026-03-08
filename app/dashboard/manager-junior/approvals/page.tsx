'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { CheckSquare, RefreshCw, ChevronRight } from 'lucide-react';
import RoleBasedLayout from '@/components/layout/RoleBasedLayout';
import { useAdminAuth } from '@/app/hooks/useAdminAuth';

export default function ManagerJuniorApprovalsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, logout, token } = useAdminAuth();

  const { data, isLoading, mutate } = useSWR(
    token ? [`/api/manager-junior/claims?status=IN_DECISION&limit=50`, token] : null,
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
    <RoleBasedLayout role="MANAGER_JUNIOR" user={user} onLogout={logout}>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Approbations</h2>
            <p className="text-sm text-gray-500 mt-0.5">Dossiers en attente de décision dans votre équipe</p>
          </div>
          <button onClick={() => mutate()} className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <RefreshCw className="h-4 w-4" /> Actualiser
          </button>
        </div>

        {isLoading ? (
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
            <CheckSquare className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">Aucune approbation en attente</p>
            <p className="text-sm text-gray-400 mt-1">Tous les dossiers ont été traités</p>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">N° Dossier</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Client</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Type</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Expert</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Priorité</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Montant estimé</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {claims.map((c: {
                  claimId: string; claimNumber: string; claimType: string;
                  priority: string; estimatedAmount: string | null;
                  client?: { firstName: string; lastName: string };
                  assignedUser?: { firstName: string; lastName: string };
                }) => (
                  <tr key={c.claimId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-900">#{c.claimNumber}</td>
                    <td className="px-5 py-3 text-gray-600">{c.client?.firstName} {c.client?.lastName}</td>
                    <td className="px-5 py-3 text-gray-600">{c.claimType}</td>
                    <td className="px-5 py-3 text-gray-600">{c.assignedUser?.firstName ?? '—'} {c.assignedUser?.lastName ?? ''}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        c.priority === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                        c.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>{c.priority}</span>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{c.estimatedAmount ? `${parseFloat(c.estimatedAmount).toLocaleString('fr-MA')} MAD` : '—'}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <button className="rounded-md bg-green-50 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-100 transition-colors">
                          Approuver
                        </button>
                        <button className="rounded-md bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors">
                          Refuser
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </RoleBasedLayout>
  );
}
