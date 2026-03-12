import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { prisma } from '@/app/lib/prisma';

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ['MANAGER_SENIOR']);
  if (!auth.ok) return auth.response;

  const experts = await prisma.user.findMany({
    where: { role: 'EXPERT', isActive: true },
    select: {
      userId: true,
      firstName: true,
      lastName: true,
      email: true,
      createdAt: true,
      assignedClaims: {
        select: { claimId: true, status: true },
      },
    },
    orderBy: { firstName: 'asc' },
  });

  const data = experts.map((e: typeof experts[number]) => {
    const total = e.assignedClaims.length;
    const inProgress = e.assignedClaims.filter((c: { status: string }) =>
      ['UNDER_EXPERTISE', 'IN_DECISION', 'ANALYZING'].includes(c.status)
    ).length;
    const completed = e.assignedClaims.filter((c: { status: string }) => c.status === 'APPROVED').length;

    return {
      id: e.userId,
      firstName: e.firstName,
      lastName: e.lastName,
      email: e.email,
      totalAssigned: total,
      inProgress,
      completed,
      utilization: total > 0 ? Math.round((inProgress / total) * 100) : 0,
    };
  });

  return NextResponse.json({ success: true, data });
}
