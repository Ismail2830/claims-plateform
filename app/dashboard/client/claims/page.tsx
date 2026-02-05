'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSimpleAuth } from '@/app/hooks/useSimpleAuth';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/app/components/dashboard/DashboardLayout';
import { trpc } from '@/app/lib/trpc-client';
import { 
  FileText, 
  Shield, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  DollarSign,
  Calendar,
  MapPin,
  Filter,
  Search,
  RefreshCw,
  Eye
} from 'lucide-react';

interface Claim {
  claimId: string;
  claimNumber: string;
  claimType: string;
  incidentDate: string;
  declarationDate: string;
  incidentLocation: string;
  description: string;
  claimedAmount: number;
  estimatedAmount: number | null;
  approvedAmount: number | null;
  status: string;
  priority: string;
  declarationChannel: string;
  policy: {
    policyNumber: string;
    policyType: string;
  };
  createdAt: string;
}

export default function ClientClaimsPage() {
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const auth = useSimpleAuth();
  const router = useRouter();
  const { user, token, isLoading } = auth;

  // Use tRPC hook to fetch claims
  const {
    data: claimsResponse,
    isLoading: claimsLoading,
    error: claimsError,
    refetch: refetchClaims,
  } = trpc.clientAuth.getClaims.useQuery(
    {
      status: filterStatus || undefined,
      limit: 50,
      offset: 0,
    },
    {
      enabled: !!token, // Only run query when token is available
      retry: 2,
      staleTime: 30000, // Consider data fresh for 30 seconds
    }
  );

  const claims = claimsResponse?.data?.claims || [];
  const loading = claimsLoading;
  const error = claimsError ? 'Failed to fetch claims' : null;

  // Authentication redirect
  useEffect(() => {
    if (!isLoading && !token) {
      router.push('/auth/login');
    }
  }, [token, isLoading, router]);

  // Navigation items
  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard/client',
      icon: <Shield className="w-5 h-5" />,
    },
    {
      name: 'My Claims',
      href: '/dashboard/client/claims',
      icon: <FileText className="w-5 h-5" />,
      current: true,
    },
    {
      name: 'My Policies',
      href: '/dashboard/client/policies',
      icon: <Shield className="w-5 h-5" />,
    },
    {
      name: 'Create Claim',
      href: '/dashboard/client/create-claim',
      icon: <FileText className="w-5 h-5" />,
    },
  ];

  // Filter claims based on search term
  const filteredClaims = claims.filter(claim =>
    claim.claimNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    claim.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    claim.claimType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'REJECTED':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'DECLARED':
        return <Clock className="w-5 h-5 text-blue-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      case 'DECLARED':
        return 'bg-blue-100 text-blue-800';
      case 'ANALYZING':
        return 'bg-yellow-100 text-yellow-800';
      case 'DOCS_REQUIRED':
        return 'bg-orange-100 text-orange-800';
      case 'UNDER_EXPERTISE':
        return 'bg-purple-100 text-purple-800';
      case 'IN_DECISION':
        return 'bg-indigo-100 text-indigo-800';
      case 'IN_PAYMENT':
        return 'bg-emerald-100 text-emerald-800';
      case 'CLOSED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-100 text-red-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      case 'LOW':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="My Claims" userRole="CLIENT" navigation={navigation}>
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-600">Loading...</span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="My Claims" userRole="CLIENT" navigation={navigation}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">My Claims</h2>
            <p className="text-gray-600">Track and manage your insurance claims</p>
          </div>
          <button
            onClick={() => router.push('/claims/create')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FileText className="w-4 h-4 mr-2" />
            Create New Claim
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search claims..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Status</option>
                <option value="DECLARED">Declared</option>
                <option value="ANALYZING">Analyzing</option>
                <option value="DOCS_REQUIRED">Docs Required</option>
                <option value="UNDER_EXPERTISE">Under Expertise</option>
                <option value="IN_DECISION">In Decision</option>
                <option value="APPROVED">Approved</option>
                <option value="IN_PAYMENT">In Payment</option>
                <option value="CLOSED">Closed</option>
                <option value="REJECTED">Rejected</option>
              </select>
              <button
                onClick={() => refetchClaims()}
                className="px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Claims List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
            <span className="ml-2 text-gray-600">Loading claims...</span>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <XCircle className="w-5 h-5 text-red-500 mr-2" />
              <p className="text-red-700">{error}</p>
            </div>
            <button
              onClick={() => refetchClaims()}
              className="mt-2 text-red-600 hover:text-red-800 underline"
            >
              Try again
            </button>
          </div>
        ) : filteredClaims.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No claims found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || filterStatus 
                ? 'Try adjusting your filters to see more results.'
                : "You haven't submitted any claims yet."}
            </p>
            {!searchTerm && !filterStatus && (
              <button
                onClick={() => router.push('/claims/create')}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FileText className="w-4 h-4 mr-2" />
                Create Your First Claim
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredClaims.map((claim) => (
              <motion.div
                key={claim.claimId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      {getStatusIcon(claim.status)}
                      <h3 className="text-lg font-semibold text-gray-900">
                        {claim.claimNumber}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(claim.status)}`}>
                        {claim.status.replace('_', ' ')}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(claim.priority)}`}>
                        {claim.priority}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="space-y-2">
                        <div className="flex items-center text-sm text-gray-600">
                          <Shield className="w-4 h-4 mr-2" />
                          Policy: {claim.policy.policyNumber} ({claim.policy.policyType})
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="w-4 h-4 mr-2" />
                          Incident: {new Date(claim.incidentDate).toLocaleDateString()}
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="w-4 h-4 mr-2" />
                          Location: {claim.incidentLocation}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center text-sm text-gray-600">
                          <FileText className="w-4 h-4 mr-2" />
                          Type: {claim.claimType}
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <DollarSign className="w-4 h-4 mr-2" />
                          Claimed: MAD {claim.claimedAmount.toLocaleString()}
                        </div>
                        {claim.approvedAmount && (
                          <div className="flex items-center text-sm text-green-600 font-medium">
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Approved: MAD {claim.approvedAmount.toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="text-gray-700 mb-3 line-clamp-2">
                      {claim.description}
                    </p>

                    <div className="text-xs text-gray-500">
                      Submitted: {new Date(claim.declarationDate).toLocaleDateString()} 
                      via {claim.declarationChannel}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}