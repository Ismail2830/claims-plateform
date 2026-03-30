/**
 * GET  /api/claims/[id]/payment — fetch payment record (staff or owning client)
 * POST /api/claims/[id]/payment — record offline payment (MANAGER_SENIOR, SUPER_ADMIN)
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireRole } from '@/lib/api-auth';
import { verifyAccessToken } from '@/app/lib/tokens';

const ALLOWED_METHODS = ['CASH', 'BANK_TRANSFER', 'CHECK', 'MOBILE_MONEY'] as const;
type PaymentMethod = (typeof ALLOWED_METHODS)[number];

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: claimId } = await params;

  // Accept both staff JWT (admin_at cookie / Bearer) and client JWT
  let isAuthorized = false;

  // Try staff auth first
  const staffAuth = await requireRole(request, ['MANAGER_SENIOR', 'SUPER_ADMIN', 'MANAGER_JUNIOR', 'EXPERT']);
  if (staffAuth.ok) {
    isAuthorized = true;
  } else {
    // Try client auth
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const decoded = verifyAccessToken(authHeader.slice(7));
        if (decoded.type === 'CLIENT') {
          // Verify the claim belongs to this client
          const claim = await prisma.claim.findFirst({
            where: { claimId, clientId: (decoded as { clientId: string }).clientId },
            select: { claimId: true },
          });
          if (claim) isAuthorized = true;
        }
      } catch {
        // invalid client token — fall through to 401
      }
    }
  }

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const payment = await prisma.claimPayment.findUnique({
    where: { claimId },
    include: {
      recordedByUser: {
        select: { firstName: true, lastName: true, role: true },
      },
    },
  });

  if (!payment) {
    return NextResponse.json({ data: null });
  }

  return NextResponse.json({
    data: {
      paymentId:     payment.paymentId,
      amount:        Number(payment.amount),
      method:        payment.method,
      reference:     payment.reference,
      paidAt:        payment.paidAt.toISOString(),
      notes:         payment.notes,
      createdAt:     payment.createdAt.toISOString(),
      recordedBy: {
        firstName: payment.recordedByUser.firstName,
        lastName:  payment.recordedByUser.lastName,
        role:      payment.recordedByUser.role,
      },
    },
  });
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(request, ['MANAGER_SENIOR', 'SUPER_ADMIN']);
  if (!auth.ok) return auth.response;
  const { userId } = auth.user;

  const { id: claimId } = await params;

  // Validate claim exists and is in IN_PAYMENT status
  const claim = await prisma.claim.findUnique({
    where: { claimId },
    select: { claimId: true, claimNumber: true, status: true, clientId: true, approvedAmount: true, payment: true },
  });

  if (!claim) {
    return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 });
  }
  if (claim.status !== 'IN_PAYMENT') {
    return NextResponse.json(
      { error: `Le dossier doit être au statut "En paiement" (statut actuel: ${claim.status})` },
      { status: 400 },
    );
  }
  if (claim.payment) {
    return NextResponse.json({ error: 'Un paiement a déjà été enregistré pour ce dossier' }, { status: 409 });
  }

  // Parse + validate body
  let body: {
    amount?: unknown;
    method?: unknown;
    reference?: unknown;
    paidAt?: unknown;
    notes?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 });
  }

  const { amount, method, reference, paidAt, notes } = body;

  if (typeof amount !== 'number' || amount <= 0) {
    return NextResponse.json({ error: 'Montant invalide' }, { status: 400 });
  }
  if (!method || !ALLOWED_METHODS.includes(method as PaymentMethod)) {
    return NextResponse.json(
      { error: `Méthode de paiement invalide. Valeurs acceptées: ${ALLOWED_METHODS.join(', ')}` },
      { status: 400 },
    );
  }
  if (!paidAt || typeof paidAt !== 'string' || isNaN(Date.parse(paidAt))) {
    return NextResponse.json({ error: 'Date de paiement invalide' }, { status: 400 });
  }
  const paidAtDate = new Date(paidAt);
  if (paidAtDate > new Date()) {
    return NextResponse.json({ error: 'La date de paiement ne peut pas être dans le futur' }, { status: 400 });
  }

  // Create payment + transition to CLOSED in a single transaction
  const [payment] = await prisma.$transaction([
    prisma.claimPayment.create({
      data: {
        claimId,
        amount,
        method:      method as PaymentMethod,
        reference:   typeof reference === 'string' && reference.trim() ? reference.trim() : null,
        paidAt:      paidAtDate,
        recordedBy:  userId,
        notes:       typeof notes === 'string' && notes.trim() ? notes.trim() : null,
      },
    }),
    prisma.claim.update({
      where: { claimId },
      data:  { status: 'CLOSED', updatedAt: new Date() },
    }),
    prisma.claimStatusHistory.create({
      data: {
        claimId,
        fromStatus:        'IN_PAYMENT',
        toStatus:          'CLOSED',
        changedBy:         userId,
        reason:            'Paiement hors-ligne enregistré',
        notes:             `Méthode: ${method}${reference ? ` — Réf: ${reference}` : ''}`,
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
        description: `Paiement hors-ligne de ${amount} MAD enregistré pour le dossier ${claim.claimNumber}`,
        metadata: {
          amount,
          method,
          reference: reference ?? null,
          paidAt,
        },
        riskLevel: 'LOW',
      },
    }),
  ]);

  return NextResponse.json(
    {
      success: true,
      message: 'Paiement enregistré et dossier clôturé',
      data: {
        paymentId: payment.paymentId,
        amount:    Number(payment.amount),
        method:    payment.method,
        reference: payment.reference,
        paidAt:    payment.paidAt.toISOString(),
      },
    },
    { status: 201 },
  );
}
