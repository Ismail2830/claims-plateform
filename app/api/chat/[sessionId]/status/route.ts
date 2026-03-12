import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from '@/app/lib/tokens'
import { prisma } from '@/app/lib/prisma'
import { getClaimStatus } from '@/app/lib/chatbot/flow-engine'

function getClientId(request: NextRequest): string | null {
  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  try {
    const decoded = verifyAccessToken(auth.slice(7))
    if (decoded.type !== 'CLIENT') return null
    return (decoded as { clientId: string }).clientId
  } catch { return null }
}

/** GET /api/chat/[sessionId]/status */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const clientId = getClientId(request)
  if (!clientId) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const { sessionId } = await params

  const session = await prisma.chatSession.findUnique({
    where: { id: sessionId },
    select: { clientId: true },
  })
  if (!session || session.clientId !== clientId) {
    return NextResponse.json({ error: 'Session introuvable' }, { status: 404 })
  }

  try {
    const status = await getClaimStatus(sessionId)
    if (!status) {
      return NextResponse.json({ error: 'Aucun dossier associé à cette session' }, { status: 404 })
    }
    return NextResponse.json(status)
  } catch (err) {
    console.error('[GET /api/chat/status]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
