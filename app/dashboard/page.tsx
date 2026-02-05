'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSimpleAuth } from '@/app/hooks/useSimpleAuth';
import { Loader2 } from 'lucide-react';

export default function DashboardRouter() {
  const { user, isLoading } = useSimpleAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      // Route based on user role - for now all authenticated users go to client dashboard
      router.replace('/dashboard/client');
    } else if (!isLoading && !user) {
      router.replace('/auth/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return null;
}