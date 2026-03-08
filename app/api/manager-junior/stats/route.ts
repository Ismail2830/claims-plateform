import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireRole } from '@/lib/api-auth';

export async function GET(request: Request) {
  const auth = await requireRole(request, ['MANAGER_JUNIOR']);
  if (!auth.ok) return auth.response;
  const { userId } = auth.user;

  // Get all team members in teams where this manager is a member
  const memberships = await prisma.teamMember.findMany({
    where: { userId },
    select: {
      team: {
        select: {
          teamId: true,
          name: true,
          members: { select: { userId: true, role: true } },
        },
      },
    },
  });

  const teamUserIds = Array.from(
    new Set(memberships.flatMap((m) => m.team.members.map((mb) => mb.userId)))
  );

  const [
    totalClaims,
    pendingApprovals,
    activeExperts,
    claimsThisWeek,
    urgentClaims,
    teamStats,
    recentClaims,
  ] = await Promise.all([
    prisma.claim.count({ where: { assignedTo: { in: teamUserIds } } }),
    prisma.claim.count({
      where: {
        assignedTo: { in: teamUserIds },
        status: 'IN_DECISION',
      },
    }),
    prisma.user.count({
      where: {
        userId: { in: teamUserIds },
        role: 'EXPERT',
        isActive: true,
      },
    }),
    prisma.claim.count({
      where: {
        assignedTo: { in: teamUserIds },
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    }),
    prisma.claim.count({
      where: {
        assignedTo: { in: teamUserIds },
        priority: { in: ['HIGH', 'URGENT'] },
        status: { notIn: ['CLOSED', 'APPROVED', 'REJECTED'] },
      },
    }),
    // Per-expert workload
    prisma.user.findMany({
      where: { userId: { in: teamUserIds }, role: 'EXPERT' },
      select: {
        userId: true,
        firstName: true,
        lastName: true,
        currentWorkload: true,
        maxWorkload: true,
        isActive: true,
        assignedClaims: {
          where: { status: { notIn: ['CLOSED', 'APPROVED', 'REJECTED'] } },
          select: { claimId: true },
        },
      },
    }),
    prisma.claim.findMany({
      where: { assignedTo: { in: teamUserIds } },
      orderBy: { updatedAt: 'desc' },
      take: 8,
      select: {
        claimId: true,
        claimNumber: true,
        claimType: true,
        status: true,
        priority: true,
        updatedAt: true,
        client: { select: { firstName: true, lastName: true } },
        assignedUser: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

  return NextResponse.json({
    data: {
      totalClaims,
      pendingApprovals,
      activeExperts,
      claimsThisWeek,
      urgentClaims,
      teamStats: teamStats.map((u) => ({
        userId: u.userId,
        firstName: u.firstName,
        lastName: u.lastName,
        isActive: u.isActive,
        activeClaims: u.assignedClaims.length,
        currentWorkload: u.currentWorkload,
        maxWorkload: u.maxWorkload,
      })),
      recentClaims,
    },
  });
}
