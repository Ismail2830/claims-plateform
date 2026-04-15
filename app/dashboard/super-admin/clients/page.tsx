'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAdminAuth } from '@/app/hooks/useAdminAuth';
import { clientAPI, type Client } from '@/app/lib/api/superAdminAPI';
import {
  UserCheck,
  Search,
  Plus,
  Edit,
  RefreshCw,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  X,
  ShieldAlert,
  FileText,
  Phone,
  Mail,
  MapPin,
  Calendar,
} from 'lucide-react';

// ─── Status styling ───────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
  ACTIVE:               'bg-green-100 text-green-800',
  INACTIVE:             'bg-gray-100  text-gray-600',
  SUSPENDED:            'bg-red-100   text-red-800',
  PENDING_VERIFICATION: 'bg-yellow-100 text-yellow-800',
  BLOCKED:              'bg-red-200   text-red-900',
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE:               'Actif',
  INACTIVE:             'Inactif',
  SUSPENDED:            'Suspendu',
  PENDING_VERIFICATION: 'En attente',
  BLOCKED:              'Bloqué',
};

// ─── Risk score badge ─────────────────────────────────────────────────────────
function riskLevel(score?: string): 'high' | 'medium' | 'low' {
  const s = (score ?? '').toLowerCase();
  if (s === 'high' || parseFloat(s) > 0.7) return 'high';
  if (s === 'medium' || parseFloat(s) > 0.4) return 'medium';
  return 'low';
}

function RiskBadge({ score }: { score?: string }) {
  const level = riskLevel(score);
  const label = level === 'high' ? 'Élevé' : level === 'medium' ? 'Moyen' : 'Faible';
  const color =
    level === 'high' ? 'bg-red-100 text-red-800' :
    level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
    'bg-green-100 text-green-800';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${color}`}>
      {label}
    </span>
  );
}

// ─── Verification icons ───────────────────────────────────────────────────────
function VerificationBadges({ email, phone, doc }: { email: boolean; phone: boolean; doc: boolean }) {
  return (
    <div className="flex items-center space-x-1.5">
      <span
        title={email ? 'Email vérifié' : 'Email non vérifié'}
        className={email ? 'text-green-500' : 'text-gray-300'}
      >
        <Mail className="w-4 h-4" />
      </span>
      <span
        title={phone ? 'Téléphone vérifié' : 'Téléphone non vérifié'}
        className={phone ? 'text-blue-500' : 'text-gray-300'}
      >
        <Phone className="w-4 h-4" />
      </span>
      <span
        title={doc ? 'Documents vérifiés' : 'Documents non vérifiés'}
        className={doc ? 'text-purple-500' : 'text-gray-300'}
      >
        <FileText className="w-4 h-4" />
      </span>
    </div>
  );
}

// ─── Create / Edit Modal ──────────────────────────────────────────────────────
interface ClientModalProps {
  mode: 'create' | 'edit';
  initial?: Client;
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
}

function ClientModal({ mode, initial, onClose, onSubmit }: ClientModalProps) {
  const [form, setForm] = useState({
    firstName:   initial?.firstName   ?? '',
    lastName:    initial?.lastName    ?? '',
    cin:         initial?.cin         ?? '',
    email:       initial?.email       ?? '',
    phone:       initial?.phone       ?? '',
    dateOfBirth: initial?.dateOfBirth ? initial.dateOfBirth.slice(0, 10) : '',
    address:     initial?.address     ?? '',
    city:        initial?.city        ?? '',
    province:    initial?.province    ?? '',
    postalCode:  initial?.postalCode  ?? '',
    status:      initial?.status      ?? 'ACTIVE',
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
      await onSubmit({ ...form });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/40" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <UserCheck className="w-5 h-5 text-green-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                {mode === 'create' ? 'Créer un client' : 'Modifier le client'}
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
            {/* Names */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                <input type="text" required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                  value={form.firstName} onChange={e => set('firstName', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                <input type="text" required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                  value={form.lastName} onChange={e => set('lastName', e.target.value)} />
              </div>
            </div>

            {/* CIN + DOB */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CIN</label>
                <input type="text" required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                  value={form.cin} onChange={e => set('cin', e.target.value)}
                  placeholder="Ex: AB123456" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date de naissance</label>
                <input type="date" required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                  value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} />
              </div>
            </div>

            {/* Email + Phone */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                  value={form.email} onChange={e => set('email', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                <input type="tel" required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                  value={form.phone} onChange={e => set('phone', e.target.value)}
                  placeholder="+212 6XX XXX XXX" />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
              <textarea rows={2} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm resize-none"
                value={form.address} onChange={e => set('address', e.target.value)} />
            </div>

            {/* City + Province + Postal */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
                <input type="text" required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                  value={form.city} onChange={e => set('city', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
                <input type="text" required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                  value={form.province} onChange={e => set('province', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code postal</label>
                <input type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                  value={form.postalCode} onChange={e => set('postalCode', e.target.value)} />
              </div>
            </div>

            {/* Status (edit only) */}
            {mode === 'edit' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                  value={form.status} onChange={e => set('status', e.target.value)}
                >
                  <option value="ACTIVE">Actif</option>
                  <option value="INACTIVE">Inactif</option>
                  <option value="SUSPENDED">Suspendu</option>
                  <option value="PENDING_VERIFICATION">En attente de vérification</option>
                  <option value="BLOCKED">Bloqué</option>
                </select>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-2">
              <button type="button" onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                Annuler
              </button>
              <button type="submit" disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors">
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

// ─── Client detail drawer ─────────────────────────────────────────────────────
function ClientDrawer({ client, onClose, onEdit }: { client: Client; onClose: () => void; onEdit: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-full max-w-md bg-white shadow-2xl flex flex-col overflow-y-auto">
        {/* Drawer header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Détails du client</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={onEdit}
              className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Modifier</span>
            </button>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Avatar + name */}
        <div className="flex items-center space-x-4 px-6 py-5 bg-gray-50 border-b border-gray-200">
          <div className="w-14 h-14 rounded-full bg-linear-to-br from-green-400 to-teal-600 flex items-center justify-center text-white text-xl font-bold shrink-0">
            {client.firstName.charAt(0)}{client.lastName.charAt(0)}
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">{client.firstName} {client.lastName}</p>
            <p className="text-sm text-gray-500">CIN: {client.cin}</p>
            <span className={`mt-1 inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[client.status] ?? 'bg-gray-100 text-gray-800'}`}>
              {STATUS_LABELS[client.status] ?? client.status}
            </span>
          </div>
        </div>

        <div className="flex-1 px-6 py-4 space-y-6">
          {/* Contact */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Contact</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                <div>
                  <p className="text-sm text-gray-900">{client.email}</p>
                  {client.emailVerified
                    ? <span className="text-xs text-green-600 flex items-center space-x-1"><CheckCircle className="w-3 h-3" /><span>Vérifié</span></span>
                    : <span className="text-xs text-gray-400">Non vérifié</span>}
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                <div>
                  <p className="text-sm text-gray-900">{client.phone}</p>
                  {client.phoneVerified
                    ? <span className="text-xs text-green-600 flex items-center space-x-1"><CheckCircle className="w-3 h-3" /><span>Vérifié</span></span>
                    : <span className="text-xs text-gray-400">Non vérifié</span>}
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                <p className="text-sm text-gray-900">{client.address}, {client.city}, {client.province} {client.postalCode}</p>
              </div>
              <div className="flex items-center space-x-3">
                <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                <p className="text-sm text-gray-900">
                  {new Date(client.dateOfBirth).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
          </section>

          {/* Stats */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Statistiques</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-blue-700">{client._count?.policies ?? 0}</p>
                <p className="text-xs text-blue-600 mt-0.5">Polices</p>
              </div>
              <div className="bg-orange-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-orange-700">{client._count?.claims ?? client.totalClaims ?? 0}</p>
                <p className="text-xs text-orange-600 mt-0.5">Sinistres</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-purple-700">
                  {(() => {
                    const raw = String(client.lifetimeValue ?? '').replace(/[^0-9.]/g, '');
                    const num = parseFloat(raw);
                    if (!raw || isNaN(num)) return '—';
                    return num >= 1000 ? `${Math.round(num / 1000)}k` : String(Math.round(num));
                  })()}
                </p>
                <p className="text-xs text-purple-600 mt-0.5">Valeur (MAD)</p>
              </div>
            </div>
          </section>

          {/* Risk */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Score de risque</h3>
            <div className="flex items-center space-x-3">
              <ShieldAlert className={`w-5 h-5 ${
                riskLevel(client.riskScore) === 'high' ? 'text-red-500' :
                riskLevel(client.riskScore) === 'medium' ? 'text-yellow-500' :
                'text-green-500'
              }`} />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-700">Risque global</span>
                  <RiskBadge score={client.riskScore} />
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      riskLevel(client.riskScore) === 'high' ? 'bg-red-500' :
                      riskLevel(client.riskScore) === 'medium' ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: riskLevel(client.riskScore) === 'high' ? '80%' : riskLevel(client.riskScore) === 'medium' ? '50%' : '20%' }}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Membership */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Adhésion</h3>
            <p className="text-sm text-gray-600">
              Membre depuis le{' '}
              <span className="font-medium text-gray-900">
                {new Date(client.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </span>
            </p>
            {client.lastLoginAt && (
              <p className="text-sm text-gray-600 mt-1">
                Dernière connexion:{' '}
                <span className="font-medium text-gray-900">
                  {new Date(client.lastLoginAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ClientsPage() {
  useAdminAuth();

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 10 });
  const [selected, setSelected] = useState<string[]>([]);

  const [showCreate, setShowCreate] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);

  // ── Stats ─────────────────────────────────────────────────────────────
  const activeCount   = clients.filter(c => c.status === 'ACTIVE').length;
  const suspendedCount = clients.filter(c => c.status === 'SUSPENDED').length;
  const pendingCount  = clients.filter(c => c.status === 'PENDING_VERIFICATION').length;

  // ── Load ──────────────────────────────────────────────────────────────
  const loadClients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await clientAPI.list({
        page: currentPage,
        limit: 10,
        search: searchTerm || undefined,
        status: filterStatus || undefined,
      });
      setClients(res.data?.clients ?? []);
      if (res.data?.pagination) setPagination(res.data.pagination);
    } catch (err) {
      console.error('Failed to load clients:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, filterStatus]);

  useEffect(() => { loadClients(); }, [loadClients]);

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleCreate = async (data: Record<string, unknown>) => {
    const res = await clientAPI.create(data);
    if (!res?.success) throw new Error(res?.error ?? 'Create failed');
    loadClients();
  };

  const handleUpdate = async (data: Record<string, unknown>) => {
    if (!editingClient) return;
    const res = await clientAPI.update(editingClient.clientId, data);
    if (!res?.success) throw new Error(res?.error ?? 'Update failed');
    setViewingClient(null);
    loadClients();
  };

  const handleBulkActivate = async () => {
    if (!selected.length) return;
    await clientAPI.bulkAction('activate', selected);
    setSelected([]);
    loadClients();
  };

  const handleBulkSuspend = async () => {
    if (!selected.length) return;
    await clientAPI.bulkAction('suspend', selected);
    setSelected([]);
    loadClients();
  };

  const toggleSelect = (id: string) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const toggleAll = () =>
    setSelected(prev => prev.length === clients.length ? [] : clients.map(c => c.clientId));

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gérez tous les comptes clients assurés de la plateforme
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Nouveau client</span>
        </button>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-green-50 rounded-xl p-4 border border-green-100">
          <p className="text-2xl font-bold text-green-700">{pagination.total}</p>
          <p className="text-xs text-green-600 mt-0.5">Total clients</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
          <p className="text-2xl font-bold text-emerald-700">{activeCount}</p>
          <p className="text-xs text-emerald-600 mt-0.5">Actifs (page)</p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-100">
          <p className="text-2xl font-bold text-yellow-700">{pendingCount}</p>
          <p className="text-xs text-yellow-600 mt-0.5">En attente</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4 border border-red-100">
          <p className="text-2xl font-bold text-red-700">{suspendedCount}</p>
          <p className="text-xs text-red-600 mt-0.5">Suspendus</p>
        </div>
      </div>

      {/* ── Controls ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border-b border-gray-100">
          {/* Search */}
          <form
            className="relative flex-1 max-w-sm"
            onSubmit={e => { e.preventDefault(); setCurrentPage(1); loadClients(); }}
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, email, CIN..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </form>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          >
            <option value="">Tous les statuts</option>
            <option value="ACTIVE">Actif</option>
            <option value="INACTIVE">Inactif</option>
            <option value="SUSPENDED">Suspendu</option>
            <option value="PENDING_VERIFICATION">En attente</option>
            <option value="BLOCKED">Bloqué</option>
          </select>

          <button
            onClick={() => { setCurrentPage(1); loadClients(); }}
            disabled={loading}
            className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </button>
        </div>

        {/* Bulk actions bar */}
        {selected.length > 0 && (
          <div className="flex items-center space-x-3 px-4 py-2 bg-green-50 border-b border-green-100">
            <span className="text-sm text-green-700 font-medium">{selected.length} sélectionné(s)</span>
            <button onClick={handleBulkActivate}
              className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors">
              Activer
            </button>
            <button onClick={handleBulkSuspend}
              className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors">
              Suspendre
            </button>
          </div>
        )}

        {/* ── Table ── */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 w-10">
                  <input type="checkbox" className="rounded border-gray-300 text-green-600"
                    checked={selected.length === clients.length && clients.length > 0}
                    onChange={toggleAll} />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Vérification</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Polices</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Sinistres</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Score risque</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Ville</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && clients.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <div className="flex items-center justify-center space-x-2 text-gray-400">
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span className="text-sm">Chargement...</span>
                    </div>
                  </td>
                </tr>
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center space-y-3">
                      <UserCheck className="w-10 h-10 text-gray-300" />
                      <p className="text-sm text-gray-500">Aucun client trouvé</p>
                      <button onClick={() => setShowCreate(true)}
                        className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">
                        Créer le premier client
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                clients.map(client => (
                  <tr
                    key={client.clientId}
                    className={`transition-colors hover:bg-gray-50 cursor-pointer ${
                      selected.includes(client.clientId) ? 'bg-green-50/60' : ''
                    }`}
                    onClick={() => setViewingClient(client)}
                  >
                    {/* Checkbox */}
                    <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" className="rounded border-gray-300 text-green-600"
                        checked={selected.includes(client.clientId)}
                        onChange={() => toggleSelect(client.clientId)} />
                    </td>

                    {/* Client */}
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-full bg-linear-to-br from-green-400 to-teal-500 flex items-center justify-center text-white text-sm font-semibold shrink-0">
                          {client.firstName.charAt(0)}{client.lastName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {client.firstName} {client.lastName}
                          </p>
                          <p className="text-xs text-gray-500">{client.email}</p>
                          <p className="text-xs text-gray-400">{client.phone}</p>
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[client.status] ?? 'bg-gray-100 text-gray-800'}`}>
                        {STATUS_LABELS[client.status] ?? client.status}
                      </span>
                    </td>

                    {/* Verification */}
                    <td className="px-4 py-4">
                      <VerificationBadges
                        email={client.emailVerified}
                        phone={client.phoneVerified}
                        doc={client.documentVerified}
                      />
                    </td>

                    {/* Policies */}
                    <td className="px-4 py-4 text-sm text-gray-700 font-medium">
                      {client._count?.policies ?? 0}
                    </td>

                    {/* Claims */}
                    <td className="px-4 py-4 text-sm text-gray-700 font-medium">
                      {client._count?.claims ?? client.totalClaims ?? 0}
                    </td>

                    {/* Risk score */}
                    <td className="px-4 py-4">
                      <RiskBadge score={client.riskScore} />
                    </td>

                    {/* City */}
                    <td className="px-4 py-4 text-sm text-gray-500">
                      {client.city}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => { setEditingClient(client); setViewingClient(null); }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {client.emailVerified ? (
                          <span title="Email vérifié" className="p-1.5 text-green-500">
                            <CheckCircle className="w-4 h-4" />
                          </span>
                        ) : (
                          <span title="Email non vérifié" className="p-1.5 text-gray-300">
                            <XCircle className="w-4 h-4" />
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              {((pagination.page - 1) * pagination.limit) + 1}–
              {Math.min(pagination.page * pagination.limit, pagination.total)} sur {pagination.total} clients
            </p>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-700">
                Page {pagination.page} / {pagination.pages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(pagination.pages, p + 1))}
                disabled={currentPage === pagination.pages}
                className="p-1.5 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals & Drawer ── */}
      {showCreate && (
        <ClientModal
          mode="create"
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreate}
        />
      )}
      {editingClient && (
        <ClientModal
          mode="edit"
          initial={editingClient}
          onClose={() => setEditingClient(null)}
          onSubmit={handleUpdate}
        />
      )}
      {viewingClient && !editingClient && (
        <ClientDrawer
          client={viewingClient}
          onClose={() => setViewingClient(null)}
          onEdit={() => { setEditingClient(viewingClient); setViewingClient(null); }}
        />
      )}
    </div>
  );
}
