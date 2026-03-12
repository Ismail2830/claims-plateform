import type { FlowStep, ClaimContext } from '../types'

function todayISO(): string {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  return d.toISOString().split('T')[0]
}

function yesterdayISO(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  d.setHours(12, 0, 0, 0)
  return d.toISOString().split('T')[0]
}

export const autoFlow: Record<string, FlowStep> = {
  AUTO_DATE: {
    id: 'AUTO_DATE',
    botMessage: "📅 Quand l'accident s'est-il produit?",
    inputType: 'BUTTONS',
    options: () => [
      { label: "Aujourd'hui", value: todayISO(), emoji: '📅' },
      { label: 'Hier', value: yesterdayISO(), emoji: '📅' },
      { label: 'Autre date', value: 'CUSTOM', emoji: '🗓️' },
    ],
    saveToContext: 'incidentDate',
    nextStep: (input: string) => (input === 'CUSTOM' ? 'AUTO_DATE_CUSTOM' : 'AUTO_LOCATION'),
  },

  AUTO_DATE_CUSTOM: {
    id: 'AUTO_DATE_CUSTOM',
    botMessage: "📅 Veuillez saisir la date de l'accident (format: JJ/MM/AAAA)",
    inputType: 'DATE',
    placeholder: 'Ex: 10/03/2026',
    saveToContext: 'incidentDate',
    validate: (input: string) => {
      if (!input || input.trim().length < 4)
        return { valid: false, error: 'Veuillez saisir une date valide.' }
      return { valid: true }
    },
    nextStep: 'AUTO_LOCATION',
  },

  AUTO_LOCATION: {
    id: 'AUTO_LOCATION',
    botMessage: "📍 Où l'accident s'est-il produit? (ville ou lieu précis)",
    inputType: 'TEXT',
    placeholder: 'Ex: Autoroute Casa-Rabat, km 45',
    saveToContext: 'incidentLocation',
    validate: (input: string) => {
      if (!input || input.trim().length < 2)
        return { valid: false, error: 'Veuillez indiquer le lieu de l\'accident.' }
      return { valid: true }
    },
    nextStep: 'AUTO_INJURIES',
  },

  AUTO_INJURIES: {
    id: 'AUTO_INJURIES',
    botMessage: '🩹 Y a-t-il eu des blessés?',
    inputType: 'BUTTONS',
    options: [
      { label: 'Non, dégâts matériels uniquement', value: 'false', emoji: '🚗' },
      { label: 'Oui, blessures légères', value: 'light', emoji: '🩹' },
      { label: 'Oui, urgence médicale', value: 'emergency', emoji: '🚨' },
    ],
    saveToContext: 'injuriesInvolved',
    nextStep: (input: string) =>
      input === 'emergency' ? 'AUTO_EMERGENCY' : 'AUTO_OTHER_VEHICLE',
  },

  AUTO_EMERGENCY: {
    id: 'AUTO_EMERGENCY',
    botMessage:
      "🙏 Je suis vraiment désolé. Avez-vous contacté le 15 (SAMU)?\nVotre sécurité est la priorité absolue. Je reste disponible dès que vous êtes en sécurité.",
    inputType: 'BUTTONS',
    options: [
      { label: 'Oui, secours contactés', value: 'yes', emoji: '✅' },
      { label: 'Je continue quand même', value: 'continue', emoji: '➡️' },
    ],
    nextStep: 'AUTO_OTHER_VEHICLE',
  },

  AUTO_OTHER_VEHICLE: {
    id: 'AUTO_OTHER_VEHICLE',
    botMessage: "🚙 L'accident implique-t-il un autre véhicule?",
    inputType: 'BUTTONS',
    options: [
      { label: 'Oui, collision avec autre véhicule', value: 'true', emoji: '🚙' },
      { label: 'Non, seul en cause', value: 'false', emoji: '🚗' },
      { label: 'Obstacle ou animal', value: 'obstacle', emoji: '🦔' },
    ],
    saveToContext: 'otherVehicleInvolved',
    nextStep: (input: string) => (input === 'true' ? 'AUTO_CONSTAT' : 'AUTO_AMOUNT'),
  },

  AUTO_CONSTAT: {
    id: 'AUTO_CONSTAT',
    botMessage: '📋 Avez-vous un constat amiable signé avec l\'autre conducteur?',
    inputType: 'BUTTONS',
    options: [
      { label: "Oui, j'ai le constat signé", value: 'true', emoji: '✅' },
      { label: 'Non, pas de constat', value: 'false', emoji: '❌' },
    ],
    saveToContext: 'hasConstat',
    nextStep: 'AUTO_AMOUNT',
  },

  AUTO_AMOUNT: {
    id: 'AUTO_AMOUNT',
    botMessage: '💰 Estimez-vous les dégâts à combien? (estimation approximative)',
    inputType: 'BUTTONS',
    options: [
      { label: 'Moins de 5 000 MAD', value: '< 5000', emoji: '💰' },
      { label: '5 000 – 20 000 MAD', value: '5000-20000', emoji: '💰' },
      { label: 'Plus de 20 000 MAD', value: '> 20000', emoji: '💰' },
      { label: 'Je ne sais pas encore', value: 'unknown', emoji: '❓' },
    ],
    saveToContext: 'estimatedAmount',
    nextStep: 'AUTO_DESCRIPTION',
  },

  AUTO_DESCRIPTION: {
    id: 'AUTO_DESCRIPTION',
    botMessage:
      '📝 Pouvez-vous décrire brièvement ce qui s\'est passé?\n(optionnel — quelques mots suffisent)',
    inputType: 'TEXT',
    placeholder: 'Ex: Collision arrière à un feu rouge...',
    saveToContext: 'description',
    nextStep: 'AUTO_DOCS_PHOTO',
  },

  AUTO_DOCS_PHOTO: {
    id: 'AUTO_DOCS_PHOTO',
    botMessage:
      "📎 Parfait! Passons aux documents.\nJ'ai besoin d'une **photo des dégâts** sur votre véhicule.",
    inputType: 'FILE_UPLOAD',
    uploadDocType: 'PHOTO_DEGATS',
    uploadRequired: false,
    nextStep: 'AUTO_DOCS_CONSTAT',
  },

  AUTO_DOCS_CONSTAT: {
    id: 'AUTO_DOCS_CONSTAT',
    skipIf: (ctx: ClaimContext) =>
      ctx.hasConstat === 'false' ||
      ctx.hasConstat === false ||
      ctx.otherVehicleInvolved === 'false' ||
      ctx.otherVehicleInvolved === false,
    botMessage: '📄 Envoyez le **constat amiable signé** (photo ou scan).',
    inputType: 'FILE_UPLOAD',
    uploadDocType: 'CONSTAT_AMIABLE',
    uploadRequired: false,
    nextStep: 'AUTO_DOCS_PERMIS',
  },

  AUTO_DOCS_PERMIS: {
    id: 'AUTO_DOCS_PERMIS',
    botMessage: '🪪 Votre **permis de conduire** (recto-verso).',
    inputType: 'FILE_UPLOAD',
    uploadDocType: 'PERMIS_CONDUIRE',
    uploadRequired: false,
    nextStep: 'AUTO_SUMMARY',
  },

  AUTO_SUMMARY: {
    id: 'AUTO_SUMMARY',
    botMessage: (ctx: ClaimContext) =>
      `📋 Voici le **récapitulatif** de votre déclaration, ${ctx.clientName ?? 'cher client'}:`,
    inputType: 'SUMMARY',
    nextStep: 'AUTO_CONFIRM',
  },

  AUTO_CONFIRM: {
    id: 'AUTO_CONFIRM',
    botMessage: '✅ Tout est correct? Voulez-vous soumettre votre déclaration?',
    inputType: 'BUTTONS',
    options: [
      { label: '✅ Confirmer et soumettre', value: 'confirm', emoji: '✅' },
      { label: '✏️ Modifier quelque chose', value: 'edit', emoji: '✏️' },
    ],
    nextStep: (input: string) => (input === 'confirm' ? 'DONE' : 'AUTO_DATE'),
  },
}
