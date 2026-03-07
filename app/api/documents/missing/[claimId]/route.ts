/**
 * GET /api/documents/missing/[claimId]
 * Returns required vs uploaded vs missing document types for a claim.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { verifyToken } from '@/app/lib/auth';
import { REQUIRED_DOCUMENTS, type DocumentType } from '@/app/lib/document-maps';

function auth(req: NextRequest) {
  const h = req.headers.get('authorization');
  const cookieToken = req.cookies.get('admin_at')?.value;
  const token = h?.startsWith('Bearer ') ? h.substring(7) : cookieToken;
  if (!token) return null;
  try { return verifyToken(token); } catch { return null; }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ claimId: string }> },
) {
  const decoded = auth(req);
  if (!decoded) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { claimId } = await params;

  const claim = await prisma.claim.findUnique({
    where: { claimId },
    select: {
      claimType: true,
      documents: {
        where: { isArchived: false },
        select: { fileType: true, status: true, originalName: true },
      },
    },
  });

  if (!claim) return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 });

  const required: DocumentType[] = REQUIRED_DOCUMENTS[claim.claimType] ?? [];
  const uploaded = claim.documents.map(d => ({
    fileType:     d.fileType as DocumentType,
    status:       d.status,
    fileName:     d.originalName,
  }));

  const uploadedTypes = new Set(uploaded.map(u => u.fileType));
  const verifiedTypes = new Set(
    uploaded.filter(u => u.status === 'VERIFIED').map(u => u.fileType),
  );

  const missing   = required.filter(t => !uploadedTypes.has(t));
  const unverified = required.filter(t => uploadedTypes.has(t) && !verifiedTypes.has(t));
  const complete  = missing.length === 0 && unverified.length === 0;

  return NextResponse.json({ required, uploaded, missing, unverified, complete });
}
