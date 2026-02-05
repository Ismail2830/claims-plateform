'use client';

import React, { useEffect, useState } from 'react';
import { useSimpleAuth } from '@/app/hooks/useSimpleAuth';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/app/components/dashboard/DashboardLayout';
import { StatCard, ActionCard, RecentActivity } from '@/app/components/dashboard/DashboardWidgets';
import { 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Users,
  ClipboardCheck,
  MessageSquare,
  TrendingUp,
  UserCheck,
  FileCheck,
  DollarSign,
  Flag
} from 'lucide-react';

export default function ManagerJuniorDashboard() {
  const { user, isLoading } = useSimpleAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login');

    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard/manager-junior',
      icon: <FileText className="w-5 h-5" />,
      current: true,
    },
    {
      name: 'Pending Approvals',
      href: '/dashboard/manager-junior/approvals',
      icon: <Clock className="w-5 h-5" />,
    },
    {
      name: 'Team Performance',
      href: '/dashboard/manager-junior/team',
      icon: <Users className="w-5 h-5" />,
    },
    {
      name: 'Claim Review',
      href: '/dashboard/manager-junior/claims',
      icon: <FileCheck className="w-5 h-5" />,
    },
    {
      name: 'Reports',
      href: '/dashboard/manager-junior/reports',
      icon: <TrendingUp className="w-5 h-5" />,
    },
    {
      name: 'Quality Control',
      href: '/dashboard/manager-junior/quality',
      icon: <CheckCircle className="w-5 h-5" />,
    },
  ];

  const recentActivities = [
    {
      id: '1',
      type: 'Claim Approval',
      description: 'Approved auto insurance claim for MAD 18,500',
      timestamp: '15 minutes ago',
      status: 'success' as const,
    },
    {
      id: '2',
      type: 'Team Review',
      description: 'Reviewed expert assessment for property damage case',
      timestamp: '45 minutes ago',
      status: 'info' as const,
    },
    {
      id: '3',
      type: 'Quality Check',
      description: 'Flagged claim for senior manager review',
      timestamp: '1 hour ago',
      status: 'warning' as const,
    },
    {
      id: '4',
      type: 'Policy Review',
      description: 'Updated claim processing guidelines',
      timestamp: '2 hours ago',
      status: 'success' as const,
    },
  ];

  const pendingApprovals = [
    {
      id: 'CLM-2024-015',
      type: 'Auto Accident',
      expert: 'Dr. Ahmed Hassan',
      amount: 22000,
      priority: 'High',
      submittedDate: '2024-02-05',
      client: 'Fatima Al-Zahra',
    },
    {
      id: 'CLM-2024-016',
      type: 'Property Damage',
      expert: 'Sarah Johnson',
      amount: 15500,
      priority: 'Medium',
      submittedDate: '2024-02-04',
      client: 'Omar Benali',
    },
    {
      id: 'CLM-2024-017',
      type: 'Theft Recovery',
      expert: 'Michael Chen',
      amount: 8000,
      priority: 'Low',
      submittedDate: '2024-02-03',
      client: 'Yasmine Rachid',
    },
  ];

  const teamStats = [
    { name: 'Dr. Ahmed Hassan', completed: 15, pending: 3, rating: 4.9 },
    { name: 'Sarah Johnson', completed: 12, pending: 5, rating: 4.7 },
    { name: 'Michael Chen', completed: 18, pending: 2, rating: 4.8 },
  ];

  return (
    <DashboardLayout 
      title="Junior Manager Dashboard" 
      userRole="MANAGER_JUNIOR"
      navigation={navigation}
    >
      {/* Welcome Message */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">
          Welcome back, {user.firstName}!
        </h2>
        <p className="text-gray-600 mt-2">
          Manage claim approvals and oversee team performance.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Pending Approvals"
          value="8"
          icon={Clock}
          color="yellow"
          subtitle="Awaiting your review"
          trend={{ value: 12, isPositive: false }}
        />
        <StatCard
          title="Approved Today"
          value="6"
          icon={CheckCircle}
          color="green"
          subtitle="Claims processed"
          trend={{ value: 25, isPositive: true }}
        />
        <StatCard
          title="Team Performance"
          value="94%"
          icon={TrendingUp}
          color="blue"
          subtitle="Average efficiency"
          trend={{ value: 5, isPositive: true }}
        />
        <StatCard
          title="Total Value"
          value="MAD 156K"
          icon={DollarSign}
          color="purple"
          subtitle="Claims processed this month"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <ActionCard
          title="Review Approvals"
          description="Process pending claim approvals"
          icon={ClipboardCheck}
          color="blue"
          buttonText="Review Claims"
          onClick={() => router.push('/dashboard/manager-junior/approvals')}
        />
        <ActionCard
          title="Team Management"
          description="Monitor expert performance and workload"
          icon={Users}
          color="green"
          buttonText="View Team"
          onClick={() => router.push('/dashboard/manager-junior/team')}
        />
        <ActionCard
          title="Quality Control"
          description="Ensure claim processing standards"
          icon={Flag}
          color="purple"
          buttonText="Quality Check"
          onClick={() => router.push('/dashboard/manager-junior/quality')}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Approvals */}
        <div className="lg:col-span-2 bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Pending Approvals
              </h3>
              <button
                onClick={() => router.push('/dashboard/manager-junior/approvals')}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                View All
              </button>
            </div>
            <div className="space-y-4">
              {pendingApprovals.map((approval) => (
                <div key={approval.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="shrink-0">
                        <div className={`w-3 h-3 rounded-full ${
                          approval.priority === 'High' ? 'bg-red-500' :
                          approval.priority === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'
                        }`} />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{approval.id}</h4>
                        <p className="text-sm text-gray-500">{approval.type} • {approval.client}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        MAD {approval.amount.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">
                        Expert: {approval.expert}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-gray-500">
                      Submitted: {approval.submittedDate}
                    </p>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => router.push(`/dashboard/manager-junior/approvals/${approval.id}`)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors"
                      >
                        Review
                      </button>
                      <button className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 transition-colors">
                        Approve
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar with Activity and Team Performance */}
        <div className="space-y-6">
          <RecentActivity activities={recentActivities} />
          
          {/* Team Performance Summary */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Team Performance
              </h3>
              <div className="space-y-4">
                {teamStats.map((member, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <UserCheck className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{member.name}</p>
                        <p className="text-xs text-gray-500">
                          {member.completed} completed, {member.pending} pending
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-900">{member.rating}</span>
                        <div className="ml-1 flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <div
                              key={i}
                              className={`w-2 h-2 rounded-full ${
                                i < Math.floor(member.rating) ? 'bg-yellow-400' : 'bg-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => router.push('/dashboard/manager-junior/team')}
                  className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  View Detailed Performance
                </button>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                This Week
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Claims Processed</span>
                  <span className="text-sm font-medium text-gray-900">32</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Average Processing Time</span>
                  <span className="text-sm font-medium text-gray-900">1.8 days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Approval Rate</span>
                  <span className="text-sm font-medium text-gray-900">87%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Quality Score</span>
                  <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                    Excellent
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}