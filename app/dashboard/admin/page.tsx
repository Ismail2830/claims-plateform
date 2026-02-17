'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAdminAuth } from '@/app/hooks/useAdminAuth';
import CreateUserModal from '@/app/components/admin/CreateUserModal';
import { 
  Users, 
  FileText, 
  Shield, 
  BarChart3, 
  Settings, 
  Plus,
  UserCheck,
  UserX,
  Crown,
  Briefcase
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const auth = useAdminAuth();
  const router = useRouter();
  const { user, token, isLoading } = auth;
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalClaims: 0,
    pendingClaims: 0
  });
  const [recentUsers, setRecentUsers] = useState([]);
  const [showCreateUser, setShowCreateUser] = useState(false);

  useEffect(() => {
    console.log('AdminDashboard: Auth state changed', {
      isLoading,
      hasToken: !!token,
      hasUser: !!user
    });
    
    // Only redirect if we're not loading and don't have a token
    if (!isLoading && !token) {
      console.log('AdminDashboard: No token found, redirecting to login');
      router.push('/admin/login');
    }
  }, [token, isLoading, router]);

  useEffect(() => {
    if (user && token) {
      loadDashboardData();
    }
  }, [user, token]);

  const loadDashboardData = async () => {
    try {
      // Load users
      const usersData = await auth.getUsers(10, 0);
      setRecentUsers(usersData.users);
      
      // Mock stats - replace with real API calls
      setStats({
        totalUsers: usersData.pagination.total,
        activeUsers: usersData.users.filter((u: any) => u.isActive).length,
        totalClaims: 0, // TODO: Add claims API
        pendingClaims: 0, // TODO: Add claims API
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const handleCreateUser = async (userData: any) => {
    try {
      await auth.createUser(userData);
      await loadDashboardData(); // Refresh data
    } catch (error) {
      throw error; // Let the modal handle the error
    }
  };

  // Show loading while checking authentication
  if (isLoading) {
    console.log('AdminDashboard: Showing loading state');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!token || !user) {
    console.log('AdminDashboard: Missing token or user, showing redirect message');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return <Crown className="w-4 h-4 text-yellow-600" />;
      case 'MANAGER_SENIOR': return <Shield className="w-4 h-4 text-purple-600" />;
      case 'MANAGER_JUNIOR': return <Briefcase className="w-4 h-4 text-blue-600" />;
      case 'EXPERT': return <UserCheck className="w-4 h-4 text-green-600" />;
      default: return <Users className="w-4 h-4 text-gray-600" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'MANAGER_SENIOR': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'MANAGER_JUNIOR': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'EXPERT': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Shield className="w-6 h-6 text-blue-600" />
                Admin Dashboard
              </h1>
              <p className="text-gray-600">
                Welcome back, {user.firstName}! 
                <span className={`ml-2 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getRoleBadgeColor(user.role)}`}>
                  {getRoleIcon(user.role)}
                  {user.role.replace('_', ' ')}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-4">
              {user.role === 'SUPER_ADMIN' && (
                <button
                  onClick={() => setShowCreateUser(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create User
                </button>
              )}
              <button
                onClick={() => auth.logout()}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalUsers}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-3xl font-bold text-green-600">{stats.activeUsers}</p>
              </div>
              <UserCheck className="w-8 h-8 text-green-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Claims</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalClaims}</p>
              </div>
              <FileText className="w-8 h-8 text-purple-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Claims</p>
                <p className="text-3xl font-bold text-orange-600">{stats.pendingClaims}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-orange-600" />
            </div>
          </motion.div>
        </div>

        {/* Recent Users */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Recent Users</h2>
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              View All
            </button>
          </div>

          <div className="space-y-4">
            {recentUsers.map((user: any, index) => (
              <div
                key={user.userId}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {(user.firstName?.[0] || user.username[0]).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {user.firstName && user.lastName 
                        ? `${user.firstName} ${user.lastName}` 
                        : user.username}
                    </p>
                    <p className="text-sm text-gray-600">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getRoleBadgeColor(user.role)}`}>
                    {getRoleIcon(user.role)}
                    {user.role.replace('_', ' ')}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    user.isActive 
                      ? 'bg-green-100 text-green-800 border-green-200' 
                      : 'bg-red-100 text-red-800 border-red-200'
                  }`}>
                    {user.isActive ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </main>

      {/* Create User Modal */}
      <CreateUserModal
        isOpen={showCreateUser}
        onClose={() => setShowCreateUser(false)}
        onCreateUser={handleCreateUser}
      />
    </div>
  );
}