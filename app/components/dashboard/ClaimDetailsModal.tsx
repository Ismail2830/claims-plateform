'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Shield,
  Calendar,
  MapPin,
  DollarSign,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Paperclip,
  Download,
  Eye,
  TrendingUp,
  ChevronRight,
  Image as ImageIcon,
  File,
  MessageSquare,
  Loader2,
  Edit,
  Trash2,
  Save,
  Upload,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ClaimDocument {
  documentId: string;
  originalName: string;
  fileType: string;
  mimeType: string;
  fileSize: number;
  filePath: string;
  status: string;
  createdAt: string;
}

interface ClaimDetailsModalProps {
  claim: any;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (claimId: string, data: any) => Promise<void>;
  onDelete: (claimId: string) => Promise<void>;
}

// ── Status helpers ────────────────────────────────────────────────────────────

const STATUS_STEPS = [
  { key: 'DECLARED',        label: 'Déclaré',         icon: Clock },
  { key: 'ANALYZING',       label: 'En analyse',      icon: AlertCircle },
  { key: 'DOCS_REQUIRED',   label: 'Documents requis', icon: Paperclip },
  { key: 'UNDER_EXPERTISE', label: 'En instruction',  icon: TrendingUp },
  { key: 'IN_DECISION',     label: 'En décision',     icon: AlertCircle },
  { key: 'APPROVED',        label: 'Approuvé',        icon: CheckCircle },
  { key: 'IN_PAYMENT',      label: 'Paiement',        icon: DollarSign },
  { key: 'CLOSED',          label: 'Clôturé',         icon: CheckCircle },
];

function getStatusMeta(status: string) {
  const map: Record<string, { color: string; bg: string; border: string; label: string }> = {
    DECLARED:        { color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-400',   label: 'Déclaré' },
    ANALYZING:       { color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-400', label: 'En analyse' },
    DOCS_REQUIRED:   { color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-400', label: 'Documents requis' },
    UNDER_EXPERTISE: { color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-400', label: 'En instruction' },
    IN_DECISION:     { color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-400', label: 'En décision' },
    APPROVED:        { color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-400',  label: 'Approuvé' },
    IN_PAYMENT:      { color: 'text-emerald-700',bg: 'bg-emerald-50',border: 'border-emerald-400',label: 'En paiement' },
    CLOSED:          { color: 'text-gray-700',   bg: 'bg-gray-100',  border: 'border-gray-400',   label: 'Clôturé' },
    REJECTED:        { color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-400',    label: 'Rejeté' },
  };
  return map[status] ?? { color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-400', label: status };
}

function getPriorityMeta(priority: string) {
  const map: Record<string, { color: string; bg: string }> = {
    URGENT: { color: 'text-red-700',    bg: 'bg-red-100' },
    HIGH:   { color: 'text-orange-700', bg: 'bg-orange-100' },
    NORMAL: { color: 'text-blue-700',   bg: 'bg-blue-100' },
    LOW:    { color: 'text-green-700',  bg: 'bg-green-100' },
  };
  return map[priority] ?? { color: 'text-gray-700', bg: 'bg-gray-100' };
}

// ── Document helpers ──────────────────────────────────────────────────────────

function getDocIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return <ImageIcon className="w-4 h-4 text-blue-500" />;
  if (mimeType === 'application/pdf') return <File className="w-4 h-4 text-red-500" />;
  return <FileText className="w-4 h-4 text-gray-400" />;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getClientToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('clientToken');
}

async function fetchDocument(documentId: string): Promise<Blob | null> {
  const token = getClientToken();
  if (!token) return null;
  try {
    const res = await fetch(`/api/client/documents/${documentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return res.blob();
  } catch {
    return null;
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-gray-400" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">{label}</p>
        <div className="text-sm font-medium text-gray-800">{value}</div>
      </div>
    </div>
  );
}

function DocumentItem({ doc }: { doc: ClaimDocument }) {
  const [loading, setLoading] = useState(false);

  const handleAction = async (mode: 'view' | 'download') => {
    setLoading(true);
    const blob = await fetchDocument(doc.documentId);
    setLoading(false);
    if (!blob) { alert('Impossible d\'accéder à ce fichier.'); return; }
    const url = URL.createObjectURL(blob);
    if (mode === 'view') {
      window.open(url, '_blank');
    } else {
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.originalName;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const canPreview = doc.mimeType.startsWith('image/') || doc.mimeType === 'application/pdf';

  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors group">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0 shadow-xs">
          {getDocIcon(doc.mimeType)}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate max-w-52">{doc.originalName}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-gray-400">{formatFileSize(doc.fileSize)}</span>
            <span className="text-gray-300">·</span>
            <span className="text-xs text-gray-400">
              {new Date(doc.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            {doc.status === 'VERIFIED' && (
              <span className="flex items-center gap-0.5 text-[10px] font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                <CheckCircle className="w-2.5 h-2.5" /> Vérifié
              </span>
            )}
            {doc.status === 'REJECTED' && (
              <span className="flex items-center gap-0.5 text-[10px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">
                <XCircle className="w-2.5 h-2.5" /> Rejeté
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0 ml-2">
        {canPreview && (
          <button
            onClick={() => handleAction('view')}
            disabled={loading}
            title="Aperçu"
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
          >
            <Eye className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={() => handleAction('download')}
          disabled={loading}
          title="Télécharger"
          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function StatusTimeline({ status }: { status: string }) {
  const isRejected = status === 'REJECTED';
  const currentIdx = STATUS_STEPS.findIndex((s) => s.key === status);

  if (isRejected) {
    return (
      <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
        <XCircle className="w-5 h-5 text-red-500 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-red-700">Dossier rejeté</p>
          <p className="text-xs text-red-500 mt-0.5">Ce sinistre a été rejeté. Contactez votre conseiller pour plus d&apos;informations.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {STATUS_STEPS.map((step, idx) => {
        const done = idx <= currentIdx;
        const current = idx === currentIdx;
        const Icon = step.icon;
        return (
          <div key={step.key} className="flex items-center gap-3">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${
              current ? 'bg-blue-600 shadow-md shadow-blue-200' :
              done    ? 'bg-green-500' : 'bg-gray-100'
            }`}>
              {done && !current
                ? <CheckCircle className="w-4 h-4 text-white" />
                : <Icon className={`w-3.5 h-3.5 ${current ? 'text-white' : 'text-gray-400'}`} />
              }
            </div>
            <div className="flex-1 flex items-center justify-between">
              <span className={`text-sm ${current ? 'font-semibold text-blue-700' : done ? 'text-gray-700' : 'text-gray-400'}`}>
                {step.label}
              </span>
              {current && (
                <span className="text-xs font-medium px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">En cours</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'documents' | 'progression';

export default function ClaimDetailsModal({
  claim,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
}: ClaimDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ description: '', incidentLocation: '' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<Array<{
    id: string; file: File; fileType: string;
    status: 'pending' | 'uploading' | 'done' | 'error'; error?: string;
  }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state when claim opens
  useEffect(() => {
    if (isOpen && claim) {
      setActiveTab('overview');
      setIsEditing(false);
      setConfirmDelete(false);
      setPendingFiles([]);
      setEditData({
        description: claim.description ?? '',
        incidentLocation: claim.incidentLocation ?? '',
      });
    }
  }, [isOpen, claim?.claimId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const newEntries = files.map((file) => ({
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      file,
      fileType: 'OTHER',
      status: 'pending' as const,
    }));
    setPendingFiles((prev) => [...prev, ...newEntries]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemovePending = (id: string) => {
    setPendingFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('clientToken') : null;

      // Upload all pending files concurrently before saving text fields
      if (pendingFiles.some((f) => f.status === 'pending')) {
        await Promise.all(
          pendingFiles
            .filter((entry) => entry.status === 'pending')
            .map(async (entry) => {
              setPendingFiles((prev) =>
                prev.map((f) => f.id === entry.id ? { ...f, status: 'uploading' } : f)
              );
              try {
                const fd = new FormData();
                fd.append('file', entry.file);
                fd.append('claimId', claim.claimId);
                fd.append('fileType', entry.fileType);
                const res = await fetch('/api/client/documents/upload', {
                  method: 'POST',
                  headers: token ? { Authorization: `Bearer ${token}` } : {},
                  body: fd,
                });
                if (!res.ok) {
                  const err = await res.json().catch(() => ({}));
                  setPendingFiles((prev) =>
                    prev.map((f) => f.id === entry.id ? { ...f, status: 'error', error: err.error ?? 'Erreur' } : f)
                  );
                } else {
                  setPendingFiles((prev) =>
                    prev.map((f) => f.id === entry.id ? { ...f, status: 'done' } : f)
                  );
                }
              } catch {
                setPendingFiles((prev) =>
                  prev.map((f) => f.id === entry.id ? { ...f, status: 'error', error: 'Erreur réseau' } : f)
                );
              }
            })
        );
      }

      await onUpdate(claim.claimId, editData);
      setIsEditing(false);
      setPendingFiles([]);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(claim.claimId);
      onClose();
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (!isOpen || !claim) return null;

  const statusMeta = getStatusMeta(claim.status);
  const priorityMeta = getPriorityMeta(claim.priority);
  const documents: ClaimDocument[] = claim.documents ?? [];
  const canEdit = !['CLOSED', 'REJECTED', 'APPROVED', 'IN_PAYMENT'].includes(claim.status);

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'overview',    label: 'Vue d\'ensemble' },
    { key: 'documents',   label: 'Documents', count: documents.length },
    { key: 'progression', label: 'Progression' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal panel */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ duration: 0.2 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden"
      >
        {/* ── Header ── */}
        <div className={`${statusMeta.bg} border-b border-gray-100 px-6 py-4`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-10 h-10 rounded-xl ${statusMeta.bg} border ${statusMeta.border} flex items-center justify-center shrink-0`}>
                <FileText className={`w-5 h-5 ${statusMeta.color}`} />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-gray-900 truncate">{claim.claimNumber}</h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full border ${statusMeta.border} ${statusMeta.color} bg-white/70`}>
                    {statusMeta.label}
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full ${priorityMeta.bg} ${priorityMeta.color}`}>
                    {claim.priority}
                  </span>
                  <span className="text-xs text-gray-400">{claim.claimType}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {canEdit && !isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-white/80 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <Edit className="w-3.5 h-3.5" />
                  Modifier
                </button>
              )}
              {!isEditing && (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-white/80 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Supprimer
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/60 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex border-b border-gray-100 px-6 bg-white">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative flex items-center gap-1.5 px-1 py-3 mr-6 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === tab.key ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {tab.count}
                </span>
              )}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {/* ── Overview tab ── */}
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.15 }}
                className="px-6 py-5 space-y-6"
              >
                {/* Policy & dates */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Dossier</p>
                  <div className="bg-gray-50 rounded-xl divide-y divide-gray-100">
                    <InfoRow
                      icon={Shield}
                      label="Police"
                      value={claim.policy
                        ? `${claim.policy.policyNumber} (${claim.policy.policyType})`
                        : 'N/A'}
                    />
                    <InfoRow
                      icon={Calendar}
                      label="Date du sinistre"
                      value={new Date(claim.incidentDate).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })}
                    />
                    <InfoRow
                      icon={Clock}
                      label="Date de déclaration"
                      value={new Date(claim.declarationDate ?? claim.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })}
                    />
                    <InfoRow
                      icon={MapPin}
                      label="Lieu du sinistre"
                      value={claim.incidentLocation || 'N/A'}
                    />
                  </div>
                </div>

                {/* Amounts */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Montants</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs text-gray-400 mb-1">Réclamé</p>
                      <p className="text-base font-bold text-gray-800">
                        MAD {claim.claimedAmount?.toLocaleString('fr-FR') ?? '—'}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs text-gray-400 mb-1">Estimé</p>
                      <p className="text-base font-bold text-gray-800">
                        {claim.estimatedAmount ? `MAD ${claim.estimatedAmount.toLocaleString('fr-FR')}` : '—'}
                      </p>
                    </div>
                    <div className={`rounded-xl p-4 ${claim.approvedAmount ? 'bg-green-50' : 'bg-gray-50'}`}>
                      <p className="text-xs text-gray-400 mb-1">Approuvé</p>
                      <p className={`text-base font-bold ${claim.approvedAmount ? 'text-green-700' : 'text-gray-400'}`}>
                        {claim.approvedAmount ? `MAD ${claim.approvedAmount.toLocaleString('fr-FR')}` : '—'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Description</p>
                  {isEditing ? (
                    <textarea
                      value={editData.description}
                      onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                      placeholder="Description de l'incident"
                    />
                  ) : (
                    <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-4 leading-relaxed">
                      {claim.description || '—'}
                    </p>
                  )}
                </div>

                {/* Location (editable) */}
                {isEditing && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Lieu du sinistre</p>
                    <input
                      type="text"
                      value={editData.incidentLocation}
                      onChange={(e) => setEditData({ ...editData, incidentLocation: e.target.value })}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Lieu de l'incident"
                    />
                  </div>
                )}

                {/* Damage description */}
                {claim.damageDescription && !isEditing && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Dommages</p>
                    <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-4 leading-relaxed">
                      {claim.damageDescription}
                    </p>
                  </div>
                )}

                {/* File upload */}
                {isEditing && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
                      Joindre des fichiers
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      multiple
                      className="sr-only"
                      onChange={handleFileSelect}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50 transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      Sélectionner des fichiers (JPG, PNG, PDF — max 10 Mo)
                    </button>
                    {pendingFiles.length > 0 && (
                      <ul className="mt-2 space-y-1.5">
                        {pendingFiles.map((entry) => (
                          <li key={entry.id} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                            <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                            <span className="text-xs text-gray-700 truncate flex-1 min-w-0">
                              {entry.file.name}
                            </span>
                            <select
                              value={entry.fileType}
                              onChange={(e) =>
                                setPendingFiles((prev) =>
                                  prev.map((f) => f.id === entry.id ? { ...f, fileType: e.target.value } : f)
                                )
                              }
                              disabled={entry.status !== 'pending'}
                              className="text-xs border border-gray-200 rounded-lg px-1.5 py-1 bg-white shrink-0"
                            >
                              <option value="OTHER">Autre</option>
                              <option value="PHOTO">Photo</option>
                              <option value="PDF">PDF</option>
                              <option value="INVOICE">Facture</option>
                              <option value="ESTIMATE">Devis</option>
                              <option value="POLICE_REPORT">Rapport de police</option>
                              <option value="MEDICAL_REPORT">Rapport médical</option>
                              <option value="IDENTITY_DOCUMENT">Pièce d&apos;identité</option>
                              <option value="BANK_DETAILS">RIB / IBAN</option>
                            </select>
                            {entry.status === 'uploading' && (
                              <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin shrink-0" />
                            )}
                            {entry.status === 'done' && (
                              <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                            )}
                            {entry.status === 'error' && (
                              <span title={entry.error}>
                                <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                              </span>
                            )}
                            {entry.status === 'pending' && (
                              <button
                                type="button"
                                onClick={() => handleRemovePending(entry.id)}
                                className="text-gray-300 hover:text-red-400 shrink-0 transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Edit actions */}
                {isEditing && (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {saving ? 'Enregistrement…' : 'Enregistrer'}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditData({ description: claim.description ?? '', incidentLocation: claim.incidentLocation ?? '' });
                      }}
                      disabled={saving}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 disabled:opacity-60 transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Annuler
                    </button>
                  </div>
                )}

                {/* Support CTA */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
                  <MessageSquare className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-blue-800">Une question sur ce sinistre ?</p>
                    <p className="text-xs text-blue-600 mt-0.5">
                      Utilisez la messagerie pour contacter votre conseiller directement.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Documents tab ── */}
            {activeTab === 'documents' && (
              <motion.div
                key="documents"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.15 }}
                className="px-6 py-5"
              >
                {documents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <Paperclip className="w-7 h-7 text-gray-400" />
                    </div>
                    <p className="text-sm font-semibold text-gray-600 mb-1">Aucun document joint</p>
                    <p className="text-xs text-gray-400 max-w-xs">
                      Les documents transmis par votre conseiller ou téléchargés lors de la déclaration apparaîtront ici.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-400 mb-3">
                      {documents.length} document{documents.length > 1 ? 's' : ''} — cliquez sur
                      <Eye className="inline w-3 h-3 mx-1" /> pour aperçu ou
                      <Download className="inline w-3 h-3 mx-1" /> pour télécharger
                    </p>
                    {documents.map((doc) => (
                      <DocumentItem key={doc.documentId} doc={doc} />
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Progression tab ── */}
            {activeTab === 'progression' && (
              <motion.div
                key="progression"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.15 }}
                className="px-6 py-5 space-y-4"
              >
                <div className="bg-gray-50 rounded-xl p-5">
                  <StatusTimeline status={claim.status} />
                </div>

                {/* Submission details */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Informations de soumission</p>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                    Canal : <span className="font-medium text-gray-800 ml-1">{claim.declarationChannel ?? 'WEB'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                    Soumis le :{' '}
                    <span className="font-medium text-gray-800 ml-1">
                      {new Date(claim.declarationDate ?? claim.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })}
                    </span>
                  </div>
                  {claim.assignedUser && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                      Gestionnaire :{' '}
                      <span className="font-medium text-gray-800 ml-1">
                        {claim.assignedUser.firstName} {claim.assignedUser.lastName}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Delete confirmation overlay ── */}
        {confirmDelete && (
          <div className="absolute inset-0 z-10 bg-white/90 backdrop-blur-sm flex items-center justify-center p-6 rounded-2xl">
            <div className="text-center max-w-sm">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-2">Supprimer ce sinistre ?</h3>
              <p className="text-sm text-gray-500 mb-5">
                Cette action ne peut pas être annulée. Votre conseiller sera notifié de votre demande.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-60"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-60"
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  {deleting ? 'Suppression…' : 'Confirmer la suppression'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/80 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Réf. {claim.claimNumber}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Fermer
          </button>
        </div>
      </motion.div>
    </div>
  );
}
