'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { Users, Search, RefreshCw, CheckCircle, XCircle, Crown, Shield, Briefcase, UserCheck } from 'lucide-react';
import { useAdminAuth } from '@/app/hooks/useAdminAuth';

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  MANAGER_SENIOR: 'Manager Senior',
  MANAGER_JUNIOR: 'Manager Junior',
  EXPERT: 'Expert',
  CLIENT: 'Client',
};

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-purple-100 text-purple-800',
  ADMIN: 'bg-indigo-100 text-indigo-800',
  MANAGER_SENIOR: 'bg-blue-100 text-blue-800',
  MANAGER_JUNIOR: 'bg-sky-100 text-sky-800',
  EXPERT: 'bg-teal-100 text-teal-800',
  CLIENT: 'bg-gray-100 text-gray-800',
};

function RoleIcon({ role }: { role: string }) {
  switch (role) {
    case 'SUPER_ADMIN': return <Crown className="h-3.5 w-3.5" />;
    case 'ADMIN': return <Shield className="h-3.5 w-3.5" />;
    case 'MANAGER_SENIOR': return <Shield className="h-3.5 w-3.5" />;
    case 'MANAGER_JUNIOR': return <Briefcase className="h-3.5 w-3.5" />;
    case 'EXPERT': return <UserCheck className="h-3.5 w-3.5" />;
    default: return <Users className="h-3.5 w-3.5" />;
  }
}

export default function AdminUsersPage() {
  const { token } = useAdminAuth();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const params = new URLSearchParams({ page: String(page), limit: String(limit), ...(search && { search }) });

  const { data, isLoading, mutate } = useSWR(
    token ? [`/api/super-admin/users?${params}`, token] : null,
    ([url, t]: [string, string]) =>
      fetch(url, { headers: { Authorization: `Bearer ${t}` } }).then((r) => {
        if (!r.ok) throw new Error('Erreur');
        return r.json();
      }),
    { refreshInterval: 30_000 }
  );

  const users: any[] = data?.data?.users ?? data?.users ?? [];
  const total: number = data?.data?.pagination?.total ?? data?.pagination?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Utilisateurs</h2>
          <p className="text-sm text-gray-500 mt-0.5">{total} utilisateur{total !== 1 ? 's' : ''} au total</p>
        </div>
        <button onClick={() => mutate()} className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
          <RefreshCw className="h-4 w-4" /> Actualiser
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Rechercher par nom ou email…"
          className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
              <th className="px-5 py-3 font-medium">Utilisateur</th>
              <th className="px-5 py-3 font-medium">Rôle</th>
              <th className="px-5 py-3 font-medium">Email</th>
              <th className="px-5 py-3 font-medium">Statut</th>
              <th className="px-5 py-3 font-medium">Créé</th>
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
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-gray-400 text-sm">Aucun utilisateur trouvé</td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                        {u.firstName?.[0]?.toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900">{u.firstName} {u.lastName}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${ROLE_COLORS[u.role] ?? 'bg-gray-100 text-gray-700'}`}>
                      <RoleIcon role={u.role} />
                      {ROLE_LABELS[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{u.email}</td>
                  <td className="px-5 py-3">
                    {u.isActive
                      ? <span className="flex items-center gap-1 text-xs text-green-700"><CheckCircle className="h-3.5 w-3.5" /> Actif</span>
                      : <span className="flex items-center gap-1 text-xs text-red-600"><XCircle className="h-3.5 w-3.5" /> Inactif</span>}
                  </td>
                  <td className="px-5 py-3 text-gray-500">{new Date(u.createdAt).toLocaleDateString('fr-FR')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
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
