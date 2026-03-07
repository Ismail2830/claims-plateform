/**
 * GET    /api/documents/[documentId]       — single document detail
 * DELETE /api/documents/[documentId]       — soft-delete (isArchived = true)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { verifyToken } from '@/app/lib/auth';

function auth(req: NextRequest) {
  const h = req.headers.get('authorization');
  if (!h?.startsWith('Bearer ')) return null;
  try { return verifyToken(h.substring(7)); } catch { return null; }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const decoded = auth(req);
  if (!decoded) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { documentId } = await params;

  const doc = await prisma.claimDocument.findUnique({
    where: { documentId },
    include: {
      claim: {
        include: {
          client: { select: { clientId: true, firstName: true, lastName: true, email: true, phone: true } },
          policy: { select: { policyId: true, policyNumber: true, policyType: true } },
        },
      },
      uploadedByUser:      { select: { userId: true, firstName: true, lastName: true, role: true } },
      uploadedByClientRef: { select: { clientId: true, firstName: true, lastName: true } },
      verifiedByUser:      { select: { userId: true, firstName: true, lastName: true } },
      accessLogs: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          user: { select: { userId: true, firstName: true, lastName: true, role: true } },
        },
      },
    },
  });

  if (!doc) return NextResponse.json({ error: 'Document introuvable' }, { status: 404 });
  return NextResponse.json(doc);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const decoded = auth(req);
  if (!decoded) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (decoded.type !== 'STAFF') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  if (!['SUPER_ADMIN', 'MANAGER_SENIOR'].includes(decoded.role)) {
    return NextResponse.json({ error: 'Droits insuffisants' }, { status: 403 });
  }

  const { documentId } = await params;

  const doc = await prisma.claimDocument.findUnique({ where: { documentId } });
  if (!doc) return NextResponse.json({ error: 'Document introuvable' }, { status: 404 });

  await prisma.$transaction([
    prisma.claimDocument.update({
      where: { documentId },
      data:  { isArchived: true },
    }),
    prisma.documentAccessLog.create({
      data: {
        documentId,
        userId: decoded.userId,
        action: 'DELETE',
      },
    }),
  ]);

  return NextResponse.json({ success: true });
}
