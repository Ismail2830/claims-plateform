import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { getPredictionLastUpdated } from '@/app/lib/predictions/prediction-engine';
import { getVolumePeakMonth } from '@/app/lib/predictions/volume-forecast';
import { getChurnStats } from '@/app/lib/predictions/churn-risk';
import { getProvisionTotal } from '@/app/lib/predictions/provisioning';
import { getProactiveAlertCount } from '@/app/lib/predictions/proactive-risk';
import { getFraudAlertCount } from '@/app/lib/predictions/fraud-cluster';
import { prisma } from '@/app/lib/prisma';

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ['SUPER_ADMIN', 'MANAGER_SENIOR']);
  if (!auth.ok) return auth.response;

  const [
    lastUpdated,
    peakMonth,
    churnStats,
    totalProvisions,
    proactiveAlerts,
    fraudCounts,
    tariffPending,
  ] = await Promise.all([
    getPredictionLastUpdated(),
    getVolumePeakMonth(),
    getChurnStats(),
    getProvisionTotal(),
    getProactiveAlertCount(),
    getFraudAlertCount(),
    prisma.predictionResult.count({ where: { module: 'TARIFF_RECOMMENDATION' } }),
  ]);

  return NextResponse.json({
    lastUpdated,
    volumePeakMonth: peakMonth?.month ?? null,
    churnHighRisk: churnStats.high,
    totalProvisions,
    proactiveAlerts,
    tariffsPending: tariffPending,
    fraudAlerts: fraudCounts.total,
    fraudCritical: fraudCounts.critical,
  });
}
