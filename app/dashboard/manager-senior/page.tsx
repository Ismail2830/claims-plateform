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
  TrendingUp,
  UserCheck,
  FileCheck,
  DollarSign,
  Flag,
  BarChart,
  Building,
  Target,
  Award
} from 'lucide-react';

export default function ManagerSeniorDashboard() {
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
      href: '/dashboard/manager-senior',
      icon: <Building className="w-5 h-5" />,
      current: true,
    },
    {
      name: 'Strategic Overview',
      href: '/dashboard/manager-senior/overview',
      icon: <BarChart className="w-5 h-5" />,
    },
    {
      name: 'Department Management',
      href: '/dashboard/manager-senior/departments',
      icon: <Users className="w-5 h-5" />,
    },
    {
      name: 'High-Value Claims',
      href: '/dashboard/manager-senior/high-value',
      icon: <Flag className="w-5 h-5" />,
    },
    {
      name: 'Policy Management',
      href: '/dashboard/manager-senior/policies',
      icon: <FileCheck className="w-5 h-5" />,
    },
    {
      name: 'Financial Reports',
      href: '/dashboard/manager-senior/financial',
      icon: <DollarSign className="w-5 h-5" />,
    },
    {
      name: 'Performance Analytics',
      href: '/dashboard/manager-senior/analytics',
      icon: <TrendingUp className="w-5 h-5" />,
    },
  ];

  const recentActivities = [
    {
      id: '1',
      type: 'High-Value Approval',
      description: 'Approved complex commercial property claim for MAD 250,000',
      timestamp: '30 minutes ago',
      status: 'success' as const,
    },
    {
      id: '2',
      type: 'Policy Review',
      description: 'Updated company-wide claim processing policies',
      timestamp: '1 hour ago',
      status: 'info' as const,
    },
    {
      id: '3',
      type: 'Department Meeting',
      description: 'Conducted monthly performance review with junior managers',
      timestamp: '2 hours ago',
      status: 'success' as const,
    },
    {
      id: '4',
      type: 'Strategic Decision',
      description: 'Approved budget increase for expert team expansion',
      timestamp: '3 hours ago',
      status: 'warning' as const,
    },
  ];

  const highValueClaims = [
    {
      id: 'CLM-2024-025',
      type: 'Commercial Property',
      amount: 450000,
      priority: 'Critical',
      status: 'Pending Approval',
      manager: 'Ahmed Ben Ali',
      riskLevel: 'High',
    },
    {
      id: 'CLM-2024-026',
      type: 'Industrial Accident',
      amount: 320000,
      priority: 'High',
      status: 'Under Investigation',
      manager: 'Fatima Zahra',
      riskLevel: 'Medium',
    },
    {
      id: 'CLM-2024-027',
      type: 'Marine Insurance',
      amount: 180000,
      priority: 'Medium',
      status: 'Documentation Review',
      manager: 'Omar Alami',
      riskLevel: 'Low',
    },
  ];

  const departmentStats = [
    { department: 'Claims Processing', manager: 'Ahmed Ben Ali', efficiency: 92, claims: 156, budget: 850000 },
    { department: 'Expert Assessment', manager: 'Fatima Zahra', efficiency: 88, claims: 89, budget: 650000 },
    { department: 'Quality Control', manager: 'Omar Alami', efficiency: 95, claims: 45, budget: 420000 },
    { department: 'Legal Review', manager: 'Yasmine Rachid', efficiency: 84, claims: 23, budget: 380000 },
  ];

  return (
    <DashboardLayout 
      title="Senior Manager Dashboard" 
      userRole="MANAGER_SENIOR"
      navigation={navigation}
    >
      {/* Welcome Message */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">
          Welcome back, {user.firstName}!
        </h2>
        <p className="text-gray-600 mt-2">
          Strategic oversight and high-level decision making for the claims department.
        </p>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Claims Value"
          value="MAD 2.3M"
          icon={DollarSign}
          color="blue"
          subtitle="This month"
          trend={{ value: 15, isPositive: true }}
        />
        <StatCard
          title="Department Efficiency"
          value="91%"
          icon={TrendingUp}
          color="green"
          subtitle="Average across all teams"
          trend={{ value: 8, isPositive: true }}
        />
        <StatCard
          title="High-Value Claims"
          value="12"
          icon={Flag}
          color="red"
          subtitle="Requiring senior approval"
        />
        <StatCard
          title="Revenue Impact"
          value="MAD 8.7M"
          icon={Target}
          color="purple"
          subtitle="Prevented fraudulent claims"
          trend={{ value: 22, isPositive: true }}
        />
      </div>

      {/* Strategic Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <ActionCard
          title="Strategic Overview"
          description="Company-wide performance metrics and KPIs"
          icon={BarChart}
          color="blue"
          buttonText="View Analytics"
          onClick={() => router.push('/dashboard/manager-senior/analytics')}
        />
        <ActionCard
          title="Department Review"
          description="Monitor and manage all department performances"
          icon={Users}
          color="green"
          buttonText="Manage Teams"
          onClick={() => router.push('/dashboard/manager-senior/departments')}
        />
        <ActionCard
          title="High-Value Claims"
          description="Review complex and high-value insurance claims"
          icon={Flag}
          color="red"
          buttonText="Review Claims"
          onClick={() => router.push('/dashboard/manager-senior/high-value')}
        />
        <ActionCard
          title="Policy Management"
          description="Create and update company policies"
          icon={FileCheck}
          color="purple"
          buttonText="Manage Policies"
          onClick={() => router.push('/dashboard/manager-senior/policies')}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* High-Value Claims Requiring Attention */}
        <div className="lg:col-span-2 bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                High-Value Claims ({'>'}MAD 100K)
              </h3>
              <button
                onClick={() => router.push('/dashboard/manager-senior/high-value')}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                View All
              </button>
            </div>
            <div className="space-y-4">
              {highValueClaims.map((claim) => (
                <div key={claim.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="shrink-0">
                        <div className={`w-4 h-4 rounded-full ${
                          claim.priority === 'Critical' ? 'bg-red-600' :
                          claim.priority === 'High' ? 'bg-red-500' : 'bg-yellow-500'
                        }`} />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{claim.id}</h4>
                        <p className="text-sm text-gray-500">{claim.type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">
                        MAD {claim.amount.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">Manager: {claim.manager}</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        claim.status === 'Pending Approval' ? 'bg-yellow-100 text-yellow-800' :
                        claim.status === 'Under Investigation' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {claim.status}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        claim.riskLevel === 'High' ? 'bg-red-100 text-red-800' :
                        claim.riskLevel === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {claim.riskLevel} Risk
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => router.push(`/dashboard/manager-senior/claims/${claim.id}`)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors"
                      >
                        Review
                      </button>
                      {claim.status === 'Pending Approval' && (
                        <button className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 transition-colors">
                          Approve
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar with Activity and Department Overview */}
        <div className="space-y-6">
          <RecentActivity activities={recentActivities} />
          
          {/* Department Performance Overview */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Department Overview
              </h3>
              <div className="space-y-4">
                {departmentStats.slice(0, 3).map((dept, index) => (
                  <div key={index} className="border-l-4 border-blue-500 pl-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{dept.department}</p>
                        <p className="text-xs text-gray-500">Manager: {dept.manager}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">{dept.efficiency}%</p>
                        <p className="text-xs text-gray-500">{dept.claims} claims</p>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${dept.efficiency}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => router.push('/dashboard/manager-senior/departments')}
                  className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  View All Departments
                </button>
              </div>
            </div>
          </div>

          {/* Executive Summary */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Executive Summary
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Monthly Budget</span>
                  <span className="text-sm font-medium text-gray-900">MAD 2.3M</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Budget Utilization</span>
                  <span className="text-sm font-medium text-gray-900">78%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">ROI</span>
                  <span className="text-sm font-medium text-green-600">+24%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Fraud Prevention</span>
                  <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                    Excellent
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Customer Satisfaction</span>
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-900 mr-2">4.6/5</span>
                    <Award className="w-4 h-4 text-yellow-500" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}