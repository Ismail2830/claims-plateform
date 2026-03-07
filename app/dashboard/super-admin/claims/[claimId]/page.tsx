'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  User,
  FileText,
  Brain,
  Clock,
  ExternalLink,
  Download,
  Upload,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  File,
  Shield,
  MapPin,
  Calendar,
  DollarSign,
  Tag,
  UserCheck,
  Phone,
  Hash,
  RefreshCw,
  MoreVertical,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RiskBadge } from '@/components/sinistres/RiskBadge';
import { DecisionPanel } from '@/components/sinistres/DecisionPanel';
import { cn } from '@/lib/utils';
import type { ClaimDetail } from '@/app/components/dashboard/claims/ClaimDetailPanel';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  DECLARED:        'Déclaré',
  ANALYZING:       'Analyse',
  DOCS_REQUIRED:   'Docs requis',
  UNDER_EXPERTISE: 'En expertise',
  IN_DECISION:     'Décision',
  APPROVED:        'Approuvé',
  IN_PAYMENT:      'En paiement',
  CLOSED:          'Clôturé',
  REJECTED:        'Rejeté',
};

const STATUS_COLORS: Record<string, string> = {
  DECLARED:        'bg-gray-100 text-gray-700 border-gray-200',
  ANALYZING:       'bg-blue-100 text-blue-800 border-blue-200',
  DOCS_REQUIRED:   'bg-yellow-100 text-yellow-800 border-yellow-200',
  UNDER_EXPERTISE: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  IN_DECISION:     'bg-purple-100 text-purple-800 border-purple-200',
  APPROVED:        'bg-green-100 text-green-800 border-green-200',
  IN_PAYMENT:      'bg-teal-100 text-teal-800 border-teal-200',
  CLOSED:          'bg-gray-200 text-gray-600 border-gray-300',
  REJECTED:        'bg-red-100 text-red-800 border-red-200',
};

const PRIORITY_CONFIG: Record<string, { label: string; colors: string }> = {
  LOW:    { label: 'Faible',  colors: 'bg-gray-100 text-gray-600 border-gray-200' },
  NORMAL: { label: 'Normal',  colors: 'bg-blue-100 text-blue-700 border-blue-200' },
  HIGH:   { label: 'Haute',   colors: 'bg-orange-100 text-orange-700 border-orange-200' },
  URGENT: { label: 'Urgente', colors: 'bg-red-100 text-red-700 border-red-200' },
};

const CLAIM_TYPE_LABELS: Record<string, string> = {
  ACCIDENT:     'Accident',
  THEFT:        'Vol',
  FIRE:         'Incendie',
  WATER_DAMAGE: 'Dégât des eaux',
};

const CLAIM_TYPE_ICONS: Record<string, string> = {
  ACCIDENT: '⚠️', THEFT: '🔒', FIRE: '🔥', WATER_DAMAGE: '💧',
};

const LABEL_FR: Record<string, string> = {
  FAIBLE: 'Faible', MOYEN: 'Moyen', ELEVE: 'Élevé', SUSPICIEUX: 'Suspicieux',
};

const ACTION_COLORS: Record<string, string> = {
  CREATE:   'bg-green-100 text-green-700 border-green-200',
  UPDATE:   'bg-blue-100 text-blue-700 border-blue-200',
  DELETE:   'bg-red-100 text-red-700 border-red-200',
  APPROVE:  'bg-emerald-100 text-emerald-700 border-emerald-200',
  REJECT:   'bg-red-100 text-red-700 border-red-200',
  ESCALATE: 'bg-orange-100 text-orange-700 border-orange-200',
  SCORE:    'bg-indigo-100 text-indigo-700 border-indigo-200',
  VIEW:     'bg-gray-100 text-gray-600 border-gray-200',
  UPLOAD:   'bg-purple-100 text-purple-700 border-purple-200',
};

const FILE_ICONS: Record<string, string> = {
  'application/pdf': '📄',
  'image/jpeg':      '🖼️',
  'image/png':       '🖼️',
  'image/webp':      '🖼️',
  DEFAULT:           '📎',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(amount?: number | null) {
  if (amount == null) return '—';
  const n = Number(amount);
  return isNaN(n) ? '—' : n.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD', minimumFractionDigits: 0 });
}
function fmtDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtDateTime(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtBytes(bytes: number) {
  if (bytes < 1024)        return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, value }: {
  icon: React.ElementType; label: string; value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-gray-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide leading-none mb-1">{label}</p>
        <div className="text-sm text-gray-800 font-medium">{value ?? '—'}</div>
      </div>
    </div>
  );
}

function SectionCard({ title, children, className }: {
  title?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn('bg-white rounded-xl border border-gray-200 overflow-hidden', className)}>
      {title && (
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-6 w-40" />
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex gap-4 items-start">
          <div className="flex-1 space-y-3">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-5 w-72" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
          </div>
          <Skeleton className="h-16 w-24 rounded-xl" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
              <Skeleton className="h-5 w-32" />
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="flex gap-3">
                  <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-1.5 pt-1">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ClaimDetailPage() {
  const router  = useRouter();
  const params  = useParams<{ claimId: string }>();
  const claimId = params.claimId;

  const [detail,    setDetail]    = useState<ClaimDetail | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [saving,    setSaving]    = useState<string | null>(null);
  const [feedback,  setFeedback]  = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/claims/${claimId}`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Dossier introuvable ou accès refusé.');
      setDetail(await res.json() as ClaimDetail);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [claimId]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  async function handleDecision(action: 'APPROUVER' | 'REFUSER' | 'ESCALADER') {
    if (!detail) return;
    setSaving(action);
    setFeedback(null);
    try {
      const res = await fetch(`/api/claims/${claimId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          status: action === 'APPROUVER' ? 'APPROVED' : action === 'REFUSER' ? 'REJECTED' : 'UNDER_EXPERTISE',
        }),
        credentials: 'include',
      });
      if (res.ok) {
        setFeedback({ type: 'ok', msg: 'Décision enregistrée avec succès.' });
        await fetchDetail();
      } else {
        setFeedback({ type: 'err', msg: "Erreur lors de l'enregistrement." });
      }
    } catch {
      setFeedback({ type: 'err', msg: 'Erreur réseau.' });
    } finally {
      setSaving(null);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!detail) return;
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('claimId', detail.claimId);
      await fetch('/api/claims/upload', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: fd,
        credentials: 'include',
      });
      await fetchDetail();
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  // ── Render states ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6">
        <PageSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
        <div className="bg-white rounded-2xl border border-red-100 p-12 text-center">
          <AlertTriangle className="w-12 h-12 text-red-300 mx-auto mb-3" />
          <p className="text-base font-semibold text-red-600 mb-2">{error}</p>
          <button onClick={fetchDetail} className="text-sm text-blue-600 hover:underline">
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (!detail) return null;

  const priCfg    = PRIORITY_CONFIG[detail.priority] ?? PRIORITY_CONFIG.NORMAL;
  const labelFr   = detail.labelRisque ? (LABEL_FR[detail.labelRisque] ?? detail.labelRisque) : null;
  const confPct   = detail.scoreConfidence != null ? Math.round(detail.scoreConfidence) : null;
  const montant   = Number(detail.claimedAmount ?? 0);
  const sigMontant = montant > 50000 ? 90 : montant > 10000 ? 50 : 20;
  const decl      = detail.declarationDate ? new Date(detail.declarationDate).getTime() : Date.now();
  const inc       = detail.incidentDate    ? new Date(detail.incidentDate).getTime()    : Date.now();
  const delai     = Math.max(0, Math.round((decl - inc) / (1000 * 60 * 60 * 24)));
  const sigDelai  = delai > 30 ? 90 : delai > 7 ? 50 : 10;
  const typeRisk: Record<string, number> = { ACCIDENT: 60, THEFT: 75, FIRE: 55, WATER_DAMAGE: 40 };
  const sigType   = typeRisk[detail.claimType] ?? 50;
  const sigHisto  = (detail.scoreRisque ?? 0) > 60 ? 80 : (detail.scoreRisque ?? 0) > 30 ? 40 : 15;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

      {/* ── Breadcrumb / Back ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-500">Sinistres</span>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-medium text-gray-700 font-mono">{detail.claimNumber}</span>
        </div>
        <button
          onClick={fetchDetail}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Actualiser
        </button>
      </div>

      {/* ── Claim header card ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className="text-2xl">{CLAIM_TYPE_ICONS[detail.claimType] ?? '📄'}</span>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {CLAIM_TYPE_LABELS[detail.claimType] ?? detail.claimType}
                </h1>
                <p className="text-sm text-gray-400 font-mono">{detail.claimNumber}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-3">
              {/* Status */}
              <span className={cn(
                'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border',
                STATUS_COLORS[detail.status] ?? 'bg-gray-100 text-gray-700',
              )}>
                {STATUS_LABELS[detail.status] ?? detail.status}
              </span>

              {/* Priority */}
              <span className={cn(
                'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border',
                priCfg.colors,
              )}>
                Priorité: {priCfg.label}
              </span>

              {/* Client */}
              {detail.client && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                  <User className="w-3 h-3" />
                  {detail.client.firstName} {detail.client.lastName}
                </span>
              )}

              {/* Montant */}
              {detail.claimedAmount != null && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                  <DollarSign className="w-3 h-3" />
                  {fmt(detail.claimedAmount)}
                </span>
              )}

              {/* Created */}
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs text-gray-500 bg-gray-50 border border-gray-100">
                <Calendar className="w-3 h-3" />
                {fmtDate(detail.createdAt)}
              </span>
            </div>
          </div>

          {/* Risk score pill */}
          {detail.scoreRisque != null && labelFr && (
            <div className="shrink-0">
              <RiskBadge label={labelFr} score={detail.scoreRisque} size="lg" />
            </div>
          )}
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left column: tabs with info / docs / history */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="info" className="space-y-4">
            <TabsList className="bg-white border border-gray-200 rounded-xl p-1 gap-1 h-auto shadow-sm w-full justify-start">
              <TabsTrigger value="info" className="text-sm data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg px-4 py-2">
                <User className="w-4 h-4 mr-2" />
                Informations
              </TabsTrigger>
              <TabsTrigger value="docs" className="text-sm data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg px-4 py-2">
                <FileText className="w-4 h-4 mr-2" />
                Documents
                {detail.documents.length > 0 && (
                  <span className="ml-1.5 bg-blue-100 data-[state=active]:bg-white/20 text-blue-700 data-[state=active]:text-white text-xs rounded-full px-1.5 py-0.5 leading-none font-bold">
                    {detail.documents.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="history" className="text-sm data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg px-4 py-2">
                <Clock className="w-4 h-4 mr-2" />
                Historique
                {detail.auditLogs.length > 0 && (
                  <span className="ml-1.5 bg-gray-100 text-gray-600 text-xs rounded-full px-1.5 py-0.5 leading-none font-bold">
                    {detail.auditLogs.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* ── Tab: Informations ── */}
            <TabsContent value="info" className="space-y-4 mt-0">
              {/* Client */}
              <SectionCard title="Client">
                {detail.client ? (
                  <div>
                    <InfoRow icon={User}       label="Nom complet"  value={`${detail.client.firstName} ${detail.client.lastName}`} />
                    <InfoRow icon={FileText}   label="Email"        value={detail.client.email} />
                    <InfoRow icon={Phone}      label="Téléphone"    value={detail.client.phone} />
                    {detail.client.address && (
                      <InfoRow icon={MapPin}   label="Adresse"      value={`${detail.client.address}${detail.client.city ? `, ${detail.client.city}` : ''}`} />
                    )}
                    <div className="pt-2">
                      <button
                        onClick={() => router.push(`/dashboard/super-admin/clients?id=${detail.client!.clientId}`)}
                        className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Voir le profil client
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">Client non associé</p>
                )}
              </SectionCard>

              {/* Police */}
              <SectionCard title="Police d'assurance">
                {detail.policy ? (
                  <div>
                    <InfoRow icon={Hash}        label="Numéro police"  value={detail.policy.policyNumber} />
                    <InfoRow icon={Tag}         label="Type"           value={detail.policy.policyType} />
                    <InfoRow icon={DollarSign}  label="Capital assuré" value={fmt(detail.policy.insuredAmount)} />
                    <InfoRow icon={Calendar}    label="Période"        value={`${fmtDate(detail.policy.startDate)} → ${fmtDate(detail.policy.endDate)}`} />
                    <div className="pt-2">
                      <button
                        onClick={() => router.push(`/dashboard/super-admin/policies?id=${detail.policy!.policyId}`)}
                        className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Voir la police
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">Aucune police associée</p>
                )}
              </SectionCard>

              {/* Sinistre details */}
              <SectionCard title="Détails du sinistre">
                <InfoRow icon={Tag}       label="Type"              value={CLAIM_TYPE_LABELS[detail.claimType] ?? detail.claimType} />
                <InfoRow icon={Calendar}  label="Date de l'incident"  value={fmtDate(detail.incidentDate)} />
                <InfoRow icon={Calendar}  label="Date de déclaration"  value={fmtDate(detail.declarationDate)} />
                {detail.incidentLocation && (
                  <InfoRow icon={MapPin}  label="Lieu de l'incident" value={detail.incidentLocation} />
                )}
                <InfoRow icon={DollarSign} label="Montant déclaré"  value={fmt(detail.claimedAmount)} />
                {detail.estimatedAmount != null && (
                  <InfoRow icon={DollarSign} label="Montant estimé" value={fmt(detail.estimatedAmount)} />
                )}
                {detail.approvedAmount != null && (
                  <InfoRow icon={DollarSign} label="Montant approuvé" value={
                    <span className="text-green-600">{fmt(detail.approvedAmount)}</span>
                  } />
                )}
              </SectionCard>

              {/* Description */}
              {(detail.description || detail.damageDescription) && (
                <SectionCard title="Description">
                  {detail.description && (
                    <div className="mb-4 last:mb-0">
                      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-2">Description</p>
                      <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-lg p-4 border border-gray-100">
                        {detail.description}
                      </p>
                    </div>
                  )}
                  {detail.damageDescription && (
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-2">Dommages</p>
                      <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-lg p-4 border border-gray-100">
                        {detail.damageDescription}
                      </p>
                    </div>
                  )}
                </SectionCard>
              )}

              {/* Assignation */}
              <SectionCard title="Assignation">
                {detail.assignedUser ? (
                  <div>
                    <InfoRow icon={UserCheck} label="Gestionnaire" value={`${detail.assignedUser.firstName} ${detail.assignedUser.lastName}`} />
                    <InfoRow icon={Tag}       label="Rôle"         value={detail.assignedUser.role.replace(/_/g, ' ')} />
                    <InfoRow icon={FileText}  label="Email"        value={detail.assignedUser.email} />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-400" />
                    Non assigné
                  </div>
                )}
              </SectionCard>
            </TabsContent>

            {/* ── Tab: Documents ── */}
            <TabsContent value="docs" className="mt-0">
              <SectionCard>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold text-gray-700">
                    {detail.documents.length} document{detail.documents.length !== 1 ? 's' : ''}
                  </p>
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {uploading ? 'Envoi…' : 'Ajouter'}
                  </button>
                  <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} />
                </div>

                {detail.documents.length === 0 ? (
                  <div className="flex flex-col items-center py-16 text-center space-y-3">
                    <File className="w-12 h-12 text-gray-200" />
                    <p className="text-sm text-gray-400">Aucun document pour ce dossier</p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {detail.documents.map(doc => (
                      <li key={doc.documentId} className="flex items-center gap-3 p-3.5 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                        <span className="text-2xl shrink-0">{FILE_ICONS[doc.mimeType] ?? FILE_ICONS.DEFAULT}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{doc.originalName}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {fmtBytes(doc.fileSize)} · {fmtDate(doc.createdAt)}
                            {doc.uploadedByUser && ` · par ${doc.uploadedByUser.firstName} ${doc.uploadedByUser.lastName}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className={cn(
                            'text-xs px-2 py-0.5 rounded-full font-medium',
                            doc.status === 'VERIFIED' ? 'bg-green-100 text-green-700' :
                            doc.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-600',
                          )}>
                            {doc.status === 'VERIFIED' ? 'Vérifié' : doc.status === 'REJECTED' ? 'Rejeté' : 'En attente'}
                          </span>
                          <a
                            href={`/api/documents/file/${doc.filePath.replace(/^\/uploads\//, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-white rounded-lg transition-colors"
                            title="Télécharger"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>
            </TabsContent>

            {/* ── Tab: Historique ── */}
            <TabsContent value="history" className="mt-0">
              <SectionCard title="Journal d'activité">
                {detail.auditLogs.length === 0 ? (
                  <div className="flex flex-col items-center py-12 text-center space-y-3">
                    <Clock className="w-10 h-10 text-gray-200" />
                    <p className="text-sm text-gray-400">Aucun événement enregistré</p>
                  </div>
                ) : (
                  <ol className="relative border-l border-gray-200 ml-3 space-y-5">
                    {detail.auditLogs.map(log => (
                      <li key={log.logId} className="ml-6">
                        <span className="absolute -left-1.5 w-3 h-3 rounded-full bg-white border-2 border-gray-300" />
                        <div className="flex items-start gap-2 flex-wrap">
                          <span className={cn(
                            'inline-block text-xs font-semibold px-2 py-0.5 rounded-full border',
                            ACTION_COLORS[log.action] ?? ACTION_COLORS.VIEW,
                          )}>
                            {log.action}
                          </span>
                          <time className="text-xs text-gray-400 mt-0.5">{fmtDateTime(log.createdAt)}</time>
                        </div>
                        <p className="text-sm text-gray-700 mt-1">{log.description}</p>
                        {log.userRef && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            Par {log.userRef.firstName} {log.userRef.lastName}
                            <span className="ml-1 text-gray-300">·</span>
                            <span className="ml-1">{log.userRef.role.replace(/_/g, ' ')}</span>
                          </p>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
              </SectionCard>
            </TabsContent>
          </Tabs>
        </div>

        {/* ── Right sidebar: AI + quick actions ── */}
        <div className="space-y-4">

          {/* Analyse IA */}
          <SectionCard title="Analyse IA">
            {!detail.scoreRisque && !detail.labelRisque ? (
              <div className="flex flex-col items-center py-8 text-center space-y-2">
                <Brain className="w-10 h-10 text-gray-200" />
                <p className="text-sm text-gray-500 font-medium">Pas encore analysé</p>
                <p className="text-xs text-gray-400">Lancez le scoring depuis la page IA</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Score summary */}
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="text-center shrink-0">
                    <div className={cn(
                      'text-4xl font-black leading-none',
                      (detail.scoreRisque ?? 0) >= 80 ? 'text-red-600' :
                      (detail.scoreRisque ?? 0) >= 61 ? 'text-orange-500' :
                      (detail.scoreRisque ?? 0) >= 41 ? 'text-yellow-500' :
                      'text-green-600',
                    )}>
                      {detail.scoreRisque ?? 0}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">/ 100</div>
                  </div>
                  <div className="flex-1">
                    {labelFr && <RiskBadge label={labelFr} score={detail.scoreRisque ?? 0} size="md" />}
                    {confPct !== null && (
                      <div className="mt-2.5">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Confiance IA</span>
                          <span className="font-semibold">{confPct}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${confPct}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Signal breakdown */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Montant',    value: sigMontant, detail: fmt(detail.claimedAmount) },
                    { label: 'Délai',      value: sigDelai,   detail: `${delai} j` },
                    { label: 'Type',       value: sigType,    detail: CLAIM_TYPE_LABELS[detail.claimType] ?? detail.claimType },
                    { label: 'Historique', value: sigHisto,   detail: `Score ${detail.scoreRisque ?? 0}` },
                  ].map(sig => (
                    <div key={sig.label} className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
                      <p className="text-xs text-gray-500 mb-0.5 truncate">{sig.label}</p>
                      <p className="text-xs font-medium text-gray-400 mb-1.5 truncate">{sig.detail}</p>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full', sig.value >= 70 ? 'bg-red-500' : sig.value >= 45 ? 'bg-yellow-500' : 'bg-green-500')}
                          style={{ width: `${sig.value}%` }}
                        />
                      </div>
                      <p className={cn('text-xs font-bold mt-1',
                        sig.value >= 70 ? 'text-red-600' : sig.value >= 45 ? 'text-yellow-600' : 'text-green-600',
                      )}>{sig.value}%</p>
                    </div>
                  ))}
                </div>

                {/* AI Decision recommendation */}
                {detail.decisionIa && (
                  <DecisionPanel
                    decision={detail.decisionIa as 'AUTO_APPROUVER' | 'REVISION_MANUELLE' | 'ESCALADER'}
                    confidence={confPct ?? 0}
                    canOverride={false}
                  />
                )}

                {detail.scoredAt && (
                  <p className="text-xs text-gray-400 text-center">Analysé le {fmtDateTime(detail.scoredAt)}</p>
                )}
              </div>
            )}
          </SectionCard>

          {/* Quick decision actions */}
          <SectionCard title="Décision gestionnaire">
            {feedback && (
              <div className={cn(
                'text-sm px-3 py-2 rounded-lg border mb-3',
                feedback.type === 'ok' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200',
              )}>
                {feedback.msg}
              </div>
            )}
            <div className="space-y-2">
              <button
                onClick={() => handleDecision('APPROUVER')}
                disabled={!!saving || detail.status === 'APPROVED'}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-green-600 rounded-xl hover:bg-green-700 disabled:opacity-40 transition-colors"
              >
                {saving === 'APPROUVER' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Approuver
              </button>
              <button
                onClick={() => handleDecision('REFUSER')}
                disabled={!!saving || detail.status === 'REJECTED'}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-40 transition-colors"
              >
                {saving === 'REFUSER' ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Refuser
              </button>
              <button
                onClick={() => handleDecision('ESCALADER')}
                disabled={!!saving}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-orange-500 rounded-xl hover:bg-orange-600 disabled:opacity-40 transition-colors"
              >
                {saving === 'ESCALADER' ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                Escalader
              </button>
            </div>
          </SectionCard>

          {/* Meta info */}
          <SectionCard title="Métadonnées">
            <InfoRow icon={Hash}     label="ID"          value={<span className="font-mono text-xs">{detail.claimId}</span>} />
            <InfoRow icon={Calendar} label="Créé le"     value={fmtDateTime(detail.createdAt)} />
            <InfoRow icon={Calendar} label="Mis à jour"  value={fmtDateTime(detail.updatedAt)} />
            <InfoRow icon={Shield}   label="Source"      value={detail.assignedTo ? 'Assigné' : 'Non assigné'} />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
