'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import useSWR from 'swr'
import {
  ChevronLeft, FileText, User, RefreshCw, AlertCircle,
  CheckCircle, Clock, Shield, Brain, Paperclip,
  MessageSquarePlus, ArrowRightLeft, X, Send,
  Eye, Download, File, XCircle, CheckCircle2,
} from 'lucide-react'
import RoleBasedLayout from '@/components/layout/RoleBasedLayout'
import { useAdminAuth } from '@/app/hooks/useAdminAuth'

// ─── Types ────────────────────────────────────────────────────────────────────

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
  damageDescription: string | null
  additionalNotes: string | null
  claimedAmount: string | null
  estimatedAmount: string | null
  approvedAmount: string | null
  policeReport: boolean
  policeReportNumber: string | null
  emergencyServices: boolean
  scoreRisque: number | null
  scoreConfidence: number | null
  decisionIa: string | null
  labelRisque: string | null
  scoredAt: string | null
  createdAt: string
  updatedAt: string
  client: {
    firstName: string; lastName: string; cin: string
    email: string; phone: string; city: string; province: string
    ancienneteAnnees: number; nbSinistresPasses: number; montantTotalPasse: string
  } | null
  policy: {
    policyNumber: string; policyType: string
    coverageType: string | null; deductible: string; insuredAmount: string
  } | null
  documents: {
    documentId: string; originalName: string; fileType: string
    mimeType: string; fileSize: number; filePath: string
    status: string; rejectionNote: string | null; isRequired: boolean; createdAt: string
  }[]
  statusHistory: {
    historyId: string; fromStatus: string | null; toStatus: string
    reason: string | null; notes: string | null; isSystemGenerated: boolean
    createdAt: string
    changedByUser: { firstName: string; lastName: string; role: string } | null
  }[]
  comments: {
    commentId: string; message: string; commentType: string
    isInternal: boolean; createdAt: string
    authorUser: { firstName: string; lastName: string; role: string } | null
    authorClient: { firstName: string; lastName: string } | null
  }[]
}

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  DECLARED:        { label: 'Déclaré',         bg: 'bg-gray-50',    text: 'text-gray-700',   border: 'border-gray-400'   },
  ANALYZING:       { label: 'En analyse',       bg: 'bg-blue-50',    text: 'text-blue-700',   border: 'border-blue-400'   },
  DOCS_REQUIRED:   { label: 'Docs manquants',   bg: 'bg-yellow-50',  text: 'text-yellow-700', border: 'border-yellow-400' },
  UNDER_EXPERTISE: { label: 'En instruction',   bg: 'bg-purple-50',  text: 'text-purple-700', border: 'border-purple-400' },
  IN_DECISION:     { label: 'En décision',      bg: 'bg-orange-50',  text: 'text-orange-700', border: 'border-orange-400' },
  APPROVED:        { label: 'Approuvé',         bg: 'bg-green-50',   text: 'text-green-700',  border: 'border-green-400'  },
  IN_PAYMENT:      { label: 'En paiement',      bg: 'bg-teal-50',    text: 'text-teal-700',   border: 'border-teal-400'   },
  CLOSED:          { label: 'Clôturé',          bg: 'bg-gray-100',   text: 'text-gray-700',   border: 'border-gray-400'   },
  REJECTED:        { label: 'Rejeté',           bg: 'bg-red-50',     text: 'text-red-700',    border: 'border-red-400'    },
}

// Expert-allowed transitions only
const EXPERT_TRANSITIONS: Record<string, string[]> = {
  DECLARED:        ['ANALYZING'],
  ANALYZING:       ['DOCS_REQUIRED', 'UNDER_EXPERTISE'],
  DOCS_REQUIRED:   ['ANALYZING', 'UNDER_EXPERTISE'],
  UNDER_EXPERTISE: ['IN_DECISION'],
}

const STATUS_LABEL: Record<string, string> = {
  DECLARED: 'Déclaré', ANALYZING: 'En analyse', DOCS_REQUIRED: 'Docs manquants',
  UNDER_EXPERTISE: 'En instruction', IN_DECISION: 'En décision',
  APPROVED: 'Approuvé', IN_PAYMENT: 'En paiement', CLOSED: 'Clôturé', REJECTED: 'Rejeté',
}

const CLAIM_TYPE_LABEL: Record<string, string> = {
  ACCIDENT: 'Accident', THEFT: 'Vol', FIRE: 'Incendie', WATER_DAMAGE: 'Dégât des eaux',
}

const RISK_CFG: Record<string, { label: string; cls: string }> = {
  FAIBLE:     { label: 'Faible',     cls: 'bg-green-100 text-green-700 border-green-200'   },
  MOYEN:      { label: 'Moyen',      cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  ELEVE:      { label: 'Élevé',      cls: 'bg-orange-100 text-orange-700 border-orange-200' },
  SUSPICIEUX: { label: 'Suspicieux', cls: 'bg-red-100 text-red-700 border-red-200'          },
}

const DOC_STATUS_CFG: Record<string, { label: string; cls: string }> = {
  UPLOADED:         { label: 'Reçu',          cls: 'bg-blue-50 text-blue-700'    },
  PROCESSING:       { label: 'En traitement', cls: 'bg-yellow-50 text-yellow-700'},
  VERIFIED:         { label: 'Vérifié ✓',     cls: 'bg-green-50 text-green-700'  },
  REJECTED:         { label: 'Rejeté ✗',      cls: 'bg-red-50 text-red-700'      },
  PENDING_RESUBMIT: { label: 'À soumettre',   cls: 'bg-orange-50 text-orange-700'},
  EXPIRED:          { label: 'Expiré',        cls: 'bg-gray-100 text-gray-500'   },
}

const COMMENT_TYPE_LABEL: Record<string, string> = {
  GENERAL: 'Général', STATUS_UPDATE: 'Mise à jour', DOCUMENT_REQUEST: 'Demande doc',
  EXPERT_NOTE: 'Note expert', CLIENT_QUESTION: 'Question client', INTERNAL_NOTE: 'Note interne',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function fmtMAD(val: string | null) {
  if (!val) return '—'
  return new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 0 }).format(Number(val)) + ' MAD'
}

function Row({ label, val }: { label: string; val: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2 py-1 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400 shrink-0">{label}</span>
      <span className="text-sm text-gray-800 text-right">{val}</span>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-20 rounded-xl bg-gray-100" />
      <div className="grid grid-cols-3 gap-4">
        {[1,2,3].map(i => <div key={i} className="h-40 rounded-xl bg-gray-100" />)}
      </div>
      <div className="h-48 rounded-xl bg-gray-100" />
    </div>
  )
}

// ─── Reject Document Modal ────────────────────────────────────────────────────

function RejectDocModal({
  docName, onClose, onConfirm, loading,
}: { docName: string; onClose: () => void; onConfirm: (note: string) => void; loading: boolean }) {
  const [note, setNote] = useState('')
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-500" /> Rejeter le document
          </h3>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-xs text-gray-500 truncate">Document: <span className="font-medium text-gray-700">{docName}</span></p>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Motif du rejet (optionnel)</label>
            <textarea
              rows={3} value={note} onChange={e => setNote(e.target.value)}
              placeholder="Ex: Document illisible, informations manquantes..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
            />
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-xl text-sm hover:bg-gray-50">Annuler</button>
          <button
            disabled={loading}
            onClick={() => onConfirm(note)}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white py-2 rounded-xl text-sm font-medium"
          >
            {loading ? 'Rejet...' : 'Rejeter'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Status Change Modal ──────────────────────────────────────────────────────

function StatusModal({
  currentStatus, onClose, onConfirm, loading,
}: { currentStatus: string; onClose: () => void; onConfirm: (s: string, r: string, n: string) => void; loading: boolean }) {
  const transitions = EXPERT_TRANSITIONS[currentStatus] ?? []
  const [newStatus, setNewStatus] = useState(transitions[0] ?? '')
  const [reason, setReason]       = useState('')
  const [notes, setNotes]         = useState('')

  if (transitions.length === 0) return null

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-blue-600" /> Changer le statut
          </h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Statut actuel</p>
            <span className={`text-sm font-medium px-3 py-1 rounded-full ${STATUS_CFG[currentStatus]?.bg} ${STATUS_CFG[currentStatus]?.text}`}>
              {STATUS_LABEL[currentStatus]}
            </span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau statut *</label>
            <select
              value={newStatus} onChange={e => setNewStatus(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {transitions.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Motif</label>
            <input
              type="text" value={reason} onChange={e => setReason(e.target.value)}
              placeholder="Motif du changement"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes internes</label>
            <textarea
              rows={3} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Observations pour l'équipe..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            />
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50">
            Annuler
          </button>
          <button
            disabled={!newStatus || loading}
            onClick={() => onConfirm(newStatus, reason, notes)}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white py-2.5 rounded-xl text-sm font-medium"
          >
            {loading ? 'Enregistrement...' : 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ExpertClaimDetailPage() {
  const router  = useRouter()
  const params  = useParams()
  const claimId = params.claimId as string
  const { user, isLoading: authLoading, logout, token } = useAdminAuth()

  const [statusModal, setStatusModal]     = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)
  const [commentMsg, setCommentMsg]       = useState('')
  const [commentType, setCommentType]     = useState('EXPERT_NOTE')
  const [commentLoading, setCommentLoading] = useState(false)
  const [toast, setToast]                 = useState<string | null>(null)
  const [rejectDoc, setRejectDoc]         = useState<{ documentId: string; name: string } | null>(null)
  const [docLoading, setDocLoading]       = useState<string | null>(null)

  const fetcher = useCallback(
    ([url, t]: [string, string]) =>
      fetch(url, { headers: { Authorization: `Bearer ${t}` } }).then(r => {
        if (!r.ok) throw new Error('Erreur')
        return r.json()
      }),
    [],
  )

  const { data, isLoading, error, mutate } = useSWR(
    token ? [`/api/expert/claims/${claimId}`, token] : null,
    fetcher,
    { revalidateOnFocus: false },
  )

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth/admin?reason=session_expired')
  }, [authLoading, user, router])

  if (authLoading || !user) return null

  const claim: ClaimDetail | null = data?.data ?? null

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  // ── Status change ──────────────────────────────────────────────────────────
  async function handleStatusChange(newStatus: string, reason: string, notes: string) {
    if (!token) return
    setStatusLoading(true)
    try {
      const res = await fetch(`/api/expert/claims/${claimId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, reason: reason || undefined, notes: notes || undefined }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); showToast('❌ ' + (d.error ?? 'Erreur')); return }
      setStatusModal(false)
      showToast(`✅ Statut mis à jour : ${STATUS_LABEL[newStatus]}`)
      mutate()
    } catch { showToast('❌ Erreur réseau') }
    finally { setStatusLoading(false) }
  }

  // ── Add comment ────────────────────────────────────────────────────────────
  async function handleComment(e: React.FormEvent) {
    e.preventDefault()
    if (!token || !commentMsg.trim()) return
    setCommentLoading(true)
    try {
      const res = await fetch(`/api/expert/claims/${claimId}/comments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: commentMsg.trim(), commentType }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); showToast('❌ ' + (d.error ?? 'Erreur')); return }
      setCommentMsg('')
      showToast('✅ Note ajoutée')
      mutate()
    } catch { showToast('❌ Erreur réseau') }
    finally { setCommentLoading(false) }
  }

  // ── Verify document ────────────────────────────────────────────────────────
  async function handleVerifyDoc(documentId: string) {
    if (!token) return
    setDocLoading(documentId)
    try {
      const res = await fetch(`/api/documents/${documentId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'VERIFIED' }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); showToast('❌ ' + (d.error ?? 'Erreur')); return }
      showToast('✅ Document vérifié')
      mutate()
    } catch { showToast('❌ Erreur réseau') }
    finally { setDocLoading(null) }
  }

  // ── Reject document ────────────────────────────────────────────────────────
  async function handleRejectDoc(rejectionNote: string) {
    if (!token || !rejectDoc) return
    setDocLoading(rejectDoc.documentId)
    try {
      const res = await fetch(`/api/documents/${rejectDoc.documentId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REJECTED', rejectionNote }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); showToast('❌ ' + (d.error ?? 'Erreur')); return }
      setRejectDoc(null)
      showToast('✅ Document rejeté')
      mutate()
    } catch { showToast('❌ Erreur réseau') }
    finally { setDocLoading(null) }
  }

  const canChangeStatus = claim ? (EXPERT_TRANSITIONS[claim.status] ?? []).length > 0 : false
  const sCfg = STATUS_CFG[claim?.status ?? ''] ?? STATUS_CFG.DECLARED

  return (
    <RoleBasedLayout role="EXPERT" user={user} onLogout={logout}>

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      {/* Status modal */}
      {statusModal && claim && (
        <StatusModal
          currentStatus={claim.status}
          onClose={() => setStatusModal(false)}
          onConfirm={handleStatusChange}
          loading={statusLoading}
        />
      )}

      {/* Reject doc modal */}
      {rejectDoc && (
        <RejectDocModal
          docName={rejectDoc.name}
          onClose={() => setRejectDoc(null)}
          onConfirm={handleRejectDoc}
          loading={docLoading === rejectDoc.documentId}
        />
      )}

      {/* Back + header */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard/expert/claims')}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Retour
          </button>
          <div className="h-5 w-px bg-gray-200" />
          {claim && (
            <>
              <span className="font-mono font-bold text-gray-800 text-sm">#{claim.claimNumber}</span>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${sCfg.bg} ${sCfg.text}`}>
                {sCfg.label}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => mutate()}
            className="p-2 text-gray-400 hover:text-blue-600 border border-gray-200 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {canChangeStatus && (
            <button
              onClick={() => setStatusModal(true)}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
            >
              <ArrowRightLeft className="w-4 h-4" /> Changer le statut
            </button>
          )}
        </div>
      </div>

      {/* Loading */}
      {isLoading && <Skeleton />}

      {/* Error */}
      {error && !isLoading && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-5 py-4 text-red-700">
          <AlertCircle className="w-5 h-5 shrink-0" /> Dossier introuvable ou accès refusé.
        </div>
      )}

      {/* Content */}
      {claim && (
        <div className="space-y-5">

          {/* Top 3 cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* Client */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" /> Assuré
              </h3>
              {claim.client ? (
                <div className="space-y-2.5 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                      {claim.client.firstName[0]}{claim.client.lastName[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{claim.client.firstName} {claim.client.lastName}</p>
                      <p className="text-xs text-gray-500">CIN: {claim.client.cin}</p>
                    </div>
                  </div>
                  <div className="border-t border-gray-100 pt-2.5 space-y-1.5">
                    <Row label="Email"     val={claim.client.email} />
                    <Row label="Téléphone" val={claim.client.phone} />
                    <Row label="Ville"     val={`${claim.client.city}, ${claim.client.province}`} />
                  </div>
                  <div className="border-t border-gray-100 pt-2.5 grid grid-cols-3 gap-2 text-center">
                    <div><p className="text-lg font-bold text-gray-900">{claim.client.ancienneteAnnees}</p><p className="text-xs text-gray-400">ans</p></div>
                    <div><p className="text-lg font-bold text-gray-900">{claim.client.nbSinistresPasses}</p><p className="text-xs text-gray-400">sinistres</p></div>
                    <div><p className="text-sm font-bold text-gray-900">{fmtMAD(claim.client.montantTotalPasse)}</p><p className="text-xs text-gray-400">versé</p></div>
                  </div>
                </div>
              ) : <p className="text-sm text-gray-400">Non disponible</p>}
            </div>

            {/* Sinistre info */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" /> Sinistre
              </h3>
              <div className="space-y-1.5 text-sm">
                <Row label="Type"           val={CLAIM_TYPE_LABEL[claim.claimType] ?? claim.claimType} />
                <Row label="Date incident"  val={fmtDate(claim.incidentDate)} />
                <Row label="Date déclaration" val={fmtDate(claim.declarationDate)} />
                {claim.incidentLocation && <Row label="Lieu" val={claim.incidentLocation} />}
                <Row label="Montant déclaré" val={fmtMAD(claim.claimedAmount)} />
                {claim.estimatedAmount && <Row label="Montant estimé" val={fmtMAD(claim.estimatedAmount)} />}
                {claim.approvedAmount  && <Row label="Montant approuvé" val={<span className="font-semibold text-green-700">{fmtMAD(claim.approvedAmount)}</span>} />}
                {claim.policy && <Row label="Police" val={<span className="text-blue-600 font-medium">{claim.policy.policyNumber}</span>} />}
                {claim.policeReport && <Row label="Rapport police" val={claim.policeReportNumber ?? 'Oui'} />}
                {claim.emergencyServices && <Row label="Urgences" val="Oui" />}
              </div>
            </div>

            {/* AI scoring */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-600" /> Évaluation IA
              </h3>
              {claim.scoreRisque != null ? (
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-gray-500">Score de risque</span>
                      <span className="font-bold text-gray-800">{claim.scoreRisque}/100</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-3 rounded-full ${claim.scoreRisque >= 75 ? 'bg-red-500' : claim.scoreRisque >= 50 ? 'bg-orange-400' : claim.scoreRisque >= 25 ? 'bg-yellow-400' : 'bg-green-400'}`}
                        style={{ width: `${claim.scoreRisque}%` }}
                      />
                    </div>
                  </div>
                  {claim.labelRisque && RISK_CFG[claim.labelRisque] && (
                    <span className={`inline-flex text-xs font-medium px-2.5 py-1 rounded-full border ${RISK_CFG[claim.labelRisque].cls}`}>
                      {RISK_CFG[claim.labelRisque].label}
                    </span>
                  )}
                  {claim.scoreConfidence != null && (
                    <p className="text-xs text-gray-500">Confiance : {(claim.scoreConfidence * 100).toFixed(0)}%</p>
                  )}
                  {claim.scoredAt && (
                    <p className="text-xs text-gray-400">Scoré le {fmtDateTime(claim.scoredAt)}</p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center py-6 text-gray-400 gap-2">
                  <Brain className="w-8 h-8 text-gray-300" />
                  <p className="text-sm">Aucun score disponible</p>
                </div>
              )}
            </div>
          </div>

          {/* Descriptions */}
          {(claim.description || claim.damageDescription || claim.additionalNotes) && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" /> Descriptions
              </h3>
              <div className="space-y-3">
                {claim.description && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Description du sinistre</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{claim.description}</p>
                  </div>
                )}
                {claim.damageDescription && (
                  <div className="border-t border-gray-100 pt-3">
                    <p className="text-xs text-gray-500 mb-1">Description des dommages</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{claim.damageDescription}</p>
                  </div>
                )}
                {claim.additionalNotes && (
                  <div className="border-t border-gray-100 pt-3">
                    <p className="text-xs text-gray-500 mb-1">Notes additionnelles</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{claim.additionalNotes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Documents */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-blue-600" /> Documents
              <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full font-normal">{claim.documents.length}</span>
            </h3>
            {claim.documents.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Paperclip className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Aucun document</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {claim.documents.map(doc => {
                  const dCfg = DOC_STATUS_CFG[doc.status] ?? { label: doc.status, cls: 'bg-gray-100 text-gray-600' }
                  const isPdf = doc.mimeType === 'application/pdf'
                  const isActionable = ['UPLOADED', 'PROCESSING', 'PENDING_RESUBMIT'].includes(doc.status)
                  return (
                    <div key={doc.documentId} className="flex items-center gap-3 py-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isPdf ? 'bg-red-50' : 'bg-blue-50'}`}>
                        <File className={`w-4 h-4 ${isPdf ? 'text-red-500' : 'text-blue-500'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 truncate">{doc.originalName}</p>
                        <p className="text-xs text-gray-400">{doc.fileType} · {(doc.fileSize / 1024).toFixed(0)} Ko</p>
                        {doc.rejectionNote && (
                          <p className="text-xs text-red-500 mt-0.5">Motif : {doc.rejectionNote}</p>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${dCfg.cls}`}>{dCfg.label}</span>
                      <a href={doc.filePath} target="_blank" rel="noopener noreferrer" className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Eye className="w-4 h-4" />
                      </a>
                      <a href={doc.filePath} download={doc.originalName} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                        <Download className="w-4 h-4" />
                      </a>
                      {isActionable && (
                        <>
                          <button
                            disabled={docLoading === doc.documentId}
                            onClick={() => handleVerifyDoc(doc.documentId)}
                            className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 rounded-lg disabled:opacity-40 transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Vérifier
                          </button>
                          <button
                            disabled={docLoading === doc.documentId}
                            onClick={() => setRejectDoc({ documentId: doc.documentId, name: doc.originalName })}
                            className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 rounded-lg disabled:opacity-40 transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Rejeter
                          </button>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Status history + Notes — two columns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Status history */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" /> Historique des statuts
              </h3>
              {claim.statusHistory.length === 0 ? (
                <p className="text-sm text-gray-400">Aucun historique.</p>
              ) : (
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-100" />
                  <div className="space-y-0">
                    {claim.statusHistory.map((h, idx) => {
                      const toCfg = STATUS_CFG[h.toStatus] ?? STATUS_CFG.DECLARED
                      return (
                        <div key={h.historyId} className="flex items-start gap-4 pb-4">
                          <div className={`w-8 h-8 shrink-0 rounded-full border-2 flex items-center justify-center z-10 relative ${idx === 0 ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-300'}`}>
                            {idx === 0 ? <CheckCircle className="w-4 h-4 text-white" /> : <div className="w-2 h-2 rounded-full bg-gray-300" />}
                          </div>
                          <div className="flex-1 pt-1">
                            <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                              {h.fromStatus && (
                                <>
                                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${STATUS_CFG[h.fromStatus]?.bg ?? 'bg-gray-100'} ${STATUS_CFG[h.fromStatus]?.text ?? 'text-gray-700'}`}>
                                    {STATUS_LABEL[h.fromStatus] ?? h.fromStatus}
                                  </span>
                                  <ArrowRightLeft className="w-3 h-3 text-gray-300" />
                                </>
                              )}
                              <span className={`text-xs px-1.5 py-0.5 rounded-full ${toCfg.bg} ${toCfg.text}`}>
                                {STATUS_LABEL[h.toStatus] ?? h.toStatus}
                              </span>
                              {h.isSystemGenerated && <span className="text-xs text-gray-400">(système)</span>}
                            </div>
                            {h.reason && <p className="text-xs text-gray-600">Motif : {h.reason}</p>}
                            {h.notes  && <p className="text-xs text-gray-500 italic">"{h.notes}"</p>}
                            <p className="text-xs text-gray-400 mt-0.5">
                              {h.changedByUser ? `${h.changedByUser.firstName} ${h.changedByUser.lastName} · ` : ''}
                              {fmtDateTime(h.createdAt)}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Internal notes */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MessageSquarePlus className="w-4 h-4 text-blue-600" /> Notes internes
                <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full font-normal">{claim.comments.length}</span>
              </h3>

              {/* Add comment */}
              <form onSubmit={handleComment} className="mb-4 border border-gray-200 rounded-xl p-3 bg-gray-50">
                <div className="flex gap-2 mb-2">
                  <select
                    value={commentType} onChange={e => setCommentType(e.target.value)}
                    className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                  >
                    {Object.entries(COMMENT_TYPE_LABEL).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                  <span className="text-xs text-gray-400 flex items-center">🔒 Interne</span>
                </div>
                <textarea
                  rows={2} value={commentMsg} onChange={e => setCommentMsg(e.target.value)}
                  placeholder="Votre observation ou constat..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none bg-white"
                />
                <div className="flex justify-end mt-2">
                  <button
                    type="submit" disabled={!commentMsg.trim() || commentLoading}
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-medium px-3 py-1.5 rounded-xl transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" /> {commentLoading ? 'Envoi...' : 'Ajouter'}
                  </button>
                </div>
              </form>

              {/* Comments list */}
              {claim.comments.length === 0 ? (
                <div className="text-center py-4 text-gray-400">
                  <p className="text-sm">Aucune note pour l'instant.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {claim.comments.map(c => {
                    const author = c.authorUser
                      ? `${c.authorUser.firstName} ${c.authorUser.lastName}`
                      : c.authorClient
                        ? `${c.authorClient.firstName} ${c.authorClient.lastName}`
                        : 'Inconnu'
                    return (
                      <div key={c.commentId} className="flex items-start gap-2">
                        <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold shrink-0">
                          {author[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2">
                          <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                            <span className="text-xs font-semibold text-gray-800">{author}</span>
                            <span className="text-xs bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded-full">
                              {COMMENT_TYPE_LABEL[c.commentType] ?? c.commentType}
                            </span>
                            <span className="text-xs text-gray-400 ml-auto">{fmtDateTime(c.createdAt)}</span>
                          </div>
                          <p className="text-sm text-gray-700">{c.message}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </RoleBasedLayout>
  )
}
