'use client';

import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface ScoringKpiCardProps {
  title:   string;
  value:   string | number;
  unit?:   string;
  trend?:  number;          // positive = risk up (bad), negative = risk down (good)
  color:   'blue' | 'orange' | 'green' | 'red' | 'purple' | 'yellow';
  icon:    LucideIcon;
  alert?:  boolean;
  subtitle?: string;
}

const COLOR_MAP = {
  blue:   { bg: 'bg-blue-50',   icon: 'bg-blue-100   text-blue-600',   value: 'text-blue-700',   border: 'border-blue-200' },
  orange: { bg: 'bg-orange-50', icon: 'bg-orange-100 text-orange-600', value: 'text-orange-700', border: 'border-orange-200' },
  green:  { bg: 'bg-green-50',  icon: 'bg-green-100  text-green-600',  value: 'text-green-700',  border: 'border-green-200' },
  red:    { bg: 'bg-red-50',    icon: 'bg-red-100    text-red-600',    value: 'text-red-700',    border: 'border-red-200' },
  purple: { bg: 'bg-purple-50', icon: 'bg-purple-100 text-purple-600', value: 'text-purple-700', border: 'border-purple-200' },
  yellow: { bg: 'bg-yellow-50', icon: 'bg-yellow-100 text-yellow-600', value: 'text-yellow-700', border: 'border-yellow-200' },
};

export function ScoringKpiCard({ title, value, unit, trend, color, icon: Icon, alert, subtitle }: ScoringKpiCardProps) {
  const c = COLOR_MAP[color];

  return (
    <Card className={cn(
      'relative overflow-hidden border transition-shadow hover:shadow-md',
      c.border,
      alert && 'animate-pulse-border ring-2 ring-red-400 ring-offset-1',
    )}>
      {alert && (
        <div className="absolute top-0 right-0 w-0 h-0 border-l-30 border-l-transparent border-t-30 border-t-red-400" />
      )}
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className={cn('p-2.5 rounded-xl', c.icon)}>
            <Icon className="w-5 h-5" />
          </div>
          {trend !== undefined && (
            <div className={cn(
              'flex items-center space-x-1 text-xs font-medium px-2 py-0.5 rounded-full',
              trend > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700',
            )}>
              {trend > 0
                ? <TrendingUp className="w-3 h-3" />
                : <TrendingDown className="w-3 h-3" />}
              <span>{Math.abs(trend).toFixed(1)}%</span>
            </div>
          )}
        </div>
        <div className="mt-4">
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <div className="flex items-baseline space-x-1 mt-1">
            <span className={cn('text-3xl font-bold', c.value)}>
              {typeof value === 'number' ? value.toLocaleString('fr-FR') : value}
            </span>
            {unit && <span className="text-sm text-gray-500">{unit}</span>}
          </div>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
