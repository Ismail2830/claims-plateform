'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { FileText, Search, RefreshCw } from 'lucide-react';
import { useAdminAuth } from '@/app/hooks/useAdminAuth';

const STATUS_LABEL: Record<string, string> = {
  SUBMITTED: 'Soumis',
  UNDER_REVIEW: 'En examen',
  UNDER_EXPERTISE: 'En expertise',
  IN_DECISION: 'En décision',
  RESOLVED: 'Résolu',
  REJECTED: 'Rejeté',
  CANCELLED: 'Annulé',
  CLOSED: 'Clôturé',
};

const STATUS_COLOR: Record<string, string> = {
  SUBMITTED: 'bg-blue-100 text-blue-700',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-700',
  UNDER_EXPERTISE: 'bg-purple-100 text-purple-700',
  IN_DECISION: 'bg-orange-100 text-orange-700',
  RESOLVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-700',
  CLOSED: 'bg-gray-100 text-gray-500',
};

const PRIORITY_COLOR: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-600',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
};

export default function AdminClaimsPage() {
  const { token } = useAdminAuth();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    ...(search && { search }),
    ...(status && { status }),
  });

  const { data, isLoading, mutate } = useSWR(
    token ? [`/api/manager-senior/claims?${params}`, token] : null,
    ([url, t]: [string, string]) =>
      fetch(url, { headers: { Authorization: `Bearer ${t}` } }).then((r) => {
        if (!r.ok) throw new Error('Erreur');
        return r.json();
      }),
    { refreshInterval: 30_000 }
  );

  const claims: any[] = data?.data?.claims ?? [];
  const total: number = data?.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Sinistres</h2>
          <p className="text-sm text-gray-500 mt-0.5">{total} dossier{total !== 1 ? 's' : ''} au total</p>
        </div>
        <button onClick={() => mutate()} className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
          <RefreshCw className="h-4 w-4" /> Actualiser
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Rechercher par numéro ou assuré…"
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
        >
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
              <th className="px-5 py-3 font-medium">N° dossier</th>
              <th className="px-5 py-3 font-medium">Statut</th>
              <th className="px-5 py-3 font-medium">Priorité</th>
              <th className="px-5 py-3 font-medium">Expert assigné</th>
              <th className="px-5 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={5} className="px-5 py-3">
                    <div className="animate-pulse h-6 rounded bg-gray-100" />
                  </td>
                </tr>
              ))
            ) : claims.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center">
                  <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">Aucun sinistre trouvé</p>
                </td>
              </tr>
            ) : (
              claims.map((c) => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-mono text-blue-600">{c.claimNumber}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[c.status] ?? 'bg-gray-100 text-gray-700'}`}>
                      {STATUS_LABEL[c.status] ?? c.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_COLOR[c.priority] ?? 'bg-gray-100 text-gray-600'}`}>
                      {c.priority}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {c.assignedUser ? `${c.assignedUser.firstName} ${c.assignedUser.lastName}` : '—'}
                  </td>
                  <td className="px-5 py-3 text-gray-500">{new Date(c.createdAt).toLocaleDateString('fr-FR')}</td>
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
