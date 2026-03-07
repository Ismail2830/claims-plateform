import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { z } from 'zod';

const updateMemberSchema = z.object({
  role: z.enum(['LEAD', 'MEMBER']).optional(),
  maxClaims: z.number().int().min(1).max(100).optional(),
});

type Params = { params: Promise<{ id: string; userId: string }> };

// PATCH /api/teams/[id]/members/[userId]
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id: teamId, userId } = await params;
    const body = await request.json();
    const parsed = updateMemberSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const existing = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Membre introuvable' }, { status: 404 });
    }

    // If promoting to LEAD, demote current lead(s)
    if (parsed.data.role === 'LEAD') {
      await prisma.teamMember.updateMany({
        where: { teamId, role: 'LEAD', userId: { not: userId } },
        data: { role: 'MEMBER' },
      });
    }

    const member = await prisma.teamMember.update({
      where: { teamId_userId: { teamId, userId } },
      data: { ...parsed.data },
      include: {
        user: {
          select: {
            userId: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            currentWorkload: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: { member }, message: 'Membre mis à jour' });
  } catch (error) {
    console.error('PATCH /api/teams/[id]/members/[userId] error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la mise à jour du membre' },
      { status: 500 },
    );
  }
}

// DELETE /api/teams/[id]/members/[userId] — remove from team
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id: teamId, userId } = await params;

    const existing = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Membre introuvable' }, { status: 404 });
    }

    // Warn if user has active claims (don't block, just count)
    const activeClaims = await prisma.claim.count({
      where: {
        assignedTo: userId,
        status: { notIn: ['CLOSED', 'REJECTED'] },
      },
    });

    await prisma.teamMember.delete({
      where: { teamId_userId: { teamId, userId } },
    });

    return NextResponse.json({
      success: true,
      message: 'Membre retiré de l\'équipe',
      data: { activeClaims },
    });
  } catch (error) {
    console.error('DELETE /api/teams/[id]/members/[userId] error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors du retrait du membre' },
      { status: 500 },
    );
  }
}
