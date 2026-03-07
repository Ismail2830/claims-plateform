'use client';

import { Users, Settings, AlertTriangle, Eye, CheckCircle, UserPlus, Shuffle } from 'lucide-react';
import { WorkloadBar } from './WorkloadBar';
import type { TeamWithStats } from '../types';
import { CLAIM_TYPE_LABELS, CLAIM_TYPE_COLORS } from '../types';

interface TeamCardProps {
  team: TeamWithStats;
  onManage: (team: TeamWithStats) => void;
  onView?: (team: TeamWithStats) => void;
  onViewClaims?: (team: TeamWithStats) => void;
  onAddMember?: (team: TeamWithStats) => void;
  onRebalance?: (team: TeamWithStats) => void;
  onRefresh?: () => void;
}

// Deterministic card accent color from team name
const CARD_ACCENTS = [
  'from-blue-500 to-blue-600',
  'from-indigo-500 to-indigo-600',
  'from-violet-500 to-violet-600',
  'from-teal-500 to-teal-600',
  'from-emerald-500 to-emerald-600',
  'from-orange-500 to-orange-600',
];

function accentForName(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % CARD_ACCENTS.length;
  return CARD_ACCENTS[h];
}

export function TeamCard({ team, onManage, onView, onViewClaims, onAddMember, onRebalance }: TeamCardProps) {
  const { stats } = team;
  const accent = accentForName(team.name);
  const isOverloaded = stats.workloadPercent > 80;

  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden transition-shadow hover:shadow-md ${!team.isActive ? 'opacity-60' : ''}`}>
      {/* Colored top bar */}
      <div className={`h-1.5 bg-linear-to-r ${accent}`} />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-xl bg-linear-to-br ${accent} flex items-center justify-center shrink-0`}>
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 leading-tight">{team.name}</h3>
              {team.description && (
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{team.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-1.5">
            {isOverloaded && (
              <span className="flex items-center space-x-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                <AlertTriangle className="w-3 h-3" />
                <span>Surchargé</span>
              </span>
            )}
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
              team.isActive
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600'
            }`}>
              {team.isActive ? 'Actif' : 'Inactif'}
            </span>
          </div>
        </div>

        {/* Claim type badges */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {team.claimTypes.map((ct) => (
            <span
              key={ct}
              className={`px-2 py-0.5 text-xs font-medium rounded-md ${CLAIM_TYPE_COLORS[ct] ?? 'bg-gray-100 text-gray-700'}`}
            >
              {CLAIM_TYPE_LABELS[ct] ?? ct}
            </span>
          ))}
        </div>

        {/* Lead */}
        <div className="mb-4">
          {team.lead ? (
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-linear-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {team.lead.firstName.charAt(0)}{team.lead.lastName.charAt(0)}
              </div>
              <div>
                <p className="text-xs font-medium text-gray-800">
                  {team.lead.firstName} {team.lead.lastName}
                </p>
                <p className="text-xs text-gray-400">Chef d&apos;équipe</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">Aucun chef d&apos;équipe désigné</p>
          )}
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
          <span className="flex items-center space-x-1">
            <Users className="w-3.5 h-3.5" />
            <span>{stats.memberCount} membre{stats.memberCount !== 1 ? 's' : ''}</span>
          </span>
          <span className="flex items-center space-x-1">
            <CheckCircle className="w-3.5 h-3.5 text-blue-400" />
            <span>{stats.activeRoutingRules} règle{stats.activeRoutingRules !== 1 ? 's' : ''}</span>
          </span>
        </div>

        {/* Workload bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">Charge de l&apos;équipe</span>
            <span className={`text-xs font-semibold tabular-nums ${
              stats.workloadPercent > 90 ? 'text-red-600' :
              stats.workloadPercent > 70 ? 'text-yellow-600' :
              'text-green-600'
            }`}>
              {stats.workloadPercent}%
            </span>
          </div>
          <WorkloadBar
            current={stats.totalCurrent}
            max={stats.totalMax}
            size="md"
          />
          <p className="text-xs text-gray-400 mt-1 tabular-nums">
            {stats.totalCurrent} / {stats.totalMax} dossiers
          </p>
        </div>

        {/* Actions */}
        <div className="flex space-x-2">
          <button
            onClick={() => onManage(team)}
            className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Gérer l&apos;équipe</span>
          </button>
          {onAddMember && (
            <button
              onClick={() => onAddMember(team)}
              className="flex items-center justify-center px-3 py-2 bg-green-100 text-green-700 text-xs font-medium rounded-lg hover:bg-green-200 transition-colors"
              title="Ajouter un membre"
            >
              <UserPlus className="w-3.5 h-3.5" />
            </button>
          )}
          {onRebalance && (
            <button
              onClick={() => onRebalance(team)}
              className="flex items-center justify-center px-3 py-2 bg-orange-100 text-orange-700 text-xs font-medium rounded-lg hover:bg-orange-200 transition-colors"
              title="Rééquilibrer la charge"
            >
              <Shuffle className="w-3.5 h-3.5" />
            </button>
          )}
          {(onView || onViewClaims) && (
            <button
              onClick={() => { (onView ?? onViewClaims)?.(team); }}
              className="flex items-center justify-center px-3 py-2 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors"
              title="Voir"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
