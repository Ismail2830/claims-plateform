'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { Shield, Search, RefreshCw } from 'lucide-react';
import { useAdminAuth } from '@/app/hooks/useAdminAuth';

export default function AdminPoliciesPage() {
  const { token } = useAdminAuth();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const params = new URLSearchParams({ page: String(page), limit: String(limit), ...(search && { search }) });

  const { data, isLoading, mutate } = useSWR(
    token ? [`/api/super-admin/policies?${params}`, token] : null,
    ([url, t]: [string, string]) =>
      fetch(url, { headers: { Authorization: `Bearer ${t}` } }).then((r) => {
        if (!r.ok) throw new Error('Erreur');
        return r.json();
      }),
    { refreshInterval: 30_000 }
  );

  const policies: any[] = data?.data?.policies ?? data?.policies ?? [];
  const total: number = data?.data?.pagination?.total ?? data?.pagination?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Polices</h2>
          <p className="text-sm text-gray-500 mt-0.5">{total} police{total !== 1 ? 's' : ''} d&apos;assurance</p>
        </div>
        <button onClick={() => mutate()} className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
          <RefreshCw className="h-4 w-4" /> Actualiser
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Rechercher une police…"
          className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
              <th className="px-5 py-3 font-medium">N° police</th>
              <th className="px-5 py-3 font-medium">Type</th>
              <th className="px-5 py-3 font-medium">Assuré</th>
              <th className="px-5 py-3 font-medium">Statut</th>
              <th className="px-5 py-3 font-medium">Créée</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}><td colSpan={5} className="px-5 py-3"><div className="animate-pulse h-6 rounded bg-gray-100" /></td></tr>
              ))
            ) : policies.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center">
                  <Shield className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">Aucune police trouvée</p>
                </td>
              </tr>
            ) : (
              policies.map((p) => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-mono text-blue-600">{p.policyNumber ?? p.id}</td>
                  <td className="px-5 py-3 text-gray-600">{p.type ?? '—'}</td>
                  <td className="px-5 py-3 text-gray-700">
                    {p.holder ? `${p.holder.firstName} ${p.holder.lastName}` : p.holderName ?? '—'}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {p.status ?? '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-500">
                    {p.createdAt ? new Date(p.createdAt).toLocaleDateString('fr-FR') : '—'}
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
