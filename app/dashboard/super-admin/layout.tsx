'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/app/hooks/useAdminAuth';
import SuperAdminLayout from '@/components/layout/SuperAdminLayout';

export default function SuperAdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, logout } = useAdminAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!isLoading && user && user.role !== 'SUPER_ADMIN') {
      router.replace('/unauthorized');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!user || user.role !== 'SUPER_ADMIN') {
    return null;
  }

  return (
    <SuperAdminLayout
      user={user}
      onLogout={logout}
    >
      {children}
    </SuperAdminLayout>
  );
}
