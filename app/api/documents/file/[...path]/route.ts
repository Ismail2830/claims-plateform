/**
 * GET /api/documents/file/[...path]
 * Streams a stored document file with the correct Content-Type header.
 * Path segments are joined to form the relative path under /public/uploads/.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createReadStream, statSync, existsSync } from 'fs';
import path from 'path';
import { verifyAccessToken } from '@/app/lib/tokens';

function auth(req: NextRequest) {
  const h = req.headers.get('authorization');
  const cookieToken = req.cookies.get('admin_at')?.value;
  const token = h?.startsWith('Bearer ') ? h.substring(7) : cookieToken;
  if (!token) return null;
  try { return verifyAccessToken(token); } catch { return null; }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const decoded = auth(req);
  if (!decoded) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { path: segments } = await params;

  // Security: prevent path traversal
  const joined   = segments.join('/');
  const safePath = path.normalize(joined).replace(/^(\.\.(\/|\\|$))+/, '');
  const fullPath = path.join(process.cwd(), 'public', 'uploads', safePath);

  // Ensure resolved path is inside uploads directory
  const uploadsRoot = path.join(process.cwd(), 'public', 'uploads');
  if (!fullPath.startsWith(uploadsRoot)) {
    return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });
  }

  if (!existsSync(fullPath)) {
    return NextResponse.json({ error: 'Fichier introuvable' }, { status: 404 });
  }

  const stat = statSync(fullPath);
  const ext  = path.extname(fullPath).toLowerCase();

  const MIME_MAP: Record<string, string> = {
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png':  'image/png',
    '.webp': 'image/webp',
    '.gif':  'image/gif',
    '.pdf':  'application/pdf',
  };
  const contentType = MIME_MAP[ext] ?? 'application/octet-stream';

  const stream = createReadStream(fullPath);
  const readable = new ReadableStream({
    start(controller) {
      stream.on('data', chunk => controller.enqueue(chunk));
      stream.on('end',  () => controller.close());
      stream.on('error', err => controller.error(err));
    },
  });

  return new NextResponse(readable, {
    status: 200,
    headers: {
      'Content-Type':   contentType,
      'Content-Length': String(stat.size),
      'Cache-Control':  'private, max-age=3600',
    },
  });
}
