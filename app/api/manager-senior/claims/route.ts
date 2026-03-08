import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireRole } from '@/lib/api-auth';

export async function GET(request: Request) {
  const auth = await requireRole(request, ['MANAGER_SENIOR']);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const page   = Math.max(1, parseInt(searchParams.get('page')   ?? '1',  10));
  const limit  = Math.min(50, Math.max(1, parseInt(searchParams.get('limit')  ?? '20', 10)));
  const status = searchParams.get('status') ?? undefined;

  const where = status ? { status: status as never } : {};

  const [claims, total] = await Promise.all([
    prisma.claim.findMany({
      where,
      skip:    (page - 1) * limit,
      take:    limit,
      orderBy: { updatedAt: 'desc' },
      select: {
        claimId: true,
        claimNumber: true,
        claimType: true,
        status: true,
        priority: true,
        estimatedAmount: true,
        scoreRisque: true,
        labelRisque: true,
        createdAt: true,
        updatedAt: true,
        client: { select: { firstName: true, lastName: true } },
        assignedUser: { select: { firstName: true, lastName: true } },
        _count: { select: { documents: true } },
      },
    }),
    prisma.claim.count({ where }),
  ]);

  return NextResponse.json({
    data: claims,
    meta: { total, page, limit, pages: Math.ceil(total / limit) },
  });
}
