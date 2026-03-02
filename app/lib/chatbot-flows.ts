/**
 * Nour – WhatsApp Chatbot Flow Engine
 * Moroccan Insurance Platform
 *
 * Flows:
 *   MENU          → Welcome + 4 action buttons
 *   DEVIS         → Collect policy type → DOB → show premium estimate
 *   SINISTRE      → Collect type → date → description → photo → create Claim
 *   STATUT        → Show last 3 claims for this phone
 *   AGENT         → Notify human agent + provide contact
 */

import { prisma } from '@/app/lib/prisma';
import { getSession, setSession, clearSession, UserSession } from './session-store';
import { sendWhatsAppText, sendWhatsAppButtons } from './whatsapp';
import { detectIntent } from './intent-detector';

// ─── Premium Estimation Table ─────────────────────────────────────────────────

const PREMIUM_TABLE: Record<string, { base: number; perYear: number }> = {
  AUTO:   { base: 1200, perYear: 15 },
  HOME:   { base: 800,  perYear: 10 },
  HEALTH: { base: 2400, perYear: 30 },
  LIFE:   { base: 600,  perYear: 20 },
};

function estimatePremium(policyType: string, dateOfBirth: string): string {
  const table = PREMIUM_TABLE[policyType.toUpperCase()];
  if (!table) return 'Non disponible';

  const birth = new Date(dateOfBirth);
  const age = new Date().getFullYear() - birth.getFullYear();
  const premium = table.base + age * table.perYear;
  return `${premium.toLocaleString('fr-MA')} MAD/an`;
}

// ─── Claim Number Generator ───────────────────────────────────────────────────

function generateClaimNumber(): string {
  const now = new Date();
  const yymm = `${now.getFullYear().toString().slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const rand = Math.floor(Math.random() * 90000) + 10000;
  return `SIN-WA-${yymm}-${rand}`;
}

// ─── Claim Type Mapping ───────────────────────────────────────────────────────

const CLAIM_TYPE_MAP: Record<string, string> = {
  '1': 'ACCIDENT',
  '2': 'THEFT',
  '3': 'FIRE',
  '4': 'WATER_DAMAGE',
  'accident':     'ACCIDENT',
  'vol':          'THEFT',
  'incendie':     'FIRE',
  'dégât':        'WATER_DAMAGE',
  'degat':        'WATER_DAMAGE',
  'dégats':       'WATER_DAMAGE',
  'degats':       'WATER_DAMAGE',
  'inondation':   'WATER_DAMAGE',
};

// ─── Human Agent Contact ──────────────────────────────────────────────────────

const AGENT_PHONE = process.env.AGENT_PHONE_NUMBER ?? '+212522XXXXXX';

// ─── Main Incoming Message Handler ───────────────────────────────────────────

export async function handleIncoming(phone: string, text: string): Promise<void> {
  const session = await getSession(phone);

  // If the user is mid-flow, continue that flow instead of re-detecting intent
  if (session.step !== 'MENU' && session.step !== 'AWAITING_INTENT') {
    await continueFlow(phone, text, session);
    return;
  }

  // Fresh start or MENU step → detect intent
  const intent = await detectIntent(text);

  switch (intent) {
    case 'MENU':
      await sendMenu(phone);
      break;
    case 'DEVIS':
      await startDevis(phone);
      break;
    case 'SINISTRE':
      await startSinistre(phone);
      break;
    case 'STATUT':
      await handleStatut(phone);
      break;
    case 'RENOUVELLEMENT':
      await handleRenouvellement(phone);
      break;
    case 'AGENT':
      await handleAgent(phone);
      break;
    default:
      await sendMenu(phone);
  }
}

// ─── Continue Mid-Flow ────────────────────────────────────────────────────────

async function continueFlow(
  phone: string,
  text: string,
  session: UserSession,
): Promise<void> {
  switch (session.step) {
    // ── DEVIS flow ─────────────────────────────────────────────────
    case 'DEVIS_POLICY_TYPE':
      await handleDevisPolicyType(phone, text, session);
      break;
    case 'DEVIS_DOB':
      await handleDevisDOB(phone, text, session);
      break;

    // ── SINISTRE flow ──────────────────────────────────────────────
    case 'SINISTRE_TYPE':
      await handleSinistreType(phone, text, session);
      break;
    case 'SINISTRE_DATE':
      await handleSinistreDate(phone, text, session);
      break;
    case 'SINISTRE_DESC':
      await handleSinistreDesc(phone, text, session);
      break;
    case 'SINISTRE_PHOTO':
      await handleSinistrePhoto(phone, text, session);
      break;

    default:
      // Unrecognised step → reset to menu
      await clearSession(phone);
      await sendMenu(phone);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MENU Flow
// ─────────────────────────────────────────────────────────────────────────────

async function sendMenu(phone: string): Promise<void> {
  await setSession(phone, { step: 'MENU', context: {} });

  await sendWhatsAppButtons(
    phone,
    '🌟 *Bonjour! Je suis Nour*, votre assistante assurance.\n\nComment puis-je vous aider aujourd\'hui?',
    [
      { id: 'DEVIS',    title: '📋 Demander un devis' },
      { id: 'SINISTRE', title: '🚨 Déclarer un sinistre' },
      { id: 'STATUT',   title: '🔍 Suivre mon dossier' },
    ],
  );

  // Send a second row for Agent (buttons max 3, so we send a follow-up text)
  await sendWhatsAppText(
    phone,
    'Vous pouvez aussi taper:\n• *renouvellement* – rappel d\'échéance\n• *agent* – parler à un conseiller',
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DEVIS Flow
// ─────────────────────────────────────────────────────────────────────────────

async function startDevis(phone: string): Promise<void> {
  await setSession(phone, { step: 'DEVIS_POLICY_TYPE', context: {} });

  await sendWhatsAppButtons(
    phone,
    '📋 *Devis d\'assurance*\n\nQuel type d\'assurance vous intéresse?',
    [
      { id: 'AUTO',   title: '🚗 Auto' },
      { id: 'HOME',   title: '🏠 Habitation' },
      { id: 'HEALTH', title: '🏥 Santé' },
    ],
  );
  await sendWhatsAppText(phone, 'Tapez *VIE* pour une assurance vie.');
}

async function handleDevisPolicyType(
  phone: string,
  text: string,
  session: UserSession,
): Promise<void> {
  const typeMap: Record<string, string> = {
    auto:        'AUTO',
    '🚗':        'AUTO',
    home:        'HOME',
    habitation:  'HOME',
    '🏠':        'HOME',
    santé:       'HEALTH',
    sante:       'HEALTH',
    health:      'HEALTH',
    '🏥':        'HEALTH',
    vie:         'LIFE',
    life:        'LIFE',
  };

  // Also handle button_reply ID
  const normalised = text.trim().toLowerCase();
  const policyType =
    typeMap[normalised] ??
    typeMap[text.toUpperCase() as keyof typeof typeMap] ??
    text.toUpperCase();

  const valid = ['AUTO', 'HOME', 'HEALTH', 'LIFE'];
  if (!valid.includes(policyType)) {
    await sendWhatsAppText(phone, '❌ Type non reconnu. Veuillez choisir: AUTO, HOME, HEALTH ou VIE.');
    return;
  }

  await setSession(phone, {
    ...session,
    step: 'DEVIS_DOB',
    context: { ...session.context, policyType },
  });

  await sendWhatsAppText(
    phone,
    `✅ Assurance *${policyType}* sélectionnée.\n\n📅 Quelle est votre date de naissance? (format: JJ/MM/AAAA)`,
  );
}

async function handleDevisDOB(
  phone: string,
  text: string,
  session: UserSession,
): Promise<void> {
  // Accept DD/MM/YYYY or YYYY-MM-DD
  const ddmm = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const iso  = /^(\d{4})-(\d{2})-(\d{2})$/;

  let dob = '';
  const m1 = ddmm.exec(text.trim());
  const m2 = iso.exec(text.trim());

  if (m1) {
    dob = `${m1[3]}-${m1[2]}-${m1[1]}`;
  } else if (m2) {
    dob = text.trim();
  } else {
    await sendWhatsAppText(phone, '❌ Format invalide. Utilisez JJ/MM/AAAA (ex: 15/06/1990).');
    return;
  }

  const policyType = session.context.policyType ?? 'AUTO';
  const premium = estimatePremium(policyType, dob);

  await clearSession(phone);

  await sendWhatsAppText(
    phone,
    `📊 *Estimation de votre prime*\n\n` +
    `• Type: ${policyType}\n` +
    `• Prime estimée: *${premium}*\n\n` +
    `⚠️ _Il s'agit d'une estimation. Un conseiller vous contactera pour un devis précis._\n\n` +
    `Tapez *menu* pour revenir à l'accueil.`,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SINISTRE Flow
// ─────────────────────────────────────────────────────────────────────────────

async function startSinistre(phone: string): Promise<void> {
  await setSession(phone, { step: 'SINISTRE_TYPE', context: {} });

  await sendWhatsAppButtons(
    phone,
    '🚨 *Déclaration de sinistre*\n\nQuel type de sinistre souhaitez-vous déclarer?',
    [
      { id: '1', title: '🚗 Accident' },
      { id: '2', title: '🔒 Vol' },
      { id: '3', title: '🔥 Incendie' },
    ],
  );
  await sendWhatsAppText(phone, 'Tapez *4* pour Dégâts des eaux.');
}

async function handleSinistreType(
  phone: string,
  text: string,
  session: UserSession,
): Promise<void> {
  const claimType =
    CLAIM_TYPE_MAP[text.trim().toLowerCase()] ??
    CLAIM_TYPE_MAP[text.trim()] ??
    null;

  if (!claimType) {
    await sendWhatsAppText(
      phone,
      '❌ Type non reconnu. Tapez: 1 (Accident), 2 (Vol), 3 (Incendie), 4 (Dégâts eaux).',
    );
    return;
  }

  await setSession(phone, {
    ...session,
    step: 'SINISTRE_DATE',
    context: { ...session.context, claimType },
  });

  await sendWhatsAppText(
    phone,
    `📅 *${claimType}* enregistré.\n\nQuelle est la date du sinistre? (format: JJ/MM/AAAA)`,
  );
}

async function handleSinistreDate(
  phone: string,
  text: string,
  session: UserSession,
): Promise<void> {
  const ddmm = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const iso  = /^(\d{4})-(\d{2})-(\d{2})$/;

  let incidentDate = '';
  const m1 = ddmm.exec(text.trim());
  const m2 = iso.exec(text.trim());

  if (m1) {
    incidentDate = `${m1[3]}-${m1[2]}-${m1[1]}`;
  } else if (m2) {
    incidentDate = text.trim();
  } else {
    await sendWhatsAppText(phone, '❌ Format invalide. Utilisez JJ/MM/AAAA (ex: 15/06/2025).');
    return;
  }

  await setSession(phone, {
    ...session,
    step: 'SINISTRE_DESC',
    context: { ...session.context, incidentDate },
  });

  await sendWhatsAppText(
    phone,
    '📝 Décrivez brièvement le sinistre (lieu, circonstances, dommages):',
  );
}

async function handleSinistreDesc(
  phone: string,
  text: string,
  session: UserSession,
): Promise<void> {
  if (text.trim().length < 10) {
    await sendWhatsAppText(phone, '❌ Description trop courte. Veuillez fournir plus de détails.');
    return;
  }

  await setSession(phone, {
    ...session,
    step: 'SINISTRE_PHOTO',
    context: { ...session.context, description: text.trim() },
  });

  await sendWhatsAppText(
    phone,
    '📸 Envoyez une photo des dégâts (optionnel).\n\nTapez *non* ou *passer* pour ignorer.',
  );
}

async function handleSinistrePhoto(
  phone: string,
  text: string,
  session: UserSession,
): Promise<void> {
  // text will be either image media_id (from webhook) or "non"/"passer"
  const hasPhoto = !['non', 'passer', 'skip', 'no'].includes(text.trim().toLowerCase());
  const photoRef = hasPhoto ? text.trim() : undefined;

  await createClaim(phone, session, photoRef);
}

// ─── Create Claim in Database ─────────────────────────────────────────────────

async function createClaim(
  phone: string,
  session: UserSession,
  photoRef?: string,
): Promise<void> {
  const { claimType, incidentDate, description } = session.context;

  // Find the client by phone
  const client = await prisma.client.findUnique({ where: { phone } });

  if (!client) {
    await clearSession(phone);
    await sendWhatsAppText(
      phone,
      '❌ Aucun compte trouvé pour ce numéro.\n\n' +
      `Veuillez vous inscrire sur notre plateforme ou appeler le ${AGENT_PHONE}.`,
    );
    return;
  }

  const claimNumber = generateClaimNumber();

  try {
    await prisma.claim.create({
      data: {
        claimNumber,
        clientId:       client.clientId,
        claimType:      claimType as any,
        incidentDate:   new Date(incidentDate),
        description:    description ?? '',
        additionalNotes: photoRef ? `Photo WhatsApp ID: ${photoRef}` : null,
        source:         'WHATSAPP' as any,
      },
    });

    await clearSession(phone);

    await sendWhatsAppText(
      phone,
      `✅ *Sinistre déclaré avec succès!*\n\n` +
      `📋 Numéro de dossier: *${claimNumber}*\n` +
      `📌 Type: ${claimType}\n` +
      `📅 Date incident: ${incidentDate}\n\n` +
      `Un expert vous contactera dans les 48h.\n` +
      `Pour suivre votre dossier, tapez *statut*.\n\n` +
      `Tapez *menu* pour revenir à l'accueil.`,
    );
  } catch (err) {
    console.error('[Chatbot] createClaim error:', err);
    await clearSession(phone);
    await sendWhatsAppText(
      phone,
      `❌ Une erreur est survenue. Veuillez réessayer ou appeler le ${AGENT_PHONE}.`,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUT Flow
// ─────────────────────────────────────────────────────────────────────────────

async function handleStatut(phone: string): Promise<void> {
  const client = await prisma.client.findUnique({ where: { phone } });

  if (!client) {
    await sendWhatsAppText(
      phone,
      `❌ Aucun compte trouvé pour ce numéro.\n\nContactez-nous: ${AGENT_PHONE}`,
    );
    return;
  }

  const claims = await prisma.claim.findMany({
    where:   { clientId: client.clientId },
    orderBy: { createdAt: 'desc' },
    take:    3,
    select:  {
      claimNumber:  true,
      claimType:    true,
      status:       true,
      incidentDate: true,
      createdAt:    true,
    },
  });

  if (claims.length === 0) {
    await sendWhatsAppText(
      phone,
      '📂 Vous n\'avez aucun dossier sinistre enregistré.\n\nTapez *sinistre* pour en déclarer un.',
    );
    return;
  }

  const STATUS_LABELS: Record<string, string> = {
    DECLARED:        '📩 Déclaré',
    ANALYZING:       '🔍 En analyse',
    DOCS_REQUIRED:   '📄 Documents requis',
    UNDER_EXPERTISE: '🔬 En expertise',
    IN_DECISION:     '⚖️ En décision',
    APPROVED:        '✅ Approuvé',
    IN_PAYMENT:      '💳 En paiement',
    CLOSED:          '🔒 Clôturé',
    REJECTED:        '❌ Rejeté',
  };

  const lines = claims
    .map((c, i) => {
      const date = c.incidentDate.toLocaleDateString('fr-MA');
      const statusLabel = STATUS_LABELS[c.status] ?? c.status;
      return `${i + 1}. *${c.claimNumber}*\n   📌 ${c.claimType} | ${statusLabel}\n   📅 ${date}`;
    })
    .join('\n\n');

  await sendWhatsAppText(
    phone,
    `🗂️ *Vos derniers dossiers:*\n\n${lines}\n\nTapez *agent* pour parler à un conseiller.`,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RENOUVELLEMENT Flow
// ─────────────────────────────────────────────────────────────────────────────

async function handleRenouvellement(phone: string): Promise<void> {
  const client = await prisma.client.findUnique({ where: { phone } });

  if (!client) {
    await sendWhatsAppText(
      phone,
      `❌ Aucun compte trouvé pour ce numéro.\n\nContactez-nous: ${AGENT_PHONE}`,
    );
    return;
  }

  const today = new Date();
  const in60days = new Date(today);
  in60days.setDate(today.getDate() + 60);

  const policies = await prisma.policy.findMany({
    where: {
      clientId: client.clientId,
      status:   'ACTIVE',
      endDate:  { lte: in60days },
    },
    orderBy: { endDate: 'asc' },
    take: 5,
  });

  if (policies.length === 0) {
    await sendWhatsAppText(
      phone,
      '✅ Aucune police n\'arrive à échéance dans les 60 prochains jours.',
    );
    return;
  }

  const lines = policies.map((p) => {
    const end = p.endDate.toLocaleDateString('fr-MA');
    const daysLeft = Math.ceil((p.endDate.getTime() - today.getTime()) / 86400000);
    return `• *${p.policyNumber}* (${p.policyType}) – expire le ${end} (J-${daysLeft})`;
  }).join('\n');

  await sendWhatsAppText(
    phone,
    `📅 *Vos polices à renouveler:*\n\n${lines}\n\n` +
    `Contactez-nous pour renouveler: ${AGENT_PHONE}\nOu tapez *agent*.`,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AGENT Transfer
// ─────────────────────────────────────────────────────────────────────────────

async function handleAgent(phone: string): Promise<void> {
  await clearSession(phone);

  await sendWhatsAppText(
    phone,
    `🧑‍💼 *Transfert vers un conseiller humain*\n\n` +
    `Vous allez être mis en relation avec l'un de nos agents.\n\n` +
    `📞 Téléphone direct: *${AGENT_PHONE}*\n` +
    `🕐 Disponible: Lun–Ven 8h–18h | Sam 9h–13h\n\n` +
    `Un conseiller vous contactera dans les prochaines minutes.\n\n` +
    `Tapez *menu* pour revenir à l'accueil.`,
  );
}

// ─── Handle Image Messages ────────────────────────────────────────────────────

export async function handleImageMessage(phone: string, mediaId: string): Promise<void> {
  const session = await getSession(phone);

  if (session.step === 'SINISTRE_PHOTO') {
    await handleSinistrePhoto(phone, mediaId, session);
  } else {
    await sendWhatsAppText(
      phone,
      '📸 Image reçue. Tapez *menu* pour voir les options disponibles.',
    );
  }
}
