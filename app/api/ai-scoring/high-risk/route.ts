import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit       = Math.min(parseInt(searchParams.get('limit') ?? '10'), 100);
    const page        = Math.max(parseInt(searchParams.get('page')  ?? '1'), 1);
    const labelFilter = searchParams.get('labelFilter') ?? '';
    const includeAll  = searchParams.get('includeAll') === 'true';

    const where: Prisma.ClaimWhereInput = includeAll
      ? { scoreRisque: { not: null } }
      : labelFilter === 'ELEVE' || labelFilter === 'MOYEN' || labelFilter === 'FAIBLE' || labelFilter === 'SUSPICIEUX'
        ? { labelRisque: labelFilter }
        : { scoreRisque: { gte: 61 }, labelRisque: { in: ['ELEVE', 'SUSPICIEUX'] } };

    const [claims, total] = await Promise.all([
      prisma.claim.findMany({
        where,
        orderBy: { scoreRisque: 'desc' },
        skip:  (page - 1) * limit,
        take:  limit,
        select: {
          claimId:         true,
          claimNumber:     true,
          claimType:       true,
          claimedAmount:   true,
          declarationDate: true,
          scoreRisque:     true,
          labelRisque:     true,
          decisionIa:      true,
          scoreConfidence: true,
          scoredAt:        true,
          status:          true,
          client: {
            select: {
              firstName: true,
              lastName:  true,
              phone:     true,
            },
          },
          assignedUser: {
            select: {
              firstName: true,
              lastName:  true,
              role:      true,
            },
          },
        },
      }),
      prisma.claim.count({ where }),
    ]);

    const data = claims.map(c => ({
      id:               c.claimId,
      claimNumber:      c.claimNumber,
      clientName:       `${c.client.firstName} ${c.client.lastName}`,
      clientPhone:      c.client.phone,
      typeSinistre:     c.claimType,
      montantDeclare:   c.claimedAmount ? Number(c.claimedAmount) : null,
      dateDeclaration:  c.declarationDate,
      scoreRisque:      c.scoreRisque,
      labelRisque:      c.labelRisque,
      decisionIa:       c.decisionIa,
      scoreConfidence:  c.scoreConfidence !== null ? Math.round(c.scoreConfidence) : null,
      assignedManager:  c.assignedUser
        ? { name: `${c.assignedUser.firstName} ${c.assignedUser.lastName}`, role: c.assignedUser.role }
        : null,
      statut:    c.status,
      scoredAt:  c.scoredAt,
    }));

    return NextResponse.json({ data, total, page, pages: Math.ceil(total / limit), limit });
  } catch (err) {
    console.error('[ai-scoring/high-risk] Error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
