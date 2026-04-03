/**
 * GET   /api/expert/claims/[claimId]  — full claim detail (scoped to assigned expert)
 * PATCH /api/expert/claims/[claimId]  — change status (expert-allowed transitions only)
 */
import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { requireRole } from '@/lib/api-auth'

// Transitions an expert is allowed to trigger
const EXPERT_TRANSITIONS: Record<string, string[]> = {
  DECLARED:        ['ANALYZING'],
  ANALYZING:       ['DOCS_REQUIRED', 'UNDER_EXPERTISE'],
  DOCS_REQUIRED:   ['ANALYZING', 'UNDER_EXPERTISE'],
  UNDER_EXPERTISE: ['IN_DECISION'],
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(
  request: Request,
  { params }: { params: Promise<{ claimId: string }> },
) {
  const auth = await requireRole(request, ['EXPERT'])
  if (!auth.ok) return auth.response
  const { userId } = auth.user
  const { claimId } = await params

  const claim = await prisma.claim.findFirst({
    where: { claimId, assignedTo: userId },
    select: {
      claimId:            true,
      claimNumber:        true,
      claimType:          true,
      status:             true,
      priority:           true,
      incidentDate:       true,
      declarationDate:    true,
      incidentLocation:   true,
      description:        true,
      damageDescription:  true,
      additionalNotes:    true,
      claimedAmount:      true,
      estimatedAmount:    true,
      approvedAmount:     true,
      policeReport:       true,
      policeReportNumber: true,
      emergencyServices:  true,
      scoreRisque:        true,
      scoreConfidence:    true,
      decisionIa:         true,
      labelRisque:        true,
      scoredAt:           true,
      createdAt:          true,
      updatedAt:          true,
      client: {
        select: {
          clientId:          true,
          firstName:         true,
          lastName:          true,
          cin:               true,
          email:             true,
          phone:             true,
          city:              true,
          province:          true,
          ancienneteAnnees:  true,
          nbSinistresPasses: true,
          montantTotalPasse: true,
        },
      },
      policy: {
        select: {
          policyNumber: true,
          policyType:   true,
          coverageType: true,
          deductible:   true,
          insuredAmount:true,
        },
      },
      documents: {
        where:   { isArchived: false },
        orderBy: { createdAt: 'desc' },
        select: {
          documentId:   true,
          originalName: true,
          fileType:     true,
          mimeType:     true,
          fileSize:     true,
          filePath:     true,
          status:       true,
          rejectionNote:true,
          isRequired:   true,
          createdAt:    true,
        },
      },
      statusHistory: {
        orderBy: { createdAt: 'desc' },
        take:    15,
        select: {
          historyId:         true,
          fromStatus:        true,
          toStatus:          true,
          reason:            true,
          notes:             true,
          isSystemGenerated: true,
          createdAt:         true,
          changedByUser: {
            select: { firstName: true, lastName: true, role: true },
          },
        },
      },
      comments: {
        orderBy: { createdAt: 'desc' },
        take:    25,
        select: {
          commentId:    true,
          message:      true,
          commentType:  true,
          isInternal:   true,
          createdAt:    true,
          authorUser:   { select: { firstName: true, lastName: true, role: true } },
          authorClient: { select: { firstName: true, lastName: true } },
        },
      },
    },
  })

  if (!claim) return NextResponse.json({ error: 'Dossier introuvable ou accès refusé' }, { status: 404 })
  return NextResponse.json({ data: claim })
}

// ─── PATCH — change status ────────────────────────────────────────────────────

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ claimId: string }> },
) {
  const auth = await requireRole(request, ['EXPERT'])
  if (!auth.ok) return auth.response
  const { userId } = auth.user
  const { claimId } = await params

  const body = await request.json().catch(() => null)
  if (!body?.status) return NextResponse.json({ error: 'Statut requis' }, { status: 400 })

  const existing = await prisma.claim.findFirst({
    where: { claimId, assignedTo: userId },
    select: { claimId: true, status: true },
  })
  if (!existing) return NextResponse.json({ error: 'Dossier introuvable ou accès refusé' }, { status: 404 })

  const allowed = EXPERT_TRANSITIONS[existing.status] ?? []
  if (!allowed.includes(body.status)) {
    return NextResponse.json(
      { error: `Transition non autorisée de ${existing.status} vers ${body.status}` },
      { status: 403 },
    )
  }

  const [updated] = await prisma.$transaction([
    prisma.claim.update({
      where:  { claimId },
      data:   { status: body.status as never, updatedAt: new Date() },
      select: { claimId: true, claimNumber: true, status: true, updatedAt: true },
    }),
    prisma.claimStatusHistory.create({
      data: {
        claimId,
        fromStatus:        existing.status as never,
        toStatus:          body.status as never,
        changedBy:         userId,
        reason:            body.reason ?? null,
        notes:             body.notes  ?? null,
        isSystemGenerated: false,
      },
    }),
  ])

  return NextResponse.json({ data: updated })
}
