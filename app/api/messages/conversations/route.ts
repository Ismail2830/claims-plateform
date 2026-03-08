import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireRole } from '@/lib/api-auth';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';

const createSchema = z.object({
  type:           z.enum(['CLIENT', 'INTERNAL', 'CLAIM_LINKED', 'ESCALATION']),
  participantIds: z.array(z.string().uuid()).min(1),
  claimId:        z.string().uuid().optional(),
  subject:        z.string().max(255).optional(),
  firstMessage:   z.string().min(1),
  visibility:     z.enum(['ALL', 'CLIENT_ONLY', 'INTERNAL_ONLY']).default('ALL'),
  urgencyLevel:   z.enum(['NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
});

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ['MANAGER_SENIOR', 'MANAGER_JUNIOR', 'EXPERT', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;
  const { user } = auth;

  const { searchParams } = new URL(request.url);
  const type        = searchParams.get('type');
  const unreadOnly  = searchParams.get('unreadOnly') === 'true';
  const urgentOnly  = searchParams.get('urgentOnly') === 'true';
  const search      = searchParams.get('search') ?? '';
  const archived    = searchParams.get('archived') === 'true';
  const page        = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
  const limit       = Math.min(50, parseInt(searchParams.get('limit') ?? '20'));

  const where: Prisma.ConversationWhereInput = {
    participants: { has: user.userId },
    isArchived:   archived,
  };
  if (type) where.type = type as Prisma.EnumConvTypeFilter['equals'];
  if (urgentOnly) where.urgencyLevel = 'URGENT';
  if (search) {
    where.OR = [
      { subject: { contains: search, mode: 'insensitive' } },
      { lastMessage: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [total, rawConvs] = await Promise.all([
    prisma.conversation.count({ where }),
    prisma.conversation.findMany({
      where,
      orderBy: { lastMessageAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        claim: { select: { claimId: true, claimNumber: true, claimType: true, claimedAmount: true, status: true, scoreRisque: true } },
        messages: {
          where: {
            NOT: { readReceipts: { some: { userId: user.userId } } },
          },
          select: { id: true },
        },
      },
    }),
  ]);

  // Fetch participant details
  const allParticipantIds = [...new Set(rawConvs.flatMap(c => c.participants))];
  const users = await prisma.user.findMany({
    where: { userId: { in: allParticipantIds } },
    select: { userId: true, firstName: true, lastName: true, role: true },
  });
  const userMap = new Map(users.map(u => [u.userId, u]));

  const conversations = rawConvs.map(c => {
    const unreadCount = c.messages.length;
    // For unreadOnly filter we do it post-query
    return {
      id:           c.id,
      type:         c.type,
      subject:      c.subject,
      lastMessage:  c.lastMessage,
      lastMessageAt: c.lastMessageAt,
      urgencyLevel: c.urgencyLevel,
      isArchived:   c.isArchived,
      unreadCount,
      participants: c.participants.map(pid => userMap.get(pid) ?? { userId: pid, firstName: '—', lastName: '', role: null }),
      claim:        c.claim,
    };
  });

  const filtered = unreadOnly ? conversations.filter(c => c.unreadCount > 0) : conversations;

  return NextResponse.json({ success: true, data: { conversations: filtered, total, page, pages: Math.ceil(total / limit) } });
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ['MANAGER_SENIOR', 'MANAGER_JUNIOR', 'EXPERT', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;
  const { user } = auth;

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Requête invalide (JSON malformé)' }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  const { type, participantIds, claimId, subject, firstMessage, visibility, urgencyLevel } = parsed.data;

  // Always include creator in participants
  const allParticipants = [...new Set([user.userId, ...participantIds])];

  try {
    const conversation = await prisma.conversation.create({
      data: {
        type,
        claimId:       claimId ?? null,
        participants:  allParticipants,
        subject:       subject ?? null,
        lastMessage:   firstMessage.slice(0, 200),
        lastMessageAt: new Date(),
        urgencyLevel,
        createdBy:     user.userId,
        messages: {
          create: {
            content:   firstMessage,
            senderId:  user.userId,
            visibility,
            isUrgent:  urgencyLevel === 'URGENT',
          },
        },
      },
      include: { messages: true },
    });

    return NextResponse.json({ success: true, data: conversation }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/messages/conversations]', err);
    const message = err instanceof Error ? err.message : 'Erreur interne du serveur';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
