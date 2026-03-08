'use client';

import { useState } from 'react';
import type { GeneratedReport, ReportFormat, ReportStatus, ReportType } from '@prisma/client';
import {
  REPORT_TYPE_LABELS,
  REPORT_FORMAT_LABELS,
  formatFileSize,
} from '@/app/lib/reports/report-utils';
import { cn } from '@/lib/utils';

type ReportRow = GeneratedReport & {
  generator?: { firstName: string; lastName: string; role: string } | null;
};

interface Props {
  reports:    ReportRow[];
  pagination: { page: number; limit: number; total: number; pages: number };
  isLoading:  boolean;
  onPageChange:   (p: number) => void;
  onFilterChange: (f: { type?: string; status?: string; format?: string }) => void;
  onDownload:     (id: string, name: string) => void;
  onDelete:       (id: string) => void;
}

const STATUS_CONFIG: Record<ReportStatus, { label: string; cls: string }> = {
  PENDING:    { label: 'En attente',   cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  GENERATING: { label: 'Génération…', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  COMPLETED:  { label: 'Complété',    cls: 'bg-green-50 text-green-700 border-green-200' },
  FAILED:     { label: 'Échoué',      cls: 'bg-red-50 text-red-700 border-red-200' },
  SENT:       { label: 'Envoyé',      cls: 'bg-teal-50 text-teal-700 border-teal-200' },
};

const FORMAT_ICON: Record<ReportFormat, string> = { PDF: '📄', EXCEL: '📊', CSV: '📋' };

export function ReportHistoryTable({
  reports,
  pagination,
  isLoading,
  onPageChange,
  onFilterChange,
  onDownload,
  onDelete,
}: Props) {
  const [typeFilter,   setTypeFilter]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [formatFilter, setFormatFilter] = useState('');

  const applyFilter = (updates: { type?: string; status?: string; format?: string }) => {
    const next = { type: typeFilter, status: statusFilter, format: formatFilter, ...updates };
    onFilterChange({
      type:   next.type   || undefined,
      status: next.status || undefined,
      format: next.format || undefined,
    });
  };

  const selectCls = 'rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-blue-400 transition';

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); applyFilter({ type: e.target.value }); }}
          className={selectCls}
        >
          <option value="">Tous les types</option>
          {(Object.keys(REPORT_TYPE_LABELS) as ReportType[]).map((t) => (
            <option key={t} value={t}>{REPORT_TYPE_LABELS[t]}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); applyFilter({ status: e.target.value }); }}
          className={selectCls}
        >
          <option value="">Tous les statuts</option>
          {(Object.keys(STATUS_CONFIG) as ReportStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
          ))}
        </select>

        <select
          value={formatFilter}
          onChange={(e) => { setFormatFilter(e.target.value); applyFilter({ format: e.target.value }); }}
          className={selectCls}
        >
          <option value="">Tous les formats</option>
          {(['PDF', 'EXCEL', 'CSV'] as ReportFormat[]).map((f) => (
            <option key={f} value={f}>{REPORT_FORMAT_LABELS[f]}</option>
          ))}
        </select>

        <span className="ml-auto self-center text-sm text-gray-500">
          {pagination.total} rapport{pagination.total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Rapport</th>
              <th className="px-4 py-3 text-left font-medium">Période</th>
              <th className="px-4 py-3 text-left font-medium">Format</th>
              <th className="px-4 py-3 text-left font-medium">Statut</th>
              <th className="px-4 py-3 text-left font-medium">Taille</th>
              <th className="px-4 py-3 text-left font-medium">Créé le</th>
              <th className="px-4 py-3 text-left font-medium">Par</th>
              <th className="px-4 py-3 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {Array.from({ length: 8 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-gray-100 rounded" />
                    </td>
                  ))}
                </tr>
              ))
            ) : reports.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                  Aucun rapport trouvé
                </td>
              </tr>
            ) : (
              reports.map((report) => {
                const cfg = STATUS_CONFIG[report.status];
                return (
                  <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 max-w-48">
                      <p className="font-medium text-gray-900 truncate">{report.name}</p>
                      <p className="text-xs text-gray-500">{REPORT_TYPE_LABELS[report.type]}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{report.period}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1">
                        {FORMAT_ICON[report.format]}
                        <span className="text-gray-600">{REPORT_FORMAT_LABELS[report.format]}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', cfg.cls)}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {report.fileSize ? formatFileSize(report.fileSize) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(report.createdAt).toLocaleDateString('fr-FR', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {report.generator
                        ? `${report.generator.firstName} ${report.generator.lastName}`
                        : 'Auto'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {(report.status === 'COMPLETED' || report.status === 'SENT') && report.filePath && (
                          <button
                            onClick={() => onDownload(report.id, report.name)}
                            className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 transition"
                          >
                            ↓ Télécharger
                          </button>
                        )}
                        <button
                          onClick={() => onDelete(report.id)}
                          className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-100 transition"
                        >
                          🗑️
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
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {pagination.page} / {pagination.pages}
          </p>
          <div className="flex gap-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition"
            >
              ← Préc.
            </button>
            <button
              disabled={pagination.page >= pagination.pages}
              onClick={() => onPageChange(pagination.page + 1)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition"
            >
              Suiv. →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
