'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import useSWR from 'swr'
import {
  ChevronLeft, FileText, User, RefreshCw, AlertCircle,
  CheckCircle, Clock, Shield, Wallet, Calendar,
  Hash, X, Send, Banknote, CreditCard, Smartphone, Building2,
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
  claimedAmount: string | null
  estimatedAmount: string | null
  approvedAmount: string | null
  createdAt: string
  client: {
    firstName: string
    lastName: string
    email: string
    phone: string
    cin: string
  } | null
  policy: {
    policyNumber: string
    policyType: string
  } | null
  assignedUser: {
    firstName: string
    lastName: string
    role: string
  } | null
  payment: PaymentRecord | null
}

interface PaymentRecord {
  paymentId: string
  amount: number
  method: string
  reference: string | null
  paidAt: string
  notes: string | null
  createdAt: string
  recordedBy: { firstName: string; lastName: string; role: string }
}

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  DECLARED:        { label: 'Déclaré',          bg: 'bg-gray-50',     text: 'text-gray-700',    border: 'border-gray-400'    },
  ANALYZING:       { label: 'En analyse',        bg: 'bg-blue-50',     text: 'text-blue-700',    border: 'border-blue-400'    },
  DOCS_REQUIRED:   { label: 'Docs requis',        bg: 'bg-yellow-50',   text: 'text-yellow-700',  border: 'border-yellow-400'  },
  UNDER_EXPERTISE: { label: 'En instruction',    bg: 'bg-indigo-50',   text: 'text-indigo-700',  border: 'border-indigo-400'  },
  IN_DECISION:     { label: 'En décision',       bg: 'bg-orange-50',   text: 'text-orange-700',  border: 'border-orange-400'  },
  APPROVED:        { label: 'Approuvé',          bg: 'bg-green-50',    text: 'text-green-700',   border: 'border-green-400'   },
  IN_PAYMENT:      { label: 'En paiement',       bg: 'bg-teal-50',     text: 'text-teal-700',    border: 'border-teal-400'    },
  CLOSED:          { label: 'Clôturé',           bg: 'bg-gray-100',    text: 'text-gray-600',    border: 'border-gray-300'    },
  REJECTED:        { label: 'Rejeté',            bg: 'bg-red-50',      text: 'text-red-700',     border: 'border-red-400'     },
}

const METHOD_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  CASH:           { label: 'Espèces',            icon: <Banknote className="w-4 h-4" /> },
  BANK_TRANSFER:  { label: 'Virement bancaire',  icon: <Building2 className="w-4 h-4" /> },
  CHECK:          { label: 'Chèque',             icon: <CreditCard className="w-4 h-4" /> },
  MOBILE_MONEY:   { label: 'Mobile Money',       icon: <Smartphone className="w-4 h-4" /> },
}

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 0 }).format(n) + ' MAD'

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

// ─── Record Payment Modal ─────────────────────────────────────────────────────

function RecordPaymentModal({
  claim,
  token,
  onClose,
  onSuccess,
}: {
  claim: ClaimDetail
  token: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [amount, setAmount]       = useState(claim.approvedAmount ? parseFloat(claim.approvedAmount) : '')
  const [method, setMethod]       = useState<string>('BANK_TRANSFER')
  const [reference, setReference] = useState('')
  const [paidAt, setPaidAt]       = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
    if (!numAmount || numAmount <= 0) { setError('Le montant doit être supérieur à 0'); return }
    if (!paidAt) { setError('La date de paiement est requise'); return }

    setLoading(true)
    try {
      const res = await fetch(`/api/claims/${claim.claimId}/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount:    numAmount,
          method,
          reference: reference.trim() || undefined,
          paidAt:    new Date(paidAt).toISOString(),
          notes:     notes.trim() || undefined,
        }),
      })

      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Erreur lors de l\'enregistrement'); return }

      onSuccess()
    } catch {
      setError('Erreur réseau, veuillez réessayer')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-teal-600" />
            <h2 className="font-bold text-gray-900">Enregistrer le paiement</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Claim info */}
        <div className="p-4 mx-5 mt-4 bg-teal-50 border border-teal-200 rounded-xl text-sm">
          <p className="font-mono font-semibold text-teal-800">#{claim.claimNumber}</p>
          <p className="text-teal-700 mt-0.5">
            {claim.client?.firstName} {claim.client?.lastName}
            {claim.approvedAmount && <span className="ml-2 font-semibold">· Montant approuvé: {fmt(parseFloat(claim.approvedAmount))}</span>}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Montant versé <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 pr-16 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-50"
                required
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">MAD</span>
            </div>
          </div>

          {/* Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Méthode de paiement <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(METHOD_LABELS).map(([key, { label, icon }]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMethod(key)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                    method === key
                      ? 'border-teal-500 bg-teal-50 text-teal-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {icon} {label}
                </button>
              ))}
            </div>
          </div>

          {/* Reference */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Référence / N° de pièce</label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder={
                method === 'BANK_TRANSFER' ? 'N° de virement bancaire'
                : method === 'CHECK'       ? 'N° de chèque'
                : method === 'MOBILE_MONEY' ? 'N° de transaction'
                : 'Référence (optionnel)'
              }
              maxLength={150}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-50"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Date du paiement <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-50"
              required
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (optionnel)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Informations complémentaires…"
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-50 resize-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-teal-600 py-2.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60 transition-colors"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" /> Confirmer le paiement
                </>
              )}
            </button>
          </div>

          <p className="text-xs text-gray-400 text-center">
            Cette action clôturera automatiquement le dossier.
          </p>
        </form>
      </div>
    </div>
  )
}

// ─── Payment Receipt Card ─────────────────────────────────────────────────────

function PaymentReceiptCard({ payment }: { payment: PaymentRecord }) {
  const cfg = METHOD_LABELS[payment.method] ?? { label: payment.method, icon: <Wallet className="w-4 h-4" /> }
  return (
    <div className="bg-white rounded-xl border border-teal-200 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
          <CheckCircle className="w-4 h-4 text-teal-600" />
        </div>
        <h3 className="font-semibold text-gray-900">Paiement enregistré</h3>
      </div>
      <div className="space-y-3">
        <Row icon={<Wallet className="w-4 h-4 text-teal-600" />} label="Montant versé">
          <span className="font-bold text-teal-700">{fmt(payment.amount)}</span>
        </Row>
        <Row icon={cfg.icon} label="Méthode">{cfg.label}</Row>
        {payment.reference && (
          <Row icon={<Hash className="w-4 h-4 text-gray-400" />} label="Référence">
            <span className="font-mono text-sm">{payment.reference}</span>
          </Row>
        )}
        <Row icon={<Calendar className="w-4 h-4 text-gray-400" />} label="Date du paiement">
          {fmtDate(payment.paidAt)}
        </Row>
        <Row icon={<User className="w-4 h-4 text-gray-400" />} label="Enregistré par">
          {payment.recordedBy.firstName} {payment.recordedBy.lastName}
        </Row>
        {payment.notes && (
          <Row icon={<FileText className="w-4 h-4 text-gray-400" />} label="Notes">
            {payment.notes}
          </Row>
        )}
      </div>
    </div>
  )
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-gray-400 shrink-0">{icon}</span>
      <div className="flex-1 flex items-start justify-between gap-2">
        <span className="text-sm text-gray-500">{label}</span>
        <span className="text-sm text-gray-900 text-right">{children}</span>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ManagerSeniorClaimDetailPage() {
  const router  = useRouter()
  const params  = useParams()
  const claimId = params.claimId as string

  const { user, isLoading: authLoading, logout, token } = useAdminAuth()
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)

  const fetcher = ([url, t]: [string, string]) =>
    fetch(url, { headers: { Authorization: `Bearer ${t}` } }).then((r) => {
      if (!r.ok) throw new Error('Erreur chargement')
      return r.json()
    })

  const { data: claimData, isLoading: claimLoading, error: claimError, mutate: mutateClaim } = useSWR(
    token ? [`/api/manager-senior/claims/${claimId}`, token] : null,
    fetcher,
  )

  const { data: paymentData, isLoading: paymentLoading, mutate: mutatePayment } = useSWR(
    token ? [`/api/claims/${claimId}/payment`, token] : null,
    fetcher,
  )

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth/admin?reason=session_expired')
  }, [authLoading, user, router])

  if (authLoading || !user) return null

  const claim: ClaimDetail | null = claimData?.data ?? null
  const payment: PaymentRecord | null = paymentData?.data ?? null

  const statusCfg = STATUS_CFG[claim?.status ?? ''] ?? STATUS_CFG.DECLARED

  function handlePaymentSuccess() {
    setPaymentModalOpen(false)
    mutateClaim()
    mutatePayment()
  }

  return (
    <RoleBasedLayout role="MANAGER_SENIOR" user={user} onLogout={logout}>
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="mb-5 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> Retour aux dossiers
      </button>

      {/* Loading */}
      {(claimLoading || paymentLoading) && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 w-full rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      )}

      {/* Error */}
      {claimError && !claimLoading && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-5 py-4 text-red-700">
          <AlertCircle className="w-5 h-5 shrink-0" /> Dossier introuvable ou accès refusé.
        </div>
      )}

      {/* Content */}
      {claim && (
        <>
          {/* Header */}
          <div className={`${statusCfg.bg} border-l-4 ${statusCfg.border} rounded-xl p-5 mb-5`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-5 h-5 text-gray-600" />
                  <span className="font-mono font-bold text-gray-900">#{claim.claimNumber}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${statusCfg.bg} ${statusCfg.text} border-current`}>
                    {statusCfg.label}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {claim.claimType} · Sinistre du {fmtDate(claim.incidentDate)}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={() => { mutateClaim(); mutatePayment() }} className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                  <RefreshCw className="w-4 h-4" /> Actualiser
                </button>
                {claim.status === 'IN_PAYMENT' && !payment && (
                  <button
                    onClick={() => setPaymentModalOpen(true)}
                    className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 transition-colors shadow-sm"
                  >
                    <Wallet className="w-4 h-4" /> Enregistrer le paiement
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left column */}
            <div className="lg:col-span-2 space-y-5">
              {/* Financials */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-teal-600" /> Montants
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs text-gray-500 mb-1">Déclaré</p>
                    <p className="font-semibold text-gray-800">
                      {claim.claimedAmount ? fmt(parseFloat(claim.claimedAmount)) : '—'}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs text-gray-500 mb-1">Estimé</p>
                    <p className="font-semibold text-gray-800">
                      {claim.estimatedAmount ? fmt(parseFloat(claim.estimatedAmount)) : '—'}
                    </p>
                  </div>
                  <div className="rounded-lg bg-green-50 border border-green-100 p-3">
                    <p className="text-xs text-green-600 mb-1">Approuvé</p>
                    <p className="font-bold text-green-700">
                      {claim.approvedAmount ? fmt(parseFloat(claim.approvedAmount)) : '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <h3 className="font-semibold text-gray-900 mb-3">Description</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{claim.description}</p>
                {claim.incidentLocation && (
                  <p className="text-sm text-gray-500 mt-2">📍 {claim.incidentLocation}</p>
                )}
              </div>

              {/* Payment receipt (if recorded) */}
              {payment && <PaymentReceiptCard payment={payment} />}

              {/* IN_PAYMENT prompt */}
              {claim.status === 'IN_PAYMENT' && !payment && (
                <div className="border-2 border-dashed border-teal-300 rounded-xl p-6 text-center">
                  <Wallet className="w-8 h-8 text-teal-400 mx-auto mb-2" />
                  <p className="font-semibold text-teal-700 mb-1">En attente de paiement</p>
                  <p className="text-sm text-gray-500 mb-4">
                    Le paiement hors-ligne n'a pas encore été enregistré pour ce dossier.
                  </p>
                  <button
                    onClick={() => setPaymentModalOpen(true)}
                    className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
                  >
                    Enregistrer le paiement
                  </button>
                </div>
              )}
            </div>

            {/* Right column */}
            <div className="space-y-5">
              {/* Client */}
              {claim.client && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-600" /> Client
                  </h3>
                  <div className="space-y-2">
                    <p className="font-medium text-gray-900">{claim.client.firstName} {claim.client.lastName}</p>
                    <p className="text-sm text-gray-500">{claim.client.email}</p>
                    <p className="text-sm text-gray-500">{claim.client.phone}</p>
                    <p className="text-xs text-gray-400 font-mono">CIN: {claim.client.cin}</p>
                  </div>
                </div>
              )}

              {/* Policy */}
              {claim.policy && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-green-600" /> Police
                  </h3>
                  <p className="font-mono text-sm font-semibold text-gray-800">{claim.policy.policyNumber}</p>
                  <p className="text-sm text-gray-500 mt-1">{claim.policy.policyType}</p>
                </div>
              )}

              {/* Assigned expert */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-600" /> Expert assigné
                </h3>
                {claim.assignedUser ? (
                  <div>
                    <p className="font-medium text-gray-900">{claim.assignedUser.firstName} {claim.assignedUser.lastName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{claim.assignedUser.role.replace(/_/g, ' ')}</p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">Non assigné</p>
                )}
              </div>

              {/* Dates */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" /> Dates
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Sinistre</span>
                    <span className="text-gray-800">{fmtDate(claim.incidentDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Déclaration</span>
                    <span className="text-gray-800">{fmtDate(claim.declarationDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Création</span>
                    <span className="text-gray-800">{fmtDate(claim.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Record Payment Modal */}
      {paymentModalOpen && claim && token && (
        <RecordPaymentModal
          claim={claim}
          token={token}
          onClose={() => setPaymentModalOpen(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </RoleBasedLayout>
  )
}
