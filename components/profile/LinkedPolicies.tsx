'use client';

import React from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Calendar, DollarSign, ArrowRight, FileText } from 'lucide-react';
import type { LinkedPolicy } from '@/types/profile';

interface LinkedPoliciesProps {
  policies: LinkedPolicy[];
}

const POLICY_TYPE_ICONS: Record<LinkedPolicy['policyType'], React.ReactNode> = {
  AUTO: <span className="text-lg">🚗</span>,
  HOME: <span className="text-lg">🏠</span>,
  HEALTH: <span className="text-lg">🏥</span>,
  LIFE: <span className="text-lg">💙</span>,
};

const STATUS_CONFIG: Record<
  LinkedPolicy['status'],
  { label: string; className: string }
> = {
  ACTIVE: { label: 'Active', className: 'bg-green-100 text-green-700 border-green-200' },
  EXPIRED: { label: 'Expired', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  CANCELED: { label: 'Canceled', className: 'bg-red-100 text-red-700 border-red-200' },
  SUSPENDED: { label: 'Suspended', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}

export function LinkedPolicies({ policies }: LinkedPoliciesProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-500" />
            Linked Policies
          </CardTitle>
          <CardDescription className="mt-1">Insurance policies associated with your account.</CardDescription>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/client/policies">
            View All
            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {policies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400">
            <FileText className="w-12 h-12 mb-3 text-gray-200" />
            <p className="text-sm">No policies linked to your account.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {policies.map((policy) => {
              const status = STATUS_CONFIG[policy.status];
              return (
                <Link
                  key={policy.policyId}
                  href={`/dashboard/client/policies`}
                  className="group block rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md hover:border-blue-300 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {POLICY_TYPE_ICONS[policy.policyType]}
                      <div>
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{policy.policyType}</p>
                        <p className="text-sm font-semibold text-gray-800 font-mono">{policy.policyNumber}</p>
                      </div>
                    </div>
                    <Badge className={`${status.className} text-xs`}>{status.label}</Badge>
                  </div>

                  {policy.coverageType && (
                    <p className="text-xs text-gray-500 mb-3">{policy.coverageType}</p>
                  )}

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1 text-gray-400">
                        <DollarSign className="w-3 h-3" />
                        Coverage
                      </span>
                      <span className="font-semibold text-gray-700">{formatCurrency(policy.coverageAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1 text-gray-400">
                        <DollarSign className="w-3 h-3" />
                        Premium
                      </span>
                      <span className="text-gray-600">{formatCurrency(policy.premiumAmount)}/yr</span>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100 mt-2">
                      <span className="flex items-center gap-1 text-gray-400">
                        <Calendar className="w-3 h-3" />
                        Period
                      </span>
                      <span className="text-gray-600">
                        {new Date(policy.startDate).toLocaleDateString()} –{' '}
                        {new Date(policy.endDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center text-blue-500 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    View policy
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
