import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { getProvisions } from '@/app/lib/predictions/provisioning';

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ['SUPER_ADMIN', 'MANAGER_SENIOR']);
  if (!auth.ok) return auth.response;

  const data = await getProvisions();

  if (!data) {
    return NextResponse.json({ provisions: null, total: 0, confidence: 0, lastUpdated: null });
  }

  return NextResponse.json({
    provisions: data.provisions,
    total: data.provisions.TOTAL.estimatedPayout,
    confidence: data.confidence,
    totalHistorical: data.totalHistorical,
    lastUpdated: data.lastUpdated,
  });
}
