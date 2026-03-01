import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_ADDRESS =
  process.env.RESEND_FROM_EMAIL ?? 'ISM Assurance <noreply@ismassurance.com>';

export async function sendPasswordResetEmail({
  to,
  firstName,
  resetUrl,
}: {
  to: string;
  firstName: string;
  resetUrl: string;
}) {
  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: '🔐 Réinitialisation de votre mot de passe — ISM Assurance',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:12px">
        <h2 style="color:#1e3a5f;margin:0 0 4px 0">ISM Assurance</h2>
        <p style="color:#6b7280;font-size:13px;margin:0 0 24px 0">Plateforme de gestion des sinistres</p>

        <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:28px">
          <h3 style="color:#111827;margin:0 0 12px 0">Bonjour ${firstName},</h3>
          <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px 0">
            Vous avez demandé la réinitialisation de votre mot de passe.<br/>
            Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe.
          </p>

          <div style="text-align:center;margin:24px 0">
            <a href="${resetUrl}"
               style="background:#2563eb;color:#fff;padding:14px 32px;border-radius:8px;
                      text-decoration:none;display:inline-block;font-weight:600;font-size:15px">
              Réinitialiser le mot de passe
            </a>
          </div>

          <p style="color:#9ca3af;font-size:13px;margin:16px 0 0 0;line-height:1.5">
            Ce lien expire dans <strong style="color:#6b7280">15 minutes</strong>.<br/>
            Si vous n'avez pas fait cette demande, ignorez cet email — votre compte est en sécurité.
          </p>
        </div>

        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
        <p style="color:#d1d5db;font-size:12px;text-align:center;margin:0">
          © ${new Date().getFullYear()} ISM Assurance. Tous droits réservés.
        </p>
      </div>
    `,
  });

  if (error) {
    console.error('Resend password reset email error:', error);
    throw new Error(`Failed to send reset email: ${error.message}`);
  }
}
