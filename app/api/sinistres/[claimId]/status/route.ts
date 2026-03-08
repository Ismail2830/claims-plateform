/**
 * PATCH /api/sinistres/[claimId]/status
 * Update a claim's status (called by kanban drag-and-drop).
 * Body: { status: KanbanColumnId }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { verifyAccessToken } from '@/app/lib/tokens';

function auth(req: NextRequest) {
  const h = req.headers.get('authorization');
  const cookieToken = req.cookies.get('admin_at')?.value;
  const token = h?.startsWith('Bearer ') ? h.substring(7) : cookieToken;
  if (!token) return null;
  try { return verifyAccessToken(token); } catch { return null; }
}

// Map kanban column IDs → real DB ClaimStatus
const COLUMN_TO_DB_STATUS: Record<string, string> = {
  DECLARED:   'DECLARED',
  IN_PROGRESS: 'ANALYZING',
  DECISION:   'IN_DECISION',
  APPROVED:   'APPROVED',
  REJECTED:   'REJECTED',
  ESCALATED:  'DECLARED', // escalated = urgency, revert to declared column in DB
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ claimId: string }> }
) {
  try {
    const decoded = auth(req);
    if (!decoded) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Only SUPER_ADMIN and ADMIN (MANAGER_SENIOR) can change status via drag
    if (!('role' in decoded) || !['SUPER_ADMIN', 'MANAGER_SENIOR'].includes(decoded.role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const { claimId } = await params;
    const body = await req.json() as { status?: string };
    const { status: columnId } = body;

    if (!columnId || !COLUMN_TO_DB_STATUS[columnId]) {
      return NextResponse.json({ error: 'Statut invalide' }, { status: 400 });
    }

    const dbStatus = COLUMN_TO_DB_STATUS[columnId];

    // If dragging to ESCALATED, set priority = URGENT instead of changing status
    if (columnId === 'ESCALATED') {
      const claim = await prisma.claim.update({
        where: { claimId },
        data:  { priority: 'URGENT', updatedAt: new Date() },
        select: { claimId: true, status: true, priority: true },
      });
      return NextResponse.json({ success: true, claim });
    }

    const claim = await prisma.claim.update({
      where: { claimId },
      data:  {
        status:    dbStatus as 'DECLARED' | 'ANALYZING' | 'DOCS_REQUIRED' | 'UNDER_EXPERTISE' | 'IN_DECISION' | 'APPROVED' | 'IN_PAYMENT' | 'CLOSED' | 'REJECTED',
        updatedAt: new Date(),
      },
      select: { claimId: true, status: true, priority: true },
    });

    return NextResponse.json({ success: true, claim });
  } catch (error) {
    console.error('Status update error:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
