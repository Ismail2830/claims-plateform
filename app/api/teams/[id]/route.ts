import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { z } from 'zod';

const updateTeamSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(255).nullable().optional(),
  claimTypes: z.array(z.string()).min(1).optional(),
  maxWorkload: z.number().int().min(1).max(200).optional(),
  isActive: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

// GET /api/teams/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        members: {
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
          orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
        },
        routingRules: {
          orderBy: { priority: 'asc' },
        },
      },
    });

    if (!team) {
      return NextResponse.json(
        { success: false, error: 'Équipe introuvable' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: { team } });
  } catch (error) {
    console.error('GET /api/teams/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors du chargement de l\'équipe' },
      { status: 500 },
    );
  }
}

// PATCH /api/teams/[id]
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateTeamSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const existing = await prisma.team.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Équipe introuvable' }, { status: 404 });
    }

    if (parsed.data.name && parsed.data.name !== existing.name) {
      const conflict = await prisma.team.findFirst({ where: { name: parsed.data.name } });
      if (conflict) {
        return NextResponse.json(
          { success: false, error: 'Une équipe avec ce nom existe déjà' },
          { status: 409 },
        );
      }
    }

    const team = await prisma.team.update({
      where: { id },
      data: { ...parsed.data },
    });

    return NextResponse.json({ success: true, data: { team }, message: 'Équipe mise à jour' });
  } catch (error) {
    console.error('PATCH /api/teams/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la mise à jour de l\'équipe' },
      { status: 500 },
    );
  }
}

// DELETE /api/teams/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const team = await prisma.team.findUnique({
      where: { id },
      include: { members: { select: { userId: true } } },
    });

    if (!team) {
      return NextResponse.json({ success: false, error: 'Équipe introuvable' }, { status: 404 });
    }

    // Check for active claims assigned to team members
    const memberIds = team.members.map((m) => m.userId);
    if (memberIds.length > 0) {
      const activeClaims = await prisma.claim.count({
        where: {
          assignedTo: { in: memberIds },
          status: { notIn: ['CLOSED', 'REJECTED'] },
        },
      });

      if (activeClaims > 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Impossible de supprimer : ${activeClaims} dossier(s) actif(s) assigné(s) aux membres de cette équipe`,
          },
          { status: 409 },
        );
      }
    }

    await prisma.team.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Équipe supprimée avec succès' });
  } catch (error) {
    console.error('DELETE /api/teams/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la suppression de l\'équipe' },
      { status: 500 },
    );
  }
}
