'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAdminAuth } from '@/app/hooks/useAdminAuth';
import { policyAPI, type Policy } from '@/app/lib/api/superAdminAPI';
import {
  Shield,
  Search,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Calendar,
  DollarSign,
  FileText,
  Filter,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────
const POLICY_TYPES = [
  'AUTO', 'HOME', 'PROFESSIONAL', 'AGRICULTURE', 'TRANSPORT',
  'CONSTRUCTION', 'LIABILITY', 'HEALTH', 'LIFE', 'ACCIDENT',
  'ASSISTANCE', 'CREDIT', 'SURETY', 'TAKAFUL_NON_VIE', 'TAKAFUL_VIE',
] as const;

const POLICY_TYPE_LABELS: Record<string, string> = {
  AUTO: 'Auto', HOME: 'Habitation', PROFESSIONAL: 'Professionnelle',
  AGRICULTURE: 'Agriculture', TRANSPORT: 'Transport', CONSTRUCTION: 'Construction',
  LIABILITY: 'Responsabilité', HEALTH: 'Santé', LIFE: 'Vie', ACCIDENT: 'Accident',
  ASSISTANCE: 'Assistance', CREDIT: 'Crédit', SURETY: 'Caution',
  TAKAFUL_NON_VIE: 'Takaful Non-Vie', TAKAFUL_VIE: 'Takaful Vie',
};

const POLICY_STATUS_STYLES: Record<string, string> = {
  ACTIVE:    'bg-green-100 text-green-800',
  EXPIRED:   'bg-gray-100  text-gray-600',
  CANCELED:  'bg-red-100   text-red-800',
  SUSPENDED: 'bg-yellow-100 text-yellow-800',
};

const POLICY_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active', EXPIRED: 'Expirée', CANCELED: 'Annulée', SUSPENDED: 'Suspendue',
};

const COVERAGE_TYPE_LABELS: Record<string, string> = {
  RC_ONLY: 'RC uniquement', THIRD_PARTY_PLUS: 'Tiers+', COMPREHENSIVE: 'Tous risques',
  FIRE_ONLY: 'Incendie', MULTIRISQUES: 'Multirisques', LANDLORD: 'Propriétaire',
  AMO_BASIC: 'AMO de base', COMPLEMENTAIRE: 'Complémentaire', FULL_COVER: 'Complète',
  TERM_LIFE: 'Temporaire', WHOLE_LIFE: 'Vie entière', SAVINGS: 'Épargne', RETIREMENT: 'Retraite',
  TRC_ONLY: 'TRC', RCD_ONLY: 'RCD', TRC_AND_RCD: 'TRC+RCD', OTHER: 'Autre',
};

const PREMIUM_FREQUENCIES: Record<string, string> = {
  MONTHLY: 'Mensuel', QUARTERLY: 'Trimestriel', SEMI_ANNUAL: 'Semestriel', ANNUAL: 'Annuel',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(amount?: number | string | null) {
  const n = parseFloat(String(amount ?? 0));
  return isNaN(n) ? '—' : n.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD', minimumFractionDigits: 0 });
}

function fmtDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-MA', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isExpiringSoon(endDate?: string | null) {
  if (!endDate) return false;
  const diff = new Date(endDate).getTime() - Date.now();
  return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
}

// ─── Policy type badge ────────────────────────────────────────────────────────
const TYPE_COLORS: Record<string, string> = {
  AUTO: 'bg-blue-100 text-blue-800', HOME: 'bg-green-100 text-green-800',
  PROFESSIONAL: 'bg-purple-100 text-purple-800', AGRICULTURE: 'bg-lime-100 text-lime-800',
  TRANSPORT: 'bg-cyan-100 text-cyan-800', CONSTRUCTION: 'bg-orange-100 text-orange-800',
  LIABILITY: 'bg-rose-100 text-rose-800', HEALTH: 'bg-pink-100 text-pink-800',
  LIFE: 'bg-indigo-100 text-indigo-800', ACCIDENT: 'bg-red-100 text-red-800',
  ASSISTANCE: 'bg-teal-100 text-teal-800', CREDIT: 'bg-amber-100 text-amber-800',
  SURETY: 'bg-yellow-100 text-yellow-800', TAKAFUL_NON_VIE: 'bg-emerald-100 text-emerald-800',
  TAKAFUL_VIE: 'bg-sky-100 text-sky-800',
};

function TypeBadge({ type }: { type: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[type] ?? 'bg-gray-100 text-gray-700'}`}>
      {POLICY_TYPE_LABELS[type] ?? type}
    </span>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${POLICY_STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {POLICY_STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ─── Create / Edit Modal ──────────────────────────────────────────────────────
interface PolicyModalProps {
  mode: 'create' | 'edit';
  initial?: Policy;
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  clients: { clientId: string; firstName: string; lastName: string; email: string }[];
}

function PolicyModal({ mode, initial, onClose, onSubmit, clients }: PolicyModalProps) {
  const [form, setForm] = useState({
    clientId:         initial?.clientId ?? '',
    policyType:       initial?.policyType ?? 'AUTO',
    coverageType:     initial?.coverageType ?? '',
    startDate:        initial?.startDate ? initial.startDate.slice(0, 10) : '',
    endDate:          initial?.endDate ? initial.endDate.slice(0, 10) : '',
    renewalDate:      '',
    premiumAmount:    String(initial?.premiumAmount ?? ''),
    insuredAmount:    String(initial?.insuredAmount ?? ''),
    deductible:       String(initial?.deductible ?? '0'),
    premiumFrequency: 'ANNUAL',
    isObligatory:     false,
    isTakaful:        false,
    notes:            '',
    status:           (initial as any)?.status ?? 'ACTIVE',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set(k: string, v: unknown) {
    setForm(f => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload: Record<string, unknown> = {
        ...form,
        premiumAmount: parseFloat(form.premiumAmount),
        insuredAmount: parseFloat(form.insuredAmount),
        deductible:    parseFloat(form.deductible || '0'),
      };
      if (!form.coverageType) delete payload.coverageType;
      if (!form.renewalDate) delete payload.renewalDate;
      await onSubmit(payload);
    } catch (err: any) {
      setError(err.message ?? 'Erreur inattendue');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-gray-900">
            {mode === 'create' ? 'Nouvelle police' : 'Modifier la police'}
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Client */}
          {mode === 'create' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
              <select
                required
                value={form.clientId}
                onChange={e => set('clientId', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sélectionner un client</option>
                {clients.map(c => (
                  <option key={c.clientId} value={c.clientId}>
                    {c.firstName} {c.lastName} ({c.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Policy Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type de police *</label>
              <select
                required
                value={form.policyType}
                onChange={e => set('policyType', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {POLICY_TYPES.map(t => (
                  <option key={t} value={t}>{POLICY_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>

            {/* Status (edit only) */}
            {mode === 'edit' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                <select
                  value={form.status}
                  onChange={e => set('status', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="EXPIRED">Expirée</option>
                  <option value="CANCELED">Annulée</option>
                  <option value="SUSPENDED">Suspendue</option>
                </select>
              </div>
            )}

            {/* Coverage Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type de couverture</label>
              <select
                value={form.coverageType}
                onChange={e => set('coverageType', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Aucun —</option>
                {Object.entries(COVERAGE_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            {/* Premium Frequency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fréquence de prime</label>
              <select
                value={form.premiumFrequency}
                onChange={e => set('premiumFrequency', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(PREMIUM_FREQUENCIES).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* Dates */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date de début *</label>
              <input
                required
                type="date"
                value={form.startDate}
                onChange={e => set('startDate', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin *</label>
              <input
                required
                type="date"
                value={form.endDate}
                onChange={e => set('endDate', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date de renouvellement</label>
              <input
                type="date"
                value={form.renewalDate}
                onChange={e => set('renewalDate', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* Amounts */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prime (MAD) *</label>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.premiumAmount}
                onChange={e => set('premiumAmount', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Montant assuré (MAD) *</label>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.insuredAmount}
                onChange={e => set('insuredAmount', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Franchise (MAD)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.deductible}
                onChange={e => set('deductible', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isObligatory}
                onChange={e => set('isObligatory', e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-gray-700">Police obligatoire</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isTakaful}
                onChange={e => set('isTakaful', e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-gray-700">Takaful</span>
            </label>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Enregistrement…' : mode === 'create' ? 'Créer' : 'Mettre à jour'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PoliciesPage() {
  useAdminAuth();

  const [policies, setPolicies]     = useState<Policy[]>([]);
  const [loading, setLoading]       = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, pages: 1 });
  const [stats, setStats]           = useState<any[]>([]);
  const [expiringCount, setExpiringCount] = useState(0);

  // Filters
  const [search, setSearch]         = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Modal
  const [modal, setModal]   = useState<{ mode: 'create' | 'edit'; policy?: Policy } | null>(null);
  const [clients, setClients] = useState<any[]>([]);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Policy | null>(null);
  const [deleting, setDeleting]         = useState(false);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchPolicies = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await policyAPI.list({
        page,
        limit: pagination.limit,
        search: search || undefined,
        policyType: filterType || undefined,
        status: filterStatus || undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      const d = res.data;
      const list = d?.policies ?? d?.items ?? [];
      setPolicies(Array.isArray(list) ? list : []);
      if (d?.pagination) setPagination(p => ({ ...p, ...d.pagination }));
      if (d?.stats) setStats(d.stats);
      if (typeof (d as any)?.expiringPolicies === 'number') setExpiringCount((d as any).expiringPolicies);
    } finally {
      setLoading(false);
    }
  }, [search, filterType, filterStatus, pagination.limit]);

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch('/api/super-admin/clients?limit=200&sortBy=firstName&sortOrder=asc');
      const data = await res.json();
      const list = data?.data?.clients ?? data?.data?.items ?? [];
      setClients(Array.isArray(list) ? list : []);
    } catch {}
  }, []);

  useEffect(() => { fetchPolicies(1); }, [search, filterType, filterStatus]);
  useEffect(() => { fetchClients(); }, []);

  // ── Stats cards ───────────────────────────────────────────────────────────
  const totalActive   = stats.filter(s => s.status === 'ACTIVE').reduce((a, c) => a + (c._count ?? 0), 0);
  const totalExpired  = stats.filter(s => s.status === 'EXPIRED').reduce((a, c) => a + (c._count ?? 0), 0);
  const totalCanceled = stats.filter(s => s.status === 'CANCELED').reduce((a, c) => a + (c._count ?? 0), 0);
  const totalPremium  = stats.reduce((a, c) => a + parseFloat(c._sum?.premiumAmount ?? '0'), 0);

  // ── CRUD handlers ────────────────────────────────────────────────────────
  async function handleCreate(data: Record<string, unknown>) {
    const res = await policyAPI.create(data);
    if (!res.success) throw new Error((res as any).error ?? 'Erreur de création');
    setModal(null);
    fetchPolicies(1);
  }

  async function handleEdit(data: Record<string, unknown>) {
    if (!modal?.policy) return;
    const res = await policyAPI.update(modal.policy.policyId, data);
    if (!res.success) throw new Error((res as any).error ?? 'Erreur de mise à jour');
    setModal(null);
    fetchPolicies(pagination.page);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await policyAPI.delete(deleteTarget.policyId, false);
      setDeleteTarget(null);
      fetchPolicies(pagination.page);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Polices d'assurance</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gérez toutes les polices de la plateforme</p>
        </div>
        <button
          onClick={() => { fetchClients(); setModal({ mode: 'create' }); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Nouvelle police
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Actives</p>
          <p className="text-2xl font-bold text-green-600">{totalActive}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Expirées</p>
          <p className="text-2xl font-bold text-gray-500">{totalExpired}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Annulées</p>
          <p className="text-2xl font-bold text-red-500">{totalCanceled}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 relative overflow-hidden">
          <p className="text-xs text-gray-500 mb-1">Expirent dans 30j</p>
          <p className="text-2xl font-bold text-amber-600">{expiringCount}</p>
          {expiringCount > 0 && (
            <AlertTriangle className="w-10 h-10 text-amber-200 absolute right-2 bottom-1" />
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-50">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher (numéro, client…)"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tous les types</option>
          {POLICY_TYPES.map(t => (
            <option key={t} value={t}>{POLICY_TYPE_LABELS[t]}</option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tous les statuts</option>
          <option value="ACTIVE">Active</option>
          <option value="EXPIRED">Expirée</option>
          <option value="CANCELED">Annulée</option>
          <option value="SUSPENDED">Suspendue</option>
        </select>

        <button
          onClick={() => fetchPolicies(pagination.page)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Police</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Période</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Prime</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Montant assuré</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Sinistres</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : policies.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                    <Shield className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                    <p>Aucune police trouvée</p>
                  </td>
                </tr>
              ) : (
                policies.map(policy => {
                  const expiring = isExpiringSoon(policy.endDate);
                  return (
                    <tr key={policy.policyId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs font-semibold text-gray-900">{policy.policyNumber}</div>
                        {policy.coverageType && (
                          <div className="text-xs text-gray-500 mt-0.5">{COVERAGE_TYPE_LABELS[policy.coverageType] ?? policy.coverageType}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {policy.client ? (
                          <div>
                            <div className="font-medium text-gray-900">{policy.client.firstName} {policy.client.lastName}</div>
                            <div className="text-xs text-gray-500">{policy.client.email}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <TypeBadge type={policy.policyType} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-gray-700">{fmtDate(policy.startDate)}</div>
                        <div className={`text-xs flex items-center gap-1 mt-0.5 ${expiring ? 'text-amber-600 font-medium' : 'text-gray-500'}`}>
                          {expiring && <AlertTriangle className="w-3 h-3" />}
                          {fmtDate(policy.endDate)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900 text-xs">
                        {fmt(policy.premiumAmount)}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-gray-600">
                        {fmt(policy.insuredAmount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${(policy._count?.claims ?? 0) > 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-500'}`}>
                          {policy._count?.claims ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={policy.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => { fetchClients(); setModal({ mode: 'edit', policy }); }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(policy)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              {((pagination.page - 1) * pagination.limit) + 1}–
              {Math.min(pagination.page * pagination.limit, pagination.total)} sur {pagination.total}
            </p>
            <div className="flex gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchPolicies(pagination.page - 1)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1.5 text-sm font-medium">
                {pagination.page} / {pagination.pages}
              </span>
              <button
                disabled={pagination.page >= pagination.pages}
                onClick={() => fetchPolicies(pagination.page + 1)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {modal && (
        <PolicyModal
          mode={modal.mode}
          initial={modal.policy}
          clients={clients}
          onClose={() => setModal(null)}
          onSubmit={modal.mode === 'create' ? handleCreate : handleEdit}
        />
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Supprimer la police</h3>
                <p className="text-sm text-gray-500">{deleteTarget.policyNumber}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Cette action est irréversible. Tous les sinistres liés à cette police seront également affectés.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Suppression…' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
