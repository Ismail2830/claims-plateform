import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { applyTariffRecommendation } from '@/app/lib/predictions/tariff-recommendation';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ policyId: string }> }
) {
  const auth = await requireRole(request, ['SUPER_ADMIN', 'MANAGER_SENIOR']);
  if (!auth.ok) return auth.response;

  const { policyId } = await params;
  if (!policyId) {
    return NextResponse.json({ error: 'policyId requis' }, { status: 400 });
  }

  let body: { confirmedPrime?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 });
  }

  const confirmedPrime = Number(body.confirmedPrime);
  if (!confirmedPrime || confirmedPrime <= 0) {
    return NextResponse.json({ error: 'Prime confirmée invalide' }, { status: 400 });
  }

  await applyTariffRecommendation(policyId, confirmedPrime);

  return NextResponse.json({ success: true, policyId, newPrime: confirmedPrime });
}
