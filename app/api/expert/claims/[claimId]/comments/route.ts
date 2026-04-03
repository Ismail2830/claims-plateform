/**
 * POST /api/expert/claims/[claimId]/comments
 * Add an internal note to an assigned claim.
 */
import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { requireRole } from '@/lib/api-auth'

const VALID_TYPES = [
  'GENERAL', 'STATUS_UPDATE', 'DOCUMENT_REQUEST', 'EXPERT_NOTE',
  'CLIENT_QUESTION', 'INTERNAL_NOTE',
]

export async function POST(
  request: Request,
  { params }: { params: Promise<{ claimId: string }> },
) {
  const auth = await requireRole(request, ['EXPERT'])
  if (!auth.ok) return auth.response
  const { userId } = auth.user
  const { claimId } = await params

  const body = await request.json().catch(() => null)
  if (!body?.message?.trim()) {
    return NextResponse.json({ error: 'Message requis' }, { status: 400 })
  }

  // Verify claim is assigned to this expert
  const claim = await prisma.claim.findFirst({
    where: { claimId, assignedTo: userId },
    select: { claimId: true },
  })
  if (!claim) return NextResponse.json({ error: 'Dossier introuvable ou accès refusé' }, { status: 404 })

  const commentType = VALID_TYPES.includes(body.commentType) ? body.commentType : 'EXPERT_NOTE'

  const comment = await prisma.claimComment.create({
    data: {
      claimId,
      message:     body.message.trim(),
      commentType: commentType as never,
      isInternal:  true,
      authorId:    userId,
    },
    select: {
      commentId:   true,
      message:     true,
      commentType: true,
      isInternal:  true,
      createdAt:   true,
      authorUser:  { select: { firstName: true, lastName: true, role: true } },
    },
  })

  return NextResponse.json({ data: comment }, { status: 201 })
}
