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

/** GET /api/chat/history */
export async function GET(request: NextRequest) {
  const clientId = getClientId(request)
  if (!clientId) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  try {
    const sessions = await prisma.chatSession.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        claimType: true,
        status: true,
        createdClaimId: true,
        createdAt: true,
        completedAt: true,
      },
    })

    // Fetch claim numbers for completed sessions
    const claimIds = sessions
      .map((s) => s.createdClaimId)
      .filter((id): id is string => id !== null)

    const claims = claimIds.length
      ? await prisma.claim.findMany({
          where: { claimId: { in: claimIds } },
          select: { claimId: true, claimNumber: true },
        })
      : []

    const claimMap = new Map(claims.map((c) => [c.claimId, c.claimNumber]))

    const result = sessions.map((s) => ({
      sessionId: s.id,
      claimType: s.claimType,
      status: s.status,
      claimNumber: s.createdClaimId ? claimMap.get(s.createdClaimId) ?? null : null,
      createdAt: s.createdAt.toISOString(),
      completedAt: s.completedAt?.toISOString() ?? null,
    }))

    return NextResponse.json({ sessions: result })
  } catch (err) {
    console.error('[GET /api/chat/history]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
