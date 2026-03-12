'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import {
  FileText, Search, RefreshCw, ChevronRight, ChevronLeft,
  AlertCircle, User, Calendar, Shield, Brain,
  AlertTriangle, Filter,
} from 'lucide-react'
import RoleBasedLayout from '@/components/layout/RoleBasedLayout'
import { useAdminAuth } from '@/app/hooks/useAdminAuth'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClaimRow {
  claimId:     string
  claimNumber: string
  claimType:   string
  status:      string
  priority:    string
  scoreRisque: number | null
  labelRisque: string | null
  estimatedAmount: number | null
  createdAt:   string
  updatedAt:   string
  client:      { firstName: string; lastName: string } | null
  assignedUser:{ firstName: string; lastName: string } | null
  _count:      { documents: number }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  DECLARED:        { label: 'Déclaré',         cls: 'bg-gray-100 text-gray-700'     },
  ANALYZING:       { label: 'En analyse',      cls: 'bg-blue-100 text-blue-700'     },
  DOCS_REQUIRED:   { label: 'Docs manquants',  cls: 'bg-yellow-100 text-yellow-700' },
  UNDER_EXPERTISE: { label: 'En instruction',  cls: 'bg-purple-100 text-purple-700' },
  IN_DECISION:     { label: 'En décision',     cls: 'bg-orange-100 text-orange-700' },
  APPROVED:        { label: 'Approuvé',        cls: 'bg-green-100 text-green-700'   },
  IN_PAYMENT:      { label: 'En paiement',     cls: 'bg-teal-100 text-teal-700'     },
  CLOSED:          { label: 'Clôturé',         cls: 'bg-gray-200 text-gray-600'     },
  REJECTED:        { label: 'Rejeté',          cls: 'bg-red-100 text-red-700'       },
}

const PRIORITY_CFG: Record<string, string> = {
  URGENT: 'bg-red-100 text-red-700',
  HIGH:   'bg-orange-100 text-orange-700',
  NORMAL: 'bg-blue-100 text-blue-700',
  LOW:    'bg-green-100 text-green-700',
}

const RISK_CFG: Record<string, { label: string; cls: string }> = {
  FAIBLE:     { label: 'Faible',     cls: 'bg-green-100 text-green-700'    },
  MOYEN:      { label: 'Moyen',      cls: 'bg-yellow-100 text-yellow-700'  },
  ELEVE:      { label: 'Élevé',      cls: 'bg-orange-100 text-orange-700'  },
  SUSPICIEUX: { label: 'Suspicieux', cls: 'bg-red-100 text-red-700'        },
}

const CLAIM_TYPE_LABEL: Record<string, string> = {
  ACCIDENT:     'Accident',
  THEFT:        'Vol',
  FIRE:         'Incendie',
  WATER_DAMAGE: 'Dégât des eaux',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function swrFetcher(url: string, token: string) {
  return fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    .then(r => { if (!r.ok) throw new Error('Erreur'); return r.json() })
}

function Skel() {
  return (
    <div className="animate-pulse divide-y divide-gray-100">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-3">
          <div className="h-4 w-28 rounded bg-gray-200" />
          <div className="h-4 w-24 rounded bg-gray-200" />
          <div className="h-4 w-20 rounded bg-gray-200 flex-1" />
          <div className="h-4 w-16 rounded bg-gray-200" />
        </div>
      ))}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ManagerClaimsListPage() {
  const router = useRouter()
  const { user, isLoading: authLoading, logout, token } = useAdminAuth()

  const [filterStatus, setFilterStatus] = useState('')
  const [search, setSearch]             = useState('')
  const [page, setPage]                 = useState(1)
  const PAGE_SIZE = 20

  // Build query string
  const qs = new URLSearchParams({
    page:  String(page),
    limit: String(PAGE_SIZE),
    ...(filterStatus ? { status: filterStatus } : {}),
  }).toString()

  const { data, isLoading, error, mutate } = useSWR(
    token ? [`/api/manager-junior/claims?${qs}`, token] : null,
    ([url, t]: [string, string]) => swrFetcher(url, t),
    { keepPreviousData: true },
  )

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth/admin?reason=session_expired')
  }, [authLoading, user, router])

  if (authLoading || !user) return null

  const allClaims: ClaimRow[] = data?.data ?? []
  const meta = data?.meta ?? { total: 0, pages: 1, page: 1 }

  const filtered = allClaims.filter(c => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      c.claimNumber.toLowerCase().includes(q) ||
      `${c.client?.firstName ?? ''} ${c.client?.lastName ?? ''}`.toLowerCase().includes(q) ||
      c.claimType.toLowerCase().includes(q)
    )
  })

  const urgentCount = allClaims.filter(c => c.status === 'DOCS_REQUIRED' || c.priority === 'URGENT').length

  return (
    <RoleBasedLayout role="MANAGER_JUNIOR" user={user} onLogout={logout}>
      <div className="space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" /> Sinistres équipe
              {urgentCount > 0 && (
                <span className="flex items-center gap-1 text-xs bg-orange-100 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full font-medium">
                  <AlertTriangle className="w-3 h-3" /> {urgentCount} urgent{urgentCount > 1 ? 's' : ''}
                </span>
              )}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {meta.total} dossier{meta.total !== 1 ? 's' : ''} dans votre équipe
            </p>
          </div>
          <button onClick={() => mutate()} className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <RefreshCw className="h-4 w-4" /> Actualiser
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="N° dossier, client, type..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400 shrink-0" />
              <select
                value={filterStatus}
                onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tous les statuts</option>
                {Object.entries(STATUS_CFG).map(([v, c]) => (
                  <option key={v} value={v}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Table header */}
          <div className="hidden md:grid grid-cols-[2fr_2fr_1.5fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 border-b border-gray-100 bg-gray-50">
            {['Dossier', 'Client', 'Type', 'Statut', 'Priorité', 'Risque IA', ''].map(h => (
              <span key={h} className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</span>
            ))}
          </div>

          {isLoading ? <Skel /> : error ? (
            <div className="flex items-center gap-2 p-6 text-red-600 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              Impossible de charger les dossiers.
              <button onClick={() => mutate()} className="underline ml-1">Réessayer</button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <FileText className="w-10 h-10 mb-3 text-gray-300" />
              <p className="font-medium text-gray-600">Aucun dossier trouvé</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map(claim => {
                const sCfg  = STATUS_CFG[claim.status]   ?? { label: claim.status,    cls: 'bg-gray-100 text-gray-700' }
                const pCfg  = PRIORITY_CFG[claim.priority] ?? 'bg-gray-100 text-gray-700'
                const rCfg  = claim.labelRisque ? (RISK_CFG[claim.labelRisque] ?? null) : null
                const isUrgent = claim.status === 'DOCS_REQUIRED' || claim.priority === 'URGENT'

                return (
                  <div
                    key={claim.claimId}
                    onClick={() => router.push(`/dashboard/manager-junior/claims/${claim.claimId}`)}
                    className={`grid grid-cols-1 md:grid-cols-[2fr_2fr_1.5fr_1fr_1fr_1fr_auto] gap-3 md:gap-4 px-5 py-4 cursor-pointer hover:bg-blue-50/50 transition-colors ${isUrgent ? 'border-l-2 border-l-orange-400' : ''}`}
                  >
                    {/* Dossier */}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">#{claim.claimNumber}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        {fmtDate(claim.updatedAt)}
                      </p>
                    </div>

                    {/* Client */}
                    <div className="min-w-0">
                      <p className="text-sm text-gray-800 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">
                          {claim.client ? `${claim.client.firstName} ${claim.client.lastName}` : '—'}
                        </span>
                      </p>
                      {claim.assignedUser && (
                        <p className="text-xs text-gray-400 truncate mt-0.5 ml-5">
                          Expert: {claim.assignedUser.firstName} {claim.assignedUser.lastName}
                        </p>
                      )}
                    </div>

                    {/* Type */}
                    <div className="flex items-center">
                      <span className="text-sm text-gray-700">
                        {CLAIM_TYPE_LABEL[claim.claimType] ?? claim.claimType}
                      </span>
                    </div>

                    {/* Statut */}
                    <div className="flex items-center">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sCfg.cls}`}>
                        {sCfg.label}
                      </span>
                    </div>

                    {/* Priorité */}
                    <div className="flex items-center">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${pCfg}`}>
                        {claim.priority}
                      </span>
                    </div>

                    {/* Risk IA */}
                    <div className="flex items-center gap-1.5">
                      {rCfg ? (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${rCfg.cls}`}>
                          <Brain className="w-3 h-3" /> {rCfg.label}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </div>

                    {/* Arrow */}
                    <div className="hidden md:flex items-center">
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {meta.pages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Page {meta.page} / {meta.pages} — {meta.total} dossiers
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Préc.
              </button>
              <button
                onClick={() => setPage(p => Math.min(meta.pages, p + 1))}
                disabled={page >= meta.pages}
                className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Suiv. <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>
    </RoleBasedLayout>
  )
}
