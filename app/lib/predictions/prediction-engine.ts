import { PredictionModule } from '@prisma/client';
import { prisma } from '@/app/lib/prisma';
import { calculateVolumeForecasts } from './volume-forecast';
import { calculateChurnRisks } from './churn-risk';
import { calculateProvisions } from './provisioning';
import { calculateProactiveRisks } from './proactive-risk';
import { calculateTariffRecommendations } from './tariff-recommendation';
import { detectFraudClusters } from './fraud-cluster';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PredictionRunResult {
  success: string[];
  failed: { module: string; error: string }[];
  duration: number;
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

export async function runAllPredictions(): Promise<PredictionRunResult> {
  const start = Date.now();

  const modules: { name: string; fn: () => Promise<void> }[] = [
    { name: 'VOLUME_FORECAST', fn: calculateVolumeForecasts },
    { name: 'CHURN_RISK', fn: calculateChurnRisks },
    { name: 'PROVISIONING', fn: calculateProvisions },
    { name: 'PROACTIVE_RISK', fn: calculateProactiveRisks },
    { name: 'TARIFF_RECOMMENDATION', fn: calculateTariffRecommendations },
    { name: 'FRAUD_CLUSTER', fn: detectFraudClusters },
  ];

  const settled = await Promise.allSettled(modules.map(m => m.fn()));

  const success: string[] = [];
  const failed: { module: string; error: string }[] = [];

  settled.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      success.push(modules[i].name);
      console.log(`[predictions] ✅ ${modules[i].name} completed`);
    } else {
      const err = result.reason instanceof Error ? result.reason.message : String(result.reason);
      failed.push({ module: modules[i].name, error: err });
      console.error(`[predictions] ❌ ${modules[i].name} failed: ${err}`);
    }
  });

  const duration = Date.now() - start;
  console.log(`[predictions] Finished in ${duration}ms — ${success.length} ok, ${failed.length} failed`);

  return { success, failed, duration };
}

export async function runModule(module: PredictionModule): Promise<void> {
  const map: Record<PredictionModule, () => Promise<void>> = {
    VOLUME_FORECAST: calculateVolumeForecasts,
    CHURN_RISK: calculateChurnRisks,
    PROVISIONING: calculateProvisions,
    PROACTIVE_RISK: calculateProactiveRisks,
    TARIFF_RECOMMENDATION: calculateTariffRecommendations,
    FRAUD_CLUSTER: detectFraudClusters,
  };
  await map[module]();
}

export async function getPredictionLastUpdated(): Promise<Date | null> {
  const result = await prisma.predictionResult.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });
  return result?.createdAt ?? null;
}
