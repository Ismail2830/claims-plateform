import { useState, useEffect } from 'react';

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

  useEffect(() => {
    console.log('useSimpleAuth: Initializing auth state');
    const storedToken = localStorage.getItem('clientToken');
    console.log('useSimpleAuth: Stored token exists:', !!storedToken);
    
    if (storedToken) {
      setToken(storedToken);
      fetchProfile(storedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchProfile = async (authToken: string) => {
    console.log('fetchProfile: Starting profile fetch');
    try {
      const response = await fetch('/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      console.log('fetchProfile: Response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('fetchProfile: Profile data received:', !!result.data);
        setUser(result.data);
      } else {
        console.log('fetchProfile: Token invalid, removing');
        // Token might be invalid, remove it
        localStorage.removeItem('clientToken');
        setToken(null);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
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

  const login = async (email: string, password: string) => {
    console.log('login: Attempting login for:', email);
    try {
      const response = await fetch('/api/auth/login', {
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

      const { token: newToken, client } = result.data;
      console.log('login: Token received:', !!newToken);
      console.log('login: Client data received:', !!client);
      
      // Set token first in localStorage
      localStorage.setItem('clientToken', newToken);
      console.log('login: Token stored in localStorage');
      
      // Then set state
      setToken(newToken);
      setUser(client);
      setIsLoading(false); // Ensure loading is false
      
      console.log('login: State updated successfully');
      
      return result;
    } catch (error) {
      console.error('login: Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    console.log('logout: Logging out user');
    localStorage.removeItem('clientToken');
    setToken(null);
    setUser(null);
    setIsLoading(false);
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
    logout,
    fetchActivityLogs,
  };
}