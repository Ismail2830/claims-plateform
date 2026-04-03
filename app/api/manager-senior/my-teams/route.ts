/**
 * GET  /api/manager-senior/my-teams  — teams where the MS is a member
 * POST /api/manager-senior/my-teams  — create a new team (MS auto-added as LEAD)
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/api-auth'
import { prisma } from '@/app/lib/prisma'

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, ['MANAGER_SENIOR'])
  if (!auth.ok) return auth.response
  const { userId } = auth.user

  const memberships = await prisma.teamMember.findMany({
    where: { userId },
    select: {
      team: {
        include: {
          members: {
            include: {
              user: {
                select: {
                  userId: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  role: true,
                  currentWorkload: true,
                  maxWorkload: true,
                  isActive: true,
                },
              },
            },
            orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
          },
        },
      },
    },
  })

  const teams = memberships.map((m) => {
    const team = m.team
    const totalCurrent = team.members.reduce((s, mb) => s + mb.user.currentWorkload, 0)
    const totalMax     = team.members.reduce((s, mb) => s + mb.maxClaims, 0)
    const lead = team.members.find((mb) => mb.role === 'LEAD')
    return {
      ...team,
      stats: {
        memberCount:     team.members.length,
        totalCurrent,
        totalMax,
        workloadPercent: totalMax > 0 ? Math.round((totalCurrent / totalMax) * 100) : 0,
      },
      lead: lead
        ? { userId: lead.user.userId, firstName: lead.user.firstName, lastName: lead.user.lastName }
        : null,
    }
  })

  return NextResponse.json({ success: true, data: { teams } })
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(request, ['MANAGER_SENIOR'])
  if (!auth.ok) return auth.response
  const { userId } = auth.user

  const body = await request.json().catch(() => null)
  if (!body?.name?.trim() || !Array.isArray(body?.claimTypes) || body.claimTypes.length === 0) {
    return NextResponse.json({ success: false, error: 'Nom et types de sinistres requis' }, { status: 400 })
  }

  const existing = await prisma.team.findFirst({ where: { name: body.name.trim() } })
  if (existing) {
    return NextResponse.json({ success: false, error: 'Une équipe avec ce nom existe déjà' }, { status: 409 })
  }

  const team = await prisma.$transaction(async (tx) => {
    const newTeam = await tx.team.create({
      data: {
        name:        body.name.trim(),
        description: body.description?.trim() || null,
        claimTypes:  body.claimTypes,
        maxWorkload: body.maxWorkload ?? 20,
      },
    })
    // Auto-add the Manager Senior as LEAD
    await tx.teamMember.create({
      data: { teamId: newTeam.id, userId, role: 'LEAD', maxClaims: body.maxWorkload ?? 20 },
    })
    return newTeam
  })

  return NextResponse.json(
    { success: true, data: { team }, message: 'Équipe créée avec succès' },
    { status: 201 },
  )
}
