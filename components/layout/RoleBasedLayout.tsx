'use client';

import React, { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Bell, Search, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import RoleBasedSidebar from '@/components/layout/RoleBasedSidebar';
import { NAV_CONFIG, SEGMENT_LABELS } from '@/constants/nav-config';
import type { UserRole } from '@/lib/permissions';

interface RoleBasedLayoutProps {
  children: React.ReactNode;
  role: UserRole;
  user: {
    firstName: string;
    lastName: string;
    role: string;
  } | null;
  onLogout: () => void;
  notificationCount?: number;
}

interface BreadcrumbSegment {
  label: string;
  href: string;
}

function buildBreadcrumbs(pathname: string): BreadcrumbSegment[] {
  const parts = pathname.split('/').filter(Boolean);
  const crumbs: BreadcrumbSegment[] = [];
  let accumulated = '';

  for (const part of parts) {
    accumulated += `/${part}`;
    const label = SEGMENT_LABELS[part] ?? part.charAt(0).toUpperCase() + part.slice(1);
    crumbs.push({ label, href: accumulated });
  }

  return crumbs;
}

function getPageTitle(pathname: string, role: UserRole): string {
  const groups = NAV_CONFIG[role] ?? [];
  const allItems = groups.flatMap((g) => g.items);
  const rootHrefs: Record<string, string> = {
    EXPERT:          '/dashboard/expert',
    MANAGER_JUNIOR:  '/dashboard/manager-junior',
    MANAGER_SENIOR:  '/dashboard/manager-senior',
    ADMIN:           '/dashboard/admin',
    SUPER_ADMIN:     '/dashboard/super-admin',
  };
  const rootHref = rootHrefs[role] ?? '/dashboard';

  const matched = allItems.find(
    (item) =>
      item.href === pathname ||
      (pathname.startsWith(`${item.href}/`) && item.href !== rootHref)
  );
  return matched?.label ?? "Vue d'ensemble";
}

function useCurrentDateTime(): string {
  const [dateTime, setDateTime] = React.useState<string>('');

  React.useEffect(() => {
    function format(): string {
      return new Intl.DateTimeFormat('fr-MA', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date());
    }

    setDateTime(format());
    const id = setInterval(() => setDateTime(format()), 60_000);
    return () => clearInterval(id);
  }, []);

  return dateTime;
}

export default function RoleBasedLayout({
  children,
  role,
  user,
  onLogout,
  notificationCount = 0,
}: RoleBasedLayoutProps) {
  const pathname = usePathname();
  const pageTitle  = useMemo(() => getPageTitle(pathname, role), [pathname, role]);
  const breadcrumbs = useMemo(() => buildBreadcrumbs(pathname), [pathname]);
  const dateTime   = useCurrentDateTime();

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <RoleBasedSidebar role={role} user={user} onLogout={onLogout} />

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top header */}
        <header className="flex h-16 shrink-0 items-center gap-4 border-b border-gray-200 bg-white px-6">
          <h1 className="text-lg font-semibold text-gray-900 truncate flex-1">{pageTitle}</h1>

          {/* Search */}
          <div className="hidden md:flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 w-64">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="Recherche globale..."
              className="flex-1 bg-transparent text-sm text-gray-700 placeholder:text-gray-400 outline-none"
            />
          </div>

          {/* Date/time */}
          <span className="hidden lg:block text-xs text-gray-400 whitespace-nowrap capitalize">
            {dateTime}
          </span>

          {/* Notification bell */}
          <button
            className="relative rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {notificationCount > 0 && (
              <span
                className={cn(
                  'absolute -top-0.5 -right-0.5 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold',
                  notificationCount > 9 ? 'h-5 w-5 text-[10px]' : 'h-4 w-4'
                )}
              >
                {notificationCount > 99 ? '99+' : notificationCount}
              </span>
            )}
          </button>
        </header>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 border-b border-gray-100 bg-white px-6 py-2">
          {breadcrumbs.map((crumb, i) => (
            <React.Fragment key={crumb.href}>
              {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />}
              {i === breadcrumbs.length - 1 ? (
                <span className="text-xs font-medium text-gray-700">{crumb.label}</span>
              ) : (
                <Link
                  href={crumb.href}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {crumb.label}
                </Link>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
