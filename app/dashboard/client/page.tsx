'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useSimpleAuth } from '@/app/hooks/useSimpleAuth';
import { useRouter, useSearchParams } from 'next/navigation';
import ClientLayout from '@/app/components/dashboard/ClientLayout';
import { StatCard, ActionCard, RecentActivity } from '@/app/components/dashboard/DashboardWidgets';
import { useClaimUpdates } from '@/app/hooks/useRealTimeUpdates';
import { trpc } from '@/app/lib/trpc-client';
import { NextIntlClientProvider, useTranslations } from 'next-intl';
import { useLocale } from '@/app/hooks/useLocale';
import enMessages from '@/messages/en.json';
import frMessages from '@/messages/fr.json';
import arMessages from '@/messages/ar.json';
import { 
  PlusCircle, 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Shield,
  DollarSign,
  Calendar,
  XCircle,
  MessageSquare
} from 'lucide-react';

function ClientDashboardContent() {
  const t = useTranslations('dashboard');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showRealTimeNotification, setShowRealTimeNotification] = useState(false);
  const [lastActivity, setLastActivity] = useState<string>('');
  const searchParams = useSearchParams();
  
  const auth = useSimpleAuth();
  const router = useRouter();
  const { user, token, isLoading } = auth;
  const isRedirecting = React.useRef(false);

  // Set up real-time updates for claim activities
  const realTimeUpdates = useClaimUpdates();
  const trpcUtils = trpc.useUtils();

  // Always call hooks in the same order - before any early returns
  // Fetch real data from tRPC
  const { data: dashboardStats, isLoading: statsLoading, error: statsError } = trpc.clientAuth.getDashboardStats.useQuery(
    undefined,
    { 
      enabled: !!token && !!user,
      refetchOnWindowFocus: false,
      retry: 1,
      // Add timeout to prevent hanging
      staleTime: 30000, // 30 seconds
      gcTime: 60000 // 1 minute (renamed from cacheTime)
    }
  );

  const { data: recentActivitiesData, isLoading: activitiesLoading, error: activitiesError } = trpc.clientAuth.getRecentActivities.useQuery(
    { limit: 5 },
    { 
      enabled: !!token && !!user,
      refetchOnWindowFocus: false,
      retry: 1,
      // Add timeout to prevent hanging
      staleTime: 30000, // 30 seconds
      gcTime: 60000 // 1 minute (renamed from cacheTime)
    }
  );

  // Handle real-time updates
  useEffect(() => {
    if (realTimeUpdates.lastEvent && user?.clientId) {
      const event = realTimeUpdates.lastEvent;
      
      // Only process events related to this client's claims
      if (event.entityType === 'CLAIM' && 
          event.data && 
          (event.data.clientId === user.clientId || event.data.client?.clientId === user.clientId)) {
        
        console.log('Received claim update for client:', event);
        
        // Show notification for new activity
        if (event.type === 'status_changed' || event.type === 'entity_updated') {
          setLastActivity(event.data.description || 'Your claim was updated');
          setShowRealTimeNotification(true);
          
          // Auto-hide notification after 5 seconds
          setTimeout(() => setShowRealTimeNotification(false), 5000);
        }
        
        // Refresh recent activities and stats
        trpcUtils.clientAuth.getRecentActivities.invalidate();
        trpcUtils.clientAuth.getDashboardStats.invalidate();
      }
    }
  }, [realTimeUpdates.lastEvent, user?.clientId, trpcUtils]);

  // Debug logging — stripped to avoid log spam
  useEffect(() => {
    if (statsError) console.error('Dashboard stats error:', statsError.message);
    if (activitiesError) console.error('Activities error:', activitiesError.message);
  }, [statsError, activitiesError]);

  useEffect(() => {
    // Only redirect if we're not loading and don't have a token
    if (!isLoading && !token && !isRedirecting.current) {
      isRedirecting.current = true;
      router.replace('/auth/login');
    }
    if (token) {
      isRedirecting.current = false;
    }
    // Check for success message
    if (searchParams.get('claim_created') === 'true') {
      setShowSuccess(true);
    }
  }, [token, isLoading, router, searchParams]);



  // Format the recent activities with relative timestamps
  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return t('justNow');
    if (diffInSeconds < 3600) return t('minutesAgo', { count: Math.floor(diffInSeconds / 60) });
    if (diffInSeconds < 86400) return t('hoursAgo', { count: Math.floor(diffInSeconds / 3600) });
    if (diffInSeconds < 2592000) return t('daysAgo', { count: Math.floor(diffInSeconds / 86400) });
    return date.toLocaleDateString();
  };

  // Show loading while checking authentication
  if (isLoading) {
    console.log('ClientDashboard: Showing loading state');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('loadingDashboard')}</p>
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
          <p className="text-gray-600">{t('redirectingToLogin')}</p>
        </div>
      </div>
    );
  }

  // If there are tRPC errors, show them for debugging
  if (statsError || activitiesError) {
    console.error('tRPC Errors Details:', { 
      statsError: {
        message: statsError?.message,
        code: (statsError as any)?.data?.code,
        cause: (statsError as any)?.cause,
        stack: (statsError as any)?.stack
      }, 
      activitiesError: {
        message: activitiesError?.message,
        code: (activitiesError as any)?.data?.code,
        cause: (activitiesError as any)?.cause,
        stack: (activitiesError as any)?.stack
      }
    });
  }

  // Prepare fallback data when queries fail
  const fallbackStats = {
    totalClaims: 0,
    pendingClaims: 0,
    approvedClaims: 0,
    rejectedClaims: 0,
    activePolicies: 0,
    totalCoverage: 0,
  };

  const fallbackActivities: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
    status: 'success' | 'warning' | 'error' | 'info';
  }> = [];

  // Use actual data if available, otherwise use fallbacks
  const stats = dashboardStats?.success ? dashboardStats.data : fallbackStats;
  const activities = recentActivitiesData?.success ? recentActivitiesData.data : fallbackActivities;

  // Show loading state if queries are still loading
  if (statsLoading || activitiesLoading) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">{t('loadingData')}</p>
          </div>
        </div>
      </ClientLayout>
    );
  }

  // Show error state only if both queries failed AND we don't have any cached data
  if (statsError && activitiesError && !dashboardStats && !recentActivitiesData) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <div className="text-red-600 mb-4">
              <AlertCircle className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('unableToLoad')}</h3>
            <p className="text-gray-600 mb-4">{t('unableToLoadDesc')}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {t('refreshPage')}
            </button>
          </div>
        </div>
      </ClientLayout>
    );
  }

  const formattedActivities = activities?.map((activity: any) => ({
    ...activity,
    timestamp: formatRelativeTime(new Date(activity.timestamp))
  })) || [];

  // Format currency
  const formatCurrency = (amount: number) => {
    const numAmount = typeof amount === 'number' ? amount : Number(amount) || 0;
    return new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: 'MAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numAmount);
  };

  return (
    <ClientLayout>
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
                {t('claimSubmittedSuccess')}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Real-time Activity Notification */}
      {showRealTimeNotification && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-400 rounded-md"
        >
          <div className="flex justify-between items-start">
            <div className="flex">
              <CheckCircle className="h-5 w-5 text-blue-400" />
              <div className="ml-3">
                <p className="text-sm text-blue-700 font-medium">
                  {t('newActivityUpdate')}
                </p>
                <p className="text-sm text-blue-600 mt-1">
                  {lastActivity}
                </p>
              </div>
            </div>
            <button 
              onClick={() => setShowRealTimeNotification(false)}
              className="text-blue-400 hover:text-blue-600"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Real-time Connection Status (only show if disconnected) */}
      {!realTimeUpdates.connected && !realTimeUpdates.connecting && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-md"
        >
          <div className="flex items-center">
            <AlertCircle className="h-4 w-4 text-yellow-500 mr-2" />
            <p className="text-sm text-yellow-700">
              {t('realTimeUnavailable')}{' '}
              <button 
                onClick={realTimeUpdates.reconnect} 
                className="text-yellow-800 underline hover:no-underline ml-1"
              >
                {t('reconnect')}
              </button>
            </p>
          </div>
        </motion.div>
      )}

      {/* Data Loading Warning */}
      {(statsError || activitiesError) && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-md"
        >
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                {t('dataNotCurrent')}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Welcome Message */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">
          {t('welcomeBack', { name: user?.firstName || 'Client' })}
        </h2>
        <p className="text-gray-600 mt-2">
          {t('overviewDesc')}
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title={t('stats.totalClaims')}
          value={statsLoading ? '...' : stats.totalClaims}
          icon={FileText}
          color="blue"
          subtitle={t('stats.allTime')}
        />
        <StatCard
          title={t('stats.pendingClaims')}
          value={statsLoading ? '...' : stats.pendingClaims}
          icon={Clock}
          color="yellow"
          subtitle={t('stats.underReview')}
        />
        <StatCard
          title={t('stats.activePolicies')}
          value={statsLoading ? '...' : stats.activePolicies}
          icon={Shield}
          color="green"
          subtitle={t('stats.currentlyCovered')}
        />
        <StatCard
          title={t('stats.totalCoverage')}
          value={statsLoading ? '...' : formatCurrency(Number(stats.totalCoverage) || 0)}
          icon={DollarSign}
          color="purple"
          subtitle={t('stats.combinedPolicies')}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <ActionCard
          title={t('actions.createNew')}
          description={t('actions.createNewDesc')}
          icon={PlusCircle}
          color="blue"
          buttonText={t('actions.startNew')}
          onClick={() => router.push('/claims/create')}
        />
        <ActionCard
          title={t('actions.trackClaims')}
          description={t('actions.trackClaimsDesc')}
          icon={FileText}
          color="green"
          buttonText={t('actions.viewMyClaims')}
          onClick={() => router.push('/dashboard/client/claims')}
        />
        <ActionCard
          title={t('actions.managePolicies')}
          description={t('actions.managePoliciesDesc')}
          icon={Shield}
          color="purple"
          buttonText={t('actions.viewPolicies')}
          onClick={() => router.push('/dashboard/client/policies')}
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {activitiesLoading ? (
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">{t('recentActivity')}</h3>
                <div className="space-y-4">
                  {[1, 2, 3].map((i: number) => (
                    <div key={i} className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <RecentActivity activities={formattedActivities} />
          )}
        </div>
        
        {/* Quick Info Panel */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              {t('quickInfo.title')}
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600">{t('quickInfo.lastLogin')}</span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {user?.lastLoginAt ? formatRelativeTime(new Date(user.lastLoginAt)) : t('quickInfo.today')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Shield className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600">{t('quickInfo.coverageStatus')}</span>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  stats.activePolicies > 0 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {stats.activePolicies > 0 ? t('quickInfo.active') : t('quickInfo.noCoverage')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600">{t('quickInfo.pendingClaims')}</span>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  stats.pendingClaims > 0 
                    ? 'bg-yellow-100 text-yellow-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {statsLoading ? '...' : `${stats.pendingClaims} ${t('quickInfo.pendingSuffix')}`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}

export default function ClientDashboard() {
  const { locale } = useLocale();
  const messages = locale === 'fr' ? frMessages : locale === 'ar' ? arMessages : enMessages;
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <Suspense fallback={<div>...</div>}>
        <ClientDashboardContent />
      </Suspense>
    </NextIntlClientProvider>
  );
}