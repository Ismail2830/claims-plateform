'use client';

import { cn } from '@/lib/utils';

interface PredictionConfidenceBadgeProps {
  confidence: number; // 0-1
  showLabel?: boolean;
}

export function PredictionConfidenceBadge({ confidence, showLabel = true }: PredictionConfidenceBadgeProps) {
  const pct = Math.round(confidence * 100);
  const color =
    pct >= 80 ? 'text-green-700 bg-green-50 border-green-200' :
    pct >= 60 ? 'text-orange-700 bg-orange-50 border-orange-200' :
    'text-red-700 bg-red-50 border-red-200';

  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border', color)}>
      {showLabel && 'Confiance: '}
      {pct}%
    </span>
  );
}
