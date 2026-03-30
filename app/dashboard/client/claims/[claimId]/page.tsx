'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ChevronLeft, FileText, CheckCircle, Clock, AlertCircle,
  Upload, Eye, Download, MessageCircle, User, XCircle,
  RefreshCw, Paperclip, X, File,
} from 'lucide-react'
import { useSimpleAuth } from '@/app/hooks/useSimpleAuth'
import ClientLayout from '@/app/components/dashboard/ClientLayout'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TimelineStep {
  id: string
  label: string
  description: string
  status: 'COMPLETED' | 'CURRENT' | 'PENDING'
  date: string | null
  icon: string
  isBlocked?: boolean
}

interface ActionRequired {
  type: string
  title: string
  description: string
  missingDocs: { documentId: string; documentType: string; label: string }[]
}

interface ClaimDoc {
  documentId: string
  originalName: string
  fileType: string
  mimeType: string
  fileSize: number
  filePath: string
  status: string
  rejectionNote: string | null
  createdAt: string
}

interface ClaimManager {
  userId: string
  firstName: string
  lastName: string
  role: string
  isAvailable: boolean
}

interface RecentMessage {
  id: string
  content: string
  createdAt: string
  isRead: boolean
  senderName: string
  isFromClient: boolean
}

interface FinancialSummary {
  montantDeclare: number
  montantApprouve: number
  franchise: number
  montantVerse: number
  virementDate: string | null
}

interface OfflinePayment {
  paymentId: string
  amount: number
  method: string
  reference: string | null
  paidAt: string
  notes: string | null
  recordedBy: string
}

interface ClaimDetail {
  claimId: string
  claimNumber: string
  claimType: string
  status: string
  priority: string
  incidentDate: string
  declarationDate: string
  incidentLocation: string | null
  description: string
  claimedAmount: number | null
  approvedAmount: number | null
  declarationMethod: string | null
  createdAt: string
  updatedAt: string
  estimatedDaysRemaining: string
  progressPercent: number
  timelineSteps: TimelineStep[]
  actionRequired: ActionRequired | null
  documents: ClaimDoc[]
  manager: ClaimManager | null
  policy: { policyId: string; policyNumber: string; policyType: string } | null
  recentMessages: RecentMessage[]
  totalMessages: number
  conversationId: string | null
  financialSummary: FinancialSummary | null
  offlinePayment: OfflinePayment | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 0 }).format(n) + ' MAD'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3_600_000)
  const d = Math.floor(diff / 86_400_000)
  if (h < 1) return 'à l\'instant'
  if (h < 24) return `il y a ${h}h`
  if (d < 7) return `il y a ${d}j`
  return fmtDate(iso)
}

const CLAIM_TYPE_LABEL: Record<string, string> = {
  ACCIDENT: '🚗 Accident automobile',
  THEFT: '🔒 Vol',
  FIRE: '🔥 Incendie',
  WATER_DAMAGE: '💧 Dégât des eaux',
}

const DOC_TYPE_LABEL: Record<string, string> = {
  PHOTO: 'Photo du sinistre',
  PDF: 'Document PDF',
  INVOICE: 'Facture',
  ESTIMATE: 'Devis de réparation',
  POLICE_REPORT: 'Rapport de police',
  MEDICAL_REPORT: 'Rapport médical',
  IDENTITY_DOCUMENT: "Pièce d'identité",
  CONSTAT: 'Constat amiable',
  BANK_DETAILS: 'RIB bancaire',
  DRIVERS_LICENSE: 'Permis de conduire',
  OTHER: 'Document divers',
}

const STATUS_CONFIG: Record<string, {
  label: string
  bg: string
  border: string
  text: string
  bar: string
}> = {
  DECLARED:        { label: '⏳ En attente de traitement',   bg: 'bg-yellow-50',  border: 'border-yellow-400',  text: 'text-yellow-800',  bar: 'bg-yellow-400'  },
  ANALYZING:       { label: '🔄 En cours d\'analyse',        bg: 'bg-blue-50',    border: 'border-blue-400',    text: 'text-blue-800',    bar: 'bg-blue-500'    },
  DOCS_REQUIRED:   { label: '⚠️ Documents manquants',        bg: 'bg-orange-50',  border: 'border-orange-400',  text: 'text-orange-800',  bar: 'bg-orange-400'  },
  UNDER_EXPERTISE: { label: '🔄 En cours d\'instruction',    bg: 'bg-blue-50',    border: 'border-blue-400',    text: 'text-blue-800',    bar: 'bg-blue-500'    },
  IN_DECISION:     { label: '⚖️ En prise de décision',       bg: 'bg-blue-50',    border: 'border-blue-400',    text: 'text-blue-800',    bar: 'bg-blue-500'    },
  APPROVED:        { label: '✅ Dossier approuvé',            bg: 'bg-green-50',   border: 'border-green-400',   text: 'text-green-800',   bar: 'bg-green-500'   },
  IN_PAYMENT:      { label: '💰 Virement en cours',          bg: 'bg-emerald-50', border: 'border-emerald-400', text: 'text-emerald-800', bar: 'bg-emerald-500' },
  CLOSED:          { label: '💰 Paiement effectué',          bg: 'bg-emerald-50', border: 'border-emerald-400', text: 'text-emerald-800', bar: 'bg-emerald-500' },
  REJECTED:        { label: '❌ Dossier rejeté',              bg: 'bg-red-50',     border: 'border-red-400',     text: 'text-red-800',     bar: 'bg-red-400'     },
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className ?? ''}`} />
}

function PageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-32 w-full rounded-xl" />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <Skeleton className="h-56 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}

// ─── Status Banner ────────────────────────────────────────────────────────────

function StatusBanner({ claim }: { claim: ClaimDetail }) {
  const cfg = STATUS_CONFIG[claim.status] ?? STATUS_CONFIG.DECLARED
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setTimeout(() => setMounted(true), 50) }, [])

  return (
    <div className={`${cfg.bg} border-l-4 ${cfg.border} rounded-xl p-5`}>
      <div className="flex flex-wrap items-center gap-3 mb-2">
        <span className={`text-lg font-bold ${cfg.text}`}>{cfg.label}</span>
        {claim.declarationMethod === 'CHATBOT'
          ? <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">🤖 Via assistant</span>
          : <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">📋 Via formulaire</span>
        }
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 mb-3">
        <span className="font-mono font-semibold text-gray-700">{claim.claimNumber}</span>
        <span>·</span>
        <span>{CLAIM_TYPE_LABEL[claim.claimType] ?? claim.claimType}</span>
        <span>·</span>
        <span>Déclaré le {fmtDate(claim.declarationDate)}</span>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className={`font-medium ${cfg.text}`}>{claim.progressPercent}%</span>
          <span className="text-gray-500 text-xs">⏱️ {claim.estimatedDaysRemaining}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className={`${cfg.bar} h-2 rounded-full transition-all duration-700`}
            style={{ width: mounted ? `${claim.progressPercent}%` : '0%' }}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Action Required Card ─────────────────────────────────────────────────────

function ActionRequiredCard({
  action,
  onUploadClick,
}: {
  action: ActionRequired
  onUploadClick: () => void
}) {
  return (
    <div className="bg-orange-50 border-2 border-orange-400 rounded-xl p-5 animate-pulse-border">
      <h3 className="font-bold text-orange-700 mb-1">⚠️ {action.title}</h3>
      <p className="text-sm text-orange-700 mb-3">{action.description}</p>
      {action.missingDocs.length > 0 && (
        <ul className="space-y-1 mb-4">
          {action.missingDocs.map(d => (
            <li key={d.documentId} className="text-sm text-red-600 flex items-center gap-1.5">
              <XCircle className="w-4 h-4 shrink-0" /> {d.label}
            </li>
          ))}
        </ul>
      )}
      <button
        onClick={onUploadClick}
        className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors flex items-center gap-2"
      >
        <Upload className="w-4 h-4" /> Envoyer les documents maintenant
      </button>
      <p className="text-xs text-gray-500 mt-3">
        ⏰ Sans ces documents, votre dossier ne pourra pas avancer.
      </p>
    </div>
  )
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

function Timeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <>
      {/* Desktop: horizontal */}
      <div className="hidden md:flex items-start justify-between relative">
        {steps.map((step, idx) => (
          <div key={step.id} className="flex-1 relative flex flex-col items-center">
            {/* Connector */}
            {idx < steps.length - 1 && (
              <div
                className={`absolute top-4 left-1/2 w-full h-0.5 z-0 ${
                  step.status === 'COMPLETED' ? 'bg-green-300' : 'bg-gray-200'
                }`}
              />
            )}
            {/* Circle */}
            <div className="relative z-10">
              {step.status === 'COMPLETED' && (
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shadow">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
              )}
              {step.status === 'CURRENT' && !step.isBlocked && (
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center shadow animate-pulse">
                  <span className="text-white text-xs">●</span>
                </div>
              )}
              {step.status === 'CURRENT' && step.isBlocked && (
                <div className="w-8 h-8 rounded-full bg-orange-400 flex items-center justify-center shadow">
                  <AlertCircle className="w-4 h-4 text-white" />
                </div>
              )}
              {step.status === 'PENDING' && (
                <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-gray-300 flex items-center justify-center">
                  <span className="text-gray-400 text-xs">{step.icon}</span>
                </div>
              )}
            </div>
            {/* Label */}
            <div className="mt-2 text-center px-1">
              <p className={`text-xs font-medium leading-tight ${
                step.status === 'COMPLETED' ? 'text-green-700' :
                step.status === 'CURRENT' && !step.isBlocked ? 'text-blue-700' :
                step.status === 'CURRENT' && step.isBlocked ? 'text-orange-700' :
                'text-gray-400'
              }`}>
                {step.label}
              </p>
              {step.status === 'CURRENT' && !step.isBlocked && (
                <p className="text-blue-500 text-[10px]">En cours</p>
              )}
              {step.status === 'CURRENT' && step.isBlocked && (
                <p className="text-orange-500 text-[10px]">⚠️ Bloqué</p>
              )}
              {step.date && (
                <p className="text-gray-400 text-[10px] mt-0.5">
                  {new Date(step.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Mobile: vertical */}
      <div className="flex flex-col gap-0 md:hidden">
        {steps.map((step, idx) => (
          <div key={step.id} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              {step.status === 'COMPLETED' && (
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shadow shrink-0">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
              )}
              {step.status === 'CURRENT' && !step.isBlocked && (
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center shadow shrink-0 animate-pulse">
                  <span className="text-white text-xs">●</span>
                </div>
              )}
              {step.status === 'CURRENT' && step.isBlocked && (
                <div className="w-8 h-8 rounded-full bg-orange-400 flex items-center justify-center shadow shrink-0">
                  <AlertCircle className="w-4 h-4 text-white" />
                </div>
              )}
              {step.status === 'PENDING' && (
                <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-gray-300 flex items-center justify-center shrink-0">
                  <span className="text-gray-400 text-xs">{step.icon}</span>
                </div>
              )}
              {idx < steps.length - 1 && (
                <div className={`w-0.5 flex-1 min-h-6 mt-1 ${step.status === 'COMPLETED' ? 'bg-green-300' : 'bg-gray-200'}`} />
              )}
            </div>
            <div className="pb-5">
              <p className={`text-sm font-medium ${
                step.status === 'COMPLETED' ? 'text-green-700' :
                step.status === 'CURRENT' ? (step.isBlocked ? 'text-orange-700' : 'text-blue-700') :
                'text-gray-400'
              }`}>{step.label}</p>
              <p className="text-xs text-gray-500">{step.description}</p>
              {step.date && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {fmtDate(step.date)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

// ─── Document Upload Modal ────────────────────────────────────────────────────

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const MAX_BYTES = 10 * 1024 * 1024

function DocumentUploadModal({
  claimId,
  isOpen,
  onClose,
  onSuccess,
  token,
}: {
  claimId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  token: string
}) {
  const [file, setFile] = useState<File | null>(null)
  const [fileType, setFileType] = useState('OTHER')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(f: File | null) {
    setError(null)
    if (!f) return
    if (!ALLOWED_MIME.includes(f.type)) { setError('Format non accepté (JPG, PNG, WEBP, PDF).'); return }
    if (f.size > MAX_BYTES) { setError('Fichier trop volumineux (max 10 Mo).'); return }
    setFile(f)
    setPreview(f.type.startsWith('image/') ? URL.createObjectURL(f) : null)
  }

  function handleClose() {
    setFile(null); setPreview(null); setError(null); setUploading(false)
    onClose()
  }

  async function handleUpload() {
    if (!file || uploading) return
    setUploading(true); setError(null)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('claimId', claimId)
      form.append('fileType', fileType)
      const res = await fetch('/api/client/documents/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? 'Erreur upload'); return }
      onSuccess()
      handleClose()
    } catch {
      setError('Erreur réseau. Veuillez réessayer.')
    } finally {
      setUploading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="font-bold text-gray-900">📤 Ajouter un document</h3>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type de document</label>
            <select
              value={fileType}
              onChange={e => setFileType(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(DOC_TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div
            onClick={() => inputRef.current?.click()}
            onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0] ?? null) }}
            onDragOver={e => e.preventDefault()}
            className="border-2 border-dashed border-gray-300 rounded-xl p-5 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            <input ref={inputRef} type="file" className="hidden" accept={ALLOWED_MIME.join(',')} onChange={e => handleFile(e.target.files?.[0] ?? null)} />
            {file ? (
              <div className="flex items-center gap-3">
                {preview
                  ? <img src={preview} alt="" className="w-12 h-12 object-cover rounded-lg" />
                  : <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center"><File className="w-5 h-5 text-gray-500" /></div>
                }
                <div className="text-left flex-1">
                  <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(0)} Ko</p>
                </div>
                <button onClick={e => { e.stopPropagation(); setFile(null); setPreview(null) }} className="text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <div>
                <Paperclip className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Cliquez ou glissez votre fichier</p>
                <p className="text-xs text-gray-400 mt-1">JPG, PNG, PDF — max 10 Mo</p>
              </div>
            )}
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
        <div className="flex gap-3 p-5 border-t">
          <button onClick={handleClose} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors">Annuler</button>
          <button onClick={handleUpload} disabled={!file || uploading} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2">
            <Upload className="w-4 h-4" />
            {uploading ? 'Envoi...' : 'Envoyer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Document Preview Modal ───────────────────────────────────────────────────

function DocumentPreviewModal({
  doc,
  onClose,
  token,
}: {
  doc: ClaimDoc
  onClose: () => void
  token: string
}) {
  const isPdf = doc.mimeType === 'application/pdf'
  const isImage = doc.mimeType.startsWith('image/')
  const docStatusCfg: Record<string, { label: string; color: string }> = {
    UPLOADED: { label: '⏳ En attente', color: 'text-yellow-700 bg-yellow-50' },
    APPROVED: { label: '✅ Validé',     color: 'text-green-700 bg-green-50'  },
    REJECTED: { label: '❌ Rejeté',     color: 'text-red-700 bg-red-50'      },
  }
  const sCfg = docStatusCfg[doc.status] ?? docStatusCfg.UPLOADED

  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col" style={{ maxHeight: '90vh' }}>
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-600" />
            <span className="font-medium text-gray-900 text-sm truncate max-w-50">{doc.originalName}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sCfg.color}`}>{sCfg.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={doc.filePath}
              download={doc.originalName}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 px-3 py-1.5 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <Download className="w-4 h-4" /> Télécharger
            </a>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4 min-h-0">
          {isImage && (
            <img src={doc.filePath} alt={doc.originalName} className="max-w-full mx-auto rounded-lg shadow" />
          )}
          {isPdf && (
            <iframe src={doc.filePath} className="w-full h-full min-h-125 rounded-lg border" title={doc.originalName} />
          )}
          {!isImage && !isPdf && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <File className="w-16 h-16 mb-3 text-gray-300" />
              <p className="font-medium">Aperçu non disponible</p>
              <p className="text-sm mt-1">Téléchargez le fichier pour l'ouvrir</p>
            </div>
          )}
        </div>
        {doc.rejectionNote && (
          <div className="p-4 border-t bg-red-50 shrink-0">
            <p className="text-sm text-red-700"><span className="font-medium">Motif de rejet:</span> {doc.rejectionNote}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Document Row ─────────────────────────────────────────────────────────────

function DocumentRow({
  doc,
  onView,
  onReplace,
}: {
  doc: ClaimDoc
  onView: (doc: ClaimDoc) => void
  onReplace: () => void
}) {
  const isPdf = doc.mimeType === 'application/pdf'
  const statusCfg: Record<string, { label: string; className: string }> = {
    UPLOADED: { label: '⏳ En attente', className: 'bg-yellow-100 text-yellow-700' },
    APPROVED: { label: '✅ Validé',     className: 'bg-green-100 text-green-700'   },
    REJECTED: { label: '❌ Rejeté',     className: 'bg-red-100 text-red-700'       },
  }
  const sCfg = statusCfg[doc.status] ?? statusCfg.UPLOADED

  return (
    <div className="py-3 border-b last:border-0">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isPdf ? 'bg-red-100' : 'bg-blue-100'}`}>
          <FileText className={`w-4 h-4 ${isPdf ? 'text-red-600' : 'text-blue-600'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">{DOC_TYPE_LABEL[doc.fileType] ?? doc.fileType}</p>
          <p className="text-xs text-gray-500 truncate">{doc.originalName}</p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${sCfg.className}`}>{sCfg.label}</span>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-xs text-gray-400 hidden sm:block">
            {new Date(doc.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
          </span>
          <button onClick={() => onView(doc)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </div>
      {doc.status === 'REJECTED' && (
        <div className="mt-2 ml-12 pl-3 border-l-2 border-red-200">
          {doc.rejectionNote && (
            <p className="text-xs text-red-600 mb-1.5">Motif: {doc.rejectionNote}</p>
          )}
          <button onClick={onReplace} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Remplacer ce document
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Manager Card ─────────────────────────────────────────────────────────────

function ManagerCard({
  manager,
  claimNumber,
  conversationId,
}: {
  manager: ClaimManager | null
  claimNumber: string
  conversationId: string | null
}) {
  const router = useRouter()
  const roleLabel: Record<string, string> = {
    MANAGER_JUNIOR: 'Gestionnaire Junior',
    MANAGER_SENIOR: 'Gestionnaire Senior',
    EXPERT: 'Expert',
    ADMIN: 'Administrateur',
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <User className="w-4 h-4 text-blue-600" /> Gestionnaire assigné
      </h3>
      {manager ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <span className="text-blue-700 font-bold text-sm">
                {manager.firstName[0]}{manager.lastName[0]}
              </span>
            </div>
            <div>
              <p className="font-medium text-gray-900">{manager.firstName} {manager.lastName}</p>
              <p className="text-xs text-gray-500">{roleLabel[manager.role] ?? manager.role}</p>
            </div>
            <div className={`ml-auto flex items-center gap-1 text-xs ${manager.isAvailable ? 'text-green-600' : 'text-gray-400'}`}>
              <span className={`w-2 h-2 rounded-full ${manager.isAvailable ? 'bg-green-500' : 'bg-gray-400'}`} />
              {manager.isAvailable ? 'Disponible' : 'Absent'}
            </div>
          </div>
          <button
            onClick={() => router.push(conversationId ? `/dashboard/client/messages?conversationId=${conversationId}` : `/dashboard/client/messages`)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-4 h-4" /> Envoyer un message
          </button>
          <p className="text-xs text-gray-400 text-center">Référence: {claimNumber}</p>
        </div>
      ) : (
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <User className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600">En cours d'assignation...</p>
          <p className="text-xs text-gray-400 mt-1">Un gestionnaire sera assigné dans les plus brefs délais.</p>
        </div>
      )}
    </div>
  )
}

// ─── Financial Summary Card ───────────────────────────────────────────────────

function FinancialSummaryCard({
  summary,
  status,
}: {
  summary: FinancialSummary
  status: string
}) {
  const isPaid = status === 'CLOSED'

  return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-6">
      <h3 className="font-bold text-green-800 mb-4">💰 Résumé financier ✅</h3>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Montant déclaré</p>
          <p className="text-sm text-gray-700">{fmt(summary.montantDeclare)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Montant approuvé</p>
          <p className="text-sm font-semibold text-green-700">{fmt(summary.montantApprouve)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Franchise déduite</p>
          <p className="text-sm text-red-600">−{fmt(summary.franchise)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Montant à verser</p>
          <p className="text-xl font-bold text-green-700">{fmt(summary.montantVerse)}</p>
        </div>
      </div>
      <div className="border-t border-green-200 pt-3">
        {isPaid && summary.virementDate ? (
          <p className="text-sm text-green-700 font-medium">✅ Paiement effectué le {fmtDate(summary.virementDate)}</p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-emerald-700">⏳ Virement en cours — sous 48h ouvrables</p>
            <div className="w-full bg-green-200 rounded-full h-1.5">
              <div className="bg-green-500 h-1.5 rounded-full w-2/3 animate-pulse" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ClaimDetailPage() {
  const params = useParams()
  const claimId = params.claimId as string
  const router = useRouter()
  const { token, isLoading: authLoading } = useSimpleAuth()

  const [claim, setClaim] = useState<ClaimDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<ClaimDoc | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const docsRef = useRef<HTMLDivElement>(null)

  const fetchClaim = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch(`/api/client/claims/${claimId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401) { router.replace('/auth/login?reason=session_expired'); return }
      if (res.status === 403) { router.replace('/dashboard/client'); return }
      if (res.status === 404) { setError('Dossier introuvable'); return }
      if (!res.ok) { setError('Erreur serveur. Veuillez réessayer.'); return }
      const data: { claim: ClaimDetail } = await res.json()
      setClaim(data.claim)
      setError(null)
    } catch {
      setError('Erreur de connexion. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }, [token, claimId, router])

  useEffect(() => {
    if (!authLoading) fetchClaim()
  }, [authLoading, fetchClaim])

  // 30s refresh
  useEffect(() => {
    const id = setInterval(() => { if (token) fetchClaim() }, 30_000)
    return () => clearInterval(id)
  }, [token, fetchClaim])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  function handleUploadSuccess() {
    fetchClaim()
    showToast('✅ Document envoyé avec succès!')
  }

  function scrollToDocs() {
    docsRef.current?.scrollIntoView({ behavior: 'smooth' })
    setUploadOpen(true)
  }

  if (authLoading || loading) {
    return <ClientLayout><PageSkeleton /></ClientLayout>
  }

  if (error || !claim) {
    return (
      <ClientLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
          <p className="text-gray-700 font-medium">{error ?? 'Dossier introuvable'}</p>
          <button onClick={() => router.back()} className="mt-4 text-sm text-blue-600 hover:underline">← Retour</button>
        </div>
      </ClientLayout>
    )
  }

  const showFinancial = ['APPROVED', 'IN_PAYMENT', 'CLOSED'].includes(claim.status)
  const showRejection = claim.status === 'REJECTED'

  return (
    <ClientLayout>
      <div className="min-h-screen bg-gray-50 pb-12">
        {/* Toast */}
        {toast && (
          <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg">
            {toast}
          </div>
        )}

        {/* Modals */}
        {uploadOpen && token && (
          <DocumentUploadModal
            claimId={claimId}
            isOpen={uploadOpen}
            onClose={() => setUploadOpen(false)}
            onSuccess={handleUploadSuccess}
            token={token}
          />
        )}
        {previewDoc && token && (
          <DocumentPreviewModal
            doc={previewDoc}
            onClose={() => setPreviewDoc(null)}
            token={token}
          />
        )}

        {/* Sticky Header */}
        <div className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-3 shadow-sm">
          <button
            onClick={() => router.push('/dashboard/client/claims')}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-blue-600 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Mes dossiers
          </button>
          <span className="font-mono text-sm text-gray-500 font-semibold truncate">{claim.claimNumber}</span>
          <button
            onClick={fetchClaim}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors"
            title="Actualiser"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">

          {/* Status Banner */}
          <StatusBanner claim={claim} />

          {/* Action Required */}
          {claim.actionRequired && (
            <ActionRequiredCard
              action={claim.actionRequired}
              onUploadClick={scrollToDocs}
            />
          )}

          {/* Timeline */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" /> Suivi de votre dossier
            </h3>
            <Timeline steps={claim.timelineSteps} />
          </div>

          {/* Two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

            {/* Left: details + documents */}
            <div className="lg:col-span-3 space-y-5">

              {/* Détails du sinistre */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" /> Détails du sinistre
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Type de sinistre</p>
                    <p className="text-sm font-medium text-gray-800">{CLAIM_TYPE_LABEL[claim.claimType] ?? claim.claimType}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Date de l'incident</p>
                    <p className="text-sm text-gray-800">{fmtDate(claim.incidentDate)}</p>
                  </div>
                  {claim.incidentLocation && (
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Lieu</p>
                      <p className="text-sm text-gray-800">{claim.incidentLocation}</p>
                    </div>
                  )}
                  {claim.claimedAmount != null && (
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Montant déclaré</p>
                      <p className="text-sm font-medium text-gray-800">{fmt(claim.claimedAmount)}</p>
                    </div>
                  )}
                  {claim.policy && (
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Police d'assurance</p>
                      <p className="text-sm text-blue-600 font-medium">{claim.policy.policyNumber}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Date de déclaration</p>
                    <p className="text-sm text-gray-800">{fmtDate(claim.declarationDate)}</p>
                  </div>
                </div>
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-xs text-gray-500 mb-1">Description</p>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {claim.description || <span className="italic text-gray-400">Aucune description fournie</span>}
                  </p>
                </div>
              </div>

              {/* Documents */}
              <div ref={docsRef} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-blue-600" /> Documents
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-normal">
                      {claim.documents.length}
                    </span>
                  </h3>
                  <button
                    onClick={() => setUploadOpen(true)}
                    className="flex items-center gap-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl transition-colors font-medium"
                  >
                    <Upload className="w-3.5 h-3.5" /> Ajouter
                  </button>
                </div>
                {claim.documents.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Paperclip className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">Aucun document joint</p>
                  </div>
                ) : (
                  <div>
                    {claim.documents.map(doc => (
                      <DocumentRow
                        key={doc.documentId}
                        doc={doc}
                        onView={setPreviewDoc}
                        onReplace={() => setUploadOpen(true)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: manager + messages */}
            <div className="lg:col-span-2 space-y-5">

              {/* Manager */}
              <ManagerCard
                manager={claim.manager}
                claimNumber={claim.claimNumber}
                conversationId={claim.conversationId}
              />

              {/* Messages */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-blue-600" /> Messages
                    {claim.totalMessages > 0 && (
                      <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full font-normal">
                        {claim.totalMessages}
                      </span>
                    )}
                  </h3>
                </div>
                {claim.recentMessages.length === 0 ? (
                  <div className="text-center py-6 text-gray-400">
                    <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm font-medium text-gray-600">Aucun message pour l'instant.</p>
                    <p className="text-xs mt-1">Envoyez un message si vous avez des questions.</p>
                  </div>
                ) : (
                  <div className="space-y-0">
                    {claim.recentMessages.map(msg => (
                      <div key={msg.id} className="py-2.5 border-b last:border-0 flex items-start gap-2">
                        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0 text-xs font-bold text-gray-500">
                          {msg.senderName[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`text-xs font-medium ${msg.isRead ? 'text-gray-700' : 'text-gray-900 font-bold'}`}>
                              {msg.senderName}
                            </span>
                            {!msg.isRead && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />}
                            <span className="text-xs text-gray-400 ml-auto">{timeAgo(msg.createdAt)}</span>
                          </div>
                          <p className={`text-xs truncate ${msg.isRead ? 'text-gray-500' : 'text-gray-700 font-medium'}`}>
                            {msg.content}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => router.push(claim.conversationId
                    ? `/dashboard/client/messages?conversationId=${claim.conversationId}`
                    : '/dashboard/client/messages'
                  )}
                  className="w-full mt-3 text-sm text-blue-600 hover:text-blue-700 hover:underline text-center"
                >
                  Voir tous les messages →
                </button>
              </div>

            </div>
          </div>

          {/* Financial Summary */}
          {showFinancial && claim.financialSummary && (
            <FinancialSummaryCard summary={claim.financialSummary} status={claim.status} />
          )}

          {/* Offline Payment Receipt */}
          {claim.offlinePayment && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
              <h3 className="font-bold text-emerald-800 mb-4 flex items-center gap-2">
                <span>✅</span> Confirmation de paiement
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Montant versé</p>
                  <p className="font-bold text-emerald-700 text-lg">{fmt(claim.offlinePayment.amount)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Méthode</p>
                  <p className="font-medium text-gray-800">{{ CASH: 'Espèces', BANK_TRANSFER: 'Virement bancaire', CHECK: 'Chèque', MOBILE_MONEY: 'Mobile Money' }[claim.offlinePayment.method] ?? claim.offlinePayment.method}</p>
                </div>
                {claim.offlinePayment.reference && (
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Référence</p>
                    <p className="font-mono text-gray-800">{claim.offlinePayment.reference}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Date du paiement</p>
                  <p className="text-gray-800">{fmtDate(claim.offlinePayment.paidAt)}</p>
                </div>
              </div>
              {claim.offlinePayment.notes && (
                <p className="mt-3 text-sm text-gray-600 border-t border-emerald-200 pt-3">{claim.offlinePayment.notes}</p>
              )}
              <p className="mt-3 text-xs text-emerald-600">Enregistré par {claim.offlinePayment.recordedBy}</p>
            </div>
          )}

          {/* Rejection Details */}
          {showRejection && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <h3 className="font-bold text-red-800 mb-3">❌ Motif de rejet</h3>
              <p className="text-sm text-red-700 mb-4 leading-relaxed">
                {claim.description || 'Aucun motif précisé.'}
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Si vous pensez que cette décision est incorrecte, vous pouvez contester votre dossier.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => router.push(claim.conversationId
                    ? `/dashboard/client/messages?conversationId=${claim.conversationId}&prefill=Je+souhaite+contester+la+d%C3%A9cision+concernant+mon+dossier+${claim.claimNumber}`
                    : '/dashboard/client/messages'
                  )}
                  className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
                >
                  📝 Contester la décision
                </button>
                <button
                  onClick={() => router.push('/dashboard/client/messages')}
                  className="border border-red-300 text-red-700 hover:bg-red-100 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
                >
                  📞 Contacter un conseiller
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </ClientLayout>
  )
}
