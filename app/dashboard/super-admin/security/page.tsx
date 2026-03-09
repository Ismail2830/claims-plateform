'use client';

import React, { useState, useCallback } from 'react';
import { useAdminAuth } from '@/app/hooks/useAdminAuth';
import { Shield, Activity, Users, Lock } from 'lucide-react';
import AuditLogsTab    from '@/app/components/settings/AuditLogsTab';
import SessionsTab     from '@/app/components/settings/SessionsTab';
import SecurityCfgTab  from '@/app/components/settings/SecurityCfgTab';

type TabId = 'audit' | 'sessions' | 'security';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'audit',    label: 'Journal d\'audit', icon: Activity },
  { id: 'sessions', label: 'Sessions actives', icon: Users },
  { id: 'security', label: 'Sécurité',          icon: Lock },
];

export default function SecurityPage() {
  const { user } = useAdminAuth();
  const [activeTab, setActiveTab] = useState<TabId>('audit');

  if (!user || user.role !== 'SUPER_ADMIN') return null;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="p-2.5 bg-red-600 rounded-xl">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sécurité & Audit</h1>
          <p className="text-sm text-gray-500">Surveillance, journal d&apos;activité et sécurité de la plateforme</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100">
          {TABS.map((tab) => {
            const Icon  = tab.icon;
            const active = tab.id === activeTab;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors
                  ${active
                    ? 'border-red-600 text-red-600 bg-red-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
        <div className="p-6">
          {activeTab === 'audit'    && <AuditLogsTab />}
          {activeTab === 'sessions' && <SessionsTab />}
          {activeTab === 'security' && <SecurityCfgTab />}
        </div>
      </div>
    </div>
  );
}
