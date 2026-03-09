import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { prisma } from '@/app/lib/prisma';

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, ['SUPER_ADMIN']);
  if (!auth.ok) return auth.response;

  const now = new Date();
  const months: { month: string; premiums: number; claims: number }[] = [];

  for (let i = 11; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end   = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

    const [premiumsRaw, claimsRaw] = await Promise.all([
      prisma.policy.aggregate({
        _sum: { premiumAmount: true },
        where: { startDate: { gte: start, lte: end } },
      }),
      prisma.claim.aggregate({
        _sum: { approvedAmount: true },
        where: { status: { in: ['CLOSED', 'IN_PAYMENT'] }, createdAt: { gte: start, lte: end } },
      }),
    ]);

    const label = start.toLocaleDateString('fr-MA', { month: 'short', year: '2-digit' });
    months.push({
      month:    label,
      premiums: Number(premiumsRaw._sum.premiumAmount ?? 0),
      claims:   Number(claimsRaw._sum?.approvedAmount ?? 0),
    });
  }

  return NextResponse.json({ success: true, data: months });
}
