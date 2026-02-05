'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useSimpleAuth } from '@/app/hooks/useSimpleAuth';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/app/components/dashboard/DashboardLayout';
import { StatCard, ActionCard, RecentActivity } from '@/app/components/dashboard/DashboardWidgets';
import { 
  PlusCircle, 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Shield,
  DollarSign,
  Calendar
} from 'lucide-react';

export default function ClientDashboard() {
  const [showSuccess, setShowSuccess] = useState(false);
  const searchParams = useSearchParams();
  
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
    
    // Check for success message
    if (searchParams.get('claim_created') === 'true') {
      setShowSuccess(true);
    }
  }, [token, isLoading, router, searchParams]);

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

  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard/client',
      icon: <Shield className="w-5 h-5" />,
      current: true,
    },
    {
      name: 'My Claims',
      href: '/dashboard/client/claims',
      icon: <FileText className="w-5 h-5" />,
    },
    {
      name: 'My Policies',
      href: '/dashboard/client/policies',
      icon: <Shield className="w-5 h-5" />,
    },
    {
      name: 'Create Claim',
      href: '/claims/create',
      icon: <PlusCircle className="w-5 h-5" />,
    },
    {
      name: 'Profile',
      href: '/dashboard/client/profile',
      icon: <CheckCircle className="w-5 h-5" />,
    },
  ];

  // Mock data - replace with real data from tRPC
  const mockStats = {
    totalClaims: 3,
    pendingClaims: 1,
    approvedClaims: 2,
    activePolicies: 2
  };

  const recentActivities = [
    {
      id: '1',
      type: 'Claim Submission',
      description: 'Auto accident claim submitted for review',
      timestamp: '2 hours ago',
      status: 'info' as const,
    },
    {
      id: '2',
      type: 'Policy Update',
      description: 'Home insurance policy renewed successfully',
      timestamp: '1 day ago',
      status: 'success' as const,
    },
    {
      id: '3',
      type: 'Document Request',
      description: 'Additional documents requested for claim #1234',
      timestamp: '3 days ago',
      status: 'warning' as const,
    },
  ];

  return (
    <DashboardLayout 
      title="Client Dashboard" 
      userRole="CLIENT"
      navigation={navigation}
    >
      {/* Success Alert */}
      {showSuccess && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-green-50 border-l-4 border-green-400 rounded-md"
        >
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <p className="text-sm text-green-700">
                Your claim has been successfully submitted! You will receive updates on your claim status.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Welcome Message */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.firstName || 'Client'}!
        </h2>
        <p className="text-gray-600 mt-2">
          Here's an overview of your insurance claims and policies.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Claims"
          value={mockStats.totalClaims}
          icon={FileText}
          color="blue"
          subtitle="All time"
        />
        <StatCard
          title="Pending Claims"
          value={mockStats.pendingClaims}
          icon={Clock}
          color="yellow"
          subtitle="Under review"
        />
        <StatCard
          title="Active Policies"
          value={mockStats.activePolicies}
          icon={Shield}
          color="green"
          subtitle="Currently covered"
        />
        <StatCard
          title="Total Coverage"
          value="$150,000"
          icon={DollarSign}
          color="purple"
          subtitle="Combined policies"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <ActionCard
          title="Create New Claim"
          description="Submit a new insurance claim for damage or loss"
          icon={PlusCircle}
          color="blue"
          buttonText="Start New Claim"
          onClick={() => router.push('/claims/create')}
        />
        <ActionCard
          title="Track Claims"
          description="View status and updates for your submitted claims"
          icon={FileText}
          color="green"
          buttonText="View My Claims"
          onClick={() => router.push('/dashboard/client/claims')}
        />
        <ActionCard
          title="Manage Policies"
          description="Review your current insurance policies and coverage"
          icon={Shield}
          color="purple"
          buttonText="View Policies"
          onClick={() => router.push('/dashboard/client/policies')}
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentActivity activities={recentActivities} />
        </div>
        
        {/* Quick Info Panel */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Quick Info
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600">Last Login</span>
                </div>
                <span className="text-sm font-medium text-gray-900">Today</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Shield className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600">Coverage Status</span>
                </div>
                <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                  Active
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600">Notifications</span>
                </div>
                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                  2 New
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}