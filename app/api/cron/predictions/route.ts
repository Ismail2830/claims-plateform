import { NextRequest, NextResponse } from 'next/server';
import { runAllPredictions } from '@/app/lib/predictions/prediction-engine';

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const { success, failed, duration } = await runAllPredictions();

  return NextResponse.json({
    success,
    failed,
    duration,
    timestamp: new Date().toISOString(),
  });
}
