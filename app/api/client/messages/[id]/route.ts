import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { verifyAccessToken } from '@/app/lib/tokens';
import { getPusherServer } from '@/app/lib/pusher-server';

function getClientId(request: NextRequest): string | null {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const decoded = verifyAccessToken(auth.slice(7));
    if (decoded.type !== 'CLIENT') return null;
    return (decoded as { clientId: string }).clientId;
  } catch { return null; }
}

/** GET /api/client/messages/[id] — get messages in a conversation */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const clientId = getClientId(request);
  if (!clientId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const { id } = await params;

  try {
    const conversation = await prisma.conversation.findFirst({
      where: { id, participants: { has: clientId } },
    });
    if (!conversation) return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 });

    const messages = await prisma.message.findMany({
      where: {
        conversationId: id,
        // Clients see messages with visibility ALL or CLIENT_ONLY
        visibility: { in: ['ALL', 'CLIENT_ONLY'] },
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    // Mark unread staff messages as read
    const unreadIds = messages
      .filter(m => m.clientSenderId !== clientId && m.senderId !== null)
      .map(m => m.id);

    if (unreadIds.length > 0) {
      await Promise.all(unreadIds.map(msgId =>
        prisma.messageReadReceipt.upsert({
          where: { messageId_userId: { messageId: msgId, userId: clientId } },
          create: { messageId: msgId, userId: clientId },
          update: {},
        }).catch(() => {})
      ));
    }

    // Resolve sender names
    const staffSenderIds  = [...new Set(messages.map(m => m.senderId).filter(Boolean) as string[])];
    const clientSenderIds = [...new Set(messages.map(m => m.clientSenderId).filter(Boolean) as string[])];

    const [staffUsers, clientUsers] = await Promise.all([
      staffSenderIds.length > 0
        ? prisma.user.findMany({ where: { userId: { in: staffSenderIds } }, select: { userId: true, firstName: true, lastName: true, role: true } })
        : Promise.resolve([]),
      clientSenderIds.length > 0
        ? prisma.client.findMany({ where: { clientId: { in: clientSenderIds } }, select: { clientId: true, firstName: true, lastName: true } })
        : Promise.resolve([]),
    ]);

    const senderMap = new Map<string, { firstName: string; lastName: string; role: string }>();
    staffUsers.forEach(u => senderMap.set(u.userId, { firstName: u.firstName, lastName: u.lastName, role: u.role }));
    clientUsers.forEach(c => senderMap.set(c.clientId, { firstName: c.firstName, lastName: c.lastName, role: 'CLIENT' }));

    const enriched = messages.map(m => {
      const senderId = m.clientSenderId ?? m.senderId ?? '';
      return {
        ...m,
        // expose a unified senderId field for the UI
        effectiveSenderId: senderId,
        sender: senderMap.get(senderId) ?? { firstName: '—', lastName: '', role: 'UNKNOWN' },
      };
    });

    return NextResponse.json({ success: true, data: { conversation, messages: enriched } });
  } catch (err) {
    console.error('[GET /api/client/messages/[id]]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/** POST /api/client/messages/[id] — send a reply */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const clientId = getClientId(request);
  if (!clientId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const { id } = await params;

  try {
    const conversation = await prisma.conversation.findFirst({
      where: { id, participants: { has: clientId } },
    });
    if (!conversation) return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 });

    let body: { content?: string };
    try { body = await request.json(); } catch {
      return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });
    }
    const content = (body.content ?? '').trim();
    if (!content) return NextResponse.json({ error: 'Message vide' }, { status: 400 });

    const message = await prisma.message.create({
      data: {
        conversationId:  id,
        clientSenderId:  clientId,
        content,
        visibility:      'CLIENT_ONLY',
      },
    });

    await prisma.conversation.update({
      where: { id },
      data: { lastMessage: content.slice(0, 200), lastMessageAt: message.createdAt },
    });

    // Pusher broadcast
    try {
      const pusher = getPusherServer();
      await pusher.trigger(`conversation-${id}`, 'new-message', { message });
    } catch { /* non-fatal */ }

    return NextResponse.json({ success: true, data: message }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/client/messages/[id]]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
