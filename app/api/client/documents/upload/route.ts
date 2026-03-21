/**
 * POST /api/client/documents/upload
 * Client-only: upload a document for one of their own claims.
 */

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { prisma } from '@/app/lib/prisma';
import { verifyAccessToken } from '@/app/lib/tokens';
import { triggerDecisionIfReady } from '@/lib/ai-decision/triggers';

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

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest) {
  try {
    const clientId = getClientId(req);
    if (!clientId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const formData = await req.formData();
    const file     = formData.get('file') as File | null;
    const claimId  = formData.get('claimId') as string | null;
    const fileType = (formData.get('fileType') as string | null) ?? 'OTHER';

    if (!file)    return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 });
    if (!claimId) return NextResponse.json({ error: 'claimId requis' },   { status: 400 });

    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json(
        { error: 'Type non autorisé. Formats acceptés : JPG, PNG, WEBP, PDF' },
        { status: 400 },
      );
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'Fichier trop volumineux (max 10 Mo)' },
        { status: 400 },
      );
    }

    // Verify the claim belongs to this client
    const claim = await prisma.claim.findFirst({ where: { claimId, clientId } });
    if (!claim) {
      return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 });
    }

    // Sanitize the original filename — prevent path traversal
    const safeName  = path.basename(file.name).replace(/[^a-zA-Z0-9._-]/g, '_');
    const ext       = path.extname(safeName);
    const fileName  = `${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
    const uploadsRoot = path.join(process.cwd(), 'public', 'uploads');
    const uploadDir   = path.join(uploadsRoot, claimId);
    const filePath    = path.join(uploadDir, fileName);

    // Double-check for path traversal after joining
    if (!filePath.startsWith(uploadsRoot)) {
      return NextResponse.json({ error: 'Chemin invalide' }, { status: 400 });
    }

    await mkdir(uploadDir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const relPath = `/uploads/${claimId}/${fileName}`;

    const doc = await prisma.claimDocument.create({
      data: {
        claimId,
        fileName,
        originalName:     safeName,
        fileType:         fileType as import('@prisma/client').DocumentType,
        mimeType:         file.type,
        fileSize:         file.size,
        filePath:         relPath,
        uploadedByClient: clientId,
        uploadedVia:      'WEB',
        status:           'UPLOADED',
      },
      select: {
        documentId:   true,
        originalName: true,
        fileType:     true,
        mimeType:     true,
        fileSize:     true,
        filePath:     true,
        status:       true,
        createdAt:    true,
      },
    });

    // Fire-and-forget: recalculate AI decision with force=true since new data arrived
    void triggerDecisionIfReady(claimId, true);

    return NextResponse.json({ document: doc }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/client/documents/upload]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
