'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
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
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RiskBadge } from '@/components/sinistres/RiskBadge';
import { DecisionPanel } from '@/components/sinistres/DecisionPanel';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClaimDocument {
  documentId:   string;
  originalName: string;
  fileType:     string;
  mimeType:     string;
  fileSize:     number;
  filePath:     string;
  status:       string;
  description:  string | null;
  createdAt:    string;
  uploadedByUser: { firstName: string; lastName: string } | null;
}

interface AuditEntry {
  logId:       string;
  action:      string;
  description: string;
  createdAt:   string;
  riskLevel:   string;
  userRef:     { firstName: string; lastName: string; role: string } | null;
}

export interface ClaimDetail {
  claimId:          string;
  claimNumber:      string;
  claimType:        string;
  status:           string;
  priority:         string;
  incidentDate:     string;
  incidentLocation: string | null;
  declarationDate:  string;
  description:      string;
  damageDescription:string | null;
  claimedAmount:    number | null;
  estimatedAmount:  number | null;
  approvedAmount:   number | null;
  createdAt:        string;
  updatedAt:        string;
  assignedTo:       string | null;
  scoreRisque:      number | null;
  labelRisque:      string | null;
  decisionIa:       string | null;
  scoreConfidence:  number | null;
  scoredAt:         string | null;
  client: {
    clientId:  string;
    firstName: string;
    lastName:  string;
    email:     string;
    phone:     string;
    address:   string | null;
    city:      string | null;
  } | null;
  policy: {
    policyId:      string;
    policyNumber:  string;
    policyType:    string;
    insuredAmount: number;
    startDate:     string;
    endDate:       string;
    status:        string;
  } | null;
  assignedUser: {
    userId:    string;
    firstName: string;
    lastName:  string;
    email:     string;
    role:      string;
  } | null;
  documents: ClaimDocument[];
  auditLogs: AuditEntry[];
}

interface ClaimDetailPanelProps {
  claimId:  string | null;
  onClose:  () => void;
  onUpdated?: () => void;
}

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
  DECLARED:        'bg-gray-100 text-gray-700',
  ANALYZING:       'bg-blue-100 text-blue-800',
  DOCS_REQUIRED:   'bg-yellow-100 text-yellow-800',
  UNDER_EXPERTISE: 'bg-indigo-100 text-indigo-800',
  IN_DECISION:     'bg-purple-100 text-purple-800',
  APPROVED:        'bg-green-100 text-green-800',
  IN_PAYMENT:      'bg-teal-100 text-teal-800',
  CLOSED:          'bg-gray-200 text-gray-600',
  REJECTED:        'bg-red-100 text-red-800',
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Faible', NORMAL: 'Normal', HIGH: 'Haute', URGENT: 'Urgent',
};

const CLAIM_TYPE_LABELS: Record<string, string> = {
  ACCIDENT:     'Accident',
  THEFT:        'Vol',
  FIRE:         'Incendie',
  WATER_DAMAGE: 'Dégât des eaux',
};

const LABEL_FR: Record<string, string> = {
  FAIBLE:     'Faible',
  MOYEN:      'Moyen',
  ELEVE:      'Élevé',
  SUSPICIEUX: 'Suspicieux',
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
  if (bytes < 1024)       return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, value, className }: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0', className)}>
      <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5 text-gray-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider leading-none mb-0.5">{label}</p>
        <div className="text-sm text-gray-800 font-medium wrap-break-word">{value || '—'}</div>
      </div>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3 mt-5 first:mt-0 flex items-center gap-2">
      <span className="w-3 h-px bg-gray-300 block" />
      {children}
      <span className="flex-1 h-px bg-gray-100 block" />
    </h3>
  );
}

function SkeletonPanel() {
  return (
    <div className="p-5 space-y-4 animate-pulse">
      <div className="h-6 bg-gray-100 rounded w-2/3" />
      <div className="h-4 bg-gray-100 rounded w-1/3" />
      <div className="space-y-3 mt-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <div className="w-7 h-7 bg-gray-100 rounded-lg shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-2.5 bg-gray-100 rounded w-1/4" />
              <div className="h-4 bg-gray-100 rounded w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tab: Informations ────────────────────────────────────────────────────────

function TabInformations({ claim, router }: { claim: ClaimDetail; router: ReturnType<typeof useRouter> }) {
  return (
    <div className="p-5 space-y-1 overflow-y-auto">
      <SectionHeading>Client</SectionHeading>
      {claim.client ? (
        <>
          <InfoRow icon={User}     label="Nom complet"  value={`${claim.client.firstName} ${claim.client.lastName}`} />
          <InfoRow icon={FileText} label="Email"        value={claim.client.email} />
          <InfoRow icon={Shield}   label="Téléphone"    value={claim.client.phone} />
          {claim.client.address && <InfoRow icon={MapPin} label="Adresse" value={`${claim.client.address}${claim.client.city ? `, ${claim.client.city}` : ''}`} />}
          <div className="pt-1">
            <button
              onClick={() => router.push(`/dashboard/super-admin/clients?id=${claim.client!.clientId}`)}
              className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
            >
              <ExternalLink className="w-3 h-3" />
              Voir le profil client
            </button>
          </div>
        </>
      ) : (
        <p className="text-sm text-gray-400 py-2">Client non associé</p>
      )}

      <SectionHeading>Police</SectionHeading>
      {claim.policy ? (
        <>
          <InfoRow icon={Shield}   label="Numéro police"     value={claim.policy.policyNumber} />
          <InfoRow icon={Tag}      label="Type"              value={claim.policy.policyType} />
          <InfoRow icon={DollarSign} label="Capital assuré"  value={fmt(claim.policy.insuredAmount)} />
          <InfoRow icon={Calendar} label="Période"          value={`${fmtDate(claim.policy.startDate)} → ${fmtDate(claim.policy.endDate)}`} />
          <div className="pt-1">
            <button
              onClick={() => router.push(`/dashboard/super-admin/policies?id=${claim.policy!.policyId}`)}
              className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
            >
              <ExternalLink className="w-3 h-3" />
              Voir la police
            </button>
          </div>
        </>
      ) : (
        <p className="text-sm text-gray-400 py-2">Aucune police associée</p>
      )}

      <SectionHeading>Sinistre</SectionHeading>
      <InfoRow icon={Tag}       label="Type de sinistre"  value={CLAIM_TYPE_LABELS[claim.claimType] ?? claim.claimType} />
      <InfoRow icon={Calendar}  label="Date de l'incident" value={fmtDate(claim.incidentDate)} />
      <InfoRow icon={Calendar}  label="Date de déclaration" value={fmtDate(claim.declarationDate)} />
      {claim.incidentLocation && (
        <InfoRow icon={MapPin}  label="Lieu de l'incident" value={claim.incidentLocation} />
      )}
      <InfoRow icon={DollarSign} label="Montant déclaré"  value={fmt(claim.claimedAmount)} />
      {claim.estimatedAmount != null && (
        <InfoRow icon={DollarSign} label="Montant estimé" value={fmt(claim.estimatedAmount)} />
      )}
      {claim.approvedAmount != null && (
        <InfoRow icon={DollarSign} label="Montant approuvé" value={
          <span className="text-green-600">{fmt(claim.approvedAmount)}</span>
        } />
      )}

      <SectionHeading>Assignation</SectionHeading>
      {claim.assignedUser ? (
        <>
          <InfoRow icon={UserCheck} label="Gestionnaire" value={`${claim.assignedUser.firstName} ${claim.assignedUser.lastName}`} />
          <InfoRow icon={Tag}       label="Rôle"         value={claim.assignedUser.role.replace(/_/g, ' ')} />
          <InfoRow icon={FileText}  label="Email"        value={claim.assignedUser.email} />
        </>
      ) : (
        <p className="text-sm text-gray-400 py-2">Non assigné</p>
      )}

      {claim.description && (
        <>
          <SectionHeading>Description</SectionHeading>
          <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-lg p-3 border border-gray-100">
            {claim.description}
          </p>
        </>
      )}

      {claim.damageDescription && (
        <>
          <SectionHeading>Dommages</SectionHeading>
          <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-lg p-3 border border-gray-100">
            {claim.damageDescription}
          </p>
        </>
      )}
    </div>
  );
}

// ─── Tab: Analyse IA ──────────────────────────────────────────────────────────

function TabAnalyse({ claim, onDecisionSaved }: { claim: ClaimDetail; onDecisionSaved?: () => void }) {
  const [saving, setSaving] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  const labelFr  = claim.labelRisque ? (LABEL_FR[claim.labelRisque] ?? claim.labelRisque) : null;
  const confPct  = claim.scoreConfidence != null ? Math.round(claim.scoreConfidence) : null;

  // Compute signal breakdown (mimic the ML logic)
  const montant  = Number(claim.claimedAmount ?? 0);
  const sigMontant = montant > 50000 ? 90 : montant > 10000 ? 50 : 20;

  const decl     = claim.declarationDate ? new Date(claim.declarationDate).getTime() : Date.now();
  const inc      = claim.incidentDate    ? new Date(claim.incidentDate).getTime()    : Date.now();
  const delai    = Math.max(0, Math.round((decl - inc) / (1000 * 60 * 60 * 24)));
  const sigDelai = delai > 30 ? 90 : delai > 7 ? 50 : 10;

  const typeRisk: Record<string, number> = { ACCIDENT: 60, THEFT: 75, FIRE: 55, WATER_DAMAGE: 40 };
  const sigType  = typeRisk[claim.claimType] ?? 50;

  const sigHisto = (claim.scoreRisque ?? 0) > 60 ? 80 : (claim.scoreRisque ?? 0) > 30 ? 40 : 15;

  async function handleDecision(decision: 'APPROUVER' | 'REFUSER' | 'ESCALADER') {
    setSaving(decision);
    setFeedback(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
      const res = await fetch(`/api/claims/${claim.claimId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          status: decision === 'APPROUVER' ? 'APPROVED' : decision === 'REFUSER' ? 'REJECTED' : 'UNDER_EXPERTISE',
        }),
      });
      if (res.ok) {
        setFeedback({ type: 'ok', msg: 'Décision enregistrée avec succès.' });
        onDecisionSaved?.();
      } else {
        setFeedback({ type: 'err', msg: 'Erreur lors de l\'enregistrement.' });
      }
    } catch {
      setFeedback({ type: 'err', msg: 'Erreur réseau.' });
    } finally {
      setSaving(null);
    }
  }

  if (!claim.scoreRisque && !claim.labelRisque) {
    return (
      <div className="flex flex-col items-center justify-center p-10 text-center space-y-3">
        <Brain className="w-12 h-12 text-gray-200" />
        <p className="text-sm font-medium text-gray-500">Ce dossier n'a pas encore été analysé par l'IA</p>
        <p className="text-xs text-gray-400">Lancez le scoring depuis la page Scoring IA</p>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-5 overflow-y-auto">
      {/* Score summary */}
      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
        <div className="text-center shrink-0">
          <div className={cn(
            'text-3xl font-black leading-none',
            (claim.scoreRisque ?? 0) >= 80 ? 'text-red-600' :
            (claim.scoreRisque ?? 0) >= 61 ? 'text-orange-500' :
            (claim.scoreRisque ?? 0) >= 41 ? 'text-yellow-500' :
            'text-green-600',
          )}>
            {claim.scoreRisque ?? 0}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">/ 100</div>
        </div>
        <div className="flex-1 min-w-0">
          {labelFr && <RiskBadge label={labelFr} score={claim.scoreRisque ?? 0} size="md" />}
          {confPct !== null && (
            <div className="mt-2.5">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Confiance IA</span>
                <span className="font-semibold">{confPct}%</span>
              </div>
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${confPct}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Signal breakdown */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Signaux de risque</h4>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Montant déclaré', value: sigMontant, detail: fmt(claim.claimedAmount) },
            { label: `Délai déclaration`, value: sigDelai, detail: `${delai} j` },
            { label: 'Type de sinistre', value: sigType, detail: CLAIM_TYPE_LABELS[claim.claimType] ?? claim.claimType },
            { label: 'Historique risque', value: sigHisto, detail: `Score ${claim.scoreRisque ?? 0}` },
          ].map(sig => (
            <div key={sig.label} className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
              <p className="text-xs text-gray-500 mb-1 truncate">{sig.label}</p>
              <p className="text-xs font-medium text-gray-400 mb-2">{sig.detail}</p>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    sig.value >= 70 ? 'bg-red-500' : sig.value >= 45 ? 'bg-yellow-500' : 'bg-green-500',
                  )}
                  style={{ width: `${sig.value}%` }}
                />
              </div>
              <p className={cn(
                'text-xs font-bold mt-1',
                sig.value >= 70 ? 'text-red-600' : sig.value >= 45 ? 'text-yellow-600' : 'text-green-600',
              )}>{sig.value}%</p>
            </div>
          ))}
        </div>
      </div>

      {/* DecisionPanel */}
      {claim.decisionIa && (
        <DecisionPanel
          decision={claim.decisionIa as 'AUTO_APPROUVER' | 'REVISION_MANUELLE' | 'ESCALADER'}
          confidence={confPct ?? 0}
          canOverride={false}
        />
      )}

      {/* Manager action buttons */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Décision gestionnaire</h4>
        {feedback && (
          <div className={cn(
            'text-xs px-3 py-2 rounded-lg border',
            feedback.type === 'ok' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200',
          )}>
            {feedback.msg}
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => handleDecision('APPROUVER')}
            disabled={!!saving}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {saving === 'APPROUVER' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
            Approuver
          </button>
          <button
            onClick={() => handleDecision('REFUSER')}
            disabled={!!saving}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {saving === 'REFUSER' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
            Refuser
          </button>
          <button
            onClick={() => handleDecision('ESCALADER')}
            disabled={!!saving}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-white bg-orange-500 rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
          >
            {saving === 'ESCALADER' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5" />}
            Escalader
          </button>
        </div>
      </div>

      {claim.scoredAt && (
        <p className="text-xs text-gray-400 text-center">
          Analysé le {fmtDateTime(claim.scoredAt)}
        </p>
      )}
    </div>
  );
}

// ─── Tab: Documents ───────────────────────────────────────────────────────────

function TabDocuments({ claim }: { claim: ClaimDetail }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('claimId', claim.claimId);
      const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
      await fetch('/api/claims/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="p-5 space-y-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">
          {claim.documents.length} document{claim.documents.length !== 1 ? 's' : ''}
        </p>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          {uploading ? 'Envoi…' : 'Ajouter un document'}
        </button>
        <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} />
      </div>

      {claim.documents.length === 0 ? (
        <div className="flex flex-col items-center py-10 text-center space-y-2">
          <File className="w-10 h-10 text-gray-200" />
          <p className="text-sm text-gray-400">Aucun document pour ce dossier</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {claim.documents.map(doc => (
            <li key={doc.documentId} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
              <span className="text-xl shrink-0" aria-hidden>
                {FILE_ICONS[doc.mimeType] ?? FILE_ICONS.DEFAULT}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{doc.originalName}</p>
                <p className="text-xs text-gray-400">
                  {fmtBytes(doc.fileSize)} · {fmtDate(doc.createdAt)}
                  {doc.uploadedByUser && ` · par ${doc.uploadedByUser.firstName} ${doc.uploadedByUser.lastName}`}
                </p>
              </div>
              <a
                href={doc.filePath}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors"
                title="Télécharger"
              >
                <Download className="w-4 h-4" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Tab: Historique ──────────────────────────────────────────────────────────

function TabHistorique({ claim }: { claim: ClaimDetail }) {
  if (claim.auditLogs.length === 0) {
    return (
      <div className="flex flex-col items-center py-10 text-center space-y-2 p-5">
        <Clock className="w-10 h-10 text-gray-200" />
        <p className="text-sm text-gray-400">Aucun événement enregistré</p>
      </div>
    );
  }

  return (
    <div className="p-5 overflow-y-auto">
      <ol className="relative border-l border-gray-200 ml-3 space-y-5">
        {claim.auditLogs.map(log => (
          <li key={log.logId} className="ml-5">
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
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function ClaimDetailPanel({ claimId, onClose, onUpdated }: ClaimDetailPanelProps) {
  const router = useRouter();
  const [detail, setDetail]   = useState<ClaimDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const isOpen = claimId !== null;

  const fetchDetail = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    setDetail(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
      const res = await fetch(`/api/claims/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Erreur lors du chargement du dossier.');
      setDetail(await res.json() as ClaimDetail);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (claimId) fetchDetail(claimId);
  }, [claimId, fetchDetail]);

  // ESC key to close
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (isOpen) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/30 transition-opacity duration-300',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        aria-label="Détail du sinistre"
        className={cn(
          'fixed top-0 right-0 z-50 h-full w-130 max-w-full bg-white shadow-2xl flex flex-col',
          'transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            {detail ? (
              <>
                <p className="text-xs text-gray-400 font-mono">{detail.claimNumber}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={cn(
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold',
                    STATUS_COLORS[detail.status] ?? 'bg-gray-100 text-gray-700',
                  )}>
                    {STATUS_LABELS[detail.status] ?? detail.status}
                  </span>
                  <span className="text-xs text-gray-400">
                    Priorité: <span className="font-medium text-gray-700">{PRIORITY_LABELS[detail.priority] ?? detail.priority}</span>
                  </span>
                </div>
              </>
            ) : (
              <div className="space-y-1.5 animate-pulse">
                <div className="h-3 bg-gray-100 rounded w-28" />
                <div className="h-5 bg-gray-100 rounded w-20" />
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Panel body */}
        <div className="flex-1 overflow-hidden">
          {loading && <SkeletonPanel />}

          {error && (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-2">
              <AlertTriangle className="w-10 h-10 text-red-300" />
              <p className="text-sm text-red-600 font-medium">{error}</p>
              <button
                onClick={() => claimId && fetchDetail(claimId)}
                className="text-xs text-indigo-600 hover:underline"
              >
                Réessayer
              </button>
            </div>
          )}

          {!loading && !error && detail && (
            <Tabs defaultValue="info" className="h-full flex flex-col">
              <TabsList className="shrink-0 border-b border-gray-100 rounded-none bg-white px-4 justify-start gap-1 h-auto py-1">
                <TabsTrigger value="info"       className="text-xs data-[state=active]:bg-gray-100 rounded-lg px-3 py-1.5">
                  <User className="w-3.5 h-3.5 mr-1.5" />
                  Informations
                </TabsTrigger>
                <TabsTrigger value="ia"         className="text-xs data-[state=active]:bg-gray-100 rounded-lg px-3 py-1.5">
                  <Brain className="w-3.5 h-3.5 mr-1.5" />
                  Analyse IA
                </TabsTrigger>
                <TabsTrigger value="documents"  className="text-xs data-[state=active]:bg-gray-100 rounded-lg px-3 py-1.5">
                  <FileText className="w-3.5 h-3.5 mr-1.5" />
                  Documents
                  {detail.documents.length > 0 && (
                    <span className="ml-1 bg-indigo-100 text-indigo-700 text-xs rounded-full px-1.5 py-0.5 leading-none">
                      {detail.documents.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="historique" className="text-xs data-[state=active]:bg-gray-100 rounded-lg px-3 py-1.5">
                  <Clock className="w-3.5 h-3.5 mr-1.5" />
                  Historique
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto">
                <TabsContent value="info"       className="mt-0 h-full">
                  <TabInformations claim={detail} router={router} />
                </TabsContent>
                <TabsContent value="ia"         className="mt-0 h-full">
                  <TabAnalyse claim={detail} onDecisionSaved={onUpdated} />
                </TabsContent>
                <TabsContent value="documents"  className="mt-0 h-full">
                  <TabDocuments claim={detail} />
                </TabsContent>
                <TabsContent value="historique" className="mt-0 h-full">
                  <TabHistorique claim={detail} />
                </TabsContent>
              </div>
            </Tabs>
          )}
        </div>
      </aside>
    </>
  );
}
