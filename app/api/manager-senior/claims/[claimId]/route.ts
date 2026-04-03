/**
 * GET   /api/manager-senior/claims/[claimId] — full claim detail for Manager Senior
 * PATCH /api/manager-senior/claims/[claimId] — APPROVED → IN_PAYMENT transition
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireRole } from '@/lib/api-auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ claimId: string }> },
) {
  const auth = await requireRole(request, ['MANAGER_SENIOR', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;

  const { claimId } = await params;

  const claim = await prisma.claim.findUnique({
    where: { claimId },
    select: {
      claimId:          true,
      claimNumber:      true,
      claimType:        true,
      status:           true,
      priority:         true,
      incidentDate:     true,
      declarationDate:  true,
      incidentLocation: true,
      description:      true,
      claimedAmount:    true,
      estimatedAmount:  true,
      approvedAmount:   true,
      createdAt:        true,
      updatedAt:        true,
      client: {
        select: {
          firstName: true,
          lastName:  true,
          email:     true,
          phone:     true,
          cin:       true,
        },
      },
      policy: {
        select: {
          policyNumber: true,
          policyType:   true,
        },
      },
      assignedUser: {
        select: {
          firstName: true,
          lastName:  true,
          role:      true,
        },
      },
    },
  });

  if (!claim) {
    return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 });
  }

  return NextResponse.json({ data: claim });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ claimId: string }> },
) {
  const auth = await requireRole(request, ['MANAGER_SENIOR', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;
  const { userId } = auth.user;

  const { claimId } = await params;

  let body: { status?: unknown };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 }); }

  const { status: newStatus } = body;

  if (newStatus !== 'IN_PAYMENT') {
    return NextResponse.json({ error: 'Seule la transition vers IN_PAYMENT est autorisée ici' }, { status: 400 });
  }

  const claim = await prisma.claim.findUnique({
    where: { claimId },
    select: { claimId: true, status: true, claimNumber: true, clientId: true },
  });

  if (!claim) return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 });

  if (claim.status !== 'APPROVED') {
    return NextResponse.json(
      { error: `Transition impossible : le dossier est en statut ${claim.status}, attendu APPROVED` },
      { status: 400 },
    );
  }

  await prisma.$transaction([
    prisma.claim.update({
      where: { claimId },
      data:  { status: 'IN_PAYMENT', updatedAt: new Date() },
    }),
    prisma.claimStatusHistory.create({
      data: {
        claimId,
        fromStatus:        'APPROVED',
        toStatus:          'IN_PAYMENT',
        changedBy:         userId,
        reason:            'Mise en paiement par le Manager Senior',
        isSystemGenerated: false,
      },
    }),
    prisma.auditLog.create({
      data: {
        entityType:  'CLAIM',
        entityId:    claimId,
        claimId,
        clientId:    claim.clientId,
        userId,
        action:      'UPDATE',
        description: `Dossier ${claim.claimNumber} passé en paiement`,
        metadata:    { fromStatus: 'APPROVED', toStatus: 'IN_PAYMENT' },
        riskLevel:   'LOW',
      },
    }),
  ]);

  return NextResponse.json({ success: true, status: 'IN_PAYMENT' });
}
