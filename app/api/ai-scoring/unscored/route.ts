import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page  = Math.max(parseInt(searchParams.get('page')  ?? '1'), 1);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100);

    const [count, claims] = await Promise.all([
      prisma.claim.count({ where: { scoreRisque: null } }),
      prisma.claim.findMany({
        where:   { scoreRisque: null },
        orderBy: { declarationDate: 'desc' },
        skip:    (page - 1) * limit,
        take:    limit,
        select: {
          claimId:         true,
          claimNumber:     true,
          claimType:       true,
          claimedAmount:   true,
          declarationDate: true,
          status:          true,
          client: {
            select: {
              firstName: true,
              lastName:  true,
              phone:     true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json({ count, claims, page, pages: Math.ceil(count / limit) });
  } catch (err) {
    console.error('[ai-scoring/unscored] Error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
