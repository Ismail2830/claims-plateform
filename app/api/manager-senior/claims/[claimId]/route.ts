/**
 * GET /api/manager-senior/claims/[claimId] — full claim detail for Manager Senior
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
