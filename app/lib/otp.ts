/**
 * In-memory OTP store.
 * Key format: `${purpose}:${identifier}`
 *   purpose  — "email_verify" | "phone_verify" | "2fa"
 *   identifier — the email address or phone number
 */

interface OtpEntry {
  code: string;
  expiresAt: number;     // Unix ms
  attempts: number;
}

const OTP_TTL_MS   = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;

// Use a global variable so the store survives Next.js hot-reloads in dev
const g = global as any;
if (!g.__otpStore) g.__otpStore = new Map<string, OtpEntry>();
const store: Map<string, OtpEntry> = g.__otpStore;

// ── Generate a random 6-digit code ──────────────────────────────
export function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ── Store (or overwrite) an OTP ──────────────────────────────────
export function storeOtp(purpose: string, identifier: string, code: string): void {
  const key = `${purpose}:${identifier.toLowerCase()}`;
  store.set(key, { code, expiresAt: Date.now() + OTP_TTL_MS, attempts: 0 });
}

// ── Verify an OTP — returns true on success, false otherwise ─────
// Deletes the entry on success; increments attempt counter on fail.
export function verifyOtp(purpose: string, identifier: string, code: string): boolean {
  const key = `${purpose}:${identifier.toLowerCase()}`;
  const entry = store.get(key);

  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return false;
  }
  if (entry.attempts >= MAX_ATTEMPTS) {
    store.delete(key);
    return false;
  }

  if (entry.code !== code.trim()) {
    entry.attempts += 1;
    return false;
  }

  store.delete(key); // consume — single use
  return true;
}

// ── Email OTP via Resend ─────────────────────────────────────────
export async function sendEmailOtp(email: string, code: string, purpose: string): Promise<void> {
  const label =
    purpose === 'email_verify' ? 'Email Verification'
    : purpose === '2fa'        ? 'Login Verification'
    :                            'OTP';

  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.RESEND_FROM_EMAIL ?? 'ISM Assurance <noreply@ismassurance.com>';

  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not set in environment variables');
  }

  const { Resend } = await import('resend');
  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from: fromAddress,
    to: email,
    subject: `Your ${label} Code — ${code}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:12px">
        <h2 style="color:#1e3a5f;margin-bottom:8px">ISM Assurance</h2>
        <p style="color:#374151;font-size:15px">${label}</p>
        <div style="background:#fff;border:2px solid #e5e7eb;border-radius:10px;padding:24px;text-align:center;margin:24px 0">
          <p style="color:#6b7280;font-size:13px;margin:0 0 8px">Your verification code</p>
          <p style="font-size:36px;font-weight:700;letter-spacing:10px;color:#1d4ed8;margin:0">${code}</p>
        </div>
        <p style="color:#6b7280;font-size:13px">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
        <p style="color:#9ca3af;font-size:12px">If you did not request this code, you can safely ignore this email.</p>
      </div>
    `,
  });

  if (error) {
    console.error('Resend email error:', error);
    throw new Error(`Failed to send email OTP: ${error.message}`);
  }
}


