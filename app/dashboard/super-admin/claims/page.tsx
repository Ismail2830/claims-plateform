'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ClaimDetailPanel } from '@/app/components/dashboard/claims/ClaimDetailPanel';
import { useAdminAuth } from '@/app/hooks/useAdminAuth';
import { claimAPI, type Claim } from '@/app/lib/api/superAdminAPI';
import {
  FileText,
  Search,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  User,
  Shield,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────
const CLAIM_TYPE_LABELS: Record<string, string> = {
  ACCIDENT:     'Accident',
  THEFT:        'Vol',
  FIRE:         'Incendie',
  WATER_DAMAGE: 'Dégât des eaux',
};

const CLAIM_TYPE_COLORS: Record<string, string> = {
  ACCIDENT:     'bg-red-100 text-red-800',
  THEFT:        'bg-purple-100 text-purple-800',
  FIRE:         'bg-orange-100 text-orange-800',
  WATER_DAMAGE: 'bg-blue-100 text-blue-800',
};

const STATUS_LABELS: Record<string, string> = {
  DECLARED:       'Déclaré',
  ANALYZING:      'Analyse',
  DOCS_REQUIRED:  'Docs requis',
  UNDER_EXPERTISE:'En expertise',
  IN_DECISION:    'Décision',
  APPROVED:       'Approuvé',
  IN_PAYMENT:     'En paiement',
  CLOSED:         'Clôturé',
  REJECTED:       'Rejeté',
};

const STATUS_COLORS: Record<string, string> = {
  DECLARED:       'bg-gray-100 text-gray-700',
  ANALYZING:      'bg-blue-100 text-blue-800',
  DOCS_REQUIRED:  'bg-yellow-100 text-yellow-800',
  UNDER_EXPERTISE:'bg-indigo-100 text-indigo-800',
  IN_DECISION:    'bg-purple-100 text-purple-800',
  APPROVED:       'bg-green-100 text-green-800',
  IN_PAYMENT:     'bg-teal-100 text-teal-800',
  CLOSED:         'bg-gray-200 text-gray-600',
  REJECTED:       'bg-red-100 text-red-800',
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Faible', NORMAL: 'Normal', HIGH: 'Haute', URGENT: 'Urgent',
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW:    'bg-gray-100 text-gray-600',
  NORMAL: 'bg-blue-100 text-blue-700',
  HIGH:   'bg-amber-100 text-amber-800',
  URGENT: 'bg-red-100 text-red-800',
};

const ALL_STATUSES = ['DECLARED','ANALYZING','DOCS_REQUIRED','UNDER_EXPERTISE','IN_DECISION','APPROVED','IN_PAYMENT','CLOSED','REJECTED'] as const;
const ALL_PRIORITIES = ['LOW','NORMAL','HIGH','URGENT'] as const;
const ALL_CLAIM_TYPES = ['ACCIDENT','THEFT','FIRE','WATER_DAMAGE'] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(amount?: number | string | null) {
  const n = parseFloat(String(amount ?? 0));
  return isNaN(n) || n === 0 ? '—' : n.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD', minimumFractionDigits: 0 });
}

function fmtDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-MA', { day: '2-digit', month: 'short', year: 'numeric' });
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${CLAIM_TYPE_COLORS[type] ?? 'bg-gray-100 text-gray-700'}`}>
      {CLAIM_TYPE_LABELS[type] ?? type}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${PRIORITY_COLORS[priority] ?? 'bg-gray-100 text-gray-700'}`}>
      {PRIORITY_LABELS[priority] ?? priority}
    </span>
  );
}

const ROLE_LABELS: Record<string, string> = {
  EXPERT:           'Expert',
  MANAGER_JUNIOR:   'Manager Junior',
  MANAGER_SENIOR:   'Manager Senior',
  ADMIN:            'Admin',
  SUPER_ADMIN:      'Super Admin',
};
function roleLabel(role?: string) {
  return role ? (ROLE_LABELS[role] ?? role) : '';
}
interface ClaimEditModalProps {
  claim: Claim;
  experts: { userId: string; firstName: string; lastName: string; role: string }[];
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
}

function ClaimEditModal({ claim, experts, onClose, onSubmit }: ClaimEditModalProps) {
  const [form, setForm] = useState({
    status:           claim.status,
    priority:         claim.priority,
    claimType:        claim.claimType,
    incidentLocation: claim.incidentLocation ?? '',
    description:      claim.description ?? '',
    claimedAmount:    String(claim.claimedAmount ?? ''),
    estimatedAmount:  String(claim.estimatedAmount ?? ''),
    approvedAmount:   String(claim.approvedAmount ?? ''),
    assignedTo:       claim.assignedTo ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  function set(k: string, v: string) {
    setForm(f => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload: Record<string, unknown> = { ...form };
      // Convert empty strings
      if (!form.assignedTo) payload.assignedTo = null;
      if (!form.claimedAmount) payload.claimedAmount = null;
      if (!form.estimatedAmount) payload.estimatedAmount = null;
      if (!form.approvedAmount) payload.approvedAmount = null;
      await onSubmit(payload);
    } catch (err: any) {
      setError(err.message ?? 'Erreur inattendue');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Modifier le sinistre</h2>
            <p className="text-xs text-gray-500 font-mono">{claim.claimNumber}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
              <select
                value={form.status}
                onChange={e => set('status', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ALL_STATUSES.map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priorité</label>
              <select
                value={form.priority}
                onChange={e => set('priority', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ALL_PRIORITIES.map(p => (
                  <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type de sinistre</label>
              <select
                value={form.claimType}
                onChange={e => set('claimType', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ALL_CLAIM_TYPES.map(t => (
                  <option key={t} value={t}>{CLAIM_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assigné à</label>
              <select
                value={form.assignedTo}
                onChange={e => set('assignedTo', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Non assigné —</option>
                {experts.map(e => (
                  <option key={e.userId} value={e.userId}>
                    {e.firstName} {e.lastName} — {roleLabel(e.role)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lieu de l'incident</label>
            <input
              type="text"
              value={form.incidentLocation}
              onChange={e => set('incidentLocation', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={e => set('description', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Montant déclaré (MAD)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.claimedAmount}
                onChange={e => set('claimedAmount', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Montant estimé (MAD)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.estimatedAmount}
                onChange={e => set('estimatedAmount', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Montant approuvé (MAD)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.approvedAmount}
                onChange={e => set('approvedAmount', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Enregistrement…' : 'Mettre à jour'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Create Modal ─────────────────────────────────────────────────────────────
interface ClaimCreateModalProps {
  clients: { clientId: string; firstName: string; lastName: string; email: string }[];
  policies: { policyId: string; policyNumber: string; clientId: string }[];
  experts: { userId: string; firstName: string; lastName: string }[];
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
}

function ClaimCreateModal({ clients, policies, experts, onClose, onSubmit }: ClaimCreateModalProps) {
  const [form, setForm] = useState({
    clientId:         '',
    policyId:         '',
    claimType:        'ACCIDENT' as string,
    incidentDate:     '',
    incidentLocation: '',
    description:      '',
    damageDescription:'',
    claimedAmount:    '',
    priority:         'NORMAL' as string,
    assignedTo:       '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  function set(k: string, v: string) {
    setForm(f => ({ ...f, [k]: v }));
  }

  const clientPolicies = policies.filter(p => p.clientId === form.clientId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload: Record<string, unknown> = {
        clientId:         form.clientId,
        claimType:        form.claimType,
        incidentDate:     form.incidentDate,
        description:      form.description,
        priority:         form.priority,
      };
      if (form.policyId)          payload.policyId          = form.policyId;
      if (form.incidentLocation)  payload.incidentLocation  = form.incidentLocation;
      if (form.damageDescription) payload.damageDescription = form.damageDescription;
      if (form.claimedAmount)     payload.claimedAmount     = parseFloat(form.claimedAmount);
      if (form.assignedTo)        payload.assignedTo        = form.assignedTo;
      await onSubmit(payload);
    } catch (err: any) {
      setError(err.message ?? 'Erreur inattendue');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-gray-900">Nouveau sinistre</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
            <select
              required
              value={form.clientId}
              onChange={e => { set('clientId', e.target.value); set('policyId', ''); }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Sélectionner un client</option>
              {clients.map(c => (
                <option key={c.clientId} value={c.clientId}>{c.firstName} {c.lastName} ({c.email})</option>
              ))}
            </select>
          </div>

          {form.clientId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Police (optionnel)</label>
              <select
                value={form.policyId}
                onChange={e => set('policyId', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Sans police —</option>
                {clientPolicies.map(p => (
                  <option key={p.policyId} value={p.policyId}>{p.policyNumber}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
              <select
                required
                value={form.claimType}
                onChange={e => set('claimType', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ALL_CLAIM_TYPES.map(t => (
                  <option key={t} value={t}>{CLAIM_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priorité</label>
              <select
                value={form.priority}
                onChange={e => set('priority', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ALL_PRIORITIES.map(p => (
                  <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date de l'incident *</label>
              <input
                required
                type="date"
                value={form.incidentDate}
                onChange={e => set('incidentDate', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Montant déclaré (MAD)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.claimedAmount}
                onChange={e => set('claimedAmount', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lieu de l'incident</label>
            <input
              type="text"
              value={form.incidentLocation}
              onChange={e => set('incidentLocation', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <textarea
              required
              rows={3}
              value={form.description}
              onChange={e => set('description', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assigné à</label>
            <select
              value={form.assignedTo}
              onChange={e => set('assignedTo', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— Non assigné —</option>
              {experts.map(e => (
                <option key={e.userId} value={e.userId}>{e.firstName} {e.lastName} — {roleLabel(e.role)}</option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Création…' : 'Créer le sinistre'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ClaimsPage() {
  useAdminAuth();

  const [claims, setClaims]         = useState<Claim[]>([]);
  const [loading, setLoading]       = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, pages: 1 });
  const [stats, setStats]           = useState<any[]>([]);

  // Filters
  const [search, setSearch]           = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterType, setFilterType]   = useState('');

  // Modal
  const [createModal, setCreateModal] = useState(false);
  const [editTarget, setEditTarget]   = useState<Claim | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Claim | null>(null);
  const [deleting, setDeleting]       = useState(false);
  const [panelClaimId, setPanelClaimId] = useState<string | null>(null);

  // Supporting data
  const [clients, setClients]   = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [experts, setExperts]   = useState<any[]>([]);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchClaims = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await claimAPI.list({
        page,
        limit: pagination.limit,
        search: search || undefined,
        status: filterStatus || undefined,
        priority: filterPriority || undefined,
        claimType: filterType || undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      const d = res.data;
      const list = d?.claims ?? d?.items ?? [];
      setClaims(Array.isArray(list) ? list : []);
      if (d?.pagination) setPagination(p => ({ ...p, ...d.pagination, page }));
      if (d?.stats) setStats(d.stats);
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus, filterPriority, filterType, pagination.limit]);

  const fetchSupportingData = useCallback(async () => {
    try {
      const [clientsRes, policiesRes, expertsRes] = await Promise.all([
        fetch('/api/super-admin/clients?limit=200&sortBy=firstName&sortOrder=asc').then(r => r.json()),
        fetch('/api/super-admin/policies?limit=500&status=ACTIVE').then(r => r.json()),
        fetch('/api/super-admin/users?limit=100').then(r => r.json()),
      ]);
      const cList = clientsRes?.data?.clients ?? clientsRes?.data?.items ?? [];
      const pList = policiesRes?.data?.policies ?? policiesRes?.data?.items ?? [];
      const uList = expertsRes?.data?.users ?? expertsRes?.data?.items ?? [];
      setClients(Array.isArray(cList) ? cList : []);
      setPolicies(Array.isArray(pList) ? pList : []);
      setExperts(Array.isArray(uList) ? uList.filter((u: any) => ['EXPERT','MANAGER_JUNIOR','MANAGER_SENIOR'].includes(u.role)) : []);
    } catch {}
  }, []);

  useEffect(() => { fetchClaims(1); }, [search, filterStatus, filterPriority, filterType]);
  useEffect(() => { fetchSupportingData(); }, []);

  // ── Stats cards ───────────────────────────────────────────────────────────
  const countByStatus = (s: string) => stats.filter(x => x.status === s).reduce((a, c) => a + (c._count ?? 0), 0);
  const open   = stats.filter(x => !['CLOSED','REJECTED'].includes(x.status)).reduce((a, c) => a + (c._count ?? 0), 0);
  const approved = countByStatus('APPROVED') + countByStatus('IN_PAYMENT');
  const rejected = countByStatus('REJECTED');
  const urgent = stats.filter(x => x.priority === 'URGENT').reduce((a, c) => a + (c._count ?? 0), 0);

  // ── CRUD handlers ────────────────────────────────────────────────────────
  async function handleCreate(data: Record<string, unknown>) {
    const res = await claimAPI.create(data);
    if (!res.success) throw new Error((res as any).error ?? 'Erreur de création');
    setCreateModal(false);
    fetchClaims(1);
  }

  async function handleEdit(data: Record<string, unknown>) {
    if (!editTarget) return;
    const res = await claimAPI.update(editTarget.claimId, data);
    if (!res.success) throw new Error((res as any).error ?? 'Erreur de mise à jour');
    setEditTarget(null);
    fetchClaims(pagination.page);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await claimAPI.delete(deleteTarget.claimId, false);
      setDeleteTarget(null);
      fetchClaims(pagination.page);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sinistres</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gérez tous les sinistres de la plateforme</p>
        </div>
        <button
          onClick={() => { fetchSupportingData(); setCreateModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Nouveau sinistre
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Dossiers ouverts</p>
          <p className="text-2xl font-bold text-blue-600">{open}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Approuvés / En paiement</p>
          <p className="text-2xl font-bold text-green-600">{approved}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Rejetés</p>
          <p className="text-2xl font-bold text-red-500">{rejected}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 relative overflow-hidden">
          <p className="text-xs text-gray-500 mb-1">Urgents</p>
          <p className="text-2xl font-bold text-rose-600">{urgent}</p>
          {urgent > 0 && <AlertTriangle className="w-10 h-10 text-rose-200 absolute right-2 bottom-1" />}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-50">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher (numéro, client, description…)"
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
          {ALL_CLAIM_TYPES.map(t => (
            <option key={t} value={t}>{CLAIM_TYPE_LABELS[t]}</option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tous les statuts</option>
          {ALL_STATUSES.map(s => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>

        <select
          value={filterPriority}
          onChange={e => setFilterPriority(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Toutes priorités</option>
          {ALL_PRIORITIES.map(p => (
            <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
          ))}
        </select>

        <button
          onClick={() => fetchClaims(pagination.page)}
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
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Sinistre</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Police</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date incident</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Montant</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Assigné</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Priorité</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 10 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : claims.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-gray-400">
                    <FileText className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                    <p>Aucun sinistre trouvé</p>
                  </td>
                </tr>
              ) : (
                claims.map(claim => (
                  <tr
                    key={claim.claimId}
                    className={`hover:bg-gray-50 transition-colors cursor-pointer${panelClaimId === claim.claimId ? ' bg-blue-50 hover:bg-blue-50' : ''}`}
                    onClick={() => setPanelClaimId(claim.claimId)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs font-semibold text-gray-900">{claim.claimNumber}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{fmtDate(claim.declarationDate)}</div>
                    </td>
                    <td className="px-4 py-3">
                      {claim.client ? (
                        <div>
                          <div className="font-medium text-gray-900 text-xs">{claim.client.firstName} {claim.client.lastName}</div>
                          <div className="text-xs text-gray-500">{claim.client.email}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {claim.policy ? (
                        <div>
                          <div className="font-mono text-xs text-gray-700">{claim.policy.policyNumber}</div>
                          <div className="text-xs text-gray-500">{claim.policy.policyType}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <TypeBadge type={claim.claimType} />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700">
                      {fmtDate(claim.incidentDate)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="text-xs font-medium text-gray-900">{fmt(claim.claimedAmount)}</div>
                      {claim.approvedAmount && parseFloat(String(claim.approvedAmount)) > 0 && (
                        <div className="text-xs text-green-600">→ {fmt(claim.approvedAmount)}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {claim.assignedUser ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                            <span className="text-xs font-semibold text-blue-700">
                              {claim.assignedUser.firstName.charAt(0)}{claim.assignedUser.lastName.charAt(0)}
                            </span>
                          </div>
                          <span className="text-xs text-gray-700 truncate max-w-20">
                            {claim.assignedUser.firstName}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Non assigné</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <PriorityBadge priority={claim.priority} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={claim.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditTarget(claim); }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget(claim); }}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
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
                onClick={() => fetchClaims(pagination.page - 1)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1.5 text-sm font-medium">
                {pagination.page} / {pagination.pages}
              </span>
              <button
                disabled={pagination.page >= pagination.pages}
                onClick={() => fetchClaims(pagination.page + 1)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {createModal && (
        <ClaimCreateModal
          clients={clients}
          policies={policies}
          experts={experts}
          onClose={() => setCreateModal(false)}
          onSubmit={handleCreate}
        />
      )}

      {/* Edit Modal */}
      {editTarget && (
        <ClaimEditModal
          claim={editTarget}
          experts={experts}
          onClose={() => setEditTarget(null)}
          onSubmit={handleEdit}
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
                <h3 className="font-semibold text-gray-900">Supprimer le sinistre</h3>
                <p className="text-sm text-gray-500 font-mono">{deleteTarget.claimNumber}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Cette action supprimera définitivement le sinistre et tous ses documents et commentaires associés.
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

      {/* Detail Panel */}
      <ClaimDetailPanel
        claimId={panelClaimId}
        onClose={() => setPanelClaimId(null)}
        onUpdated={() => fetchClaims(pagination.page)}
      />
    </div>
  );
}
