import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireRole } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ['MANAGER_SENIOR', 'MANAGER_JUNIOR', 'EXPERT', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;
  const { user } = auth;

  const [totalUnread, urgentUnread, clientConversations, internalConversations, escalationsPending] =
    await Promise.all([
      // Total unread: conversations where user has unread messages
      prisma.conversation.count({
        where: {
          participants: { has: user.userId },
          isArchived:   false,
          messages: {
            some: {
              NOT: { readReceipts: { some: { userId: user.userId } } },
            },
          },
        },
      }),
      // Urgent unread
      prisma.conversation.count({
        where: {
          participants: { has: user.userId },
          urgencyLevel: 'URGENT',
          isArchived:   false,
          messages: {
            some: {
              NOT: { readReceipts: { some: { userId: user.userId } } },
            },
          },
        },
      }),
      // Client conversations
      prisma.conversation.count({
        where: {
          participants: { has: user.userId },
          type:         'CLIENT',
          isArchived:   false,
        },
      }),
      // Internal conversations
      prisma.conversation.count({
        where: {
          participants: { has: user.userId },
          type:         'INTERNAL',
          isArchived:   false,
        },
      }),
      // Escalation pending
      prisma.conversation.count({
        where: {
          participants: { has: user.userId },
          type:         'ESCALATION',
          isArchived:   false,
        },
      }),
    ]);

  return NextResponse.json({
    success: true,
    data: { totalUnread, urgentUnread, clientConversations, internalConversations, escalationsPending },
  });
}
