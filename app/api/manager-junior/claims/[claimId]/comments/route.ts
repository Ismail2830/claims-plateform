/**
 * POST /api/manager-junior/claims/[claimId]/comments
 * Add an internal note / comment to a claim.
 */
import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { requireRole, getClaimsScope } from '@/lib/api-auth'

const VALID_TYPES = [
  'GENERAL', 'STATUS_UPDATE', 'DOCUMENT_REQUEST', 'EXPERT_NOTE',
  'CLIENT_QUESTION', 'INTERNAL_NOTE',
]

export async function POST(
  request: Request,
  { params }: { params: Promise<{ claimId: string }> },
) {
  const auth = await requireRole(request, ['MANAGER_JUNIOR', 'MANAGER_SENIOR'])
  if (!auth.ok) return auth.response
  const { userId, role } = auth.user
  const { claimId } = await params

  const body = await request.json().catch(() => null)
  if (!body?.message?.trim()) {
    return NextResponse.json({ error: 'Message requis' }, { status: 400 })
  }

  const commentType = VALID_TYPES.includes(body.commentType) ? body.commentType : 'INTERNAL_NOTE'

  const scope = await getClaimsScope(userId, role)
  const claim = await prisma.claim.findFirst({
    where: { claimId, ...scope },
    select: { claimId: true },
  })
  if (!claim) return NextResponse.json({ error: 'Dossier introuvable ou accès refusé' }, { status: 404 })

  const comment = await prisma.claimComment.create({
    data: {
      claimId,
      message:     body.message.trim(),
      commentType: commentType as never,
      isInternal:  body.isInternal !== false,
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
