import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { z } from 'zod';

const createTeamSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(255).optional(),
  claimTypes: z.array(z.string()).min(1),
  maxWorkload: z.number().int().min(1).max(200).default(20),
  leadUserId: z.string().uuid().optional(),
  memberIds: z.array(z.string().uuid()).optional(),
});

// GET /api/teams — all teams with member count + workload stats
export async function GET() {
  try {
    const teams = await prisma.team.findMany({
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
        },
        routingRules: { where: { isActive: true }, select: { id: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const teamsWithStats = teams.map((team) => {
      const totalCurrent = team.members.reduce(
        (sum, m) => sum + m.user.currentWorkload,
        0,
      );
      const totalMax = team.members.reduce((sum, m) => sum + m.maxClaims, 0);
      const lead = team.members.find((m) => m.role === 'LEAD');

      return {
        ...team,
        stats: {
          memberCount: team.members.length,
          totalCurrent,
          totalMax,
          workloadPercent: totalMax > 0 ? Math.round((totalCurrent / totalMax) * 100) : 0,
          activeRoutingRules: team.routingRules.length,
        },
        lead: lead
          ? {
              userId: lead.user.userId,
              firstName: lead.user.firstName,
              lastName: lead.user.lastName,
              email: lead.user.email,
            }
          : null,
      };
    });

    return NextResponse.json({ success: true, data: { teams: teamsWithStats } });
  } catch (error) {
    console.error('GET /api/teams error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors du chargement des équipes' },
      { status: 500 },
    );
  }
}

// POST /api/teams — create team with optional lead + members
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createTeamSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { name, description, claimTypes, maxWorkload, leadUserId, memberIds } = parsed.data;

    const existing = await prisma.team.findFirst({ where: { name } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Une équipe avec ce nom existe déjà' },
        { status: 409 },
      );
    }

    const team = await prisma.$transaction(async (tx) => {
      const newTeam = await tx.team.create({
        data: { name, description, claimTypes, maxWorkload },
      });

      const membersToAdd: { teamId: string; userId: string; role: 'LEAD' | 'MEMBER'; maxClaims: number }[] = [];

      if (leadUserId) {
        membersToAdd.push({
          teamId: newTeam.id,
          userId: leadUserId,
          role: 'LEAD',
          maxClaims: maxWorkload,
        });
      }

      if (memberIds?.length) {
        for (const uid of memberIds) {
          if (uid !== leadUserId) {
            membersToAdd.push({
              teamId: newTeam.id,
              userId: uid,
              role: 'MEMBER',
              maxClaims: maxWorkload,
            });
          }
        }
      }

      if (membersToAdd.length > 0) {
        await tx.teamMember.createMany({ data: membersToAdd });
      }

      return newTeam;
    });

    return NextResponse.json(
      { success: true, data: { team }, message: 'Équipe créée avec succès' },
      { status: 201 },
    );
  } catch (error) {
    console.error('POST /api/teams error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la création de l\'équipe' },
      { status: 500 },
    );
  }
}
