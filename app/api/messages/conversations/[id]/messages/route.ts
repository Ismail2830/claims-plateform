import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireRole } from '@/lib/api-auth';
import { getPusherServer } from '@/app/lib/pusher-server';
import { detectUrgency } from '@/app/lib/messages-utils';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';

const schema = z.object({
  content:     z.string().min(1),
  visibility:  z.enum(['ALL', 'CLIENT_ONLY', 'INTERNAL_ONLY']).default('ALL'),
  isUrgent:    z.boolean().optional(),
  attachments: z.array(z.string()).optional(),
});

export async function POST(
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

  const { content, visibility, attachments } = parsed.data;
  const autoUrgent = detectUrgency(content);
  const isUrgent = parsed.data.isUrgent ?? autoUrgent;

  const message = await prisma.message.create({
    data: {
      conversationId: id,
      senderId:       user.userId,
      content,
      visibility,
      isUrgent,
      attachments:    attachments ?? [],
    },
    include: {
      sender: { select: { userId: true, firstName: true, lastName: true, role: true } },
    },
  });

  // Update conversation snapshot
  const updateData: Prisma.ConversationUpdateInput = {
    lastMessage:   content.slice(0, 200),
    lastMessageAt: message.createdAt,
  };
  if (isUrgent && conversation.urgencyLevel === 'NORMAL') {
    updateData.urgencyLevel = 'URGENT';
  }
  await prisma.conversation.update({ where: { id }, data: updateData });

  // Pusher real-time broadcast
  try {
    const pusher = getPusherServer();
      await pusher.trigger(`conversation-${id}`, 'new-message', {
      message,
      senderName: user.email,
    });
  } catch { /* non-fatal: Pusher may not be configured in dev */ }

  return NextResponse.json({ success: true, data: message }, { status: 201 });
}
