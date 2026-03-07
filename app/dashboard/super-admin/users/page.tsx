'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAdminAuth } from '@/app/hooks/useAdminAuth';
import { userAPI, type User } from '@/app/lib/api/superAdminAPI';
import {
  Users,
  Search,
  Plus,
  Edit,
  RefreshCw,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  X,
  Shield,
  UserCog,
} from 'lucide-react';

// ─── Role badge styling ───────────────────────────────────────────────────────
const ROLE_STYLES: Record<string, string> = {
  SUPER_ADMIN:     'bg-purple-100 text-purple-800 border border-purple-200',
  MANAGER_SENIOR:  'bg-indigo-100 text-indigo-800 border border-indigo-200',
  MANAGER_JUNIOR:  'bg-blue-100   text-blue-800   border border-blue-200',
  EXPERT:          'bg-teal-100   text-teal-800   border border-teal-200',
};

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN:    'Super Admin',
  MANAGER_SENIOR: 'Manager Senior',
  MANAGER_JUNIOR: 'Manager Junior',
  EXPERT:         'Expert',
};

// ─── Role stats bar ───────────────────────────────────────────────────────────
const ROLE_STAT_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  SUPER_ADMIN:    { bg: 'bg-purple-50', text: 'text-purple-700', icon: 'text-purple-500' },
  MANAGER_SENIOR: { bg: 'bg-indigo-50', text: 'text-indigo-700', icon: 'text-indigo-500' },
  MANAGER_JUNIOR: { bg: 'bg-blue-50',   text: 'text-blue-700',   icon: 'text-blue-500' },
  EXPERT:         { bg: 'bg-teal-50',   text: 'text-teal-700',   icon: 'text-teal-500' },
};

// ─── Create / Edit modal ──────────────────────────────────────────────────────
interface UserModalProps {
  mode: 'create' | 'edit';
  initial?: User;
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
}

function UserModal({ mode, initial, onClose, onSubmit }: UserModalProps) {
  const [form, setForm] = useState({
    firstName:   initial?.firstName   ?? '',
    lastName:    initial?.lastName    ?? '',
    email:       initial?.email       ?? '',
    password:    '',
    role:        initial?.role        ?? 'EXPERT',
    maxWorkload: initial?.maxWorkload  ?? 20,
    isActive:    initial?.isActive    ?? true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (key: string, val: unknown) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        firstName:   form.firstName,
        lastName:    form.lastName,
        email:       form.email,
        role:        form.role,
        maxWorkload: Number(form.maxWorkload),
        isActive:    form.isActive,
      };
      if (mode === 'create' || form.password) payload.password = form.password;
      await onSubmit(payload);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/40" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <UserCog className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                {mode === 'create' ? 'Créer un utilisateur' : 'Modifier l\'utilisateur'}
              </h2>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                <input
                  type="text" required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  value={form.firstName}
                  onChange={e => set('firstName', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                <input
                  type="text" required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  value={form.lastName}
                  onChange={e => set('lastName', e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email" required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                value={form.email}
                onChange={e => set('email', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {mode === 'create' ? 'Mot de passe' : 'Nouveau mot de passe (laisser vide pour ne pas modifier)'}
              </label>
              <input
                type="password"
                required={mode === 'create'}
                minLength={mode === 'create' ? 8 : undefined}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                value={form.password}
                onChange={e => set('password', e.target.value)}
                placeholder={mode === 'edit' ? 'Laisser vide pour conserver' : ''}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
                <select
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  value={form.role}
                  onChange={e => set('role', e.target.value)}
                >
                  <option value="SUPER_ADMIN">Super Admin</option>
                  <option value="MANAGER_SENIOR">Manager Senior</option>
                  <option value="MANAGER_JUNIOR">Manager Junior</option>
                  <option value="EXPERT">Expert</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Charge max</label>
                <input
                  type="number" min={1} max={100}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  value={form.maxWorkload}
                  onChange={e => set('maxWorkload', e.target.value)}
                />
              </div>
            </div>

            {mode === 'edit' && (
              <div className="flex items-center space-x-3">
                <label className="text-sm font-medium text-gray-700">Statut actif</label>
                <button
                  type="button"
                  onClick={() => set('isActive', !form.isActive)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    form.isActive ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    form.isActive ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? (
                  <span className="flex items-center space-x-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Enregistrement...</span>
                  </span>
                ) : mode === 'create' ? 'Créer' : 'Mettre à jour'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function UsersPage() {
  useAdminAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'active' | 'inactive' | ''>('');
  const [filterRole, setFilterRole] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 10 });
  const [selected, setSelected] = useState<string[]>([]);

  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // ── Role counts derived from the full page ────────────────────────────
  const roleCounts = users.reduce<Record<string, number>>((acc, u) => {
    acc[u.role] = (acc[u.role] ?? 0) + 1;
    return acc;
  }, {});

  // ── Data loading ──────────────────────────────────────────────────────
  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await userAPI.list({
        page: currentPage,
        limit: 10,
        search: searchTerm || undefined,
        status: filterStatus || undefined,
        role: filterRole || undefined,
      } as Parameters<typeof userAPI.list>[0]);
      setUsers(res.data?.users ?? []);
      if (res.data?.pagination) setPagination(res.data.pagination);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, filterStatus, filterRole]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleCreate = async (data: Record<string, unknown>) => {
    const res = await userAPI.create(data);
    if (!res?.success) throw new Error(res?.error ?? 'Create failed');
    loadUsers();
  };

  const handleUpdate = async (data: Record<string, unknown>) => {
    if (!editingUser) return;
    const res = await userAPI.update(editingUser.userId, data);
    if (!res?.success) throw new Error(res?.error ?? 'Update failed');
    loadUsers();
  };

  const handleBulkActivate = async () => {
    if (!selected.length) return;
    await userAPI.bulkAction('activate', selected);
    setSelected([]);
    loadUsers();
  };

  const handleBulkDeactivate = async () => {
    if (!selected.length) return;
    await userAPI.bulkAction('deactivate', selected);
    setSelected([]);
    loadUsers();
  };

  const toggleSelect = (id: string) =>
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );

  const toggleAll = () =>
    setSelected(prev =>
      prev.length === users.length ? [] : users.map(u => u.userId)
    );

  // ─── Render ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Utilisateurs</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gérez tous les comptes utilisateurs de la plateforme
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Nouvel utilisateur</span>
        </button>
      </div>

      {/* ── Role stat cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(['SUPER_ADMIN', 'MANAGER_SENIOR', 'MANAGER_JUNIOR', 'EXPERT'] as const).map(role => {
          const colors = ROLE_STAT_COLORS[role];
          return (
            <div key={role} className={`${colors.bg} rounded-xl p-4 border border-white/60`}>
              <div className="flex items-center space-x-3">
                <Shield className={`w-5 h-5 ${colors.icon}`} />
                <div>
                  <p className={`text-2xl font-bold ${colors.text}`}>{roleCounts[role] ?? 0}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{ROLE_LABELS[role]}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Controls ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border-b border-gray-100">
          {/* Search */}
          <form
            className="relative flex-1 max-w-sm"
            onSubmit={e => { e.preventDefault(); setCurrentPage(1); loadUsers(); }}
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom ou email..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </form>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value as typeof filterStatus); setCurrentPage(1); }}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Tous les statuts</option>
            <option value="active">Actif</option>
            <option value="inactive">Inactif</option>
          </select>

          {/* Role filter */}
          <select
            value={filterRole}
            onChange={e => { setFilterRole(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Tous les rôles</option>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="MANAGER_SENIOR">Manager Senior</option>
            <option value="MANAGER_JUNIOR">Manager Junior</option>
            <option value="EXPERT">Expert</option>
          </select>

          <button
            onClick={() => { setCurrentPage(1); loadUsers(); }}
            disabled={loading}
            className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </button>
        </div>

        {/* Bulk actions bar */}
        {selected.length > 0 && (
          <div className="flex items-center space-x-3 px-4 py-2 bg-blue-50 border-b border-blue-100">
            <span className="text-sm text-blue-700 font-medium">{selected.length} sélectionné(s)</span>
            <button
              onClick={handleBulkActivate}
              className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
            >
              Activer
            </button>
            <button
              onClick={handleBulkDeactivate}
              className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
            >
              Désactiver
            </button>
          </div>
        )}

        {/* ── Table ── */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600"
                    checked={selected.length === users.length && users.length > 0}
                    onChange={toggleAll}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Rôle
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Charge
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Dernière connexion
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex items-center justify-center space-x-2 text-gray-400">
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span className="text-sm">Chargement...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center space-y-3">
                      <Users className="w-10 h-10 text-gray-300" />
                      <p className="text-sm text-gray-500">Aucun utilisateur trouvé</p>
                      <button
                        onClick={() => setShowCreate(true)}
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Créer le premier utilisateur
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map(user => {
                  const workloadPct = user.maxWorkload > 0
                    ? (user.currentWorkload / user.maxWorkload) * 100
                    : 0;
                  const barColor = workloadPct > 90 ? 'bg-red-500'
                    : workloadPct > 70 ? 'bg-yellow-500'
                    : 'bg-green-500';

                  return (
                    <tr
                      key={user.userId}
                      className={`transition-colors hover:bg-gray-50 ${
                        selected.includes(user.userId) ? 'bg-blue-50/60' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-blue-600"
                          checked={selected.includes(user.userId)}
                          onChange={() => toggleSelect(user.userId)}
                        />
                      </td>

                      {/* User */}
                      <td className="px-4 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-full bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-semibold shrink-0">
                            {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${ROLE_STYLES[user.role] ?? 'bg-gray-100 text-gray-800'}`}>
                          {user.role}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4">
                        {user.isActive ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3" />
                            <span>Actif</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                            <XCircle className="w-3 h-3" />
                            <span>Inactif</span>
                          </span>
                        )}
                      </td>

                      {/* Workload */}
                      <td className="px-4 py-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${barColor} transition-all`}
                              style={{ width: `${Math.min(workloadPct, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600 tabular-nums">
                            {user.currentWorkload} / {user.maxWorkload}
                          </span>
                        </div>
                      </td>

                      {/* Last login */}
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {user.lastLogin
                          ? new Date(user.lastLogin).toLocaleDateString('fr-FR', {
                              day: '2-digit', month: 'short', year: 'numeric',
                            })
                          : '—'}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4">
                        <button
                          onClick={() => setEditingUser(user)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              {((pagination.page - 1) * pagination.limit) + 1}–
              {Math.min(pagination.page * pagination.limit, pagination.total)} sur {pagination.total} utilisateurs
            </p>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-700">
                Page {pagination.page} / {pagination.pages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(pagination.pages, p + 1))}
                disabled={currentPage === pagination.pages}
                className="p-1.5 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {showCreate && (
        <UserModal
          mode="create"
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreate}
        />
      )}
      {editingUser && (
        <UserModal
          mode="edit"
          initial={editingUser}
          onClose={() => setEditingUser(null)}
          onSubmit={handleUpdate}
        />
      )}
    </div>
  );
}
