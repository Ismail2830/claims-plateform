import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { z } from 'zod';

const createRuleSchema = z.object({
  claimType: z.string().optional(),
  minRiskScore: z.number().int().min(0).max(100).nullable().optional(),
  maxRiskScore: z.number().int().min(0).max(100).nullable().optional(),
  minAmount: z.number().nonnegative().nullable().optional(),
  targetTeamId: z.string().uuid(),
  targetRole: z.string().nullable().optional(),
  priority: z.number().int().min(1).default(1),
  isActive: z.boolean().default(true),
});

// GET /api/teams/routing-rules
export async function GET() {
  try {
    const rules = await prisma.routingRule.findMany({
      include: {
        targetTeam: { select: { id: true, name: true, claimTypes: true } },
      },
      orderBy: { priority: 'asc' },
    });

    return NextResponse.json({ success: true, data: { rules } });
  } catch (error) {
    console.error('GET /api/teams/routing-rules error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors du chargement des règles' },
      { status: 500 },
    );
  }
}

// POST /api/teams/routing-rules
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createRuleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const team = await prisma.team.findUnique({ where: { id: parsed.data.targetTeamId } });
    if (!team) {
      return NextResponse.json(
        { success: false, error: 'Équipe cible introuvable' },
        { status: 404 },
      );
    }

    const rule = await prisma.routingRule.create({
      data: {
        claimType: parsed.data.claimType ?? null,
        minRiskScore: parsed.data.minRiskScore ?? null,
        maxRiskScore: parsed.data.maxRiskScore ?? null,
        minAmount: parsed.data.minAmount != null ? parsed.data.minAmount : null,
        targetTeamId: parsed.data.targetTeamId,
        targetRole: parsed.data.targetRole ?? null,
        priority: parsed.data.priority,
        isActive: parsed.data.isActive,
      },
      include: {
        targetTeam: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(
      { success: true, data: { rule }, message: 'Règle créée avec succès' },
      { status: 201 },
    );
  } catch (error) {
    console.error('POST /api/teams/routing-rules error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la création de la règle' },
      { status: 500 },
    );
  }
}
