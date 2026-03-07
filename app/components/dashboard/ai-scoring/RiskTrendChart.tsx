'use client';

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export interface WeeklyTrend {
  week:       string;
  faible:     number;
  moyen:      number;
  eleve:      number;
  suspicieux: number;
  avgScore:   number;
}

interface RiskTrendChartProps {
  data: WeeklyTrend[];
}

const COLORS = {
  faible:     '#22c55e',
  moyen:      '#eab308',
  eleve:      '#f97316',
  suspicieux: '#ef4444',
  avgScore:   '#6366f1',
};

interface TooltipPayload {
  name:        string;
  value:       number;
  color:       string;
  strokeColor: string;
  fill:        string;
  dataKey:     string;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayload[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm space-y-1">
      <p className="font-semibold text-gray-800 mb-1">{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: p.fill ?? p.color ?? p.strokeColor }} />
          <span className="text-gray-600">{p.name}:</span>
          <span className="font-medium text-gray-800">
            {p.dataKey === 'avgScore' ? `${p.value}/100` : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function RiskTrendChart({ data }: RiskTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <ComposedChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="week" tick={{ fontSize: 12 }} />
        <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
        <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 12 }} />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value: number) => {
            const labels: Record<string, string> = {
              faible: 'Faible', moyen: 'Moyen', eleve: 'Élevé', suspicieux: 'Suspicieux', avgScore: 'Score moy.',
            };
            return <span className="text-xs text-gray-600">{labels[value] ?? value}</span>;
          }}
        />
        <Bar yAxisId="left" dataKey="faible"     name="faible"     stackId="a" fill={COLORS.faible}     radius={[0,0,0,0]} />
        <Bar yAxisId="left" dataKey="moyen"      name="moyen"      stackId="a" fill={COLORS.moyen}      radius={[0,0,0,0]} />
        <Bar yAxisId="left" dataKey="eleve"      name="eleve"      stackId="a" fill={COLORS.eleve}      radius={[0,0,0,0]} />
        <Bar yAxisId="left" dataKey="suspicieux" name="suspicieux" stackId="a" fill={COLORS.suspicieux} radius={[4,4,0,0]} />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="avgScore"
          name="avgScore"
          stroke={COLORS.avgScore}
          strokeWidth={2}
          dot={{ fill: COLORS.avgScore, r: 3 }}
          activeDot={{ r: 5 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
