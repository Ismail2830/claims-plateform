export type GreetingScenario =
  | 'FIRST_VISIT'
  | 'DOCS_PENDING'
  | 'CLAIM_APPROVED'
  | 'CLAIM_REJECTED'
  | 'CLAIM_IN_PROGRESS'
  | 'RETURNING_NO_CLAIMS'

export interface GreetingResult {
  scenario: GreetingScenario
  message: string
  subMessage?: string
  primaryButton: { label: string; emoji: string; href: string }
  secondaryButton: { label: string; emoji: string; href: string }
  sound: 'welcome' | 'alert' | 'success' | null
  widgetOpenByDefault: boolean
  badgeCount: number
}

export interface ClientClaimSummary {
  totalActive: number
  pendingDocsClaims: { claimNumber: string; claimId: string; missingDocs: number }[]
  recentlyApproved: { claimNumber: string; claimId: string }[]
  recentlyRejected: { claimNumber: string; claimId: string }[]
  inProgressClaims: { claimNumber: string; claimId: string; estimatedDays: number }[]
}

export function determineGreeting(
  clientFirstName: string,
  claims: ClientClaimSummary,
  isFirstVisit: boolean,
  hasNewUpdateSinceLastVisit: boolean,
): GreetingResult {
  const name = clientFirstName || 'Client'

  // 1. FIRST_VISIT
  if (isFirstVisit) {
    return {
      scenario: 'FIRST_VISIT',
      message: `Bonjour ${name}! 👋`,
      subMessage:
        "Bienvenue sur ISM Assurance. Je suis ISM Bot, votre assistant personnel. Comment puis-je vous aider?",
      primaryButton: { label: 'Déclarer un sinistre', emoji: '📋', href: '/dashboard/client/claims/new' },
      secondaryButton: { label: 'Voir mes dossiers', emoji: '📂', href: '/dashboard/client/claims' },
      sound: 'welcome',
      widgetOpenByDefault: true,
      badgeCount: 0,
    }
  }

  // 2. DOCS_PENDING
  if (claims.pendingDocsClaims.length > 0) {
    const first = claims.pendingDocsClaims[0]
    return {
      scenario: 'DOCS_PENDING',
      message: `Bonjour ${name}! ⚠️`,
      subMessage: `Votre dossier ${first.claimNumber} attend ${first.missingDocs} document(s) manquant(s). Sans eux, le traitement est bloqué.`,
      primaryButton: {
        label: 'Envoyer les documents',
        emoji: '📎',
        href: `/dashboard/client/claims/${first.claimId}?tab=documents`,
      },
      secondaryButton: {
        label: 'Quels documents?',
        emoji: '❓',
        href: `/dashboard/client/claims/${first.claimId}`,
      },
      sound: 'alert',
      widgetOpenByDefault: true,
      badgeCount: claims.pendingDocsClaims.length,
    }
  }

  // 3. CLAIM_APPROVED
  if (claims.recentlyApproved.length > 0 && hasNewUpdateSinceLastVisit) {
    const first = claims.recentlyApproved[0]
    return {
      scenario: 'CLAIM_APPROVED',
      message: `Bonne nouvelle ${name}! 🎉`,
      subMessage: `Votre dossier ${first.claimNumber} vient d'être approuvé. Le paiement est en cours de traitement.`,
      primaryButton: {
        label: 'Voir les détails',
        emoji: '✅',
        href: `/dashboard/client/claims/${first.claimId}`,
      },
      secondaryButton: {
        label: 'Déclarer un sinistre',
        emoji: '📋',
        href: '/dashboard/client/claims/new',
      },
      sound: 'success',
      widgetOpenByDefault: true,
      badgeCount: claims.recentlyApproved.length,
    }
  }

  // 4. CLAIM_REJECTED
  if (claims.recentlyRejected.length > 0 && hasNewUpdateSinceLastVisit) {
    const first = claims.recentlyRejected[0]
    return {
      scenario: 'CLAIM_REJECTED',
      message: `Bonjour ${name}`,
      subMessage: `Votre dossier ${first.claimNumber} a fait l'objet d'une décision. Consultez les détails pour plus d'informations.`,
      primaryButton: {
        label: 'Voir la décision',
        emoji: '📋',
        href: `/dashboard/client/claims/${first.claimId}`,
      },
      secondaryButton: {
        label: 'Contacter un conseiller',
        emoji: '💬',
        href: '/dashboard/client/messages',
      },
      sound: 'alert',
      widgetOpenByDefault: true,
      badgeCount: 1,
    }
  }

  // 5. CLAIM_IN_PROGRESS
  if (claims.inProgressClaims.length > 0) {
    const first = claims.inProgressClaims[0]
    return {
      scenario: 'CLAIM_IN_PROGRESS',
      message: `Bonjour ${name}! 👋`,
      subMessage: `Votre dossier ${first.claimNumber} est 🔄 en cours d'instruction. Délai estimé: encore ${first.estimatedDays} jours.`,
      primaryButton: {
        label: 'Voir mon dossier',
        emoji: '👁️',
        href: `/dashboard/client/claims/${first.claimId}`,
      },
      secondaryButton: {
        label: 'Nouveau sinistre',
        emoji: '📋',
        href: '/dashboard/client/claims/new',
      },
      sound: null,
      widgetOpenByDefault: false,
      badgeCount: 0,
    }
  }

  // 6. RETURNING_NO_CLAIMS (default)
  return {
    scenario: 'RETURNING_NO_CLAIMS',
    message: `Bonjour ${name}! 😊`,
    subMessage: "Tout va bien? Je suis disponible si vous avez besoin de moi.",
    primaryButton: {
      label: 'Déclarer un sinistre',
      emoji: '📋',
      href: '/dashboard/client/claims/new',
    },
    secondaryButton: {
      label: 'Mes dossiers',
      emoji: '📂',
      href: '/dashboard/client/claims',
    },
    sound: null,
    widgetOpenByDefault: false,
    badgeCount: 0,
  }
}
