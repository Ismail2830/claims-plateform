import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { ClaimType } from '@prisma/client';

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/teams/[id]/balance
 * Auto-balance: reassign unassigned claims from this team's claim types
 * equally among active members.
 */
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        members: {
          where: { user: { isActive: true } },
          include: {
            user: {
              select: {
                userId: true,
                firstName: true,
                lastName: true,
                currentWorkload: true,
              },
            },
          },
        },
      },
    });

    if (!team) {
      return NextResponse.json({ success: false, error: 'Équipe introuvable' }, { status: 404 });
    }

    if (team.members.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Aucun membre actif dans cette équipe' },
        { status: 422 },
      );
    }

    // Fetch unassigned claims matching the team's claim types
    const claimTypeFilter = team.claimTypes.length > 0
      ? { claimType: { in: team.claimTypes as ClaimType[] } }
      : {};
    const unassignedClaims = await prisma.claim.findMany({
      where: {
        assignedTo: null,
        status: { notIn: ['CLOSED', 'REJECTED'] },
        ...claimTypeFilter,
      },
      select: { claimId: true },
    });

    if (unassignedClaims.length === 0) {
      return NextResponse.json({
        success: true,
        data: { redistributed: 0, members: [] },
        message: 'Aucun dossier non assigné à redistribuer',
      });
    }

    // Record before state
    const before = team.members.map((m) => ({
      userId: m.userId,
      name: `${m.user.firstName} ${m.user.lastName}`,
      before: m.user.currentWorkload,
      after: m.user.currentWorkload,
      assigned: 0,
    }));

    // Round-robin assignment
    let idx = 0;
    const assignments: { claimId: string; userId: string }[] = [];

    for (const claim of unassignedClaims) {
      const member = before[idx % before.length];
      member.after += 1;
      member.assigned += 1;
      assignments.push({ claimId: claim.claimId, userId: member.userId });
      idx++;
    }

    // Apply in a transaction
    await prisma.$transaction([
      ...assignments.map(({ claimId, userId }) =>
        prisma.claim.update({ where: { claimId }, data: { assignedTo: userId } }),
      ),
      ...before
        .filter((m) => m.assigned > 0)
        .map((m) =>
          prisma.user.update({
            where: { userId: m.userId },
            data: { currentWorkload: m.after },
          }),
        ),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        redistributed: assignments.length,
        members: before.map(({ name, before: b, after }) => ({ name, before: b, after })),
      },
      message: `${assignments.length} dossier(s) redistribué(s)`,
    });
  } catch (error) {
    console.error('POST /api/teams/[id]/balance error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors du rééquilibrage' },
      { status: 500 },
    );
  }
}
