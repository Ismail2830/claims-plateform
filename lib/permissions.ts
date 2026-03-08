// ─── Role type (mirrors Prisma enum) ─────────────────────────────────────────
export type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'MANAGER_SENIOR'
  | 'MANAGER_JUNIOR'
  | 'EXPERT'
  | 'CLIENT';

// ─── Permission map ───────────────────────────────────────────────────────────
export const PERMISSIONS: Record<string, UserRole[]> = {
  // Claims
  'claims.view.own':         ['EXPERT', 'MANAGER_JUNIOR', 'MANAGER_SENIOR', 'ADMIN', 'SUPER_ADMIN'],
  'claims.view.team':        ['MANAGER_JUNIOR', 'MANAGER_SENIOR', 'ADMIN', 'SUPER_ADMIN'],
  'claims.view.all':         ['ADMIN', 'SUPER_ADMIN'],
  'claims.create':           ['MANAGER_JUNIOR', 'MANAGER_SENIOR', 'ADMIN', 'SUPER_ADMIN'],
  'claims.assign':           ['MANAGER_JUNIOR', 'MANAGER_SENIOR', 'ADMIN', 'SUPER_ADMIN'],
  'claims.approve.small':    ['MANAGER_JUNIOR', 'MANAGER_SENIOR', 'ADMIN', 'SUPER_ADMIN'],
  'claims.approve.large':    ['MANAGER_SENIOR', 'ADMIN', 'SUPER_ADMIN'],
  'claims.final.decision':   ['MANAGER_SENIOR', 'ADMIN', 'SUPER_ADMIN'],
  'claims.escalate':         ['EXPERT', 'MANAGER_JUNIOR', 'MANAGER_SENIOR'],
  'claims.delete':           ['ADMIN', 'SUPER_ADMIN'],

  // Claim status transitions
  'claims.status.to_analyzing':       ['EXPERT', 'MANAGER_JUNIOR', 'MANAGER_SENIOR', 'ADMIN', 'SUPER_ADMIN'],
  'claims.status.to_docs_required':   ['EXPERT', 'MANAGER_JUNIOR', 'MANAGER_SENIOR', 'ADMIN', 'SUPER_ADMIN'],
  'claims.status.to_under_expertise': ['EXPERT', 'MANAGER_JUNIOR', 'MANAGER_SENIOR', 'ADMIN', 'SUPER_ADMIN'],
  'claims.status.to_in_decision':     ['EXPERT', 'MANAGER_JUNIOR', 'MANAGER_SENIOR', 'ADMIN', 'SUPER_ADMIN'],
  'claims.status.to_approved':        ['MANAGER_JUNIOR', 'MANAGER_SENIOR', 'ADMIN', 'SUPER_ADMIN'],
  'claims.status.to_rejected':        ['MANAGER_JUNIOR', 'MANAGER_SENIOR', 'ADMIN', 'SUPER_ADMIN'],
  'claims.status.to_paid':            ['ADMIN', 'SUPER_ADMIN'],

  // Documents
  'documents.view.own':  ['EXPERT', 'MANAGER_JUNIOR', 'MANAGER_SENIOR', 'ADMIN', 'SUPER_ADMIN'],
  'documents.verify':    ['EXPERT', 'MANAGER_JUNIOR', 'MANAGER_SENIOR', 'ADMIN', 'SUPER_ADMIN'],
  'documents.delete':    ['ADMIN', 'SUPER_ADMIN'],

  // Policies
  'policies.view':   ['MANAGER_SENIOR', 'ADMIN', 'SUPER_ADMIN'],
  'policies.create': ['MANAGER_SENIOR', 'ADMIN', 'SUPER_ADMIN'],
  'policies.modify': ['MANAGER_SENIOR', 'ADMIN', 'SUPER_ADMIN'],
  'policies.delete': ['ADMIN', 'SUPER_ADMIN'],

  // Users
  'users.view':           ['MANAGER_SENIOR', 'ADMIN', 'SUPER_ADMIN'],
  'users.create.expert':  ['MANAGER_SENIOR', 'ADMIN', 'SUPER_ADMIN'],
  'users.create.manager': ['ADMIN', 'SUPER_ADMIN'],
  'users.create.admin':   ['SUPER_ADMIN'],
  'users.delete':         ['SUPER_ADMIN'],

  // Teams
  'teams.view':   ['MANAGER_JUNIOR', 'MANAGER_SENIOR', 'ADMIN', 'SUPER_ADMIN'],
  'teams.manage': ['MANAGER_SENIOR', 'ADMIN', 'SUPER_ADMIN'],

  // Assessments (Expert-specific)
  'assessments.create': ['EXPERT', 'MANAGER_JUNIOR', 'MANAGER_SENIOR', 'ADMIN', 'SUPER_ADMIN'],
  'assessments.view':   ['EXPERT', 'MANAGER_JUNIOR', 'MANAGER_SENIOR', 'ADMIN', 'SUPER_ADMIN'],

  // Reports
  'reports.own':       ['EXPERT', 'MANAGER_JUNIOR', 'MANAGER_SENIOR'],
  'reports.team':      ['MANAGER_JUNIOR', 'MANAGER_SENIOR', 'ADMIN'],
  'reports.all':       ['ADMIN', 'SUPER_ADMIN'],
  'reports.acaps':     ['ADMIN', 'SUPER_ADMIN'],
  'reports.financial': ['ADMIN', 'SUPER_ADMIN'],

  // Analytics
  'analytics.own':  ['EXPERT'],
  'analytics.team': ['MANAGER_JUNIOR', 'MANAGER_SENIOR'],
  'analytics.all':  ['ADMIN', 'SUPER_ADMIN'],

  // AI Scoring
  'ai.view':     ['MANAGER_JUNIOR', 'MANAGER_SENIOR', 'ADMIN', 'SUPER_ADMIN'],
  'ai.override': ['MANAGER_SENIOR', 'ADMIN', 'SUPER_ADMIN'],

  // System
  'system.settings':   ['SUPER_ADMIN'],
  'system.monitoring': ['SUPER_ADMIN'],
  'audit.logs.view':   ['ADMIN', 'SUPER_ADMIN'],
  'audit.logs.delete': ['SUPER_ADMIN'],
  'finances.view':     ['ADMIN', 'SUPER_ADMIN'],
  'whatsapp.config':   ['ADMIN', 'SUPER_ADMIN'],
} as const;

// ─── Helper functions ─────────────────────────────────────────────────────────

export function can(role: UserRole, permission: string): boolean {
  const allowed = PERMISSIONS[permission];
  if (!allowed) return false;
  return (allowed as UserRole[]).includes(role);
}

export function canAny(role: UserRole, permissions: string[]): boolean {
  return permissions.some((p) => can(role, p));
}

export function canAll(role: UserRole, permissions: string[]): boolean {
  return permissions.every((p) => can(role, p));
}

// ─── Role → dashboard root ────────────────────────────────────────────────────
export const ROLE_DASHBOARD: Record<UserRole, string> = {
  SUPER_ADMIN:    '/dashboard/super-admin',
  ADMIN:          '/dashboard/admin',
  MANAGER_SENIOR: '/dashboard/manager-senior',
  MANAGER_JUNIOR: '/dashboard/manager-junior',
  EXPERT:         '/dashboard/expert',
  CLIENT:         '/dashboard/client',
};

// ─── Role display labels ─────────────────────────────────────────────────────
export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN:    'Super Admin',
  ADMIN:          'Admin',
  MANAGER_SENIOR: 'Manager Senior',
  MANAGER_JUNIOR: 'Manager Junior',
  EXPERT:         'Expert',
  CLIENT:         'Client',
};
