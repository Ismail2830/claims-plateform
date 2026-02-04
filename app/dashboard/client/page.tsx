'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSimpleAuth } from '@/app/hooks/useSimpleAuth';
import { FileText, Plus, Clock, CheckCircle, AlertCircle, User, Phone, Mail, MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ClientDashboard() {
  const auth = useSimpleAuth();
  const router = useRouter();
  const { user, token, isLoading } = auth;

  useEffect(() => {
    console.log('ClientDashboard: Auth state changed', {
      isLoading,
      hasToken: !!token,
      hasUser: !!user
    });
    
    // Only redirect if we're not loading and don't have a token
    if (!isLoading && !token) {
      console.log('ClientDashboard: No token found, redirecting to login');
      router.push('/auth/login');
    }
  }, [token, isLoading, router]);

  // Show loading while checking authentication
  if (isLoading) {
    console.log('ClientDashboard: Showing loading state');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!token || !user) {
    console.log('ClientDashboard: Missing token or user, showing redirect message');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Mock data - replace with real data from tRPC
  const mockStats = {
    totalClaims: 3,
    pendingClaims: 1,
    approvedClaims: 2,
    activePolicies: 2
  };

  const mockRecentClaims = [
    {
      id: 'CLM-001',
      type: 'Auto Accident',
      status: 'Under Review',
      submittedDate: '2026-01-28',
      estimatedAmount: 15000
    },
    {
      id: 'CLM-002',
      type: 'Home Damage',
      status: 'Approved',
      submittedDate: '2026-01-15',
      estimatedAmount: 8500
    }
  ];

  const mockPolicies = [
    {
      id: 'POL-001',
      type: 'Auto Insurance',
      status: 'Active',
      expiryDate: '2026-12-31',
      premium: 2400
    },
    {
      id: 'POL-002',
      type: 'Home Insurance',
      status: 'Active',
      expiryDate: '2026-10-15',
      premium: 1800
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome back, {user?.firstName}!
              </h1>
              <p className="text-gray-600">Manage your insurance claims and policies</p>
            </div>
            <div className="flex items-center gap-4">
              <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <Plus className="w-4 h-4" />
                New Claim
              </button>
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm p-6 border border-gray-100"
          >
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Claims</p>
                <p className="text-2xl font-bold text-gray-900">{mockStats.totalClaims}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-sm p-6 border border-gray-100"
          >
            <div className="flex items-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Claims</p>
                <p className="text-2xl font-bold text-gray-900">{mockStats.pendingClaims}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm p-6 border border-gray-100"
          >
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Approved Claims</p>
                <p className="text-2xl font-bold text-gray-900">{mockStats.approvedClaims}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-sm p-6 border border-gray-100"
          >
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Policies</p>
                <p className="text-2xl font-bold text-gray-900">{mockStats.activePolicies}</p>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Claims */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100"
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Recent Claims</h3>
                <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  <Plus className="w-4 h-4" />
                  Submit New Claim
                </button>
              </div>
            </div>
            <div className="divide-y divide-gray-200">
              {mockRecentClaims.map((claim, index) => (
                <div key={claim.id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{claim.id}</h4>
                        <p className="text-sm text-gray-600">{claim.type}</p>
                        <p className="text-xs text-gray-500">Submitted: {claim.submittedDate}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            claim.status === 'Approved'
                              ? 'bg-green-100 text-green-800'
                              : claim.status === 'Under Review'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {claim.status}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900">
                        MAD {claim.estimatedAmount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Profile & Policies */}
          <div className="space-y-6">
            {/* Profile Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-medium text-gray-900">{user?.firstName} {user?.lastName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium text-gray-900">{user?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="font-medium text-gray-900">{user?.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Location</p>
                    <p className="font-medium text-gray-900">{user?.city}, {user?.province}</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Active Policies */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Policies</h3>
              <div className="space-y-4">
                {mockPolicies.map((policy) => (
                  <div key={policy.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900">{policy.type}</h4>
                        <p className="text-sm text-gray-600">{policy.id}</p>
                        <p className="text-xs text-gray-500">Expires: {policy.expiryDate}</p>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {policy.status}
                        </span>
                        <p className="text-sm font-medium text-gray-900 mt-1">
                          MAD {policy.premium}/year
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}