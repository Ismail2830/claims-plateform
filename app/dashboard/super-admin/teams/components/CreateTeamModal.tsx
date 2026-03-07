'use client';

import React, { useState, useEffect } from 'react';
import { X, Building2, RefreshCw } from 'lucide-react';
import { z } from 'zod';
import { CLAIM_TYPE_LABELS } from '../types';

const ALL_CLAIM_TYPES = ['AUTO', 'HOME', 'HEALTH', 'LIFE', 'CONSTRUCTION'];

const schema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(100),
  description: z.string().max(255).optional(),
  claimTypes: z.array(z.string()).min(1, 'Sélectionnez au moins un type'),
  maxWorkload: z.number().int().min(1).max(200),
  leadUserId: z.string().uuid().optional().or(z.literal('')),
  memberIds: z.array(z.string().uuid()),
});

interface AvailableUser {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  currentWorkload: number;
  maxWorkload: number;
}

interface CreateTeamModalProps {
  onClose: () => void;
  onCreated: () => void;
}

export function CreateTeamModal({ onClose, onCreated }: CreateTeamModalProps) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    claimTypes: [] as string[],
    maxWorkload: 20,
    leadUserId: '',
    memberIds: [] as string[],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [users, setUsers] = useState<AvailableUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

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

  const set = <K extends keyof typeof form>(key: K, val: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const toggleClaimType = (ct: string) => {
    set(
      'claimTypes',
      form.claimTypes.includes(ct)
        ? form.claimTypes.filter((x) => x !== ct)
        : [...form.claimTypes, ct],
    );
  };

  const toggleMember = (uid: string) => {
    set(
      'memberIds',
      form.memberIds.includes(uid)
        ? form.memberIds.filter((x) => x !== uid)
        : [...form.memberIds, uid],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setServerError('');

    const parsed = schema.safeParse({
      ...form,
      leadUserId: form.leadUserId || undefined,
    });
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setErrors(
        Object.fromEntries(
          Object.entries(flat).map(([k, v]) => [k, (v ?? [])[0] ?? '']),
        ),
      );
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json();
      if (!data.success) {
        setServerError(data.error ?? 'Erreur lors de la création');
        return;
      }
      onCreated();
      onClose();
    } catch {
      setServerError('Erreur réseau. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/40" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Créer une équipe</h2>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5 max-h-[75vh] overflow-y-auto">
            {serverError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {serverError}
              </div>
            )}

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom de l&apos;équipe <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.name ? 'border-red-400' : 'border-gray-300'}`}
                placeholder="Ex: Équipe AUTO Casablanca"
              />
              {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                placeholder="Description optionnelle..."
              />
            </div>

            {/* Claim types */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Types de sinistres <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {ALL_CLAIM_TYPES.map((ct) => (
                  <button
                    key={ct}
                    type="button"
                    onClick={() => toggleClaimType(ct)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      form.claimTypes.includes(ct)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300'
                    }`}
                  >
                    {CLAIM_TYPE_LABELS[ct]}
                  </button>
                ))}
              </div>
              {errors.claimTypes && <p className="text-xs text-red-600 mt-1">{errors.claimTypes}</p>}
            </div>

            {/* Max workload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Capacité max par membre <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                max={200}
                value={form.maxWorkload}
                onChange={(e) => set('maxWorkload', parseInt(e.target.value) || 20)}
                className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Lead + Members */}
            {loadingUsers ? (
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Chargement des utilisateurs...</span>
              </div>
            ) : (
              <>
                {/* Chef d'équipe */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Chef d&apos;équipe</label>
                  <select
                    value={form.leadUserId}
                    onChange={(e) => set('leadUserId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">— Aucun chef désigné —</option>
                    {users
                      .filter((u) => u.role === 'MANAGER_SENIOR')
                      .map((u) => (
                        <option key={u.userId} value={u.userId}>
                          {u.firstName} {u.lastName} — {u.currentWorkload}/{u.maxWorkload}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Membres initiaux */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Membres initiaux{' '}
                    <span className="text-gray-400 text-xs font-normal">({form.memberIds.length} sélectionné(s))</span>
                  </label>
                  <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                    {users
                      .filter((u) => u.userId !== form.leadUserId)
                      .map((u) => (
                        <label
                          key={u.userId}
                          className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-blue-600"
                            checked={form.memberIds.includes(u.userId)}
                            onChange={() => toggleMember(u.userId)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900">
                              {u.firstName} {u.lastName}
                            </p>
                            <p className="text-xs text-gray-400 truncate">{u.email}</p>
                          </div>
                          <span className="text-xs text-gray-500 tabular-nums shrink-0">
                            {u.currentWorkload}/{u.maxWorkload}
                          </span>
                        </label>
                      ))}
                    {users.filter((u) => u.userId !== form.leadUserId).length === 0 && (
                      <p className="text-sm text-gray-400 text-center py-4">Aucun utilisateur disponible</p>
                    )}
                  </div>
                </div>
              </>
            )}
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
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <span className="flex items-center space-x-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Création...</span>
                </span>
              ) : (
                'Créer l\'équipe'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
