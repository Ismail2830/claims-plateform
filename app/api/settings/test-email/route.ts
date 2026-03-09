import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { getSettings } from '@/lib/settings/settings-service';
import { Resend } from 'resend';

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, ['SUPER_ADMIN']);
  if (!auth.ok) return auth.response;

  try {
    const settings = await getSettings();
    const { smtp } = settings.email;

    const body = await req.json().catch(() => ({})) as { to?: string };
    const to: string = body.to ?? auth.user.email;

    // Use Resend (platform email provider)
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'RESEND_API_KEY non configurée' },
        { status: 400 }
      );
    }

    const resend = new Resend(apiKey);
    const fromAddress = smtp.fromEmail
      ? `${smtp.fromName} <${smtp.fromEmail}>`
      : (process.env.RESEND_FROM_EMAIL ?? 'ISM Assurance <noreply@ismassurance.com>');

    const { error } = await resend.emails.send({
      from:    fromAddress,
      to,
      subject: 'Test email — ISM Assurance',
      text:    'Cet email confirme que la configuration email est correcte.',
    });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: `Email envoyé à ${to}` });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
