import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from './useSession';

interface Client {
  clientId: string;
  cin: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: string;
  city: string;
  province: string;
  postalCode?: string;
  status: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  documentVerified: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

interface ActivityLog {
  logId: string;
  entityType: string;
  action: string;
  description: string;
  createdAt: string;
  metadata?: any;
}

export function useSimpleAuth() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const handleSessionExpired = useCallback(() => {
    localStorage.removeItem('clientToken');
    setToken(null);
    setUser(null);
    setIsLoading(false);
  }, []);

  const handleTokenRefresh = useCallback((newToken: string) => {
    setToken(newToken);
    localStorage.setItem('clientToken', newToken);
  }, []);

  // Auto-refresh every 13 min + 30 min idle timeout
  useSession({ type: 'client', onRefresh: handleTokenRefresh, onExpired: handleSessionExpired });

  useEffect(() => {
    const storedToken = localStorage.getItem('clientToken');
    if (storedToken) {
      setToken(storedToken);
      initAuth(storedToken);
    } else {
      // No stored token — try silent refresh (refresh cookie may still be valid)
      tryRefreshThenInit();
    }
  }, []);

  /** Try to verify stored token; if 401, attempt refresh before giving up. */
  const initAuth = async (authToken: string) => {
    try {
      const response = await fetch('/api/auth/profile', {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });

      if (response.ok) {
        const result = await response.json();
        setUser(result.data);
        setIsLoading(false);
        return;
      }

      if (response.status === 401) {
        // Access token expired or invalid — try to refresh silently
        await tryRefreshThenInit();
        return;
      }

      // Server error — keep token, unblock UI
      setIsLoading(false);
    } catch {
      // Network error — keep token, unblock UI
      setIsLoading(false);
    }
  };

  /** Call the refresh endpoint; if it succeeds, store new token + fetch profile. */
  const tryRefreshThenInit = async () => {
    try {
      const res = await fetch('/api/auth/refresh', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        const newToken: string = data.accessToken;
        localStorage.setItem('clientToken', newToken);
        setToken(newToken);

        // Fetch profile with fresh token
        const profileRes = await fetch('/api/auth/profile', {
          headers: { 'Authorization': `Bearer ${newToken}` },
        });
        if (profileRes.ok) {
          const profile = await profileRes.json();
          setUser(profile.data);
        } else {
          // Refresh worked but profile failed — clear everything
          localStorage.removeItem('clientToken');
          setToken(null);
        }
      } else {
        // Refresh failed — no valid session at all
        localStorage.removeItem('clientToken');
        setToken(null);
      }
    } catch {
      // Network error — clear to be safe
      localStorage.removeItem('clientToken');
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: {
    cin: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone: string;
    dateOfBirth: string;
    address: string;
    city: string;
    province: string;
    postalCode?: string;
  }) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Registration failed');
      }

      return result;
    } catch (error) {
      throw error;
    }
  };

  const login = async (email: string, password: string, rememberMe = false) => {
    console.log('login: Attempting login for:', email);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rememberMe }),
      });

      const result = await response.json();
      console.log('login: Response received, success:', result.success);

      if (!response.ok) {
        throw new Error(result.message || 'Login failed');
      }

      // 2FA required — return info for the form to show OTP step
      if (result.requires2FA) {
        return {
          requires2FA: true as const,
          pendingToken: result.pendingToken as string,
          method: result.method as 'email' | 'phone',
          maskedContact: result.maskedContact as string,
        };
      }

      // Normal login — store token and update state
      const { token: newToken, client } = result.data;
      console.log('login: Token received:', !!newToken);
      localStorage.setItem('clientToken', newToken);
      setToken(newToken);
      setUser(client);
      setIsLoading(false);
      console.log('login: State updated successfully');

      return { requires2FA: false as const };
    } catch (error) {
      console.error('login: Login error:', error);
      throw error;
    }
  };

  const verify2FA = async (pendingToken: string, otp: string) => {
    const response = await fetch('/api/auth/login/verify-2fa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pendingToken, otp }),
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Verification failed');

    const { token: newToken, client } = result.data;
    localStorage.setItem('clientToken', newToken);
    setToken(newToken);
    setUser(client);
    setIsLoading(false);
    return result;
  };

  const logout = async () => {
    // Clear state immediately so the dashboard stops rendering
    localStorage.removeItem('clientToken');
    setToken(null);
    setUser(null);
    setIsLoading(false);
    // Best-effort server-side session revoke + cookie clear
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch { /* ignore */ }
    router.replace('/auth/login');
  };

  const fetchActivityLogs = async (limit = 20, offset = 0) => {
    try {
      const response = await fetch(
        `/api/logs/activity?limit=${limit}&offset=${offset}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch activity logs');
      }
      
      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Failed to fetch activity logs:', error);
      throw error;
    }
  };

  return {
    token,
    user,
    isLoading,
    isAuthenticated: !!token && !!user && !isLoading,
    register,
    login,
    verify2FA,
    logout,
    fetchActivityLogs,
  };
}