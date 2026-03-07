'use client';

interface WorkloadBarProps {
  current: number;
  max: number;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

function getBarColor(pct: number): string {
  if (pct > 90) return 'bg-red-500';
  if (pct > 70) return 'bg-yellow-500';
  return 'bg-green-500';
}

function getTextColor(pct: number): string {
  if (pct > 90) return 'text-red-700';
  if (pct > 70) return 'text-yellow-700';
  return 'text-green-700';
}

const HEIGHT: Record<string, string> = {
  sm: 'h-1.5',
  md: 'h-2',
  lg: 'h-3',
};

export function WorkloadBar({ current, max, showText = false, size = 'md' }: WorkloadBarProps) {
  const pct = max > 0 ? Math.min(Math.round((current / max) * 100), 100) : 0;
  const barColor = getBarColor(pct);
  const textColor = getTextColor(pct);
  const pulse = pct > 90 ? 'animate-pulse' : '';

  return (
    <div className="w-full space-y-1">
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${HEIGHT[size]}`}>
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor} ${pulse}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showText && (
        <p className={`text-xs font-medium tabular-nums ${textColor}`}>
          {current} / {max}{' '}
          <span className="text-gray-400 font-normal">({pct}%)</span>
        </p>
      )}
    </div>
  );
}
