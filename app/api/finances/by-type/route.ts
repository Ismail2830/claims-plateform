import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { prisma } from '@/app/lib/prisma';

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, ['SUPER_ADMIN']);
  if (!auth.ok) return auth.response;

  const byType = await prisma.policy.groupBy({
    by: ['policyType'],
    _sum:   { premiumAmount: true },
    _count: { policyId: true },
    where:  { status: 'ACTIVE' },
    orderBy: { _sum: { premiumAmount: 'desc' } },
  });

  const data = byType.map((row: typeof byType[number]) => ({
    type:     row.policyType,
    premiums: Number(row._sum.premiumAmount ?? 0),
    count:    row._count.policyId,
  }));

  return NextResponse.json({ success: true, data });
}
