'use client';

import React from 'react';
import useSWR from 'swr';
import { Building2, RefreshCw, Users } from 'lucide-react';
import { useAdminAuth } from '@/app/hooks/useAdminAuth';

export default function AdminTeamsPage() {
  const { token } = useAdminAuth();

  const { data, isLoading, mutate } = useSWR(
    token ? ['/api/teams', token] : null,
    ([url, t]: [string, string]) =>
      fetch(url, { headers: { Authorization: `Bearer ${t}` } }).then((r) => {
        if (!r.ok) throw new Error('Erreur');
        return r.json();
      }),
    { refreshInterval: 30_000 }
  );

  const teams: any[] = data?.data ?? data?.teams ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Équipes</h2>
          <p className="text-sm text-gray-500 mt-0.5">{teams.length} équipe{teams.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => mutate()} className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
          <RefreshCw className="h-4 w-4" /> Actualiser
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse h-32 rounded-xl border border-gray-200 bg-gray-50" />
          ))}
        </div>
      ) : teams.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-16 text-center">
          <Building2 className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-gray-500">Aucune équipe créée</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <div key={team.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{team.name}</p>
                  <p className="text-xs text-gray-400">{team.description ?? 'Pas de description'}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-gray-500">
                <Users className="h-4 w-4" />
                <span>{team.members?.length ?? team._count?.members ?? 0} membre{(team.members?.length ?? 0) !== 1 ? 's' : ''}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
