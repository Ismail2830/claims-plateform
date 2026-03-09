import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { runAllPredictions } from '@/app/lib/predictions/prediction-engine';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ['SUPER_ADMIN']);
  if (!auth.ok) return auth.response;

  const { success, failed, duration } = await runAllPredictions();

  return NextResponse.json({
    success,
    failed,
    duration,
    timestamp: new Date().toISOString(),
  });
}
