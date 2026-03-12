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

export const homeFlow: Record<string, FlowStep> = {
  HOME_DAMAGE_TYPE: {
    id: 'HOME_DAMAGE_TYPE',
    botMessage: '🏠 Quel type de dégât avez-vous subi?',
    inputType: 'BUTTONS',
    options: [
      { label: 'Dégât des eaux', value: 'WATER', emoji: '💧' },
      { label: 'Incendie', value: 'FIRE', emoji: '🔥' },
      { label: 'Intempéries', value: 'WEATHER', emoji: '🌪️' },
      { label: 'Cambriolage', value: 'BURGLARY', emoji: '🔓' },
      { label: 'Bris de glace', value: 'GLASS', emoji: '🪟' },
      { label: 'Autre', value: 'OTHER', emoji: '❓' },
    ],
    saveToContext: 'damageType',
    nextStep: 'HOME_DATE',
  },

  HOME_DATE: {
    id: 'HOME_DATE',
    botMessage: '📅 Quand le sinistre s\'est-il produit?',
    inputType: 'BUTTONS',
    options: () => [
      { label: "Aujourd'hui", value: todayISO(), emoji: '📅' },
      { label: 'Hier', value: yesterdayISO(), emoji: '📅' },
      { label: 'Autre date', value: 'CUSTOM', emoji: '🗓️' },
    ],
    saveToContext: 'incidentDate',
    nextStep: (input: string) => (input === 'CUSTOM' ? 'HOME_DATE_CUSTOM' : 'HOME_HABITABLE'),
  },

  HOME_DATE_CUSTOM: {
    id: 'HOME_DATE_CUSTOM',
    botMessage: '📅 Veuillez saisir la date du sinistre (format: JJ/MM/AAAA)',
    inputType: 'DATE',
    placeholder: 'Ex: 10/03/2026',
    saveToContext: 'incidentDate',
    validate: (input: string) => {
      if (!input || input.trim().length < 4)
        return { valid: false, error: 'Veuillez saisir une date valide.' }
      return { valid: true }
    },
    nextStep: 'HOME_HABITABLE',
  },

  HOME_HABITABLE: {
    id: 'HOME_HABITABLE',
    botMessage: '🏠 Le logement est-il encore habitable?',
    inputType: 'BUTTONS',
    options: [
      { label: 'Oui, habitable', value: 'true', emoji: '🏠' },
      { label: 'Non, inhabitable', value: 'false', emoji: '⚠️' },
    ],
    saveToContext: 'propertyHabitable',
    nextStep: (input: string) =>
      input === 'false' ? 'HOME_EMERGENCY_HOUSING' : 'HOME_POLICE',
  },

  HOME_EMERGENCY_HOUSING: {
    id: 'HOME_EMERGENCY_HOUSING',
    botMessage:
      '🏨 Je comprends, c\'est une situation difficile. Avez-vous besoin d\'une prise en charge hébergement d\'urgence? Notre équipe peut vous aider rapidement.',
    inputType: 'BUTTONS',
    options: [
      { label: "Oui, j'ai besoin d'aide", value: 'true', emoji: '🏨' },
      { label: "Non, j'ai une solution", value: 'false', emoji: '✅' },
    ],
    saveToContext: 'needsEmergencyHousing',
    nextStep: 'HOME_POLICE',
  },

  HOME_POLICE: {
    id: 'HOME_POLICE',
    skipIf: (ctx: ClaimContext) => ctx.damageType !== 'BURGLARY',
    botMessage: '📋 Avez-vous déposé une main courante ou une plainte?',
    inputType: 'BUTTONS',
    options: [
      { label: "Oui, j'ai le numéro", value: 'true', emoji: '📋' },
      { label: 'Pas encore', value: 'false', emoji: '❌' },
    ],
    saveToContext: 'hasPoliceReport',
    nextStep: 'HOME_AMOUNT',
  },

  HOME_AMOUNT: {
    id: 'HOME_AMOUNT',
    botMessage: '💰 Estimez-vous les dégâts à combien? (estimation approximative)',
    inputType: 'BUTTONS',
    options: [
      { label: 'Moins de 5 000 MAD', value: '< 5000', emoji: '💰' },
      { label: '5 000 – 20 000 MAD', value: '5000-20000', emoji: '💰' },
      { label: 'Plus de 20 000 MAD', value: '> 20000', emoji: '💰' },
      { label: 'Je ne sais pas encore', value: 'unknown', emoji: '❓' },
    ],
    saveToContext: 'estimatedAmount',
    nextStep: 'HOME_DESCRIPTION',
  },

  HOME_DESCRIPTION: {
    id: 'HOME_DESCRIPTION',
    botMessage: '📝 Décrivez brièvement les dégâts constatés (optionnel)',
    inputType: 'TEXT',
    placeholder: 'Ex: Fuite d\'eau du plafond causant des dégâts au salon...',
    saveToContext: 'description',
    nextStep: 'HOME_DOCS_PHOTO',
  },

  HOME_DOCS_PHOTO: {
    id: 'HOME_DOCS_PHOTO',
    botMessage: '📎 Passons aux documents.\nJ\'ai besoin de **photos des dégâts** causés au logement.',
    inputType: 'FILE_UPLOAD',
    uploadDocType: 'PHOTO_DEGATS',
    uploadRequired: false,
    nextStep: 'HOME_DOCS_DEVIS',
  },

  HOME_DOCS_DEVIS: {
    id: 'HOME_DOCS_DEVIS',
    botMessage: '🔧 Avez-vous un **devis de réparation**? (optionnel mais recommandé)',
    inputType: 'FILE_UPLOAD',
    uploadDocType: 'DEVIS_REPARATION',
    uploadRequired: false,
    nextStep: 'HOME_DOCS_MAINC',
  },

  HOME_DOCS_MAINC: {
    id: 'HOME_DOCS_MAINC',
    skipIf: (ctx: ClaimContext) => ctx.damageType !== 'BURGLARY',
    botMessage: '📋 Envoyez la **main courante ou copie de plainte** déposée.',
    inputType: 'FILE_UPLOAD',
    uploadDocType: 'MAIN_COURANTE',
    uploadRequired: false,
    nextStep: 'HOME_SUMMARY',
  },

  HOME_SUMMARY: {
    id: 'HOME_SUMMARY',
    botMessage: (ctx: ClaimContext) =>
      `📋 Voici le **récapitulatif** de votre déclaration, ${ctx.clientName ?? 'cher client'}:`,
    inputType: 'SUMMARY',
    nextStep: 'HOME_CONFIRM',
  },

  HOME_CONFIRM: {
    id: 'HOME_CONFIRM',
    botMessage: '✅ Tout est correct? Voulez-vous soumettre votre déclaration?',
    inputType: 'BUTTONS',
    options: [
      { label: '✅ Confirmer et soumettre', value: 'confirm', emoji: '✅' },
      { label: '✏️ Modifier quelque chose', value: 'edit', emoji: '✏️' },
    ],
    nextStep: (input: string) => (input === 'confirm' ? 'DONE' : 'HOME_DAMAGE_TYPE'),
  },
}
