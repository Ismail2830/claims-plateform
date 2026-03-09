import { prisma } from '@/app/lib/prisma';
import { Prisma } from '@prisma/client';
import { FraudClusterAlert, FraudMetadata } from './prediction-utils';

// ─── Main Calculation ─────────────────────────────────────────────────────────

export async function detectFraudClusters(): Promise<void> {
  const now = new Date();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
  const oneYearAgoSamePeriod = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  const oneYearPlusFourteen = new Date(fourteenDaysAgo.getTime() - 365 * 24 * 60 * 60 * 1000);

  const alertsToCreate: {
    module: 'FRAUD_CLUSTER';
    severity: 'WARNING' | 'CRITICAL';
    title: string;
    description: string;
    targetId: string | null;
    targetType: string | null;
    metadata: FraudMetadata;
  }[] = [];

  // ── Algorithm 1: Geographic cluster ─────────────────────────────────────────
  type GeoRow = { city: string; claim_type: string; claim_count: number; claim_ids: string[] };
  const geoRows = await prisma.$queryRaw<GeoRow[]>`
    SELECT
      c2.city,
      cl.claim_type,
      COUNT(cl.claim_id)::int AS claim_count,
      ARRAY_AGG(cl.claim_number) AS claim_ids
    FROM claims cl
    JOIN clients c2 ON c2.client_id = cl.client_id
    WHERE cl.created_at >= ${fourteenDaysAgo}
      AND cl.claimed_amount IS NOT NULL
    GROUP BY c2.city, cl.claim_type
    HAVING COUNT(cl.claim_id) > 4
    ORDER BY claim_count DESC
  `;

  // Historical average for same period (1 year prior)
  type GeoHistoRow = { city: string; claim_type: string; hist_count: number };
  const geoHistRows = await prisma.$queryRaw<GeoHistoRow[]>`
    SELECT
      c2.city,
      cl.claim_type,
      COUNT(cl.claim_id)::int AS hist_count
    FROM claims cl
    JOIN clients c2 ON c2.client_id = cl.client_id
    WHERE cl.created_at BETWEEN ${oneYearPlusFourteen} AND ${oneYearAgoSamePeriod}
    GROUP BY c2.city, cl.claim_type
  `;
  const geoHistMap = new Map(geoHistRows.map(r => [`${r.city}:${r.claim_type}`, r.hist_count]));

  for (const row of geoRows) {
    const histCount = geoHistMap.get(`${row.city}:${row.claim_type}`) ?? 1;
    const multiple = row.claim_count / histCount;
    if (multiple >= 3) {
      const affected = Number(row.claim_count);
      alertsToCreate.push({
        module: 'FRAUD_CLUSTER',
        severity: affected >= 10 ? 'CRITICAL' : 'WARNING',
        title: 'Cluster géographique détecté',
        description: `${affected} sinistres de type ${row.claim_type} enregistrés à ${row.city} en 14 jours — ${Math.round(multiple * 100)}% au-dessus de la normale historique.`,
        targetId: null,
        targetType: 'PLATFORM',
        metadata: {
          claimIds: row.claim_ids.slice(0, 20),
          pattern: `GEO:${row.city}:${row.claim_type}`,
          confidence: multiple >= 5 ? 0.85 : 0.70,
          claimCount: affected,
          historicalMultiple: Math.round(multiple * 10) / 10,
        },
      });
    }
  }

  // ── Algorithm 2: Serial claimant network ─────────────────────────────────────
  type SerialRow = {
    client_id: string;
    claim_count: number;
    avg_score: number;
    city: string;
    phone_prefix: string;
    claim_ids: string[];
  };
  const serialRows = await prisma.$queryRaw<SerialRow[]>`
    SELECT
      cl.client_id,
      COUNT(cl.claim_id)::int AS claim_count,
      AVG(COALESCE(cl.score_risque, 0))::float AS avg_score,
      c2.city,
      LEFT(c2.phone, 4) AS phone_prefix,
      ARRAY_AGG(cl.claim_number) AS claim_ids
    FROM claims cl
    JOIN clients c2 ON c2.client_id = cl.client_id
    WHERE cl.created_at >= ${sixMonthsAgo}
    GROUP BY cl.client_id, c2.city, LEFT(c2.phone, 4)
    HAVING COUNT(cl.claim_id) >= 3
      AND AVG(COALESCE(cl.score_risque, 0)) > 60
    ORDER BY claim_count DESC
    LIMIT 50
  `;

  // Group by city + phone_prefix to find coordinated networks
  const networkGroups = new Map<string, typeof serialRows>();
  for (const row of serialRows) {
    const key = `${row.city}:${row.phone_prefix}`;
    if (!networkGroups.has(key)) networkGroups.set(key, []);
    networkGroups.get(key)!.push(row);
  }

  for (const [key, group] of networkGroups) {
    if (group.length >= 2) {
      const [city] = key.split(':');
      const allClaimIds = group.flatMap(r => (r.claim_ids as string[]).slice(0, 5));
      alertsToCreate.push({
        module: 'FRAUD_CLUSTER',
        severity: group.length >= 4 ? 'CRITICAL' : 'WARNING',
        title: 'Réseau de réclamants en série détecté',
        description: `${group.length} clients à ${city} avec le même préfixe téléphonique ont chacun soumis 3+ sinistres à risque élevé en 6 mois.`,
        targetId: null,
        targetType: 'PLATFORM',
        metadata: {
          claimIds: allClaimIds.slice(0, 20),
          pattern: `SERIAL:${key}`,
          confidence: 0.72,
          claimCount: group.reduce((s, r) => s + Number(r.claim_count), 0),
        },
      });
    }
  }

  // ── Algorithm 3: Identical amount pattern ────────────────────────────────────
  type AmountRow = {
    claimed_amount: number;
    occurrence_count: number;
    distinct_clients: number;
    claim_ids: string[];
    total_amount: number;
  };
  const amountRows = await prisma.$queryRaw<AmountRow[]>`
    SELECT
      claimed_amount::float AS claimed_amount,
      COUNT(*)::int AS occurrence_count,
      COUNT(DISTINCT client_id)::int AS distinct_clients,
      ARRAY_AGG(claim_number) AS claim_ids,
      (claimed_amount * COUNT(*))::float AS total_amount
    FROM claims
    WHERE created_at >= ${thirtyDaysAgo}
      AND claimed_amount IS NOT NULL
      AND claimed_amount > 0
      AND MOD(claimed_amount::numeric, 1000) = 0
    GROUP BY claimed_amount
    HAVING COUNT(*) >= 3
      AND COUNT(DISTINCT client_id) >= 3
    ORDER BY occurrence_count DESC
    LIMIT 10
  `;

  for (const row of amountRows) {
    alertsToCreate.push({
      module: 'FRAUD_CLUSTER',
      severity: Number(row.occurrence_count) >= 6 ? 'CRITICAL' : 'WARNING',
      title: 'Montant identique suspect détecté',
      description: `Le montant de ${new Intl.NumberFormat('fr-FR').format(Number(row.claimed_amount))} MAD apparaît ${row.occurrence_count} fois de ${row.distinct_clients} clients différents en 30 jours.`,
      targetId: null,
      targetType: 'PLATFORM',
      metadata: {
        claimIds: (row.claim_ids as string[]).slice(0, 20),
        pattern: `AMOUNT:${row.claimed_amount}`,
        confidence: 0.68,
        claimCount: Number(row.occurrence_count),
        affectedAmount: Number(row.total_amount),
      },
    });
  }

  // Remove old fraud cluster alerts before adding new ones
  await prisma.predictionAlert.deleteMany({
    where: { module: 'FRAUD_CLUSTER', isDismissed: false },
  });

  if (alertsToCreate.length > 0) {
    await prisma.predictionAlert.createMany({
      data: alertsToCreate.map(a => ({ ...a, metadata: a.metadata as unknown as Prisma.InputJsonValue })),
    });
  }
}

// ─── Read Helpers ─────────────────────────────────────────────────────────────

export async function getFraudClusters(includeDismissed = false): Promise<FraudClusterAlert[]> {
  const alerts = await prisma.predictionAlert.findMany({
    where: {
      module: 'FRAUD_CLUSTER',
      ...(!includeDismissed ? { isDismissed: false } : {}),
    },
    orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
  });

  return alerts.map((a: typeof alerts[0]) => ({
    id: a.id,
    module: a.module,
    severity: a.severity,
    title: a.title,
    description: a.description,
    metadata: a.metadata as unknown as FraudMetadata | null,
    isRead: a.isRead,
    isDismissed: a.isDismissed,
    createdAt: a.createdAt.toISOString(),
  }));
}

export async function getFraudAlertCount(): Promise<{ total: number; critical: number }> {
  const [total, critical] = await Promise.all([
    prisma.predictionAlert.count({ where: { module: 'FRAUD_CLUSTER', isDismissed: false } }),
    prisma.predictionAlert.count({
      where: { module: 'FRAUD_CLUSTER', isDismissed: false, severity: 'CRITICAL' },
    }),
  ]);
  return { total, critical };
}

export async function dismissFraudAlert(id: string, note?: string): Promise<void> {
  await prisma.predictionAlert.update({
    where: { id },
    data: {
      isDismissed: true,
      isRead: true,
      ...(note ? { description: `[Ignoré: ${note}]` } : {}),
    },
  });
}
