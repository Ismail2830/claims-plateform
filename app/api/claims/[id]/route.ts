/**
 * GET /api/claims/[id]
 *
 * Returns a single claim including AI risk scoring fields.
 * Used by useRiskScore hook to poll until scoring is complete.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { verifyToken } from '@/app/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Token d\'autorisation requis.' },
      { status: 401 },
    );
  }

  const decoded = await verifyToken(authHeader.substring(7));
  if (!decoded) {
    return NextResponse.json(
      { error: 'Token invalide ou expiré.' },
      { status: 401 },
    );
  }

  const { id } = await params;

  const claim = await prisma.claim.findUnique({
    where: { claimId: id },
    select: {
      claimId:         true,
      claimNumber:     true,
      claimType:       true,
      status:          true,
      claimedAmount:   true,
      incidentDate:    true,
      declarationDate: true,
      createdAt:       true,
      // AI scoring fields
      scoreRisque:     true,
      labelRisque:     true,
      decisionIa:      true,
      scoreConfidence: true,
      scoredAt:        true,
    },
  });

  if (!claim) {
    return NextResponse.json(
      { error: 'Sinistre introuvable.' },
      { status: 404 },
    );
  }

  return NextResponse.json(claim);
}
