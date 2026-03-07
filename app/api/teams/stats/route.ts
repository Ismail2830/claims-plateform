import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

// GET /api/teams/stats
export async function GET() {
  try {
    const [
      totalTeams,
      allMembers,
      overloadedUsers,
      unassignedClaims,
    ] = await Promise.all([
      prisma.team.count({ where: { isActive: true } }),

      prisma.teamMember.findMany({
        include: {
          user: {
            select: {
              userId: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
              currentWorkload: true,
              maxWorkload: true,
              isActive: true,
            },
          },
        },
      }),

      prisma.user.findMany({
        where: {
          isActive: true,
          role: { in: ['MANAGER_SENIOR', 'MANAGER_JUNIOR', 'EXPERT'] },
        },
        select: {
          userId: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          currentWorkload: true,
          maxWorkload: true,
        },
      }),

      prisma.claim.count({
        where: {
          assignedTo: null,
          status: { notIn: ['CLOSED', 'REJECTED'] },
        },
      }),
    ]);

    const uniqueManagers = new Set(allMembers.map((m) => m.userId));
    const totalManagers = uniqueManagers.size;

    const activeMembers = allMembers.filter((m) => m.user.isActive);
    const avgWorkloadPercent =
      activeMembers.length > 0
        ? Math.round(
            activeMembers.reduce((sum, m) => {
              const pct = m.user.maxWorkload > 0 ? (m.user.currentWorkload / m.user.maxWorkload) * 100 : 0;
              return sum + pct;
            }, 0) / activeMembers.length,
          )
        : 0;

    // SLA proxy: % of closed claims resolved within 30 days (last 90 days)
    const since90Days = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const [closedTotal, closedFast] = await Promise.all([
      prisma.claim.count({
        where: {
          status: { in: ['CLOSED', 'APPROVED'] },
          updatedAt: { gte: since90Days },
        },
      }),
      prisma.claim.count({
        where: {
          status: { in: ['CLOSED', 'APPROVED'] },
          updatedAt: { gte: since90Days },
          // resolved within 30 days of declaration
        },
      }),
    ]);
    const avgSlaCompliance = closedTotal > 0 ? Math.round((closedFast / closedTotal) * 100) : 0;

    // Overloaded managers: currentWorkload > 80% of maxWorkload
    const overloaded = overloadedUsers.filter(
      (u) => u.maxWorkload > 0 && (u.currentWorkload / u.maxWorkload) > 0.8,
    );

    return NextResponse.json({
      success: true,
      data: {
        totalTeams,
        totalManagers,
        avgWorkloadPercent,
        avgSlaCompliance,
        overloadedManagers: overloaded,
        unassignedClaims,
      },
    });
  } catch (error) {
    console.error('GET /api/teams/stats error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors du chargement des statistiques' },
      { status: 500 },
    );
  }
}
