import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from '@/app/lib/tokens'
import { prisma } from '@/app/lib/prisma'

/** DELETE /api/chat/[sessionId] — delete session + messages */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  const payload = token ? verifyAccessToken(token) : null
  if (!payload || payload.type !== 'CLIENT') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  const clientId = payload.clientId as string
  const { sessionId } = await params

  const session = await prisma.chatSession.findUnique({ where: { id: sessionId } })
  if (!session || session.clientId !== clientId) {
    return NextResponse.json({ error: 'Session introuvable' }, { status: 404 })
  }

  // Delete messages first (FK constraint), then the session
  await prisma.chatMessage.deleteMany({ where: { sessionId } })
  await prisma.chatSession.delete({ where: { id: sessionId } })

  return NextResponse.json({ success: true })
}
