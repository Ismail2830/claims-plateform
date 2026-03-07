'use client';

import React, { useState, useEffect } from 'react';
import { X, Settings, RefreshCw } from 'lucide-react';
import { z } from 'zod';
import type { RoutingRule, TeamWithStats } from '../types';
import { CLAIM_TYPE_LABELS } from '../types';

const schema = z.object({
  claimType: z.string().optional(),
  minRiskScore: z.number().min(0).max(100).optional().nullable(),
  maxRiskScore: z.number().min(0).max(100).optional().nullable(),
  minAmount: z.number().min(0).optional().nullable(),
  targetTeamId: z.string().uuid('Équipe requise'),
  targetRole: z.string().optional(),
  priority: z.number().int().min(1),
  isActive: z.boolean(),
});

type FormData = {
  claimType: string;
  minRiskScore: string;
  maxRiskScore: string;
  minAmount: string;
  targetTeamId: string;
  targetRole: string;
  priority: number;
  isActive: boolean;
};

interface EditRoutingRuleModalProps {
  rule?: RoutingRule | null;
  teams: TeamWithStats[];
  onClose: () => void;
  onSaved: () => void;
}

const ALL_CLAIM_TYPES = ['AUTO', 'HOME', 'HEALTH', 'LIFE', 'CONSTRUCTION'];
const TARGET_ROLES = [
  { value: '', label: 'N\'importe quel rôle' },
  { value: 'MANAGER_SENIOR', label: 'Manager Senior' },
  { value: 'MANAGER_JUNIOR', label: 'Manager Junior' },
  { value: 'EXPERT', label: 'Expert' },
];

export function EditRoutingRuleModal({ rule, teams, onClose, onSaved }: EditRoutingRuleModalProps) {
  const isEditing = !!rule;

  const [form, setForm] = useState<FormData>({
    claimType: rule?.claimType ?? '',
    minRiskScore: rule?.minRiskScore != null ? String(rule.minRiskScore) : '',
    maxRiskScore: rule?.maxRiskScore != null ? String(rule.maxRiskScore) : '',
    minAmount: rule?.minAmount != null ? String(rule.minAmount) : '',
    targetTeamId: rule?.targetTeamId ?? '',
    targetRole: rule?.targetRole ?? '',
    priority: rule?.priority ?? 1,
    isActive: rule?.isActive ?? true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    if (rule) {
      setForm({
        claimType: rule.claimType ?? '',
        minRiskScore: rule.minRiskScore != null ? String(rule.minRiskScore) : '',
        maxRiskScore: rule.maxRiskScore != null ? String(rule.maxRiskScore) : '',
        minAmount: rule.minAmount != null ? String(rule.minAmount) : '',
        targetTeamId: rule.targetTeamId ?? '',
        targetRole: rule.targetRole ?? '',
        priority: rule.priority,
        isActive: rule.isActive,
      });
    }
  }, [rule]);

  const set = <K extends keyof FormData>(key: K, val: FormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setServerError('');

    const parsed = schema.safeParse({
      claimType: form.claimType || undefined,
      minRiskScore: form.minRiskScore !== '' ? Number(form.minRiskScore) : null,
      maxRiskScore: form.maxRiskScore !== '' ? Number(form.maxRiskScore) : null,
      minAmount: form.minAmount !== '' ? Number(form.minAmount) : null,
      targetTeamId: form.targetTeamId,
      targetRole: form.targetRole || undefined,
      priority: form.priority,
      isActive: form.isActive,
    });

    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setErrors(Object.fromEntries(Object.entries(flat).map(([k, v]) => [k, (v ?? [])[0] ?? ''])));
      return;
    }

    setLoading(true);
    try {
      const url = isEditing
        ? `/api/teams/routing-rules/${rule!.id}`
        : '/api/teams/routing-rules';
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json();
      if (!data.success) {
        setServerError(data.error ?? 'Erreur lors de la sauvegarde');
        return;
      }
      onSaved();
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
        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Settings className="w-5 h-5 text-purple-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                {isEditing ? 'Modifier la règle' : 'Nouvelle règle d\'attribution'}
              </h2>
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

            {/* Claim type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type de sinistre
              </label>
              <select
                value={form.claimType}
                onChange={(e) => set('claimType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">Tous les types</option>
                {ALL_CLAIM_TYPES.map((ct) => (
                  <option key={ct} value={ct}>
                    {CLAIM_TYPE_LABELS[ct]}
                  </option>
                ))}
              </select>
            </div>

            {/* Risk score range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Score IA min (0-100)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.minRiskScore}
                  onChange={(e) => set('minRiskScore', e.target.value)}
                  placeholder="—"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Score IA max (0-100)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.maxRiskScore}
                  onChange={(e) => set('maxRiskScore', e.target.value)}
                  placeholder="—"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>

            {/* Min amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Montant minimum (MAD)</label>
              <input
                type="number"
                min={0}
                value={form.minAmount}
                onChange={(e) => set('minAmount', e.target.value)}
                placeholder="—"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>

            {/* Target team */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Équipe cible <span className="text-red-500">*</span>
              </label>
              <select
                value={form.targetTeamId}
                onChange={(e) => set('targetTeamId', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                  errors.targetTeamId ? 'border-red-400' : 'border-gray-300'
                }`}
              >
                <option value="">— Sélectionner une équipe —</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              {errors.targetTeamId && <p className="text-xs text-red-600 mt-1">{errors.targetTeamId}</p>}
            </div>

            {/* Target role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rôle cible</label>
              <select
                value={form.targetRole}
                onChange={(e) => set('targetRole', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                {TARGET_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority & Active */}
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Priorité</label>
                <input
                  type="number"
                  min={1}
                  value={form.priority}
                  onChange={(e) => set('priority', parseInt(e.target.value) || 1)}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
                <p className="text-xs text-gray-400 mt-1">1 = priorité la plus haute</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Règle active</label>
                <button
                  type="button"
                  onClick={() => set('isActive', !form.isActive)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    form.isActive ? 'bg-purple-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${
                      form.isActive ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
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
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <span className="flex items-center space-x-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Sauvegarde...</span>
                </span>
              ) : isEditing ? (
                'Enregistrer'
              ) : (
                'Créer la règle'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
