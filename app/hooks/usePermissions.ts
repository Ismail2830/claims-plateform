'use client';

import { useMemo } from 'react';
import { useAdminAuth } from './useAdminAuth';
import { can, canAny, canAll } from '@/lib/permissions';
import type { UserRole } from '@/lib/permissions';

export function usePermissions() {
  const { user } = useAdminAuth();
  const role = user?.role as UserRole | undefined;

  return useMemo(
    () => ({
      role,
      /** True when user has ALL listed permissions. */
      can:    (permission: string)     => !!role && can(role, permission),
      /** True when user has AT LEAST ONE of the listed permissions. */
      canAny: (permissions: string[]) => !!role && canAny(role, permissions),
      /** True when user has ALL of the listed permissions. */
      canAll: (permissions: string[]) => !!role && canAll(role, permissions),
    }),
    [role]
  );
}
