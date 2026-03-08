'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { FolderOpen, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import RoleBasedLayout from '@/components/layout/RoleBasedLayout';
import { useAdminAuth } from '@/app/hooks/useAdminAuth';
import useSWR from 'swr';

export default function ExpertDocumentsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, logout, token } = useAdminAuth();

  // Fetch documents pending verification on claims assigned to this expert
  const { data, isLoading, error, mutate } = useSWR(
    token ? [`/api/expert/documents`, token] : null,
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

  const documents = Array.isArray(data?.data) ? data.data : [];

  return (
    <RoleBasedLayout role="EXPERT" user={user} onLogout={logout}>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Documents à vérifier</h2>
            <p className="text-sm text-gray-500 mt-0.5">Documents en attente de vérification sur vos dossiers</p>
          </div>
          <button onClick={() => mutate()} className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <RefreshCw className="h-4 w-4" /> Actualiser
          </button>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Impossible de charger les documents.
          </div>
        ) : isLoading ? (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="animate-pulse divide-y divide-gray-50">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  <div className="h-8 w-8 rounded-lg bg-gray-100" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 w-40 rounded bg-gray-100" />
                    <div className="h-3 w-24 rounded bg-gray-100" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white py-16 text-center">
            <FolderOpen className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">Aucun document en attente</p>
            <p className="text-sm text-gray-400 mt-1">Tous les documents de vos dossiers sont traités</p>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Document</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Dossier</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Type</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Statut</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Téléchargé le</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {documents.map((doc: {
                  documentId: string; fileName: string; documentType: string;
                  status: string; createdAt: string;
                  claim?: { claimNumber: string };
                }) => (
                  <tr key={doc.documentId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-900 max-w-xs truncate">{doc.fileName}</td>
                    <td className="px-5 py-3 text-gray-600">#{doc.claim?.claimNumber ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-600">{doc.documentType}</td>
                    <td className="px-5 py-3">
                      <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">{doc.status}</span>
                    </td>
                    <td className="px-5 py-3 text-gray-400">{new Date(doc.createdAt).toLocaleDateString('fr-MA')}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          title="Approuver"
                          className="flex items-center gap-1 rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-100 transition-colors"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Vérifier
                        </button>
                        <button
                          title="Rejeter"
                          className="flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors"
                        >
                          <XCircle className="h-3.5 w-3.5" /> Rejeter
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
