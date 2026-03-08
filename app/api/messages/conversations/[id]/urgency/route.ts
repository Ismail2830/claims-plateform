import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireRole } from '@/lib/api-auth';
import { z } from 'zod';

const schema = z.object({ urgencyLevel: z.enum(['NORMAL', 'HIGH', 'URGENT']) });

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(request, ['MANAGER_SENIOR', 'MANAGER_JUNIOR', 'EXPERT', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;
  const { user } = auth;
  const { id } = await params;

  const conversation = await prisma.conversation.findFirst({
    where: { id, participants: { has: user.userId } },
  });
  if (!conversation) {
    return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 });
  }

  const body = await request.json() as unknown;
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  const updated = await prisma.conversation.update({
    where: { id },
    data:  { urgencyLevel: parsed.data.urgencyLevel },
    select: { id: true, urgencyLevel: true },
  });

  return NextResponse.json({ success: true, data: updated });
}
