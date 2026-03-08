import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { isLocalMLService } from '@/app/lib/ml-scoring';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL ?? 'http://localhost:8000';

export async function GET() {
  try {
    // Count total predictions (claims that have been scored)
    const totalPredictions = await prisma.claim.count({
      where: { scoreRisque: { not: null } },
    });

    // Get the most recent scoring date
    const lastScored = await prisma.claim.findFirst({
      where:   { scoredAt: { not: null } },
      orderBy: { scoredAt: 'desc' },
      select:  { scoredAt: true },
    });

    let serviceStatus: 'online' | 'offline' = 'offline';
    let modelVersion  = 'v1.0';
    let avgProcessingMs = 0;

    if (isLocalMLService(ML_SERVICE_URL)) {
      // No external ML service configured — inline TypeScript scoring is always available
      serviceStatus   = 'online';
      modelVersion    = 'v1.0';
      avgProcessingMs = 0;
    } else {
      // Try to ping the configured external ML service
      try {
        const start = Date.now();
        const healthRes = await fetch(`${ML_SERVICE_URL}/health`, {
          signal: AbortSignal.timeout(5_000),
        });
        avgProcessingMs = Date.now() - start;

        if (healthRes.ok) {
          serviceStatus = 'online';
          const body = await healthRes.json() as { status?: string; model?: string };
          if (body.model) {
            const versionMatch = body.model.match(/v[\d.]+/);
            if (versionMatch) modelVersion = versionMatch[0];
          }
        }
      } catch {
        serviceStatus = 'offline';
      }
    }

    return NextResponse.json({
      modelVersion,
      lastTrainedAt:    lastScored?.scoredAt ?? null,
      totalPredictions,
      avgProcessingMs,
      serviceStatus,
    });
  } catch (err) {
    console.error('[ai-scoring/model-stats] Error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
