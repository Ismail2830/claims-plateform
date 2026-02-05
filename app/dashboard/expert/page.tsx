'use client';

import React, { useEffect, useState } from 'react';
import { useSimpleAuth } from '@/app/hooks/useSimpleAuth';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/app/components/dashboard/DashboardLayout';
import { StatCard, ActionCard, RecentActivity } from '@/app/components/dashboard/DashboardWidgets';
import { 
  FileText, 
  Eye, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Search,
  ClipboardCheck,
  MessageSquare,
  Calculator,
  TrendingUp,
  Calendar
} from 'lucide-react';

export default function ExpertDashboard() {
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
      href: '/dashboard/expert',
      icon: <FileText className="w-5 h-5" />,
      current: true,
    },
    {
      name: 'Pending Claims',
      href: '/dashboard/expert/claims/pending',
      icon: <Clock className="w-5 h-5" />,
    },
    {
      name: 'In Review',
      href: '/dashboard/expert/claims/review',
      icon: <Eye className="w-5 h-5" />,
    },
    {
      name: 'Completed',
      href: '/dashboard/expert/claims/completed',
      icon: <CheckCircle className="w-5 h-5" />,
    },
    {
      name: 'Search Claims',
      href: '/dashboard/expert/claims/search',
      icon: <Search className="w-5 h-5" />,
    },
    {
      name: 'Reports',
      href: '/dashboard/expert/reports',
      icon: <TrendingUp className="w-5 h-5" />,
    },
  ];

  const recentActivities = [
    {
      id: '1',
      type: 'Claim Assessment',
      description: 'Completed evaluation for auto accident claim #CLM-2024-001',
      timestamp: '30 minutes ago',
      status: 'success' as const,
    },
    {
      id: '2',
      type: 'Document Review',
      description: 'Requested additional documents for claim #CLM-2024-005',
      timestamp: '1 hour ago',
      status: 'warning' as const,
    },
    {
      id: '3',
      type: 'Field Investigation',
      description: 'Scheduled on-site inspection for property damage claim',
      timestamp: '2 hours ago',
      status: 'info' as const,
    },
    {
      id: '4',
      type: 'Report Submission',
      description: 'Submitted assessment report for home insurance claim',
      timestamp: '3 hours ago',
      status: 'success' as const,
    },
  ];

  const pendingClaims = [
    {
      id: 'CLM-2024-007',
      type: 'Auto Accident',
      priority: 'High',
      assignedDate: '2024-02-03',
      estimatedValue: 25000,
      client: 'Sarah Johnson',
    },
    {
      id: 'CLM-2024-008',
      type: 'Property Damage',
      priority: 'Medium',
      assignedDate: '2024-02-02',
      estimatedValue: 15000,
      client: 'Michael Chen',
    },
    {
      id: 'CLM-2024-009',
      type: 'Theft',
      priority: 'Low',
      assignedDate: '2024-02-01',
      estimatedValue: 5000,
      client: 'Emma Wilson',
    },
  ];

  return (
    <DashboardLayout 
      title="Expert Dashboard" 
      userRole="EXPERT"
      navigation={navigation}
    >
      {/* Welcome Message */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">
          Welcome back, {user.firstName}!
        </h2>
        <p className="text-gray-600 mt-2">
          Review and evaluate insurance claims with your expertise.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Pending Claims"
          value="12"
          icon={Clock}
          color="yellow"
          subtitle="Awaiting review"
          trend={{ value: 8, isPositive: false }}
        />
        <StatCard
          title="In Progress"
          value="5"
          icon={Eye}
          color="blue"
          subtitle="Currently reviewing"
        />
        <StatCard
          title="Completed Today"
          value="3"
          icon={CheckCircle}
          color="green"
          subtitle="Assessments done"
          trend={{ value: 15, isPositive: true }}
        />
        <StatCard
          title="Average Processing Time"
          value="2.3 days"
          icon={TrendingUp}
          color="purple"
          subtitle="This month"
          trend={{ value: 12, isPositive: true }}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <ActionCard
          title="Review Claims"
          description="Assess pending insurance claims"
          icon={Eye}
          color="blue"
          buttonText="Start Review"
          onClick={() => router.push('/dashboard/expert/claims/pending')}
        />
        <ActionCard
          title="Schedule Inspection"
          description="Plan field visits for claims"
          icon={Calendar}
          color="green"
          buttonText="Schedule"
          onClick={() => router.push('/dashboard/expert/inspections')}
        />
        <ActionCard
          title="Generate Report"
          description="Create assessment reports"
          icon={ClipboardCheck}
          color="purple"
          buttonText="Create Report"
          onClick={() => router.push('/dashboard/expert/reports/create')}
        />
        <ActionCard
          title="Claim Calculator"
          description="Calculate claim values and settlements"
          icon={Calculator}
          color="indigo"
          buttonText="Open Calculator"
          onClick={() => router.push('/dashboard/expert/calculator')}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Claims List */}
        <div className="lg:col-span-2 bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                High Priority Claims
              </h3>
              <button
                onClick={() => router.push('/dashboard/expert/claims/pending')}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                View All
              </button>
            </div>
            <div className="space-y-4">
              {pendingClaims.map((claim) => (
                <div key={claim.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="shrink-0">
                        <div className={`w-3 h-3 rounded-full ${
                          claim.priority === 'High' ? 'bg-red-500' :
                          claim.priority === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'
                        }`} />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{claim.id}</h4>
                        <p className="text-sm text-gray-500">{claim.type} • {claim.client}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        MAD {claim.estimatedValue.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">
                        Assigned: {claim.assignedDate}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => router.push(`/dashboard/expert/claims/${claim.id}`)}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors"
                    >
                      Review Claim
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity & Quick Info */}
        <div className="space-y-6">
          <RecentActivity activities={recentActivities} />
          
          {/* Performance Metrics */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Performance Metrics
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Claims Processed</span>
                  <span className="text-sm font-medium text-gray-900">127</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Average Rating</span>
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-900">4.8/5</span>
                    <div className="ml-2 flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-full ${
                            i < 5 ? 'bg-yellow-400' : 'bg-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Response Time</span>
                  <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                    Excellent
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Active Cases</span>
                  <span className="text-sm font-medium text-gray-900">17</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}