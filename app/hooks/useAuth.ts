'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/app/lib/trpc-client';

// Client Authentication Hook
export function useClientAuth() {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('clientToken');
    setToken(storedToken);
    setIsLoading(false);
  }, []);

  const login = trpc.clientAuth.login.useMutation({
    onSuccess: (result) => {
      const { token } = result.data;
      localStorage.setItem('clientToken', token);
      localStorage.removeItem('staffToken'); // Remove staff token if exists
      setToken(token);
    },
    onError: (error) => {
      console.error('Client login failed:', error.message);
    },
  });

  const register = trpc.clientAuth.register.useMutation({
    onSuccess: () => {
      // Registration successful, but not logged in yet
      console.log('Registration successful');
    },
    onError: (error) => {
      console.error('Client registration failed:', error.message);
    },
  });

  // Get client profile when authenticated
  const { data: user } = trpc.clientAuth.getProfile.useQuery(undefined, {
    enabled: !!token,
    retry: false,
  });

  const logout = () => {
    localStorage.removeItem('clientToken');
    setToken(null);
  };

  const isAuthenticated = !!token && !isLoading;

  return {
    isAuthenticated,
    isLoading: isLoading || login.isPending || register.isPending,
    token,
    user,
    login: login.mutate,
    register: register.mutate,
    logout,
    loginError: login.error?.message,
    registerError: register.error?.message,
  };
}

// Staff Authentication Hook
export function useStaffAuth() {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('staffToken');
    setToken(storedToken);
    setIsLoading(false);
  }, []);

  const login = trpc.staffAuth.login.useMutation({
    onSuccess: (result) => {
      const { token } = result.data;
      localStorage.setItem('staffToken', token);
      localStorage.removeItem('clientToken'); // Remove client token if exists
      setToken(token);
    },
    onError: (error) => {
      console.error('Staff login failed:', error.message);
    },
  });

  const register = trpc.staffAuth.register.useMutation({
    onSuccess: () => {
      console.log('Staff registration successful');
    },
    onError: (error) => {
      console.error('Staff registration failed:', error.message);
    },
  });

  // Get staff profile when authenticated
  const { data: user } = trpc.staffAuth.getProfile.useQuery(undefined, {
    enabled: !!token,
    retry: false,
  });

  const logout = () => {
    localStorage.removeItem('staffToken');
    setToken(null);
  };

  const isAuthenticated = !!token && !isLoading;

  return {
    isAuthenticated,
    isLoading: isLoading || login.isPending || register.isPending,
    token,
    user,
    profile: user, // Alias for consistency
    login: login.mutate,
    register: register.mutate,
    logout,
    loginError: login.error?.message,
    registerError: register.error?.message,
  };
}

// Generic Auth Hook (detects which type of user is logged in)
export function useAuth() {
  const [userType, setUserType] = useState<'CLIENT' | 'STAFF' | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const clientToken = localStorage.getItem('clientToken');
    const staffToken = localStorage.getItem('staffToken');

    if (staffToken) {
      setUserType('STAFF');
    } else if (clientToken) {
      setUserType('CLIENT');
    } else {
      setUserType(null);
    }

    setIsLoading(false);
  }, []);

  const logout = () => {
    localStorage.removeItem('clientToken');
    localStorage.removeItem('staffToken');
    setUserType(null);
  };

  return {
    userType,
    isAuthenticated: userType !== null && !isLoading,
    isLoading,
    logout,
  };
}

// Role-based permission hook for staff
export function useStaffPermissions() {
  const { data: profile } = trpc.staffAuth.getProfile.useQuery(undefined, {
    enabled: !!localStorage.getItem('staffToken'),
  });

  const hasRole = (roles: string[]) => {
    return profile?.data?.role && roles.includes(profile.data.role);
  };

  const isManager = () => hasRole(['SUPER_ADMIN', 'MANAGER_SENIOR', 'MANAGER_JUNIOR']);
  const isAdmin = () => hasRole(['SUPER_ADMIN']);
  const isExpert = () => hasRole(['EXPERT']);

  return {
    profile: profile?.data,
    hasRole,
    isManager: isManager(),
    isAdmin: isAdmin(),
    isExpert: isExpert(),
    canManageClaims: isManager(),
    canCreateStaff: isAdmin(),
    canViewReports: isManager(),
  };
}