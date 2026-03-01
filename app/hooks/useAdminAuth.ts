import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from './useSession';

interface User {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'SUPER_ADMIN' | 'MANAGER_SENIOR' | 'MANAGER_JUNIOR' | 'EXPERT';
  currentWorkload: number;
  maxWorkload: number;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export function useAdminAuth() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleSessionExpired = useCallback(() => {
    localStorage.removeItem('adminToken');
    setToken(null);
    setUser(null);
    setIsLoading(false);
  }, []);

  const handleTokenRefresh = useCallback((newToken: string) => {
    setToken(newToken);
    localStorage.setItem('adminToken', newToken);
  }, []);

  // Auto-refresh every 13 min + 30 min idle timeout
  useSession({ type: 'admin', onRefresh: handleTokenRefresh, onExpired: handleSessionExpired });

  useEffect(() => {
    console.log('useAdminAuth: Initializing auth state');
    const storedToken = localStorage.getItem('adminToken');
    console.log('useAdminAuth: Stored token exists:', !!storedToken);
    
    if (storedToken) {
      setToken(storedToken);
      fetchProfile(storedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchProfile = async (authToken: string) => {
    console.log('fetchProfile: Starting admin profile fetch');
    try {
      const response = await fetch('/api/admin/profile', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      console.log('fetchProfile: Response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('fetchProfile: Admin profile data received:', !!result.data);
        setUser(result.data);
      } else {
        console.log('fetchProfile: Token invalid, removing');
        // Token might be invalid, remove it
        localStorage.removeItem('adminToken');
        setToken(null);
      }
    } catch (error) {
      console.error('Failed to fetch admin profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: 'SUPER_ADMIN' | 'MANAGER_SENIOR' | 'MANAGER_JUNIOR' | 'EXPERT';
    maxWorkload?: number;
  }) => {
    try {
      const response = await fetch('/api/admin/register', {
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

  const login = async (email: string, password: string) => {
    console.log('login: Attempting admin login for:', email);
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();
      console.log('login: Response received, success:', result.success);
      
      if (!response.ok) {
        throw new Error(result.message || 'Login failed');
      }

      const { token: newToken, user: userData } = result.data;
      console.log('login: Token received:', !!newToken);
      console.log('login: User data received:', !!userData);
      
      // Set token first in localStorage
      localStorage.setItem('adminToken', newToken);
      console.log('login: Token stored in localStorage');
      
      // Then set state
      setToken(newToken);
      setUser(userData);
      setIsLoading(false); // Ensure loading is false
      
      console.log('login: Admin state updated successfully');
      
      return result;
    } catch (error) {
      console.error('login: Admin login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    console.log('logout: Logging out admin user');
    try { await fetch('/api/admin/logout', { method: 'POST' }); } catch { /* best-effort */ }
    localStorage.removeItem('adminToken');
    setToken(null);
    setUser(null);
    setIsLoading(false);
    router.replace('/auth/admin');
  };

  const createUser = async (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: 'SUPER_ADMIN' | 'MANAGER_SENIOR' | 'MANAGER_JUNIOR' | 'EXPERT';
    maxWorkload?: number;
  }) => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create user');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      throw error;
    }
  };

  const getUsers = async (limit = 20, offset = 0) => {
    try {
      const response = await fetch(
        `/api/admin/users?limit=${limit}&offset=${offset}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Failed to fetch users:', error);
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
    logout,
    createUser,
    getUsers,
  };
}