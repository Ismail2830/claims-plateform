/**
 * GET /api/claims/[id]
 *
 * Returns a single claim with full detail: client, policy, documents,
 * audit log, AI scoring fields. Used by ClaimDetailPanel + useRiskScore hook.
 *
 * PATCH /api/claims/[id]
 * Updates claim fields (status, priority, assignedTo, amounts, description…).
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { verifyAccessToken } from '@/app/lib/tokens';

async function authenticate(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  try { return verifyAccessToken(authHeader.substring(7)); } catch { return null; }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const decoded = await authenticate(request);
  if (!decoded) {
    return NextResponse.json({ error: 'Token d\'autorisation requis.' }, { status: 401 });
  }

  const { id } = await params;

  const claim = await prisma.claim.findUnique({
    where: { claimId: id },
    select: {
      claimId:          true,
      claimNumber:      true,
      claimType:        true,
      status:           true,
      priority:         true,
      incidentDate:     true,
      incidentLocation: true,
      declarationDate:  true,
      description:      true,
      damageDescription:true,
      claimedAmount:    true,
      estimatedAmount:  true,
      approvedAmount:   true,
      createdAt:        true,
      updatedAt:        true,
      assignedTo:       true,
      // AI scoring fields
      scoreRisque:      true,
      labelRisque:      true,
      decisionIa:       true,
      scoreConfidence:  true,
      scoredAt:         true,
      // Relations
      client: {
        select: {
          clientId:  true,
          firstName: true,
          lastName:  true,
          email:     true,
          phone:     true,
          address:   true,
          city:      true,
        },
      },
      policy: {
        select: {
          policyId:      true,
          policyNumber:  true,
          policyType:    true,
          insuredAmount: true,
          startDate:     true,
          endDate:       true,
          status:        true,
        },
      },
      assignedUser: {
        select: {
          userId:    true,
          firstName: true,
          lastName:  true,
          email:     true,
          role:      true,
        },
      },
      documents: {
        orderBy: { createdAt: 'desc' },
        select: {
          documentId:   true,
          originalName: true,
          fileType:     true,
          mimeType:     true,
          fileSize:     true,
          filePath:     true,
          status:       true,
          description:  true,
          createdAt:    true,
          uploadedByUser: {
            select: { firstName: true, lastName: true },
          },
        },
      },
      auditLogs: {
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          logId:       true,
          action:      true,
          description: true,
          createdAt:   true,
          riskLevel:   true,
          userRef: {
            select: { firstName: true, lastName: true, role: true },
          },
        },
      },
    },
  });

  if (!claim) {
    return NextResponse.json({ error: 'Sinistre introuvable.' }, { status: 404 });
  }

  return NextResponse.json(claim);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const decoded = await authenticate(request);
  if (!decoded) {
    return NextResponse.json({ error: 'Token d\'autorisation requis.' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json() as Record<string, unknown>;

  // Whitelist updatable fields
  const allowed = ['status','priority','claimType','incidentLocation','description',
    'damageDescription','claimedAmount','estimatedAmount','approvedAmount','assignedTo'];
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) data[key] = body[key] === '' ? null : body[key];
  }

  try {
    const updated = await prisma.claim.update({ where: { claimId: id }, data });
    return NextResponse.json({ success: true, data: updated });
  } catch {
    return NextResponse.json({ error: 'Mise à jour échouée.' }, { status: 500 });
  }
}
