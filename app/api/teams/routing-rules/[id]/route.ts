import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { z } from 'zod';

const updateRuleSchema = z.object({
  claimType: z.string().nullable().optional(),
  minRiskScore: z.number().int().min(0).max(100).nullable().optional(),
  maxRiskScore: z.number().int().min(0).max(100).nullable().optional(),
  minAmount: z.number().nonnegative().nullable().optional(),
  targetTeamId: z.string().uuid().optional(),
  targetRole: z.string().nullable().optional(),
  priority: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

// PATCH /api/teams/routing-rules/[id]
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateRuleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const existing = await prisma.routingRule.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Règle introuvable' }, { status: 404 });
    }

    const rule = await prisma.routingRule.update({
      where: { id },
      data: { ...parsed.data },
      include: {
        targetTeam: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, data: { rule }, message: 'Règle mise à jour' });
  } catch (error) {
    console.error('PATCH /api/teams/routing-rules/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la mise à jour de la règle' },
      { status: 500 },
    );
  }
}

// DELETE /api/teams/routing-rules/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const existing = await prisma.routingRule.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Règle introuvable' }, { status: 404 });
    }

    await prisma.routingRule.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Règle supprimée avec succès' });
  } catch (error) {
    console.error('DELETE /api/teams/routing-rules/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la suppression de la règle' },
      { status: 500 },
    );
  }
}
