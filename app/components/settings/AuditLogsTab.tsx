'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Download, RefreshCw, ChevronLeft, ChevronRight,
  CheckCircle, XCircle, Loader2,
} from 'lucide-react';

interface AuditEntry {
  id: string;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  userId: string | null;
  userFullName: string | null;
  userRole: string | null;
  ipAddress: string | null;
  status: string;
  createdAt: string;
}

interface AuditPage {
  data: AuditEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const PAGE_SIZE = 20;

export default function AuditLogsTab() {
  const [page,    setPage]    = useState(1);
  const [data,    setData]    = useState<AuditPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [status,  setStatus]  = useState('');

  const fetch_ = useCallback(async (p: number, act: string, st: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), pageSize: String(PAGE_SIZE) });
      if (act) params.set('action', act);
      if (st)  params.set('status', st);
      const res  = await fetch(`/api/audit-logs?${params}`);
      const json = await res.json();
      if (json.success) setData(json);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch_(page, search, status); }, [page, search, status, fetch_]);

  const handleExport = async () => {
    const params = new URLSearchParams();
    if (search) params.set('action', search);
    if (status) params.set('status', status);
    window.location.href = `/api/audit-logs/export?${params}`;
  };

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Filtrer par action…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">Tous les statuts</option>
          <option value="SUCCESS">Succès</option>
          <option value="FAILURE">Échec</option>
        </select>
        <button onClick={() => fetch_(page, search, status)} disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Rafraîchir
        </button>
        <button onClick={handleExport}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
          <Download className="w-4 h-4" />
          Exporter CSV
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Action</th>
                  <th className="px-4 py-3 text-left">Ressource</th>
                  <th className="px-4 py-3 text-left">Utilisateur</th>
                  <th className="px-4 py-3 text-left">IP</th>
                  <th className="px-4 py-3 text-left">Statut</th>
                  <th className="px-4 py-3 text-left">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data?.data.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-700">{entry.action}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {entry.resourceType ? `${entry.resourceType}${entry.resourceId ? ` #${entry.resourceId.slice(0, 8)}` : ''}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-700">{entry.userFullName ?? '—'}</div>
                      {entry.userRole && <div className="text-xs text-gray-400">{entry.userRole}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{entry.ipAddress ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
                        ${entry.status === 'SUCCESS' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {entry.status === 'SUCCESS'
                          ? <CheckCircle className="w-3 h-3" />
                          : <XCircle className="w-3 h-3" />}
                        {entry.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(entry.createdAt).toLocaleString('fr-MA')}
                    </td>
                  </tr>
                ))}
                {!data?.data.length && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">Aucun événement trouvé</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, data.total)} sur {data.total}
              </p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm">{page} / {data.totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
