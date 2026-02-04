'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useStaffAuth } from '@/app/hooks/useAuth';
import { 
  BarChart3, 
  Users, 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  TrendingUp,
  Building,
  Settings
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ManagerDashboard() {
  const staffAuth = useStaffAuth();
  const router = useRouter();
  const { user, isAuthenticated, profile } = staffAuth;

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/staff/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Mock data - replace with real data from tRPC
  const mockStats = {
    totalClaims: 245,
    pendingReview: 18,
    approvedToday: 12,
    averageProcessingTime: '3.2 days',
    teamWorkload: 85,
    monthlyTarget: 300
  };

  const mockRecentClaims = [
    {
      id: 'CLM-2456',
      clientName: 'Ahmed Ben Ali',
      type: 'Auto Accident',
      status: 'Needs Review',
      assignedTo: 'Sarah Benali',
      priority: 'High',
      submittedDate: '2026-02-03',
      estimatedAmount: 25000
    },
    {
      id: 'CLM-2455',
      clientName: 'Fatima El Mourad',
      type: 'Home Damage',
      status: 'Under Investigation',
      assignedTo: 'Youssef Karimi',
      priority: 'Medium',
      submittedDate: '2026-02-02',
      estimatedAmount: 15000
    },
    {
      id: 'CLM-2454',
      clientName: 'Omar Tazi',
      type: 'Water Damage',
      status: 'Approved',
      assignedTo: 'Aicha Benjelloun',
      priority: 'Low',
      submittedDate: '2026-02-01',
      estimatedAmount: 8500
    }
  ];

  const mockTeamPerformance = [
    { name: 'Sarah Benali', role: 'Senior Expert', activeClaims: 8, completed: 45, efficiency: '92%' },
    { name: 'Youssef Karimi', role: 'Claims Expert', activeClaims: 12, completed: 38, efficiency: '88%' },
    { name: 'Aicha Benjelloun', role: 'Claims Expert', activeClaims: 6, completed: 52, efficiency: '95%' },
    { name: 'Hassan Alami', role: 'Junior Expert', activeClaims: 15, completed: 28, efficiency: '78%' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Manager Dashboard
              </h1>
              <p className="text-gray-600">
                {profile?.data.firstName} {profile?.data.lastName} - {profile?.data.role}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <Settings className="w-5 h-5" />
              </button>
              <button
                onClick={() => staffAuth.logout()}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics */}
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
                <p className="text-xs text-green-600">+12% vs last month</p>
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
                <p className="text-sm font-medium text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold text-gray-900">{mockStats.pendingReview}</p>
                <p className="text-xs text-yellow-600">Needs attention</p>
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
                <p className="text-sm font-medium text-gray-600">Approved Today</p>
                <p className="text-2xl font-bold text-gray-900">{mockStats.approvedToday}</p>
                <p className="text-xs text-green-600">Good progress</p>
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
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg. Processing</p>
                <p className="text-2xl font-bold text-gray-900">{mockStats.averageProcessingTime}</p>
                <p className="text-xs text-purple-600">-0.5 days vs target</p>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Claims Requiring Attention */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100"
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Claims Requiring Attention</h3>
                <button className="text-sm text-indigo-600 hover:text-indigo-500 font-medium">
                  View All
                </button>
              </div>
            </div>
            <div className="divide-y divide-gray-200">
              {mockRecentClaims.map((claim) => (
                <div key={claim.id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{claim.id}</h4>
                        <p className="text-sm text-gray-600">{claim.clientName}</p>
                        <p className="text-xs text-gray-500">{claim.type} • Assigned to {claim.assignedTo}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            claim.priority === 'High'
                              ? 'bg-red-100 text-red-800'
                              : claim.priority === 'Medium'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {claim.priority}
                        </span>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            claim.status === 'Needs Review'
                              ? 'bg-red-100 text-red-800'
                              : claim.status === 'Under Investigation'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {claim.status}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900">
                        MAD {claim.estimatedAmount.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">{claim.submittedDate}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Team Performance & Workload */}
          <div className="space-y-6">
            {/* Workload Overview */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Workload</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Current Capacity</span>
                    <span className="text-sm text-gray-900">{mockStats.teamWorkload}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${mockStats.teamWorkload}%` }}
                    ></div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">41</p>
                    <p className="text-sm text-gray-600">Active Claims</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">4</p>
                    <p className="text-sm text-gray-600">Team Members</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Team Performance */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Performance</h3>
              <div className="space-y-4">
                {mockTeamPerformance.map((member) => (
                  <div key={member.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900 text-sm">{member.name}</h4>
                      <p className="text-xs text-gray-600">{member.role}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <span>{member.activeClaims} active</span>
                        <span>•</span>
                        <span className="text-green-600 font-medium">{member.efficiency}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Monthly Target Progress */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100 p-6"
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Monthly Progress</h3>
            <div className="text-sm text-gray-600">
              {mockStats.totalClaims} of {mockStats.monthlyTarget} claims processed
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div 
              className="bg-gradient-to-r from-indigo-500 to-purple-600 h-4 rounded-full transition-all duration-500"
              style={{ width: `${(mockStats.totalClaims / mockStats.monthlyTarget) * 100}%` }}
            ></div>
          </div>
          <div className="flex justify-between items-center mt-2 text-sm text-gray-600">
            <span>February 2026</span>
            <span>{Math.round((mockStats.totalClaims / mockStats.monthlyTarget) * 100)}% Complete</span>
          </div>
        </motion.div>
      </main>
    </div>
  );
}