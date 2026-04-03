'use client'

import React, { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import {
  Users, RefreshCw, Plus, X, UserPlus, UserMinus,
  Briefcase, Shield, ChevronDown, ChevronUp,
} from 'lucide-react'
import RoleBasedLayout from '@/components/layout/RoleBasedLayout'
import { useAdminAuth } from '@/app/hooks/useAdminAuth'

const CLAIM_TYPES = [
  { value: 'ACCIDENT',     label: 'Accident' },
  { value: 'THEFT',        label: 'Vol' },
  { value: 'FIRE',         label: 'Incendie' },
  { value: 'WATER_DAMAGE', label: 'Dégât des eaux' },
]
const ROLE_LABELS: Record<string, string> = {
  EXPERT: 'Expert', MANAGER_JUNIOR: 'Manager Junior', MANAGER_SENIOR: 'Manager Senior',
}
const ROLE_CLR: Record<string, string> = {
  EXPERT:          'bg-purple-100 text-purple-700',
  MANAGER_JUNIOR:  'bg-blue-100 text-blue-700',
  MANAGER_SENIOR:  'bg-orange-100 text-orange-700',
}

interface TeamMemberUser {
  userId: string; firstName: string; lastName: string
  email: string; role: string; currentWorkload: number; maxWorkload: number; isActive: boolean
}
interface Member { id: string; role: 'LEAD' | 'MEMBER'; maxClaims: number; joinedAt: string; user: TeamMemberUser }
interface Team {
  id: string; name: string; description: string | null; claimTypes: string[]
  maxWorkload: number; isActive: boolean; createdAt: string
  members: Member[]
  stats: { memberCount: number; totalCurrent: number; totalMax: number; workloadPercent: number }
  lead: { userId: string; firstName: string; lastName: string } | null
}
interface StaffUser { userId: string; firstName: string; lastName: string; email: string; role: string; currentWorkload: number }

function workloadColor(pct: number) {
  if (pct >= 80) return 'bg-red-500'
  if (pct >= 50) return 'bg-orange-400'
  return 'bg-green-500'
}

export default function ManagerSeniorTeamPage() {
  const router  = useRouter()
  const { user, isLoading: authLoading, logout, token } = useAdminAuth()

  const [expandedTeam, setExpandedTeam]       = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [addingTo, setAddingTo]               = useState<Team | null>(null)
  const [toast, setToast]                     = useState<string | null>(null)

  // Create team form state
  const [newName, setNewName]   = useState('')
  const [newDesc, setNewDesc]   = useState('')
  const [newTypes, setNewTypes] = useState<string[]>([])
  const [newMax, setNewMax]     = useState(20)
  const [creating, setCreating] = useState(false)

  // Add member form state
  const [selectedUser, setSelectedUser] = useState('')
  const [addingMember, setAddingMember] = useState(false)

  const fetcher = useCallback(
    ([url, t]: [string, string]) =>
      fetch(url, { headers: { Authorization: `Bearer ${t}` } }).then(r => {
        if (!r.ok) throw new Error('Erreur')
        return r.json()
      }),
    [],
  )

  const { data: teamsData, isLoading, mutate } = useSWR(
    token ? ['/api/manager-senior/my-teams', token] : null,
    fetcher, { revalidateOnFocus: false },
  )
  const { data: staffData } = useSWR(
    token ? ['/api/manager-senior/staff', token] : null,
    fetcher, { revalidateOnFocus: false },
  )

  React.useEffect(() => {
    if (!authLoading && !user) router.push('/auth/admin?reason=session_expired')
  }, [authLoading, user, router])

  if (authLoading || !user) return null

  const teams: Team[]         = teamsData?.data?.teams ?? []
  const allStaff: StaffUser[] = staffData?.data?.users ?? []

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3500) }

  // ── Create team ──────────────────────────────────────────────────────────────
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!token || !newName.trim() || newTypes.length === 0) return
    setCreating(true)
    try {
      const res = await fetch('/api/manager-senior/my-teams', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() || null, claimTypes: newTypes, maxWorkload: newMax }),
      })
      const d = await res.json()
      if (!res.ok) { showToast('❌ ' + (d.error ?? 'Erreur')); return }
      setShowCreateModal(false); setNewName(''); setNewDesc(''); setNewTypes([]); setNewMax(20)
      showToast('✅ Équipe créée avec succès')
      mutate()
    } catch { showToast('❌ Erreur réseau') }
    finally { setCreating(false) }
  }

  // ── Add member ───────────────────────────────────────────────────────────────
  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault()
    if (!token || !addingTo || !selectedUser) return
    setAddingMember(true)
    try {
      const res = await fetch(`/api/manager-senior/my-teams/${addingTo.id}/members`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser }),
      })
      const d = await res.json()
      if (!res.ok) { showToast('❌ ' + (d.error ?? 'Erreur')); return }
      setAddingTo(null); setSelectedUser('')
      showToast('✅ Membre ajouté')
      mutate()
    } catch { showToast('❌ Erreur réseau') }
    finally { setAddingMember(false) }
  }

  // ── Remove member ────────────────────────────────────────────────────────────
  async function handleRemove(teamId: string, userId: string, name: string) {
    if (!token) return
    if (!confirm(`Retirer ${name} de l'équipe ?`)) return
    try {
      const res = await fetch(`/api/manager-senior/my-teams/${teamId}/members`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      const d = await res.json()
      if (!res.ok) { showToast('❌ ' + (d.error ?? 'Erreur')); return }
      showToast('✅ Membre retiré')
      mutate()
    } catch { showToast('❌ Erreur réseau') }
  }

  const totalMembers    = teams.reduce((s, t) => s + t.stats.memberCount, 0)
  const totalInProgress = teams.reduce((s, t) => s + t.stats.totalCurrent, 0)

  return (
    <RoleBasedLayout role="MANAGER_SENIOR" user={user} onLogout={logout}>

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg">{toast}</div>
      )}

      {/* ── Create Team Modal ────────────────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-600" /> Créer une équipe
              </h3>
              <button onClick={() => setShowCreateModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l&apos;équipe *</label>
                <input required value={newName} onChange={e => setNewName(e.target.value)}
                  placeholder="Ex: Équipe Accidents Nord"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Optionnel"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Types de sinistres *</label>
                <div className="flex flex-wrap gap-2">
                  {CLAIM_TYPES.map(ct => (
                    <button key={ct.value} type="button"
                      onClick={() => setNewTypes(p => p.includes(ct.value) ? p.filter(v => v !== ct.value) : [...p, ct.value])}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${newTypes.includes(ct.value) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}>
                      {ct.label}
                    </button>
                  ))}
                </div>
                {newTypes.length === 0 && <p className="text-xs text-red-500 mt-1">Sélectionnez au moins un type</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Charge max par membre</label>
                <input type="number" min={1} max={100} value={newMax} onChange={e => setNewMax(Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateModal(false)}
                  className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50">Annuler</button>
                <button type="submit" disabled={creating || !newName.trim() || newTypes.length === 0}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white py-2.5 rounded-xl text-sm font-medium">
                  {creating ? 'Création...' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Member Modal ─────────────────────────────────────────────────── */}
      {addingTo && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-green-600" /> Ajouter un membre
              </h3>
              <button onClick={() => { setAddingTo(null); setSelectedUser('') }}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleAddMember} className="p-5 space-y-4">
              <p className="text-xs text-gray-500">Équipe : <span className="font-medium text-gray-800">{addingTo.name}</span></p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sélectionner *</label>
                <select required value={selectedUser} onChange={e => setSelectedUser(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
                  <option value="">-- Choisir --</option>
                  {allStaff
                    .filter(s => !addingTo.members.some(m => m.user.userId === s.userId))
                    .map(s => (
                      <option key={s.userId} value={s.userId}>
                        {s.firstName} {s.lastName} ({ROLE_LABELS[s.role] ?? s.role}) — charge {s.currentWorkload}
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => { setAddingTo(null); setSelectedUser('') }}
                  className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50">Annuler</button>
                <button type="submit" disabled={!selectedUser || addingMember}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white py-2.5 rounded-xl text-sm font-medium">
                  {addingMember ? 'Ajout...' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Mes équipes</h2>
            <p className="text-sm text-gray-500 mt-0.5">{teams.length} équipe(s) · {totalMembers} membre(s)</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => mutate()}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              <RefreshCw className="h-4 w-4" /> Actualiser
            </button>
            <button onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-1.5 text-sm font-medium text-white transition-colors">
              <Plus className="h-4 w-4" /> Créer une équipe
            </button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Équipes',         value: teams.length,    icon: Shield,    color: 'bg-blue-100 text-blue-600'   },
            { label: 'Membres totaux',  value: totalMembers,    icon: Users,     color: 'bg-purple-100 text-purple-600'},
            { label: 'Dossiers actifs', value: totalInProgress, icon: Briefcase, color: 'bg-orange-100 text-orange-600'},
          ].map(k => (
            <div key={k.label} className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${k.color}`}>
                <k.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{k.label}</p>
                <p className="text-xl font-bold text-gray-900">{isLoading ? '…' : k.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Teams list */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse h-24 rounded-xl border border-gray-200 bg-gray-50" />
            ))}
          </div>
        ) : teams.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-white py-16 text-center">
            <Users className="h-12 w-12 text-gray-300 mb-3" />
            <p className="font-medium text-gray-500">Aucune équipe</p>
            <p className="text-sm text-gray-400 mt-1">Créez votre première équipe pour commencer</p>
            <button onClick={() => setShowCreateModal(true)}
              className="mt-4 flex items-center gap-1.5 bg-blue-600 text-white text-sm px-4 py-2 rounded-xl hover:bg-blue-700">
              <Plus className="h-4 w-4" /> Créer une équipe
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {teams.map(team => {
              const isOpen = expandedTeam === team.id
              return (
                <div key={team.id} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                  {/* Team header row */}
                  <div
                    className="flex items-center gap-4 p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedTeam(isOpen ? null : team.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900">{team.name}</h3>
                        {!team.isActive && (
                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inactif</span>
                        )}
                        {team.claimTypes.map(ct => (
                          <span key={ct} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                            {CLAIM_TYPES.find(c => c.value === ct)?.label ?? ct}
                          </span>
                        ))}
                      </div>
                      {team.description && <p className="text-xs text-gray-400 mt-0.5">{team.description}</p>}
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-center hidden sm:block">
                        <p className="text-sm font-bold text-gray-900">{team.stats.memberCount}</p>
                        <p className="text-xs text-gray-400">membres</p>
                      </div>
                      <div className="w-24 hidden md:block">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Charge</span><span>{team.stats.workloadPercent}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${workloadColor(team.stats.workloadPercent)}`}
                            style={{ width: `${Math.min(team.stats.workloadPercent, 100)}%` }}
                          />
                        </div>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); setAddingTo(team); setSelectedUser('') }}
                        className="flex items-center gap-1 text-xs bg-green-50 text-green-700 hover:bg-green-100 px-2.5 py-1.5 rounded-lg border border-green-200 transition-colors"
                      >
                        <UserPlus className="w-3.5 h-3.5" /> Ajouter
                      </button>
                      {isOpen
                        ? <ChevronUp className="w-4 h-4 text-gray-400" />
                        : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </div>

                  {/* Members list */}
                  {isOpen && (
                    <div className="border-t border-gray-100">
                      {team.members.length === 0 ? (
                        <div className="py-8 text-center text-gray-400 text-sm">Aucun membre</div>
                      ) : (
                        <div className="divide-y divide-gray-50">
                          {team.members.map(mb => (
                            <div key={mb.id} className="flex items-center gap-3 px-5 py-3">
                              <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                                {mb.user.firstName[0]}{mb.user.lastName[0]}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-medium text-gray-800">
                                    {mb.user.firstName} {mb.user.lastName}
                                  </span>
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_CLR[mb.user.role] ?? 'bg-gray-100 text-gray-600'}`}>
                                    {ROLE_LABELS[mb.user.role] ?? mb.user.role}
                                  </span>
                                  {mb.role === 'LEAD' && (
                                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                                      Chef d&apos;équipe
                                    </span>
                                  )}
                                  {!mb.user.isActive && (
                                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Inactif</span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-400">{mb.user.email}</p>
                              </div>
                              <div className="text-center hidden sm:block shrink-0">
                                <p className="text-sm font-bold text-gray-700">{mb.user.currentWorkload}/{mb.maxClaims}</p>
                                <p className="text-xs text-gray-400">charge</p>
                              </div>
                              {mb.user.userId !== user.userId && (
                                <button
                                  onClick={() => handleRemove(team.id, mb.user.userId, `${mb.user.firstName} ${mb.user.lastName}`)}
                                  className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                                  title="Retirer de l'équipe"
                                >
                                  <UserMinus className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </RoleBasedLayout>
  )
}
