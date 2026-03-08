import {
  LayoutDashboard,
  FileText,
  ClipboardCheck,
  FolderOpen,
  MessageCircle,
  Bell,
  Users,
  BarChart3,
  Briefcase,
  Shield,
  Brain,
  FileBarChart,
  Sparkles,
  Building2,
  UserCheck,
  Mail,
  Lock,
  Wallet,
  CheckSquare,
  TrendingUp,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react';
import type { UserRole } from '@/lib/permissions';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
}

export interface NavGroup {
  title?: string;
  items: NavItem[];
}

// ─── Expert ───────────────────────────────────────────────────────────────────

const EXPERT_NAV: NavGroup[] = [
  {
    items: [
      { label: "Vue d'ensemble",      href: '/dashboard/expert',             icon: LayoutDashboard },
    ],
  },
  {
    title: 'DOSSIERS',
    items: [
      { label: 'Dossiers assignés',   href: '/dashboard/expert/claims',      icon: FileText },
      { label: 'Évaluations',         href: '/dashboard/expert/assessments', icon: ClipboardCheck },
      { label: 'Documents à vérifier', href: '/dashboard/expert/documents',   icon: FolderOpen },
    ],
  },
  {
    title: 'COMMUNICATION',
    items: [
      { label: 'Messages',            href: '/dashboard/expert/messages',    icon: MessageCircle },
      { label: 'Notifications',       href: '/dashboard/expert/notifications', icon: Bell },
    ],
  },
];

// ─── Manager Junior ───────────────────────────────────────────────────────────

const MANAGER_JUNIOR_NAV: NavGroup[] = [
  {
    items: [
      { label: "Vue d'ensemble",     href: '/dashboard/manager-junior',                    icon: LayoutDashboard },
    ],
  },
  {
    title: 'ÉQUIPE',
    items: [
      { label: 'Experts',            href: '/dashboard/manager-junior/team',               icon: Users },
      { label: 'Charge de travail',  href: '/dashboard/manager-junior/workload',           icon: BarChart3 },
      { label: 'Sinistres équipe',   href: '/dashboard/manager-junior/claims',             icon: FileText },
      { label: 'Approbations',       href: '/dashboard/manager-junior/approvals',          icon: CheckSquare },
    ],
  },
  {
    title: 'ANALYSE',
    items: [
      { label: 'Documents',          href: '/dashboard/manager-junior/documents',          icon: FolderOpen },
      { label: 'Performance équipe', href: '/dashboard/manager-junior/performance',        icon: TrendingUp },
    ],
  },
  {
    title: 'COMMUNICATION',
    items: [
      { label: 'Messages',           href: '/dashboard/manager-junior/messages',           icon: MessageCircle },
      { label: 'Notifications',      href: '/dashboard/manager-junior/notifications',      icon: Bell },
    ],
  },
];

// ─── Manager Senior ───────────────────────────────────────────────────────────

const MANAGER_SENIOR_NAV: NavGroup[] = [
  {
    items: [
      { label: "Vue d'ensemble",  href: '/dashboard/manager-senior',                      icon: LayoutDashboard },
    ],
  },
  {
    title: 'DOSSIERS',
    items: [
      { label: 'Polices',         href: '/dashboard/manager-senior/policies',             icon: Shield },
      { label: 'Sinistres',       href: '/dashboard/manager-senior/claims',               icon: FileText },
      { label: 'Documents',       href: '/dashboard/manager-senior/documents',            icon: FolderOpen },
    ],
  },
  {
    title: 'MANAGEMENT',
    items: [
      { label: 'Mon équipe',        href: '/dashboard/manager-senior/team',                icon: Users },
      { label: "File d'approbation", href: '/dashboard/manager-senior/approvals',          icon: CheckSquare },
      { label: 'Cas escaladés',     href: '/dashboard/manager-senior/escalated',          icon: AlertTriangle },
    ],
  },
  {
    title: 'ANALYTICS',
    items: [
      { label: 'Performance',    href: '/dashboard/manager-senior/performance',           icon: TrendingUp },
      { label: 'Rapports',       href: '/dashboard/manager-senior/reports',               icon: FileBarChart },
    ],
  },
  {
    title: 'COMMUNICATION',
    items: [
      { label: 'Messages',       href: '/dashboard/manager-senior/messages',              icon: MessageCircle },
      { label: 'Notifications',  href: '/dashboard/manager-senior/notifications',         icon: Bell },
    ],
  },
];

// ─── Admin ────────────────────────────────────────────────────────────────────

const ADMIN_NAV: NavGroup[] = [
  {
    items: [
      { label: "Vue d'ensemble",   href: '/dashboard/admin',                     icon: LayoutDashboard },
    ],
  },
  {
    title: 'UTILISATEURS',
    items: [
      { label: 'Utilisateurs',     href: '/dashboard/admin/users',               icon: Users },
      { label: 'Clients',          href: '/dashboard/admin/clients',             icon: UserCheck },
      { label: 'Équipes',          href: '/dashboard/admin/teams',               icon: Building2 },
    ],
  },
  {
    title: 'DOSSIERS',
    items: [
      { label: 'Polices',          href: '/dashboard/admin/policies',            icon: Shield },
      { label: 'Sinistres',        href: '/dashboard/admin/claims',              icon: FileText },
      { label: 'Scoring IA',       href: '/dashboard/admin/ai-scoring',          icon: Brain },
      { label: 'Documents',        href: '/dashboard/admin/documents',           icon: FolderOpen },
    ],
  },
  {
    title: 'ANALYTICS',
    items: [
      { label: 'Dashboards',       href: '/dashboard/admin/analytics',           icon: BarChart3 },
      { label: 'Rapports',         href: '/dashboard/admin/reports',             icon: FileBarChart },
      { label: 'Prédictions IA',   href: '/dashboard/admin/predictions',         icon: Sparkles },
    ],
  },
  {
    title: 'COMMUNICATION',
    items: [
      { label: 'Notifications',    href: '/dashboard/admin/notifications',       icon: Bell },
      { label: 'WhatsApp Bot',     href: '/dashboard/admin/whatsapp',            icon: MessageCircle },
      { label: 'Modèles emails',   href: '/dashboard/admin/email-templates',     icon: Mail },
    ],
  },
  {
    title: 'SYSTÈME',
    items: [
      { label: 'Sécurité & Audit', href: '/dashboard/admin/security',            icon: Lock },
      { label: 'Finances & Primes', href: '/dashboard/admin/finances',           icon: Wallet },
    ],
  },
];

// ─── Unified config ───────────────────────────────────────────────────────────

export const NAV_CONFIG: Partial<Record<UserRole, NavGroup[]>> = {
  EXPERT:          EXPERT_NAV,
  MANAGER_JUNIOR:  MANAGER_JUNIOR_NAV,
  MANAGER_SENIOR:  MANAGER_SENIOR_NAV,
  ADMIN:           ADMIN_NAV,
};

// ─── Segment → label dictionary (shared across all role layouts) ──────────────

export const SEGMENT_LABELS: Record<string, string> = {
  'super-admin':    'Super Admin',
  admin:            'Admin',
  expert:           'Expert',
  'manager-junior': 'Manager Junior',
  'manager-senior': 'Manager Senior',
  users:            'Utilisateurs',
  clients:          'Clients',
  teams:            'Équipes',
  policies:         'Polices',
  claims:           'Sinistres',
  'ai-scoring':     'Scoring IA',
  documents:        'Documents',
  analytics:        'Dashboards',
  reports:          'Rapports',
  predictions:      'Prédictions IA',
  notifications:    'Notifications',
  whatsapp:         'WhatsApp Bot',
  'email-templates': 'Modèles emails',
  settings:         'Configuration',
  security:         'Sécurité & Audit',
  monitoring:       'Monitoring',
  finances:         'Finances & Primes',
  support:          'Aide & Support',
  changelog:        'Changelog',
  assessments:      'Évaluations',
  messages:         'Messages',
  workload:         'Charge de travail',
  approvals:        'Approbations',
  escalated:        'Cas escaladés',
  performance:      'Performance équipe',
};
