import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireRole } from '@/lib/api-auth';

export async function GET(request: Request) {
  const auth = await requireRole(request, ['SUPER_ADMIN']);
  if (!auth.ok) return auth.response;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalUsers,
    activeUsers,
    totalClaims,
    pendingClaims,
    newClaimsThisMonth,
    resolvedClaims,
    recentClaims,
    recentUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.claim.count(),
    prisma.claim.count({ where: { status: { in: ['DECLARED', 'ANALYZING', 'IN_DECISION'] } } }),
    prisma.claim.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.claim.count({ where: { status: 'APPROVED' } }),
    prisma.claim.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        claimId: true,
        claimNumber: true,
        status: true,
        priority: true,
        createdAt: true,
        assignedUser: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { userId: true, firstName: true, lastName: true, email: true, role: true, isActive: true, createdAt: true },
    }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      totalUsers,
      activeUsers,
      totalClaims,
      pendingClaims,
      newClaimsThisMonth,
      resolvedClaims,
      recentClaims,
      recentUsers,
    },
  });
}
