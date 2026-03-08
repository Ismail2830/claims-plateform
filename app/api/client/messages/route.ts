import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { verifyAccessToken } from '@/app/lib/tokens';

function getClientId(request: NextRequest): string | null {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const decoded = verifyAccessToken(auth.slice(7));
    if (decoded.type !== 'CLIENT') return null;
    return (decoded as { clientId: string }).clientId;
  } catch { return null; }
}

/** GET /api/client/messages — list conversations this client is a participant in */
export async function GET(request: NextRequest) {
  const clientId = getClientId(request);
  if (!clientId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const archived = searchParams.get('archived') === 'true';

  try {
    const conversations = await prisma.conversation.findMany({
      where: {
        participants: { has: clientId },
        isArchived:   archived,
      },
      orderBy: { lastMessageAt: 'desc' },
      take: 50,
    });

    // Count unread messages per conversation (not sent by client)
    const convsWithUnread = await Promise.all(conversations.map(async (c) => {
      const unreadCount = await prisma.message.count({
        where: {
          conversationId: c.id,
          // Messages sent by staff (senderId set) that the client hasn't read
          senderId: { not: null },
          NOT: { readReceipts: { some: { userId: clientId } } },
        },
      });
      return { ...c, unreadCount };
    }));

    return NextResponse.json({ success: true, data: convsWithUnread });
  } catch (err) {
    console.error('[GET /api/client/messages]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
