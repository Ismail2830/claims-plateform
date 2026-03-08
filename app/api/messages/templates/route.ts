import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireRole } from '@/lib/api-auth';
import { z } from 'zod';

const createSchema = z.object({
  name:     z.string().min(1).max(100),
  content:  z.string().min(1),
  category: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ['MANAGER_SENIOR', 'MANAGER_JUNIOR', 'EXPERT', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;
  const { user } = auth;

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');

  const templates = await prisma.messageTemplate.findMany({
    where: {
      OR: [
        { createdBy: user.userId },
        { isGlobal: true },
      ],
      ...(category ? { category } : {}),
    },
    orderBy: [{ isGlobal: 'desc' }, { name: 'asc' }],
  });

  return NextResponse.json({ success: true, data: templates });
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ['MANAGER_SENIOR', 'MANAGER_JUNIOR', 'EXPERT', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;
  const { user } = auth;

  const body = await request.json() as unknown;
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  const template = await prisma.messageTemplate.create({
    data: {
      ...parsed.data,
      category:  parsed.data.category ?? 'Général',
      createdBy: user.userId,
      isGlobal:  false,
    },
  });

  return NextResponse.json({ success: true, data: template }, { status: 201 });
}
