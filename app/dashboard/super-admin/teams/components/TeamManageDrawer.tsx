'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Settings,
  Users,
  Save,
  Trash2,
  UserMinus,
  RefreshCw,
  AlertTriangle,
  Crown,
  UserPlus,
} from 'lucide-react';
import type { TeamWithStats, TeamMemberData } from '../types';
import { CLAIM_TYPE_LABELS, ROLE_LABELS } from '../types';
import { WorkloadBar } from './WorkloadBar';

const ALL_CLAIM_TYPES = ['AUTO', 'HOME', 'HEALTH', 'LIFE', 'CONSTRUCTION'];

type DrawerTab = 'settings' | 'members';

interface TeamManageDrawerProps {
  team: TeamWithStats;
  readOnly?: boolean;
  onClose: () => void;
  onUpdated: () => void;
  onAddMember: () => void;
}

const ROLE_BADGE: Record<string, string> = {
  MANAGER_SENIOR: 'bg-indigo-100 text-indigo-800',
  MANAGER_JUNIOR: 'bg-blue-100 text-blue-800',
  EXPERT: 'bg-teal-100 text-teal-800',
};

const TEAM_ROLE_BADGE: Record<string, string> = {
  LEAD: 'bg-purple-100 text-purple-800',
  MEMBER: 'bg-gray-100 text-gray-700',
};

export function TeamManageDrawer({
  team,
  readOnly = false,
  onClose,
  onUpdated,
  onAddMember,
}: TeamManageDrawerProps) {
  const [activeTab, setActiveTab] = useState<DrawerTab>(readOnly ? 'members' : 'settings');
  const [members, setMembers] = useState<TeamMemberData[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  // Settings form
  const [name, setName] = useState(team.name);
  const [description, setDescription] = useState(team.description ?? '');
  const [claimTypes, setClaimTypes] = useState<string[]>(team.claimTypes);
  const [maxWorkload, setMaxWorkload] = useState(team.maxWorkload);
  const [isActive, setIsActive] = useState(team.isActive);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Remove member state
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    setLoadingMembers(true);
    try {
      const res = await fetch(`/api/teams/${team.id}/members`);
      const data = await res.json();
      if (data.success) {
        const list = data.data?.members ?? data.data;
        setMembers(Array.isArray(list) ? list : []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingMembers(false);
    }
  }, [team.id]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const toggleClaimType = (ct: string) => {
    setClaimTypes((prev) =>
      prev.includes(ct) ? prev.filter((x) => x !== ct) : [...prev, ct],
    );
  };

  const handleSave = async () => {
    setSaveError('');
    setSaveSuccess(false);
    if (claimTypes.length === 0) {
      setSaveError('Sélectionnez au moins un type de sinistre.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/teams/${team.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, claimTypes, maxWorkload, isActive }),
      });
      const data = await res.json();
      if (!data.success) {
        setSaveError(data.error ?? 'Erreur lors de la sauvegarde');
        return;
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      onUpdated();
    } catch {
      setSaveError('Erreur réseau. Veuillez réessayer.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleteError('');
    setDeleting(true);
    try {
      const res = await fetch(`/api/teams/${team.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) {
        setDeleteError(data.error ?? 'Impossible de supprimer cette équipe');
        setDeleting(false);
        return;
      }
      onUpdated();
      onClose();
    } catch {
      setDeleteError('Erreur réseau. Veuillez réessayer.');
      setDeleting(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    setRemovingUserId(userId);
    try {
      const res = await fetch(`/api/teams/${team.id}/members/${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setMembers((prev) => prev.filter((m) => m.userId !== userId));
        onUpdated();
      }
    } catch {
      // ignore
    } finally {
      setRemovingUserId(null);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">{team.name}</h2>
              <p className="text-xs text-gray-400">
                {readOnly ? 'Vue détaillée' : 'Gestion de l\'équipe'} · {loadingMembers ? team.stats.memberCount : members.length} membre{(loadingMembers ? team.stats.memberCount : members.length) !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 shrink-0">
          {!readOnly && (
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center space-x-1.5 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'settings'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Paramètres</span>
            </button>
          )}
          <button
            onClick={() => setActiveTab('members')}
            className={`flex items-center space-x-1.5 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'members'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Membres</span>
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-gray-200 text-gray-600 rounded-full">
              {members.length}
            </span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* ── Settings tab ─────────────────────────────────────── */}
          {activeTab === 'settings' && (
            <div className="p-6 space-y-5">
              {saveError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {saveError}
                </div>
              )}
              {saveSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                  ✓ Modifications enregistrées
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'équipe</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>

              {/* Claim types */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Types de sinistres</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_CLAIM_TYPES.map((ct) => (
                    <button
                      key={ct}
                      type="button"
                      onClick={() => toggleClaimType(ct)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                        claimTypes.includes(ct)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300'
                      }`}
                    >
                      {CLAIM_TYPE_LABELS[ct]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Max workload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Capacité max par membre</label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={maxWorkload}
                  onChange={(e) => setMaxWorkload(parseInt(e.target.value) || 20)}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Active toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-800">Équipe active</p>
                  <p className="text-xs text-gray-500">Les dossiers peuvent être assignés aux membres</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isActive ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      isActive ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Save button */}
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full flex items-center justify-center space-x-2 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{saving ? 'Enregistrement...' : 'Enregistrer les modifications'}</span>
              </button>

              {/* Danger zone */}
              <div className="border border-red-200 rounded-lg p-4 space-y-3">
                <h3 className="text-sm font-semibold text-red-700 flex items-center space-x-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Zone dangereuse</span>
                </h3>
                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center space-x-2 px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Supprimer cette équipe</span>
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-red-700">
                      Confirmer la suppression de <strong>{team.name}</strong> ? Cette action est irréversible.
                    </p>
                    {deleteError && (
                      <p className="text-xs text-red-600 bg-red-50 p-2 rounded">{deleteError}</p>
                    )}
                    <div className="flex space-x-2">
                      <button
                        onClick={() => { setShowDeleteConfirm(false); setDeleteError(''); }}
                        className="flex-1 py-2 text-xs text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="flex-1 py-2 text-xs text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                      >
                        {deleting ? 'Suppression...' : 'Confirmer la suppression'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Members tab ───────────────────────────────────────── */}
          {activeTab === 'members' && (
            <div className="p-6 space-y-4">
              {/* Add member button */}
              {!readOnly && (
                <button
                  onClick={() => { onAddMember(); }}
                  className="w-full flex items-center justify-center space-x-2 py-2.5 border-2 border-dashed border-blue-300 text-blue-600 text-sm font-medium rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Ajouter un membre</span>
                </button>
              )}

              {loadingMembers ? (
                <div className="flex items-center justify-center py-10">
                  <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
                </div>
              ) : members.length === 0 ? (
                <div className="text-center py-10">
                  <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Aucun membre dans cette équipe</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {members.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl border border-gray-100"
                    >
                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <span className="text-sm font-semibold text-blue-700">
                          {m.user.firstName[0]}{m.user.lastName[0]}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {m.user.firstName} {m.user.lastName}
                          </p>
                          {m.role === 'LEAD' && (
                            <Crown className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center space-x-1.5 mt-0.5 flex-wrap gap-y-1">
                          <span className={`px-1.5 py-0.5 text-xs rounded-full ${ROLE_BADGE[m.user.role] ?? 'bg-gray-100 text-gray-700'}`}>
                            {ROLE_LABELS[m.user.role] ?? m.user.role}
                          </span>
                          <span className={`px-1.5 py-0.5 text-xs rounded-full ${TEAM_ROLE_BADGE[m.role] ?? 'bg-gray-100 text-gray-700'}`}>
                            {m.role === 'LEAD' ? 'Chef d\'équipe' : 'Membre'}
                          </span>
                        </div>
                        <div className="mt-1.5">
                          <WorkloadBar
                            current={m.user.currentWorkload}
                            max={m.maxClaims}
                            size="sm"
                            showText={false}
                          />
                          <p className="text-xs text-gray-400 mt-0.5 tabular-nums">
                            {m.user.currentWorkload} / {m.maxClaims} dossiers
                          </p>
                        </div>
                      </div>

                      {/* Remove button */}
                      {!readOnly && (
                        <button
                          onClick={() => handleRemoveMember(m.userId)}
                          disabled={removingUserId === m.userId}
                          className="p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-600 disabled:opacity-40 transition-colors shrink-0"
                          title="Retirer de l'équipe"
                        >
                          {removingUserId === m.userId ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <UserMinus className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
