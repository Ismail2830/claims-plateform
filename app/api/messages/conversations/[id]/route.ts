import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireRole } from '@/lib/api-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(request, ['MANAGER_SENIOR', 'MANAGER_JUNIOR', 'EXPERT', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;
  const { user } = auth;
  const { id } = await params;

  const { searchParams } = new URL(request.url);
  const page  = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
  const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '50'));

  const conversation = await prisma.conversation.findFirst({
    where: { id, participants: { has: user.userId } },
    include: {
      claim: {
        select: {
          claimId: true, claimNumber: true, claimType: true,
          claimedAmount: true, status: true, scoreRisque: true,
        },
      },
      messages: {
        orderBy: { createdAt: 'asc' },
        skip:    (page - 1) * limit,
        take:    limit,
        include: {
          sender:       { select: { userId: true, firstName: true, lastName: true, role: true } },
          clientSender: { select: { clientId: true, firstName: true, lastName: true } },
          readReceipts: { select: { userId: true, readAt: true } },
        },
      },
    },
  });

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 });
  }

  // Mark all unread as read
  const unreadIds = conversation.messages
    .filter(m => !m.readReceipts.some(r => r.userId === user.userId))
    .map(m => m.id);

  if (unreadIds.length > 0) {
    await prisma.messageReadReceipt.createMany({
      data:           unreadIds.map(m => ({ messageId: m, userId: user.userId })),
      skipDuplicates: true,
    });
  }

  // Normalize sender: staff sender or client sender → unified senderInfo field
  const normalizedMessages = conversation.messages.map(m => ({
    ...m,
    senderInfo: m.sender
      ? { id: m.sender.userId, firstName: m.sender.firstName, lastName: m.sender.lastName, role: m.sender.role, kind: 'staff' as const }
      : m.clientSender
        ? { id: m.clientSender.clientId, firstName: m.clientSender.firstName, lastName: m.clientSender.lastName, role: 'CLIENT', kind: 'client' as const }
        : { id: '', firstName: '—', lastName: '', role: 'UNKNOWN', kind: 'staff' as const },
  }));

  // Participant details — resolve both staff and client participants
  const allParticipantIds = conversation.participants;
  const [participantUsers, participantClients] = await Promise.all([
    prisma.user.findMany({
      where:  { userId: { in: allParticipantIds } },
      select: { userId: true, firstName: true, lastName: true, role: true },
    }),
    prisma.client.findMany({
      where:  { clientId: { in: allParticipantIds } },
      select: { clientId: true, firstName: true, lastName: true },
    }),
  ]);

  const participantDetails = [
    ...participantUsers.map(u => ({ id: u.userId, firstName: u.firstName, lastName: u.lastName, role: u.role, kind: 'staff' })),
    ...participantClients.map(c => ({ id: c.clientId, firstName: c.firstName, lastName: c.lastName, role: 'CLIENT', kind: 'client' })),
  ];

  const totalMessages = await prisma.message.count({ where: { conversationId: id } });

  return NextResponse.json({
    success: true,
    data: {
      ...conversation,
      messages:           normalizedMessages,
      participantDetails,
      pagination: { page, limit, total: totalMessages, pages: Math.ceil(totalMessages / limit) },
    },
  });
}
