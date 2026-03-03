/**
 * WhatsApp Intent Detector for Nour – Moroccan Insurance Chatbot
 *
 * Strategy:
 *   1. Fast keyword matching (French + Arabic) — no API call
 *   2. Fallback: OpenAI GPT-4o-mini classification if UNKNOWN
 *
 * Intents: DEVIS | SINISTRE | STATUT | RENOUVELLEMENT | MENU | AGENT | UNKNOWN
 */

import OpenAI from 'openai';

// ─── Intent Type ─────────────────────────────────────────────────────────────

export type Intent =
  | 'DEVIS'
  | 'SINISTRE'
  | 'STATUT'
  | 'RENOUVELLEMENT'
  | 'POLICE'
  | 'MENU'
  | 'AGENT'
  | 'UNKNOWN';

// ─── Keyword Maps ─────────────────────────────────────────────────────────────

const KEYWORD_MAP: Record<Intent, RegExp> = {
  DEVIS: /devis|tarif|prix|combien|cotation|assurer|souscri|auto|voiture|maison|santé|sante|vie|habitation|تأمين|تسعير|سعر|تكلفة|قسيمة/i,
  SINISTRE: /sinistre|accident|déclar|declarer|incident|dommage|vol|incendie|bris|panne|crash|urgence|حادث|تصريح|خسارة|سرقة|حريق|ضرر/i,
  STATUT: /statut|état|etat|suivi|dossier|où en|avancement|numéro|numero|كيفاش|ملف|متابعة|حالة|وين/i,
  RENOUVELLEMENT: /renouvell|échéance|echeance|expir|renouvel|expire|rappel|تجديد|انتهاء|تمديد/i,
  POLICE: /police|polices|contrat|contrats|mes polices|mes contrats|voir police|consulter|وثيقة|وثائق|عقد|عقود|بوليصة|تأميناتي/i,
  MENU: /menu|accueil|début|debut|start|bonjour|salam|salut|bonsoir|aide|help|مرحبا|السلام|مساعدة|ابدأ|الرئيسية/i,
  AGENT: /agent|humain|conseiller|personne|opérateur|operateur|parler à|speak|عامل|موظف|إنسان|تحدث مع/i,
  UNKNOWN: /^$/, // never matches
};

// ─── Keyword Matching ─────────────────────────────────────────────────────────

function matchKeywords(text: string): Intent | null {
  const normalized = text.trim().toLowerCase();

  // Check intents in priority order (SINISTRE before DEVIS, etc.)
  const priorityOrder: Intent[] = [
    'MENU',
    'AGENT',
    'SINISTRE',
    'STATUT',
    'RENOUVELLEMENT',
    'POLICE',
    'DEVIS',
  ];

  for (const intent of priorityOrder) {
    if (KEYWORD_MAP[intent].test(normalized)) {
      return intent;
    }
  }

  return null;
}

// ─── OpenAI Fallback ──────────────────────────────────────────────────────────

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

const SYSTEM_PROMPT = `Tu es un détecteur d'intention pour un chatbot WhatsApp d'une plateforme d'assurance marocaine nommée "Nour".

Analyse le message de l'utilisateur et retourne UNIQUEMENT l'une de ces intentions:
- DEVIS: l'utilisateur veut un devis ou s'informer sur une assurance (auto, maison, santé, vie)
- SINISTRE: l'utilisateur veut déclarer un sinistre ou un accident
- STATUT: l'utilisateur veut connaître l'état de son dossier ou sinistre
- RENOUVELLEMENT: l'utilisateur parle du renouvellement ou de l'échéance de son contrat
- POLICE: l'utilisateur veut consulter ses polices/contrats d'assurance
- MENU: l'utilisateur veut voir le menu principal, dit bonjour, ou demande de l'aide
- AGENT: l'utilisateur veut parler à un agent humain
- UNKNOWN: aucune intention claire

Réponds avec UN SEUL mot parmi: DEVIS, SINISTRE, STATUT, RENOUVELLEMENT, POLICE, MENU, AGENT, UNKNOWN`;

async function classifyWithOpenAI(text: string): Promise<Intent> {
  try {
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: text },
      ],
      temperature: 0,
      max_tokens: 10,
    });

    const raw = response.choices[0]?.message?.content?.trim().toUpperCase() ?? '';
    const VALID_INTENTS: Intent[] = [
      'DEVIS',
      'SINISTRE',
      'STATUT',
      'RENOUVELLEMENT',
      'POLICE',
      'MENU',
      'AGENT',
      'UNKNOWN',
    ];

    return VALID_INTENTS.includes(raw as Intent) ? (raw as Intent) : 'UNKNOWN';
  } catch (err) {
    console.error('[IntentDetector] OpenAI error:', err);
    return 'UNKNOWN';
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Detect intent from a raw WhatsApp message text.
 * Tries keyword matching first; falls back to OpenAI if unrecognised.
 */
export async function detectIntent(text: string): Promise<Intent> {
  if (!text || text.trim().length === 0) return 'MENU';

  const keywordResult = matchKeywords(text);
  if (keywordResult) return keywordResult;

  // Fallback: OpenAI (only if API key is configured)
  if (process.env.OPENAI_API_KEY) {
    return classifyWithOpenAI(text);
  }

  return 'UNKNOWN';
}
