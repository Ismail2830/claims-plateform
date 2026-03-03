'use client';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export type RiskLabel = 'Faible' | 'Moyen' | 'Élevé' | 'Suspicieux';

interface RiskBadgeProps {
  label: RiskLabel | string;
  score: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const RISK_CONFIG: Record<string, { dot: string; bg: string; text: string; border: string; bar: string }> = {
  Faible: {
    dot: 'bg-green-500',
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-300',
    bar: 'bg-green-500',
  },
  Moyen: {
    dot: 'bg-yellow-500',
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    border: 'border-yellow-300',
    bar: 'bg-yellow-500',
  },
  'Élevé': {
    dot: 'bg-orange-500',
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    border: 'border-orange-300',
    bar: 'bg-orange-500',
  },
  Suspicieux: {
    dot: 'bg-red-500',
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-300',
    bar: 'bg-red-500',
  },
};

const FALLBACK_CONFIG = {
  dot: 'bg-gray-400',
  bg: 'bg-gray-100',
  text: 'text-gray-800',
  border: 'border-gray-300',
  bar: 'bg-gray-400',
};

export function RiskBadge({ label, score, size = 'md', className }: RiskBadgeProps) {
  const config = RISK_CONFIG[label] ?? FALLBACK_CONFIG;
  const clampedScore = Math.min(100, Math.max(0, score));

  if (size === 'sm') {
    return (
      <Badge
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
          config.bg,
          config.text,
          config.border,
          'hover:opacity-90',
          className
        )}
      >
        <span className={cn('h-2 w-2 shrink-0 rounded-full', config.dot)} />
        {label}
      </Badge>
    );
  }

  if (size === 'md') {
    return (
      <Badge
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold',
          config.bg,
          config.text,
          config.border,
          'hover:opacity-90',
          className
        )}
      >
        <span className={cn('h-2 w-2 shrink-0 rounded-full', config.dot)} />
        {label}
        <span className="ml-0.5 opacity-70">{clampedScore}/100</span>
      </Badge>
    );
  }

  // lg — dot + label + score + progress bar
  return (
    <div className={cn('inline-flex flex-col gap-1.5', className)}>
      <Badge
        className={cn(
          'inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold',
          config.bg,
          config.text,
          config.border,
          'hover:opacity-90'
        )}
      >
        <span className={cn('h-2 w-2 shrink-0 rounded-full', config.dot)} />
        {label}
        <span className="ml-0.5 opacity-70">{clampedScore}/100</span>
      </Badge>
      <div className="h-1.5 w-full min-w-28 overflow-hidden rounded-full bg-gray-200">
        <div
          className={cn('h-full rounded-full transition-all duration-500', config.bar)}
          style={{ width: `${clampedScore}%` }}
        />
      </div>
    </div>
  );
}
