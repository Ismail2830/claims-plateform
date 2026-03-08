'use client';

/**
 * ClientLayout — wraps RoleBasedLayout for client-facing pages.
 * Bridges useSimpleAuth (Client model) with the admin-style RoleBasedLayout
 * which expects { firstName, lastName, role }.
 */
import React from 'react';
import { useRouter } from 'next/navigation';
import RoleBasedLayout from '@/components/layout/RoleBasedLayout';
import { useSimpleAuth } from '@/app/hooks/useSimpleAuth';

interface Props {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: Props) {
  const { user, isLoading, logout } = useSimpleAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/auth/login');
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) return null;

  const layoutUser = {
    firstName: user.firstName,
    lastName:  user.lastName,
    role:      'CLIENT',
  };

  return (
    <RoleBasedLayout role="CLIENT" user={layoutUser} onLogout={logout}>
      {children}
    </RoleBasedLayout>
  );
}
