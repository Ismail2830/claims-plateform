/**
 * GET /api/documents/stats
 * Returns aggregate stats for the documents dashboard.
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

export async function GET(req: NextRequest) {
  const decoded = auth(req);
  if (!decoded) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  try {
  const [
    total,
    sizeAgg,
    pending,
    processing,
    expired,
    pendingResubmit,
    byTypeRaw,
    byStatusRaw,
    bySourceRaw,
  ] = await Promise.all([
    prisma.claimDocument.count({ where: { isArchived: false } }),
    prisma.claimDocument.aggregate({
      where:   { isArchived: false },
      _sum:    { fileSize: true },
    }),
    prisma.claimDocument.count({ where: { isArchived: false, status: 'UPLOADED' } }),
    prisma.claimDocument.count({ where: { isArchived: false, status: 'PROCESSING' } }),
    prisma.claimDocument.count({ where: { isArchived: false, status: 'EXPIRED' } }),
    prisma.claimDocument.count({ where: { isArchived: false, status: 'PENDING_RESUBMIT' } }),
    prisma.claimDocument.groupBy({
      by: ['fileType'],
      where: { isArchived: false },
      _count: { fileType: true },
    }),
    prisma.claimDocument.groupBy({
      by: ['status'],
      where: { isArchived: false },
      _count: { status: true },
    }),
    prisma.claimDocument.groupBy({
      by: ['uploadedVia'],
      where: { isArchived: false },
      _count: { uploadedVia: true },
    }),
  ]);

  const byType: Record<string, number> = {};
  for (const g of byTypeRaw)   byType[g.fileType]     = g._count.fileType;

  const byStatus: Record<string, number> = {};
  for (const g of byStatusRaw) byStatus[g.status]     = g._count.status;

  const bySource: Record<string, number> = {};
  for (const g of bySourceRaw) bySource[g.uploadedVia] = g._count.uploadedVia;

  return NextResponse.json({
    total,
    totalSizeBytes: sizeAgg._sum.fileSize ?? 0,
    pending,
    processing,
    expired,
    pendingResubmit,
    byType,
    byStatus,
    bySource,
  });
  } catch (err) {
    console.error('[GET /api/documents/stats] error:', err);
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
