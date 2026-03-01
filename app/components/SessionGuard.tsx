'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import IdleWarningModal from './IdleWarningModal';

/**
 * Rendered globally in the root layout.
 * Shows the idle warning modal and handles logout across both client and admin sessions.
 */
export default function SessionGuard() {
  const router = useRouter();

  const handleLogout = useCallback(async () => {
    const isAdmin  = !!localStorage.getItem('adminToken');
    const isClient = !!localStorage.getItem('clientToken');

    if (isAdmin) {
      try { await fetch('/api/admin/logout', { method: 'POST' }); } catch {}
      localStorage.removeItem('adminToken');
      router.push('/auth/admin?reason=idle_timeout');
    } else if (isClient) {
      try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
      localStorage.removeItem('clientToken');
      router.push('/auth/login?reason=idle_timeout');
    }
  }, [router]);

  return <IdleWarningModal onLogout={handleLogout} />;
}
