'use client';

import type { ReportType } from '@prisma/client';
import { REPORT_TYPE_LABELS, REPORT_TYPE_DESCRIPTIONS, REPORT_TYPE_ICONS } from '@/app/lib/reports/report-utils';
import { cn } from '@/lib/utils';

interface Props {
  type:     ReportType;
  selected: boolean;
  onClick:  () => void;
}

const TYPE_GRADIENT: Record<ReportType, string> = {
  MONTHLY_ACTIVITY:    'from-blue-50 to-blue-100 border-blue-200 hover:border-blue-400',
  SINISTRALITE:        'from-orange-50 to-orange-100 border-orange-200 hover:border-orange-400',
  FINANCIAL:           'from-purple-50 to-purple-100 border-purple-200 hover:border-purple-400',
  ACAPS_COMPLIANCE:    'from-red-50 to-red-100 border-red-200 hover:border-red-400',
  MANAGER_PERFORMANCE: 'from-teal-50 to-teal-100 border-teal-200 hover:border-teal-400',
  CUSTOM:              'from-gray-50 to-gray-100 border-gray-200 hover:border-gray-400',
};

const TYPE_SELECTED: Record<ReportType, string> = {
  MONTHLY_ACTIVITY:    'border-blue-500 ring-2 ring-blue-200 bg-blue-50',
  SINISTRALITE:        'border-orange-500 ring-2 ring-orange-200 bg-orange-50',
  FINANCIAL:           'border-purple-500 ring-2 ring-purple-200 bg-purple-50',
  ACAPS_COMPLIANCE:    'border-red-500 ring-2 ring-red-200 bg-red-50',
  MANAGER_PERFORMANCE: 'border-teal-500 ring-2 ring-teal-200 bg-teal-50',
  CUSTOM:              'border-gray-500 ring-2 ring-gray-200 bg-gray-50',
};

export function ReportTypeCard({ type, selected, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative w-full text-left rounded-xl border-2 p-4 transition-all duration-200 cursor-pointer',
        'bg-linear-to-br',
        selected
          ? TYPE_SELECTED[type]
          : `${TYPE_GRADIENT[type]} bg-linear-to-br`,
      )}
    >
      {selected && (
        <span className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-current/20">
          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </span>
      )}
      <div className="text-2xl mb-2">{REPORT_TYPE_ICONS[type]}</div>
      <div className="font-semibold text-sm text-gray-900 mb-1">
        {REPORT_TYPE_LABELS[type]}
      </div>
      <p className="text-xs text-gray-500 leading-relaxed">
        {REPORT_TYPE_DESCRIPTIONS[type]}
      </p>
    </button>
  );
}
