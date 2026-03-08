import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireRole } from '@/lib/api-auth';

export async function GET(request: Request) {
  const auth = await requireRole(request, ['MANAGER_SENIOR']);
  if (!auth.ok) return auth.response;

  const [
    totalClaims,
    pendingApprovals,
    escalatedClaims,
    approvedThisMonth,
    totalUsers,
    urgentClaims,
    recentClaims,
    statusBreakdown,
  ] = await Promise.all([
    prisma.claim.count(),
    prisma.claim.count({ where: { status: 'IN_DECISION' } }),
    prisma.claim.count({
      where: {
        status: { notIn: ['CLOSED', 'APPROVED', 'REJECTED'] },
        priority: { in: ['HIGH', 'URGENT'] },
      },
    }),
    prisma.claim.count({
      where: {
        status: { in: ['APPROVED', 'CLOSED'] },
        updatedAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    }),
    prisma.user.count({ where: { isActive: true } }),
    prisma.claim.count({
      where: {
        priority: { in: ['HIGH', 'URGENT'] },
        status: { notIn: ['CLOSED', 'APPROVED', 'REJECTED'] },
      },
    }),
    prisma.claim.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 8,
      select: {
        claimId: true,
        claimNumber: true,
        claimType: true,
        status: true,
        priority: true,
        estimatedAmount: true,
        updatedAt: true,
        client: { select: { firstName: true, lastName: true } },
        assignedUser: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.claim.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
  ]);

  return NextResponse.json({
    data: {
      totalClaims,
      pendingApprovals,
      escalatedClaims,
      approvedThisMonth,
      totalUsers,
      urgentClaims,
      recentClaims,
      statusBreakdown: statusBreakdown.map((s) => ({
        status: s.status,
        count: s._count._all,
      })),
    },
  });
}
