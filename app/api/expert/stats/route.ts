import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireRole } from '@/lib/api-auth';

export async function GET(request: Request) {
  const auth = await requireRole(request, ['EXPERT']);
  if (!auth.ok) return auth.response;
  const { userId } = auth.user;

  const [
    totalAssigned,
    inProgress,
    completedThisMonth,
    pendingDocuments,
    urgentClaims,
    recentClaims,
  ] = await Promise.all([
    // Total claims assigned to this expert
    prisma.claim.count({ where: { assignedTo: userId } }),

    // Claims currently in progress
    prisma.claim.count({
      where: {
        assignedTo: userId,
        status: { in: ['ANALYZING', 'UNDER_EXPERTISE', 'IN_DECISION', 'DOCS_REQUIRED'] },
      },
    }),

    // Claims closed / approved this calendar month
    prisma.claim.count({
      where: {
        assignedTo: userId,
        status: { in: ['APPROVED', 'CLOSED'] },
        updatedAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    }),

    // Documents awaiting verification on assigned claims
    prisma.claimDocument.count({
      where: {
        claim: { assignedTo: userId },
        status: 'UPLOADED',
      },
    }),

    // Claims with HIGH or CRITICAL priority
    prisma.claim.count({
      where: {
        assignedTo: userId,
        priority: { in: ['HIGH', 'URGENT'] },
        status: { notIn: ['CLOSED', 'APPROVED', 'REJECTED'] },
      },
    }),

    // 5 most-recently updated claims
    prisma.claim.findMany({
      where: { assignedTo: userId },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: {
        claimId: true,
        claimNumber: true,
        claimType: true,
        status: true,
        priority: true,
        estimatedAmount: true,
        scoreRisque: true,
        labelRisque: true,
        updatedAt: true,
        client: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

  return NextResponse.json({
    data: {
      totalAssigned,
      inProgress,
      completedThisMonth,
      pendingDocuments,
      urgentClaims,
      recentClaims,
    },
  });
}
