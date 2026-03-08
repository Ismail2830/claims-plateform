'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import type { GeneratedReport, ReportSchedule, ReportType } from '@prisma/client';

import { ReportTypeCard } from '@/app/components/dashboard/reports/ReportTypeCard';
import { ReportConfigPanel } from '@/app/components/dashboard/reports/ReportConfigPanel';
import type { GenerateConfig } from '@/app/components/dashboard/reports/ReportConfigPanel';
import { GenerationProgress, type ProgressStatus } from '@/app/components/dashboard/reports/GenerationProgress';
import { ScheduleCard } from '@/app/components/dashboard/reports/ScheduleCard';
import { ScheduleModal } from '@/app/components/dashboard/reports/ScheduleModal';
import { ReportHistoryTable } from '@/app/components/dashboard/reports/ReportHistoryTable';

type ScheduleRow = ReportSchedule & { _count?: { reports: number }; creator?: { firstName: string; lastName: string } };
type ReportRow   = GeneratedReport & { generator?: { firstName: string; lastName: string; role: string } | null };

const REPORT_TYPES: ReportType[] = [
  'MONTHLY_ACTIVITY',
  'SINISTRALITE',
  'FINANCIAL',
  'ACAPS_COMPLIANCE',
  'MANAGER_PERFORMANCE',
  'CUSTOM',
];

function getToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('adminToken') ?? '';
}

const swrFetcher = async (url: string) => {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};

export default function ReportsPage() {
  // Tab state
  const [tab, setTab] = useState<'generate' | 'schedules' | 'history'>('generate');

  // Generator state
  const [selectedType,   setSelectedType]   = useState<ReportType>('MONTHLY_ACTIVITY');
  const [isGenerating,   setIsGenerating]   = useState(false);
  const [progress,       setProgress]       = useState(0);
  const [progressStatus, setProgressStatus] = useState<ProgressStatus>('idle');
  const [lastResult,     setLastResult]     = useState<{ downloadUrl: string; name: string } | null>(null);
  const [previewUrl,     setPreviewUrl]     = useState<string | null>(null);

  // Schedules
  const { data: schedulesData, error: schedulesError, mutate: mutateSchedules } = useSWR<ScheduleRow[]>(
    tab === 'schedules' ? '/api/reports/schedules' : null,
    swrFetcher,
  );
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [editingSchedule,   setEditingSchedule]   = useState<ReportSchedule | null>(null);
  const [isSavingSchedule,  setIsSavingSchedule]  = useState(false);

  // History
  const [historyPage,    setHistoryPage]    = useState(1);
  const [historyFilters, setHistoryFilters] = useState<{ type?: string; status?: string; format?: string }>({});

  const historyParams = new URLSearchParams({
    page:  String(historyPage),
    limit: '20',
    ...(historyFilters.type   ? { type:   historyFilters.type   } : {}),
    ...(historyFilters.status ? { status: historyFilters.status } : {}),
    ...(historyFilters.format ? { format: historyFilters.format } : {}),
  });

  const { data: historyData, isLoading: historyLoading, mutate: mutateHistory } = useSWR<{
    reports:    ReportRow[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }>(
    tab === 'history' ? `/api/reports?${historyParams.toString()}` : null,
    swrFetcher,
  );

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleGenerate = useCallback(async (config: GenerateConfig) => {
    setIsGenerating(true);
    setProgressStatus('running');
    setProgress(0);
    setLastResult(null);

    setTimeout(() => setProgress(1), 600);
    setTimeout(() => setProgress(2), 1200);

    try {
      const res = await fetch('/api/reports/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur génération');

      setProgress(config.recipients.length > 0 ? 3 : 2);
      setProgressStatus('done');
      setLastResult({ downloadUrl: data.downloadUrl, name: config.name });
      toast.success('Rapport généré avec succès !');
      mutateHistory();
    } catch (err) {
      setProgressStatus('error');
      toast.error(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsGenerating(false);
    }
  }, [mutateHistory]);

  const handlePreview = useCallback(async (config: GenerateConfig) => {
    toast.info('Génération de l\'aperçu…');
    try {
      const res = await fetch('/api/reports/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ ...config, recipients: [] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPreviewUrl(data.downloadUrl);
      mutateHistory();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur aperçu');
    }
  }, [mutateHistory]);

  const handleSaveSchedule = async (formData: { name: string; type: ReportType; format: 'PDF' | 'EXCEL' | 'CSV'; frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL'; hour: number; recipients: string[] }) => {
    setIsSavingSchedule(true);
    try {
      const url    = editingSchedule ? `/api/reports/schedules/${editingSchedule.id}` : '/api/reports/schedules';
      const method = editingSchedule ? 'PATCH' : 'POST';
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur serveur');
      toast.success(editingSchedule ? 'Planning modifié' : 'Planning créé');
      setScheduleModalOpen(false);
      setEditingSchedule(null);
      mutateSchedules();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const handleTestSchedule = async (id: string) => {
    try {
      const res = await fetch(`/api/reports/schedules/${id}/test`, {
        method: 'POST', headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur test');
      toast.success('Rapport de test généré et envoyé !');
      mutateHistory();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm('Supprimer ce planning ?')) return;
    const res = await fetch(`/api/reports/schedules/${id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (res.ok) { toast.success('Planning supprimé'); mutateSchedules(); }
    else toast.error('Erreur lors de la suppression');
  };

  const handleToggleSchedule = async (id: string, active: boolean) => {
    const res = await fetch(`/api/reports/schedules/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ isActive: active }),
    });
    if (res.ok) { toast.success(active ? 'Planning activé' : 'Planning désactivé'); mutateSchedules(); }
    else toast.error('Erreur');
  };

  const handleDownload = (id: string, name: string) => {
    fetch(`/api/reports/${id}/download`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href = url; a.download = name; a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => toast.error('Erreur téléchargement'));
  };

  const handleDeleteReport = async (id: string) => {
    if (!confirm('Supprimer ce rapport ?')) return;
    const res = await fetch(`/api/reports/${id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (res.ok) { toast.success('Rapport supprimé'); mutateHistory(); }
    else toast.error('Erreur lors de la suppression');
  };

  const tabCls = (t: typeof tab) =>
    `px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
      tab === t
        ? 'border-blue-600 text-blue-600'
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'
    }`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rapports</h1>
          <p className="text-sm text-gray-500 mt-1">
            Génération, planification et historique des rapports
          </p>
        </div>
        {tab === 'schedules' && (
          <button
            onClick={() => { setEditingSchedule(null); setScheduleModalOpen(true); }}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition"
          >
            <span>+</span> Nouveau planning
          </button>
        )}
      </div>

      {/* Tab bar */}
      <div className="border-b border-gray-200 -mt-2">
        <nav className="-mb-px flex gap-1">
          <button onClick={() => setTab('generate')}  className={tabCls('generate')}>⚡ Générer</button>
          <button onClick={() => setTab('schedules')} className={tabCls('schedules')}>
            📅 Planifiés{' '}
            {Array.isArray(schedulesData) && schedulesData.length > 0 && (
              <span className="ml-1 inline-flex items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 min-w-5">
                {schedulesData.length}
              </span>
            )}
          </button>
          <button onClick={() => setTab('history')} className={tabCls('history')}>📋 Historique</button>
        </nav>
      </div>

      {/* ── TAB: Generate ───────────────────────────────────────────────── */}
      {tab === 'generate' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: type cards */}
          <div className="lg:col-span-2 space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Type de rapport</h2>
            {REPORT_TYPES.map((type) => (
              <ReportTypeCard
                key={type}
                type={type}
                selected={selectedType === type}
                onClick={() => { setSelectedType(type); setProgressStatus('idle'); setLastResult(null); }}
              />
            ))}
          </div>

          {/* Right: config + progress */}
          <div className="lg:col-span-3 space-y-5">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="font-semibold text-gray-900 mb-5">Configuration</h2>
              <ReportConfigPanel
                type={selectedType}
                onGenerate={handleGenerate}
                onPreview={handlePreview}
                isGenerating={isGenerating}
              />
            </div>

            {(isGenerating || progressStatus !== 'idle') && (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4">
                  {isGenerating ? 'Génération en cours…' : progressStatus === 'done' ? '✅ Rapport prêt' : '❌ Échec'}
                </h3>
                <GenerationProgress currentStep={progress} status={progressStatus} hasEmail={false} />

                {progressStatus === 'done' && lastResult && (
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      onClick={() => handleDownload('', lastResult.name)}
                      className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 transition"
                    >
                      ↓ Télécharger
                    </button>
                    <button
                      onClick={() => setPreviewUrl(lastResult.downloadUrl)}
                      className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
                    >
                      👁️ Aperçu
                    </button>
                    <button
                      onClick={() => { setProgressStatus('idle'); setLastResult(null); }}
                      className="ml-auto text-sm text-gray-400 hover:text-gray-600"
                    >
                      Fermer ✕
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: Schedules ──────────────────────────────────────────────── */}
      {tab === 'schedules' && (
        <div className="space-y-4">
          {schedulesError ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="text-4xl mb-3">⚠️</div>
              <p className="text-sm text-red-500">Impossible de charger les plannings. Veuillez rafraîchir la page.</p>
              <button onClick={() => mutateSchedules()} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition">Réessayer</button>
            </div>
          ) : !schedulesData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-52 rounded-xl border border-gray-200 bg-gray-50 animate-pulse" />
              ))}
            </div>
          ) : !Array.isArray(schedulesData) || schedulesData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="text-5xl mb-4">📅</div>
              <h3 className="font-semibold text-gray-700 mb-2">Aucun planning configuré</h3>
              <p className="text-sm text-gray-400 mb-6">Automatisez l'envoi périodique de vos rapports par email.</p>
              <button
                onClick={() => { setEditingSchedule(null); setScheduleModalOpen(true); }}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition"
              >
                <span>+</span> Créer un planning
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {schedulesData.map((schedule) => (
                <ScheduleCard
                  key={schedule.id}
                  schedule={schedule}
                  onEdit={(s) => { setEditingSchedule(s); setScheduleModalOpen(true); }}
                  onDelete={handleDeleteSchedule}
                  onTest={handleTestSchedule}
                  onToggle={handleToggleSchedule}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: History ─────────────────────────────────────────────────── */}
      {tab === 'history' && (
        <ReportHistoryTable
          reports={historyData?.reports ?? []}
          pagination={historyData?.pagination ?? { page: 1, limit: 20, total: 0, pages: 0 }}
          isLoading={historyLoading}
          onPageChange={setHistoryPage}
          onFilterChange={(f) => { setHistoryFilters(f); setHistoryPage(1); }}
          onDownload={handleDownload}
          onDelete={handleDeleteReport}
        />
      )}

      {/* Preview modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="flex w-full max-w-5xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden" style={{ height: '90vh' }}>
            <div className="flex items-center justify-between border-b px-5 py-3">
              <h3 className="font-semibold text-gray-900">Aperçu du rapport</h3>
              <div className="flex items-center gap-3">
                <a href={previewUrl} download className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition">
                  ↓ Télécharger
                </a>
                <button onClick={() => setPreviewUrl(null)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition">
                  ✕ Fermer
                </button>
              </div>
            </div>
            <iframe src={previewUrl} title="Aperçu rapport" className="flex-1 w-full" style={{ border: 'none' }} />
          </div>
        </div>
      )}

      {/* Schedule modal */}
      <ScheduleModal
        open={scheduleModalOpen}
        onClose={() => { setScheduleModalOpen(false); setEditingSchedule(null); }}
        onSave={handleSaveSchedule}
        initial={editingSchedule}
        isSaving={isSavingSchedule}
      />
    </div>
  );
}
