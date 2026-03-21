/**
 * POST /api/claims/[id]/ai-decision/calculate
 * Manually triggers a (re)calculation of the AI decision.
 * Auth: MANAGER_JUNIOR, MANAGER_SENIOR, ADMIN, SUPER_ADMIN
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { computeAndSaveDecision } from '@/lib/ai-decision/decision-service';

export async function POST(
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

  try {
    const decision = await computeAndSaveDecision(claimId, false);
    return NextResponse.json({ decision });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur lors du calcul';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
