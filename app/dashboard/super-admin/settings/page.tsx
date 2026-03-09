'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAdminAuth } from '@/app/hooks/useAdminAuth';
import { useSettings } from '@/app/hooks/useSettings';
import {
  Settings,
  Globe,
  FileText,
  Brain,
  Mail,
  Plug,
  Bell,
  Save,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import GeneralTab      from '@/app/components/settings/GeneralTab';
import ClaimsTab       from '@/app/components/settings/ClaimsTab';
import ScoringTab      from '@/app/components/settings/ScoringTab';
import EmailTab        from '@/app/components/settings/EmailTab';
import IntegrationsTab from '@/app/components/settings/IntegrationsTab';
import NotificationsTab from '@/app/components/settings/NotificationsTab';
import { PlatformSettings } from '@/lib/settings/settings-types';

// ─── Tab definition ───────────────────────────────────────────────────────────
type TabId = 'general' | 'claims' | 'scoring' | 'email' | 'integrations' | 'notifications';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'general',       label: 'Général',        icon: Globe },
  { id: 'claims',        label: 'Sinistres',       icon: FileText },
  { id: 'scoring',       label: 'Scoring IA',      icon: Brain },
  { id: 'email',         label: 'Emails',          icon: Mail },
  { id: 'integrations',  label: 'Intégrations',    icon: Plug },
  { id: 'notifications', label: 'Notifications',   icon: Bell },
];

// ─── Toast component ──────────────────────────────────────────────────────────
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium transition-all duration-300
      ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
      {type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
      {message}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user } = useAdminAuth();
  const { settings, loading, error, refetch, updateSection } = useSettings();
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [saving, setSaving]       = useState(false);
  const [pendingChanges, setPending] = useState<Partial<PlatformSettings[TabId]>>({});
  const [toast, setToast]         = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  }, []);

  const handleChange = useCallback(<K extends keyof PlatformSettings>(changes: Partial<PlatformSettings[K]>) => {
    setPending((prev) => ({ ...prev, ...changes }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!Object.keys(pendingChanges).length) return;
    setSaving(true);
    const result = await updateSection(activeTab as keyof PlatformSettings, pendingChanges);
    setSaving(false);
    if (result.success) {
      setPending({});
      showToast('Paramètres sauvegardés avec succès', 'success');
    } else {
      showToast(result.error ?? 'Erreur de sauvegarde', 'error');
    }
  }, [activeTab, pendingChanges, updateSection, showToast]);

  // Reset pending changes on tab switch
  useEffect(() => { setPending({}); }, [activeTab]);

  if (!user || user.role !== 'SUPER_ADMIN') return null;

  const hasPending = Object.keys(pendingChanges).length > 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600 rounded-xl">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Configuration</h1>
            <p className="text-sm text-gray-500">Paramètres globaux de la plateforme</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={refetch}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Rafraîchir
          </button>
          {hasPending && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Sauvegarde…' : 'Sauvegarder'}
            </button>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      {/* Tab bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex overflow-x-auto border-b border-gray-100">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
                  ${active
                    ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : settings ? (
            <>
              {activeTab === 'general' && (
                <GeneralTab
                  settings={settings.general}
                  onChange={(c) => handleChange<'general'>(c)}
                />
              )}
              {activeTab === 'claims' && (
                <ClaimsTab
                  settings={settings.claims}
                  onChange={(c) => handleChange<'claims'>(c)}
                />
              )}
              {activeTab === 'scoring' && (
                <ScoringTab
                  settings={settings.scoring}
                  onChange={(c) => handleChange<'scoring'>(c)}
                />
              )}
              {activeTab === 'email' && (
                <EmailTab
                  settings={settings.email}
                  onChange={(c) => handleChange<'email'>(c)}
                />
              )}
              {activeTab === 'integrations' && (
                <IntegrationsTab
                  settings={settings.integrations}
                  onChange={(c) => handleChange<'integrations'>(c)}
                />
              )}
              {activeTab === 'notifications' && (
                <NotificationsTab
                  settings={settings.notifications}
                  onChange={(c) => handleChange<'notifications'>(c)}
                />
              )}
            </>
          ) : null}
        </div>
      </div>

      {hasPending && (
        <p className="mt-3 text-center text-xs text-amber-600 font-medium">
          Modifications non sauvegardées — cliquez sur &quot;Sauvegarder&quot; pour confirmer.
        </p>
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
