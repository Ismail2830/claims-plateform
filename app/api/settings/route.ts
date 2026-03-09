import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { getSafeSettings } from '@/lib/settings/settings-service';

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, ['SUPER_ADMIN']);
  if (!auth.ok) return auth.response;

  try {
    const settings = await getSafeSettings();
    return NextResponse.json({ success: true, data: settings });
  } catch (err) {
    console.error('[GET /api/settings]', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch settings' }, { status: 500 });
  }
}
