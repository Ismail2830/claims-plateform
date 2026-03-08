'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { FileText, CheckSquare, AlertTriangle, TrendingUp, ChevronRight, RefreshCw } from 'lucide-react';
import RoleBasedLayout from '@/components/layout/RoleBasedLayout';
import { useAdminAuth } from '@/app/hooks/useAdminAuth';

function swrFetcher(url: string, token: string) {
  return fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then((r) => {
    if (!r.ok) throw new Error('Erreur');
    return r.json();
  });
}

const STATUS_COLORS: Record<string, string> = {
  DECLARED: 'bg-gray-100 text-gray-700', ANALYZING: 'bg-blue-100 text-blue-700',
  DOCS_REQUIRED: 'bg-yellow-100 text-yellow-700', UNDER_EXPERTISE: 'bg-purple-100 text-purple-700',
  IN_DECISION: 'bg-orange-100 text-orange-700', APPROVED: 'bg-green-100 text-green-700',
  IN_PAYMENT: 'bg-teal-100 text-teal-700', CLOSED: 'bg-gray-200 text-gray-600',
  REJECTED: 'bg-red-100 text-red-700',
};

interface KpiCardProps { label: string; value: number | undefined; icon: React.ElementType; color: string; sub?: string; }
function KpiCard({ label, value, icon: Icon, color, sub }: KpiCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm flex items-center gap-4">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${color}`}><Icon className="h-6 w-6" /></div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value === undefined ? '' : value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function ManagerSeniorDashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, logout, token } = useAdminAuth();

  const { data, isLoading, error, mutate } = useSWR(
    token ? ['/api/manager-senior/stats', token] : null,
    ([url, t]: [string, string]) => swrFetcher(url, t),
    { refreshInterval: 30_000 }
  );

  React.useEffect(() => {
    if (!authLoading && !user) router.push('/auth/admin?reason=session_expired');
  }, [authLoading, user, router]);

  if (authLoading || !user) return null;

  const stats = data?.data;

  return (
    <RoleBasedLayout role="MANAGER_SENIOR" user={user} onLogout={logout}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Bonjour, {user.firstName} !</h2>
            <p className="text-sm text-gray-500 mt-0.5">Tableau de bord  Manager Senior</p>
          </div>
          <button onClick={() => mutate()} className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <RefreshCw className="h-4 w-4" /> Actualiser
          </button>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Impossible de charger les statistiques.</div>
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard label="Total sinistres"     value={isLoading ? undefined : stats?.totalClaims}       icon={FileText}    color="bg-blue-100 text-blue-600" />
            <KpiCard label="En décision"          value={isLoading ? undefined : stats?.pendingApprovals}  icon={CheckSquare}  color="bg-orange-100 text-orange-600" />
            <KpiCard label="Cas escaladés"        value={isLoading ? undefined : stats?.escalatedClaims}   icon={AlertTriangle} color="bg-red-100 text-red-600" />
            <KpiCard label="Approuvés ce mois"    value={isLoading ? undefined : stats?.approvedThisMonth} icon={TrendingUp}   color="bg-green-100 text-green-600" />
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h3 className="font-semibold text-gray-900">Dossiers récents</h3>
              <button onClick={() => router.push('/dashboard/manager-senior/claims')} className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
                Voir tout <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="px-5 py-3 animate-pulse flex gap-3">
                      <div className="h-4 w-24 rounded bg-gray-100" />
                      <div className="h-4 w-20 rounded bg-gray-100" />
                    </div>
                  ))
                : (stats?.recentClaims ?? []).map((c: {
                    claimId: string; claimNumber: string; claimType: string;
                    status: string; priority: string;
                    client?: { firstName: string; lastName: string };
                    assignedUser?: { firstName: string; lastName: string };
                  }) => (
                    <div key={c.claimId} className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => router.push('/dashboard/manager-senior/claims')}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">#{c.claimNumber}</p>
                        <p className="text-xs text-gray-400 truncate">{c.client?.firstName} {c.client?.lastName}  {c.assignedUser?.firstName ?? ''} {c.assignedUser?.lastName ?? ''}</p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[c.status] ?? 'bg-gray-100 text-gray-600'}`}>{c.status}</span>
                      <ChevronRight className="h-4 w-4 text-gray-300 shrink-0" />
                    </div>
                  ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-2">
              <h3 className="font-semibold text-gray-900 mb-3">Accès rapide</h3>
              {[
                { label: 'Mon équipe',           href: '/dashboard/manager-senior/team' },
                { label: "File d'approbation",   href: '/dashboard/manager-senior/approvals' },
                { label: 'Cas escaladés',        href: '/dashboard/manager-senior/escalated' },
                { label: 'Performance',          href: '/dashboard/manager-senior/performance' },
                { label: 'Rapports',             href: '/dashboard/manager-senior/reports' },
              ].map((a) => (
                <button key={a.href} onClick={() => router.push(a.href)} className="flex w-full items-center justify-between rounded-lg border border-gray-100 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-200 transition-colors">
                  {a.label} <ChevronRight className="h-4 w-4 text-gray-400" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </RoleBasedLayout>
  );
}
