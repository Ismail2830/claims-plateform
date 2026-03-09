'use client';

import { cn } from '@/lib/utils';

interface PredictionStatsCardProps {
  emoji: string;
  label: string;
  value: string;
  sublabel?: string;
  color?: 'blue' | 'orange' | 'purple' | 'red' | 'teal' | 'green';
  isAlert?: boolean;
  onClick?: () => void;
}

const colorMap = {
  blue:   { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700',   value: 'text-blue-900' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', value: 'text-orange-900' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', value: 'text-purple-900' },
  red:    { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-700',    value: 'text-red-900' },
  teal:   { bg: 'bg-teal-50',   border: 'border-teal-200',   text: 'text-teal-700',   value: 'text-teal-900' },
  green:  { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700',  value: 'text-green-900' },
};

export function PredictionStatsCard({
  emoji,
  label,
  value,
  sublabel,
  color = 'blue',
  isAlert = false,
  onClick,
}: PredictionStatsCardProps) {
  const c = colorMap[color];

  return (
    <div
      className={cn(
        'rounded-xl border p-4 flex flex-col gap-1 transition-all',
        c.bg, c.border,
        onClick && 'cursor-pointer hover:shadow-md',
        isAlert && 'ring-2 ring-red-400 ring-offset-1'
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        <span className="text-xl">{emoji}</span>
        <span className={cn('text-xs font-medium uppercase tracking-wide', c.text)}>{label}</span>
      </div>
      <p className={cn('text-lg font-bold leading-tight', c.value)}>{value}</p>
      {sublabel && <p className="text-xs text-gray-500 truncate">{sublabel}</p>}
    </div>
  );
}
