'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Shield } from 'lucide-react';
import SessionsManager from '@/app/components/dashboard/SessionsManager';

export default function SessionsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-blue-600 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Page header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Session Management</h1>
            <p className="text-sm text-gray-500">Review and revoke devices that have access to your account.</p>
          </div>
        </div>

        {/* Card wrapper */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <SessionsManager />
        </div>
      </div>
    </div>
  );
}
