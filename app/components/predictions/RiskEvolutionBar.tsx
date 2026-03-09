'use client';

import { getRiskEvolutionLabel } from '@/app/lib/predictions/prediction-utils';

interface RiskEvolutionBarProps {
  originalScore: number;
  evolvedScore: number;
}

function scoreColor(score: number): string {
  if (score >= 70) return 'bg-red-500';
  if (score >= 50) return 'bg-orange-400';
  return 'bg-yellow-400';
}

export function RiskEvolutionBar({ originalScore, evolvedScore }: RiskEvolutionBarProps) {
  const boost = evolvedScore - originalScore;
  const label = getRiskEvolutionLabel(originalScore, evolvedScore);
  const labelColor =
    boost > 20 ? 'text-red-600 font-bold' :
    boost > 10 ? 'text-orange-600 font-semibold' :
    'text-gray-500';

  return (
    <div className="space-y-1.5">
      {/* Original score */}
      <div className="flex items-center gap-2">
        <span className="w-20 text-xs text-gray-500 shrink-0">Original</span>
        <div className="flex-1 bg-gray-100 rounded-full h-2.5">
          <div
            className="bg-gray-400 h-2.5 rounded-full transition-all"
            style={{ width: `${originalScore}%` }}
          />
        </div>
        <span className="w-12 text-xs text-gray-600 text-right">{originalScore}/100</span>
      </div>

      {/* Evolved score */}
      <div className="flex items-center gap-2">
        <span className="w-20 text-xs text-gray-700 font-medium shrink-0">Évolué</span>
        <div className="flex-1 bg-gray-100 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full transition-all ${scoreColor(evolvedScore)}`}
            style={{ width: `${evolvedScore}%` }}
          />
        </div>
        <span className="w-12 text-xs font-semibold text-right" style={{ color: evolvedScore >= 70 ? '#DC2626' : evolvedScore >= 50 ? '#D97706' : '#374151' }}>
          {evolvedScore}/100
        </span>
      </div>

      {/* Label */}
      <div className="flex items-center gap-1">
        <span className={`text-xs ${labelColor}`}>{label}</span>
        {boost > 0 && (
          <span className="text-xs text-red-500 font-semibold">▲ +{boost}</span>
        )}
      </div>
    </div>
  );
}
