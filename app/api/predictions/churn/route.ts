import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { getChurnRisks, getChurnStats } from '@/app/lib/predictions/churn-risk';

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ['SUPER_ADMIN', 'MANAGER_SENIOR']);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100);
  const page = Math.max(parseInt(searchParams.get('page') ?? '1', 10), 1);
  const riskLevel = searchParams.get('riskLevel') as 'HIGH' | 'MEDIUM' | 'LOW' | null;
  const skip = (page - 1) * limit;

  const [{ clients, total }, stats] = await Promise.all([
    getChurnRisks(limit, riskLevel ?? undefined, skip),
    getChurnStats(),
  ]);

  return NextResponse.json({
    clients,
    stats: { high: stats.high, medium: stats.medium, low: stats.low, total: stats.total },
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    lastUpdated: stats.lastUpdated,
  });
}
