'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { FolderOpen, RefreshCw, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useAdminAuth } from '@/app/hooks/useAdminAuth';

const DOC_STATUS_LABEL: Record<string, string> = {
  PENDING: 'En attente',
  VERIFIED: 'Vérifié',
  REJECTED: 'Rejeté',
};
const DOC_STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  VERIFIED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};

export default function AdminDocumentsPage() {
  const { token } = useAdminAuth();
  const [page, setPage] = useState(1);
  const limit = 20;

  const params = new URLSearchParams({ page: String(page), limit: String(limit) });

  const { data, isLoading, mutate } = useSWR(
    token ? [`/api/documents?${params}`, token] : null,
    ([url, t]: [string, string]) =>
      fetch(url, { headers: { Authorization: `Bearer ${t}` } }).then((r) => {
        if (!r.ok) throw new Error('Erreur');
        return r.json();
      }),
    { refreshInterval: 30_000 }
  );

  const docs: any[] = data?.data?.documents ?? data?.documents ?? [];
  const total: number = data?.data?.total ?? data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Documents</h2>
          <p className="text-sm text-gray-500 mt-0.5">{total} document{total !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => mutate()} className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
          <RefreshCw className="h-4 w-4" /> Actualiser
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
              <th className="px-5 py-3 font-medium">Nom du fichier</th>
              <th className="px-5 py-3 font-medium">Type</th>
              <th className="px-5 py-3 font-medium">Statut</th>
              <th className="px-5 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}><td colSpan={4} className="px-5 py-3"><div className="animate-pulse h-6 rounded bg-gray-100" /></td></tr>
              ))
            ) : docs.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-10 text-center">
                  <FolderOpen className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">Aucun document trouvé</p>
                </td>
              </tr>
            ) : (
              docs.map((d) => (
                <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 text-gray-900 font-medium">{d.fileName ?? d.name ?? '—'}</td>
                  <td className="px-5 py-3 text-gray-500">{d.type ?? d.documentType ?? '—'}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${DOC_STATUS_COLOR[d.status] ?? 'bg-gray-100 text-gray-700'}`}>
                      {DOC_STATUS_LABEL[d.status] ?? d.status ?? '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-500">
                    {d.createdAt ? new Date(d.createdAt).toLocaleDateString('fr-FR') : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Page {page} / {totalPages}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">Précédent</button>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">Suivant</button>
          </div>
        </div>
      )}
    </div>
  );
}
