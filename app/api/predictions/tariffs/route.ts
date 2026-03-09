import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { getTariffRecommendations } from '@/app/lib/predictions/tariff-recommendation';
import { prisma } from '@/app/lib/prisma';

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ['SUPER_ADMIN', 'MANAGER_SENIOR']);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const daysToRenewal = parseInt(searchParams.get('daysToRenewal') ?? '60', 10);
  const adjustmentType = searchParams.get('adjustmentType') as 'INCREASE' | 'DECREASE' | 'NEUTRAL' | null;

  const recommendations = await getTariffRecommendations(daysToRenewal, adjustmentType ?? undefined);

  const lastResult = await prisma.predictionResult.findFirst({
    where: { module: 'TARIFF_RECOMMENDATION' },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });

  return NextResponse.json({
    recommendations,
    lastUpdated: lastResult?.createdAt ?? null,
  });
}
