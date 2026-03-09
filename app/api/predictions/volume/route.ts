import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { getVolumeForecasts, getVolumePeakMonth } from '@/app/lib/predictions/volume-forecast';

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ['SUPER_ADMIN', 'MANAGER_SENIOR']);
  if (!auth.ok) return auth.response;

  const data = await getVolumeForecasts();
  const peakMonth = await getVolumePeakMonth();

  if (!data) {
    return NextResponse.json({ forecasts: [], historical: [], peakMonth: null, lastUpdated: null });
  }

  return NextResponse.json({
    forecasts: data.forecasts,
    historical: data.historical,
    peakMonth,
    lastUpdated: data.lastUpdated,
  });
}
