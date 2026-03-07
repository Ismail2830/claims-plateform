'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, UserPlus, RefreshCw, Search } from 'lucide-react';
import { WorkloadBar } from './WorkloadBar';

interface AvailableUser {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  currentWorkload: number;
  maxWorkload: number;
}

interface AddMemberModalProps {
  teamId: string;
  teamName: string;
  onClose: () => void;
  onAdded: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  MANAGER_SENIOR: 'Manager Senior',
  MANAGER_JUNIOR: 'Manager Junior',
  EXPERT: 'Expert',
};

export function AddMemberModal({ teamId, teamName, onClose, onAdded }: AddMemberModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [teamRole, setTeamRole] = useState<'MEMBER' | 'LEAD'>('MEMBER');
  const [maxClaims, setMaxClaims] = useState(20);
  const [users, setUsers] = useState<AvailableUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch('/api/super-admin/users?limit=200&status=active');
        const data = await res.json();
        const all: AvailableUser[] = data.data?.users ?? [];
        setUsers(all.filter((u) => ['MANAGER_SENIOR', 'MANAGER_JUNIOR', 'EXPERT'].includes(u.role)));
      } catch {
        // non-critical
      } finally {
        setLoadingUsers(false);
      }
    }
    fetchUsers();
  }, []);

  const filtered = users.filter((u) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.firstName.toLowerCase().includes(q) ||
      u.lastName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

  const selectedUser = users.find((u) => u.userId === selectedUserId);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedUserId) {
        setServerError('Veuillez sélectionner un utilisateur.');
        return;
      }
      setServerError('');
      setLoading(true);
      try {
        const res = await fetch(`/api/teams/${teamId}/members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: selectedUserId, role: teamRole, maxClaims }),
        });
        const data = await res.json();
        if (!data.success) {
          setServerError(data.error ?? 'Erreur lors de l\'ajout');
          return;
        }
        onAdded();
        onClose();
      } catch {
        setServerError('Erreur réseau. Veuillez réessayer.');
      } finally {
        setLoading(false);
      }
    },
    [selectedUserId, teamRole, maxClaims, teamId, onAdded, onClose],
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/40" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <UserPlus className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Ajouter un membre</h2>
                <p className="text-xs text-gray-400">{teamName}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
            {serverError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {serverError}
              </div>
            )}

            {/* User selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Utilisateur <span className="text-red-500">*</span>
              </label>
              {loadingUsers ? (
                <div className="flex items-center space-x-2 text-sm text-gray-400">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Chargement...</span>
                </div>
              ) : (
                <>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Rechercher par nom ou email..."
                    />
                  </div>
                  <div className="max-h-44 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                    {filtered.length === 0 && (
                      <p className="text-sm text-gray-400 text-center py-4">Aucun résultat</p>
                    )}
                    {filtered.map((u) => (
                      <label
                        key={u.userId}
                        className={`flex items-center space-x-3 px-3 py-2 cursor-pointer transition-colors ${
                          selectedUserId === u.userId ? 'bg-blue-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="userId"
                          className="text-blue-600 border-gray-300"
                          checked={selectedUserId === u.userId}
                          onChange={() => setSelectedUserId(u.userId)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {u.firstName} {u.lastName}
                          </p>
                          <p className="text-xs text-gray-400 truncate">
                            {ROLE_LABELS[u.role] ?? u.role} — {u.email}
                          </p>
                        </div>
                        <div className="shrink-0 w-20">
                          <WorkloadBar current={u.currentWorkload} max={u.maxWorkload} size="sm" />
                        </div>
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Selected user preview */}
            {selectedUser && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-sm">
                <p className="font-medium text-blue-900">
                  {selectedUser.firstName} {selectedUser.lastName}
                </p>
                <p className="text-blue-700 text-xs mt-0.5">
                  Charge actuelle: {selectedUser.currentWorkload} / {selectedUser.maxWorkload} dossiers
                </p>
              </div>
            )}

            {/* Role in team */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rôle dans l&apos;équipe</label>
              <div className="flex space-x-3">
                {(['MEMBER', 'LEAD'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setTeamRole(r)}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${
                      teamRole === r
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300'
                    }`}
                  >
                    {r === 'LEAD' ? 'Chef d\'équipe' : 'Membre'}
                  </button>
                ))}
              </div>
            </div>

            {/* Max claims */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Limite de dossiers dans cette équipe
              </label>
              <input
                type="number"
                min={1}
                max={200}
                value={maxClaims}
                onChange={(e) => setMaxClaims(parseInt(e.target.value) || 20)}
                className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </form>

          {/* Footer */}
          <div className="flex justify-end space-x-3 px-6 py-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !selectedUserId}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <span className="flex items-center space-x-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Ajout...</span>
                </span>
              ) : (
                'Ajouter le membre'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
