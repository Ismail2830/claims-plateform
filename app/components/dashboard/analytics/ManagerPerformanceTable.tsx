'use client';

import { getManagerInitials } from '@/app/lib/analytics-utils';

interface ManagerRow {
  userId: string;
  firstName: string;
  lastName: string;
  role: string;
  currentWorkload: number;
  maxWorkload: number;
  total: number;
  approved: number;
  rejected: number;
  processing: number;
  approvalRate: number;
  avgResolutionDays: number | null;
}

interface Props {
  data: ManagerRow[];
  loading?: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  MANAGER_SENIOR: 'Senior',
  MANAGER_JUNIOR: 'Junior',
  EXPERT: 'Expert',
};

export function ManagerPerformanceTable({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 rounded-lg" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-6">Aucun manager actif trouvé.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-160">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-2 text-xs text-gray-500 font-medium">Manager</th>
            <th className="text-center py-2 text-xs text-gray-500 font-medium">Attribués</th>
            <th className="text-center py-2 text-xs text-gray-500 font-medium">Approuvés</th>
            <th className="text-center py-2 text-xs text-gray-500 font-medium">Rejetés</th>
            <th className="text-center py-2 text-xs text-gray-500 font-medium">Taux appro.</th>
            <th className="text-center py-2 text-xs text-gray-500 font-medium">Délai moy.</th>
            <th className="text-left py-2 text-xs text-gray-500 font-medium">Charge</th>
          </tr>
        </thead>
        <tbody>
          {data.map(m => {
            const workloadPct = m.maxWorkload > 0 ? Math.round((m.currentWorkload / m.maxWorkload) * 100) : 0;
            const workloadColor =
              workloadPct >= 90 ? 'bg-red-500' : workloadPct >= 70 ? 'bg-amber-400' : 'bg-emerald-500';

            return (
              <tr key={m.userId} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                      {getManagerInitials(m.firstName, m.lastName)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {m.firstName} {m.lastName}
                      </p>
                      <p className="text-xs text-gray-400">{ROLE_LABELS[m.role] ?? m.role}</p>
                    </div>
                  </div>
                </td>
                <td className="text-center text-gray-700 font-medium">{m.total}</td>
                <td className="text-center text-emerald-600 font-medium">{m.approved}</td>
                <td className="text-center text-red-500 font-medium">{m.rejected}</td>
                <td className="text-center">
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      m.approvalRate >= 70
                        ? 'bg-emerald-100 text-emerald-700'
                        : m.approvalRate >= 40
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-600'
                    }`}
                  >
                    {m.approvalRate}%
                  </span>
                </td>
                <td className="text-center text-gray-600">
                  {m.avgResolutionDays != null ? `${m.avgResolutionDays}j` : '—'}
                </td>
                <td className="min-w-30">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-2 rounded-full ${workloadColor} transition-all`}
                        style={{ width: `${Math.min(workloadPct, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-8 text-right">{workloadPct}%</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
