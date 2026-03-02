/**
 * Meta WhatsApp Cloud API v19.0 Utility
 * Nour – Moroccan Insurance AI Chatbot
 */

const WA_API_URL = `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

const headers = () => ({
  Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
  'Content-Type': 'application/json',
});

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WhatsAppButton {
  id: string;
  title: string;
}

export interface WhatsAppTemplateComponent {
  type: 'header' | 'body' | 'button';
  parameters: Array<{
    type: 'text' | 'image' | 'document' | 'video';
    text?: string;
    image?: { link: string };
  }>;
}

type SendResult = { messageId: string } | { error: string };

// ─── Phone Formatter ──────────────────────────────────────────────────────────

/**
 * Converts Moroccan mobile numbers to WhatsApp international format.
 * Handles: 06XXXXXXXX, 07XXXXXXXX, +2126XXXXXXXX, 2126XXXXXXXX
 * Output:  212XXXXXXXXX (no + prefix – WhatsApp API uses numeric strings)
 */
export function formatPhone(phone: string): string {
  // Strip all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // Already in international format with country code
  if (digits.startsWith('212') && digits.length === 12) {
    return digits;
  }

  // Local Moroccan format 06/07 (10 digits)
  if (digits.length === 10 && (digits.startsWith('06') || digits.startsWith('07'))) {
    return `212${digits.slice(1)}`;
  }

  // 9-digit format without leading zero (6XXXXXXXX / 7XXXXXXXX)
  if (digits.length === 9 && (digits.startsWith('6') || digits.startsWith('7'))) {
    return `212${digits}`;
  }

  // Return as-is and let the API reject it
  return digits;
}

// ─── Send Plain Text ──────────────────────────────────────────────────────────

export async function sendWhatsAppText(
  to: string,
  message: string,
): Promise<SendResult> {
  const formattedTo = formatPhone(to);

  const body = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: formattedTo,
    type: 'text',
    text: { preview_url: false, body: message },
  };

  const res = await fetch(WA_API_URL, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error('[WhatsApp] sendText error:', JSON.stringify(data));
    return { error: data?.error?.message ?? 'Unknown WhatsApp API error' };
  }

  return { messageId: data.messages?.[0]?.id ?? '' };
}

// ─── Send Interactive Buttons (max 3) ─────────────────────────────────────────

export async function sendWhatsAppButtons(
  to: string,
  bodyText: string,
  buttons: WhatsAppButton[],
): Promise<SendResult> {
  if (buttons.length === 0 || buttons.length > 3) {
    throw new Error('WhatsApp interactive buttons require 1–3 buttons.');
  }

  const formattedTo = formatPhone(to);

  const body = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: formattedTo,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: bodyText },
      action: {
        buttons: buttons.map((btn) => ({
          type: 'reply',
          reply: { id: btn.id, title: btn.title.slice(0, 20) }, // max 20 chars
        })),
      },
    },
  };

  const res = await fetch(WA_API_URL, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error('[WhatsApp] sendButtons error:', JSON.stringify(data));
    return { error: data?.error?.message ?? 'Unknown WhatsApp API error' };
  }

  return { messageId: data.messages?.[0]?.id ?? '' };
}

// ─── Send Template Message ────────────────────────────────────────────────────

export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  languageCode: string,
  components: WhatsAppTemplateComponent[] = [],
): Promise<SendResult> {
  const formattedTo = formatPhone(to);

  const body = {
    messaging_product: 'whatsapp',
    to: formattedTo,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      ...(components.length > 0 && { components }),
    },
  };

  const res = await fetch(WA_API_URL, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error('[WhatsApp] sendTemplate error:', JSON.stringify(data));
    return { error: data?.error?.message ?? 'Unknown WhatsApp API error' };
  }

  return { messageId: data.messages?.[0]?.id ?? '' };
}
