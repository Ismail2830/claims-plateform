/**
 * POST   /api/manager-senior/my-teams/[teamId]/members — add a member
 * DELETE /api/manager-senior/my-teams/[teamId]/members — remove a member
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/api-auth'
import { prisma } from '@/app/lib/prisma'

type Params = { params: Promise<{ teamId: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await requireRole(request, ['MANAGER_SENIOR'])
  if (!auth.ok) return auth.response
  const { userId: msId } = auth.user
  const { teamId } = await params

  // Ensure this MS belongs to this team
  const myMembership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId: msId } },
  })
  if (!myMembership) {
    return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  if (!body?.userId) {
    return NextResponse.json({ success: false, error: 'userId requis' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { userId: body.userId } })
  if (!user) {
    return NextResponse.json({ success: false, error: 'Utilisateur introuvable' }, { status: 404 })
  }
  if (!['EXPERT', 'MANAGER_JUNIOR', 'MANAGER_SENIOR'].includes(user.role)) {
    return NextResponse.json(
      { success: false, error: 'Seuls les experts et managers peuvent rejoindre une équipe' },
      { status: 422 },
    )
  }

  const already = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId: body.userId } },
  })
  if (already) {
    return NextResponse.json({ success: false, error: 'Déjà membre de cette équipe' }, { status: 409 })
  }

  const member = await prisma.teamMember.create({
    data: { teamId, userId: body.userId, role: 'MEMBER', maxClaims: body.maxClaims ?? 20 },
    include: {
      user: {
        select: {
          userId: true, firstName: true, lastName: true,
          email: true, role: true, currentWorkload: true,
        },
      },
    },
  })

  return NextResponse.json(
    { success: true, data: { member }, message: 'Membre ajouté avec succès' },
    { status: 201 },
  )
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await requireRole(request, ['MANAGER_SENIOR'])
  if (!auth.ok) return auth.response
  const { userId: msId } = auth.user
  const { teamId } = await params

  const myMembership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId: msId } },
  })
  if (!myMembership) {
    return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  if (!body?.userId) {
    return NextResponse.json({ success: false, error: 'userId requis' }, { status: 400 })
  }
  if (body.userId === msId) {
    return NextResponse.json({ success: false, error: 'Vous ne pouvez pas vous retirer vous-même' }, { status: 400 })
  }

  const member = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId: body.userId } },
  })
  if (!member) {
    return NextResponse.json({ success: false, error: 'Membre introuvable' }, { status: 404 })
  }

  await prisma.teamMember.delete({ where: { teamId_userId: { teamId, userId: body.userId } } })

  return NextResponse.json({ success: true, message: 'Membre retiré de l\'équipe' })
}
