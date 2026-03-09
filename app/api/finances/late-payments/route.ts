import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { prisma } from '@/app/lib/prisma';

/** Returns clients with expired policies (potential late renewals / unpaid premiums). */
export async function GET(req: NextRequest) {
  const auth = await requireRole(req, ['SUPER_ADMIN']);
  if (!auth.ok) return auth.response;

  const now = new Date();
  const since = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); // 90 days ago

  const expiredPolicies = await prisma.policy.findMany({
    where: {
      status:  'EXPIRED',
      endDate: { gte: since, lt: now },
    },
    include: {
      client: { select: { clientId: true, firstName: true, lastName: true, email: true, phone: true } },
    },
    orderBy: { endDate: 'desc' },
    take: 50,
  });

  const data = expiredPolicies.map((p: typeof expiredPolicies[number]) => ({
    policyId:     p.policyId,
    policyNumber: p.policyNumber,
    policyType:   p.policyType,
    premiumAmount: Number(p.premiumAmount),
    endDate:      p.endDate,
    daysOverdue:  Math.floor((now.getTime() - p.endDate.getTime()) / 86400000),
    client:       p.client,
  }));

  return NextResponse.json({ success: true, data });
}
