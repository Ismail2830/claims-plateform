import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { verifyAccessToken } from '@/app/lib/tokens';
import { unlinkSync, existsSync } from 'fs';
import { join } from 'path';

function auth(req: NextRequest) {
  const h = req.headers.get('authorization');
  const cookieToken = req.cookies.get('admin_at')?.value;
  const token = h?.startsWith('Bearer ') ? h.substring(7) : cookieToken;
  if (!token) return null;
  try { return verifyAccessToken(token); } catch { return null; }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = auth(req);
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id } = await params;
  const report = await prisma.generatedReport.findUnique({
    where: { id },
    include: { generator: { select: { firstName: true, lastName: true } } },
  });
  if (!report) return NextResponse.json({ error: 'Rapport introuvable' }, { status: 404 });

  return NextResponse.json(report);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = auth(req);
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (user.type !== 'ADMIN') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  const { id } = await params;
  const report = await prisma.generatedReport.findUnique({ where: { id } });
  if (!report) return NextResponse.json({ error: 'Rapport introuvable' }, { status: 404 });

  // Delete physical file if it exists
  if (report.filePath) {
    const filename = report.filePath.replace(/^\/reports\//, '');
    const fullPath = join(process.cwd(), 'public', 'reports', filename);
    if (existsSync(fullPath)) {
      try { unlinkSync(fullPath); } catch { /* ignore */ }
    }
  }

  await prisma.generatedReport.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
