'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { ReportFormat, ReportSchedule, ReportType, ScheduleFrequency } from '@prisma/client';
import {
  REPORT_TYPE_LABELS,
  REPORT_FORMAT_LABELS,
  FREQUENCY_LABELS,
} from '@/app/lib/reports/report-utils';
import { EmailTagInput } from './EmailTagInput';
import { cn } from '@/lib/utils';

const Schema = z.object({
  name:       z.string().min(1, 'Nom requis'),
  type:       z.enum(['MONTHLY_ACTIVITY','SINISTRALITE','FINANCIAL','ACAPS_COMPLIANCE','MANAGER_PERFORMANCE','CUSTOM'] as [ReportType, ...ReportType[]]),
  format:     z.enum(['PDF','EXCEL','CSV'] as [ReportFormat, ...ReportFormat[]]),
  frequency:  z.enum(['DAILY','WEEKLY','MONTHLY','QUARTERLY','ANNUAL'] as [ScheduleFrequency, ...ScheduleFrequency[]]),
  hour:       z.number().int().min(0).max(23),
  recipients: z.array(z.string().email()).min(1, 'Au moins un destinataire requis'),
});

type FormData = z.infer<typeof Schema>;

interface Props {
  open:       boolean;
  onClose:    () => void;
  onSave:     (data: FormData & { recipients: string[] }) => Promise<void>;
  initial?:   ReportSchedule | null;
  isSaving:   boolean;
}

const labelCls = 'block text-xs font-medium text-gray-600 mb-1.5';
const inputCls = 'block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition';
const errorCls = 'mt-1 text-xs text-red-500';

export function ScheduleModal({ open, onClose, onSave, initial, isSaving }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(Schema),
    defaultValues: {
      name:      '',
      type:      'MONTHLY_ACTIVITY',
      format:    'PDF',
      frequency: 'MONTHLY',
      hour:      7,
      recipients: [],
    },
  });

  const recipients = watch('recipients') as string[] ?? [];

  useEffect(() => {
    if (initial) {
      reset({
        name:       initial.name,
        type:       initial.type,
        format:     initial.format,
        frequency:  initial.frequency,
        hour:       7,
        recipients: initial.recipients,
      });
    } else {
      reset({ name: '', type: 'MONTHLY_ACTIVITY', format: 'PDF', frequency: 'MONTHLY', hour: 7, recipients: [] });
    }
  }, [initial, reset, open]);

  if (!open) return null;

  const onSubmit = async (data: FormData) => {
    await onSave({ ...data, recipients: data.recipients });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="font-semibold text-gray-900">
            {initial ? 'Modifier le planning' : 'Nouveau planning'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          {/* Name */}
          <div>
            <label className={labelCls}>Nom du planning</label>
            <input {...register('name')} className={inputCls} placeholder="Ex : Rapport mensuel direction" />
            {errors.name && <p className={errorCls}>{errors.name.message}</p>}
          </div>

          {/* Type / Format */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Type de rapport</label>
              <select {...register('type')} className={inputCls}>
                {(Object.keys(REPORT_TYPE_LABELS) as ReportType[]).map((t) => (
                  <option key={t} value={t}>{REPORT_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Format</label>
              <select {...register('format')} className={inputCls}>
                {(Object.keys(REPORT_FORMAT_LABELS) as ReportFormat[]).map((f) => (
                  <option key={f} value={f}>{REPORT_FORMAT_LABELS[f]}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Frequency / Hour */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Fréquence</label>
              <select {...register('frequency')} className={inputCls}>
                {(Object.keys(FREQUENCY_LABELS) as ScheduleFrequency[]).map((f) => (
                  <option key={f} value={f}>{FREQUENCY_LABELS[f]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Heure d'envoi (UTC)</label>
              <select {...register('hour', { valueAsNumber: true })} className={inputCls}>
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
                ))}
              </select>
            </div>
          </div>

          {/* Recipients */}
          <div>
            <label className={labelCls}>Destinataires</label>
            <EmailTagInput
              emails={recipients}
              onChange={(emails) => setValue('recipients', emails, { shouldValidate: true })}
              placeholder="Ajouter un email..."
            />
            {errors.recipients && <p className={errorCls}>{errors.recipients.message}</p>}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition disabled:opacity-50',
              )}
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Sauvegarde…
                </>
              ) : initial ? 'Sauvegarder' : 'Créer le planning'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
