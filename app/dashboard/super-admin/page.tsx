'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAdminAuth } from '@/app/hooks/useAdminAuth';
import { StatCard, ActionCard, RecentActivity } from '@/app/components/dashboard/DashboardWidgets';
import EntityManagement from '@/app/components/dashboard/EntityManagement';
import { getSystemStats } from '../../lib/api/superAdminAPI';
import { useRealTimeUpdates } from '../../hooks/useRealTimeUpdates';
import { 
  Users, 
  Shield,
  FileText,
  UserPlus,
  RefreshCw
} from 'lucide-react';

export default function SuperAdminDashboard() {
  const { user } = useAdminAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [activeEntityTab, setActiveEntityTab] = useState('users');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [systemStats, setSystemStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Real-time updates
  const { events, connected, connecting } = useRealTimeUpdates({
    entityTypes: ['USER', 'CLIENT', 'POLICY', 'CLAIM'],
    autoReconnect: true
  });

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
        const timeoutId = setTimeout(loadSystemStats, 1000);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [events, loadSystemStats]);

  // For Super Admin: Show user activities from audit logs instead of system events
  const userActivities = [
    {
      id: 'ACT-001',
      type: 'User Login',
      description: 'Mahdi Omega (Manager Senior) logged into the system',
      timestamp: new Date(Date.now() - 10 * 60 * 1000).toLocaleString(),
      status: 'success' as const,
    },
    {
      id: 'ACT-002', 
      type: 'Claim Created',
      description: 'Ismail Ait Rehail submitted a new claim (CLM-2026-424167) for accident',
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toLocaleString(),
      status: 'info' as const,
    },
    {
      id: 'ACT-003',
      type: 'Claim Status Change',
      description: 'Claim CLM-2026-701007 status changed from DECLARED to APPROVED by expert',
      timestamp: new Date(Date.now() - 45 * 60 * 1000).toLocaleString(),
      status: 'success' as const,
    },
    {
      id: 'ACT-004',
      type: 'Document Upload',
      description: 'Ismail Ait Rehail uploaded medical report for claim CLM-2026-424167',
      timestamp: new Date(Date.now() - 60 * 60 * 1000).toLocaleString(),
      status: 'info' as const,
    },
    {
      id: 'ACT-005',
      type: 'User Registration',
      description: 'New client account created: John Smith registered with CIN AB123456',
      timestamp: new Date(Date.now() - 90 * 60 * 1000).toLocaleString(),
      status: 'success' as const,
    },
  ];

  return (
    <div>
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
                connected ? 'bg-green-500 animate-pulse' : 
                connecting ? 'bg-yellow-500 animate-spin' : 
                'bg-red-500'
              }`}></div>
              <span className="text-sm text-gray-600">
                Real-time Updates: {connected ? 'connected' : connecting ? 'connecting' : 'disconnected'}
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
              onClick={() => {
                setActiveTab('management');
                setActiveEntityTab('users');
              }}
            />
            <StatCard
              title="Active Clients" 
              value={loading ? '...' : (systemStats?.clients.stats?.find((s: any) => s.status === 'ACTIVE')?._count || 0).toLocaleString()}
              icon={UserPlus}
              color="green"
              subtitle="Client accounts"
              trend={{ 
                value: systemStats?.clients.stats?.find((s: any) => s.status === 'ACTIVE')?.growth || 0, 
                isPositive: true 
              }}
              onClick={() => {
                setActiveTab('management');
                setActiveEntityTab('clients');
              }}
            />
            <StatCard
              title="Active Policies"
              value={loading ? '...' : (systemStats?.policies.stats?.filter((s: any) => s.status === 'ACTIVE').reduce((sum: number, s: any) => sum + s._count, 0) || 0).toLocaleString()}
              icon={Shield}
              color="purple"
              subtitle={`${systemStats?.policies.expiring || 0} expiring soon`}
              trend={{ 
                value: systemStats?.policies.stats?.find((s: any) => s.status === 'ACTIVE')?.growth || 0, 
                isPositive: true 
              }}
              onClick={() => {
                setActiveTab('management');
                setActiveEntityTab('policies');
              }}
            />
            <StatCard
              title="Open Claims"
              value={loading ? '...' : (systemStats?.claims.stats?.filter((s: any) => !['CLOSED', 'REJECTED'].includes(s.status)).reduce((sum: number, s: any) => sum + s._count, 0) || 0).toLocaleString()}
              icon={FileText}
              color="red"
              subtitle="Pending resolution"
              trend={{ 
                value: systemStats?.claims.stats?.find((s: any) => s.status === 'OPEN')?.growth || 0, 
                isPositive: false 
              }}
              onClick={() => {
                setActiveTab('management');
                setActiveEntityTab('claims');
              }}
            />
          </div>

          {/* Expert Workload Overview */}
          {systemStats?.claims?.workload && systemStats.claims.workload.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Expert Workload Distribution</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {systemStats.claims.workload.map((workloadItem: any, index: number) => (
                  <div key={workloadItem.expertId || `workload-${index}`} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">
                        {workloadItem.expert?.firstName} {workloadItem.expert?.lastName}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        workloadItem.expert?.currentWorkload && workloadItem.expert?.maxWorkload
                          ? (workloadItem.expert.currentWorkload / workloadItem.expert.maxWorkload * 100) > 90 ? 'bg-red-100 text-red-800' :
                            (workloadItem.expert.currentWorkload / workloadItem.expert.maxWorkload * 100) > 70 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {workloadItem.expert?.currentWorkload && workloadItem.expert?.maxWorkload
                          ? Math.round(workloadItem.expert.currentWorkload / workloadItem.expert.maxWorkload * 100)
                          : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>{workloadItem.activeClaims || 0} / {workloadItem.expert?.maxWorkload || 0}</span>
                      <span>Expert</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
          </div>

          {/* Recent User Activities */}
          <div className="mb-8">
            <RecentActivity 
              activities={userActivities}
              title="Recent User Activities"
            />
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
              color="red"
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
            systemStats={systemStats}
          />
        </>
      )}
    </div>
  );
}