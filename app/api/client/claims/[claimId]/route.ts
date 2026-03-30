/**
 * GET /api/client/claims/[claimId]
 * CLIENT only — returns full claim detail with computed fields.
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { verifyAccessToken } from '@/app/lib/tokens'

// ─── Auth ─────────────────────────────────────────────────────────────────────

function getClientId(req: NextRequest): string | null {
  const h = req.headers.get('authorization')
  if (!h?.startsWith('Bearer ')) return null
  try {
    const decoded = verifyAccessToken(h.substring(7))
    if (decoded.type !== 'CLIENT') return null
    return (decoded as { clientId: string; type: 'CLIENT' }).clientId
  } catch {
    return null
  }
}

// ─── Business-day helpers (no external deps) ──────────────────────────────────

function businessDaysBetween(start: Date, end: Date): number {
  let count = 0
  const cur = new Date(start)
  cur.setHours(0, 0, 0, 0)
  const endDay = new Date(end)
  endDay.setHours(0, 0, 0, 0)
  while (cur < endDay) {
    const d = cur.getDay()
    if (d !== 0 && d !== 6) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

const SLA_DAYS: Record<string, number> = {
  ACCIDENT: 7,
  THEFT: 7,
  FIRE: 10,
  WATER_DAMAGE: 10,
}

const RESOLVED = new Set(['APPROVED', 'IN_PAYMENT', 'CLOSED', 'REJECTED'])

function getEstimatedDaysLabel(createdAt: Date, claimType: string, status: string): string {
  if (RESOLVED.has(status)) return 'Dossier traité'
  const sla = SLA_DAYS[claimType] ?? 7
  const elapsed = businessDaysBetween(createdAt, new Date())
  const remaining = Math.max(0, sla - elapsed)
  if (remaining === 0) return 'Traitement en cours'
  if (remaining === 1) return 'encore 1 jour ouvrable'
  return `encore ${remaining} jours ouvrables`
}

// ─── Progress ─────────────────────────────────────────────────────────────────

const PROGRESS: Record<string, number> = {
  DECLARED: 10,
  ANALYZING: 25,
  DOCS_REQUIRED: 30,
  UNDER_EXPERTISE: 50,
  IN_DECISION: 70,
  APPROVED: 80,
  IN_PAYMENT: 90,
  CLOSED: 100,
  REJECTED: 100,
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

const TIMELINE_DEFS = [
  { id: 'DECLARED',    label: 'Déclaré',           description: 'Votre dossier a été enregistré', icon: '📋' },
  { id: 'DOCS',        label: 'Documents reçus',   description: 'Documents analysés',             icon: '📎' },
  { id: 'INSTRUCTION', label: 'En instruction',    description: 'Expertise en cours',             icon: '🔄' },
  { id: 'DECISION',    label: 'Décision rendue',   description: 'Décision prise',                 icon: '⚖️' },
  { id: 'NOTIFIED',    label: 'Client notifié',    description: 'Vous avez été notifié',          icon: '📬' },
  { id: 'PAID',        label: 'Paiement effectué', description: 'Paiement effectué',              icon: '💰' },
]

function statusToTimelineIdx(status: string): number {
  switch (status) {
    case 'DECLARED':        return 0
    case 'ANALYZING':       return 1
    case 'DOCS_REQUIRED':   return 1
    case 'UNDER_EXPERTISE': return 2
    case 'IN_DECISION':     return 3
    case 'APPROVED':        return 4
    case 'IN_PAYMENT':
    case 'CLOSED':          return 5
    case 'REJECTED':        return 4
    default:                return 0
  }
}

function buildTimeline(
  status: string,
  history: { toStatus: string; createdAt: Date }[],
) {
  const currentIdx = statusToTimelineIdx(status)
  const isBlocked = status === 'DOCS_REQUIRED'

  const dateMap = new Map<number, Date>()
  for (const h of history) {
    const idx = statusToTimelineIdx(h.toStatus)
    const existing = dateMap.get(idx)
    if (!existing || h.createdAt > existing) dateMap.set(idx, h.createdAt)
  }

  return TIMELINE_DEFS.map((step, idx) => {
    let stepStatus: 'COMPLETED' | 'CURRENT' | 'PENDING'
    if (idx < currentIdx) stepStatus = 'COMPLETED'
    else if (idx === currentIdx) stepStatus = 'CURRENT'
    else stepStatus = 'PENDING'

    return {
      id: step.id,
      label: step.label,
      description: isBlocked && idx === 1 ? '⚠️ Bloqué — documents requis' : step.description,
      status: stepStatus,
      date: dateMap.get(idx)?.toISOString() ?? null,
      icon: step.icon,
      isBlocked: isBlocked && idx === 1,
    }
  })
}

// ─── Doc type labels ──────────────────────────────────────────────────────────

const DOC_LABELS: Record<string, string> = {
  PHOTO: 'Photo du sinistre',
  PDF: 'Document PDF',
  INVOICE: 'Facture',
  ESTIMATE: 'Devis de réparation',
  POLICE_REPORT: 'Rapport de police',
  MEDICAL_REPORT: 'Rapport médical',
  IDENTITY_DOCUMENT: "Pièce d'identité",
  CONSTAT: 'Constat amiable',
  BANK_DETAILS: 'RIB bancaire',
  DRIVERS_LICENSE: 'Permis de conduire',
  OTHER: 'Document divers',
}

// ─── GET handler ──────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ claimId: string }> },
) {
  const clientId = getClientId(req)
  if (!clientId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { claimId } = await params

  try {
  const claim = await prisma.claim.findUnique({
    where: { claimId },
    select: {
      claimId:           true,
      claimNumber:       true,
      claimType:         true,
      status:            true,
      priority:          true,
      incidentDate:      true,
      declarationDate:   true,
      incidentLocation:  true,
      description:       true,
      claimedAmount:     true,
      estimatedAmount:   true,
      approvedAmount:    true,
      declarationMethod: true,
      createdAt:         true,
      updatedAt:         true,
      clientId:          true,
      documents: {
        where: { isArchived: false },
        orderBy: { createdAt: 'desc' },
        select: {
          documentId:   true,
          originalName: true,
          fileType:     true,
          mimeType:     true,
          fileSize:     true,
          filePath:     true,
          status:       true,
          rejectionNote:true,
          createdAt:    true,
        },
      },
      assignedUser: {
        select: {
          userId:    true,
          firstName: true,
          lastName:  true,
          role:      true,
          isActive:  true,
        },
      },
      policy: {
        select: {
          policyId:    true,
          policyNumber:true,
          policyType:  true,
          deductible:  true,
        },
      },
      statusHistory: {
        orderBy: { createdAt: 'asc' },
        select: { toStatus: true, createdAt: true },
      },
      payment: {
        select: {
          paymentId:  true,
          amount:     true,
          method:     true,
          reference:  true,
          paidAt:     true,
          notes:      true,
          createdAt:  true,
          recordedByUser: {
            select: { firstName: true, lastName: true },
          },
        },
      },
      conversations: {
        where: { isArchived: false },
        orderBy: { lastMessageAt: 'desc' },
        take: 1,
        select: {
          id: true,
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 3,
            select: {
              id: true,
              content: true,
              createdAt: true,
              isRead: true,
              sender: { select: { firstName: true, lastName: true } },
              clientSender: { select: { firstName: true, lastName: true } },
            },
          },
          _count: { select: { messages: true } },
        },
      },
    },
  })

  if (!claim) return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 })
  if (claim.clientId !== clientId) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const status = claim.status as string
  const estimatedDaysRemaining = getEstimatedDaysLabel(claim.createdAt, claim.claimType, status)
  const progressPercent = PROGRESS[status] ?? 0
  const timelineSteps = buildTimeline(
    status,
    claim.statusHistory.map(h => ({ toStatus: h.toStatus as string, createdAt: h.createdAt })),
  )

  // Action required
  let actionRequired = null
  if (status === 'DOCS_REQUIRED') {
    const rejected = claim.documents.filter(d => d.status === 'REJECTED')
    actionRequired = {
      type: 'MISSING_DOCS',
      title: 'Action requise — Documents manquants',
      description: `Il manque ${rejected.length || 'des'} document(s) pour traiter votre dossier.`,
      missingDocs: rejected.map(d => ({
        documentId: d.documentId,
        documentType: d.fileType as string,
        label: DOC_LABELS[d.fileType as string] ?? String(d.fileType),
      })),
    }
  }

  // Financial summary
  let financialSummary = null
  if (['APPROVED', 'IN_PAYMENT', 'CLOSED'].includes(status)) {
    const declared = Number(claim.claimedAmount ?? 0)
    const approved = Number(claim.approvedAmount ?? 0)
    const franchise = Number(claim.policy?.deductible ?? 0)
    financialSummary = {
      montantDeclare: declared,
      montantApprouve: approved,
      franchise,
      montantVerse: Math.max(0, approved - franchise),
      virementDate: claim.payment?.paidAt.toISOString() ?? (status === 'CLOSED' ? claim.updatedAt.toISOString() : null),
    }
  }

  // Offline payment record
  const offlinePayment = claim.payment
    ? {
        paymentId:  claim.payment.paymentId,
        amount:     Number(claim.payment.amount),
        method:     claim.payment.method as string,
        reference:  claim.payment.reference,
        paidAt:     claim.payment.paidAt.toISOString(),
        notes:      claim.payment.notes,
        createdAt:  claim.payment.createdAt.toISOString(),
        recordedBy: `${claim.payment.recordedByUser.firstName} ${claim.payment.recordedByUser.lastName}`,
      }
    : null

  const conv = claim.conversations[0]

  return NextResponse.json({
    claim: {
      claimId: claim.claimId,
      claimNumber: claim.claimNumber,
      claimType: claim.claimType as string,
      status,
      priority: claim.priority as string,
      incidentDate: claim.incidentDate.toISOString(),
      declarationDate: claim.declarationDate.toISOString(),
      incidentLocation: claim.incidentLocation,
      description: claim.description,
      claimedAmount: claim.claimedAmount ? Number(claim.claimedAmount) : null,
      approvedAmount: claim.approvedAmount ? Number(claim.approvedAmount) : null,
      declarationMethod: claim.declarationMethod,
      createdAt: claim.createdAt.toISOString(),
      updatedAt: claim.updatedAt.toISOString(),
      estimatedDaysRemaining,
      progressPercent,
      timelineSteps,
      actionRequired,
      documents: claim.documents.map(d => ({
        documentId: d.documentId,
        originalName: d.originalName,
        fileType: d.fileType as string,
        mimeType: d.mimeType,
        fileSize: d.fileSize,
        filePath: d.filePath,
        status: d.status as string,
        rejectionNote: d.rejectionNote,
        createdAt: d.createdAt.toISOString(),
      })),
      manager: claim.assignedUser
        ? {
            userId: claim.assignedUser.userId,
            firstName: claim.assignedUser.firstName,
            lastName: claim.assignedUser.lastName,
            role: claim.assignedUser.role as string,
            isAvailable: claim.assignedUser.isActive,
          }
        : null,
      policy: claim.policy
        ? {
            policyId: claim.policy.policyId,
            policyNumber: claim.policy.policyNumber,
            policyType: claim.policy.policyType as string,
          }
        : null,
      recentMessages: (conv?.messages ?? []).map(m => ({
        id: m.id,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
        isRead: m.isRead,
        senderName: m.sender
          ? `${m.sender.firstName} ${m.sender.lastName}`
          : m.clientSender
            ? `${m.clientSender.firstName} ${m.clientSender.lastName}`
            : 'Inconnu',
        isFromClient: !!m.clientSender,
      })),
      totalMessages: conv?._count.messages ?? 0,
      conversationId: conv?.id ?? null,
      financialSummary,
      offlinePayment,
    },
  })
  } catch (err) {
    console.error('[GET /api/client/claims/[claimId]]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
