'use client';

import React, { useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/app/components/dashboard/DashboardLayout';
import { ProfileTabs } from '@/components/profile/ProfileTabs';
import { LinkedPolicies } from '@/components/profile/LinkedPolicies';
import { useSimpleAuth } from '@/app/hooks/useSimpleAuth';
import { trpc } from '@/app/lib/trpc-client';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Toaster } from '@/components/ui/sonner';
import {
  Shield,
  FileText,
  PlusCircle,
  User,
  CheckCircle,
} from 'lucide-react';
import type {
  UserProfile,
  NotificationPreferences,
  ProfileDocument,
  LinkedPolicy,
} from '@/types/profile';

// ─── Navigation (mirrors client dashboard) ───────────────────────
function buildNav(isCurrent: (href: string) => boolean) {
  return [
    { name: 'Dashboard', href: '/dashboard/client', icon: <Shield className="w-5 h-5" />, current: isCurrent('/dashboard/client') },
    { name: 'My Claims', href: '/dashboard/client/claims', icon: <FileText className="w-5 h-5" />, current: isCurrent('/dashboard/client/claims') },
    { name: 'My Policies', href: '/dashboard/client/policies', icon: <Shield className="w-5 h-5" />, current: isCurrent('/dashboard/client/policies') },
    { name: 'Create Claim', href: '/claims/create', icon: <PlusCircle className="w-5 h-5" />, current: isCurrent('/claims/create') },
    { name: 'Profile', href: '/dashboard/client/profile', icon: <User className="w-5 h-5" />, current: isCurrent('/dashboard/client/profile') },
  ];
}

// ─── Skeleton Loader ──────────────────────────────────────────────
function ProfileSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Profile header skeleton */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col sm:flex-row items-center sm:items-start gap-5">
        <div className="w-20 h-20 rounded-full bg-gray-200 shrink-0" />
        <div className="space-y-2 flex-1 w-full">
          <div className="h-6 bg-gray-200 rounded w-40" />
          <div className="h-4 bg-gray-100 rounded w-60" />
          <div className="flex gap-2 mt-2">
            <div className="h-5 w-16 bg-gray-200 rounded-full" />
            <div className="h-5 w-20 bg-gray-200 rounded-full" />
          </div>
        </div>
      </div>
      {/* Tabs skeleton */}
      <div className="h-12 bg-gray-200 rounded-xl w-full" />
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
            <div className="h-5 bg-gray-200 rounded w-32" />
            <div className="h-4 bg-gray-100 rounded w-full" />
            <div className="h-4 bg-gray-100 rounded w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Profile Header ───────────────────────────────────────────────
function ProfileHeader({ profile }: { profile: UserProfile }) {
  const initials = `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase();
  const memberSince = new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const statusColors: Record<UserProfile['status'], string> = {
    ACTIVE: 'bg-green-100 text-green-700 border-green-200',
    INACTIVE: 'bg-gray-100 text-gray-600 border-gray-200',
    SUSPENDED: 'bg-red-100 text-red-700 border-red-200',
    PENDING_VERIFICATION: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    BLOCKED: 'bg-red-200 text-red-800 border-red-300',
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
        {/* Avatar */}
        <div className="shrink-0">
          <Avatar className="w-20 h-20 ring-4 ring-blue-100">
            <AvatarFallback className="bg-linear-to-br from-blue-500 to-purple-600 text-white text-2xl font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Info */}
        <div className="text-center sm:text-left flex-1">
          <h2 className="text-xl font-bold text-gray-900">
            {profile.firstName} {profile.lastName}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">{profile.email}</p>
          <p className="text-xs text-gray-400 mt-0.5">Member since {memberSince}</p>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
            <Badge className={`${statusColors[profile.status]} text-xs`}>
              {profile.status.replace('_', ' ')}
            </Badge>
            {profile.documentVerified && (
              <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
                <CheckCircle className="w-3 h-3 mr-1" />
                ID Verified
              </Badge>
            )}
            {profile.emailVerified && (
              <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
                <CheckCircle className="w-3 h-3 mr-1" />
                Email Verified
              </Badge>
            )}
          </div>
        </div>

        {/* Last login */}
        {profile.lastLoginAt && (
          <div className="hidden lg:block text-right shrink-0">
            <p className="text-xs text-gray-400">Last login</p>
            <p className="text-xs text-gray-600 font-medium mt-0.5">
              {new Date(profile.lastLoginAt).toLocaleDateString()} at{' '}
              {new Date(profile.lastLoginAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page Component ───────────────────────────────────────────────
function ProfilePageContent() {
  const auth = useSimpleAuth();
  const router = useRouter();
  const { token, isLoading } = auth;

  // Fetch real profile from DB
  const utils = trpc.useUtils();
  const { data: profileRes, isLoading: profileLoading } = trpc.clientAuth.getProfile.useQuery(
    undefined,
    { enabled: !!token }
  );

  useEffect(() => {
    if (!isLoading && !token) {
      router.push('/auth/login');
    }
  }, [token, isLoading, router]);

  const navigation = buildNav((href) => href === '/dashboard/client/profile');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading…</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Redirecting to login…</p>
        </div>
      </div>
    );
  }

  // Map DB row → UserProfile shape
  const dbClient = profileRes?.data;
  const profile: UserProfile | null = dbClient
    ? {
        clientId:        dbClient.clientId,
        cin:             dbClient.cin,
        firstName:       dbClient.firstName,
        lastName:        dbClient.lastName,
        email:           dbClient.email,
        emailVerified:   dbClient.emailVerified,
        phone:           dbClient.phone,
        phoneVerified:   dbClient.phoneVerified,
        dateOfBirth:     dbClient.dateOfBirth instanceof Date
                           ? dbClient.dateOfBirth.toISOString()
                           : String(dbClient.dateOfBirth),
        address: {
          street:      dbClient.address,
          city:        dbClient.city,
          province:    dbClient.province,
          postalCode:  dbClient.postalCode ?? undefined,
        },
        status:          dbClient.status as UserProfile['status'],
        documentVerified: dbClient.documentVerified,
        createdAt:       dbClient.createdAt instanceof Date
                           ? dbClient.createdAt.toISOString()
                           : String(dbClient.createdAt),
        lastLoginAt:     dbClient.lastLoginAt
                           ? (dbClient.lastLoginAt instanceof Date
                               ? dbClient.lastLoginAt.toISOString()
                               : String(dbClient.lastLoginAt))
                           : undefined,
        twoFactorEnabled: dbClient.twoFactorEnabled,
        twoFactorMethod:  (dbClient.twoFactorMethod as 'email' | 'phone' | undefined) ?? undefined,
      }
    : null;

  // Defaults for sections not yet backed by their own API endpoints
  const notificationPrefs: NotificationPreferences = {
    channels: { email: true, sms: false, inApp: true },
    language: 'en',
    triggers: {
      claimStatusUpdates: true,
      policyRenewalReminders: true,
      paymentConfirmations: true,
      securityAlerts: true,
    },
  };
  const documents: ProfileDocument[] = [];
  const policies: LinkedPolicy[] = [];

  return (
    <DashboardLayout title="My Profile" userRole="CLIENT" navigation={navigation}>
      <Toaster richColors position="top-right" />

      {profileLoading || !profile ? (
        <ProfileSkeleton />
      ) : (
        <div className="space-y-6">
          {/* Profile Header */}
          <ProfileHeader profile={profile} />

          {/* Tabs Section */}
          <ProfileTabs
            profile={profile}
            onProfileUpdated={() => utils.clientAuth.getProfile.invalidate()}
            notificationPrefs={notificationPrefs}
            documents={documents}
          />

          {/* Linked Policies */}
          <LinkedPolicies policies={policies} />
        </div>
      )}
    </DashboardLayout>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      }
    >
      <ProfilePageContent />
    </Suspense>
  );
}
