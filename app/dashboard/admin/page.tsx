'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Users, FileText, CheckCircle, Clock, UserPlus, ArrowRight, RefreshCw, ShieldCheck } from 'lucide-react';
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

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  MANAGER_SENIOR: 'Manager Senior',
  MANAGER_JUNIOR: 'Manager Junior',
  EXPERT: 'Expert',
  CLIENT: 'Client',
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, token } = useAdminAuth();

  const { data, isLoading, mutate } = useSWR(
    token ? ['/api/admin/stats', token] : null,
    ([url, t]: [string, string]) =>
      fetch(url, { headers: { Authorization: `Bearer ${t}` } }).then((r) => {
        if (!r.ok) throw new Error('Erreur');
        return r.json();
      }),
    { refreshInterval: 30_000 }
  );

  const stats = data?.data;
  const recentClaims = stats?.recentClaims ?? [];
  const recentUsers = stats?.recentUsers ?? [];

  const kpis = [
    { label: 'Utilisateurs', value: stats?.totalUsers, icon: Users, color: 'bg-blue-100 text-blue-600' },
    { label: 'Total sinistres', value: stats?.totalClaims, icon: FileText, color: 'bg-purple-100 text-purple-600' },
    { label: 'En attente', value: stats?.pendingClaims, icon: Clock, color: 'bg-orange-100 text-orange-600' },
    { label: 'Résolus', value: stats?.resolvedClaims, icon: CheckCircle, color: 'bg-green-100 text-green-600' },
  ];

  const quickActions = [
    { label: 'Gérer utilisateurs', href: '/dashboard/admin/users', icon: Users },
    { label: 'Tous les sinistres', href: '/dashboard/admin/claims', icon: FileText },
    { label: 'Scoring IA', href: '/dashboard/admin/ai-scoring', icon: ShieldCheck },
    { label: 'Rapports', href: '/dashboard/admin/reports', icon: CheckCircle },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Bonjour, {user?.firstName} 
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">Tableau de bord administration</p>
        </div>
        <button
          onClick={() => mutate()}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="h-4 w-4" /> Actualiser
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm flex items-center gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${kpi.color}`}>
              <kpi.icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{kpi.label}</p>
              <p className="text-2xl font-bold text-gray-900">
                {isLoading ? <span className="inline-block h-6 w-10 rounded bg-gray-100 animate-pulse" /> : kpi.value ?? 0}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Derniers sinistres</h3>
            <button
              onClick={() => router.push('/dashboard/admin/claims')}
              className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              Voir tout <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          {isLoading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse h-8 rounded bg-gray-100" />
              ))}
            </div>
          ) : recentClaims.length === 0 ? (
            <p className="p-5 text-sm text-gray-400 text-center">Aucun sinistre</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                  <th className="px-5 py-2 font-medium">N° dossier</th>
                  <th className="px-5 py-2 font-medium">Statut</th>
                  <th className="px-5 py-2 font-medium">Expert</th>
                  <th className="px-5 py-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentClaims.map((c: any) => (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-mono text-blue-600">{c.claimNumber}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[c.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {STATUS_LABEL[c.status] ?? c.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {c.assignedUser ? `${c.assignedUser.firstName} ${c.assignedUser.lastName}` : ''}
                    </td>
                    <td className="px-5 py-3 text-gray-500">
                      {new Date(c.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Actions rapides</h3>
            <div className="space-y-2">
              {quickActions.map((a) => (
                <button
                  key={a.href}
                  onClick={() => router.push(a.href)}
                  className="flex w-full items-center gap-3 rounded-lg border border-gray-100 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                >
                  <a.icon className="h-4 w-4 shrink-0 text-blue-500" />
                  {a.label}
                  <ArrowRight className="h-3.5 w-3.5 ml-auto text-gray-400" />
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Nouveaux utilisateurs</h3>
              <UserPlus className="h-4 w-4 text-blue-500" />
            </div>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="animate-pulse h-8 rounded bg-gray-100" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {recentUsers.map((u: any) => (
                  <div key={u.id} className="flex items-center gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                      {u.firstName?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{u.firstName} {u.lastName}</p>
                      <p className="text-xs text-gray-400">{ROLE_LABELS[u.role] ?? u.role}</p>
                    </div>
                    <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${u.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                  </div>
                ))}
                {recentUsers.length === 0 && <p className="text-sm text-gray-400 text-center py-2">Aucun utilisateur</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
