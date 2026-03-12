import { prisma } from '@/app/lib/prisma'
import type { BotResponse, ClaimContext, FlowStep } from './types'
import { autoFlow } from './flows/auto-flow'
import { homeFlow } from './flows/home-flow'
import { healthFlow } from './flows/health-flow'
import { vieFlow } from './flows/vie-flow'

// ─── Flow registry ────────────────────────────────────────────────────────────

const flows: Record<string, Record<string, FlowStep>> = {
  AUTO: autoFlow,
  HABITATION: homeFlow,
  SANTE: healthFlow,
  VIE: vieFlow,
}

// First step per claim type
const firstSteps: Record<string, string> = {
  AUTO: 'AUTO_DATE',
  HABITATION: 'HOME_DAMAGE_TYPE',
  SANTE: 'HEALTH_FOR_WHOM',
  VIE: 'VIE_EVENT_TYPE',
}

// SLA days per claim type (business days)
function getSLADays(claimType: string): number {
  switch (claimType) {
    case 'AUTO': return 10
    case 'HABITATION': return 15
    case 'SANTE': return 5
    case 'VIE': return 30
    default: return 14
  }
}

// Map chatbot claimType to Prisma ClaimType enum
function mapClaimType(chatType: string, context: ClaimContext): string {
  switch (chatType) {
    case 'AUTO': return 'ACCIDENT'
    case 'HABITATION': {
      const dt = context.damageType
      if (dt === 'FIRE') return 'FIRE'
      if (dt === 'WATER') return 'WATER_DAMAGE'
      if (dt === 'BURGLARY') return 'THEFT'
      return 'ACCIDENT'
    }
    case 'SANTE': return 'ACCIDENT'
    case 'VIE': return 'ACCIDENT'
    default: return 'ACCIDENT'
  }
}

// Parse estimated amount string to float
function parseAmount(raw: string | undefined): number | null {
  if (!raw || raw === 'unknown') return null
  // Patterns: "< 5000", "5000-20000", "> 20000", "1500"
  if (raw.startsWith('<')) return parseFloat(raw.replace(/[^\d]/g, '')) * 0.5
  if (raw.startsWith('>')) return parseFloat(raw.replace(/[^\d]/g, '')) * 1.2
  const match = raw.match(/[\d]+/)
  if (match) return parseFloat(match[0])
  const n = parseFloat(raw.replace(/[^\d.,]/g, '').replace(',', '.'))
  return isNaN(n) ? null : n
}

// Map upload docType string to Prisma DocumentType enum
function mapDocType(uploadDocType: string): string {
  const map: Record<string, string> = {
    PHOTO_DEGATS: 'PHOTO',
    CONSTAT_AMIABLE: 'CONSTAT',
    PERMIS_CONDUIRE: 'DRIVERS_LICENSE',
    DEVIS_REPARATION: 'ESTIMATE',
    MAIN_COURANTE: 'POLICE_REPORT',
    FACTURE: 'INVOICE',
    ORDONNANCE: 'PRESCRIPTION',
    RAPPORT_MEDICAL: 'MEDICAL_REPORT',
    RIB: 'BANK_DETAILS',
    PIECE_IDENTITE: 'IDENTITY_DOCUMENT',
  }
  return map[uploadDocType] ?? 'OTHER'
}

// Resolve a step's options (static array or function)
function resolveOptions(
  step: FlowStep,
  ctx: ClaimContext,
): { label: string; value: string; emoji: string }[] | undefined {
  if (!step.options) return undefined
  if (typeof step.options === 'function') return step.options(ctx)
  return step.options
}

// Resolve a step's botMessage
function resolveMessage(step: FlowStep, ctx: ClaimContext): string {
  if (typeof step.botMessage === 'function') return step.botMessage(ctx)
  return step.botMessage
}

// Walk steps forward, skipping any where skipIf(ctx) === true
function getNextNonSkipped(
  nextId: string,
  flow: Record<string, FlowStep>,
  ctx: ClaimContext,
): string {
  let id = nextId
  for (let i = 0; i < 20; i++) {
    if (id === 'DONE') return 'DONE'
    const s = flow[id]
    if (!s) return id
    if (s.skipIf && s.skipIf(ctx)) {
      id = typeof s.nextStep === 'function' ? s.nextStep('', ctx) : s.nextStep
      continue
    }
    return id
  }
  return id
}

// Build a BotResponse from a resolved step
function buildResponse(
  step: FlowStep,
  ctx: ClaimContext,
  extra?: Partial<BotResponse>,
): BotResponse {
  return {
    message: resolveMessage(step, ctx),
    inputType: step.inputType,
    options: resolveOptions(step, ctx),
    placeholder: step.placeholder,
    uploadDocType: step.uploadDocType,
    uploadRequired: step.uploadRequired,
    ...extra,
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function startSession(clientId: string): Promise<{
  sessionId: string
  response: BotResponse
}> {
  const client = await prisma.client.findUnique({
    where: { clientId },
    select: { firstName: true },
  })

  const session = await prisma.chatSession.create({
    data: {
      clientId,
      status: 'ACTIVE',
      currentStep: 'START',
      context: {},
      declarationMethod: 'CHATBOT',
      language: 'fr',
    },
  })

  const welcomeMessage =
    `Bonjour ${client?.firstName ?? 'cher client'}! 👋\n` +
    `Je suis **ISM Bot**, votre assistant ISM.\n` +
    `Je vais vous guider pour déclarer votre sinistre en quelques minutes.\n\n` +
    `Quel type de problème avez-vous?`

  await prisma.chatMessage.create({
    data: {
      sessionId: session.id,
      role: 'BOT',
      content: welcomeMessage,
      metadata: {
        type: 'BUTTONS',
        options: [
          { label: 'Accident automobile', value: 'AUTO', emoji: '🚗' },
          { label: 'Dégât habitation', value: 'HABITATION', emoji: '🏠' },
          { label: 'Soins médicaux', value: 'SANTE', emoji: '🏥' },
          { label: 'Assurance vie', value: 'VIE', emoji: '👤' },
        ],
      },
    },
  })

  return {
    sessionId: session.id,
    response: {
      message: welcomeMessage,
      inputType: 'BUTTONS',
      options: [
        { label: 'Accident automobile', value: 'AUTO', emoji: '🚗' },
        { label: 'Dégât habitation', value: 'HABITATION', emoji: '🏠' },
        { label: 'Soins médicaux', value: 'SANTE', emoji: '🏥' },
        { label: 'Assurance vie', value: 'VIE', emoji: '👤' },
      ],
    },
  }
}

export async function processMessage(
  sessionId: string,
  userInput: string,
): Promise<BotResponse> {
  const session = await prisma.chatSession.findUnique({
    where: { id: sessionId },
  })

  if (!session) {
    return { message: 'Session introuvable.', inputType: 'TEXT', error: 'SESSION_NOT_FOUND' }
  }

  const ctx = (session.context ?? {}) as ClaimContext
  if (!ctx.uploadedDocs) ctx.uploadedDocs = []

  // Save user message
  await prisma.chatMessage.create({
    data: { sessionId, role: 'USER', content: userInput },
  })

  // ── STEP: START — user selected claim type ────────────────────────────────
  if (session.currentStep === 'START') {
    if (!['AUTO', 'HABITATION', 'SANTE', 'VIE'].includes(userInput)) {
      return {
        message: "Désolé, je n'ai pas compris votre choix. Veuillez sélectionner l'un des types de sinistre.",
        inputType: 'BUTTONS',
        options: [
          { label: 'Accident automobile', value: 'AUTO', emoji: '🚗' },
          { label: 'Dégât habitation', value: 'HABITATION', emoji: '🏠' },
          { label: 'Soins médicaux', value: 'SANTE', emoji: '🏥' },
          { label: 'Assurance vie', value: 'VIE', emoji: '👤' },
        ],
      }
    }

    if (userInput === 'VIE') {
      // VIE: now handled by the dedicated vieFlow, same as other types
    }

    const newCtx: ClaimContext = { ...ctx, claimType: userInput as ClaimContext['claimType'] }
    const flow = flows[userInput]
    const firstStep = firstSteps[userInput] ?? 'DONE'
    const resolvedFirst = getNextNonSkipped(firstStep, flow, newCtx)
    const step = flow[resolvedFirst]

    if (!step) {
      return { message: "Une erreur est survenue. Veuillez réessayer.", inputType: 'TEXT', error: 'STEP_NOT_FOUND' }
    }

    await prisma.chatSession.update({
      where: { id: sessionId },
      data: {
        currentStep: resolvedFirst,
        claimType: userInput,
        context: newCtx as object,
      },
    })

    const response = buildResponse(step, newCtx)
    await prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'BOT',
        content: response.message,
        metadata: {
          type: step.inputType,
          options: response.options ?? null,
          uploadDocType: response.uploadDocType ?? null,
          hasSummary: !!response.summary,
        } as object,
      },
    })
    return response
  }

  // ── Regular flow step ──────────────────────────────────────────────────────
  const claimType = (ctx.claimType ?? session.claimType) as string
  const flow = flows[claimType]
  if (!flow) {
    return { message: 'Flux introuvable. Veuillez recommencer.', inputType: 'TEXT', error: 'FLOW_NOT_FOUND' }
  }

  const currentStepDef = flow[session.currentStep]
  if (!currentStepDef) {
    return { message: "Cette étape est introuvable. Veuillez recommencer.", inputType: 'TEXT', error: 'STEP_NOT_FOUND' }
  }

  // Validate input if validator exists
  if (currentStepDef.validate) {
    const result = currentStepDef.validate(userInput)
    if (!result.valid) {
      return {
        message: result.error ?? 'Saisie invalide. Veuillez réessayer.',
        inputType: currentStepDef.inputType,
        options: resolveOptions(currentStepDef, ctx),
        placeholder: currentStepDef.placeholder,
        error: 'VALIDATION_ERROR',
      }
    }
  }

  // Save to context
  let newCtx = { ...ctx }
  if (currentStepDef.saveToContext) {
    newCtx = { ...newCtx, [currentStepDef.saveToContext]: userInput }
  }

  // Determine next step
  const rawNext =
    typeof currentStepDef.nextStep === 'function'
      ? currentStepDef.nextStep(userInput, newCtx)
      : currentStepDef.nextStep

  const nextStepId = getNextNonSkipped(rawNext, flow, newCtx)

  // If DONE: create claim
  if (nextStepId === 'DONE') {
    const created = await createClaimFromContext(session.id, session.clientId, newCtx)
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: {
        currentStep: 'DONE',
        status: 'COMPLETED',
        completedAt: new Date(),
        createdClaimId: created.claimId,
        context: newCtx as object,
      },
    })
    const msg =
      `🎉 Votre dossier a été créé avec succès!\n\n` +
      `Numéro: **${created.claimNumber}**\n` +
      `Délai de traitement estimé: **${created.estimatedDays} jours ouvrables**`
    await prisma.chatMessage.create({ data: { sessionId, role: 'BOT', content: msg } })
    return {
      message: msg,
      inputType: 'BUTTONS',
      claimCreated: created,
      isComplete: true,
      options: [
        { label: '👁️ Suivre mon dossier', value: `view:${created.claimId}`, emoji: '👁️' },
        { label: '🏠 Tableau de bord', value: 'dashboard', emoji: '🏠' },
      ],
    }
  }

  const nextStep = flow[nextStepId]
  if (!nextStep) {
    return { message: "Étape suivante introuvable.", inputType: 'TEXT', error: 'NEXT_STEP_NOT_FOUND' }
  }

  // Update session
  await prisma.chatSession.update({
    where: { id: sessionId },
    data: { currentStep: nextStepId, context: newCtx as object },
  })

  // Append SUMMARY data if needed
  let extra: Partial<BotResponse> = {}
  if (nextStep.inputType === 'SUMMARY') {
    extra.summary = {
      claimType: claimType,
      incidentDate: newCtx.incidentDate,
      incidentLocation: newCtx.incidentLocation,
      estimatedAmount: newCtx.estimatedAmount,
      description: newCtx.description,
      damageType: newCtx.damageType as string | undefined,
      beneficiary: newCtx.beneficiary as string | undefined,
      careType: newCtx.careType,
      docsCount: newCtx.uploadedDocs.length,
    }
  }

  const response = buildResponse(nextStep, newCtx, extra)
  await prisma.chatMessage.create({
    data: {
      sessionId,
      role: 'BOT',
      content: response.message,
      metadata: {
        type: nextStep.inputType,
        options: response.options ?? null,
        uploadDocType: response.uploadDocType ?? null,
        hasSummary: !!response.summary,
      } as object,
    },
  })

  return response
}

export async function processFileUpload(
  sessionId: string,
  filePath: string,
  docType: string,
  fileMeta?: {
    fileName: string
    originalName: string
    mimeType: string
    fileSize: number
  },
): Promise<BotResponse> {
  const session = await prisma.chatSession.findUnique({ where: { id: sessionId } })
  if (!session) {
    return { message: 'Session introuvable.', inputType: 'TEXT', error: 'SESSION_NOT_FOUND' }
  }

  const ctx = (session.context ?? {}) as ClaimContext
  if (!ctx.uploadedDocs) ctx.uploadedDocs = []

  // Track the uploaded doc type and full metadata for later claim creation
  const newCtx: ClaimContext = {
    ...ctx,
    uploadedDocs: [...ctx.uploadedDocs, docType],
    [`doc_${docType}`]: filePath,
    ...(fileMeta ? {
      [`docMeta_${docType}`]: {
        fileName: fileMeta.fileName,
        originalName: fileMeta.originalName,
        mimeType: fileMeta.mimeType,
        fileSize: fileMeta.fileSize,
        filePath,
      },
    } : {}),
  }

  // Advance to next step (same logic as processMessage with a "skip")
  const claimType = (ctx.claimType ?? session.claimType) as string
  const flow = flows[claimType]
  if (!flow) {
    return { message: 'Flux introuvable.', inputType: 'TEXT', error: 'FLOW_NOT_FOUND' }
  }

  const currentStepDef = flow[session.currentStep]
  if (!currentStepDef) {
    return { message: 'Étape introuvable.', inputType: 'TEXT', error: 'STEP_NOT_FOUND' }
  }

  const rawNext =
    typeof currentStepDef.nextStep === 'function'
      ? currentStepDef.nextStep('uploaded', newCtx)
      : currentStepDef.nextStep
  const nextStepId = getNextNonSkipped(rawNext, flow, newCtx)

  await prisma.chatMessage.create({
    data: {
      sessionId,
      role: 'USER',
      content: `[Document: ${docType}]`,
      metadata: { type: 'FILE_UPLOAD', docType, filePath } as object,
    },
  })

  if (nextStepId === 'DONE') {
    const created = await createClaimFromContext(session.id, session.clientId, newCtx)
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: {
        currentStep: 'DONE',
        status: 'COMPLETED',
        completedAt: new Date(),
        createdClaimId: created.claimId,
        context: newCtx as object,
      },
    })
    const msg =
      `🎉 Votre dossier a été créé avec succès!\n\nNuméro: **${created.claimNumber}**\nDélai estimé: **${created.estimatedDays} jours**`
    await prisma.chatMessage.create({ data: { sessionId, role: 'BOT', content: msg } })
    return { message: msg, inputType: 'BUTTONS', claimCreated: created, isComplete: true }
  }

  const nextStep = flow[nextStepId]
  if (!nextStep) {
    return { message: 'Étape suivante introuvable.', inputType: 'TEXT', error: 'NEXT_STEP_NOT_FOUND' }
  }

  await prisma.chatSession.update({
    where: { id: sessionId },
    data: { currentStep: nextStepId, context: newCtx as object },
  })

  let extra: Partial<BotResponse> = {}
  if (nextStep.inputType === 'SUMMARY') {
    extra.summary = {
      claimType,
      incidentDate: newCtx.incidentDate,
      incidentLocation: newCtx.incidentLocation,
      estimatedAmount: newCtx.estimatedAmount,
      description: newCtx.description,
      damageType: newCtx.damageType as string | undefined,
      beneficiary: newCtx.beneficiary as string | undefined,
      careType: newCtx.careType,
      docsCount: newCtx.uploadedDocs.length,
    }
  }

  const response = buildResponse(nextStep, newCtx, extra)
  await prisma.chatMessage.create({
    data: {
      sessionId,
      role: 'BOT',
      content: response.message,
      metadata: {
        type: nextStep.inputType,
        options: response.options ?? null,
        uploadDocType: response.uploadDocType ?? null,
        hasSummary: !!response.summary,
      } as object,
    },
  })
  return response
}

// ─── Internal: create claim from session context ──────────────────────────────

async function createClaimFromContext(
  sessionId: string,
  clientId: string,
  context: ClaimContext,
): Promise<{ claimId: string; claimNumber: string; estimatedDays: number }> {
  const claimType = context.claimType ?? 'AUTO'
  const prismaClaimType = mapClaimType(claimType, context)

  const claimNumber = `CLM-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`

  // Parse incident date
  let incidentDate = new Date()
  if (context.incidentDate) {
    const raw = context.incidentDate
    // Try ISO first, then DD/MM/YYYY
    const d = new Date(raw)
    if (!isNaN(d.getTime())) {
      incidentDate = d
    } else {
      const parts = raw.split('/')
      if (parts.length === 3) {
        incidentDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`)
      }
    }
  }

  // Try to find first active policy of matching type for this client
  const policyTypeMap: Record<string, string[]> = {
    AUTO: ['AUTO'],
    HABITATION: ['HOME'],
    SANTE: ['HEALTH'],
    VIE: ['LIFE'],
  }
  const matchingTypes = policyTypeMap[claimType] ?? []
  const policy = await prisma.policy.findFirst({
    where: {
      clientId,
      status: 'ACTIVE',
      ...(matchingTypes.length > 0 ? { policyType: { in: matchingTypes as ('AUTO' | 'HOME' | 'HEALTH' | 'LIFE')[] } } : {}),
    },
    select: { policyId: true },
  })

  const claim = await prisma.$transaction(async (tx) => {
    const newClaim = await tx.claim.create({
      data: {
        claimNumber,
        clientId,
        policyId: policy?.policyId ?? null,
        claimType: prismaClaimType as 'ACCIDENT' | 'THEFT' | 'FIRE' | 'WATER_DAMAGE',
        incidentDate,
        declarationDate: new Date(),
        incidentLocation: context.incidentLocation ?? '',
        description: context.description ?? `Déclaration via assistant IA — type: ${claimType}`,
        claimedAmount: parseAmount(context.estimatedAmount) ?? null,
        estimatedAmount: parseAmount(context.estimatedAmount) ?? null,
        status: 'DECLARED',
        priority: 'NORMAL',
        declarationChannel: 'WEB',
        source: 'WEB',
        declarationMethod: 'CHATBOT',
        chatSessionId: sessionId,
      },
    })

    // Create ClaimDocument records for docs uploaded during the chat session
    const uploadedDocs: string[] = (context.uploadedDocs as string[]) ?? []
    for (const docType of uploadedDocs) {
      const meta = (context[`docMeta_${docType}`] ?? null) as {
        fileName: string
        originalName: string
        mimeType: string
        fileSize: number
        filePath: string
      } | null
      if (!meta) continue
      await tx.claimDocument.create({
        data: {
          claimId: newClaim.claimId,
          fileName: meta.fileName,
          originalName: meta.originalName,
          fileType: mapDocType(docType) as 'PHOTO' | 'PDF' | 'INVOICE' | 'ESTIMATE' | 'POLICE_REPORT' | 'MEDICAL_REPORT' | 'IDENTITY_DOCUMENT' | 'INSURANCE_CERTIFICATE' | 'OTHER' | 'CONSTAT' | 'EXPERTISE_REPORT' | 'DEATH_CERTIFICATE' | 'HOSPITAL_BILL' | 'PRESCRIPTION' | 'VEHICLE_REGISTRATION' | 'DRIVERS_LICENSE' | 'BANK_DETAILS' | 'LEGAL_DOCUMENT',
          mimeType: meta.mimeType.slice(0, 100),
          fileSize: meta.fileSize,
          filePath: meta.filePath.slice(0, 500),
          uploadedByClient: clientId,
          status: 'UPLOADED',
          uploadedVia: 'WEB',
          description: `Chatbot upload: ${docType}`,
        },
      }).catch(() => { /* non-blocking */ })
    }

    await tx.claimStatusHistory.create({
      data: {
        claimId: newClaim.claimId,
        fromStatus: null,
        toStatus: 'DECLARED',
        isSystemGenerated: true,
        notes: 'Dossier créé via assistant IA (chatbot)',
      },
    })

    return newClaim
  })

  return {
    claimId: claim.claimId,
    claimNumber: claim.claimNumber,
    estimatedDays: getSLADays(claimType),
  }
}

// ─── Get claim status for session ─────────────────────────────────────────────

export async function getClaimStatus(sessionId: string) {
  const session = await prisma.chatSession.findUnique({ where: { id: sessionId } })
  if (!session?.createdClaimId) return null

  const claim = await prisma.claim.findUnique({
    where: { claimId: session.createdClaimId },
    include: {
      statusHistory: { orderBy: { createdAt: 'asc' } },
      documents: { select: { documentId: true, createdAt: true } },
    },
  })
  if (!claim) return null

  const statusOrder = [
    'DECLARED', 'ANALYZING', 'DOCS_REQUIRED', 'UNDER_EXPERTISE',
    'IN_DECISION', 'APPROVED', 'IN_PAYMENT', 'CLOSED',
  ]
  const statusLabels: Record<string, string> = {
    DECLARED: 'Déclaré',
    ANALYZING: 'En analyse',
    DOCS_REQUIRED: 'Documents requis',
    UNDER_EXPERTISE: 'En instruction',
    IN_DECISION: 'En décision',
    APPROVED: 'Approuvé',
    IN_PAYMENT: 'En paiement',
    CLOSED: 'Clôturé',
    REJECTED: 'Rejeté',
  }

  const currentIndex = statusOrder.indexOf(claim.status)
  const steps = [
    { label: 'Déclaré', completed: true, date: claim.createdAt.toISOString() },
    {
      label: 'Documents reçus',
      completed: claim.documents.length > 0,
      date: claim.documents[0]?.createdAt.toISOString(),
    },
    {
      label: 'En instruction',
      completed: currentIndex >= statusOrder.indexOf('UNDER_EXPERTISE'),
      date: claim.statusHistory.find((h) => h.toStatus === 'UNDER_EXPERTISE')?.createdAt.toISOString(),
    },
    {
      label: 'Décision',
      completed: currentIndex >= statusOrder.indexOf('IN_DECISION'),
      date: claim.statusHistory.find((h) => h.toStatus === 'IN_DECISION')?.createdAt.toISOString(),
    },
    {
      label: 'Paiement',
      completed: claim.status === 'IN_PAYMENT' || claim.status === 'CLOSED',
      date: claim.statusHistory.find((h) => h.toStatus === 'IN_PAYMENT')?.createdAt.toISOString(),
    },
  ]

  const daysSinceCreation = Math.floor(
    (Date.now() - new Date(claim.createdAt).getTime()) / (1000 * 60 * 60 * 24),
  )
  const sla = getSLADays(session.claimType ?? 'AUTO')
  const estimatedDaysRemaining = Math.max(0, sla - daysSinceCreation)

  return {
    claimNumber: claim.claimNumber,
    status: claim.status,
    statusLabel: statusLabels[claim.status] ?? claim.status,
    steps,
    estimatedDaysRemaining,
    lastUpdate: claim.updatedAt.toISOString(),
    mapDocType,
  }
}

export { mapDocType }
