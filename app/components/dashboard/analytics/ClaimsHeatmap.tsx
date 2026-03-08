'use client';

interface HeatmapCell {
  dayOfWeek: number;
  hour: number;
  count: number;
}

interface Props {
  data: HeatmapCell[];
  maxCount: number;
}

const DAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const HOUR_LABELS = Array.from({ length: 24 }, (_, i) => `${i}h`);

function getCellColor(count: number, maxCount: number): string {
  if (count === 0 || maxCount === 0) return 'bg-gray-50';
  const intensity = count / maxCount;
  if (intensity < 0.15) return 'bg-blue-100';
  if (intensity < 0.35) return 'bg-blue-200';
  if (intensity < 0.55) return 'bg-blue-400';
  if (intensity < 0.75) return 'bg-blue-600';
  return 'bg-blue-800';
}

export function ClaimsHeatmap({ data, maxCount }: Props) {
  // Build a lookup grid[day][hour]
  const grid: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0));
  for (const d of data) {
    grid[d.dayOfWeek][d.hour] = d.count;
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-150">
        {/* Hour axis */}
        <div className="flex ml-10 mb-1">
          {HOUR_LABELS.map((h, i) => (
            <div key={i} className="flex-1 text-center text-[9px] text-gray-400 leading-none">
              {i % 3 === 0 ? h : ''}
            </div>
          ))}
        </div>

        {/* Rows */}
        {DAY_LABELS.map((day, dayIndex) => (
          <div key={dayIndex} className="flex items-center mb-0.5">
            <div className="w-10 text-xs text-gray-500 font-medium shrink-0">{day}</div>
            {Array.from({ length: 24 }, (_, hour) => {
              const count = grid[dayIndex][hour];
              return (
                <div
                  key={hour}
                  title={`${day} ${HOUR_LABELS[hour]}: ${count} sinistre${count !== 1 ? 's' : ''}`}
                  className={`flex-1 h-6 rounded-sm mx-px cursor-default transition-opacity hover:opacity-75 ${getCellColor(count, maxCount)}`}
                />
              );
            })}
          </div>
        ))}

        {/* Legend */}
        <div className="flex items-center gap-1.5 mt-3 justify-end">
          <span className="text-xs text-gray-400">Moins</span>
          {['bg-gray-50', 'bg-blue-100', 'bg-blue-200', 'bg-blue-400', 'bg-blue-600', 'bg-blue-800'].map((c, i) => (
            <div key={i} className={`w-4 h-4 rounded-sm ${c} border border-gray-100`} />
          ))}
          <span className="text-xs text-gray-400">Plus</span>
        </div>
      </div>
    </div>
  );
}
