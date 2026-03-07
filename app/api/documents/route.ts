/**
 * GET /api/documents
 * Paginated list of ClaimDocuments with filters.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { verifyToken } from '@/app/lib/auth';

function auth(req: NextRequest) {
  const h = req.headers.get('authorization');
  if (!h?.startsWith('Bearer ')) return null;
  try { return verifyToken(h.substring(7)); } catch { return null; }
}

export async function GET(req: NextRequest) {
  const decoded = auth(req);
  if (!decoded) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const page       = Math.max(1, parseInt(searchParams.get('page')  ?? '1'));
  const limit      = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20')));
  const search     = searchParams.get('search')      ?? '';
  const fileType   = searchParams.get('fileType')    ?? '';
  const status     = searchParams.get('status')      ?? '';
  const uploadedVia = searchParams.get('uploadedVia') ?? '';
  const claimId    = searchParams.get('claimId')     ?? '';
  const dateFrom   = searchParams.get('dateFrom')    ?? '';
  const dateTo     = searchParams.get('dateTo')      ?? '';
  const isArchived = searchParams.get('isArchived') === 'true';

  const where: Record<string, unknown> = { isArchived };

  if (fileType) where.fileType = fileType;
  if (status)   where.status   = status;
  if (uploadedVia) where.uploadedVia = uploadedVia;
  if (claimId)  where.claimId  = claimId;

  if (dateFrom || dateTo) {
    const dateFilter: Record<string, Date> = {};
    if (dateFrom) dateFilter.gte = new Date(dateFrom);
    if (dateTo)   dateFilter.lte = new Date(dateTo);
    where.createdAt = dateFilter;
  }

  if (search) {
    where.OR = [
      { originalName: { contains: search, mode: 'insensitive' } },
      { claim: { claimNumber: { contains: search, mode: 'insensitive' } } },
      { claim: { client: { firstName: { contains: search, mode: 'insensitive' } } } },
      { claim: { client: { lastName: { contains: search, mode: 'insensitive' } } } },
    ];
  }

  const [total, documents] = await Promise.all([
    prisma.claimDocument.count({ where }),
    prisma.claimDocument.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        claim: {
          select: {
            claimId:     true,
            claimNumber: true,
            claimType:   true,
            client: {
              select: { clientId: true, firstName: true, lastName: true },
            },
          },
        },
        uploadedByUser:  { select: { userId: true, firstName: true, lastName: true, role: true } },
        uploadedByClientRef: { select: { clientId: true, firstName: true, lastName: true } },
        verifiedByUser:  { select: { userId: true, firstName: true, lastName: true } },
      },
    }),
  ]);

  return NextResponse.json({
    documents,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}
