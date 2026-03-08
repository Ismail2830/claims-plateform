'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Users, RefreshCw, UserCheck, Briefcase, CheckCircle } from 'lucide-react';
import RoleBasedLayout from '@/components/layout/RoleBasedLayout';
import { useAdminAuth } from '@/app/hooks/useAdminAuth';

interface ExpertData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  totalAssigned: number;
  inProgress: number;
  completed: number;
  utilization: number;
}

export default function ManagerSeniorTeamPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, logout, token } = useAdminAuth();

  const { data, isLoading, mutate } = useSWR(
    token ? ['/api/manager-senior/team', token] : null,
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

  const experts: ExpertData[] = data?.data ?? [];

  function utilizationColor(pct: number) {
    if (pct >= 80) return 'bg-red-500';
    if (pct >= 50) return 'bg-orange-400';
    return 'bg-green-500';
  }

  function utilizationBg(pct: number) {
    if (pct >= 80) return 'border-red-200 bg-red-50';
    if (pct >= 50) return 'border-orange-200 bg-orange-50';
    return 'border-green-200 bg-green-50';
  }

  return (
    <RoleBasedLayout role="MANAGER_SENIOR" user={user} onLogout={logout}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Mon équipe</h2>
            <p className="text-sm text-gray-500 mt-0.5">Tous les experts actifs</p>
          </div>
          <button onClick={() => mutate()} className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <RefreshCw className="h-4 w-4" /> Actualiser
          </button>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total experts',   value: experts.length,                                          icon: Users,      color: 'bg-blue-100 text-blue-600' },
            { label: 'Dossiers actifs', value: experts.reduce((s, e) => s + e.inProgress, 0),           icon: Briefcase,  color: 'bg-orange-100 text-orange-600' },
            { label: 'Résolu total',    value: experts.reduce((s, e) => s + e.completed, 0),            icon: CheckCircle, color: 'bg-green-100 text-green-600' },
          ].map((k) => (
            <div key={k.label} className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${k.color}`}>
                <k.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{k.label}</p>
                <p className="text-xl font-bold text-gray-900">{isLoading ? '…' : k.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Expert cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse h-44 rounded-xl border border-gray-200 bg-gray-50" />
            ))}
          </div>
        ) : experts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-16 text-center">
            <UserCheck className="h-10 w-10 text-gray-300 mb-3" />
            <p className="text-gray-500">Aucun expert actif trouvé</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {experts.map((expert) => (
              <div key={expert.id} className={`rounded-xl border p-5 shadow-sm ${utilizationBg(expert.utilization)}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-900">{expert.firstName} {expert.lastName}</p>
                    <p className="text-xs text-gray-500">{expert.email}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full text-white ${utilizationColor(expert.utilization)}`}>
                    {expert.utilization}%
                  </span>
                </div>

                {/* Utilization bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Charge</span>
                    <span>{expert.inProgress}/{expert.totalAssigned}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${utilizationColor(expert.utilization)} transition-all`}
                      style={{ width: `${Math.min(expert.utilization, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <p className="font-bold text-gray-900">{expert.totalAssigned}</p>
                    <p className="text-gray-500">Total</p>
                  </div>
                  <div>
                    <p className="font-bold text-orange-600">{expert.inProgress}</p>
                    <p className="text-gray-500">En cours</p>
                  </div>
                  <div>
                    <p className="font-bold text-green-600">{expert.completed}</p>
                    <p className="text-gray-500">Résolu</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </RoleBasedLayout>
  );
}
