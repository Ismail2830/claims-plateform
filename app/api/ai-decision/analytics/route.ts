/**
 * GET /api/ai-decision/analytics
 * Returns AI decision performance analytics for the super-admin dashboard.
 * Auth: ADMIN, SUPER_ADMIN
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { prisma } from '@/app/lib/prisma';

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ['ADMIN', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;

  // Fetch all decisions
  const decisions = await prisma.aIDecision.findMany({
    include: {
      claim: {
        select: {
          claimType:  true,
          assignedTo: true,
          assignedUser: {
            select: { userId: true, firstName: true, lastName: true },
          },
        },
      },
    },
    orderBy: { calculatedAt: 'desc' },
  });

  const totalDecisions = decisions.length;

  // Follow rate (decisions where manager gave feedback)
  const withFeedback    = decisions.filter(d => d.followedByUser !== null);
  const followed        = withFeedback.filter(d => d.followedByUser === true);
  const followRate      = withFeedback.length > 0
    ? Math.round((followed.length / withFeedback.length) * 100)
    : 0;

  // Distribution
  const recommendationDistribution = {
    APPROVE:  decisions.filter(d => d.recommendation === 'APPROVE').length,
    REJECT:   decisions.filter(d => d.recommendation === 'REJECT').length,
    ESCALATE: decisions.filter(d => d.recommendation === 'ESCALATE').length,
  };

  // Accuracy by claim type
  const typeMap: Record<string, { total: number; followed: number }> = {};
  for (const d of decisions) {
    const t = d.claim?.claimType ?? 'UNKNOWN';
    if (!typeMap[t]) typeMap[t] = { total: 0, followed: 0 };
    typeMap[t].total += 1;
    if (d.followedByUser === true) typeMap[t].followed += 1;
  }
  const accuracyByType: Record<string, { total: number; followed: number; accuracy: number }> = {};
  for (const [t, v] of Object.entries(typeMap)) {
    accuracyByType[t] = {
      ...v,
      accuracy: v.total > 0 ? Math.round((v.followed / v.total) * 100) : 0,
    };
  }

  // Override reasons breakdown
  const reasonMap: Record<string, number> = {};
  for (const d of decisions) {
    if (d.ignoredReason) {
      reasonMap[d.ignoredReason] = (reasonMap[d.ignoredReason] ?? 0) + 1;
    }
  }
  const totalOverrides = Object.values(reasonMap).reduce((s, c) => s + c, 0);
  const overrideReasons = Object.entries(reasonMap).map(([reason, count]) => ({
    reason,
    count,
    percentage: totalOverrides > 0 ? Math.round((count / totalOverrides) * 100) : 0,
  })).sort((a, b) => b.count - a.count);

  // Confidence accuracy buckets
  const buckets: { range: string; min: number; max: number; followed: number; total: number }[] = [
    { range: '90–100%', min: 90, max: 100, followed: 0, total: 0 },
    { range: '80–90%',  min: 80, max: 90,  followed: 0, total: 0 },
    { range: '70–80%',  min: 70, max: 80,  followed: 0, total: 0 },
    { range: '60–70%',  min: 60, max: 70,  followed: 0, total: 0 },
    { range: '<60%',    min: 0,  max: 60,  followed: 0, total: 0 },
  ];
  for (const d of withFeedback) {
    const b = buckets.find(bk => d.confidence >= bk.min && d.confidence < bk.max + (bk.max === 100 ? 1 : 0));
    if (b) {
      b.total += 1;
      if (d.followedByUser) b.followed += 1;
    }
  }
  const confidenceAccuracy = buckets.map(b => ({
    range:    b.range,
    followed: b.followed,
    total:    b.total,
    rate:     b.total > 0 ? Math.round((b.followed / b.total) * 100) : null,
  }));

  // Top overriding managers (those who most often ignored the recommendation)
  const managerMap: Record<string, { name: string; overrideCount: number; totalDecisions: number }> = {};
  for (const d of decisions) {
    const userId = d.claim?.assignedTo;
    if (!userId) continue;
    const user = d.claim?.assignedUser;
    const name = user ? `${user.firstName} ${user.lastName}` : userId;
    if (!managerMap[userId]) managerMap[userId] = { name, overrideCount: 0, totalDecisions: 0 };
    managerMap[userId].totalDecisions += 1;
    if (d.followedByUser === false) managerMap[userId].overrideCount += 1;
  }
  const topOverridingManagers = Object.entries(managerMap)
    .map(([managerId, v]) => ({ managerId, ...v }))
    .sort((a, b) => b.overrideCount - a.overrideCount)
    .slice(0, 5);

  // Escalades évitées = APPROVE or REJECT recommendations that were followed
  const escalatesAvoided = decisions.filter(
    d => (d.recommendation === 'APPROVE' || d.recommendation === 'REJECT') && d.followedByUser === true,
  ).length;

  // This month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const thisMonth = decisions.filter(d => d.calculatedAt >= startOfMonth).length;

  return NextResponse.json({
    totalDecisions,
    followRate,
    escalatesAvoided,
    thisMonth,
    accuracyByType,
    recommendationDistribution,
    overrideReasons,
    confidenceAccuracy,
    topOverridingManagers,
  });
}
