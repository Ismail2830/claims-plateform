import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireRole } from '@/lib/api-auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(request, ['MANAGER_SENIOR', 'MANAGER_JUNIOR', 'EXPERT', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;
  const { user } = auth;
  const { id } = await params;

  const conversation = await prisma.conversation.findFirst({
    where:   { id, participants: { has: user.userId } },
    include: { messages: { select: { id: true } } },
  });
  if (!conversation) {
    return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 });
  }

  const unreadIds = await prisma.message.findMany({
    where: {
      conversationId: id,
      NOT:            { readReceipts: { some: { userId: user.userId } } },
    },
    select: { id: true },
  });

  if (unreadIds.length > 0) {
    await prisma.messageReadReceipt.createMany({
      data:           unreadIds.map(m => ({ messageId: m.id, userId: user.userId })),
      skipDuplicates: true,
    });
  }

  return NextResponse.json({ success: true, data: { marked: unreadIds.length } });
}
