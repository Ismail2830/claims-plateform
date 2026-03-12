'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Search,
  RefreshCw,
  Eye,
  ChevronDown,
  ChevronUp,
  Download,
  Paperclip,
  Image as ImageIcon,
  File,
  Plus,
  TrendingUp,
} from 'lucide-react';

type ClaimStatus = 'DECLARED' | 'ANALYZING' | 'DOCS_REQUIRED' | 'UNDER_EXPERTISE' | 'IN_DECISION' | 'APPROVED' | 'IN_PAYMENT' | 'CLOSED' | 'REJECTED';

interface ClaimDocument {
  documentId: string;
  originalName: string;
  fileType: string;
  mimeType: string;
  fileSize: number;
  filePath: string;
  status: string;
  createdAt: string;
}

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
  documents: ClaimDocument[];
  createdAt: string;
}

// ── Status metadata ─────────────────────────────────────────────────────────

const STATUS_STEPS = [
  'DECLARED', 'ANALYZING', 'DOCS_REQUIRED', 'UNDER_EXPERTISE',
  'IN_DECISION', 'APPROVED', 'IN_PAYMENT', 'CLOSED',
] as const;

function getStatusMeta(status: string): {
  label: string; colorClass: string; borderClass: string; bgClass: string; icon: React.ReactNode;
} {
  switch (status) {
    case 'DECLARED':
      return { label: 'Déclaré', colorClass: 'text-blue-700', borderClass: 'border-blue-500', bgClass: 'bg-blue-50', icon: <Clock className="w-4 h-4 text-blue-600" /> };
    case 'ANALYZING':
      return { label: 'En analyse', colorClass: 'text-yellow-700', borderClass: 'border-yellow-500', bgClass: 'bg-yellow-50', icon: <AlertCircle className="w-4 h-4 text-yellow-600" /> };
    case 'DOCS_REQUIRED':
      return { label: 'Documents requis', colorClass: 'text-orange-700', borderClass: 'border-orange-500', bgClass: 'bg-orange-50', icon: <Paperclip className="w-4 h-4 text-orange-600" /> };
    case 'UNDER_EXPERTISE':
      return { label: 'En instruction', colorClass: 'text-purple-700', borderClass: 'border-purple-500', bgClass: 'bg-purple-50', icon: <TrendingUp className="w-4 h-4 text-purple-600" /> };
    case 'IN_DECISION':
      return { label: 'En décision', colorClass: 'text-indigo-700', borderClass: 'border-indigo-500', bgClass: 'bg-indigo-50', icon: <AlertCircle className="w-4 h-4 text-indigo-600" /> };
    case 'APPROVED':
      return { label: 'Approuvé', colorClass: 'text-green-700', borderClass: 'border-green-500', bgClass: 'bg-green-50', icon: <CheckCircle className="w-4 h-4 text-green-600" /> };
    case 'IN_PAYMENT':
      return { label: 'En paiement', colorClass: 'text-emerald-700', borderClass: 'border-emerald-500', bgClass: 'bg-emerald-50', icon: <DollarSign className="w-4 h-4 text-emerald-600" /> };
    case 'CLOSED':
      return { label: 'Clôturé', colorClass: 'text-gray-700', borderClass: 'border-gray-400', bgClass: 'bg-gray-50', icon: <CheckCircle className="w-4 h-4 text-gray-500" /> };
    case 'REJECTED':
      return { label: 'Rejeté', colorClass: 'text-red-700', borderClass: 'border-red-500', bgClass: 'bg-red-50', icon: <XCircle className="w-4 h-4 text-red-600" /> };
    default:
      return { label: status, colorClass: 'text-gray-700', borderClass: 'border-gray-400', bgClass: 'bg-gray-50', icon: <AlertCircle className="w-4 h-4 text-gray-500" /> };
  }
}

function getPriorityBadge(priority: string) {
  switch (priority) {
    case 'URGENT': return 'bg-red-100 text-red-700 border border-red-200';
    case 'HIGH':   return 'bg-orange-100 text-orange-700 border border-orange-200';
    case 'NORMAL': return 'bg-blue-100 text-blue-700 border border-blue-200';
    case 'LOW':    return 'bg-green-100 text-green-700 border border-green-200';
    default:       return 'bg-gray-100 text-gray-700 border border-gray-200';
  }
}

function getDocIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return <ImageIcon className="w-4 h-4 text-blue-500" />;
  if (mimeType === 'application/pdf') return <File className="w-4 h-4 text-red-500" />;
  return <FileText className="w-4 h-4 text-gray-500" />;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Status progress bar ─────────────────────────────────────────────────────

function StatusProgress({ status }: { status: string }) {
  if (status === 'REJECTED') {
    return (
      <div className="flex items-center gap-1.5 mt-3">
        <XCircle className="w-4 h-4 text-red-500 shrink-0" />
        <span className="text-xs text-red-600 font-medium">Dossier rejeté</span>
      </div>
    );
  }
  const currentIdx = STATUS_STEPS.indexOf(status as typeof STATUS_STEPS[number]);
  const total = STATUS_STEPS.length;
  const pct = currentIdx >= 0 ? Math.round(((currentIdx + 1) / total) * 100) : 0;

  return (
    <div className="mt-3">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>Progression du dossier</span>
        <span>{pct}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div
          className="h-1.5 rounded-full bg-linear-to-r from-blue-500 to-indigo-600 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Document row ─────────────────────────────────────────────────────────────

function DocumentRow({ doc, token }: { doc: ClaimDocument; token: string | null }) {
  const handleDownload = async () => {
    if (!token) return;
    const res = await fetch(`/api/client/documents/${doc.documentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) { alert('Impossible de télécharger ce fichier.'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.originalName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleView = () => {
    if (!token) return;
    // Open in new tab by creating a temporary blob URL via fetch
    fetch(`/api/client/documents/${doc.documentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      })
      .catch(() => alert('Impossible d\'ouvrir ce fichier.'));
  };

  const isImage = doc.mimeType.startsWith('image/');
  const isPdf = doc.mimeType === 'application/pdf';

  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors group">
      <div className="flex items-center gap-2 min-w-0">
        {getDocIcon(doc.mimeType)}
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate max-w-50 sm:max-w-xs">
            {doc.originalName}
          </p>
          <p className="text-xs text-gray-400">
            {formatFileSize(doc.fileSize)} · {new Date(doc.createdAt).toLocaleDateString('fr-FR')}
          </p>
        </div>
        {doc.status === 'VERIFIED' && (
          <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-green-100 text-green-700 rounded">
            <CheckCircle className="w-3 h-3" /> Vérifié
          </span>
        )}
        {doc.status === 'REJECTED' && (
          <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-red-100 text-red-700 rounded">
            <XCircle className="w-3 h-3" /> Rejeté
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0 ml-2">
        {(isImage || isPdf) && (
          <button
            onClick={handleView}
            title="Aperçu"
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={handleDownload}
          title="Télécharger"
          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Claim card ────────────────────────────────────────────────────────────────

function ClaimCard({
  claim,
  token,
  onViewDetails,
}: {
  claim: Claim;
  token: string | null;
  onViewDetails: (claim: Claim) => void;
}) {
  const [docsOpen, setDocsOpen] = useState(false);
  const meta = getStatusMeta(claim.status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-xl shadow-sm border-l-4 ${meta.borderClass} border border-gray-100 overflow-hidden`}
    >
      {/* Card header strip */}
      <div className={`${meta.bgClass} px-5 py-3 flex flex-wrap items-center justify-between gap-2`}>
        <div className="flex items-center gap-2">
          {meta.icon}
          <span className="font-bold text-gray-900 text-base tracking-wide">{claim.claimNumber}</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${meta.colorClass} bg-white/70 border ${meta.borderClass}`}>
            {meta.label}
          </span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getPriorityBadge(claim.priority)}`}>
            {claim.priority}
          </span>
        </div>
        <button
          onClick={() => onViewDetails(claim)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-white rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          Voir les détails
        </button>
      </div>

      {/* Card body */}
      <div className="px-5 py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm mb-3">
          {/* Column 1 */}
          <div className="space-y-2">
            <div className="flex items-start gap-2 text-gray-600">
              <Shield className="w-4 h-4 shrink-0 mt-0.5 text-gray-400" />
              <div>
                <span className="text-xs text-gray-400 block">Police</span>
                <span className="font-medium text-gray-800">
                  {claim.policy?.policyNumber ?? 'N/A'}
                  {claim.policy?.policyType ? ` (${claim.policy.policyType})` : ''}
                </span>
              </div>
            </div>
            <div className="flex items-start gap-2 text-gray-600">
              <FileText className="w-4 h-4 shrink-0 mt-0.5 text-gray-400" />
              <div>
                <span className="text-xs text-gray-400 block">Type</span>
                <span className="font-medium text-gray-800">{claim.claimType}</span>
              </div>
            </div>
          </div>

          {/* Column 2 */}
          <div className="space-y-2">
            <div className="flex items-start gap-2 text-gray-600">
              <Calendar className="w-4 h-4 shrink-0 mt-0.5 text-gray-400" />
              <div>
                <span className="text-xs text-gray-400 block">Date sinistre</span>
                <span className="font-medium text-gray-800">
                  {new Date(claim.incidentDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
            <div className="flex items-start gap-2 text-gray-600">
              <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-gray-400" />
              <div>
                <span className="text-xs text-gray-400 block">Lieu</span>
                <span className="font-medium text-gray-800">{claim.incidentLocation}</span>
              </div>
            </div>
          </div>

          {/* Column 3 — amounts */}
          <div className="space-y-2">
            <div className="flex items-start gap-2 text-gray-600">
              <DollarSign className="w-4 h-4 shrink-0 mt-0.5 text-gray-400" />
              <div>
                <span className="text-xs text-gray-400 block">Réclamé</span>
                <span className="font-semibold text-gray-800">
                  MAD {claim.claimedAmount?.toLocaleString('fr-FR') ?? '—'}
                </span>
              </div>
            </div>
            {claim.approvedAmount != null && (
              <div className="flex items-start gap-2 text-green-600">
                <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs text-green-500 block">Approuvé</span>
                  <span className="font-semibold">MAD {claim.approvedAmount.toLocaleString('fr-FR')}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {claim.description && (
          <p className="text-sm text-gray-600 line-clamp-2 mb-2">{claim.description}</p>
        )}

        {/* Submission meta */}
        <p className="text-xs text-gray-400">
          Soumis le {new Date(claim.declarationDate).toLocaleDateString('fr-FR')} via {claim.declarationChannel}
        </p>

        {/* Progress bar */}
        <StatusProgress status={claim.status} />

        {/* Documents section */}
        {claim.documents.length > 0 && (
          <div className="mt-4 border-t border-gray-100 pt-3">
            <button
              onClick={() => setDocsOpen((prev) => !prev)}
              className="flex items-center justify-between w-full text-sm font-medium text-gray-700 hover:text-blue-700 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Paperclip className="w-4 h-4" />
                Documents joints
                <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 font-semibold">
                  {claim.documents.length}
                </span>
              </span>
              {docsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            <AnimatePresence>
              {docsOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 space-y-1.5">
                    {claim.documents.map((doc) => (
                      <DocumentRow key={doc.documentId} doc={doc} token={token} />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* No documents yet */}
        {claim.documents.length === 0 && (
          <div className="mt-4 border-t border-gray-100 pt-3 flex items-center gap-2 text-xs text-gray-400">
            <Paperclip className="w-3.5 h-3.5" />
            Aucun document joint pour l&apos;instant
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Main page component ───────────────────────────────────────────────────────

export function ClientClaimsContent() {
  const t = useTranslations('claims');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Claim Details Modal
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<any>(null);

  const auth = useSimpleAuth();
  const router = useRouter();
  const { token, isLoading } = auth;

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
      enabled: !!token,
      retry: 2,
      staleTime: 30000,
    }
  );

  const claims: Claim[] = (claimsResponse?.data?.claims ?? []).map((c: any) => ({
    ...c,
    documents: c.documents ?? [],
  }));

  const loading = claimsLoading;
  const error = claimsError ? 'Failed to fetch claims' : null;

  const handleViewClaimDetails = (claim: Claim) => {
    const formatted = {
      ...claim,
      incidentDate: claim.incidentDate instanceof Date ? (claim.incidentDate as Date).toISOString() : claim.incidentDate,
      declarationDate: claim.declarationDate instanceof Date ? (claim.declarationDate as Date).toISOString() : claim.declarationDate,
      createdAt: claim.createdAt instanceof Date ? (claim.createdAt as Date).toISOString() : claim.createdAt,
    };
    setSelectedClaim(formatted);
    setShowClaimModal(true);
  };

  const handleClaimUpdate = async (claimId: string, data: any) => {
    console.log('Client claim update requested:', claimId, data);
    alert('Votre demande de modification a été notée. Un conseiller vous contactera bientôt.');
    refetchClaims();
  };

  const handleClaimDelete = async (claimId: string) => {
    console.log('Client claim deletion requested:', claimId);
    alert('Votre demande a été notée. Un conseiller vous contactera bientôt.');
  };

  useEffect(() => {
    if (!isLoading && !token) {
      router.push('/auth/login');
    }
  }, [token, isLoading, router]);

  const filteredClaims = claims.filter((claim) =>
    claim.claimNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    claim.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    claim.claimType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Summary counts
  const totalClaims = claims.length;
  const pendingCount = claims.filter((c) => !['CLOSED', 'REJECTED', 'APPROVED'].includes(c.status)).length;
  const approvedCount = claims.filter((c) => c.status === 'APPROVED' || c.status === 'IN_PAYMENT' || c.status === 'CLOSED').length;

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
            <p className="text-gray-500 text-sm mt-0.5">{t('subtitle')}</p>
          </div>
          <button
            onClick={() => router.push('/dashboard/client/claims/new')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('createNew')}
          </button>
        </div>

        {/* Summary stats */}
        {!loading && totalClaims > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{totalClaims}</p>
              <p className="text-xs text-gray-500 mt-0.5">Total sinistres</p>
            </div>
            <div className="bg-white rounded-xl border border-orange-100 shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-orange-600">{pendingCount}</p>
              <p className="text-xs text-gray-500 mt-0.5">En cours</p>
            </div>
            <div className="bg-white rounded-xl border border-green-100 shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
              <p className="text-xs text-gray-500 mt-0.5">Approuvés / Clôturés</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder={t('searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                className="px-3 py-2 text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                title="Rafraîchir"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Claims list */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-7 h-7 animate-spin text-blue-500" />
            <span className="ml-2 text-gray-500">{t('loadingClaims')}</span>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-red-700 text-sm">{error}</p>
              <button onClick={() => refetchClaims()} className="text-red-600 underline text-xs mt-1">
                {t('tryAgain')}
              </button>
            </div>
          </div>
        ) : filteredClaims.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{t('noClaimsFound')}</h3>
            <p className="text-gray-500 text-sm mb-5">
              {searchTerm || filterStatus ? t('noClaimsFiltered') : t('noClaimsYet')}
            </p>
            {!searchTerm && !filterStatus && (
              <button
                onClick={() => router.push('/dashboard/client/claims/new')}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                {t('createFirstClaim')}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredClaims.map((claim) => (
              <ClaimCard
                key={claim.claimId}
                claim={claim}
                token={token}
                onViewDetails={handleViewClaimDetails}
              />
            ))}
          </div>
        )}
      </div>

      {showClaimModal && selectedClaim && (
        <ClaimDetailsModal
          claim={selectedClaim}
          isOpen={showClaimModal}
          onClose={() => { setShowClaimModal(false); setSelectedClaim(null); }}
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