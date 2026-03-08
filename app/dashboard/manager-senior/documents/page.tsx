'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  FolderOpen,
  FileText,
  HardDrive,
  AlertTriangle,
  Clock,
  Upload,
  CheckCircle,
  XCircle,
  Download,
  Archive,
  Eye,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
} from 'lucide-react';
import { useAdminAuth } from '@/app/hooks/useAdminAuth';
import RoleBasedLayout from '@/components/layout/RoleBasedLayout';
import { DocumentPreviewPanel } from '@/app/components/dashboard/documents/DocumentPreviewPanel';
import { UploadDocumentModal } from '@/app/components/dashboard/documents/UploadDocumentModal';
import { DocumentCategoryBadge } from '@/app/components/dashboard/documents/DocumentCategoryBadge';
import { DocumentStatusBadge } from '@/app/components/dashboard/documents/DocumentStatusBadge';
import { fmtRelativeTime } from '@/app/components/dashboard/documents/document-utils';
import {
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_STATUS_CONFIG,
  UPLOAD_SOURCE_LABELS,
  type DocumentType,
  type DocumentStatus,
  type UploadSource,
} from '@/app/lib/document-maps';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DocRow {
  documentId:   string;
  originalName: string;
  fileName:     string;
  fileType:     DocumentType;
  mimeType:     string;
  fileSize:     number;
  filePath:     string;
  status:       DocumentStatus;
  uploadedVia:  UploadSource;
  createdAt:    string;
  claim: {
    claimId:     string;
    claimNumber: string;
    claimType:   string;
    client:      { clientId: string; firstName: string; lastName: string } | null;
  } | null;
  uploadedByUser:      { userId: string; firstName: string; lastName: string } | null;
  uploadedByClientRef: { clientId: string; firstName: string; lastName: string } | null;
}

interface Stats {
  total:           number;
  totalSizeBytes:  number;
  pending:         number;
  processing:      number;
  expired:         number;
  pendingResubmit: number;
  byStatus:        Record<string, number>;
}

interface MissingInfo {
  claimId:     string;
  claimNumber: string;
  clientName:  string;
  missing:     DocumentType[];
  complete:    boolean;
}

type TabKey = 'ALL' | 'UPLOADED' | 'PROCESSING' | 'VERIFIED' | 'REJECTED' | 'PENDING_RESUBMIT' | 'EXPIRED';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'ALL',              label: 'Tous',           icon: <FolderOpen    className="w-3.5 h-3.5" /> },
  { key: 'UPLOADED',         label: 'En attente',      icon: <Clock         className="w-3.5 h-3.5" /> },
  { key: 'PROCESSING',       label: 'En examen',       icon: <RefreshCw     className="w-3.5 h-3.5" /> },
  { key: 'VERIFIED',         label: 'Vérifiés',        icon: <CheckCircle   className="w-3.5 h-3.5" /> },
  { key: 'REJECTED',         label: 'Rejetés',         icon: <XCircle       className="w-3.5 h-3.5" /> },
  { key: 'PENDING_RESUBMIT', label: 'A re-soumettre',  icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  { key: 'EXPIRED',          label: 'Expirés',         icon: <AlertTriangle className="w-3.5 h-3.5" /> },
];

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon, label, value, sub, color, pulse,
}: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string; pulse?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className={cn('text-2xl font-black text-gray-900 leading-tight mt-0.5', pulse && 'animate-pulse text-orange-600')}>
          {value}
        </p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Row skeleton ──────────────────────────────────────────────────────────────

function RowSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: 8 }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className={cn('h-4 bg-gray-100 rounded animate-pulse', j === 0 ? 'w-4' : '')} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ManagerSeniorDocumentsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, logout } = useAdminAuth();

  const [docs,         setDocs]         = useState<DocRow[]>([]);
  const [stats,        setStats]        = useState<Stats | null>(null);
  const [pagination,   setPagination]   = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [loading,      setLoading]      = useState(true);
  const [activeTab,    setActiveTab]    = useState<TabKey>('ALL');
  const [search,       setSearch]       = useState('');
  const [filterType,   setFilterType]   = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [dateFrom,     setDateFrom]     = useState('');
  const [dateTo,       setDateTo]       = useState('');
  const [sortBy,       setSortBy]       = useState<'createdAt' | 'fileSize' | 'fileName' | 'status'>('createdAt');
  const [sortOrder,    setSortOrder]    = useState<'asc' | 'desc'>('desc');
  const [selected,     setSelected]     = useState<Set<string>>(new Set());
  const [panelDocId,   setPanelDocId]   = useState<string | null>(null);
  const [uploadModal,  setUploadModal]  = useState(false);
  const [missing,      setMissing]      = useState<MissingInfo[]>([]);
  const [missingOpen,  setMissingOpen]  = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  React.useEffect(() => {
    if (!authLoading && !user) router.push('/auth/admin?reason=session_expired');
  }, [authLoading, user, router]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/documents/stats', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) setStats(await res.json() as Stats);
    } catch { /* non-fatal */ }
  }, [token]);

  const fetchDocs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(20) });
      if (activeTab !== 'ALL')  params.set('status',      activeTab);
      else if (filterStatus)    params.set('status',      filterStatus);
      if (search)       params.set('search',      search);
      if (filterType)   params.set('fileType',    filterType);
      if (filterSource) params.set('uploadedVia', filterSource);
      if (dateFrom)     params.set('dateFrom',    dateFrom);
      if (dateTo)       params.set('dateTo',      dateTo);

      const res = await fetch(`/api/documents?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json() as { documents: DocRow[]; pagination: typeof pagination };
        setDocs(data.documents ?? []);
        setPagination(p => ({ ...p, ...data.pagination, page }));
      }
    } finally {
      setLoading(false);
    }
  }, [activeTab, search, filterType, filterStatus, filterSource, dateFrom, dateTo, token]);

  useEffect(() => {
    fetchDocs(1);
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, search, filterType, filterStatus, filterSource, dateFrom, dateTo]);

  useEffect(() => {
    refreshRef.current = setInterval(() => { fetchDocs(pagination.page); fetchStats(); }, 30000);
    return () => { if (refreshRef.current) clearInterval(refreshRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page]);

  const fetchMissing = useCallback(async () => {
    try {
      const res = await fetch('/api/super-admin/claims?status=DOCS_REQUIRED&limit=50', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return;
      const data = await res.json() as {
        data?: { claims?: { claimId: string; claimNumber: string; client?: { firstName: string; lastName: string } }[] };
        claims?: { claimId: string; claimNumber: string; client?: { firstName: string; lastName: string } }[];
      };
      const claimList = data.data?.claims ?? data.claims ?? [];
      const results = await Promise.allSettled(
        claimList.map(c =>
          fetch(`/api/documents/missing/${c.claimId}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }).then(r => r.json() as Promise<{ missing: DocumentType[]; complete: boolean }>),
        ),
      );
      const infos: MissingInfo[] = [];
      results.forEach((r, i) => {
        const cl = claimList[i];
        if (r.status === 'fulfilled' && r.value.missing.length > 0) {
          infos.push({
            claimId:     cl.claimId,
            claimNumber: cl.claimNumber,
            clientName:  cl.client ? `${cl.client.firstName} ${cl.client.lastName}` : '—',
            missing:     r.value.missing,
            complete:    r.value.complete,
          });
        }
      });
      setMissing(infos);
    } catch { /* non-fatal */ }
  }, [token]);

  useEffect(() => { fetchMissing(); }, [fetchMissing]);

  function handleRefresh() { fetchDocs(pagination.page); fetchStats(); fetchMissing(); }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  function toggleAll() {
    if (selected.size === docs.length) setSelected(new Set());
    else setSelected(new Set(docs.map(d => d.documentId)));
  }

  async function bulkVerify() {
    await Promise.allSettled(
      [...selected].map(id =>
        fetch(`/api/documents/${id}/status`, {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body:    JSON.stringify({ status: 'VERIFIED' }),
        }),
      ),
    );
    setSelected(new Set());
    handleRefresh();
  }

  async function bulkArchive() {
    await Promise.allSettled(
      [...selected].map(id =>
        fetch(`/api/documents/${id}`, {
          method:  'DELETE',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }),
      ),
    );
    setSelected(new Set());
    handleRefresh();
  }

  function sortedDocs() {
    return [...docs].sort((a, b) => {
      let av: string | number = a.createdAt;
      let bv: string | number = b.createdAt;
      if (sortBy === 'fileSize') { av = a.fileSize;     bv = b.fileSize; }
      if (sortBy === 'fileName') { av = a.originalName; bv = b.originalName; }
      if (sortBy === 'status')   { av = a.status;       bv = b.status; }
      if (av < bv) return sortOrder === 'asc' ? -1 : 1;
      if (av > bv) return sortOrder === 'asc' ? 1  : -1;
      return 0;
    });
  }

  function handleSort(col: typeof sortBy) {
    if (sortBy === col) setSortOrder(o => (o === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(col); setSortOrder('asc'); }
  }

  function fmtStorage(bytes: number) {
    if (bytes < 1_048_576)     return `${(bytes / 1024).toFixed(1)} Ko`;
    if (bytes < 1_073_741_824) return `${(bytes / 1_048_576).toFixed(1)} Mo`;
    return `${(bytes / 1_073_741_824).toFixed(2)} Go`;
  }

  function tabCount(key: TabKey): number | undefined {
    if (!stats) return undefined;
    if (key === 'ALL') return stats.total;
    return stats.byStatus?.[key];
  }

  const typeSorted = (
    Object.entries(DOCUMENT_TYPE_LABELS) as [DocumentType, string][]
  ).sort((a, b) => a[1].localeCompare(b[1]));

  if (authLoading || !user) return null;

  return (
    <RoleBasedLayout role="MANAGER_SENIOR" user={user} onLogout={logout}>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-screen-2xl mx-auto px-6 py-8 space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Documents</h1>
                <p className="text-xs text-gray-400">Gestion centralisée de tous les documents de la plateforme</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white border border-gray-200 rounded-lg"
                title="Actualiser"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setUploadModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
              >
                <Upload className="w-4 h-4" />
                Uploader un document
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              icon={FileText}
              label="Total documents"
              value={stats?.total ?? '—'}
              color="bg-blue-100 text-blue-600"
            />
            <KpiCard
              icon={HardDrive}
              label="Stockage utilisé"
              value={stats ? fmtStorage(stats.totalSizeBytes) : '—'}
              color="bg-purple-100 text-purple-600"
            />
            <KpiCard
              icon={Clock}
              label="En attente"
              value={stats ? (stats.pending + stats.processing) : '—'}
              sub={stats ? `${stats.pending} uploadés · ${stats.processing} en examen` : undefined}
              color="bg-orange-100 text-orange-600"
              pulse={(stats?.pending ?? 0) + (stats?.processing ?? 0) > 0}
            />
            <KpiCard
              icon={AlertTriangle}
              label="Expirés / A re-soumettre"
              value={stats ? (stats.expired + stats.pendingResubmit) : '—'}
              sub={stats ? `${stats.expired} expirés · ${stats.pendingResubmit} rejet` : undefined}
              color="bg-red-100 text-red-600"
            />
          </div>

          {/* Missing docs alert */}
          {missing.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setMissingOpen(o => !o)}
                className="w-full flex items-center justify-between px-5 py-3 text-amber-800 hover:bg-amber-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-semibold">
                    {missing.length} dossier{missing.length !== 1 ? 's' : ''} avec documents manquants
                  </span>
                </div>
                <ChevronLeft className={cn('w-4 h-4 transition-transform', missingOpen ? '-rotate-90' : 'rotate-180')} />
              </button>
              {missingOpen && (
                <div className="border-t border-amber-200 divide-y divide-amber-100">
                  {missing.map(m => (
                    <div key={m.claimId} className="flex items-center gap-4 px-5 py-3">
                      <div className="shrink-0">
                        <a
                          href={`/dashboard/manager-senior/claims?id=${m.claimId}`}
                          className="text-sm font-mono font-semibold text-indigo-600 hover:underline"
                        >
                          {m.claimNumber}
                        </a>
                        <p className="text-xs text-gray-500">{m.clientName}</p>
                      </div>
                      <div className="flex-1 flex flex-wrap gap-1.5">
                        {m.missing.map(t => (
                          <span
                            key={t}
                            className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full"
                          >
                            {DOCUMENT_TYPE_LABELS[t] ?? t}
                          </span>
                        ))}
                      </div>
                      <button
                        onClick={() => router.push(`/dashboard/manager-senior/claims?id=${m.claimId}&action=notify`)}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Notifier WhatsApp
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-50 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Rechercher par nom, numéro de dossier, client..."
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="">Tous les types</option>
                {typeSorted.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="">Tous les statuts</option>
                {(Object.keys(DOCUMENT_STATUS_CONFIG) as DocumentStatus[]).map(s => (
                  <option key={s} value={s}>{DOCUMENT_STATUS_CONFIG[s].label}</option>
                ))}
              </select>
              <select
                value={filterSource}
                onChange={e => setFilterSource(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="">Toute source</option>
                {(Object.keys(UPLOAD_SOURCE_LABELS) as UploadSource[]).map(s => (
                  <option key={s} value={s}>{UPLOAD_SOURCE_LABELS[s]}</option>
                ))}
              </select>
              <input
                type="date" value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                title="Date de début"
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <input
                type="date" value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                title="Date de fin"
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <button
                onClick={() => {
                  setSearch(''); setFilterType(''); setFilterStatus('');
                  setFilterSource(''); setDateFrom(''); setDateTo('');
                }}
                className="px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Réinitialiser
              </button>
            </div>
            {!loading && (
              <p className="text-xs text-gray-400">
                {pagination.total} document{pagination.total !== 1 ? 's' : ''} trouvé{pagination.total !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Status tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setSelected(new Set()); }}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors',
                  activeTab === tab.key
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50',
                )}
              >
                {tab.icon}
                {tab.label}
                {tabCount(tab.key) !== undefined && (
                  <span className={cn(
                    'px-1.5 py-0.5 rounded-full text-xs font-bold leading-none',
                    activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500',
                  )}>
                    {tabCount(tab.key)}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Bulk action bar */}
          {selected.size > 0 && (
            <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
              <span className="text-sm font-semibold text-indigo-700">
                {selected.size} sélectionné{selected.size > 1 ? 's' : ''}
              </span>
              <div className="flex gap-2 ml-3">
                <button
                  onClick={bulkVerify}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Vérifier tout
                </button>
                <button
                  onClick={() => {
                    docs.filter(d => selected.has(d.documentId)).forEach(doc => {
                      const link = document.createElement('a');
                      link.href     = `/api/documents/file/${doc.filePath.replace(/^\/uploads\//, '')}`;
                      link.download = doc.originalName;
                      link.click();
                    });
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  Télécharger tout
                </button>
                <button
                  onClick={bulkArchive}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100"
                >
                  <Archive className="w-3.5 h-3.5" />
                  Archiver tout
                </button>
              </div>
              <button
                onClick={() => setSelected(new Set())}
                className="ml-auto text-xs text-indigo-500 hover:text-indigo-700"
              >
                Désélectionner
              </button>
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={docs.length > 0 && selected.size === docs.length}
                        onChange={toggleAll}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Dossier</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Uploadé par</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    <RowSkeleton />
                  ) : sortedDocs().length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-16 text-center">
                        <FolderOpen className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                        <p className="text-sm font-medium text-gray-400">Aucun document trouvé</p>
                        <p className="text-xs text-gray-300 mt-1">Modifiez les filtres ou uploadez un nouveau document</p>
                      </td>
                    </tr>
                  ) : (
                    sortedDocs().map(doc => {
                      const uploader = doc.uploadedByUser
                        ? `${doc.uploadedByUser.firstName} ${doc.uploadedByUser.lastName}`
                        : doc.uploadedByClientRef
                          ? `${doc.uploadedByClientRef.firstName} ${doc.uploadedByClientRef.lastName}`
                          : '—';
                      const initials = uploader !== '—'
                        ? uploader.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                        : '?';

                      return (
                        <tr
                          key={doc.documentId}
                          className={cn(
                            'hover:bg-gray-50 transition-colors cursor-pointer',
                            panelDocId === doc.documentId ? 'bg-blue-50 hover:bg-blue-50' : '',
                          )}
                          onClick={() => setPanelDocId(doc.documentId)}
                        >
                          <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selected.has(doc.documentId)}
                              onChange={() => toggleSelect(doc.documentId)}
                              className="rounded border-gray-300"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <DocumentCategoryBadge fileType={doc.fileType} size="sm" />
                          </td>
                          <td className="px-4 py-3">
                            {doc.claim ? (
                              <a
                                href={`/dashboard/manager-senior/claims?id=${doc.claim.claimId}`}
                                onClick={e => e.stopPropagation()}
                                className="text-xs font-mono font-semibold text-indigo-600 hover:underline bg-indigo-50 px-2 py-0.5 rounded"
                              >
                                {doc.claim.claimNumber}
                              </a>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-700">
                            {doc.claim?.client
                              ? `${doc.claim.client.firstName} ${doc.claim.client.lastName}`
                              : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                                <span className="text-xs font-semibold text-gray-600">{initials}</span>
                              </div>
                              <span className="text-xs text-gray-700 truncate max-w-25">{uploader}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">{fmtRelativeTime(doc.createdAt)}</td>
                          <td className="px-4 py-3 text-center">
                            <DocumentStatusBadge status={doc.status} />
                          </td>
                          <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-0.5">
                              <button
                                onClick={() => setPanelDocId(doc.documentId)}
                                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                                title="Voir"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {(doc.status === 'UPLOADED' || doc.status === 'PROCESSING') && (
                                <button
                                  onClick={async () => {
                                    await fetch(`/api/documents/${doc.documentId}/status`, {
                                      method:  'PATCH',
                                      headers: {
                                        'Content-Type': 'application/json',
                                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                                      },
                                      body: JSON.stringify({ status: 'VERIFIED' }),
                                    });
                                    handleRefresh();
                                  }}
                                  className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"
                                  title="Vérifier"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                              )}
                              <a
                                href={`/api/documents/file/${doc.filePath.replace(/^\/uploads\//, '')}`}
                                download={doc.originalName}
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                title="Télécharger"
                              >
                                <Download className="w-4 h-4" />
                              </a>
                              <button
                                onClick={async () => {
                                  // eslint-disable-next-line no-alert
                                  if (!confirm('Archiver ce document ?')) return;
                                  await fetch(`/api/documents/${doc.documentId}`, {
                                    method:  'DELETE',
                                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                                  });
                                  handleRefresh();
                                }}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                                title="Archiver"
                              >
                                <Archive className="w-4 h-4" />
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
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} sur {pagination.total}
                </p>
                <div className="flex gap-2 items-center">
                  <button
                    disabled={pagination.page <= 1}
                    onClick={() => fetchDocs(pagination.page - 1)}
                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 py-2 text-sm font-medium text-gray-700">
                    {pagination.page} / {pagination.pages}
                  </span>
                  <button
                    disabled={pagination.page >= pagination.pages}
                    onClick={() => fetchDocs(pagination.page + 1)}
                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Side panel */}
        <DocumentPreviewPanel
          documentId={panelDocId}
          onClose={() => setPanelDocId(null)}
          onUpdated={handleRefresh}
        />

        {/* Upload modal */}
        <UploadDocumentModal
          open={uploadModal}
          onClose={() => setUploadModal(false)}
          onUploaded={handleRefresh}
        />
      </div>
    </RoleBasedLayout>
  );
}
