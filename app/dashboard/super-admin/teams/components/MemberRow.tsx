'use client';

import { ArrowLeftRight, Edit, Eye } from 'lucide-react';
import { WorkloadBar } from './WorkloadBar';
import type { TeamMemberData } from '../types';
import { ROLE_LABELS } from '../types';

interface MemberRowProps {
  member: TeamMemberData;
  teamName?: string;
  onChangeTeam?: (member: TeamMemberData) => void;
  onEditLimit?: (member: TeamMemberData) => void;
  onViewClaims?: (member: TeamMemberData) => void;
}

const ROLE_BADGE: Record<string, string> = {
  LEAD:   'bg-purple-100 text-purple-800',
  MEMBER: 'bg-gray-100 text-gray-700',
};

const USER_ROLE_BADGE: Record<string, string> = {
  SUPER_ADMIN:    'bg-purple-100 text-purple-800',
  MANAGER_SENIOR: 'bg-indigo-100 text-indigo-800',
  MANAGER_JUNIOR: 'bg-blue-100 text-blue-800',
  EXPERT:         'bg-teal-100 text-teal-800',
};

export function MemberRow({ member, teamName, onChangeTeam, onEditLimit, onViewClaims }: MemberRowProps) {
  const { user } = member;
  const pct = user.maxWorkload > 0 ? Math.round((user.currentWorkload / user.maxWorkload) * 100) : 0;

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      {/* Avatar + name */}
      <td className="px-4 py-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {user.firstName.charAt(0)}{user.lastName.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{user.firstName} {user.lastName}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
        </div>
      </td>

      {/* User role */}
      <td className="px-4 py-3">
        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${USER_ROLE_BADGE[user.role] ?? 'bg-gray-100 text-gray-700'}`}>
          {ROLE_LABELS[user.role] ?? user.role}
        </span>
      </td>

      {/* Team role */}
      <td className="px-4 py-3">
        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${ROLE_BADGE[member.role]}`}>
          {ROLE_LABELS[member.role]}
        </span>
      </td>

      {/* Team */}
      {teamName !== undefined && (
        <td className="px-4 py-3 text-sm text-gray-700">{teamName}</td>
      )}

      {/* Workload */}
      <td className="px-4 py-3" style={{ minWidth: 140 }}>
        <WorkloadBar current={user.currentWorkload} max={member.maxClaims} showText size="sm" />
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
          user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {user.isActive ? 'Actif' : 'Inactif'}
        </span>
        {pct > 90 && (
          <span className="ml-1.5 text-xs text-red-600 font-medium">⚠</span>
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center space-x-1.5">
          {onChangeTeam && (
            <button
              onClick={() => onChangeTeam(member)}
              title="Changer d'équipe"
              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
            </button>
          )}
          {onEditLimit && (
            <button
              onClick={() => onEditLimit(member)}
              title="Modifier la limite"
              className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              <Edit className="w-3.5 h-3.5" />
            </button>
          )}
          {onViewClaims && (
            <button
              onClick={() => onViewClaims(member)}
              title="Voir les dossiers"
              className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
