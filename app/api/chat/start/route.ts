import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from '@/app/lib/tokens'
import { startSession } from '@/app/lib/chatbot/flow-engine'

function getClientId(request: NextRequest): string | null {
  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  try {
    const decoded = verifyAccessToken(auth.slice(7))
    if (decoded.type !== 'CLIENT') return null
    return (decoded as { clientId: string }).clientId
  } catch { return null }
}

/** POST /api/chat/start */
export async function POST(request: NextRequest) {
  const clientId = getClientId(request)
  if (!clientId) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  try {
    const result = await startSession(clientId)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[POST /api/chat/start]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
