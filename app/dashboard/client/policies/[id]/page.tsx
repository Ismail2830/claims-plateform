'use client';

import React, { useEffect } from 'react';
import { useLocale } from '@/app/hooks/useLocale';
import enMessages from '@/messages/en.json';
import frMessages from '@/messages/fr.json';
import arMessages from '@/messages/ar.json';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useSimpleAuth } from '@/app/hooks/useSimpleAuth';
import ClientLayout from '@/app/components/dashboard/ClientLayout';
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
  ChevronLeft,
  Download,
  PlusCircle,
  Banknote,
  BarChart3,
  Info,
  RefreshCw,
  Eye,
} from 'lucide-react';

/* ─────────────────────── helpers ─────────────────────── */

const CLAIM_STATUS_COLORS: Record<string, string> = {
  DECLARED: 'bg-blue-100 text-blue-800',
  ANALYZING: 'bg-yellow-100 text-yellow-800',
  DOCS_REQUIRED: 'bg-orange-100 text-orange-800',
  UNDER_EXPERTISE: 'bg-purple-100 text-purple-800',
  IN_DECISION: 'bg-indigo-100 text-indigo-800',
  APPROVED: 'bg-green-100 text-green-800',
  IN_PAYMENT: 'bg-emerald-100 text-emerald-800',
  CLOSED: 'bg-gray-100 text-gray-700',
  REJECTED: 'bg-red-100 text-red-800',
};

const POLICY_STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  EXPIRED: 'bg-gray-100 text-gray-700',
  CANCELED: 'bg-red-100 text-red-800',
  SUSPENDED: 'bg-yellow-100 text-yellow-800',
};

const POLICY_TYPE_LABELS: Record<string, string> = {
  AUTO: 'Auto Insurance',
  HOME: 'Home Insurance',
  HEALTH: 'Health Insurance',
  LIFE: 'Life Insurance',
};

const COVERAGE_DETAILS: Record<string, { limits: string[]; exclusions: string[] }> = {
  AUTO: {
    limits: [
      'Third-party liability (bodily injury & property damage)',
      'Collision and comprehensive coverage',
      'Uninsured/underinsured motorist protection',
      'Roadside assistance and towing',
    ],
    exclusions: [
      'Damage due to intentional acts or gross negligence',
      'Racing or off-road use',
      'Commercial vehicle use without endorsement',
      'Mechanical or electrical failure',
    ],
  },
  HOME: {
    limits: [
      'Structure / dwelling replacement',
      'Personal property content coverage',
      'Liability protection for injuries on premises',
      'Additional living expenses (ALE)',
    ],
    exclusions: [
      'Flood damage (requires separate policy)',
      'Earthquake damage (requires endorsement)',
      'Normal wear and tear',
      'Pest or vermin damage',
    ],
  },
  HEALTH: {
    limits: [
      'In-patient hospitalization and surgery',
      'Specialist and GP consultations',
      'Diagnostic tests and laboratory fees',
      'Prescription drugs and pharmacy',
    ],
    exclusions: [
      'Pre-existing conditions (first 12 months)',
      'Cosmetic or elective surgery',
      'Dental and optical (base plan)',
      'Treatment outside approved network',
    ],
  },
  LIFE: {
    limits: [
      'Death benefit paid to named beneficiaries',
      'Terminal illness accelerated benefit',
      'Accidental death double indemnity rider',
      'Waiver of premium on disability',
    ],
    exclusions: [
      'Suicide within first two policy years',
      'Death arising from war or terrorism',
      'Death during participation in felony',
      'Misrepresentation at policy inception',
    ],
  },
};

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function nextDueDate(startDate: string): Date {
  const start = new Date(startDate);
  const now = new Date();
  const due = new Date(start);
  while (due <= now) due.setMonth(due.getMonth() + 1);
  return due;
}

function paymentSchedule(startDate: string, endDate: string, annualPremium: number) {
  const months: { month: string; amount: number; dueDate: Date }[] = [];
  const monthly = annualPremium / 12;
  const start = new Date(startDate);
  const end = new Date(endDate);
  let cursor = new Date(start);
  while (cursor <= end) {
    months.push({
      month: cursor.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
      amount: monthly,
      dueDate: new Date(cursor),
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
}

function daysUntil(d: string) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

/* ─────────────────────── sub-components ─────────────────────── */

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="shrink-0 mt-0.5 text-gray-400">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <div className="text-sm font-medium text-gray-900">{value}</div>
      </div>
    </div>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-6 py-4 border-b bg-gray-50">
        <span className="text-blue-600">{icon}</span>
        <h3 className="font-semibold text-gray-800">{title}</h3>
      </div>
      <div className="px-6 py-4">{children}</div>
    </div>
  );
}

/* ─────────────────────── main page ─────────────────────── */

export default function PolicyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const policyId = params?.id as string;

  const { token, isLoading } = useSimpleAuth();
  const { locale } = useLocale();
  const messages = locale === 'fr' ? frMessages : locale === 'ar' ? arMessages : enMessages;
  const navMsgs = messages.navigation;

  useEffect(() => {
    if (!isLoading && !token) router.push('/auth/login');
  }, [token, isLoading, router]);

  const { data: res, isLoading: loading } = trpc.clientAuth.getPolicyDetail.useQuery(
    { policyId },
    { enabled: !!token && !!policyId, staleTime: 30000, retry: 2 }
  );

  const policy = res?.data;



  if (isLoading || loading) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center py-24">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-500">Loading policy details...</span>
        </div>
      </ClientLayout>
    );
  }

  if (!policy) {
    return (
      <ClientLayout>
        <div className="text-center py-24">
          <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700">Policy not found</h3>
          <button
            onClick={() => router.push('/dashboard/client/policies')}
            className="mt-4 text-blue-600 hover:underline text-sm"
          >
            ← Back to My Policies
          </button>
        </div>
      </ClientLayout>
    );
  }

  const annualPremium = Number(policy.premiumAmount);
  const monthlyPremium = annualPremium / 12;
  const insuredAmount = Number(policy.insuredAmount);
  const deductible = Number(policy.deductible);
  const daysLeft = daysUntil(String(policy.endDate));
  const coverageInfo = COVERAGE_DETAILS[policy.policyType] ?? COVERAGE_DETAILS.AUTO;
  const schedule = paymentSchedule(
    String(policy.startDate),
    String(policy.endDate),
    annualPremium
  );
  const next = nextDueDate(String(policy.startDate));
  const upcomingPayments = schedule.filter((s) => s.dueDate >= new Date()).slice(0, 3);

  return (
    <ClientLayout>
      <div className="space-y-6 max-w-5xl">

        {/* Back + Header */}
        <div>
          <button
            onClick={() => router.push('/dashboard/client/policies')}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 mb-4 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back to My Policies
          </button>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-linear-to-r from-blue-600 to-blue-800 rounded-2xl p-6 text-white"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <div>
                  <p className="text-blue-200 text-sm mb-1">{POLICY_TYPE_LABELS[policy.policyType]}</p>
                  <h1 className="text-2xl font-bold font-mono">{policy.policyNumber}</h1>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${POLICY_STATUS_COLORS[policy.status]}`}>
                      {policy.status === 'ACTIVE' && <CheckCircle className="w-3 h-3" />}
                      {policy.status === 'EXPIRED' && <Clock className="w-3 h-3" />}
                      {policy.status === 'SUSPENDED' && <AlertCircle className="w-3 h-3" />}
                      {policy.status === 'CANCELED' && <XCircle className="w-3 h-3" />}
                      {policy.status.charAt(0) + policy.status.slice(1).toLowerCase()}
                    </span>
                    {policy.status === 'ACTIVE' && daysLeft <= 30 && daysLeft > 0 && (
                      <span className="text-amber-300 text-xs font-medium">
                        ⚠ {daysLeft} days remaining
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-blue-200 text-xs mb-1">Insured Amount</p>
                <p className="text-3xl font-bold">MAD {insuredAmount.toLocaleString()}</p>
                <p className="text-blue-200 text-sm mt-1">
                  MAD {annualPremium.toLocaleString()} / year
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* 2-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Policy Overview */}
          <SectionCard title="Policy Overview" icon={<Info className="w-5 h-5" />}>
            <InfoRow
              icon={<Calendar className="w-4 h-4" />}
              label="Coverage Period"
              value={`${fmt(String(policy.startDate))} → ${fmt(String(policy.endDate))}`}
            />
            <InfoRow
              icon={<Shield className="w-4 h-4" />}
              label="Policy Type"
              value={POLICY_TYPE_LABELS[policy.policyType]}
            />
            {policy.coverageType && (
              <InfoRow
                icon={<FileText className="w-4 h-4" />}
                label="Coverage Type"
                value={policy.coverageType}
              />
            )}
            <InfoRow
              icon={<DollarSign className="w-4 h-4" />}
              label="Annual Premium"
              value={`MAD ${annualPremium.toLocaleString()}`}
            />
            <InfoRow
              icon={<DollarSign className="w-4 h-4" />}
              label="Monthly Premium"
              value={`MAD ${monthlyPremium.toFixed(2)}`}
            />
            <InfoRow
              icon={<DollarSign className="w-4 h-4" />}
              label="Deductible"
              value={deductible > 0 ? `MAD ${deductible.toLocaleString()}` : 'None'}
            />
            <InfoRow
              icon={<Calendar className="w-4 h-4" />}
              label="Policy Issued"
              value={fmt(String(policy.createdAt))}
            />
          </SectionCard>

          {/* Payment Schedule */}
          <SectionCard title="Payment Schedule" icon={<Banknote className="w-5 h-5" />}>
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-xs text-blue-500 mb-1">Next Due Date</p>
              <p className="text-sm font-semibold text-blue-800">
                {next.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
              <p className="text-xs text-blue-500 mt-0.5">
                MAD {monthlyPremium.toFixed(2)} due
              </p>
            </div>
            <p className="text-xs text-gray-500 font-medium mb-2">Upcoming payments</p>
            {upcomingPayments.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No upcoming payments</p>
            ) : (
              <div className="space-y-2">
                {upcomingPayments.map((p, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-blue-500' : 'bg-gray-300'}`} />
                      <span className="text-sm text-gray-700">{p.month}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-800">
                      MAD {p.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Coverage Limits */}
          <SectionCard title="Coverage & Limits" icon={<BarChart3 className="w-5 h-5" />}>
            <ul className="space-y-2 mb-5">
              {coverageInfo.limits.map((l, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  {l}
                </li>
              ))}
            </ul>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Exclusions</p>
            <ul className="space-y-2">
              {coverageInfo.exclusions.map((e, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-500">
                  <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  {e}
                </li>
              ))}
            </ul>
          </SectionCard>

          {/* Policy Document */}
          <SectionCard title="Policy Document" icon={<Download className="w-5 h-5" />}>
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="p-4 bg-blue-50 rounded-full mb-4">
                <FileText className="w-10 h-10 text-blue-500" />
              </div>
              <p className="font-semibold text-gray-800 mb-1">
                {policy.policyNumber}.pdf
              </p>
              <p className="text-sm text-gray-400 mb-5">
                Your official policy document containing full terms and conditions.
              </p>
              <button
                disabled
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium opacity-60 cursor-not-allowed"
                title="Document download is currently unavailable"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </button>
              <p className="text-xs text-gray-400 mt-2">
                Contact your agent if the document is unavailable.
              </p>
            </div>
          </SectionCard>
        </div>

        {/* Linked Claims */}
        <SectionCard
          title={`Linked Claims (${policy.claims.length})`}
          icon={<FileText className="w-5 h-5" />}
        >
          {policy.claims.length === 0 ? (
            <div className="text-center py-10">
              <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No claims filed under this policy yet.</p>
              <button
                onClick={() => router.push('/dashboard/client/claims/new')}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <PlusCircle className="w-4 h-4" /> File a Claim
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wide">
                    <th className="pb-3 text-left font-semibold pr-4">Claim #</th>
                    <th className="pb-3 text-left font-semibold pr-4">Type</th>
                    <th className="pb-3 text-left font-semibold pr-4">Incident Date</th>
                    <th className="pb-3 text-left font-semibold pr-4">Claimed</th>
                    <th className="pb-3 text-left font-semibold pr-4">Approved</th>
                    <th className="pb-3 text-left font-semibold pr-4">Status</th>
                    <th className="pb-3 text-left font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {policy.claims.map((claim: any) => (
                    <tr key={claim.claimId} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 pr-4 font-mono font-semibold text-gray-800">
                        {claim.claimNumber}
                      </td>
                      <td className="py-3 pr-4 text-gray-600">
                        {claim.claimType.replace('_', ' ')}
                      </td>
                      <td className="py-3 pr-4 text-gray-600">
                        {fmt(claim.incidentDate)}
                      </td>
                      <td className="py-3 pr-4 text-gray-700">
                        {claim.claimedAmount ? `MAD ${Number(claim.claimedAmount).toLocaleString()}` : '—'}
                      </td>
                      <td className="py-3 pr-4">
                        {claim.approvedAmount ? (
                          <span className="font-semibold text-green-700">
                            MAD {Number(claim.approvedAmount).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${CLAIM_STATUS_COLORS[claim.status] ?? 'bg-gray-100 text-gray-700'}`}>
                          {claim.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3">
                        <button
                          onClick={() => router.push('/dashboard/client/claims')}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>
    </ClientLayout>
  );
}
