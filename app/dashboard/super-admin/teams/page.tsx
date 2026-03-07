'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Building2,
  Shuffle,
  Settings,
  TrendingUp,
  RefreshCw,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  Activity,
} from 'lucide-react';
import { useAdminAuth } from '@/app/hooks/useAdminAuth';
import type { TeamWithStats, RoutingRule, TeamsStats, TeamMemberData } from './types';
import { CLAIM_TYPE_LABELS, CLAIM_TYPE_COLORS, ROLE_LABELS } from './types';
import { WorkloadBar } from './components/WorkloadBar';
import { TeamCard } from './components/TeamCard';
import { MemberRow } from './components/MemberRow';
import { CreateTeamModal } from './components/CreateTeamModal';
import { AddMemberModal } from './components/AddMemberModal';
import { EditRoutingRuleModal } from './components/EditRoutingRuleModal';
import { RebalanceConfirmModal } from './components/RebalanceConfirmModal';
import { TeamManageDrawer } from './components/TeamManageDrawer';

type Tab = 'teams' | 'members' | 'routing' | 'performance';
type PerfPeriod = 'week' | 'month' | 'quarter';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'teams', label: 'Equipes', icon: Building2 },
  { id: 'members', label: 'Membres', icon: Users },
  { id: 'routing', label: "Regles d'attribution", icon: Settings },
  { id: 'performance', label: 'Performance', icon: TrendingUp },
];

export default function TeamsPage() {
  useAdminAuth();

  const [activeTab, setActiveTab] = useState<Tab>('teams');
  const [teams, setTeams] = useState<TeamWithStats[]>([]);
  const [stats, setStats] = useState<TeamsStats | null>(null);
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [rulesLoading, setRulesLoading] = useState(false);

  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [managingTeam, setManagingTeam] = useState<{ team: TeamWithStats; readOnly: boolean } | null>(null);
  const [showAddMember, setShowAddMember] = useState<{ teamId: string; teamName: string } | null>(null);
  const [editingRule, setEditingRule] = useState<RoutingRule | null | undefined>(undefined);
  const [rebalancingTeam, setRebalancingTeam] = useState<{ id: string; name: string } | null>(null);
  const [deleteRuleId, setDeleteRuleId] = useState<string | null>(null);
  const [deletingRule, setDeletingRule] = useState(false);

  const [memberSearch, setMemberSearch] = useState('');
  const [memberRoleFilter, setMemberRoleFilter] = useState('');
  const [memberTeamFilter, setMemberTeamFilter] = useState('');
  const [perfPeriod, setPerfPeriod] = useState<PerfPeriod>('month');

  const fetchTeams = useCallback(async () => {
    try {
      const res = await fetch('/api/teams');
      const data = await res.json();
      if (data.success) {
        const list = data.data?.teams ?? data.data;
        setTeams(Array.isArray(list) ? list : []);
      }
    } catch {}
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/teams/stats');
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch {}
  }, []);

  const fetchRules = useCallback(async () => {
    setRulesLoading(true);
    try {
      const res = await fetch('/api/teams/routing-rules');
      const data = await res.json();
      if (data.success) setRules(Array.isArray(data.data) ? data.data : []);
    } catch {}
    finally { setRulesLoading(false); }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchTeams(), fetchStats()]);
      setLoading(false);
    })();
  }, [fetchTeams, fetchStats]);

  useEffect(() => {
    if (activeTab === 'routing' && rules.length === 0) fetchRules();
  }, [activeTab, rules.length, fetchRules]);

  const allMembers: (TeamMemberData & { teamName: string })[] = (Array.isArray(teams) ? teams : []).flatMap((t) =>
    t.members.map((m) => ({ ...m, teamName: t.name })),
  );

  const filteredMembers = allMembers.filter((m) => {
    if (memberTeamFilter && m.teamId !== memberTeamFilter) return false;
    if (memberRoleFilter && m.user.role !== memberRoleFilter) return false;
    if (memberSearch) {
      const q = memberSearch.toLowerCase();
      return (
        m.user.firstName.toLowerCase().includes(q) ||
        m.user.lastName.toLowerCase().includes(q) ||
        m.user.email.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleToggleRule = async (rule: RoutingRule) => {
    try {
      const res = await fetch(`/api/teams/routing-rules/${rule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !rule.isActive }),
      });
      const data = await res.json();
      if (data.success) setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, isActive: !r.isActive } : r)));
    } catch {}
  };

  const handleDeleteRule = async () => {
    if (!deleteRuleId) return;
    setDeletingRule(true);
    try {
      const res = await fetch(`/api/teams/routing-rules/${deleteRuleId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) { setRules((prev) => prev.filter((r) => r.id !== deleteRuleId)); setDeleteRuleId(null); }
    } catch {}
    finally { setDeletingRule(false); }
  };

  const statsCards = stats ? [
    { label: 'Equipes actives', value: stats.totalTeams, icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Gestionnaires', value: stats.totalManagers, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
    {
      label: 'Charge moyenne', value: `${stats.avgWorkloadPercent}%`, icon: Activity,
      color: stats.avgWorkloadPercent > 90 ? 'text-red-600' : stats.avgWorkloadPercent > 70 ? 'text-yellow-600' : 'text-green-600',
      bg: stats.avgWorkloadPercent > 90 ? 'bg-red-50' : stats.avgWorkloadPercent > 70 ? 'bg-yellow-50' : 'bg-green-50',
    },
    {
      label: 'Dossiers non assignes', value: stats.unassignedClaims, icon: AlertTriangle,
      color: stats.unassignedClaims > 0 ? 'text-yellow-600' : 'text-green-600',
      bg: stats.unassignedClaims > 0 ? 'bg-yellow-50' : 'bg-green-50',
    },
  ] : [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des equipes</h1>
          <p className="text-sm text-gray-500 mt-0.5">Organisez les gestionnaires en equipes et configurez les regles</p>
        </div>
        <div className="flex items-center space-x-3">
          <button onClick={() => { fetchTeams(); fetchStats(); }} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500">
            <RefreshCw className="w-4 h-4" />
          </button>
          {activeTab === 'teams' && (
            <button onClick={() => setShowCreateTeam(true)} className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
              <Plus className="w-4 h-4" /><span>Creer une equipe</span>
            </button>
          )}
          {activeTab === 'routing' && (
            <button onClick={() => setEditingRule(null)} className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium">
              <Plus className="w-4 h-4" /><span>Ajouter une regle</span>
            </button>
          )}
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statsCards.map((card) => (
            <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center space-x-3">
              <div className={`p-2.5 rounded-lg ${card.bg}`}><card.icon className={`w-5 h-5 ${card.color}`} /></div>
              <div><p className="text-xs text-gray-500">{card.label}</p><p className={`text-xl font-bold ${card.color}`}>{card.value}</p></div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200">
          {TABS.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
              <tab.icon className="w-4 h-4" /><span>{tab.label}</span>
              {tab.id === 'teams' && teams.length > 0 && <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-600 text-white rounded-full">{teams.length}</span>}
              {tab.id === 'members' && allMembers.length > 0 && <span className="ml-1 px-1.5 py-0.5 text-xs bg-gray-500 text-white rounded-full">{allMembers.length}</span>}
            </button>
          ))}
        </div>

        <div className="p-5">
          {activeTab === 'teams' && (
            <>
              {loading ? (
                <div className="flex items-center justify-center py-16"><RefreshCw className="w-8 h-8 text-blue-500 animate-spin" /></div>
              ) : teams.length === 0 ? (
                <div className="text-center py-16">
                  <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-lg font-medium text-gray-500">Aucune equipe creee</p>
                  <p className="text-sm text-gray-400 mb-5">Creez votre premiere equipe pour organiser les gestionnaires</p>
                  <button onClick={() => setShowCreateTeam(true)} className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                    <Plus className="w-4 h-4" /><span>Creer une equipe</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {teams.map((team) => (
                    <TeamCard key={team.id} team={team} onManage={(t) => setManagingTeam({ team: t, readOnly: false })} onView={(t) => setManagingTeam({ team: t, readOnly: true })}
                      onAddMember={() => setShowAddMember({ teamId: team.id, teamName: team.name })}
                      onRebalance={() => setRebalancingTeam({ id: team.id, name: team.name })}
                      onRefresh={fetchTeams} />
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'members' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-48">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Rechercher un membre..." className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <select value={memberTeamFilter} onChange={(e) => setMemberTeamFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="">Toutes les equipes</option>
                    {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  <select value={memberRoleFilter} onChange={(e) => setMemberRoleFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="">Tous les roles</option>
                    <option value="MANAGER_SENIOR">Manager Senior</option>
                    <option value="MANAGER_JUNIOR">Manager Junior</option>
                    <option value="EXPERT">Expert</option>
                  </select>
                </div>
              </div>
              {filteredMembers.length === 0 ? (
                <div className="text-center py-12"><Users className="w-10 h-10 text-gray-300 mx-auto mb-2" /><p className="text-gray-500">Aucun membre trouve</p></div>
              ) : (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Membre</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Role</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Equipe</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Charge</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Statut</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredMembers.map((m) => (
                        <MemberRow key={`${m.teamId}-${m.userId}`} member={m} teamName={m.teamName} onChangeTeam={() => {}} onEditLimit={() => {}} onViewClaims={() => {}} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'routing' && (
            <div className="space-y-4">
              {rulesLoading ? (
                <div className="flex items-center justify-center py-16"><RefreshCw className="w-7 h-7 text-purple-500 animate-spin" /></div>
              ) : rules.length === 0 ? (
                <div className="text-center py-16">
                  <Settings className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-lg font-medium text-gray-500">Aucune regle configuree</p>
                  <p className="text-sm text-gray-400 mb-5">Les regles permettent d acheminer automatiquement les sinistres</p>
                  <button onClick={() => setEditingRule(null)} className="inline-flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium">
                    <Plus className="w-4 h-4" /><span>Ajouter une regle</span>
                  </button>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide w-8">Prio</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Conditions</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Equipe cible</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Role cible</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">Actif</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(Array.isArray(rules) ? rules : []).sort((a, b) => a.priority - b.priority).map((rule) => (
                        <tr key={rule.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3"><span className="inline-flex items-center justify-center w-7 h-7 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">{rule.priority}</span></td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1.5">
                              {rule.claimType && <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${CLAIM_TYPE_COLORS[rule.claimType] ?? 'bg-gray-100 text-gray-700'}`}>{CLAIM_TYPE_LABELS[rule.claimType] ?? rule.claimType}</span>}
                              {(rule.minRiskScore != null || rule.maxRiskScore != null) && <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-orange-100 text-orange-700">Score: {rule.minRiskScore ?? '-'}-{rule.maxRiskScore ?? '-'}</span>}
                              {rule.minAmount != null && <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">min {Number(rule.minAmount).toLocaleString('fr-MA')} MAD</span>}
                              {!rule.claimType && rule.minRiskScore == null && rule.minAmount == null && <span className="text-xs text-gray-400 italic">Toutes les conditions</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{rule.targetTeam?.name ?? '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{rule.targetRole ? (ROLE_LABELS[rule.targetRole] ?? rule.targetRole) : 'Tout role'}</td>
                          <td className="px-4 py-3 text-center">
                            <button onClick={() => handleToggleRule(rule)} className="text-gray-400 hover:text-gray-600">
                              {rule.isActive ? <ToggleRight className="w-6 h-6 text-purple-600" /> : <ToggleLeft className="w-6 h-6 text-gray-300" />}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end space-x-1">
                              <button onClick={() => setEditingRule(rule)} className="p-1.5 rounded-lg hover:bg-purple-100 text-gray-400 hover:text-purple-600"><Edit2 className="w-4 h-4" /></button>
                              <button onClick={() => setDeleteRuleId(rule.id)} className="p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="space-y-5">
              <div className="flex items-center space-x-2">
                {([{ id: 'week', label: 'Cette semaine' }, { id: 'month', label: 'Ce mois' }, { id: 'quarter', label: 'Ce trimestre' }] as const).map((p) => (
                  <button key={p.id} onClick={() => setPerfPeriod(p.id)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg border ${perfPeriod === p.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-300'}`}>
                    {p.label}
                  </button>
                ))}
              </div>
              {loading ? (
                <div className="flex justify-center py-16"><RefreshCw className="w-7 h-7 text-blue-500 animate-spin" /></div>
              ) : teams.length === 0 ? (
                <div className="text-center py-12"><TrendingUp className="w-10 h-10 text-gray-300 mx-auto mb-2" /><p className="text-gray-500">Aucune donnee disponible</p></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {teams.map((team) => {
                    const wp = team.stats.workloadPercent;
                    return (
                      <div key={team.id} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-900">{team.name}</h3>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {team.claimTypes.map((ct) => <span key={ct} className={`px-1.5 py-0.5 text-xs rounded-full ${CLAIM_TYPE_COLORS[ct] ?? 'bg-gray-100 text-gray-600'}`}>{CLAIM_TYPE_LABELS[ct] ?? ct}</span>)}
                            </div>
                          </div>
                          <span className={`text-sm font-bold ${wp > 90 ? 'text-red-600' : wp > 70 ? 'text-yellow-600' : 'text-green-600'}`}>{wp}% charge</span>
                        </div>
                        <WorkloadBar current={team.stats.totalCurrent} max={team.stats.totalMax || 1} size="md" />
                        <div className="grid grid-cols-3 gap-3">
                          <div className="text-center p-2 bg-blue-50 rounded-lg"><p className="text-lg font-bold text-blue-700">{team.stats.memberCount}</p><p className="text-xs text-blue-600">Membres</p></div>
                          <div className="text-center p-2 bg-green-50 rounded-lg"><p className="text-lg font-bold text-green-700">{team.stats.totalCurrent}</p><p className="text-xs text-green-600">Dossiers actifs</p></div>
                          <div className="text-center p-2 bg-purple-50 rounded-lg"><p className="text-lg font-bold text-purple-700">{team.stats.activeRoutingRules}</p><p className="text-xs text-purple-600">Regles actives</p></div>
                        </div>
                        {team.members.length > 0 && (
                          <div className="space-y-2 pt-1 border-t border-gray-100">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Repartition par membre</p>
                            {team.members.map((m) => (
                              <div key={m.id} className="flex items-center space-x-2">
                                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                  <span className="text-xs font-medium text-blue-700">{m.user.firstName[0]}{m.user.lastName[0]}</span>
                                </div>
                                <span className="text-xs text-gray-600 w-28 truncate">{m.user.firstName} {m.user.lastName}</span>
                                <div className="flex-1"><WorkloadBar current={m.user.currentWorkload} max={m.maxClaims} size="sm" showText={false} /></div>
                                <span className="text-xs tabular-nums text-gray-500 w-12 text-right">{m.user.currentWorkload}/{m.maxClaims}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {deleteRuleId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setDeleteRuleId(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-100 rounded-lg"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
              <h3 className="font-semibold text-gray-900">Supprimer la regle ?</h3>
            </div>
            <p className="text-sm text-gray-600">Cette action est irreversible.</p>
            <div className="flex justify-end space-x-3 pt-2">
              <button onClick={() => setDeleteRuleId(null)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Annuler</button>
              <button onClick={handleDeleteRule} disabled={deletingRule} className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50">
                {deletingRule ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateTeam && <CreateTeamModal onClose={() => setShowCreateTeam(false)} onCreated={() => { fetchTeams(); fetchStats(); }} />}
      {managingTeam && (
        <TeamManageDrawer
          team={managingTeam.team}
          readOnly={managingTeam.readOnly}
          onClose={() => setManagingTeam(null)}
          onUpdated={() => { fetchTeams(); fetchStats(); }}
          onAddMember={() => { setManagingTeam(null); setShowAddMember({ teamId: managingTeam.team.id, teamName: managingTeam.team.name }); }}
        />
      )}
      {showAddMember && <AddMemberModal teamId={showAddMember.teamId} teamName={showAddMember.teamName} onClose={() => setShowAddMember(null)} onAdded={() => { fetchTeams(); fetchStats(); }} />}
      {editingRule !== undefined && <EditRoutingRuleModal rule={editingRule} teams={teams} onClose={() => setEditingRule(undefined)} onSaved={() => fetchRules()} />}
      {rebalancingTeam && <RebalanceConfirmModal teamId={rebalancingTeam.id} teamName={rebalancingTeam.name} onClose={() => setRebalancingTeam(null)} onDone={() => { fetchTeams(); fetchStats(); }} />}
    </div>
  );
}

