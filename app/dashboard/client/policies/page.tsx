'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSimpleAuth } from '@/app/hooks/useSimpleAuth';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/app/components/dashboard/DashboardLayout';
import { trpc } from '@/app/lib/trpc-client';
import {
  Shield,
  FileText,
  Calendar,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Search,
  RefreshCw,
  Eye,
  PlusCircle,
  ChevronRight,
} from 'lucide-react';

type PolicyStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELED' | 'SUSPENDED';
type PolicyType = 'AUTO' | 'HOME' | 'HEALTH' | 'LIFE';

const STATUS_STYLES: Record<PolicyStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  EXPIRED: 'bg-gray-100 text-gray-700',
  CANCELED: 'bg-red-100 text-red-800',
  SUSPENDED: 'bg-yellow-100 text-yellow-800',
};

const TYPE_STYLES: Record<PolicyType, { bg: string; icon: React.ReactNode; label: string }> = {
  AUTO: {
    bg: 'bg-blue-50 border-blue-200',
    icon: <Shield className="w-6 h-6 text-blue-500" />,
    label: 'Auto Insurance',
  },
  HOME: {
    bg: 'bg-emerald-50 border-emerald-200',
    icon: <Shield className="w-6 h-6 text-emerald-500" />,
    label: 'Home Insurance',
  },
  HEALTH: {
    bg: 'bg-pink-50 border-pink-200',
    icon: <Shield className="w-6 h-6 text-pink-500" />,
    label: 'Health Insurance',
  },
  LIFE: {
    bg: 'bg-purple-50 border-purple-200',
    icon: <Shield className="w-6 h-6 text-purple-500" />,
    label: 'Life Insurance',
  },
};

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status as PolicyStatus] ?? 'bg-gray-100 text-gray-700';
  const icons: Record<string, React.ReactNode> = {
    ACTIVE: <CheckCircle className="w-3.5 h-3.5" />,
    EXPIRED: <Clock className="w-3.5 h-3.5" />,
    CANCELED: <XCircle className="w-3.5 h-3.5" />,
    SUSPENDED: <AlertCircle className="w-3.5 h-3.5" />,
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${style}`}>
      {icons[status]}
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

function isExpiringSoon(endDate: string): boolean {
  const days = (new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return days > 0 && days <= 30;
}

export default function ClientPoliciesPage() {
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const { user, token, isLoading } = useSimpleAuth();
  const router = useRouter();

  const { data: policiesRes, isLoading: loading, refetch } = trpc.clientAuth.getPolicies.useQuery(
    undefined,
    { enabled: !!token, staleTime: 30000, retry: 2 }
  );

  useEffect(() => {
    if (!isLoading && !token) router.push('/auth/login');
  }, [token, isLoading, router]);

  const allPolicies: any[] = policiesRes?.data ?? [];

  const filtered = allPolicies.filter((p) => {
    const matchesStatus = !filterStatus || p.status === filterStatus;
    const matchesSearch =
      !searchTerm ||
      p.policyNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.policyType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.coverageType ?? '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const navigation = [
    { name: 'Dashboard', href: '/dashboard/client', icon: <Shield className="w-5 h-5" /> },
    { name: 'My Claims', href: '/dashboard/client/claims', icon: <FileText className="w-5 h-5" /> },
    { name: 'My Policies', href: '/dashboard/client/policies', icon: <Shield className="w-5 h-5" />, current: true },
    { name: 'Create Claim', href: '/claims/create', icon: <PlusCircle className="w-5 h-5" /> },
    { name: 'Profile', href: '/dashboard/client/profile', icon: <CheckCircle className="w-5 h-5" /> },
  ];

  // Stats
  const totalActive = allPolicies.filter((p) => p.status === 'ACTIVE').length;
  const totalExpiring = allPolicies.filter((p) => p.status === 'ACTIVE' && isExpiringSoon(p.endDate)).length;

  if (isLoading) {
    return (
      <DashboardLayout title="My Policies" userRole="CLIENT" navigation={navigation}>
        <div className="flex items-center justify-center py-24">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="My Policies" userRole="CLIENT" navigation={navigation}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">My Policies</h2>
            <p className="text-gray-500 text-sm mt-1">
              {totalActive} active {totalActive === 1 ? 'policy' : 'policies'}
              {totalExpiring > 0 && (
                <span className="ml-2 text-amber-600 font-medium">
                  · {totalExpiring} expiring soon
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {(['ACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELED'] as PolicyStatus[]).map((s) => {
            const count = allPolicies.filter((p) => p.status === s).length;
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(filterStatus === s ? '' : s)}
                className={`rounded-lg p-4 border text-left transition-all ${
                  filterStatus === s
                    ? 'ring-2 ring-blue-400 border-blue-300 bg-blue-50'
                    : 'bg-white border-gray-200 hover:border-blue-200'
                }`}
              >
                <p className="text-2xl font-bold text-gray-900">{count}</p>
                <p className={`text-xs font-semibold mt-1 ${STATUS_STYLES[s]?.split(' ')[1] ?? 'text-gray-600'}`}>
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </p>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm border flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by policy number, type or coverage..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="EXPIRED">Expired</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="CANCELED">Canceled</option>
          </select>
          <button
            onClick={() => refetch()}
            className="px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-7 h-7 animate-spin text-blue-500" />
            <span className="ml-2 text-gray-500">Loading policies...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg border">
            <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-1">No policies found</h3>
            <p className="text-gray-400 text-sm">
              {searchTerm || filterStatus
                ? 'Try adjusting your filters.'
                : 'You have no policies on your account.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((policy) => {
              const meta = TYPE_STYLES[policy.policyType as PolicyType] ?? TYPE_STYLES.AUTO;
              const expiring = policy.status === 'ACTIVE' && isExpiringSoon(policy.endDate);
              const claimCount = policy._count?.claims ?? 0;

              return (
                <motion.div
                  key={policy.policyId}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`bg-white rounded-xl border-2 p-6 hover:shadow-md transition-all ${meta.bg}`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Left: icon + main info */}
                    <div className="flex items-start gap-4 flex-1">
                      <div className="p-3 bg-white rounded-lg shadow-sm border shrink-0">
                        {meta.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-base font-bold text-gray-900 font-mono">
                            {policy.policyNumber}
                          </span>
                          <StatusBadge status={policy.status} />
                          {expiring && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                              <AlertCircle className="w-3 h-3" /> Expiring soon
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-gray-600 mb-3">{meta.label}</p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="w-4 h-4 shrink-0 text-gray-400" />
                            <span>
                              {new Date(policy.startDate).toLocaleDateString()} →{' '}
                              <span className={policy.status === 'EXPIRED' ? 'text-red-600 font-medium' : ''}>
                                {new Date(policy.endDate).toLocaleDateString()}
                              </span>
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <DollarSign className="w-4 h-4 shrink-0 text-gray-400" />
                            <span>
                              <span className="font-semibold text-gray-800">
                                MAD {Number(policy.premiumAmount).toLocaleString()}
                              </span>
                              {' '}/ year
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Shield className="w-4 h-4 shrink-0 text-gray-400" />
                            <span>
                              Coverage:{' '}
                              <span className="font-semibold text-gray-800">
                                MAD {Number(policy.insuredAmount).toLocaleString()}
                              </span>
                            </span>
                          </div>
                          {policy.coverageType && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <FileText className="w-4 h-4 shrink-0 text-gray-400" />
                              <span>{policy.coverageType}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <FileText className="w-4 h-4 shrink-0 text-gray-400" />
                            <span>{claimCount} linked {claimCount === 1 ? 'claim' : 'claims'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: action */}
                    <div className="shrink-0">
                      <button
                        onClick={() => router.push(`/dashboard/client/policies/${policy.policyId}`)}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        View Details
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
