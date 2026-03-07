/**
 * POST /api/documents/upload
 * Uploads a file and creates a ClaimDocument record.
 */

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { prisma } from '@/app/lib/prisma';
import { verifyToken } from '@/app/lib/auth';

function auth(req: NextRequest) {
  const h = req.headers.get('authorization');
  const cookieToken = req.cookies.get('admin_at')?.value;
  const token = h?.startsWith('Bearer ') ? h.substring(7) : cookieToken;
  if (!token) return null;
  try { return verifyToken(token); } catch { return null; }
}

const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
]);
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest) {
  try {
    const decoded = auth(req);
    if (!decoded) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    if (decoded.type === 'CLIENT') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    const staffDecoded = decoded as import('@/app/lib/auth').StaffTokenPayload;

    const formData = await req.formData();
    const file        = formData.get('file') as File | null;
    const claimId     = formData.get('claimId') as string | null;
    const fileType    = (formData.get('fileType') as string | null) ?? 'OTHER';
    const description = (formData.get('description') as string | null) ?? null;
    const expiresAt   = (formData.get('expiresAt')   as string | null);

    if (!file)    return NextResponse.json({ error: 'Fichier manquant' },          { status: 400 });
    if (!claimId) return NextResponse.json({ error: 'claimId requis' },            { status: 400 });
    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json({ error: 'Type de fichier non autorisé' },          { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Fichier trop volumineux (max 10 Mo)' },   { status: 400 });
    }

    const claim = await prisma.claim.findUnique({ where: { claimId } });
    if (!claim) return NextResponse.json({ error: 'Dossier introuvable' },         { status: 404 });

    // Sanitize filename — reject path traversal attempts
    const safeName = path.basename(file.name).replace(/[^a-zA-Z0-9._-]/g, '_');
    const ext      = path.extname(safeName);
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', claimId);
    const filePath  = path.join(uploadDir, fileName);

    await mkdir(uploadDir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const doc = await prisma.claimDocument.create({
      data: {
        claimId,
        fileName,
        originalName: safeName,
        fileType:     fileType as never,
        mimeType:     file.type,
        fileSize:     file.size,
        filePath:     `/uploads/${claimId}/${fileName}`,
        uploadedBy:   staffDecoded.userId,
        description,
        expiresAt:    expiresAt ? new Date(expiresAt) : null,
        status:       'UPLOADED',
      },
    });

    return NextResponse.json(doc, { status: 201 });
  } catch (err) {
    console.error('[upload] unhandled error:', err);
    const message = err instanceof Error ? err.message : 'Erreur serveur';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
