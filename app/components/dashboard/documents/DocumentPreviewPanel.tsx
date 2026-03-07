'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  X,
  Download,
  Archive,
  CheckCircle,
  XCircle,
  Link,
  Loader2,
  AlertTriangle,
  FileX,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DocumentStatusBadge } from './DocumentStatusBadge';
import { DocumentCategoryBadge } from './DocumentCategoryBadge';
import {
  formatBytes,
  getFileIcon,
  getFileIconColor,
  fmtDate,
  fmtDateTime,
  fmtRelativeTime,
} from './document-utils';
import { ACCESS_ACTION_LABELS, type DocumentType, type DocumentStatus } from '@/app/lib/document-maps';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AccessLogEntry {
  id:        string;
  action:    string;
  createdAt: string;
  user:      { firstName: string; lastName: string; role: string };
}

interface DocumentDetail {
  documentId:   string;
  originalName: string;
  fileName:     string;
  fileType:     DocumentType;
  mimeType:     string;
  fileSize:     number;
  filePath:     string;
  status:       DocumentStatus;
  description:  string | null;
  rejectionNote: string | null;
  uploadedVia:  string;
  expiresAt:    string | null;
  createdAt:    string;
  verifiedAt:   string | null;
  claim: {
    claimId:     string;
    claimNumber: string;
    claimType:   string;
    client:      { clientId: string; firstName: string; lastName: string; email: string };
    policy:      { policyId: string; policyNumber: string; policyType: string } | null;
  } | null;
  uploadedByUser:      { userId: string; firstName: string; lastName: string; role: string } | null;
  uploadedByClientRef: { clientId: string; firstName: string; lastName: string } | null;
  verifiedByUser:      { userId: string; firstName: string; lastName: string } | null;
  accessLogs:          AccessLogEntry[];
}

interface DocumentPreviewPanelProps {
  documentId: string | null;
  onClose:    () => void;
  onUpdated?: () => void;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PanelSkeleton() {
  return (
    <div className="p-5 space-y-4 animate-pulse">
      <div className="h-5 bg-gray-100 rounded w-3/4" />
      <div className="h-4 bg-gray-100 rounded w-1/3" />
      <div className="h-48 bg-gray-100 rounded-xl" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-2.5 bg-gray-100 rounded w-1/3" />
            <div className="h-4 bg-gray-100 rounded w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DocumentPreviewPanel({ documentId, onClose, onUpdated }: DocumentPreviewPanelProps) {
  const isOpen = documentId !== null;

  const [detail,       setDetail]       = useState<DocumentDetail | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [saving,       setSaving]       = useState(false);
  const [showReject,   setShowReject]   = useState(false);
  const [rejectNote,   setRejectNote]   = useState('');
  const [feedback,     setFeedback]     = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);
  const [archiveConfirm, setArchiveConfirm] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;

  const fetchDetail = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    setDetail(null);
    setFeedback(null);
    setShowReject(false);
    setRejectNote('');
    try {
      const res = await fetch(`/api/documents/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Impossible de charger le document.');
      setDetail(await res.json() as DocumentDetail);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
    // Log VIEW access
    fetch(`/api/documents/${id}/log-access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ action: 'VIEW' }),
    }).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (documentId) fetchDetail(documentId);
  }, [documentId, fetchDetail]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    if (isOpen) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  async function setStatus(status: 'VERIFIED' | 'REJECTED', note?: string) {
    if (!documentId) return;
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/documents/${documentId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ status, rejectionNote: note }),
      });
      if (res.ok) {
        setFeedback({ type: 'ok', msg: status === 'VERIFIED' ? 'Document vérifié.' : 'Document rejeté.' });
        setShowReject(false);
        await fetchDetail(documentId);
        onUpdated?.();
      } else {
        setFeedback({ type: 'err', msg: 'Erreur lors de la mise à jour.' });
      }
    } finally {
      setSaving(false);
    }
  }

  async function archive() {
    if (!documentId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        onUpdated?.();
        onClose();
      } else {
        setFeedback({ type: 'err', msg: 'Erreur lors de l\'archivage.' });
      }
    } finally {
      setSaving(false);
      setArchiveConfirm(false);
    }
  }

  function logDownload() {
    if (!documentId) return;
    fetch(`/api/documents/${documentId}/log-access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ action: 'DOWNLOAD' }),
    }).catch(() => {});
  }

  function copyLink() {
    if (!detail) return;
    const url = `${window.location.origin}/api/documents/file/${detail.filePath.replace(/^\/uploads\//, '')}`;
    navigator.clipboard.writeText(url).then(() => {
      setFeedback({ type: 'ok', msg: 'Lien copié dans le presse-papier.' });
    }).catch(() => {});
  }

  const renderPreview = () => {
    if (!detail) return null;
    const src = `/api/documents/file/${detail.filePath.replace(/^\/uploads\//, '')}`;

    if (detail.mimeType.startsWith('image/')) {
      return (
        <div className="flex items-center justify-center bg-gray-50 rounded-xl overflow-hidden border border-gray-100 max-h-87.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={detail.originalName} className="max-h-87.5 max-w-full object-contain" />
        </div>
      );
    }

    if (detail.mimeType === 'application/pdf') {
      return (
        <iframe
          src={src}
          title={detail.originalName}
          className="w-full rounded-xl border border-gray-100"
          style={{ height: 400 }}
        />
      );
    }

    const Icon = getFileIcon(detail.mimeType);
    const colorClass = getFileIconColor(detail.mimeType);
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10 bg-gray-50 rounded-xl border border-gray-100">
        <Icon className={cn('w-14 h-14', colorClass)} />
        <p className="text-sm text-gray-500">Aperçu non disponible</p>
        <a
          href={src}
          download={detail.originalName}
          onClick={logDownload}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
        >
          <Download className="w-4 h-4" />
          Télécharger
        </a>
      </div>
    );
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/30 transition-opacity duration-300',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <aside
        className={cn(
          'fixed top-0 right-0 z-50 h-full w-140 max-w-full bg-white shadow-2xl flex flex-col',
          'transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100 shrink-0 gap-3">
          <div className="min-w-0">
            {detail ? (
              <>
                <p className="text-sm font-semibold text-gray-900 truncate">{detail.originalName}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <DocumentStatusBadge status={detail.status} />
                  <DocumentCategoryBadge fileType={detail.fileType} size="sm" />
                </div>
              </>
            ) : (
              <div className="space-y-2 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-48" />
                <div className="h-5 bg-gray-100 rounded w-24" />
              </div>
            )}
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading && <PanelSkeleton />}

          {error && (
            <div className="flex flex-col items-center justify-center h-full p-8 space-y-3 text-center">
              <FileX className="w-12 h-12 text-red-200" />
              <p className="text-sm text-red-600">{error}</p>
              <button onClick={() => documentId && fetchDetail(documentId)} className="text-xs text-indigo-600 hover:underline">
                Réessayer
              </button>
            </div>
          )}

          {!loading && !error && detail && (
            <div className="p-5 space-y-5">
              {/* Preview */}
              {renderPreview()}

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                {[
                  { label: 'Type',         value: <DocumentCategoryBadge fileType={detail.fileType} size="sm" /> },
                  { label: 'Source',       value: detail.uploadedVia },
                  { label: 'Taille',       value: formatBytes(detail.fileSize) },
                  {
                    label: 'Lié au dossier',
                    value: detail.claim ? (
                      <a href={`/dashboard/super-admin/claims?id=${detail.claim.claimId}`} className="text-indigo-600 hover:underline font-mono text-xs">
                        {detail.claim.claimNumber}
                      </a>
                    ) : '—',
                  },
                  {
                    label: 'Client',
                    value: detail.claim?.client ? (
                      <a href={`/dashboard/super-admin/clients?id=${detail.claim.client.clientId}`} className="text-indigo-600 hover:underline text-xs">
                        {detail.claim.client.firstName} {detail.claim.client.lastName}
                      </a>
                    ) : '—',
                  },
                  {
                    label: 'Uploadé par',
                    value: detail.uploadedByUser
                      ? `${detail.uploadedByUser.firstName} ${detail.uploadedByUser.lastName}`
                      : detail.uploadedByClientRef
                        ? `${detail.uploadedByClientRef.firstName} ${detail.uploadedByClientRef.lastName} (client)`
                        : '—',
                  },
                  { label: 'Date upload',  value: fmtDate(detail.createdAt) },
                  detail.expiresAt ? { label: 'Expiration', value: fmtDate(detail.expiresAt) } : null,
                  detail.verifiedByUser ? { label: 'Vérifié par', value: `${detail.verifiedByUser.firstName} ${detail.verifiedByUser.lastName} le ${fmtDate(detail.verifiedAt)}` } : null,
                ].filter(Boolean).map((item) => (
                  <div key={item!.label}>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-0.5">{item!.label}</p>
                    <div className="text-sm text-gray-800 font-medium">{item!.value}</div>
                  </div>
                ))}
              </div>

              {/* Description */}
              {detail.description && (
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Description</p>
                  <p className="text-sm text-gray-700">{detail.description}</p>
                </div>
              )}

              {/* Rejection note */}
              {detail.rejectionNote && (
                <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                  <p className="text-xs text-red-600 font-semibold mb-1">Motif de rejet</p>
                  <p className="text-sm text-red-700">{detail.rejectionNote}</p>
                </div>
              )}

              {/* Status feedback */}
              {feedback && (
                <div className={cn(
                  'text-xs px-3 py-2 rounded-lg border',
                  feedback.type === 'ok' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200',
                )}>
                  {feedback.msg}
                </div>
              )}

              {/* Verification actions */}
              {(detail.status === 'UPLOADED' || detail.status === 'PROCESSING') && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Vérification</p>
                  {!showReject ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setStatus('VERIFIED')}
                        disabled={saving}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                        Marquer vérifié
                      </button>
                      <button
                        onClick={() => setShowReject(true)}
                        disabled={saving}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Rejeter
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <textarea
                        value={rejectNote}
                        onChange={e => setRejectNote(e.target.value)}
                        placeholder="Motif du rejet (obligatoire)..."
                        className="w-full text-sm border border-gray-200 rounded-lg p-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => setStatus('REJECTED', rejectNote)}
                          disabled={saving || !rejectNote.trim()}
                          className="flex-1 py-2 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                        >
                          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin inline mr-1" /> : null}
                          Confirmer le rejet
                        </button>
                        <button
                          onClick={() => { setShowReject(false); setRejectNote(''); }}
                          className="px-4 py-2 text-xs font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {detail.status === 'VERIFIED' && detail.verifiedByUser && (
                <div className="bg-green-50 rounded-lg p-3 border border-green-200 text-sm text-green-700">
                  Vérifié par <strong>{detail.verifiedByUser.firstName} {detail.verifiedByUser.lastName}</strong> le {fmtDate(detail.verifiedAt)}
                </div>
              )}

              {/* Access logs */}
              {detail.accessLogs.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Historique d'accès</p>
                  <ol className="space-y-2">
                    {detail.accessLogs.slice(0, 5).map(log => (
                      <li key={log.id} className="flex items-start gap-2 text-xs text-gray-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5 shrink-0" />
                        <span>
                          <span className="text-gray-400">{fmtDateTime(log.createdAt)}</span>
                          {' — '}
                          <span className="font-medium">{log.user.firstName} {log.user.lastName}</span>
                          {' — '}
                          <span>{ACCESS_ACTION_LABELS[log.action] ?? log.action}</span>
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom actions */}
        {detail && (
          <div className="shrink-0 border-t border-gray-100 px-5 py-3 flex items-center gap-2">
            <a
              href={`/api/documents/file/${detail.filePath.replace(/^\/uploads\//, '')}`}
              download={detail.originalName}
              onClick={logDownload}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <Download className="w-4 h-4" />
              Télécharger
            </a>
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <Link className="w-4 h-4" />
              Copier le lien
            </button>

            {!archiveConfirm ? (
              <button
                onClick={() => setArchiveConfirm(true)}
                className="ml-auto flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
              >
                <Archive className="w-4 h-4" />
                Archiver
              </button>
            ) : (
              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs text-red-600 font-medium">Confirmer l'archivage ?</span>
                <button
                  onClick={archive}
                  disabled={saving}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : 'Oui'}
                </button>
                <button
                  onClick={() => setArchiveConfirm(false)}
                  className="px-3 py-1.5 text-xs text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Non
                </button>
              </div>
            )}
          </div>
        )}

        {/* Hidden: archive confirm tooltip */}
        {detail && archiveConfirm && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/30">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-80 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Archiver ce document ?</p>
                  <p className="text-xs text-gray-500 mt-0.5">Cette action ne peut pas être annulée facilement.</p>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setArchiveConfirm(false)} className="px-3 py-2 text-xs text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Annuler</button>
                <button onClick={archive} disabled={saving} className="px-3 py-2 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50">
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin inline mr-1" /> : null}
                  Archiver
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
