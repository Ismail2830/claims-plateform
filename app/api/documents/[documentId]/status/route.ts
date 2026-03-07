/**
 * PATCH /api/documents/[documentId]/status
 * Update document status: VERIFIED | REJECTED | PROCESSING
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { verifyToken } from '@/app/lib/auth';
import { sendWhatsAppTemplate } from '@/app/lib/whatsapp';

function auth(req: NextRequest) {
  const h = req.headers.get('authorization');
  if (!h?.startsWith('Bearer ')) return null;
  try { return verifyToken(h.substring(7)); } catch { return null; }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const decoded = auth(req);
  if (!decoded) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (decoded.type !== 'STAFF') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  const { documentId } = await params;
  const body = await req.json() as { status: string; rejectionNote?: string };

  const allowed = ['VERIFIED', 'REJECTED', 'PROCESSING'] as const;
  if (!allowed.includes(body.status as (typeof allowed)[number])) {
    return NextResponse.json({ error: 'Statut invalide' }, { status: 400 });
  }

  const doc = await prisma.claimDocument.findUnique({
    where: { documentId },
    include: {
      claim: { include: { client: true } },
    },
  });
  if (!doc) return NextResponse.json({ error: 'Document introuvable' }, { status: 404 });

  const updateData: Record<string, unknown> = { status: body.status };

  if (body.status === 'VERIFIED') {
    updateData.verifiedAt = new Date();
    updateData.verifiedBy = decoded.userId;
  }

  if (body.status === 'REJECTED') {
    updateData.rejectionNote = body.rejectionNote ?? null;
    // Mark as pending re-submit after saving rejection note
    updateData.status = 'REJECTED';
  }

  const [updated] = await prisma.$transaction([
    prisma.claimDocument.update({
      where: { documentId },
      data:  updateData,
    }),
    prisma.documentAccessLog.create({
      data: {
        documentId,
        userId: decoded.userId,
        action: body.status === 'VERIFIED' ? 'VERIFY' : 'REJECT',
      },
    }),
  ]);

  // After rejection: also set PENDING_RESUBMIT and notify via WhatsApp
  if (body.status === 'REJECTED') {
    await prisma.claimDocument.update({
      where: { documentId },
      data:  { status: 'PENDING_RESUBMIT' },
    });

    const phone = doc.claim?.client?.phone;
    if (phone) {
      await sendWhatsAppTemplate(phone, 'documents_manquants', 'fr').catch(() => {
        // Non-fatal: WhatsApp notification failure should not block response
      });
    }
  }

  return NextResponse.json(updated);
}
