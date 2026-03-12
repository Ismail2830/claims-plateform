import type { FlowStep, ClaimContext } from '../types'

export const healthFlow: Record<string, FlowStep> = {
  HEALTH_FOR_WHOM: {
    id: 'HEALTH_FOR_WHOM',
    botMessage: '👤 Pour qui est cette déclaration de soins?',
    inputType: 'BUTTONS',
    options: [
      { label: 'Pour moi', value: 'self', emoji: '👤' },
      { label: 'Mon conjoint(e)', value: 'spouse', emoji: '👫' },
      { label: 'Mon enfant', value: 'child', emoji: '👶' },
      { label: 'Autre bénéficiaire', value: 'other', emoji: '👥' },
    ],
    saveToContext: 'beneficiary',
    nextStep: 'HEALTH_CARE_TYPE',
  },

  HEALTH_CARE_TYPE: {
    id: 'HEALTH_CARE_TYPE',
    botMessage: '🏥 Quel type de soins souhaitez-vous déclarer?',
    inputType: 'BUTTONS',
    options: [
      { label: 'Hospitalisation', value: 'HOSPITAL', emoji: '🏥' },
      { label: 'Médicaments', value: 'PHARMACY', emoji: '💊' },
      { label: 'Dentaire', value: 'DENTAL', emoji: '🦷' },
      { label: 'Optique', value: 'OPTIC', emoji: '👓' },
      { label: 'Analyses / Imagerie', value: 'LAB', emoji: '🔬' },
      { label: 'Consultation', value: 'CONSULT', emoji: '👨‍⚕️' },
    ],
    saveToContext: 'careType',
    nextStep: 'HEALTH_DATE',
  },

  HEALTH_DATE: {
    id: 'HEALTH_DATE',
    botMessage: '📅 Quelle est la date des soins? (format: JJ/MM/AAAA)',
    inputType: 'DATE',
    placeholder: 'Ex: 10/03/2026',
    saveToContext: 'incidentDate',
    validate: (input: string) => {
      if (!input || input.trim().length < 4)
        return { valid: false, error: 'Veuillez saisir une date valide.' }
      return { valid: true }
    },
    nextStep: 'HEALTH_PAID',
  },

  HEALTH_PAID: {
    id: 'HEALTH_PAID',
    botMessage: '💳 La dépense est-elle déjà payée?',
    inputType: 'BUTTONS',
    options: [
      { label: "Oui, j'ai avancé les frais", value: 'paid', emoji: '💳' },
      { label: 'Non, je veux une prise en charge directe', value: 'direct', emoji: '🏦' },
    ],
    saveToContext: 'paymentStatus',
    nextStep: (input: string) => (input === 'paid' ? 'HEALTH_AMOUNT' : 'HEALTH_DOCS'),
  },

  HEALTH_AMOUNT: {
    id: 'HEALTH_AMOUNT',
    botMessage: '💰 Quel montant avez-vous avancé? (en MAD)',
    inputType: 'AMOUNT',
    placeholder: 'Ex: 1500',
    saveToContext: 'estimatedAmount',
    validate: (input: string) => {
      const n = parseFloat(input.replace(/[^\d.,]/g, '').replace(',', '.'))
      if (isNaN(n) || n <= 0)
        return { valid: false, error: 'Veuillez saisir un montant valide en MAD.' }
      return { valid: true }
    },
    nextStep: 'HEALTH_DOCS',
  },

  HEALTH_DOCS: {
    id: 'HEALTH_DOCS',
    botMessage: '📎 Passons aux documents.\nJ\'ai besoin de la **facture** ou note d\'honoraires.',
    inputType: 'FILE_UPLOAD',
    uploadDocType: 'FACTURE',
    uploadRequired: true,
    nextStep: 'HEALTH_DOCS_ORDONNANCE',
  },

  HEALTH_DOCS_ORDONNANCE: {
    id: 'HEALTH_DOCS_ORDONNANCE',
    skipIf: (ctx: ClaimContext) =>
      ctx.careType !== 'PHARMACY' && ctx.careType !== 'HOSPITAL',
    botMessage: '💊 Envoyez l\'**ordonnance médicale** correspondante.',
    inputType: 'FILE_UPLOAD',
    uploadDocType: 'ORDONNANCE',
    uploadRequired: true,
    nextStep: 'HEALTH_DOCS_RAPPORT',
  },

  HEALTH_DOCS_RAPPORT: {
    id: 'HEALTH_DOCS_RAPPORT',
    skipIf: (ctx: ClaimContext) => ctx.careType !== 'HOSPITAL',
    botMessage: '🏥 Envoyez le **rapport médical** ou compte rendu d\'hospitalisation.',
    inputType: 'FILE_UPLOAD',
    uploadDocType: 'RAPPORT_MEDICAL',
    uploadRequired: true,
    nextStep: 'HEALTH_DOCS_RIB',
  },

  HEALTH_DOCS_RIB: {
    id: 'HEALTH_DOCS_RIB',
    skipIf: (ctx: ClaimContext) => ctx.paymentStatus !== 'paid',
    botMessage:
      '🏦 Pour le remboursement, envoyez votre **RIB bancaire** (Relevé d\'Identité Bancaire).',
    inputType: 'FILE_UPLOAD',
    uploadDocType: 'RIB',
    uploadRequired: true,
    nextStep: 'HEALTH_SUMMARY',
  },

  HEALTH_SUMMARY: {
    id: 'HEALTH_SUMMARY',
    botMessage: (ctx: ClaimContext) =>
      `📋 Voici le **récapitulatif** de votre déclaration, ${ctx.clientName ?? 'cher client'}:`,
    inputType: 'SUMMARY',
    nextStep: 'HEALTH_CONFIRM',
  },

  HEALTH_CONFIRM: {
    id: 'HEALTH_CONFIRM',
    botMessage: '✅ Tout est correct? Voulez-vous soumettre votre déclaration?',
    inputType: 'BUTTONS',
    options: [
      { label: '✅ Confirmer et soumettre', value: 'confirm', emoji: '✅' },
      { label: '✏️ Modifier quelque chose', value: 'edit', emoji: '✏️' },
    ],
    nextStep: (input: string) => (input === 'confirm' ? 'DONE' : 'HEALTH_FOR_WHOM'),
  },
}
