import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { prisma } from '@/app/lib/prisma';

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, ['SUPER_ADMIN']);
  if (!auth.ok) return auth.response;

  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    activePolicies,
    totalPremiumsRaw,
    monthlyPremiumsRaw,
    approvedClaimsRaw,
    monthlyClaimsRaw,
    expiredPolicies,
  ] = await Promise.all([
    prisma.policy.count({ where: { status: 'ACTIVE' } }),
    prisma.policy.aggregate({
      _sum: { premiumAmount: true },
      where: { status: 'ACTIVE', startDate: { lte: now }, endDate: { gte: now } },
    }),
    prisma.policy.aggregate({
      _sum: { premiumAmount: true },
      where: { status: 'ACTIVE', startDate: { gte: startOfMonth } },
    }),
    prisma.claim.aggregate({
      _sum: { approvedAmount: true },
      where: { status: { in: ['CLOSED', 'IN_PAYMENT'] }, createdAt: { gte: startOfYear } },
    }),
    prisma.claim.aggregate({
      _sum: { approvedAmount: true },
      where: { status: { in: ['CLOSED', 'IN_PAYMENT'] }, createdAt: { gte: startOfMonth } },
    }),
    prisma.policy.count({ where: { status: 'EXPIRED' } }),
  ]);

  const totalPremiums  = Number(totalPremiumsRaw._sum.premiumAmount ?? 0);
  const monthlyPremiums = Number(monthlyPremiumsRaw._sum.premiumAmount ?? 0);
  const totalClaims    = Number(approvedClaimsRaw._sum?.approvedAmount ?? 0);
  const monthlyClaims  = Number(monthlyClaimsRaw._sum?.approvedAmount ?? 0);
  const lossRatio      = totalPremiums > 0 ? Math.round((totalClaims / totalPremiums) * 100) / 100 : 0;

  return NextResponse.json({
    success: true,
    data: {
      activePolicies,
      expiredPolicies,
      totalPremiums,
      monthlyPremiums,
      totalClaimsAmount: totalClaims,
      monthlyClaimsAmount: monthlyClaims,
      lossRatio,
      netResult: totalPremiums - totalClaims,
    },
  });
}
