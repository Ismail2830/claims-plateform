'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { NAV_CONFIG } from '@/constants/nav-config';
import { ROLE_LABELS } from '@/lib/permissions';
import type { UserRole } from '@/lib/permissions';
import { useUnreadCount } from '@/app/hooks/useUnreadCount';

interface RoleBasedSidebarProps {
  role: UserRole;
  user: {
    firstName: string;
    lastName: string;
    role: string;
  } | null;
  onLogout: () => void;
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function getRootHref(role: UserRole): string {
  const roots: Record<string, string> = {
    EXPERT:          '/dashboard/expert',
    MANAGER_JUNIOR:  '/dashboard/manager-junior',
    MANAGER_SENIOR:  '/dashboard/manager-senior',
    ADMIN:           '/dashboard/admin',
    SUPER_ADMIN:     '/dashboard/super-admin',
    CLIENT:          '/dashboard/client',
  };
  return roots[role] ?? '/dashboard';
}

export default function RoleBasedSidebar({ role, user, onLogout }: RoleBasedSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const { totalUnread } = useUnreadCount();

  useEffect(() => {
    const stored = localStorage.getItem('sidebar_collapsed');
    if (stored !== null) setCollapsed(stored === 'true');
  }, []);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('sidebar_collapsed', String(next));
  }

  const rootHref = getRootHref(role);
  const groups = NAV_CONFIG[role] ?? [];

  function isActive(href: string): boolean {
    if (href === rootHref) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <TooltipProvider delayDuration={100}>
      <aside
        className={cn(
          'flex flex-col h-screen sticky top-0 bg-white border-r border-gray-200 transition-all duration-300 shrink-0 z-40',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo area */}
        <div className="flex items-center justify-between px-3 py-4 border-b border-gray-200 h-16">
          {!collapsed && (
            <Link href={rootHref} className="flex items-center gap-2 min-w-0">
              <Shield className="w-7 h-7 text-blue-600 shrink-0" />
              <span className="font-bold text-gray-900 text-sm truncate">ISM Assurance</span>
            </Link>
          )}
          {collapsed && (
            <Link href={rootHref} className="mx-auto">
              <Shield className="w-7 h-7 text-blue-600" />
            </Link>
          )}
          <button
            onClick={toggleCollapsed}
            className={cn(
              'rounded-md p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0',
              collapsed && 'mx-auto'
            )}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Scrollable nav */}
        <nav className="flex-1 overflow-y-auto py-3 space-y-1">
          {groups.map((group, groupIndex) => (
            <div key={groupIndex} className={groupIndex > 0 ? 'pt-2' : ''}>
              {group.title && !collapsed && (
                <p className="px-3 mb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {group.title}
                </p>
              )}
              {group.title && collapsed && (
                <div className="px-3 mb-1">
                  <div className="h-px bg-gray-100" />
                </div>
              )}
              {group.items.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                // Inject live unread count into the Messages nav item badge
                const isMessages = item.href.endsWith('/messages');
                const badge = isMessages ? totalUnread : item.badge;
                const navItem = (
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors mx-2',
                      active
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    )}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    {!collapsed && <span className="truncate flex-1">{item.label}</span>}
                    {!collapsed && badge !== undefined && badge > 0 && (
                      <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white font-bold">
                        {badge > 99 ? '99+' : badge}
                      </span>
                    )}
                    {collapsed && badge !== undefined && badge > 0 && (
                      <span className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white font-bold">
                        {badge > 9 ? '9+' : badge}
                      </span>
                    )}
                  </Link>
                );

                if (collapsed) {
                  return (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>
                        <div className="relative">{navItem}</div>
                      </TooltipTrigger>
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    </Tooltip>
                  );
                }

                return <div key={item.href}>{navItem}</div>;
              })}
            </div>
          ))}
        </nav>

        {/* Bottom user area */}
        <div className="border-t border-gray-200 p-3">
          {user ? (
            collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={onLogout}
                    className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors"
                  >
                    {getInitials(user.firstName, user.lastName)}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {user.firstName} {user.lastName} — Se déconnecter
                </TooltipContent>
              </Tooltip>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-bold">
                  {getInitials(user.firstName, user.lastName)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-gray-400 truncate uppercase">
                    {ROLE_LABELS[role as UserRole] ?? role}
                  </p>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={onLogout}
                      className="shrink-0 rounded-md p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      aria-label="Se déconnecter"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Se déconnecter</TooltipContent>
                </Tooltip>
              </div>
            )
          ) : null}
        </div>
      </aside>
    </TooltipProvider>
  );
}
