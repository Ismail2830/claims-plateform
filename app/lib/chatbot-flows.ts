/**
 * Nour – WhatsApp Chatbot Flow Engine
 * Moroccan Insurance Platform — Bilingual (FR / AR)
 *
 * Flows:
 *   LANG_SELECT   → Choose language (FR / AR) — first interaction
 *   MENU          → Welcome + 3 action buttons
 *   DEVIS         → Collect policy type → DOB → show premium estimate
 *   SINISTRE      → Collect type → date → description → photo → create Claim
 *   STATUT        → Show last 3 claims for this phone
 *   RENOUVELLEMENT→ Policies expiring in 60 days
 *   AGENT         → Notify human agent + provide contact
 */

import { prisma } from '@/app/lib/prisma';
import { getSession, setSession, clearSession, UserSession } from './session-store';
import { sendWhatsAppText, sendWhatsAppButtons } from './whatsapp';
import { detectIntent } from './intent-detector';

// ─── Language Type ────────────────────────────────────────────────────────────

type Lang = 'fr' | 'ar';

function getLang(session: UserSession): Lang {
  return (session.context.lang as Lang) ?? 'fr';
}

// ─── Translations ─────────────────────────────────────────────────────────────

const T = {
  fr: {
    menuGreet:
      '🌟 *Bonjour! Je suis Nour*, votre assistante assurance.\n\nComment puis-je vous aider aujourd\'hui?',
    menuExtra:
      'Vous pouvez aussi taper:\n• *police* – consulter mes contrats\n• *renouvellement* – rappel d\'echéance\n• *agent* – parler à un conseiller',
    menuBtn1: '📋 Demander un devis',
    menuBtn2: '🚨 Déclarer un sinistre',
    menuBtn3: '🔍 Suivre mon dossier',
    devisTitle: '📋 *Devis d\'assurance*\n\nQuel type d\'assurance vous intéresse?',
    devisLife: 'Tapez *VIE* pour une assurance vie.',
    devisInvalidType: '❌ Type non reconnu. Veuillez choisir: AUTO, HOME, HEALTH ou VIE.',
    devisAskDOB: (type: string) =>
      `✅ Assurance *${type}* sélectionnée.\n\n📅 Quelle est votre date de naissance? (format: JJ/MM/AAAA)`,
    devisInvalidDOB: '❌ Format invalide. Utilisez JJ/MM/AAAA (ex: 15/06/1990).',
    devisResult: (type: string, premium: string) =>
      `📊 *Estimation de votre prime*\n\n• Type: ${type}\n• Prime estimée: *${premium}*\n\n⚠️ _Il s'agit d'une estimation. Un conseiller vous contactera pour un devis précis._\n\nTapez *menu* pour revenir à l'accueil.`,
    sinistreTitle: '🚨 *Déclaration de sinistre*\n\nQuel type de sinistre souhaitez-vous déclarer?',
    sinistreExtra: 'Tapez *4* pour Dégâts des eaux.',
    sinistreInvalidType: '❌ Type non reconnu. Tapez: 1 (Accident), 2 (Vol), 3 (Incendie), 4 (Dégâts eaux).',
    sinistreAskDate: (type: string) =>
      `📅 *${type}* enregistré.\n\nQuelle est la date du sinistre? (format: JJ/MM/AAAA)`,
    sinistreInvalidDate: '❌ Format invalide. Utilisez JJ/MM/AAAA (ex: 15/06/2025).',
    sinistreAskDesc: '📝 Décrivez brièvement le sinistre (lieu, circonstances, dommages):',
    sinistreDescShort: '❌ Description trop courte. Veuillez fournir plus de détails.',
    sinistreAskPhoto: '📸 Envoyez une photo des dégâts (optionnel).\n\nTapez *non* ou *passer* pour ignorer.',
    sinistreSuccess: (num: string, type: string, date: string) =>
      `✅ *Sinistre déclaré avec succès!*\n\n📋 Numéro de dossier: *${num}*\n📌 Type: ${type}\n📅 Date incident: ${date}\n\nUn expert vous contactera dans les 48h.\nPour suivre votre dossier, tapez *statut*.\n\nTapez *menu* pour revenir à l'accueil.`,
    sinistreError: (agent: string) =>
      `❌ Une erreur est survenue. Veuillez réessayer ou appeler le ${agent}.`,
    noAccount: (agent: string) =>
      `❌ Aucun compte trouvé pour ce numéro.\n\nVeuillez vous inscrire sur notre plateforme ou appeler le ${agent}.`,
    noAccountShort: (agent: string) =>
      `❌ Aucun compte trouvé pour ce numéro.\n\nContactez-nous: ${agent}`,
    noClaims: '📂 Vous n\'avez aucun dossier sinistre enregistré.\n\nTapez *sinistre* pour en déclarer un.',
    statutTitle: (lines: string) =>
      `🗂️ *Vos derniers dossiers:*\n\n${lines}\n\nTapez *agent* pour parler à un conseiller.`,
    noPolicies: '✅ Aucune police n\'arrive à échéance dans les 60 prochains jours.',
    renewTitle: (lines: string, agent: string) =>
      `📋 *Vos polices proches de l'échéance:*\n\n${lines}\n\nContactez-nous pour renouveler: ${agent}\nOu tapez *agent*.`,
    policeTitle: (lines: string) =>
      `📁 *Vos polices d'assurance actives:*\n\n${lines}\n\nTapez *agent* pour toute question.`,
    noPoliciesActive: '📂 Aucune police d\'assurance active trouvée sur votre compte.\n\nTapez *devis* pour souscrire.',
    agentMsg: (agent: string) =>
      `🧑‍💼 *Transfert vers un conseiller humain*\n\nVous allez être mis en relation avec l'un de nos agents.\n\n📞 Téléphone direct: *${agent}*\n🕐 Disponible: Lun–Ven 8h–18h | Sam 9h–13h\n\nUn conseiller vous contactera dans les prochaines minutes.\n\nTapez *menu* pour revenir à l'accueil.`,
    imgReceived: '📸 Image reçue. Tapez *menu* pour voir les options disponibles.',
    statusLabels: {
      DECLARED: '📩 Déclaré', ANALYZING: '🔍 En analyse',
      DOCS_REQUIRED: '📄 Documents requis', UNDER_EXPERTISE: '🔬 En expertise',
      IN_DECISION: '⚖️ En décision', APPROVED: '✅ Approuvé',
      IN_PAYMENT: '💳 En paiement', CLOSED: '🔒 Clôturé', REJECTED: '❌ Rejeté',
    } as Record<string, string>,
  },
  ar: {
    menuGreet:
      '🌟 *مرحباً! أنا نور*، مساعدتكم في التأمين.\n\nكيف يمكنني مساعدتك اليوم؟',
    menuExtra:
      'يمكنك أيضاً كتابة:\n• *وثيقة* – عرض عقود تأميني\n• *تجديد* – تذكير بانتهاء الوثيقة\n• *وكيل* – التحدث مع مستشار',
    menuBtn1: '📋 طلب عرض سعر',
    menuBtn2: '🚨 الإبلاغ عن حادثة',
    menuBtn3: '🔍 متابعة ملفي',
    devisTitle: '📋 *عرض سعر التأمين*\n\nما نوع التأمين الذي يهمك؟',
    devisLife: 'اكتب *حياة* لتأمين الحياة.',
    devisInvalidType: '❌ النوع غير معروف. اختر: سيارة، منزل، صحة أو حياة.',
    devisAskDOB: (type: string) =>
      `✅ تم اختيار تأمين *${type}*.\n\n📅 ما هو تاريخ ميلادك؟ (الصيغة: يي/شش/سسسس)`,
    devisInvalidDOB: '❌ صيغة غير صحيحة. استخدم يي/شش/سسسس (مثال: 15/06/1990).',
    devisResult: (type: string, premium: string) =>
      `📊 *تقدير قسط التأمين*\n\n• النوع: ${type}\n• القسط المقدر: *${premium}*\n\n⚠️ _هذا تقدير فقط. سيتصل بك مستشار لعرض سعر دقيق._\n\nاكتب *قائمة* للعودة للقائمة الرئيسية.`,
    sinistreTitle: '🚨 *الإبلاغ عن حادثة*\n\nما هو نوع الحادثة؟',
    sinistreExtra: 'اكتب *4* لأضرار المياه.',
    sinistreInvalidType: '❌ النوع غير معروف. اكتب: 1 (حادث)، 2 (سرقة)، 3 (حريق)، 4 (أضرار مياه).',
    sinistreAskDate: (type: string) =>
      `📅 تم تسجيل *${type}*.\n\nما هو تاريخ الحادثة؟ (الصيغة: يي/شش/سسسس)`,
    sinistreInvalidDate: '❌ صيغة غير صحيحة. استخدم يي/شش/سسسس (مثال: 15/06/2025).',
    sinistreAskDesc: '📝 صف الحادثة باختصار (المكان، الظروف، الأضرار):',
    sinistreDescShort: '❌ الوصف قصير جداً. يرجى تقديم المزيد من التفاصيل.',
    sinistreAskPhoto: '📸 أرسل صورة للأضرار (اختياري).\n\nاكتب *لا* أو *تجاوز* للتخطي.',
    sinistreSuccess: (num: string, type: string, date: string) =>
      `✅ *تم الإبلاغ عن الحادثة بنجاح!*\n\n📋 رقم الملف: *${num}*\n📌 النوع: ${type}\n📅 تاريخ الحادثة: ${date}\n\nسيتصل بك خبير خلال 48 ساعة.\nلمتابعة ملفك، اكتب *حالة*.\n\nاكتب *قائمة* للعودة للقائمة الرئيسية.`,
    sinistreError: (agent: string) =>
      `❌ حدث خطأ. يرجى المحاولة مجدداً أو الاتصال بـ ${agent}.`,
    noAccount: (agent: string) =>
      `❌ لا يوجد حساب لهذا الرقم.\n\nيرجى التسجيل في منصتنا أو الاتصال بـ ${agent}.`,
    noAccountShort: (agent: string) =>
      `❌ لا يوجد حساب لهذا الرقم.\n\nاتصل بنا: ${agent}`,
    noClaims: '📂 ليس لديك أي ملفات حوادث مسجلة.\n\nاكتب *حادثة* للإبلاغ عن حادثة.',
    statutTitle: (lines: string) =>
      `🗂️ *آخر ملفاتك:*\n\n${lines}\n\nاكتب *وكيل* للتحدث مع مستشار.`,
    noPolicies: '✅ لا توجد وثائق تأمين تنتهي خلال الستين يوماً القادمة.',
    renewTitle: (lines: string, agent: string) =>
      `📋 *وثائق تأمينك القريبة من الانتهاء:*\n\n${lines}\n\nاتصل بنا للتجديد: ${agent}\nأو اكتب *وكيل*.`,
    policeTitle: (lines: string) =>
      `📁 *وثائق تأمينك النشطة:*\n\n${lines}\n\nاكتب *وكيل* لأي سؤال.`,
    noPoliciesActive: '📂 لا توجد وثائق تأمين نشطة على حسابك.\n\nاكتب *تأمين* للاشتراك.',
    agentMsg: (agent: string) =>
      `🧑‍💼 *التحويل إلى مستشار بشري*\n\nسيتم التواصل معك من قِبل أحد مستشارينا.\n\n📞 الهاتف المباشر: *${agent}*\n🕐 متاح: الإثنين–الجمعة 8ص–6م | السبت 9ص–1م\n\nسيتصل بك مستشار خلال دقائق.\n\nاكتب *قائمة* للعودة للقائمة الرئيسية.`,
    imgReceived: '📸 تم استلام الصورة. اكتب *قائمة* لرؤية الخيارات.',
    statusLabels: {
      DECLARED: '📩 مُعلَن', ANALYZING: '🔍 قيد التحليل',
      DOCS_REQUIRED: '📄 وثائق مطلوبة', UNDER_EXPERTISE: '🔬 قيد الخبرة',
      IN_DECISION: '⚖️ قيد القرار', APPROVED: '✅ موافق عليه',
      IN_PAYMENT: '💳 قيد الدفع', CLOSED: '🔒 مغلق', REJECTED: '❌ مرفوض',
    } as Record<string, string>,
  },
};

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
  '1': 'ACCIDENT', '2': 'THEFT', '3': 'FIRE', '4': 'WATER_DAMAGE',
  'accident': 'ACCIDENT', 'حادث': 'ACCIDENT',
  'vol': 'THEFT', 'سرقة': 'THEFT',
  'incendie': 'FIRE', 'حريق': 'FIRE',
  'dégât': 'WATER_DAMAGE', 'degat': 'WATER_DAMAGE',
  'dégats': 'WATER_DAMAGE', 'degats': 'WATER_DAMAGE',
  'inondation': 'WATER_DAMAGE', 'أضرار': 'WATER_DAMAGE', 'مياه': 'WATER_DAMAGE',
};

// ─── Human Agent Contact ──────────────────────────────────────────────────────

const AGENT_PHONE = process.env.AGENT_PHONE_NUMBER ?? '+212522XXXXXX';

// ─── Language Selection ───────────────────────────────────────────────────────

async function sendLanguageSelect(phone: string): Promise<void> {
  await sendWhatsAppButtons(
    phone,
    '🌍 *Bienvenue chez ISM Assurance!*\n\nVeuillez choisir votre langue.\nالرجاء اختيار لغتك.',
    [
      { id: 'LANG_FR', title: '🇫🇷 Français' },
      { id: 'LANG_AR', title: '🇲🇦 العربية' },
    ],
  );
}

// ─── Main Incoming Message Handler ───────────────────────────────────────────

export async function handleIncoming(phone: string, text: string): Promise<void> {
  const session = await getSession(phone);

  // ── Language selection gate ───────────────────────────────────────────────
  if (!session.context.lang) {
    const lower = text.trim().toLowerCase();
    const isFr = text === 'LANG_FR' || lower === 'fr' || lower === 'français' || lower === 'francais';
    const isAr = text === 'LANG_AR' || lower === 'ar' || lower === 'عربية' || lower === 'عربي';
    if (isFr) {
      await setSession(phone, { ...session, context: { ...session.context, lang: 'fr' } });
      await sendMenu(phone, 'fr');
      return;
    }
    if (isAr) {
      await setSession(phone, { ...session, context: { ...session.context, lang: 'ar' } });
      await sendMenu(phone, 'ar');
      return;
    }
    await sendLanguageSelect(phone);
    return;
  }

  const lang = getLang(session);

  // If the user is mid-flow, continue that flow instead of re-detecting intent
  if (session.step !== 'MENU' && session.step !== 'AWAITING_INTENT') {
    await continueFlow(phone, text, session, lang);
    return;
  }

  // Fresh start or MENU step → detect intent
  const intent = await detectIntent(text);

  switch (intent) {
    case 'MENU':
      await sendMenu(phone, lang);
      break;
    case 'DEVIS':
      await startDevis(phone, lang, session);
      break;
    case 'SINISTRE':
      await startSinistre(phone, lang, session);
      break;
    case 'STATUT':
      await handleStatut(phone, lang);
      break;
    case 'POLICE':
      await handlePolice(phone, lang);
      break;
    case 'RENOUVELLEMENT':
      await handleRenouvellement(phone, lang);
      break;
    case 'AGENT':
      await handleAgent(phone, lang);
      break;
    default:
      await sendMenu(phone, lang);
  }
}

// ─── Continue Mid-Flow ────────────────────────────────────────────────────────

async function continueFlow(
  phone: string,
  text: string,
  session: UserSession,
  lang: Lang,
): Promise<void> {
  switch (session.step) {
    case 'DEVIS_POLICY_TYPE':
      await handleDevisPolicyType(phone, text, session, lang);
      break;
    case 'DEVIS_DOB':
      await handleDevisDOB(phone, text, session, lang);
      break;
    case 'SINISTRE_TYPE':
      await handleSinistreType(phone, text, session, lang);
      break;
    case 'SINISTRE_DATE':
      await handleSinistreDate(phone, text, session, lang);
      break;
    case 'SINISTRE_DESC':
      await handleSinistreDesc(phone, text, session, lang);
      break;
    case 'SINISTRE_PHOTO':
      await handleSinistrePhoto(phone, text, session, lang);
      break;
    default:
      await clearSession(phone);
      await sendMenu(phone, lang);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MENU Flow
// ─────────────────────────────────────────────────────────────────────────────

async function sendMenu(phone: string, lang: Lang): Promise<void> {
  const t = T[lang];
  await setSession(phone, { step: 'MENU', context: { lang } });

  await sendWhatsAppButtons(phone, t.menuGreet, [
    { id: 'DEVIS',    title: t.menuBtn1 },
    { id: 'SINISTRE', title: t.menuBtn2 },
    { id: 'STATUT',   title: t.menuBtn3 },
  ]);
  await sendWhatsAppText(phone, t.menuExtra);
}

// ─────────────────────────────────────────────────────────────────────────────
// DEVIS Flow
// ─────────────────────────────────────────────────────────────────────────────

async function startDevis(phone: string, lang: Lang, session: UserSession): Promise<void> {
  const t = T[lang];
  await setSession(phone, { step: 'DEVIS_POLICY_TYPE', context: { lang } });

  await sendWhatsAppButtons(phone, t.devisTitle, [
    { id: 'AUTO',   title: lang === 'ar' ? '🚗 سيارة' : '🚗 Auto' },
    { id: 'HOME',   title: lang === 'ar' ? '🏠 منزل'  : '🏠 Habitation' },
    { id: 'HEALTH', title: lang === 'ar' ? '🏥 صحة'   : '🏥 Santé' },
  ]);
  await sendWhatsAppText(phone, t.devisLife);
}

async function handleDevisPolicyType(
  phone: string,
  text: string,
  session: UserSession,
  lang: Lang,
): Promise<void> {
  const t = T[lang];
  const typeMap: Record<string, string> = {
    auto: 'AUTO', 'سيارة': 'AUTO',
    home: 'HOME', habitation: 'HOME', 'منزل': 'HOME',
    santé: 'HEALTH', sante: 'HEALTH', health: 'HEALTH', 'صحة': 'HEALTH',
    vie: 'LIFE', life: 'LIFE', 'حياة': 'LIFE',
  };

  const normalised = text.trim().toLowerCase();
  const policyType = typeMap[normalised] ?? typeMap[text.trim()] ?? text.toUpperCase();

  const valid = ['AUTO', 'HOME', 'HEALTH', 'LIFE'];
  if (!valid.includes(policyType)) {
    await sendWhatsAppText(phone, t.devisInvalidType);
    return;
  }

  await setSession(phone, { ...session, step: 'DEVIS_DOB', context: { lang, policyType } });
  await sendWhatsAppText(phone, t.devisAskDOB(policyType));
}

async function handleDevisDOB(
  phone: string,
  text: string,
  session: UserSession,
  lang: Lang,
): Promise<void> {
  const t = T[lang];
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
    await sendWhatsAppText(phone, t.devisInvalidDOB);
    return;
  }

  const policyType = session.context.policyType ?? 'AUTO';
  const premium = estimatePremium(policyType, dob);

  await setSession(phone, { step: 'MENU', context: { lang } });
  await sendWhatsAppText(phone, t.devisResult(policyType, premium));
}

// ─────────────────────────────────────────────────────────────────────────────
// SINISTRE Flow
// ─────────────────────────────────────────────────────────────────────────────

async function startSinistre(phone: string, lang: Lang, session: UserSession): Promise<void> {
  const t = T[lang];
  await setSession(phone, { step: 'SINISTRE_TYPE', context: { lang } });

  await sendWhatsAppButtons(phone, t.sinistreTitle, [
    { id: '1', title: lang === 'ar' ? '🚗 حادث'  : '🚗 Accident' },
    { id: '2', title: lang === 'ar' ? '🔒 سرقة'  : '🔒 Vol' },
    { id: '3', title: lang === 'ar' ? '🔥 حريق'  : '🔥 Incendie' },
  ]);
  await sendWhatsAppText(phone, t.sinistreExtra);
}

async function handleSinistreType(
  phone: string,
  text: string,
  session: UserSession,
  lang: Lang,
): Promise<void> {
  const t = T[lang];
  const claimType = CLAIM_TYPE_MAP[text.trim().toLowerCase()] ?? CLAIM_TYPE_MAP[text.trim()] ?? null;

  if (!claimType) {
    await sendWhatsAppText(phone, t.sinistreInvalidType);
    return;
  }

  await setSession(phone, { ...session, step: 'SINISTRE_DATE', context: { lang, claimType } });
  await sendWhatsAppText(phone, t.sinistreAskDate(claimType));
}

async function handleSinistreDate(
  phone: string,
  text: string,
  session: UserSession,
  lang: Lang,
): Promise<void> {
  const t = T[lang];
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
    await sendWhatsAppText(phone, t.sinistreInvalidDate);
    return;
  }

  await setSession(phone, {
    ...session, step: 'SINISTRE_DESC',
    context: { lang, claimType: session.context.claimType, incidentDate },
  });
  await sendWhatsAppText(phone, t.sinistreAskDesc);
}

async function handleSinistreDesc(
  phone: string,
  text: string,
  session: UserSession,
  lang: Lang,
): Promise<void> {
  const t = T[lang];
  if (text.trim().length < 10) {
    await sendWhatsAppText(phone, t.sinistreDescShort);
    return;
  }

  await setSession(phone, {
    ...session, step: 'SINISTRE_PHOTO',
    context: { ...session.context, description: text.trim() },
  });
  await sendWhatsAppText(phone, t.sinistreAskPhoto);
}

async function handleSinistrePhoto(
  phone: string,
  text: string,
  session: UserSession,
  lang: Lang,
): Promise<void> {
  const skipWords = ['non', 'passer', 'skip', 'no', 'لا', 'تجاوز'];
  const hasPhoto = !skipWords.includes(text.trim().toLowerCase());
  const photoRef = hasPhoto ? text.trim() : undefined;
  await createClaim(phone, session, lang, photoRef);
}

// ─── Create Claim in Database ─────────────────────────────────────────────────

async function createClaim(
  phone: string,
  session: UserSession,
  lang: Lang,
  photoRef?: string,
): Promise<void> {
  const t = T[lang];
  const { claimType, incidentDate, description } = session.context;

  const client = await prisma.client.findUnique({ where: { phone } });

  if (!client) {
    await setSession(phone, { step: 'MENU', context: { lang } });
    await sendWhatsAppText(phone, t.noAccount(AGENT_PHONE));
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

    await setSession(phone, { step: 'MENU', context: { lang } });
    await sendWhatsAppText(phone, t.sinistreSuccess(claimNumber, claimType, incidentDate));
  } catch (err) {
    console.error('[Chatbot] createClaim error:', err);
    await setSession(phone, { step: 'MENU', context: { lang } });
    await sendWhatsAppText(phone, t.sinistreError(AGENT_PHONE));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUT Flow
// ─────────────────────────────────────────────────────────────────────────────

async function handleStatut(phone: string, lang: Lang): Promise<void> {
  const t = T[lang];
  const client = await prisma.client.findUnique({ where: { phone } });

  if (!client) {
    await sendWhatsAppText(phone, t.noAccountShort(AGENT_PHONE));
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
    await sendWhatsAppText(phone, t.noClaims);
    return;
  }

  const lines = claims
    .map((c, i) => {
      const date = c.incidentDate.toLocaleDateString('fr-MA');
      const statusLabel = t.statusLabels[c.status] ?? c.status;
      return `${i + 1}. *${c.claimNumber}*\n   📌 ${c.claimType} | ${statusLabel}\n   📅 ${date}`;
    })
    .join('\n\n');

  await sendWhatsAppText(phone, t.statutTitle(lines));
}

// ─────────────────────────────────────────────────────────────────────────────// #5 CONSULTER MA POLICE
// ─────────────────────────────────────────────────────────────────────────────────

async function handlePolice(phone: string, lang: Lang): Promise<void> {
  const t = T[lang];
  const client = await prisma.client.findUnique({ where: { phone } });

  if (!client) {
    await sendWhatsAppText(phone, t.noAccountShort(AGENT_PHONE));
    return;
  }

  const policies = await prisma.policy.findMany({
    where:   { clientId: client.clientId, status: 'ACTIVE' },
    orderBy: { startDate: 'desc' },
    take:    5,
    select:  {
      policyNumber: true,
      policyType:   true,
      status:       true,
      startDate:    true,
      endDate:      true,
      premiumAmount: true,
    },
  });

  if (policies.length === 0) {
    await sendWhatsAppText(phone, t.noPoliciesActive);
    return;
  }

  const POLICY_TYPE_LABELS: Record<string, string> = {
    AUTO:         lang === 'ar' ? '🚗 سيارة'   : '🚗 Auto',
    HOME:         lang === 'ar' ? '🏠 منزل'    : '🏠 Habitation',
    HEALTH:       lang === 'ar' ? '🏥 صحة'     : '🏥 Santé',
    LIFE:         lang === 'ar' ? '💗 حياة'    : '💗 Vie',
    TRAVEL:       lang === 'ar' ? '✈️ سفر'      : '✈️ Voyage',
    PROFESSIONAL: lang === 'ar' ? '💼 مهني'    : '💼 Pro',
  };

  const lines = policies.map((p, i) => {
    const start  = p.startDate.toLocaleDateString('fr-MA');
    const end    = p.endDate.toLocaleDateString('fr-MA');
    const premium = p.premiumAmount
      ? `${Number(p.premiumAmount).toLocaleString('fr-MA')} MAD`
      : lang === 'ar' ? 'غير محدد' : 'N/A';
    const typeLabel = POLICY_TYPE_LABELS[p.policyType] ?? p.policyType;
    const separator = lang === 'ar' ? '│' : '|';
    return `${i + 1}. *${p.policyNumber}*\n   ${typeLabel} ${separator} ${premium}/an\n   📅 ${start} → ${end}`;
  }).join('\n\n');

  await sendWhatsAppText(phone, t.policeTitle(lines));
}

// ─────────────────────────────────────────────────────────────────────────────────// RENOUVELLEMENT Flow
// ─────────────────────────────────────────────────────────────────────────────

async function handleRenouvellement(phone: string, lang: Lang): Promise<void> {
  const t = T[lang];
  const client = await prisma.client.findUnique({ where: { phone } });

  if (!client) {
    await sendWhatsAppText(phone, t.noAccountShort(AGENT_PHONE));
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
    await sendWhatsAppText(phone, t.noPolicies);
    return;
  }

  const lines = policies.map((p) => {
    const end = p.endDate.toLocaleDateString('fr-MA');
    const daysLeft = Math.ceil((p.endDate.getTime() - today.getTime()) / 86400000);
    return `• *${p.policyNumber}* (${p.policyType}) – ${end} (J-${daysLeft})`;
  }).join('\n');

  await sendWhatsAppText(phone, t.renewTitle(lines, AGENT_PHONE));
}

// ─────────────────────────────────────────────────────────────────────────────
// AGENT Transfer
// ─────────────────────────────────────────────────────────────────────────────

async function handleAgent(phone: string, lang: Lang): Promise<void> {
  const t = T[lang];
  await setSession(phone, { step: 'MENU', context: { lang } });
  await sendWhatsAppText(phone, t.agentMsg(AGENT_PHONE));
}

// ─── Handle Image Messages ────────────────────────────────────────────────────

export async function handleImageMessage(phone: string, mediaId: string): Promise<void> {
  const session = await getSession(phone);
  const lang = getLang(session);

  if (session.step === 'SINISTRE_PHOTO') {
    await handleSinistrePhoto(phone, mediaId, session, lang);
  } else {
    await sendWhatsAppText(phone, T[lang].imgReceived);
  }
}
