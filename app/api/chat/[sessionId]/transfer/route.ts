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

/** POST /api/chat/[sessionId]/transfer */
export async function POST(
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
    select: { clientId: true, status: true },
  })
  if (!session || session.clientId !== clientId) {
    return NextResponse.json({ error: 'Session introuvable' }, { status: 404 })
  }

  if (session.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Session déjà terminée' }, { status: 400 })
  }

  try {
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { status: 'TRANSFERRED_TO_AGENT' },
    })

    await prisma.chatMessage.create({
      data: {
        sessionId,
        role: 'SYSTEM',
        content: 'Session transférée à un conseiller humain.',
      },
    })

    // Create notification for available managers
    await prisma.auditLog.create({
      data: {
        entityType: 'CLIENT',
        entityId: clientId,
        action: 'UPDATE',
        description: `Transfert demandé par le client depuis la session chatbot ${sessionId}`,
        clientId,
        metadata: { sessionId, transferredAt: new Date().toISOString() },
        riskLevel: 'LOW',
      },
    })

    return NextResponse.json({
      message: 'Un conseiller vous contactera dans les plus brefs délais.',
    })
  } catch (err) {
    console.error('[POST /api/chat/transfer]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
