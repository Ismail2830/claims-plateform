import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from '@/app/lib/tokens'
import { prisma } from '@/app/lib/prisma'
import { processMessage } from '@/app/lib/chatbot/flow-engine'

function getClientId(request: NextRequest): string | null {
  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  try {
    const decoded = verifyAccessToken(auth.slice(7))
    if (decoded.type !== 'CLIENT') return null
    return (decoded as { clientId: string }).clientId
  } catch { return null }
}

/** POST /api/chat/[sessionId]/message */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const clientId = getClientId(request)
  if (!clientId) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const { sessionId } = await params

  // Verify session ownership
  const session = await prisma.chatSession.findUnique({
    where: { id: sessionId },
    select: { clientId: true, status: true },
  })
  if (!session || session.clientId !== clientId) {
    return NextResponse.json({ error: 'Session introuvable' }, { status: 404 })
  }
  if (session.status === 'COMPLETED' || session.status === 'ABANDONED') {
    return NextResponse.json({ error: 'Session terminée' }, { status: 400 })
  }

  let body: { content?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  const content = body.content?.trim()
  if (!content) {
    return NextResponse.json({ error: 'Le contenu est requis' }, { status: 400 })
  }

  try {
    const response = await processMessage(sessionId, content)
    return NextResponse.json({ response })
  } catch (err) {
    console.error('[POST /api/chat/message]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
