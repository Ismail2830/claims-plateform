import {
  LayoutDashboard,
  Users,
  UserCheck,
  Building2,
  Shield,
  FileText,
  Brain,
  FolderOpen,
  BarChart3,
  FileBarChart,
  Sparkles,
  Bell,
  MessageCircle,
  Mail,
  Settings,
  Lock,
  Activity,
  Wallet,
  HelpCircle,
  ScrollText,
  type LucideIcon,
} from 'lucide-react';

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

export const SUPER_ADMIN_NAV: NavGroup[] = [
  {
    items: [
      {
        label: 'Vue d\'ensemble',
        href: '/dashboard/super-admin',
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: 'UTILISATEURS',
    items: [
      {
        label: 'Utilisateurs',
        href: '/dashboard/super-admin/users',
        icon: Users,
      },
      {
        label: 'Clients',
        href: '/dashboard/super-admin/clients',
        icon: UserCheck,
      },
      {
        label: 'Équipes',
        href: '/dashboard/super-admin/teams',
        icon: Building2,
      },
    ],
  },
  {
    title: 'DOSSIERS',
    items: [
      {
        label: 'Polices',
        href: '/dashboard/super-admin/policies',
        icon: Shield,
      },
      {
        label: 'Sinistres',
        href: '/dashboard/super-admin/claims',
        icon: FileText,
      },
      {
        label: 'Scoring IA',
        href: '/dashboard/super-admin/ai-scoring',
        icon: Brain,
      },
      {
        label: 'Documents',
        href: '/dashboard/super-admin/documents',
        icon: FolderOpen,
      },
    ],
  },
  {
    title: 'ANALYTICS',
    items: [
      {
        label: 'Dashboards',
        href: '/dashboard/super-admin/analytics',
        icon: BarChart3,
      },
      {
        label: 'Rapports',
        href: '/dashboard/super-admin/reports',
        icon: FileBarChart,
      },
      {
        label: 'Prédictions IA',
        href: '/dashboard/super-admin/predictions',
        icon: Sparkles,
      },
    ],
  },
  {
    title: 'SYSTÈME',
    items: [
      {
        label: 'Configuration',
        href: '/dashboard/super-admin/settings',
        icon: Settings,
      },
      {
        label: 'Sécurité & Audit',
        href: '/dashboard/super-admin/security',
        icon: Lock,
      },
      {
        label: 'Monitoring',
        href: '/dashboard/super-admin/monitoring',
        icon: Activity,
      },
      {
        label: 'Finances & Primes',
        href: '/dashboard/super-admin/finances',
        icon: Wallet,
      },
    ],
  },
];

export const SUPER_ADMIN_NAV_BOTTOM: NavGroup = {
  items: [
    {
      label: 'Aide & Support',
      href: '/dashboard/super-admin/support',
      icon: HelpCircle,
    },
    {
      label: 'Changelog',
      href: '/dashboard/super-admin/changelog',
      icon: ScrollText,
    },
  ],
};
