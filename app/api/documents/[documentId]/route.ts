/**
 * GET    /api/documents/[documentId]       — single document detail
 * DELETE /api/documents/[documentId]       — soft-delete (isArchived = true)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { verifyAccessToken } from '@/app/lib/tokens';

function auth(req: NextRequest) {
  const h = req.headers.get('authorization');
  const cookieToken = req.cookies.get('admin_at')?.value;
  const token = h?.startsWith('Bearer ') ? h.substring(7) : cookieToken;
  if (!token) return null;
  try { return verifyAccessToken(token); } catch { return null; }
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

/**
 * PATCH /api/documents/[documentId]
 * Verify or reject a document.
 * Allowed roles: EXPERT, MANAGER_JUNIOR, MANAGER_SENIOR, ADMIN, SUPER_ADMIN
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const decoded = auth(req);
  if (!decoded) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (decoded.type === 'CLIENT') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  const staffDecoded = decoded as import('@/app/lib/auth').StaffTokenPayload;
  const allowedRoles = ['EXPERT', 'MANAGER_JUNIOR', 'MANAGER_SENIOR', 'ADMIN', 'SUPER_ADMIN'];
  if (!allowedRoles.includes(staffDecoded.role)) {
    return NextResponse.json({ error: 'Droits insuffisants' }, { status: 403 });
  }

  const { documentId } = await params;
  const body = await req.json().catch(() => null);
  if (!body?.status || !['VERIFIED', 'REJECTED'].includes(body.status)) {
    return NextResponse.json({ error: 'Statut invalide. Valeurs acceptées: VERIFIED, REJECTED' }, { status: 400 });
  }

  const doc = await prisma.claimDocument.findUnique({
    where: { documentId },
    include: { claim: { select: { assignedTo: true } } },
  });
  if (!doc) return NextResponse.json({ error: 'Document introuvable' }, { status: 404 });

  // Experts can only verify documents on their assigned claims
  if (staffDecoded.role === 'EXPERT' && doc.claim?.assignedTo !== staffDecoded.userId) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  const updateData: Record<string, unknown> = { status: body.status };
  if (body.status === 'VERIFIED') {
    updateData.verifiedAt = new Date();
    updateData.verifiedBy = staffDecoded.userId;
    updateData.rejectionNote = null;
  } else {
    updateData.rejectionNote = body.rejectionNote?.trim() || null;
    updateData.verifiedAt = null;
    updateData.verifiedBy = null;
  }

  const [updated] = await prisma.$transaction([
    prisma.claimDocument.update({
      where: { documentId },
      data:  updateData,
      select: { documentId: true, status: true, verifiedAt: true, rejectionNote: true },
    }),
    prisma.documentAccessLog.create({
      data: {
        documentId,
        userId: staffDecoded.userId,
        action: body.status === 'VERIFIED' ? 'VERIFY' : 'REJECT',
      },
    }),
  ]);

  return NextResponse.json({ data: updated });
}
