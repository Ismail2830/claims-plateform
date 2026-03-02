/**
 * Cron Job: Policy Renewal Reminders
 * GET /api/cron/renewal-reminders
 *
 * Called daily at 09:00 UTC by Vercel Cron.
 * Sends WhatsApp template "rappel_echeance" to clients with policies
 * expiring in exactly 30 or 7 days.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { sendWhatsAppTemplate, formatPhone } from '@/app/lib/whatsapp';

// ─── Auth Guard ───────────────────────────────────────────────────────────────

function isAuthorised(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true; // Skip check in dev

  const authHeader = req.headers.get('authorization');
  return authHeader === `Bearer ${cronSecret}`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

// ─── GET Handler ──────────────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorised(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date();

  const target30 = addDays(today, 30);
  const target7  = addDays(today, 7);

  // ── Query policies expiring in exactly 30 days ────────────────────
  const policies30 = await prisma.policy.findMany({
    where: {
      status:  'ACTIVE',
      endDate: {
        gte: startOfDay(target30),
        lte: endOfDay(target30),
      },
    },
    include: {
      client: {
        select: { phone: true, firstName: true, lastName: true },
      },
    },
  });

  // ── Query policies expiring in exactly 7 days ─────────────────────
  const policies7 = await prisma.policy.findMany({
    where: {
      status:  'ACTIVE',
      endDate: {
        gte: startOfDay(target7),
        lte: endOfDay(target7),
      },
    },
    include: {
      client: {
        select: { phone: true, firstName: true, lastName: true },
      },
    },
  });

  // ── Send reminders ────────────────────────────────────────────────
  let sent30days = 0;
  let sent7days  = 0;

  for (const policy of policies30) {
    const { phone, firstName } = policy.client;
    const waPhone = formatPhone(phone);

    try {
      await sendWhatsAppTemplate(
        waPhone,
        'rappel_echeance',
        'fr',
        [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: firstName },
              { type: 'text', text: policy.policyNumber },
              { type: 'text', text: '30' },
              { type: 'text', text: policy.endDate.toLocaleDateString('fr-MA') },
            ],
          },
        ],
      );
      sent30days++;
    } catch (err) {
      console.error(`[Cron] 30d reminder failed for ${phone}:`, err);
    }
  }

  for (const policy of policies7) {
    const { phone, firstName } = policy.client;
    const waPhone = formatPhone(phone);

    try {
      await sendWhatsAppTemplate(
        waPhone,
        'rappel_echeance',
        'fr',
        [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: firstName },
              { type: 'text', text: policy.policyNumber },
              { type: 'text', text: '7' },
              { type: 'text', text: policy.endDate.toLocaleDateString('fr-MA') },
            ],
          },
        ],
      );
      sent7days++;
    } catch (err) {
      console.error(`[Cron] 7d reminder failed for ${phone}:`, err);
    }
  }

  console.log(`[Cron] Renewal reminders sent – 30d: ${sent30days}, 7d: ${sent7days}`);

  return NextResponse.json({
    sent30days,
    sent7days,
    runAt: today.toISOString(),
  });
}
