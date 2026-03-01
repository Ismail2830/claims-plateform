'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const IDLE_TIMEOUT_MS    = 30 * 60 * 1000;  // 30 min idle → force logout
const REFRESH_INTERVAL_MS = 13 * 60 * 1000; // Refresh access token every 13 min

type SessionType = 'client' | 'admin';

interface UseSessionOptions {
  type: SessionType;
  /** Called after successful refresh so the caller can update its token state */
  onRefresh?: (newAccessToken: string) => void;
  /** Called on forced logout so the caller can clear its state */
  onExpired?: () => void;
}

export function useSession({ type, onRefresh, onExpired }: UseSessionOptions) {
  const router        = useRouter();
  const idleTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshTimer  = useRef<ReturnType<typeof setInterval> | null>(null);
  const isLoggedOut   = useRef(false);

  const refreshEndpoint = type === 'client' ? '/api/auth/refresh' : '/api/admin/refresh';
  const logoutEndpoint  = type === 'client' ? '/api/auth/logout'  : '/api/admin/logout';
  const loginPath       = type === 'client' ? '/auth/login'       : '/auth/admin';
  const tokenKey        = type === 'client' ? 'clientToken'       : 'adminToken';

  const forceLogout = useCallback(
    async (reason: 'idle_timeout' | 'session_expired') => {
      if (isLoggedOut.current) return;
      isLoggedOut.current = true;

      clearInterval(refreshTimer.current!);
      clearTimeout(idleTimer.current!);

      try {
        await fetch(logoutEndpoint, { method: 'POST' });
      } catch { /* best-effort */ }

      localStorage.removeItem(tokenKey);
      onExpired?.();
      router.push(`${loginPath}?reason=${reason}`);
    },
    [logoutEndpoint, loginPath, tokenKey, router, onExpired],
  );

  const silentRefresh = useCallback(async () => {
    if (isLoggedOut.current) return;

    try {
      const res = await fetch(refreshEndpoint, { method: 'POST' });
      if (!res.ok) {
        await forceLogout('session_expired');
        return;
      }
      const data = await res.json();
      if (data.accessToken) {
        localStorage.setItem(tokenKey, data.accessToken);
        onRefresh?.(data.accessToken);
      }
    } catch {
      await forceLogout('session_expired');
    }
  }, [refreshEndpoint, tokenKey, forceLogout, onRefresh]);

  const resetIdleTimer = useCallback(() => {
    if (isLoggedOut.current) return;
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => forceLogout('idle_timeout'), IDLE_TIMEOUT_MS);
  }, [forceLogout]);

  useEffect(() => {
    isLoggedOut.current = false;

    // Start auto-refresh interval
    refreshTimer.current = setInterval(silentRefresh, REFRESH_INTERVAL_MS);

    // User activity events reset the idle timer
    const events: (keyof WindowEventMap)[] = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, resetIdleTimer, { passive: true }));
    resetIdleTimer(); // start the countdown immediately

    return () => {
      clearInterval(refreshTimer.current!);
      clearTimeout(idleTimer.current!);
      events.forEach((e) => window.removeEventListener(e, resetIdleTimer));
    };
  }, [silentRefresh, resetIdleTimer]);

  return { forceLogout };
}
