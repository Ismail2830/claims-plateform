import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { verifyAccessToken } from '@/app/lib/tokens';
import { generateReport } from '@/app/lib/reports/generate-report';
import { formatPeriod } from '@/app/lib/reports/report-utils';

function auth(req: NextRequest) {
  const h = req.headers.get('authorization');
  const cookieToken = req.cookies.get('admin_at')?.value;
  const token = h?.startsWith('Bearer ') ? h.substring(7) : cookieToken;
  if (!token) return null;
  try { return verifyAccessToken(token); } catch { return null; }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = auth(req);
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (user.type !== 'ADMIN') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  const { id } = await params;
  const schedule = await prisma.reportSchedule.findUnique({ where: { id } });
  if (!schedule) return NextResponse.json({ error: 'Planning introuvable' }, { status: 404 });

  const now   = new Date();
  const from  = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const to    = new Date(now.getFullYear(), now.getMonth(), 0);

  const report = await prisma.generatedReport.create({
    data: {
      name:        `[TEST] ${schedule.name} — ${from.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`,
      type:        schedule.type,
      format:      schedule.format,
      period:      formatPeriod(from, to),
      dateFrom:    from,
      dateTo:      to,
      sections:    schedule.sections,
      sentTo:      schedule.recipients,
      status:      'GENERATING',
      generatedBy: user.userId,
      scheduleId:  schedule.id,
    },
  });

  try {
    const { downloadUrl, fileSize } = await generateReport({
      reportId:    report.id,
      type:        schedule.type,
      format:      schedule.format,
      dateFrom:    from,
      dateTo:      to,
      sections:    schedule.sections,
      recipients:  schedule.recipients,
      generatorId: user.userId,
    });

    await prisma.generatedReport.update({
      where: { id: report.id },
      data:  { status: 'SENT', filePath: downloadUrl, fileSize },
    });

    return NextResponse.json({ success: true, reportId: report.id, downloadUrl });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue';
    await prisma.generatedReport.update({
      where: { id: report.id },
      data:  { status: 'FAILED', errorMessage: msg },
    });
    return NextResponse.json({ error: 'Erreur lors du test', details: msg }, { status: 500 });
  }
}
