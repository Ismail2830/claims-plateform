'use client'

import { useState, useEffect, useRef } from 'react'
import {
  MessageCircle, X, ChevronLeft, Send, ExternalLink, Plus, FileText,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useSimpleAuth } from '@/app/hooks/useSimpleAuth'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClaimSummary {
  claimId: string
  claimNumber: string
  claimType: string           // AUTO | HABITATION | SANTE | VIE (display key)
  declarationMethod: string   // CHATBOT | FORM
  status: string
  statusLabel: string
  steps: { label: string; completed: boolean; date?: string }[]
  estimatedDaysRemaining: number
  sla: number
  createdAt: string
  lastUpdate: string
}
const TYPE_EMOJI: Record<string, string> = {
  AUTO: '🚗',
  HABITATION: '🏠',
  SANTE: '🏥',
  VIE: '👤',
}
const STATUS_COLOR: Record<string, string> = {
  DECLARED: 'text-blue-600 bg-blue-50',
  ANALYZING: 'text-yellow-600 bg-yellow-50',
  DOCS_REQUIRED: 'text-orange-600 bg-orange-50',
  UNDER_EXPERTISE: 'text-purple-600 bg-purple-50',
  IN_DECISION: 'text-indigo-600 bg-indigo-50',
  APPROVED: 'text-green-600 bg-green-50',
  IN_PAYMENT: 'text-emerald-600 bg-emerald-50',
  CLOSED: 'text-gray-600 bg-gray-100',
  REJECTED: 'text-red-600 bg-red-50',
}
const STATUS_LABEL: Record<string, string> = {
  DECLARED: 'Déclaré',
  ANALYZING: 'En analyse',
  DOCS_REQUIRED: 'Docs requis',
  UNDER_EXPERTISE: 'En instruction',
  IN_DECISION: 'En décision',
  APPROVED: 'Approuvé',
  IN_PAYMENT: 'En paiement',
  CLOSED: 'Clôturé',
  REJECTED: 'Rejeté',
}

const QUICK_ANSWERS: { keywords: string[]; answer: string }[] = [
  {
    keywords: ['délai', 'quand', 'combien de temps', 'durée'],
    answer: "Le délai de traitement dépend du type de sinistre : AUTO (10j), Habitation (15j), Santé (5j), Vie (30j). Je vous informerai de toute mise à jour.",
  },
  {
    keywords: ['document', 'manquant', 'pièce', 'justificatif'],
    answer: "Si des documents supplémentaires sont requis, vous recevrez une notification. Vous pouvez également les déposer depuis votre espace dossier.",
  },
  {
    keywords: ['statut', 'état', 'avancement', 'où en est'],
    answer: "Votre dossier est en cours de traitement. Consultez la fiche ci-dessus pour voir l'avancement détaillé.",
  },
  {
    keywords: ['conseiller', 'agent', 'humain', 'parler', 'contact'],
    answer: "Pour parler à un conseiller, appelez le 0800 00 00 00 (gratuit, lun-ven 8h-18h) ou envoyez un message via votre espace dossier.",
  },
]

function findQuickAnswer(q: string): string | null {
  const lower = q.toLowerCase()
  for (const qa of QUICK_ANSWERS) {
    if (qa.keywords.some((k) => lower.includes(k))) return qa.answer
  }
  return null
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ClaimStatusWidget() {
  const router = useRouter()
  const { token } = useSimpleAuth()

  const [open, setOpen] = useState(false)
  const [claims, setClaims] = useState<ClaimSummary[]>([])
  const [selected, setSelected] = useState<ClaimSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [question, setQuestion] = useState('')
  const [chatLines, setChatLines] = useState<{ role: 'user' | 'bot'; text: string }[]>([])
  const chatEndRef = useRef<HTMLDivElement>(null)

  const authHeaders = { Authorization: `Bearer ${token ?? ''}` }

  // Load all client claims when widget opens
  useEffect(() => {
    if (!open || !token) return
    setLoading(true)
    fetch('/api/client/claims', { headers: authHeaders })
      .then((r) => r.json())
      .then((data) => { setClaims(data.claims ?? []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, token])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatLines])

  function sendQuestion() {
    const q = question.trim()
    if (!q) return
    setQuestion('')
    setChatLines((prev) => [...prev, { role: 'user', text: q }])
    const answer = findQuickAnswer(q)
    setTimeout(() => {
      setChatLines((prev) => [
        ...prev,
        {
          role: 'bot',
          text: answer ?? "Je n'ai pas trouvé de réponse précise. Consultez votre dossier ou contactez un conseiller.",
        },
      ])
    }, 600)
  }

  const activeClaims = claims.filter((c) => !['CLOSED', 'REJECTED'].includes(c.status))
  const historyClaims = claims.filter((c) => ['CLOSED', 'REJECTED'].includes(c.status))

  // ─── Progress helper ─────────────────────────────────────────────────────
  function progressPct(steps: ClaimSummary['steps']): number {
    if (!steps.length) return 0
    const done = steps.filter((s) => s.completed).length
    return Math.round((done / steps.length) * 100)
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* ── Expanded panel ─────────────────────────────────────────────────── */}
      {open && (
        <div className="w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden max-h-[500px]">
          {/* Header */}
          <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              {selected && (
                <button
                  onClick={() => setSelected(null)}
                  className="hover:bg-blue-500 rounded-lg p-0.5 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              <span className="text-lg">🤖</span>
              <div>
                <p className="text-sm font-bold leading-none">ISM Bot</p>
                <p className="text-[10px] text-blue-200">Suivi de dossiers</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="hover:bg-blue-500 rounded-lg p-1 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            {/* ── Claim detail ─────────────────────────────────────────────── */}
            {selected && (
              <div className="p-3 space-y-3">
                {/* Claim header card */}
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-blue-600 text-sm">
                      {selected.claimNumber}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[selected.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {selected.statusLabel}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base">{TYPE_EMOJI[selected.claimType] ?? '📋'}</span>
                    <span className="text-xs text-gray-600">{selected.claimType}</span>
                    <span className="ml-auto text-[10px] text-gray-400">
                      {selected.declarationMethod === 'CHATBOT' ? '🤖 Assistant' : '📝 Formulaire'}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mb-3">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${progressPct(selected.steps)}%` }}
                    />
                  </div>

                  {/* Steps */}
                  <div className="space-y-1.5">
                    {selected.steps.map((step) => (
                      <div key={step.label} className="flex items-center gap-2">
                        <span className="text-sm">{step.completed ? '✅' : '⬜'}</span>
                        <span className={`text-xs ${step.completed ? 'text-gray-700' : 'text-gray-400'}`}>
                          {step.label}
                        </span>
                        {step.date && step.completed && (
                          <span className="text-[10px] text-gray-400 ml-auto">
                            {new Date(step.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {selected.estimatedDaysRemaining > 0 && !['CLOSED', 'REJECTED', 'APPROVED'].includes(selected.status) && (
                    <p className="text-[10px] text-gray-500 mt-2 pt-2 border-t border-gray-200">
                      ⏱️ Délai estimé: encore{' '}
                      <span className="font-semibold">{selected.estimatedDaysRemaining}j</span>
                    </p>
                  )}
                </div>

                <button
                  onClick={() => router.push('/dashboard/client/claims')}
                  className="w-full flex items-center justify-center gap-1.5 text-xs text-blue-600 border border-blue-200 rounded-xl py-2 hover:bg-blue-50 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  Voir le dossier complet
                </button>

                {/* Quick chat */}
                <div className="border-t border-gray-100 pt-2">
                  <p className="text-[10px] text-gray-400 mb-2">Posez une question</p>
                  <div className="space-y-1 max-h-28 overflow-y-auto">
                    {chatLines.map((line, i) => (
                      <div
                        key={i}
                        className={`text-xs rounded-xl px-3 py-1.5 ${
                          line.role === 'user'
                            ? 'bg-blue-600 text-white ml-6'
                            : 'bg-gray-100 text-gray-700 mr-6'
                        }`}
                      >
                        {line.text}
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                  <div className="flex gap-1 mt-1.5">
                    <input
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendQuestion()}
                      placeholder="Posez une question..."
                      className="flex-1 text-xs border border-gray-200 rounded-xl px-3 py-1.5 outline-none focus:border-blue-400"
                    />
                    <button
                      onClick={sendQuestion}
                      disabled={!question.trim()}
                      className="w-7 h-7 bg-blue-600 disabled:opacity-40 rounded-xl flex items-center justify-center"
                    >
                      <Send className="w-3 h-3 text-white" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Claims list ───────────────────────────────────────────────── */}
            {!selected && (
              <div className="p-3 space-y-3">
                {loading ? (
                  <div className="space-y-2 py-2">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : claims.length === 0 ? (
                  <div className="text-center py-6">
                    <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 mb-3">Vous n'avez pas encore de dossier.</p>
                    <button
                      onClick={() => { setOpen(false); router.push('/dashboard/client/claims/new') }}
                      className="flex items-center gap-1.5 mx-auto text-sm text-blue-600 border border-blue-200 rounded-xl px-3 py-2 hover:bg-blue-50 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Déclarer un sinistre
                    </button>
                  </div>
                ) : (
                  <>
                    {activeClaims.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                          Dossiers actifs
                        </p>
                        <div className="space-y-2">
                          {activeClaims.map((c) => (
                            <ClaimRow key={c.claimId} claim={c} onClick={() => setSelected(c)} progressPct={progressPct} />
                          ))}
                        </div>
                      </div>
                    )}
                    {historyClaims.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                          Historique
                        </p>
                        <div className="space-y-2">
                          {historyClaims.map((c) => (
                            <ClaimRow key={c.claimId} claim={c} onClick={() => setSelected(c)} progressPct={progressPct} />
                          ))}
                        </div>
                      </div>
                    )}
                    <button
                      onClick={() => { setOpen(false); router.push('/dashboard/client/claims/new') }}
                      className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-500 border border-dashed border-gray-300 rounded-xl py-2 hover:bg-gray-50 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Nouveau sinistre
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Toggle button ──────────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>
    </div>
  )
}

// ─── ClaimRow sub-component ───────────────────────────────────────────────────

function ClaimRow({
  claim,
  onClick,
  progressPct,
}: {
  claim: ClaimSummary
  onClick: () => void
  progressPct: (steps: ClaimSummary['steps']) => number
}) {
  const pct = progressPct(claim.steps)
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-2.5 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-colors"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-lg">{TYPE_EMOJI[claim.claimType] ?? '📋'}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-800 truncate font-mono">
            {claim.claimNumber}
          </p>
          <p className="text-[10px] text-gray-500">
            {claim.claimType} · {claim.declarationMethod === 'CHATBOT' ? '🤖' : '📝'}
          </p>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_COLOR[claim.status] ?? 'bg-gray-100 text-gray-600'}`}>
          {claim.statusLabel}
        </span>
      </div>
      {/* Mini progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-1">
        <div
          className="bg-blue-500 h-1 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </button>
  )
}
