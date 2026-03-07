'use client';

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface DistributionData {
  faible:     { count: number; percentage: number };
  moyen:      { count: number; percentage: number };
  eleve:      { count: number; percentage: number };
  suspicieux: { count: number; percentage: number };
}

interface RiskDonutChartProps {
  data:       DistributionData;
  totalLabel?: number;
}

const SEGMENTS = [
  { key: 'faible',     label: 'Faible',     fill: '#22c55e' },
  { key: 'moyen',      label: 'Moyen',      fill: '#eab308' },
  { key: 'eleve',      label: 'Élevé',      fill: '#f97316' },
  { key: 'suspicieux', label: 'Suspicieux', fill: '#ef4444' },
] as const;

interface TooltipPayload {
  name:    string;
  value:   number;
  payload: { pct: number };
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm">
      <p className="font-semibold text-gray-800">{item.name}</p>
      <p className="text-gray-600">{item.value} dossier{item.value !== 1 ? 's' : ''}</p>
      <p className="text-gray-500">{item.payload.pct.toFixed(1)}%</p>
    </div>
  );
}

function CustomLegend({ chartData }: { chartData: { name: string; value: number; pct: number; fill: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 mt-4">
      {chartData.map(item => (
        <div key={item.name} className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.fill }} />
          <span className="text-xs text-gray-600 truncate">{item.name}</span>
          <span className="text-xs font-semibold text-gray-800 ml-auto">{item.value}</span>
          <span className="text-xs text-gray-400">({item.pct.toFixed(0)}%)</span>
        </div>
      ))}
    </div>
  );
}

export function RiskDonutChart({ data, totalLabel }: RiskDonutChartProps) {
  const chartData = SEGMENTS.map(s => ({
    name:  s.label,
    value: data[s.key].count,
    pct:   data[s.key].percentage,
    fill:  s.fill,
  }));

  const total = totalLabel ?? chartData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div>
      <div className="relative h-52">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={88}
              paddingAngle={3}
              dataKey="value"
              animationBegin={0}
              animationDuration={800}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} stroke="white" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-2xl font-bold text-gray-800">{total.toLocaleString('fr-FR')}</p>
          <p className="text-xs text-gray-500">dossiers</p>
        </div>
      </div>
      <CustomLegend chartData={chartData} />
    </div>
  );
}
