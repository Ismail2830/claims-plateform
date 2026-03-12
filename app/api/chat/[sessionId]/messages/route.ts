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

/** GET /api/chat/[sessionId]/messages — fetch all messages for a session */
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
    select: {
      clientId: true,
      status: true,
      claimType: true,
      currentStep: true,
      createdClaimId: true,
      messages: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          role: true,
          content: true,
          metadata: true,
          createdAt: true,
        },
      },
    },
  })

  if (!session || session.clientId !== clientId) {
    return NextResponse.json({ error: 'Session introuvable' }, { status: 404 })
  }

  return NextResponse.json({
    messages: session.messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      metadata: m.metadata,
      createdAt: m.createdAt.toISOString(),
    })),
    sessionStatus: session.status,
    claimType: session.claimType,
    currentStep: session.currentStep,
    createdClaimId: session.createdClaimId,
  })
}
