'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSimpleAuth } from '@/app/hooks/useSimpleAuth';
import { useRouter } from 'next/navigation';
import ClientLayout from '@/app/components/dashboard/ClientLayout';
import ClaimDetailsModal from '@/app/components/dashboard/ClaimDetailsModal';
import { trpc } from '@/app/lib/trpc-client';
import { NextIntlClientProvider, useTranslations } from 'next-intl';
import { useLocale } from '@/app/hooks/useLocale';
import enMessages from '@/messages/en.json';
import frMessages from '@/messages/fr.json';
import arMessages from '@/messages/ar.json';
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

type ClaimStatus = 'DECLARED' | 'ANALYZING' | 'DOCS_REQUIRED' | 'UNDER_EXPERTISE' | 'IN_DECISION' | 'APPROVED' | 'IN_PAYMENT' | 'CLOSED' | 'REJECTED';

interface Claim {
  claimId: string;
  claimNumber: string;
  claimType: string;
  incidentDate: string;
  declarationDate: string;
  incidentLocation: string;
  description: string;
  claimedAmount: number | null;
  estimatedAmount: number | null;
  approvedAmount: number | null;
  status: string;
  priority: string;
  declarationChannel: string;
  policy: {
    policyNumber: string;
    policyType: string;
  } | null;
  createdAt: string;
}

export function ClientClaimsContent() {
  const t = useTranslations('claims');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Claim Details Modal
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<any>(null);

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
      status: (filterStatus as ClaimStatus) || undefined,
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

  // Claim Modal Handlers
  const handleViewClaimDetails = (claim: any) => {
    // Ensure dates are converted to strings for the modal
    const formattedClaim = {
      ...claim,
      incidentDate: claim.incidentDate instanceof Date ? claim.incidentDate.toISOString() : claim.incidentDate,
      declarationDate: claim.declarationDate instanceof Date ? claim.declarationDate.toISOString() : claim.declarationDate,
      createdAt: claim.createdAt instanceof Date ? claim.createdAt.toISOString() : claim.createdAt,
    };
    setSelectedClaim(formattedClaim);
    setShowClaimModal(true);
  };

  const handleClaimUpdate = async (claimId: string, data: any) => {
    try {
      // For clients, we might want to use a different API endpoint or show a message
      // that they need to contact support for updates
      console.log('Client claim update requested:', claimId, data);
      // You can implement client-specific claim update logic here
      // For now, we'll just show a success message
      alert('Your update request has been noted. A representative will contact you soon.');
      refetchClaims();
    } catch (error) {
      console.error('Error updating claim:', error);
      throw error;
    }
  };

  const handleClaimDelete = async (claimId: string) => {
    try {
      // For clients, deletion might not be allowed or require approval
      console.log('Client claim deletion requested:', claimId);
      // You can implement client-specific claim deletion logic here
      alert('Your deletion request has been noted. A representative will contact you soon.');
    } catch (error) {
      console.error('Error deleting claim:', error);
      throw error;
    }
  };

  // Authentication redirect
  useEffect(() => {
    if (!isLoading && !token) {
      router.push('/auth/login');
    }
  }, [token, isLoading, router]);



  // Filter claims based on search term
  const filteredClaims = claims.filter((claim: any) =>
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
      <ClientLayout>
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-600">{t('loading')}</span>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{t('title')}</h2>
            <p className="text-gray-600">{t('subtitle')}</p>
          </div>
          <button
            onClick={() => router.push('/dashboard/client/claims/new')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FileText className="w-4 h-4 mr-2" />
            {t('createNew')}
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
                  placeholder={t('searchPlaceholder')}
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
                <option value="">{t('allStatus')}</option>
                <option value="DECLARED">{t('statuses.DECLARED')}</option>
                <option value="ANALYZING">{t('statuses.ANALYZING')}</option>
                <option value="DOCS_REQUIRED">{t('statuses.DOCS_REQUIRED')}</option>
                <option value="UNDER_EXPERTISE">{t('statuses.UNDER_EXPERTISE')}</option>
                <option value="IN_DECISION">{t('statuses.IN_DECISION')}</option>
                <option value="APPROVED">{t('statuses.APPROVED')}</option>
                <option value="IN_PAYMENT">{t('statuses.IN_PAYMENT')}</option>
                <option value="CLOSED">{t('statuses.CLOSED')}</option>
                <option value="REJECTED">{t('statuses.REJECTED')}</option>
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
            <span className="ml-2 text-gray-600">{t('loadingClaims')}</span>
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
              {t('tryAgain')}
            </button>
          </div>
        ) : filteredClaims.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('noClaimsFound')}</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || filterStatus 
                ? t('noClaimsFiltered')
                : t('noClaimsYet')}
            </p>
            {!searchTerm && !filterStatus && (
              <button
                onClick={() => router.push('/dashboard/client/claims/new')}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FileText className="w-4 h-4 mr-2" />
                {t('createFirstClaim')}
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
                          {t('policy')}: {claim.policy?.policyNumber || 'N/A'} ({claim.policy?.policyType || 'N/A'})
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="w-4 h-4 mr-2" />
                          {t('incident')}: {new Date(claim.incidentDate).toLocaleDateString()}
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="w-4 h-4 mr-2" />
                          {t('location')}: {claim.incidentLocation}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center text-sm text-gray-600">
                          <FileText className="w-4 h-4 mr-2" />
                          {t('type')}: {claim.claimType}
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <DollarSign className="w-4 h-4 mr-2" />
                          {t('claimed')}: MAD {claim.claimedAmount?.toLocaleString() || '0'}
                        </div>
                        {claim.approvedAmount && (
                          <div className="flex items-center text-sm text-green-600 font-medium">
                            <CheckCircle className="w-4 h-4 mr-2" />
                            {t('approved')}: MAD {claim.approvedAmount.toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="text-gray-700 mb-3 line-clamp-2">
                      {claim.description}
                    </p>

                    <div className="text-xs text-gray-500">
                      {t('submitted')}: {new Date(claim.declarationDate).toLocaleDateString()} 
                      {t('via')} {claim.declarationChannel}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={() => handleViewClaimDetails(claim)}
                      className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      {t('viewDetails')}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Claim Details Modal */}
      {showClaimModal && selectedClaim && (
        <ClaimDetailsModal
          claim={selectedClaim}
          isOpen={showClaimModal}
          onClose={() => {
            setShowClaimModal(false);
            setSelectedClaim(null);
          }}
          onUpdate={handleClaimUpdate}
          onDelete={handleClaimDelete}
        />
      )}
    </ClientLayout>
  );
}

export default function ClientClaimsPage() {
  const { locale } = useLocale();
  const messages = locale === 'fr' ? frMessages : locale === 'ar' ? arMessages : enMessages;
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <ClientClaimsContent />
    </NextIntlClientProvider>
  );
}