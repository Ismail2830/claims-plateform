import type { FlowStep } from '../types'

export const vieFlow: Record<string, FlowStep> = {
  VIE_EVENT_TYPE: {
    id: 'VIE_EVENT_TYPE',
    botMessage:
      "👤 Quel type de sinistre souhaitez-vous déclarer pour votre assurance vie?\n\n" +
      "*(Tous les dossiers vie sont traités par un conseiller spécialisé)*",
    inputType: 'BUTTONS',
    options: [
      { label: 'Décès', value: 'DECES', emoji: '🕊️' },
      { label: 'Invalidité', value: 'INVALIDITE', emoji: '🏥' },
      { label: 'Accident corporel', value: 'ACCIDENT', emoji: '🩹' },
      { label: 'Maladie grave', value: 'MALADIE', emoji: '💊' },
    ],
    saveToContext: 'damageType',
    nextStep: 'VIE_BENEFICIARY',
  },

  VIE_BENEFICIARY: {
    id: 'VIE_BENEFICIARY',
    botMessage: (ctx) => {
      const type = ctx.damageType as string | undefined
      if (type === 'DECES') {
        return '👥 Quel est votre lien avec l\'assuré décédé?\n(Ex: conjoint, enfant, parent)'
      }
      return '👤 La déclaration est-elle pour vous-même ou pour un bénéficiaire?'
    },
    inputType: 'BUTTONS',
    options: (ctx) => {
      const type = ctx.damageType as string | undefined
      if (type === 'DECES') {
        return [
          { label: 'Conjoint(e)', value: 'conjoint', emoji: '💑' },
          { label: 'Enfant', value: 'enfant', emoji: '👶' },
          { label: 'Parent', value: 'parent', emoji: '👨‍👩‍👦' },
          { label: 'Autre bénéficiaire', value: 'autre', emoji: '👤' },
        ]
      }
      return [
        { label: 'Pour moi-même', value: 'moi-meme', emoji: '👤' },
        { label: 'Pour un bénéficiaire', value: 'beneficiaire', emoji: '👥' },
      ]
    },
    saveToContext: 'beneficiary',
    nextStep: 'VIE_DATE',
  },

  VIE_DATE: {
    id: 'VIE_DATE',
    botMessage: '📅 Quelle est la date de l\'événement? (format: JJ/MM/AAAA)',
    inputType: 'DATE',
    placeholder: 'Ex: 01/03/2026',
    validate: (input: string) => {
      if (!input || input.trim().length < 4)
        return { valid: false, error: 'Veuillez saisir une date valide.' }
      return { valid: true }
    },
    saveToContext: 'incidentDate',
    nextStep: 'VIE_DESCRIPTION',
  },

  VIE_DESCRIPTION: {
    id: 'VIE_DESCRIPTION',
    botMessage:
      '📝 Décrivez brièvement la situation.\n' +
      '*(Un conseiller ISM reviendra vers vous dans les 24h avec la liste des documents requis)*',
    inputType: 'TEXT',
    placeholder: 'Ex: Mon père est décédé le 01/03/2026 suite à un accident...',
    validate: (input: string) => {
      if (!input || input.trim().length < 10)
        return { valid: false, error: 'Veuillez fournir une description de la situation.' }
      return { valid: true }
    },
    saveToContext: 'description',
    nextStep: 'VIE_DOCS_IDENTITE',
  },

  VIE_DOCS_IDENTITE: {
    id: 'VIE_DOCS_IDENTITE',
    botMessage: '📄 Veuillez joindre une copie de votre **pièce d\'identité** (CIN ou passeport)',
    inputType: 'FILE_UPLOAD',
    uploadDocType: 'PIECE_IDENTITE',
    uploadRequired: true,
    nextStep: 'VIE_SUMMARY',
  },

  VIE_SUMMARY: {
    id: 'VIE_SUMMARY',
    botMessage: (ctx) =>
      `📋 Voici le résumé de votre déclaration:\n\n` +
      `• **Type**: ${ctx.damageType ?? '—'}\n` +
      `• **Date**: ${ctx.incidentDate ?? '—'}\n` +
      `• **Bénéficiaire**: ${ctx.beneficiary ?? '—'}\n\n` +
      `Un conseiller spécialisé vous contactera dans les **24 à 48 heures** ouvrable.`,
    inputType: 'SUMMARY',
    nextStep: 'VIE_CONFIRM',
  },

  VIE_CONFIRM: {
    id: 'VIE_CONFIRM',
    botMessage: '✅ Confirmez-vous cette déclaration?',
    inputType: 'BUTTONS',
    options: [
      { label: 'Confirmer', value: 'CONFIRM', emoji: '✅' },
      { label: 'Modifier', value: 'EDIT', emoji: '✏️' },
    ],
    nextStep: (input: string) => (input === 'CONFIRM' ? 'DONE' : 'VIE_EVENT_TYPE'),
  },
}
