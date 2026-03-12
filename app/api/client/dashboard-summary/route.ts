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
  } catch {
    return null
  }
}

const SLA_DAYS: Record<string, number> = {
  ACCIDENT: 10,
  THEFT: 15,
  FIRE: 15,
  WATER_DAMAGE: 15,
}

const ACTIVE_STATUSES = [
  'DECLARED',
  'ANALYZING',
  'DOCS_REQUIRED',
  'UNDER_EXPERTISE',
  'IN_DECISION',
]

const IN_PROGRESS_STATUSES = ['ANALYZING', 'UNDER_EXPERTISE', 'IN_DECISION']
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

/** GET /api/client/dashboard-summary */
export async function GET(request: NextRequest) {
  const clientId = getClientId(request)
  if (!clientId) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  try {
    const [client, claims] = await Promise.all([
      prisma.client.findUnique({
        where: { clientId },
        select: { firstName: true, lastName: true },
      }),
      prisma.claim.findMany({
        where: { clientId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          claimId: true,
          claimNumber: true,
          claimType: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          documents: {
            where: { status: { in: ['PENDING_RESUBMIT', 'REJECTED'] }, isArchived: false },
            select: { documentId: true },
          },
          statusHistory: {
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: { toStatus: true, createdAt: true },
          },
        },
      }),
    ])

    if (!client) {
      return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })
    }

    const now = Date.now()
    const sevenDaysAgo = new Date(now - SEVEN_DAYS_MS)

    // Build claim summaries
    const pendingDocsClaims: { claimId: string; claimNumber: string; missingDocs: number }[] = []
    const recentlyApproved: { claimId: string; claimNumber: string; approvedAt: string }[] = []
    const recentlyRejected: { claimId: string; claimNumber: string; rejectedAt: string }[] = []
    const inProgressClaims: { claimId: string; claimNumber: string; estimatedDays: number }[] = []
    let totalActive = 0

    for (const claim of claims) {
      const isActive = ACTIVE_STATUSES.includes(claim.status)
      if (isActive) totalActive++

      // Pending docs: claim needs documents (in DOCS_REQUIRED status or has rejected/pending docs)
      if (
        claim.status === 'DOCS_REQUIRED' ||
        (isActive && claim.documents.length > 0)
      ) {
        pendingDocsClaims.push({
          claimId: claim.claimId,
          claimNumber: claim.claimNumber,
          missingDocs: claim.documents.length || 1,
        })
      }

      // Recently approved (last 7 days)
      if (claim.status === 'APPROVED' || claim.status === 'IN_PAYMENT' || claim.status === 'CLOSED') {
        const approvedEntry = claim.statusHistory.find(
          (h) => h.toStatus === 'APPROVED' && new Date(h.createdAt) > sevenDaysAgo,
        )
        if (approvedEntry) {
          recentlyApproved.push({
            claimId: claim.claimId,
            claimNumber: claim.claimNumber,
            approvedAt: approvedEntry.createdAt.toISOString(),
          })
        }
      }

      // Recently rejected (last 7 days)
      if (claim.status === 'REJECTED') {
        const rejectedEntry = claim.statusHistory.find(
          (h) => h.toStatus === 'REJECTED' && new Date(h.createdAt) > sevenDaysAgo,
        )
        if (rejectedEntry) {
          recentlyRejected.push({
            claimId: claim.claimId,
            claimNumber: claim.claimNumber,
            rejectedAt: rejectedEntry.createdAt.toISOString(),
          })
        }
      }

      // In progress
      if (IN_PROGRESS_STATUSES.includes(claim.status)) {
        const sla = SLA_DAYS[claim.claimType] ?? 14
        const daysSince = Math.floor((now - new Date(claim.createdAt).getTime()) / (1000 * 60 * 60 * 24))
        const estimatedDays = Math.max(0, sla - daysSince)
        inProgressClaims.push({
          claimId: claim.claimId,
          claimNumber: claim.claimNumber,
          estimatedDays,
        })
      }
    }

    return NextResponse.json({
      client: {
        firstName: client.firstName,
        lastName: client.lastName,
        avatarUrl: null,
      },
      claims: {
        totalActive,
        pendingDocsClaims,
        recentlyApproved,
        recentlyRejected,
        inProgressClaims,
      },
    })
  } catch (err) {
    console.error('[GET /api/client/dashboard-summary]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
