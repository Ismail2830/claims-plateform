'use client';

import { formatTrend } from '@/app/lib/analytics-utils';

interface Props {
  title: string;
  value: string | number;
  prev?: number;
  current?: number;
  goodWhenPositive?: boolean;
  icon: React.ReactNode;
  iconBg?: string;
  suffix?: string;
  loading?: boolean;
}

export function AnalyticsKpiCard({
  title,
  value,
  prev,
  current,
  goodWhenPositive = true,
  icon,
  iconBg = 'bg-blue-100',
  suffix,
  loading,
}: Props) {
  const trend =
    prev !== undefined && current !== undefined
      ? formatTrend(current, prev, goodWhenPositive)
      : null;

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm animate-pulse">
        <div className="h-4 w-24 bg-gray-200 rounded mb-3" />
        <div className="h-7 w-16 bg-gray-200 rounded mb-2" />
        <div className="h-3 w-12 bg-gray-200 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-gray-500 font-medium truncate">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1 leading-none">
            {value}
            {suffix && <span className="text-sm font-normal text-gray-400 ml-1">{suffix}</span>}
          </p>
          {trend && (
            <p className={`text-xs mt-1.5 font-medium ${trend.color}`}>
              {trend.arrow} {trend.text} vs période préc.
            </p>
          )}
        </div>
        <div className={`p-2 rounded-lg ${iconBg} shrink-0`}>{icon}</div>
      </div>
    </div>
  );
}
