'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  X,
  Upload,
  ImageIcon,
  FileText,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { DOCUMENT_TYPE_LABELS, type DocumentType } from '@/app/lib/document-maps';
import { formatBytes } from './document-utils';

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

interface OpenClaim {
  claimId:     string;
  claimNumber: string;
  status:      string;
  client?:     { clientId: string; firstName: string; lastName: string };
}

interface UploadDocumentModalProps {
  open:        boolean;
  onClose:     () => void;
  onUploaded?: () => void;
}

export function UploadDocumentModal({ open, onClose, onUploaded }: UploadDocumentModalProps) {
  const [file,        setFile]        = useState<File | null>(null);
  const [preview,     setPreview]     = useState<string | null>(null);
  const [fileType,    setFileType]    = useState<DocumentType>('OTHER');
  const [claimId,     setClaimId]     = useState('');
  const [description, setDescription] = useState('');
  const [expiresAt,   setExpiresAt]   = useState('');
  const [claims,       setClaims]       = useState<OpenClaim[]>([]);
  const [claimsLoaded,  setClaimsLoaded]  = useState(false);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [progress,    setProgress]    = useState(0);
  const [errors,      setErrors]      = useState<Record<string, string>>({});
  const [success,     setSuccess]     = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;

  // Load open claims on first open — fetch all active statuses in parallel
  const loadClaims = useCallback(async () => {
    if (claimsLoaded) return;
    setClaimsLoading(true);
    const activeStatuses = ['DECLARED', 'ANALYZING', 'DOCS_REQUIRED', 'UNDER_EXPERTISE', 'IN_DECISION', 'APPROVED', 'IN_PAYMENT'];
    try {
      const results = await Promise.all(
        activeStatuses.map(s =>
          fetch(`/api/super-admin/claims?limit=200&status=${s}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }).then(r => r.ok ? r.json() as Promise<{ data?: { claims?: OpenClaim[] }; claims?: OpenClaim[] }> : { data: { claims: [] } }),
        ),
      );
      // Response is nested: { success, data: { claims, pagination, ... } }
      const all: OpenClaim[] = results.flatMap(r => r.data?.claims ?? r.claims ?? []);
      // Deduplicate by claimId and sort by claimNumber
      const seen = new Set<string>();
      const unique = all.filter(c => { if (seen.has(c.claimId)) return false; seen.add(c.claimId); return true; });
      unique.sort((a, b) => a.claimNumber.localeCompare(b.claimNumber));
      setClaims(unique);
    } finally {
      setClaimsLoaded(true);
      setClaimsLoading(false);
    }
  }, [claimsLoaded, token]);

  // Trigger load when modal opens
  React.useEffect(() => {
    if (open) loadClaims();
  }, [open, loadClaims]);

  const onDrop = useCallback((accepted: File[]) => {
    const f = accepted[0];
    if (!f) return;
    setFile(f);
    setErrors(prev => { const n = { ...prev }; delete n.file; return n; });
    if (f.type.startsWith('image/')) {
      const url = URL.createObjectURL(f);
      setPreview(url);
    } else {
      setPreview(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'], 'application/pdf': ['.pdf'] },
    maxSize: MAX_SIZE,
    multiple: false,
  });

  function validate() {
    const errs: Record<string, string> = {};
    if (!file)    errs.file    = 'Veuillez sélectionner un fichier.';
    if (!claimId) errs.claimId = 'Veuillez sélectionner un dossier.';
    if (!fileType) errs.fileType = 'Veuillez choisir un type de document.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate() || !file) return;

    setUploading(true);
    setProgress(10);

    try {
      const fd = new FormData();
      fd.append('file',        file);
      fd.append('claimId',     claimId);
      fd.append('fileType',    fileType);
      if (description) fd.append('description', description);
      if (expiresAt)   fd.append('expiresAt',   expiresAt);

      // Simulate progress increments while uploading
      const interval = setInterval(() => setProgress(p => Math.min(p + 10, 90)), 300);

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });

      clearInterval(interval);
      setProgress(100);

      if (res.ok) {
        setSuccess(true);
        onUploaded?.();
        setTimeout(() => {
          resetForm();
          onClose();
        }, 1200);
      } else {
        const text = await res.text();
        let message = 'Erreur lors de l\'upload.';
        try { message = (JSON.parse(text) as { error?: string }).error ?? message; } catch { /* non-JSON response */ }
        setErrors({ submit: message });
      }
    } catch {
      setErrors({ submit: 'Erreur réseau. Veuillez réessayer.' });
    } finally {
      setUploading(false);
    }
  }

  function resetForm() {
    setFile(null);
    setPreview(null);
    setFileType('OTHER');
    setClaimId('');
    setDescription('');
    setExpiresAt('');
    setErrors({});
    setProgress(0);
    setSuccess(false);
    // Allow fresh claim list on next open
    setClaimsLoaded(false);
    setClaims([]);
  }

  function handleClose() {
    if (uploading) return;
    resetForm();
    onClose();
  }

  const sortedTypes = Object.entries(DOCUMENT_TYPE_LABELS).sort((a, b) => a[1].localeCompare(b[1])) as [DocumentType, string][];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-indigo-600" />
            Uploader un document
          </DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
              <FileText className="w-7 h-7 text-green-600" />
            </div>
            <p className="text-sm font-semibold text-gray-800">Document uploadé avec succès</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Dropzone */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Fichier <span className="text-red-500">*</span>
              </label>
              <div
                {...getRootProps()}
                className={cn(
                  'border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors',
                  isDragActive ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50',
                  errors.file ? 'border-red-300 bg-red-50' : '',
                )}
              >
                <input {...getInputProps()} />
                {file ? (
                  <div className="flex items-center gap-3 justify-center">
                    {preview ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={preview} alt="preview" className="w-16 h-16 object-cover rounded-lg shadow" />
                    ) : (
                      <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-7 h-7 text-red-500" />
                      </div>
                    )}
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900 truncate max-w-55">{file.name}</p>
                      <p className="text-xs text-gray-400">{formatBytes(file.size)}</p>
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); setFile(null); setPreview(null); }}
                        className="text-xs text-red-500 hover:text-red-700 mt-0.5"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-center mb-2">
                      <ImageIcon className="w-8 h-8 text-gray-300" />
                    </div>
                    <p className="text-sm text-gray-600">Glissez un fichier ici ou <span className="text-indigo-600 font-medium">parcourez</span></p>
                    <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP, PDF — max 10 Mo</p>
                  </>
                )}
              </div>
              {fileRejections.length > 0 && (
                <p className="text-xs text-red-500 mt-1">
                  {fileRejections[0].errors[0].code === 'file-too-large'
                    ? 'Fichier trop volumineux (max 10 Mo).'
                    : 'Format non accepté (JPG, PNG, WEBP, PDF uniquement).'}
                </p>
              )}
              {errors.file && <p className="text-xs text-red-500 mt-1">{errors.file}</p>}
            </div>

            {/* Type select */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Type de document <span className="text-red-500">*</span>
              </label>
              <select
                value={fileType}
                onChange={e => setFileType(e.target.value as DocumentType)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
              >
                {sortedTypes.map(([val, lbl]) => (
                  <option key={val} value={val}>{lbl}</option>
                ))}
              </select>
              {errors.fileType && <p className="text-xs text-red-500 mt-1">{errors.fileType}</p>}
            </div>

            {/* Claim select */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Dossier associé <span className="text-red-500">*</span>
              </label>
              <select
                value={claimId}
                onChange={e => setClaimId(e.target.value)}
                disabled={claimsLoading}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white disabled:opacity-60"
              >
                <option value="">
                  {claimsLoading ? 'Chargement des dossiers…' : claims.length === 0 ? 'Aucun dossier actif trouvé' : '— Sélectionner un dossier —'}
                </option>
                {claims.map(c => (
                  <option key={c.claimId} value={c.claimId}>
                    {c.claimNumber}{c.client ? ` — ${c.client.firstName} ${c.client.lastName}` : ''}
                  </option>
                ))}
              </select>
              {errors.claimId && <p className="text-xs text-red-500 mt-1">{errors.claimId}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Description (optionnel)</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
                placeholder="Remarques sur ce document..."
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>

            {/* Expiry date */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Date d'expiration (optionnel)</label>
              <input
                type="date"
                value={expiresAt}
                onChange={e => setExpiresAt(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>

            {/* Upload progress */}
            {uploading && (
              <div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1 text-center">{progress}%</p>
              </div>
            )}

            {/* Submit error */}
            {errors.submit && (
              <div className="flex items-center gap-2 bg-red-50 text-red-700 text-xs px-3 py-2 rounded-lg border border-red-200">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {errors.submit}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={handleClose}
                disabled={uploading}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={uploading}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? 'Upload en cours…' : 'Uploader'}
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
