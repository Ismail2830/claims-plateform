// Shared types for the Teams feature

export type TeamRole = 'LEAD' | 'MEMBER';

export interface TeamMemberUser {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  currentWorkload: number;
  maxWorkload: number;
  isActive: boolean;
  lastLogin?: string | null;
}

export interface TeamMemberData {
  id: string;
  teamId: string;
  userId: string;
  role: TeamRole;
  maxClaims: number;
  joinedAt: string;
  user: TeamMemberUser;
}

export interface TeamStats {
  memberCount: number;
  totalCurrent: number;
  totalMax: number;
  workloadPercent: number;
  activeRoutingRules: number;
}

export interface TeamLead {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface TeamWithStats {
  id: string;
  name: string;
  description: string | null;
  claimTypes: string[];
  maxWorkload: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  members: TeamMemberData[];
  stats: TeamStats;
  lead: TeamLead | null;
}

export interface RoutingRule {
  id: string;
  claimType: string | null;
  minRiskScore: number | null;
  maxRiskScore: number | null;
  minAmount: string | null;
  targetTeamId: string;
  targetRole: string | null;
  priority: number;
  isActive: boolean;
  createdAt: string;
  targetTeam: { id: string; name: string; claimTypes: string[] };
}

export interface TeamsStats {
  totalTeams: number;
  totalManagers: number;
  avgWorkloadPercent: number;
  avgSlaCompliance: number;
  overloadedManagers: TeamMemberUser[];
  unassignedClaims: number;
}

export interface BalancePreview {
  redistributed: number;
  members: { name: string; before: number; after: number; maxClaims?: number }[];
}

export const CLAIM_TYPE_LABELS: Record<string, string> = {
  AUTO: 'Auto',
  HOME: 'Habitation',
  HEALTH: 'Santé',
  LIFE: 'Vie',
  CONSTRUCTION: 'Construction',
  ACCIDENT: 'Accident',
  THEFT: 'Vol',
  FIRE: 'Incendie',
  WATER_DAMAGE: 'Dégât des eaux',
};

export const CLAIM_TYPE_COLORS: Record<string, string> = {
  AUTO:         'bg-blue-100 text-blue-800',
  HOME:         'bg-green-100 text-green-800',
  HEALTH:       'bg-rose-100 text-rose-800',
  LIFE:         'bg-purple-100 text-purple-800',
  CONSTRUCTION: 'bg-orange-100 text-orange-800',
  ACCIDENT:     'bg-yellow-100 text-yellow-800',
  THEFT:        'bg-gray-100 text-gray-800',
  FIRE:         'bg-red-100 text-red-800',
  WATER_DAMAGE: 'bg-cyan-100 text-cyan-800',
};

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN:    'Super Admin',
  MANAGER_SENIOR: 'Manager Senior',
  MANAGER_JUNIOR: 'Manager Junior',
  EXPERT:         'Expert',
  LEAD:           'Chef d\'équipe',
  MEMBER:         'Membre',
};
