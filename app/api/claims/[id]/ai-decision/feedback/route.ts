/**
 * POST /api/claims/[id]/ai-decision/feedback
 * Records whether the manager followed or ignored the AI recommendation.
 * Auth: MANAGER_JUNIOR, MANAGER_SENIOR, ADMIN, SUPER_ADMIN
 * Body: { followedByUser: boolean, ignoredReason?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { recordFeedback } from '@/lib/ai-decision/decision-service';

const VALID_IGNORE_REASONS = new Set([
  'ADDITIONAL_INFO_AVAILABLE',
  'DISAGREE_WITH_ANALYSIS',
  'POLICY_EXCEPTION',
  'CLIENT_RELATIONSHIP',
  'OTHER',
]);

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

  const body = await request.json() as {
    followedByUser: boolean;
    ignoredReason?: string;
  };

  if (typeof body.followedByUser !== 'boolean') {
    return NextResponse.json({ error: 'followedByUser est requis (boolean)' }, { status: 400 });
  }

  if (body.ignoredReason && !VALID_IGNORE_REASONS.has(body.ignoredReason)) {
    return NextResponse.json({ error: 'Raison invalide' }, { status: 400 });
  }

  // Fire-and-forget: feedback recording must never block the approval action
  recordFeedback(claimId, body.followedByUser, body.ignoredReason).catch(
    (err: unknown) => console.error('[AI Decision] recordFeedback failed', err),
  );

  return NextResponse.json({ success: true });
}
