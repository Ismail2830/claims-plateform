/**
 * GET  /api/manager-junior/claims/[claimId]  — full claim detail (scope-checked)
 * PATCH /api/manager-junior/claims/[claimId] — change status
 */
import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { requireRole, getClaimsScope } from '@/lib/api-auth'

const VALID_STATUSES = [
  'DECLARED', 'ANALYZING', 'DOCS_REQUIRED', 'UNDER_EXPERTISE',
  'IN_DECISION', 'APPROVED', 'IN_PAYMENT', 'CLOSED', 'REJECTED',
]

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(
  request: Request,
  { params }: { params: Promise<{ claimId: string }> },
) {
  const auth = await requireRole(request, ['MANAGER_JUNIOR', 'MANAGER_SENIOR'])
  if (!auth.ok) return auth.response
  const { userId, role } = auth.user
  const { claimId } = await params

  const scope = await getClaimsScope(userId, role)

  const claim = await prisma.claim.findFirst({
    where: { claimId, ...scope },
    select: {
      claimId:           true,
      claimNumber:       true,
      claimType:         true,
      status:            true,
      priority:          true,
      incidentDate:      true,
      declarationDate:   true,
      incidentLocation:  true,
      description:       true,
      damageDescription: true,
      additionalNotes:   true,
      claimedAmount:     true,
      estimatedAmount:   true,
      approvedAmount:    true,
      declarationMethod: true,
      declarationChannel:true,
      source:            true,
      policeReport:      true,
      policeReportNumber:true,
      emergencyServices: true,
      riskScore:         true,
      scoreRisque:       true,
      scoreConfidence:   true,
      decisionIa:        true,
      labelRisque:       true,
      scoredAt:          true,
      createdAt:         true,
      updatedAt:         true,
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
          policyId:    true,
          policyNumber:true,
          policyType:  true,
          coverageType:true,
          deductible:  true,
        },
      },
      assignedUser: {
        select: {
          userId:    true,
          firstName: true,
          lastName:  true,
          role:      true,
          isActive:  true,
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
          commentId:   true,
          message:     true,
          commentType: true,
          isInternal:  true,
          createdAt:   true,
          authorUser:  { select: { firstName: true, lastName: true, role: true } },
          authorClient:{ select: { firstName: true, lastName: true } },
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
  const auth = await requireRole(request, ['MANAGER_JUNIOR', 'MANAGER_SENIOR'])
  if (!auth.ok) return auth.response
  const { userId, role } = auth.user
  const { claimId } = await params

  const body = await request.json().catch(() => null)
  if (!body?.status) return NextResponse.json({ error: 'Statut requis' }, { status: 400 })
  if (!VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
  }

  const scope = await getClaimsScope(userId, role)
  const existing = await prisma.claim.findFirst({
    where: { claimId, ...scope },
    select: { claimId: true, status: true },
  })
  if (!existing) return NextResponse.json({ error: 'Dossier introuvable ou accès refusé' }, { status: 404 })
  if (existing.status === body.status) {
    return NextResponse.json({ error: 'Le dossier est déjà dans ce statut' }, { status: 400 })
  }

  const updateData: Record<string, unknown> = {
    status: body.status as never,
    updatedAt: new Date(),
  }
  if (body.approvedAmount != null && body.status === 'APPROVED') {
    updateData.approvedAmount = body.approvedAmount
  }

  const [updated] = await prisma.$transaction([
    prisma.claim.update({
      where:  { claimId },
      data:   updateData,
      select: { claimId: true, claimNumber: true, status: true, updatedAt: true },
    }),
    prisma.claimStatusHistory.create({
      data: {
        claimId,
        fromStatus:        existing.status as never,
        toStatus:          body.status as never,
        changedBy:         userId,
        reason:            body.reason   ?? null,
        notes:             body.notes    ?? null,
        isSystemGenerated: false,
      },
    }),
  ])

  return NextResponse.json({ data: updated })
}
