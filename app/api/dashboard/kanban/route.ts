/**
 * GET /api/dashboard/kanban
 * Returns all active claims grouped by kanban column.
 * Query params: typeSinistre (AUTO/HOME/HEALTH/LIFE), managerId, priority
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { verifyToken } from '@/app/lib/auth';
import { Prisma } from '@prisma/client';

function auth(req: NextRequest) {
  const h = req.headers.get('authorization');
  const cookieToken = req.cookies.get('admin_at')?.value;
  const token = h?.startsWith('Bearer ') ? h.substring(7) : cookieToken;
  if (!token) return null;
  try { return verifyToken(token); } catch { return null; }
}

// Map kanban column keys to real DB ClaimStatus values
const COLUMN_STATUSES = {
  DECLARED:   ['DECLARED'] as const,
  IN_PROGRESS: ['ANALYZING', 'DOCS_REQUIRED'] as const,
  DECISION:   ['UNDER_EXPERTISE', 'IN_DECISION'] as const,
  APPROVED:   ['APPROVED', 'IN_PAYMENT'] as const,
  REJECTED:   ['REJECTED'] as const,
  ESCALATED:  [] as const, // priority = URGENT, excluding terminal statuses
} satisfies Record<string, readonly string[]>;

// Required docs per claim type (for progress indicator)
const REQUIRED_DOCS: Record<string, number> = {
  ACCIDENT: 5,
  THEFT:    4,
  FIRE:     6,
  WATER_DAMAGE: 4,
};

export async function GET(req: NextRequest) {
  try {
    const decoded = auth(req);
    if (!decoded) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const typeSinistre = searchParams.get('typeSinistre') ?? '';   // AUTO|HOME|HEALTH|LIFE (policyType)
    const managerId    = searchParams.get('managerId')    ?? '';
    const priorityFilter = searchParams.get('priority')  ?? '';   // NORMAL|HIGH|URGENT

    // Build shared where clause for filtered claims
    const baseWhere: Prisma.ClaimWhereInput = {
      status: { notIn: ['CLOSED', 'IN_PAYMENT'] },
    };

    if (managerId) baseWhere.assignedTo = managerId;
    if (priorityFilter) baseWhere.priority = priorityFilter as 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
    if (typeSinistre) {
      baseWhere.policy = { policyType: typeSinistre as Prisma.EnumPolicyTypeFilter };
    }

    const claimSelect: Prisma.ClaimSelect = {
      claimId:        true,
      claimNumber:    true,
      claimType:      true,
      claimedAmount:  true,
      priority:       true,
      status:         true,
      createdAt:      true,
      scoreRisque:    true,
      labelRisque:    true,
      assignedTo:     true,
      client: {
        select: {
          firstName: true,
          lastName:  true,
          phone:     true,
        },
      },
      assignedUser: {
        select: {
          userId:    true,
          firstName: true,
          lastName:  true,
          role:      true,
        },
      },
      _count: {
        select: { documents: true },
      },
      documents: {
        where: { status: 'VERIFIED', isArchived: false },
        select: { documentId: true },
      },
      policy: {
        select: { policyType: true },
      },
    };

    // Fetch all non-terminal claims matching filters in one query
    const allClaims = await prisma.claim.findMany({
      where: baseWhere,
      select: claimSelect,
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
    });

    // Separately fetch ESCALATED (urgent, active, includes all statuses)
    const escalatedBase: Prisma.ClaimWhereInput = {
      priority: 'URGENT',
      status: { notIn: ['APPROVED', 'REJECTED', 'CLOSED', 'IN_PAYMENT'] },
    };
    if (managerId) escalatedBase.assignedTo = managerId;
    if (typeSinistre) {
      escalatedBase.policy = { policyType: typeSinistre as Prisma.EnumPolicyTypeFilter };
    }

    const escalatedClaims = await prisma.claim.findMany({
      where: escalatedBase,
      select: claimSelect,
      orderBy: [{ createdAt: 'asc' }],
    });

    type RawClaim = typeof allClaims[number];

    function buildKanbanClaim(c: RawClaim) {
      const assignedUser = c.assignedUser;
      const firstName = assignedUser?.firstName ?? '';
      const lastName  = assignedUser?.lastName  ?? '';
      return {
        claimId:       c.claimId,
        claimNumber:   c.claimNumber,
        typeSinistre:  c.policy?.policyType ?? c.claimType,
        montantDeclare: c.claimedAmount ? Number(c.claimedAmount) : 0,
        priority:      c.priority,
        status:        c.status,
        createdAt:     c.createdAt,
        client: {
          nom:        c.client.lastName,
          prenom:     c.client.firstName,
          telephone:  c.client.phone,
        },
        assignedManager: assignedUser ? {
          userId:         assignedUser.userId,
          nom:            assignedUser.lastName,
          prenom:         assignedUser.firstName,
          role:           assignedUser.role,
          avatarInitials: `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase(),
        } : null,
        scoreRisque:        c.scoreRisque,
        labelRisque:        c.labelRisque,
        _count:             { claimDocuments: c._count.documents },
        verifiedDocsCount:  c.documents.length,
        totalRequiredDocs:  REQUIRED_DOCS[c.claimType] ?? 4,
      };
    }

    const groupedClaims = {
      DECLARED:    [] as ReturnType<typeof buildKanbanClaim>[],
      IN_PROGRESS: [] as ReturnType<typeof buildKanbanClaim>[],
      DECISION:    [] as ReturnType<typeof buildKanbanClaim>[],
      APPROVED:    [] as ReturnType<typeof buildKanbanClaim>[],
      REJECTED:    [] as ReturnType<typeof buildKanbanClaim>[],
      ESCALATED:   [] as ReturnType<typeof buildKanbanClaim>[],
    };

    for (const c of allClaims) {
      const built = buildKanbanClaim(c);
      if (COLUMN_STATUSES.DECLARED.includes(c.status as never)) {
        groupedClaims.DECLARED.push(built);
      } else if (COLUMN_STATUSES.IN_PROGRESS.includes(c.status as never)) {
        groupedClaims.IN_PROGRESS.push(built);
      } else if (COLUMN_STATUSES.DECISION.includes(c.status as never)) {
        groupedClaims.DECISION.push(built);
      } else if (COLUMN_STATUSES.APPROVED.includes(c.status as never)) {
        groupedClaims.APPROVED.push(built);
      } else if (COLUMN_STATUSES.REJECTED.includes(c.status as never)) {
        groupedClaims.REJECTED.push(built);
      }
    }

    // Escalated = urgent active claims (may overlap with other columns, shown separately)
    groupedClaims.ESCALATED = escalatedClaims.map(buildKanbanClaim);

    return NextResponse.json({ success: true, data: groupedClaims });
  } catch (error) {
    console.error('Kanban API error:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
