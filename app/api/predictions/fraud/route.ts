import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { getFraudClusters, getFraudAlertCount } from '@/app/lib/predictions/fraud-cluster';

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ['SUPER_ADMIN', 'MANAGER_SENIOR']);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const includeDismissed = searchParams.get('includeDismissed') === 'true';

  const [clusters, counts] = await Promise.all([
    getFraudClusters(includeDismissed),
    getFraudAlertCount(),
  ]);

  return NextResponse.json({
    clusters,
    totalAlerts: counts.total,
    criticalCount: counts.critical,
    lastUpdated: clusters.length > 0 ? clusters[0].createdAt : null,
  });
}
