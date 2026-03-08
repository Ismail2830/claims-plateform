'use client';

import { useState } from 'react';
import type { ReportSchedule } from '@prisma/client';
import {
  REPORT_TYPE_LABELS,
  REPORT_FORMAT_LABELS,
  FREQUENCY_LABELS,
} from '@/app/lib/reports/report-utils';
import { cn } from '@/lib/utils';

interface Props {
  schedule:   ReportSchedule & { _count?: { reports: number } };
  onEdit:     (s: ReportSchedule) => void;
  onDelete:   (id: string) => void;
  onTest:     (id: string) => void;
  onToggle:   (id: string, active: boolean) => void;
}

export function ScheduleCard({ schedule, onEdit, onDelete, onTest, onToggle }: Props) {
  const [testing, setTesting] = useState(false);

  const handleTest = async () => {
    setTesting(true);
    await onTest(schedule.id);
    setTesting(false);
  };

  const nextRun = schedule.nextRunAt
    ? new Date(schedule.nextRunAt).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : '—';

  const lastRun = schedule.lastRunAt
    ? new Date(schedule.lastRunAt).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    : 'Jamais';

  return (
    <div className={cn(
      'rounded-xl border bg-white p-5 transition-all hover:shadow-md',
      schedule.isActive ? 'border-gray-200' : 'border-gray-100 opacity-70',
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 truncate text-sm">{schedule.name}</h3>
            <span className={cn(
              'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
              schedule.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500',
            )}>
              {schedule.isActive ? '● Actif' : '○ Inactif'}
            </span>
          </div>
          <p className="text-xs text-gray-500">
            {REPORT_TYPE_LABELS[schedule.type]} · {REPORT_FORMAT_LABELS[schedule.format]}
          </p>
        </div>
        {/* Toggle */}
        <button
          onClick={() => onToggle(schedule.id, !schedule.isActive)}
          className={cn(
            'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
            schedule.isActive ? 'bg-blue-600' : 'bg-gray-200',
          )}
          title={schedule.isActive ? 'Désactiver' : 'Activer'}
        >
          <span className={cn(
            'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200',
            schedule.isActive ? 'translate-x-4' : 'translate-x-0',
          )} />
        </button>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4 text-xs">
        <div>
          <span className="text-gray-400">Fréquence</span>
          <p className="font-medium text-gray-700">{FREQUENCY_LABELS[schedule.frequency]}</p>
        </div>
        <div>
          <span className="text-gray-400">Rapports générés</span>
          <p className="font-medium text-gray-700">{schedule._count?.reports ?? 0}</p>
        </div>
        <div>
          <span className="text-gray-400">Dernière exécution</span>
          <p className="font-medium text-gray-700">{lastRun}</p>
        </div>
        <div>
          <span className="text-gray-400">Prochaine exécution</span>
          <p className="font-medium text-gray-700">{nextRun}</p>
        </div>
        <div className="col-span-2">
          <span className="text-gray-400">Destinataires</span>
          <p className="font-medium text-gray-700 truncate">{schedule.recipients.join(', ')}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleTest}
          disabled={testing}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50 transition"
        >
          {testing ? (
            <>
              <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Test…
            </>
          ) : (
            <><span>▶</span> Tester</>
          )}
        </button>
        <button
          onClick={() => onEdit(schedule)}
          className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition"
        >
          ✏️ Modifier
        </button>
        <button
          onClick={() => onDelete(schedule.id)}
          className="flex items-center gap-1 rounded-lg border border-red-100 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}
