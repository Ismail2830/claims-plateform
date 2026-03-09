import { prisma } from '@/app/lib/prisma';
import { Prisma } from '@prisma/client';
import { VolumeForecast, VolumeHistorical, getMonthKey, addMonths, formatMonthLabel } from './prediction-utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MonthlyCountRow {
  month: Date;
  count: number;
}

// ─── Main Calculation ─────────────────────────────────────────────────────────

export async function calculateVolumeForecasts(): Promise<void> {
  // 1. Fetch monthly claim counts for last 24 months
  const rows = await prisma.$queryRaw<MonthlyCountRow[]>`
    SELECT
      DATE_TRUNC('month', created_at)::date AS month,
      COUNT(*)::int AS count
    FROM claims
    WHERE created_at >= NOW() - INTERVAL '24 months'
    GROUP BY DATE_TRUNC('month', created_at)
    ORDER BY DATE_TRUNC('month', created_at) ASC
  `;

  // Build a complete month map for last 24 months (fill missing with 0)
  const today = new Date();
  today.setDate(1);
  today.setHours(0, 0, 0, 0);
  const rowMap = new Map<string, number>();
  for (const r of rows) {
    rowMap.set(getMonthKey(new Date(r.month)), r.count);
  }

  const historicalCounts: number[] = [];
  const historicalKeys: string[] = [];
  for (let i = 23; i >= 0; i--) {
    const d = addMonths(today, -i);
    const key = getMonthKey(d);
    historicalKeys.push(key);
    historicalCounts.push(rowMap.get(key) ?? 0);
  }

  const n = historicalCounts.length; // 24

  // 2. Calculate 3-month moving average (used for seasonal index base)
  const movingAvg: number[] = [];
  for (let i = 0; i < n; i++) {
    if (i < 2) {
      movingAvg.push(historicalCounts[i]);
    } else {
      movingAvg.push((historicalCounts[i] + historicalCounts[i - 1] + historicalCounts[i - 2]) / 3);
    }
  }

  // 3. Calculate seasonal index per calendar month using last 24 months
  const monthSums = new Array(12).fill(0);
  const monthCounts = new Array(12).fill(0);
  for (let i = 0; i < n; i++) {
    const [year, month] = historicalKeys[i].split('-').map(Number);
    const calMonth = month - 1; // 0-indexed
    monthSums[calMonth] += historicalCounts[i];
    monthCounts[calMonth]++;
  }
  const overallAvg = historicalCounts.reduce((a, b) => a + b, 0) / n;
  const seasonalIndex: number[] = monthSums.map((sum, i) => {
    const avg = monthCounts[i] > 0 ? sum / monthCounts[i] : overallAvg;
    return overallAvg > 0 ? avg / overallAvg : 1;
  });

  // 4. Linear regression slope on last 12 months of moving averages
  const last12 = movingAvg.slice(12);
  const xVals = last12.map((_, i) => i + 1);
  const meanX = xVals.reduce((a, b) => a + b, 0) / 12;
  const meanY = last12.reduce((a, b) => a + b, 0) / 12;
  const numerator = xVals.reduce((sum, x, i) => sum + x * last12[i], 0) - 12 * meanX * meanY;
  const denominator = xVals.reduce((sum, x) => sum + x * x, 0) - 12 * meanX * meanX;
  const slope = denominator !== 0 ? numerator / denominator : 0;

  const lastMonthCount = historicalCounts[n - 1];

  // 5. Generate 12-month forecast
  const forecasts: VolumeForecast[] = [];
  for (let i = 1; i <= 12; i++) {
    const futureDate = addMonths(today, i);
    const calMonth = futureDate.getMonth();
    const monthKey = getMonthKey(futureDate);
    const rawPredicted = Math.max(0, (lastMonthCount + slope * i) * seasonalIndex[calMonth]);
    const predicted = Math.round(rawPredicted);
    forecasts.push({
      month: monthKey,
      monthLabel: formatMonthLabel(monthKey),
      predicted,
      lower: Math.round(rawPredicted * 0.85),
      upper: Math.round(rawPredicted * 1.15),
    });
  }

  // Also save historical data for chart context
  const historical: VolumeHistorical[] = historicalKeys.slice(12).map((key, i) => ({
    month: key,
    monthLabel: formatMonthLabel(key),
    actual: historicalCounts[12 + i],
  }));

  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 30);

  // Delete old result before inserting new
  await prisma.predictionResult.deleteMany({
    where: { module: 'VOLUME_FORECAST', targetType: 'PLATFORM' },
  });

  await prisma.predictionResult.create({
    data: {
      module: 'VOLUME_FORECAST',
      targetType: 'PLATFORM',
      data: { forecasts, historical } as unknown as Prisma.InputJsonValue,
      confidence: historicalCounts.filter(c => c > 0).length >= 18 ? 0.85 : 0.70,
      validUntil,
    },
  });
}

// ─── Read Helpers ─────────────────────────────────────────────────────────────

export async function getVolumeForecasts(): Promise<{
  forecasts: VolumeForecast[];
  historical: VolumeHistorical[];
  lastUpdated: Date | null;
} | null> {
  const result = await prisma.predictionResult.findFirst({
    where: { module: 'VOLUME_FORECAST', targetType: 'PLATFORM' },
    orderBy: { createdAt: 'desc' },
  });
  if (!result) return null;
  const data = result.data as unknown as { forecasts: VolumeForecast[]; historical: VolumeHistorical[] };
  return {
    forecasts: data.forecasts ?? [],
    historical: data.historical ?? [],
    lastUpdated: result.createdAt,
  };
}

export async function getVolumePeakMonth(): Promise<{ month: string; predicted: number } | null> {
  const data = await getVolumeForecasts();
  if (!data || data.forecasts.length === 0) return null;
  const peak = data.forecasts.reduce((max, f) => (f.predicted > max.predicted ? f : max));
  return { month: peak.monthLabel, predicted: peak.predicted };
}
