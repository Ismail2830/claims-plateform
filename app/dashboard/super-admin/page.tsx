'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useSimpleAuth } from '@/app/hooks/useSimpleAuth';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/app/components/dashboard/DashboardLayout';
import { StatCard, ActionCard, RecentActivity } from '@/app/components/dashboard/DashboardWidgets';
import EntityManagement from '@/app/components/dashboard/EntityManagement';
import { 
  userAPI, 
  clientAPI, 
  policyAPI, 
  claimAPI, 
  getSystemStats
} from '../../lib/api/superAdminAPI';
import { useRealTimeUpdates } from '../../hooks/useRealTimeUpdates';
import { 
  Settings,
  Users, 
  Shield,
  Database,
  BarChart,
  FileText,
  UserPlus,
  Globe,
  Lock,
  TrendingUp,
  AlertTriangle,
  Server,
  Activity,
  CreditCard,
  RefreshCw
} from 'lucide-react';

export default function SuperAdminDashboard() {
  const { user, isLoading } = useSimpleAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [activeEntityTab, setActiveEntityTab] = useState('users');
  const [systemStats, setSystemStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Real-time updates
  const { events, connectionState } = useRealTimeUpdates(['USER', 'CLIENT', 'POLICY', 'CLAIM']);

  // Load system stats
  const loadSystemStats = useCallback(async () => {
    try {
      setLoading(true);
      const stats = await getSystemStats();
      setSystemStats(stats);
    } catch (error) {
      console.error('Error loading system stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadSystemStats();
    }
  }, [user, loadSystemStats]);

  // Refresh stats when real-time events occur
  useEffect(() => {
    if (events.length > 0) {
      const latestEvent = events[events.length - 1];
      if (['entity_created', 'entity_updated', 'entity_deleted', 'bulk_operation'].includes(latestEvent.type)) {
        // Debounced refresh to avoid too many API calls
        const timeoutId = setTimeout(loadSystemStats, 1000);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [events, loadSystemStats]);

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
      name: 'Overview',
      href: '/dashboard/super-admin',
      icon: <BarChart className="w-5 h-5" />,
      current: activeTab === 'overview',
    },
    {
      name: 'Entity Management',
      href: '#',
      icon: <Database className="w-5 h-5" />,
      current: activeTab === 'entities',
      children: [
        { name: 'Users', icon: <Users className="w-4 h-4" />, key: 'users' },
        { name: 'Clients', icon: <UserPlus className="w-4 h-4" />, key: 'clients' },
        { name: 'Policies', icon: <Shield className="w-4 h-4" />, key: 'policies' },
        { name: 'Claims', icon: <FileText className="w-4 h-4" />, key: 'claims' },
      ],
    },
    {
      name: 'System Settings',
      href: '/dashboard/super-admin/settings',
      icon: <Settings className="w-5 h-5" />,
    },
    {
      name: 'Security & Audit',
      href: '/dashboard/super-admin/security',
      icon: <Lock className="w-5 h-5" />,
    },
    {
      name: 'System Monitoring',
      href: '/dashboard/super-admin/monitoring',
      icon: <Activity className="w-5 h-5" />,
    },
    {
      name: 'Financial Overview',
      href: '/dashboard/super-admin/financial',
      icon: <CreditCard className="w-5 h-5" />,
    },
  ];

  const recentActivities = events.slice(-5).map((event) => ({
    id: event.id,
    type: event.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    description: `${event.entityType} ${event.type.replace('_', ' ')} - ID: ${event.entityId}`,
    timestamp: new Date(event.timestamp).toLocaleString(),
    status: (event.riskLevel === 'HIGH' ? 'error' : event.riskLevel === 'MEDIUM' ? 'warning' : 'success') as 'error' | 'warning' | 'success' | 'info',
  }));

  const systemAlerts = [
    {
      id: 'ALERT-001',
      type: 'Connection',
      message: `Real-time connection: ${connectionState}`,
      severity: connectionState === 'connected' ? 'Low' : 'High',
      timestamp: new Date().toLocaleString(),
      resolved: connectionState === 'connected',
    },
    {
      id: 'ALERT-002',
      type: 'Performance',
      message: 'Database query optimization needed',
      severity: 'Medium',
      timestamp: '1 hour ago',
      resolved: false,
    },
    {
      id: 'ALERT-003',
      type: 'Capacity',
      message: 'Storage usage at 85%',
      severity: 'Low',
      timestamp: '2 hours ago',
      resolved: true,
    },
  ];

  const systemMetrics = {
    uptime: '99.97%',
    responseTime: '124ms',
    dailyActiveUsers: 456,
    monthlyTransactions: 12847,
    storageUsed: '2.3TB',
    bandwidth: '147GB',
  };

  return (
    <DashboardLayout 
      title="Super Admin Dashboard" 
      userRole="SUPER_ADMIN"
      navigation={navigation}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
    >
      {activeTab === 'overview' && (
        <>
          {/* Welcome Message */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">
              System Administration Center
            </h2>
            <p className="text-gray-600 mt-2">
              Complete platform management, user administration, and system oversight with real-time monitoring.
            </p>
          </div>

          {/* Real-time Connection Status */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${
                connectionState === 'connected' ? 'bg-green-500 animate-pulse' : 
                connectionState === 'connecting' ? 'bg-yellow-500 animate-spin' : 
                'bg-red-500'
              }`}></div>
              <span className="text-sm text-gray-600">
                Real-time Updates: {connectionState}
              </span>
              <span className="text-xs text-gray-400">
                ({events.length} events received)
              </span>
            </div>
            <button
              onClick={loadSystemStats}
              disabled={loading}
              className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {/* System Health Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total Users"
              value={loading ? '...' : systemStats?.users.total.toLocaleString() || '0'}
              icon={Users}
              color="blue"
              subtitle="Platform users"
              trend={{ 
                value: systemStats?.users.stats?.find((s: any) => s.role === 'ALL')?.growth || 0, 
                isPositive: true 
              }}
            />
            <StatCard
              title="Active Clients" 
              value={loading ? '...' : systemStats?.clients.total.toLocaleString() || '0'}
              icon={UserPlus}
              color="green"
              subtitle="Client accounts"
              trend={{ 
                value: systemStats?.clients.stats?.find((s: any) => s.status === 'ACTIVE')?.growth || 0, 
                isPositive: true 
              }}
            />
            <StatCard
              title="Active Policies"
              value={loading ? '...' : systemStats?.policies.total.toLocaleString() || '0'}
              icon={Shield}
              color="purple"
              subtitle={`${systemStats?.policies.expiring || 0} expiring soon`}
              trend={{ 
                value: systemStats?.policies.stats?.find((s: any) => s.status === 'ACTIVE')?.growth || 0, 
                isPositive: true 
              }}
            />
            <StatCard
              title="Open Claims"
              value={loading ? '...' : systemStats?.claims.total.toLocaleString() || '0'}
              icon={FileText}
              color="orange"
              subtitle="Pending resolution"
              trend={{ 
                value: systemStats?.claims.stats?.find((s: any) => s.status === 'OPEN')?.growth || 0, 
                isPositive: false 
              }}
            />
          </div>

          {/* Expert Workload Overview */}
          {systemStats?.claims?.workload && systemStats.claims.workload.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Expert Workload Distribution</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {systemStats.claims.workload.map((expert: any) => (
                  <div key={expert.userId} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">
                        {expert.firstName} {expert.lastName}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        expert.workloadPercentage > 90 ? 'bg-red-100 text-red-800' :
                        expert.workloadPercentage > 70 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {expert.workloadPercentage}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>{expert.currentWorkload} / {expert.maxWorkload}</span>
                      <span>{expert.role}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* System Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Response Time"
              value={systemMetrics.responseTime}
              icon={Activity}
              color="yellow"
              subtitle="Average API response"
            />
            <StatCard
              title="Daily Active Users"
              value={systemMetrics.dailyActiveUsers.toLocaleString()}
              icon={Globe}
              color="green"
              subtitle="Currently online"
            />
            <StatCard
              title="Storage Usage"
              value={systemMetrics.storageUsed}
              icon={Database}
              color="red"
              subtitle="85% capacity"
            />
            <StatCard
              title="Monthly Transactions"
              value={systemMetrics.monthlyTransactions.toLocaleString()}
              icon={TrendingUp}
              color="blue"
              subtitle="Business metrics"
            />
          </div>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <ActionCard
              title="User Management"
              description="Create, modify, and manage user accounts across all roles"
              icon={Users}
              color="blue"
              onClick={() => setActiveTab('entities')}
              buttonText="Manage Users"
            />
            <ActionCard
              title="Security Operations"
              description="Monitor threats, manage access, and audit system security"
              icon={Shield}
              color="red"
              onClick={() => {}}
              buttonText="Security Dashboard"
            />
            <ActionCard
              title="System Health"
              description="Monitor performance, manage resources, and system maintenance"
              icon={Activity}
              color="green"
              onClick={() => {}}
              buttonText="System Metrics"
            />
          </div>

          {/* Recent Activities and Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <RecentActivity 
              activities={recentActivities}
              title="Real-time System Events"
            />
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">System Alerts</h3>
              <div className="space-y-4">
                {systemAlerts.map((alert) => (
                  <div 
                    key={alert.id} 
                    className={`p-4 rounded-lg border-l-4 ${
                      alert.severity === 'High' ? 'border-red-500 bg-red-50' :
                      alert.severity === 'Medium' ? 'border-yellow-500 bg-yellow-50' :
                      'border-green-500 bg-green-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <AlertTriangle className={`w-4 h-4 mr-2 ${
                          alert.severity === 'High' ? 'text-red-500' :
                          alert.severity === 'Medium' ? 'text-yellow-500' :
                          'text-green-500'
                        }`} />
                        <span className="font-medium">{alert.type}</span>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        alert.resolved ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {alert.resolved ? 'Resolved' : 'Active'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                    <p className="text-xs text-gray-500 mt-2">{alert.timestamp}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'entities' && (
        <>
          {/* Entity Management Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">
              Entity Management Center
            </h2>
            <p className="text-gray-600 mt-2">
              Complete control over all platform entities with full CRUD operations, bulk actions, real-time updates, and advanced management tools.
            </p>
          </div>

          {/* Entity Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total Users"
              value={loading ? '...' : systemStats?.users.total.toLocaleString() || '0'}
              icon={Users}
              color="blue"
              subtitle="All user accounts"
              trend={{ 
                value: systemStats?.users.stats?.find((s: any) => s.role === 'ALL')?.growth || 0, 
                isPositive: true 
              }}
            />
            <StatCard
              title="Active Clients"
              value={loading ? '...' : systemStats?.clients.total.toLocaleString() || '0'}
              icon={UserPlus}
              color="green"
              subtitle="Client accounts"
              trend={{ 
                value: systemStats?.clients.stats?.find((s: any) => s.status === 'ACTIVE')?.growth || 0, 
                isPositive: true 
              }}
            />
            <StatCard
              title="Active Policies"
              value={loading ? '...' : systemStats?.policies.total.toLocaleString() || '0'}
              icon={Shield}
              color="purple"
              subtitle="Insurance policies"
              trend={{ 
                value: systemStats?.policies.stats?.find((s: any) => s.status === 'ACTIVE')?.growth || 0, 
                isPositive: true 
              }}
            />
            <StatCard
              title="Open Claims"
              value={loading ? '...' : systemStats?.claims.total.toLocaleString() || '0'}
              icon={FileText}
              color="orange"
              subtitle="Pending claims"
              trend={{ 
                value: systemStats?.claims.stats?.find((s: any) => s.status === 'OPEN')?.growth || 0, 
                isPositive: false 
              }}
            />
          </div>

          {/* Entity Management Interface */}
          <EntityManagement 
            activeEntityTab={activeEntityTab}
            setActiveEntityTab={setActiveEntityTab}
          />
        </>
      )}
    </DashboardLayout>
  );
}