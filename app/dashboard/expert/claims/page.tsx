'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { ChevronRight, Filter, RefreshCw, Search } from 'lucide-react';
import RoleBasedLayout from '@/components/layout/RoleBasedLayout';
import { useAdminAuth } from '@/app/hooks/useAdminAuth';

const STATUS_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'DECLARED',        label: 'Déclaré' },
  { value: 'ANALYZING',       label: 'En analyse' },
  { value: 'DOCS_REQUIRED',   label: 'Docs requis' },
  { value: 'UNDER_EXPERTISE', label: 'En expertise' },
  { value: 'IN_DECISION',     label: 'En décision' },
  { value: 'APPROVED',        label: 'Approuvé' },
  { value: 'CLOSED',          label: 'Clôturé' },
  { value: 'REJECTED',        label: 'Rejeté' },
];

const STATUS_COLORS: Record<string, string> = {
  DECLARED: 'bg-gray-100 text-gray-700', ANALYZING: 'bg-blue-100 text-blue-700',
  DOCS_REQUIRED: 'bg-yellow-100 text-yellow-700', UNDER_EXPERTISE: 'bg-purple-100 text-purple-700',
  IN_DECISION: 'bg-orange-100 text-orange-700', APPROVED: 'bg-green-100 text-green-700',
  IN_PAYMENT: 'bg-teal-100 text-teal-700', CLOSED: 'bg-gray-200 text-gray-600',
  REJECTED: 'bg-red-100 text-red-700',
};
const STATUS_LABELS: Record<string, string> = {
  DECLARED: 'Déclaré', ANALYZING: 'En analyse', DOCS_REQUIRED: 'Docs manquants',
  UNDER_EXPERTISE: 'En instruction', IN_DECISION: 'En décision',
  APPROVED: 'Approuvé', IN_PAYMENT: 'En paiement', CLOSED: 'Clôturé', REJECTED: 'Rejeté',
};
const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-600', NORMAL: 'bg-gray-100 text-gray-600',
  MEDIUM: 'bg-blue-100 text-blue-700', HIGH: 'bg-orange-100 text-orange-700', CRITICAL: 'bg-red-100 text-red-700',
};
const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Faible', NORMAL: 'Normal', MEDIUM: 'Moyen', HIGH: 'Élevé', CRITICAL: 'Critique',
};
const CLAIM_TYPE_LABELS: Record<string, string> = {
  ACCIDENT: 'Accident', THEFT: 'Vol', FIRE: 'Incendie', WATER_DAMAGE: 'Dégât des eaux',
};

export default function ExpertClaimsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, logout, token } = useAdminAuth();
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const apiUrl = token
    ? `/api/expert/claims?page=${page}&limit=20${statusFilter ? `&status=${statusFilter}` : ''}`
    : null;

  const { data, isLoading, error, mutate } = useSWR(
    apiUrl ? [apiUrl, token] : null,
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
  const meta   = data?.meta ?? { total: 0, pages: 1 };

  return (
    <RoleBasedLayout role="EXPERT" user={user} onLogout={logout}>
      <div className="space-y-5">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-48 flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
            <Search className="h-4 w-4 text-gray-400 shrink-0" />
            <input placeholder="Rechercher un dossier…" className="flex-1 text-sm outline-none bg-transparent text-gray-700 placeholder:text-gray-400" />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <button onClick={() => mutate()} className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <RefreshCw className="h-4 w-4" /> Actualiser
          </button>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {error ? (
            <div className="p-8 text-center text-sm text-red-600">Erreur de chargement. Veuillez réessayer.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">N° Dossier</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Client</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Type</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Statut</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Priorité</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Docs</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Mis à jour</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        {Array.from({ length: 7 }).map((__, j) => (
                          <td key={j} className="px-5 py-3"><div className="h-4 w-20 rounded bg-gray-100" /></td>
                        ))}
                        <td className="px-5 py-3" />
                      </tr>
                    ))
                  : claims.map((c: {
                      claimId: string; claimNumber: string; claimType: string;
                      status: string; priority: string; updatedAt: string;
                      client?: { firstName: string; lastName: string };
                      _count?: { documents: number };
                    }) => (
                      <tr key={c.claimId} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => router.push(`/dashboard/expert/claims/${c.claimId}`)}>
                        <td className="px-5 py-3 font-medium text-gray-900">#{c.claimNumber}</td>
                        <td className="px-5 py-3 text-gray-600">{c.client?.firstName} {c.client?.lastName}</td>
                        <td className="px-5 py-3 text-gray-600">{CLAIM_TYPE_LABELS[c.claimType] ?? c.claimType}</td>
                        <td className="px-5 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[c.status] ?? 'bg-gray-100 text-gray-600'}`}>{STATUS_LABELS[c.status] ?? c.status}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_COLORS[c.priority] ?? 'bg-gray-100 text-gray-600'}`}>{PRIORITY_LABELS[c.priority] ?? c.priority}</span>
                        </td>
                        <td className="px-5 py-3 text-gray-600">{c._count?.documents ?? 0}</td>
                        <td className="px-5 py-3 text-gray-400">{new Date(c.updatedAt).toLocaleDateString('fr-MA')}</td>
                        <td className="px-5 py-3"><ChevronRight className="h-4 w-4 text-gray-300" /></td>
                      </tr>
                    ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!isLoading && meta.pages > 1 && (
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>{meta.total} dossier(s) au total</span>
            <div className="flex items-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-gray-200 px-3 py-1.5 hover:bg-gray-50 disabled:opacity-40 transition-colors">
                Précédent
              </button>
              <span>Page {page} / {meta.pages}</span>
              <button disabled={page >= meta.pages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-gray-200 px-3 py-1.5 hover:bg-gray-50 disabled:opacity-40 transition-colors">
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>
    </RoleBasedLayout>
  );
}
