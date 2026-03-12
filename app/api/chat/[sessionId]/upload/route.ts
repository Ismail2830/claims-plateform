import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from '@/app/lib/tokens'
import { prisma } from '@/app/lib/prisma'
import { processFileUpload } from '@/app/lib/chatbot/flow-engine'
import { put } from '@vercel/blob'

function getClientId(request: NextRequest): string | null {
  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  try {
    const decoded = verifyAccessToken(auth.slice(7))
    if (decoded.type !== 'CLIENT') return null
    return (decoded as { clientId: string }).clientId
  } catch { return null }
}

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
])
const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

/** POST /api/chat/[sessionId]/upload */
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
  if (session.status === 'COMPLETED' || session.status === 'ABANDONED') {
    return NextResponse.json({ error: 'Session terminée' }, { status: 400 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'FormData invalide' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  const docType = (formData.get('docType') as string | null) ?? 'OTHER'

  if (!file) {
    return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })
  }

  // Server-side MIME validation
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { error: 'Type de fichier non autorisé. Formats acceptés: JPG, PNG, WEBP, PDF' },
      { status: 422 },
    )
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Fichier trop volumineux (max 10 MB)' }, { status: 422 })
  }

  // Sanitize filename — no path traversal
  const ext = file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') ?? 'bin'
  const safeFilename = `${docType}_${Date.now()}.${ext}`

  // Upload to Vercel Blob (works in serverless / Vercel production)
  const blob = await put(`chat/${sessionId}/${safeFilename}`, file, {
    access: 'public',
    contentType: file.type,
  })
  const publicPath = blob.url

  try {
    const response = await processFileUpload(sessionId, publicPath, docType, {
      fileName: safeFilename,
      originalName: file.name.slice(0, 255),
      mimeType: file.type,
      fileSize: file.size,
    })
    return NextResponse.json({ response, filePath: publicPath })
  } catch (err) {
    console.error('[POST /api/chat/upload]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
