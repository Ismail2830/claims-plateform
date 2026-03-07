import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { z } from 'zod';

const addMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['LEAD', 'MEMBER']).default('MEMBER'),
  maxClaims: z.number().int().min(1).max(100).default(20),
});

type Params = { params: Promise<{ id: string }> };

// GET /api/teams/[id]/members
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const members = await prisma.teamMember.findMany({
      where: { teamId: id },
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
            lastLogin: true,
          },
        },
      },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
    });

    return NextResponse.json({ success: true, data: { members } });
  } catch (error) {
    console.error('GET /api/teams/[id]/members error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors du chargement des membres' },
      { status: 500 },
    );
  }
}

// POST /api/teams/[id]/members — add a member
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = addMemberSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { userId, role, maxClaims } = parsed.data;

    // Validate team exists
    const team = await prisma.team.findUnique({ where: { id } });
    if (!team) {
      return NextResponse.json({ success: false, error: 'Équipe introuvable' }, { status: 404 });
    }

    // Validate user exists and has a manager / expert role
    const user = await prisma.user.findUnique({ where: { userId } });
    if (!user) {
      return NextResponse.json({ success: false, error: 'Utilisateur introuvable' }, { status: 404 });
    }
    if (!['MANAGER_SENIOR', 'MANAGER_JUNIOR', 'EXPERT'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Seuls les gestionnaires et experts peuvent être membres d\'une équipe' },
        { status: 422 },
      );
    }

    // Check not already in team
    const already = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: id, userId } },
    });
    if (already) {
      return NextResponse.json(
        { success: false, error: 'Cet utilisateur est déjà membre de cette équipe' },
        { status: 409 },
      );
    }

    // If new member is LEAD, demote existing lead(s)
    if (role === 'LEAD') {
      await prisma.teamMember.updateMany({
        where: { teamId: id, role: 'LEAD' },
        data: { role: 'MEMBER' },
      });
    }

    const member = await prisma.teamMember.create({
      data: { teamId: id, userId, role, maxClaims },
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
          },
        },
      },
    });

    return NextResponse.json(
      { success: true, data: { member }, message: 'Membre ajouté avec succès' },
      { status: 201 },
    );
  } catch (error) {
    console.error('POST /api/teams/[id]/members error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de l\'ajout du membre' },
      { status: 500 },
    );
  }
}
