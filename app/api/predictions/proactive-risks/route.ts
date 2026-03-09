import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { getProactiveRisks, getProactiveAlertCount } from '@/app/lib/predictions/proactive-risk';

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ['SUPER_ADMIN', 'MANAGER_SENIOR']);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const minScore = parseInt(searchParams.get('minScore') ?? '50', 10);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100);
  const page = Math.max(parseInt(searchParams.get('page') ?? '1', 10), 1);
  const skip = (page - 1) * limit;

  const [{ claims, total }, alertCount] = await Promise.all([
    getProactiveRisks(minScore, skip, limit),
    getProactiveAlertCount(),
  ]);

  return NextResponse.json({
    claims,
    alertCount,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    lastUpdated: claims.length > 0 ? new Date() : null,
  });
}
