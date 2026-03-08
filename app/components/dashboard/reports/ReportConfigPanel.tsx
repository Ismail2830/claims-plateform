'use client';

import { useState } from 'react';
import type { ReportFormat, ReportType } from '@prisma/client';
import { REPORT_FORMAT_LABELS, ALL_SECTIONS, REPORT_TYPE_LABELS } from '@/app/lib/reports/report-utils';
import { EmailTagInput } from './EmailTagInput';
import { cn } from '@/lib/utils';

interface Props {
  type:          ReportType;
  onGenerate:    (config: GenerateConfig) => void;
  onPreview:     (config: GenerateConfig) => void;
  isGenerating:  boolean;
}

export interface GenerateConfig {
  name:       string;
  type:       ReportType;
  format:     ReportFormat;
  dateFrom:   string;
  dateTo:     string;
  sections:   string[];
  recipients: string[];
}

const FORMAT_ICONS: Record<ReportFormat, string> = {
  PDF:   '📄',
  EXCEL: '📊',
  CSV:   '📋',
};

function getDefaultDates() {
  const now  = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const to   = new Date(now.getFullYear(), now.getMonth(), 0);
  return {
    dateFrom: from.toISOString().split('T')[0],
    dateTo:   to.toISOString().split('T')[0],
  };
}

export function ReportConfigPanel({ type, onGenerate, onPreview, isGenerating }: Props) {
  const defaults = getDefaultDates();
  const [format,     setFormat]     = useState<ReportFormat>('PDF');
  const [dateFrom,   setDateFrom]   = useState(defaults.dateFrom);
  const [dateTo,     setDateTo]     = useState(defaults.dateTo);
  const [sections,   setSections]   = useState<string[]>(ALL_SECTIONS.map((s) => s.id));
  const [recipients, setRecipients] = useState<string[]>([]);

  const typeLabel = REPORT_TYPE_LABELS[type];
  const name      = `${typeLabel} — ${new Date(dateFrom).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`;

  const config: GenerateConfig = { name, type, format, dateFrom, dateTo, sections, recipients };

  const toggleSection = (id: string) =>
    setSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );

  const inputCls = 'block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition';
  const labelCls = 'block text-xs font-medium text-gray-600 mb-1.5';

  return (
    <div className="space-y-6">
      {/* Period */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Date début</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            max={dateTo}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Date fin</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            min={dateFrom}
            className={inputCls}
          />
        </div>
      </div>

      {/* Format */}
      <div>
        <label className={labelCls}>Format</label>
        <div className="flex gap-2">
          {(['PDF', 'EXCEL', 'CSV'] as ReportFormat[]).map((f) => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all',
                format === f
                  ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-300'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
              )}
            >
              <span>{FORMAT_ICONS[f]}</span>
              {REPORT_FORMAT_LABELS[f]}
            </button>
          ))}
        </div>
      </div>

      {/* Sections */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className={labelCls + ' mb-0'}>Sections à inclure</label>
          <button
            onClick={() =>
              setSections(
                sections.length === ALL_SECTIONS.length ? [] : ALL_SECTIONS.map((s) => s.id),
              )
            }
            className="text-xs text-blue-600 hover:underline"
          >
            {sections.length === ALL_SECTIONS.length ? 'Désélectionner tout' : 'Sélectionner tout'}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {ALL_SECTIONS.map((section) => (
            <label
              key={section.id}
              className={cn(
                'flex items-center gap-2.5 rounded-lg border px-3 py-2 cursor-pointer transition-colors text-sm',
                sections.includes(section.id)
                  ? 'border-blue-200 bg-blue-50 text-blue-800'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
              )}
            >
              <input
                type="checkbox"
                checked={sections.includes(section.id)}
                onChange={() => toggleSection(section.id)}
                className="accent-blue-600"
              />
              {section.label}
            </label>
          ))}
        </div>
      </div>

      {/* Recipients */}
      <div>
        <label className={labelCls}>Envoyer par email à (optionnel)</label>
        <EmailTagInput
          emails={recipients}
          onChange={setRecipients}
          placeholder="Ajouter un email..."
        />
        <p className="mt-1 text-xs text-gray-400">Appuyez sur Entrée ou virgule pour ajouter un destinataire.</p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={() => onPreview(config)}
          disabled={isGenerating || sections.length === 0 || format !== 'PDF'}
          className={cn(
            'flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          <span>👁️</span> Aperçu
        </button>
        <button
          onClick={() => onGenerate(config)}
          disabled={isGenerating || sections.length === 0}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          {isGenerating ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Génération…
            </>
          ) : (
            <>
              <span>⚡</span>
              Générer le rapport
            </>
          )}
        </button>
      </div>
    </div>
  );
}
