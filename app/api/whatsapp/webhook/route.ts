/**
 * Meta WhatsApp Cloud API – Webhook Handler
 * GET  /api/whatsapp/webhook  → hub verification
 * POST /api/whatsapp/webhook  → inbound messages
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { handleIncoming, handleImageMessage } from '@/app/lib/chatbot-flows';

export const maxDuration = 30;

// ─── GET – Meta Webhook Verification ─────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);

  const mode      = searchParams.get('hub.mode');
  const token     = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (
    mode === 'subscribe' &&
    token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
  ) {
    console.log('[WhatsApp Webhook] Verified successfully');
    return new NextResponse(challenge, { status: 200 });
  }

  console.warn('[WhatsApp Webhook] Verification failed – token mismatch');
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// ─── POST – Inbound Message Handler ──────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.json().catch(() => null);

  // Await processing — Vercel kills fire-and-forget before completion
  await processWebhook(body).catch((err) =>
    console.error('[WhatsApp Webhook] Processing error:', err),
  );

  return NextResponse.json({ status: 'ok' }, { status: 200 });
}

// ─── Message Processor ───────────────────────────────────────────────────────

async function processWebhook(body: any): Promise<void> {
  if (!body?.entry?.[0]?.changes?.[0]?.value) return;

  const value = body.entry[0].changes[0].value;

  // Handle delivery status updates – ignore silently
  if (value.statuses) return;

  const messages: any[] = value.messages ?? [];
  if (messages.length === 0) return;

  const message = messages[0];
  const phone: string = message.from;

  if (!phone) return;

  let text = '';
  let messageType = message.type as string;

  // ── Extract content by type ──────────────────────────────────────
  switch (messageType) {
    case 'text':
      text = message.text?.body ?? '';
      break;

    case 'interactive': {
      const interactive = message.interactive;
      if (interactive?.type === 'button_reply') {
        text = interactive.button_reply?.id ?? interactive.button_reply?.title ?? '';
      } else if (interactive?.type === 'list_reply') {
        text = interactive.list_reply?.id ?? interactive.list_reply?.title ?? '';
      }
      break;
    }

    case 'image': {
      const mediaId = message.image?.id ?? '';
      await logMessage(phone, 'INBOUND', `[IMAGE:${mediaId}]`, null);
      await handleImageMessage(phone, mediaId);
      return;
    }

    case 'document':
    case 'audio':
    case 'video':
      text = `[${messageType.toUpperCase()}: ${message[messageType]?.id ?? ''}]`;
      break;

    default:
      text = `[${messageType}]`;
  }

  if (!text) return;

  // ── Log inbound message ──────────────────────────────────────────
  await logMessage(phone, 'INBOUND', text, null);

  // ── Route to chatbot engine ──────────────────────────────────────
  await handleIncoming(phone, text);
}

// ─── DB Logger ────────────────────────────────────────────────────────────────

async function logMessage(
  phone: string,
  direction: 'INBOUND' | 'OUTBOUND',
  content: string,
  intent: string | null,
): Promise<void> {
  try {
    await (prisma as any).whatsappMessage.create({
      data: { phone, direction, content, intent },
    });
  } catch (err) {
    // Non-fatal – logging should never block message processing
    console.error('[WhatsApp Webhook] Log error:', err);
  }
}
