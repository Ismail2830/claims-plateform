/**
 * GET /api/claims/[id]/ai-decision
 * Returns the current AI decision for a claim.
 * Auth: MANAGER_JUNIOR, MANAGER_SENIOR, MANAGER_EXPERT, SUPER_ADMIN
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { getDecision } from '@/lib/ai-decision/decision-service';

const ONE_HOUR_MS = 60 * 60 * 1000;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(request, [
    'MANAGER_JUNIOR',
    'MANAGER_SENIOR',
    'EXPERT',
    'ADMIN',
    'SUPER_ADMIN',
  ]);
  if (!auth.ok) return auth.response;

  const { id: claimId } = await params;

  const decision = await getDecision(claimId);

  const canRecalculate = decision === null
    ? true
    : Date.now() - decision.calculatedAt.getTime() > ONE_HOUR_MS;

  return NextResponse.json({
    decision,
    isCalculating: false,
    canRecalculate,
  });
}
