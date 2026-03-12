/**
 * GET /api/client/documents/[documentId]
 * Streams a claim document to the authenticated client.
 * Verifies that the document belongs to a claim owned by the requesting client.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createReadStream, statSync, existsSync } from 'fs';
import path from 'path';
import { verifyAccessToken } from '@/app/lib/tokens';
import { prisma } from '@/app/lib/prisma';

function getClientId(req: NextRequest): string | null {
  const h = req.headers.get('authorization');
  if (!h?.startsWith('Bearer ')) return null;
  try {
    const decoded = verifyAccessToken(h.substring(7));
    if (decoded.type !== 'CLIENT') return null;
    return (decoded as { clientId: string }).clientId;
  } catch {
    return null;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> },
) {
  const clientId = getClientId(req);
  if (!clientId) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const { documentId } = await params;

  // Fetch document and verify ownership via the claim's clientId
  const doc = await prisma.claimDocument.findUnique({
    where: { documentId, isArchived: false },
    select: {
      documentId: true,
      originalName: true,
      mimeType: true,
      filePath: true,
      claim: { select: { clientId: true } },
    },
  });

  if (!doc) {
    return NextResponse.json({ error: 'Document introuvable' }, { status: 404 });
  }

  if (doc.claim.clientId !== clientId) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  // Resolve file path safely (prevent path traversal)
  const rawPath = doc.filePath.replace(/^\/?(public\/)?uploads\//, '');
  const safePath = path.normalize(rawPath).replace(/^(\.\.(\/|\\|$))+/, '');
  const uploadsRoot = path.join(process.cwd(), 'public', 'uploads');
  const fullPath = path.join(uploadsRoot, safePath);

  if (!fullPath.startsWith(uploadsRoot)) {
    return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });
  }

  if (!existsSync(fullPath)) {
    return NextResponse.json({ error: 'Fichier introuvable' }, { status: 404 });
  }

  const stat = statSync(fullPath);
  const stream = createReadStream(fullPath);
  const readable = new ReadableStream({
    start(controller) {
      stream.on('data', (chunk) => controller.enqueue(chunk));
      stream.on('end', () => controller.close());
      stream.on('error', (err) => controller.error(err));
    },
  });

  const encodedName = encodeURIComponent(doc.originalName);

  return new NextResponse(readable, {
    headers: {
      'Content-Type': doc.mimeType,
      'Content-Length': String(stat.size),
      'Content-Disposition': `inline; filename*=UTF-8''${encodedName}`,
      'Cache-Control': 'private, no-store',
    },
  });
}
