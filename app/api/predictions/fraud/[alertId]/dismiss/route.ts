import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { dismissFraudAlert } from '@/app/lib/predictions/fraud-cluster';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ alertId: string }> }
) {
  const auth = await requireRole(request, ['SUPER_ADMIN', 'MANAGER_SENIOR']);
  if (!auth.ok) return auth.response;

  const { alertId } = await params;
  if (!alertId) {
    return NextResponse.json({ error: 'alertId requis' }, { status: 400 });
  }

  let note: string | undefined;
  try {
    const body = await request.json();
    note = typeof body.note === 'string' ? body.note.slice(0, 500) : undefined;
  } catch {
    // No body is fine
  }

  await dismissFraudAlert(alertId, note);

  return NextResponse.json({ success: true, alertId });
}
