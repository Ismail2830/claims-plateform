/**
 * GET    /api/documents/[documentId]       — single document detail
 * DELETE /api/documents/[documentId]       — soft-delete (isArchived = true)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { verifyToken } from '@/app/lib/auth';

function auth(req: NextRequest) {
  const h = req.headers.get('authorization');
  const cookieToken = req.cookies.get('admin_at')?.value;
  const token = h?.startsWith('Bearer ') ? h.substring(7) : cookieToken;
  if (!token) return null;
  try { return verifyToken(token); } catch { return null; }
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
  if (decoded.type === 'CLIENT') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  const staffDecoded = decoded as import('@/app/lib/auth').StaffTokenPayload;
  if (!['SUPER_ADMIN', 'MANAGER_SENIOR'].includes(staffDecoded.role)) {
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
        userId: staffDecoded.userId,
        action: 'DELETE',
      },
    }),
  ]);

  return NextResponse.json({ success: true });
}
