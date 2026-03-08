import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { verifyAccessToken } from '@/app/lib/tokens';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

function auth(req: NextRequest) {
  const h = req.headers.get('authorization');
  const cookieToken = req.cookies.get('admin_at')?.value;
  const token = h?.startsWith('Bearer ') ? h.substring(7) : cookieToken;
  if (!token) return null;
  try { return verifyAccessToken(token); } catch { return null; }
}

const MIME_MAP: Record<string, string> = {
  pdf:  'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv:  'text/csv; charset=utf-8',
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = auth(req);
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id } = await params;
  const report = await prisma.generatedReport.findUnique({ where: { id } });
  if (!report || !report.filePath) {
    return NextResponse.json({ error: 'Fichier introuvable' }, { status: 404 });
  }

  const filename = report.filePath.replace(/^\/reports\//, '');
  const fullPath = join(process.cwd(), 'public', 'reports', filename);

  if (!existsSync(fullPath)) {
    return NextResponse.json({ error: 'Fichier non disponible sur le serveur' }, { status: 404 });
  }

  const ext      = filename.split('.').pop()?.toLowerCase() ?? '';
  const mimeType = MIME_MAP[ext] ?? 'application/octet-stream';
  const buffer   = readFileSync(fullPath);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type':        mimeType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length':      String(buffer.length),
      'Cache-Control':       'no-cache',
    },
  });
}
