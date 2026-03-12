import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from '@/app/lib/tokens'
import { prisma } from '@/app/lib/prisma'

function getClientId(request: NextRequest): string | null {
  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  try {
    const decoded = verifyAccessToken(auth.slice(7))
    if (decoded.type !== 'CLIENT') return null
    return (decoded as { clientId: string }).clientId
  } catch { return null }
}

const STATUS_ORDER = [
  'DECLARED', 'ANALYZING', 'DOCS_REQUIRED', 'UNDER_EXPERTISE',
  'IN_DECISION', 'APPROVED', 'IN_PAYMENT', 'CLOSED',
]

const STATUS_LABEL: Record<string, string> = {
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

// Map Prisma ClaimType → display type key
const CLAIM_TYPE_DISPLAY: Record<string, string> = {
  ACCIDENT: 'AUTO',
  THEFT: 'HABITATION',
  FIRE: 'HABITATION',
  WATER_DAMAGE: 'HABITATION',
}

function getSLADays(claimType: string, declarationMethod: string | null): number {
  // If declared via chatbot, use chatbot SLA mapping
  if (declarationMethod === 'CHATBOT') {
    // claimType here is the Prisma enum
    if (claimType === 'ACCIDENT') return 10
    if (claimType === 'FIRE' || claimType === 'WATER_DAMAGE' || claimType === 'THEFT') return 15
  }
  switch (claimType) {
    case 'ACCIDENT': return 10
    case 'THEFT': return 15
    case 'FIRE': return 15
    case 'WATER_DAMAGE': return 15
    default: return 14
  }
}

/** GET /api/client/claims — all claims for the authenticated client with tracking info */
export async function GET(request: NextRequest) {
  const clientId = getClientId(request)
  if (!clientId) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  try {
    const claims = await prisma.claim.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        claimId: true,
        claimNumber: true,
        claimType: true,
        status: true,
        declarationMethod: true,
        createdAt: true,
        updatedAt: true,
        incidentDate: true,
        documents: {
          orderBy: { createdAt: 'asc' },
          take: 1,
          select: { createdAt: true },
        },
        statusHistory: {
          orderBy: { createdAt: 'asc' },
          select: { toStatus: true, createdAt: true },
        },
      },
    })

    const result = claims.map((claim) => {
      const currentIndex = STATUS_ORDER.indexOf(claim.status)
      const historyMap = new Map(
        claim.statusHistory.map((h) => [h.toStatus, h.createdAt.toISOString()]),
      )

      const steps = [
        {
          label: 'Déclaré',
          completed: true,
          date: claim.createdAt.toISOString(),
        },
        {
          label: 'Documents reçus',
          completed: claim.documents.length > 0,
          date: claim.documents[0]?.createdAt.toISOString() ?? undefined,
        },
        {
          label: 'En instruction',
          completed: currentIndex >= STATUS_ORDER.indexOf('UNDER_EXPERTISE'),
          date: historyMap.get('UNDER_EXPERTISE'),
        },
        {
          label: 'Décision rendue',
          completed: currentIndex >= STATUS_ORDER.indexOf('IN_DECISION'),
          date: historyMap.get('IN_DECISION'),
        },
        {
          label: 'Paiement',
          completed: claim.status === 'IN_PAYMENT' || claim.status === 'CLOSED',
          date: historyMap.get('IN_PAYMENT'),
        },
      ]

      const daysSince = Math.floor(
        (Date.now() - new Date(claim.createdAt).getTime()) / (1000 * 60 * 60 * 24),
      )
      const sla = getSLADays(claim.claimType, claim.declarationMethod)
      const estimatedDaysRemaining = Math.max(0, sla - daysSince)

      return {
        claimId: claim.claimId,
        claimNumber: claim.claimNumber,
        claimType: CLAIM_TYPE_DISPLAY[claim.claimType] ?? claim.claimType,
        prismaClaimType: claim.claimType,
        declarationMethod: claim.declarationMethod ?? 'FORM',
        status: claim.status,
        statusLabel: STATUS_LABEL[claim.status] ?? claim.status,
        steps,
        estimatedDaysRemaining,
        sla,
        createdAt: claim.createdAt.toISOString(),
        lastUpdate: claim.updatedAt.toISOString(),
      }
    })

    return NextResponse.json({ claims: result })
  } catch (err) {
    console.error('[GET /api/client/claims]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
