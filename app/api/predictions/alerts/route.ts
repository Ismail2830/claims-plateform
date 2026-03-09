import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { prisma } from '@/app/lib/prisma';
import { PredictionModule, AlertSeverity } from '@prisma/client';

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ['SUPER_ADMIN', 'MANAGER_SENIOR']);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const severityParam = searchParams.get('severity') as AlertSeverity | null;
  const moduleParam = searchParams.get('module') as PredictionModule | null;
  const unreadOnly = searchParams.get('unreadOnly') === 'true';

  const alerts = await prisma.predictionAlert.findMany({
    where: {
      isDismissed: false,
      ...(severityParam ? { severity: severityParam } : {}),
      ...(moduleParam ? { module: moduleParam } : {}),
      ...(unreadOnly ? { isRead: false } : {}),
    },
    orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
    take: 100,
  });

  const criticalCount = alerts.filter(a => a.severity === 'CRITICAL').length;

  return NextResponse.json({
    alerts: alerts.map(a => ({
      id: a.id,
      module: a.module,
      severity: a.severity,
      title: a.title,
      description: a.description,
      targetId: a.targetId,
      targetType: a.targetType,
      isRead: a.isRead,
      metadata: a.metadata,
      createdAt: a.createdAt,
    })),
    totalCount: alerts.length,
    criticalCount,
  });
}
