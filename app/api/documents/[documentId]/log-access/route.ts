/**
 * POST /api/documents/[documentId]/log-access
 * Logs a user access action on a document.
 * If action = VIEW and current status = UPLOADED: auto-advance to PROCESSING.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { verifyToken } from '@/app/lib/auth';

function auth(req: NextRequest) {
  const h = req.headers.get('authorization');
  if (!h?.startsWith('Bearer ')) return null;
  try { return verifyToken(h.substring(7)); } catch { return null; }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const decoded = auth(req);
  if (!decoded) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (decoded.type !== 'STAFF') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  const { documentId } = await params;
  const body = await req.json() as { action: string };

  const validActions = ['VIEW', 'DOWNLOAD', 'VERIFY', 'REJECT', 'DELETE', 'UPLOAD'];
  if (!validActions.includes(body.action)) {
    return NextResponse.json({ error: 'Action invalide' }, { status: 400 });
  }

  const doc = await prisma.claimDocument.findUnique({ where: { documentId } });
  if (!doc) return NextResponse.json({ error: 'Document introuvable' }, { status: 404 });

  // Log the access
  await prisma.documentAccessLog.create({
    data: {
      documentId,
      userId: decoded.userId,
      action: body.action as 'VIEW' | 'DOWNLOAD' | 'VERIFY' | 'REJECT' | 'DELETE' | 'UPLOAD',
    },
  });

  // Auto-advance UPLOADED → PROCESSING on first VIEW
  if (body.action === 'VIEW' && doc.status === 'UPLOADED') {
    await prisma.claimDocument.update({
      where: { documentId },
      data:  { status: 'PROCESSING' },
    });
  }

  return NextResponse.json({ success: true });
}
