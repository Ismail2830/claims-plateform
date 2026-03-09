import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { updateSettings, SettingsSection } from '@/lib/settings/settings-service';

const ALLOWED_SECTIONS: SettingsSection[] = [
  'general', 'claims', 'scoring', 'email',
  'integrations', 'notifications', 'security', 'monitoring',
];

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ section: string }> }
) {
  const auth = await requireRole(req, ['SUPER_ADMIN']);
  if (!auth.ok) return auth.response;

  const { section } = await context.params;

  if (!ALLOWED_SECTIONS.includes(section as SettingsSection)) {
    return NextResponse.json({ success: false, error: 'Section invalide' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const updated = await updateSettings(
      section as SettingsSection,
      body,
      auth.user.userId,
    );
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error('[PATCH /api/settings/[section]]', err);
    return NextResponse.json({ success: false, error: 'Mise à jour échouée' }, { status: 500 });
  }
}
