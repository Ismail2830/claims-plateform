import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { verifyAccessToken } from '@/app/lib/tokens';
import { generateReport } from '@/app/lib/reports/generate-report';
import { z } from 'zod';

function auth(req: NextRequest) {
  const h = req.headers.get('authorization');
  const cookieToken = req.cookies.get('admin_at')?.value;
  const token = h?.startsWith('Bearer ') ? h.substring(7) : cookieToken;
  if (!token) return null;
  try { return verifyAccessToken(token); } catch { return null; }
}

const GenerateSchema = z.object({
  name:       z.string().min(1),
  type:       z.enum(['MONTHLY_ACTIVITY','SINISTRALITE','FINANCIAL','ACAPS_COMPLIANCE','MANAGER_PERFORMANCE','CUSTOM']),
  format:     z.enum(['PDF','EXCEL','CSV']),
  dateFrom:   z.string().min(1),
  dateTo:     z.string().min(1),
  sections:   z.array(z.string()).default([]),
  recipients: z.array(z.string().email()).default([]),
});

export async function POST(req: NextRequest) {
  const user = auth(req);
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (user.type !== 'ADMIN') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = GenerateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Données invalides', details: parsed.error.issues }, { status: 400 });

  const { name, type, format, dateFrom, dateTo, sections, recipients } = parsed.data;
  const from = new Date(dateFrom);
  const to   = new Date(dateTo);

  if (isNaN(from.getTime()) || isNaN(to.getTime()) || from > to) {
    return NextResponse.json({ error: 'Période invalide' }, { status: 400 });
  }

  const { formatPeriod } = await import('@/app/lib/reports/report-utils');

  // Create DB record in PENDING
  const report = await prisma.generatedReport.create({
    data: {
      name,
      type,
      format,
      period:      formatPeriod(from, to),
      dateFrom:    from,
      dateTo:      to,
      sections,
      sentTo:      recipients,
      status:      'PENDING',
      generatedBy: user.userId,
    },
  });

  // Mark as GENERATING
  await prisma.generatedReport.update({
    where: { id: report.id },
    data:  { status: 'GENERATING' },
  });

  try {
    const { filePath, fileSize, downloadUrl } = await generateReport({
      reportId:    report.id,
      type,
      format,
      dateFrom:    from,
      dateTo:      to,
      sections,
      recipients:  recipients.length > 0 ? recipients : undefined,
      generatorId: user.userId,
    });

    const status = recipients.length > 0 ? 'SENT' : 'COMPLETED';
    const updated = await prisma.generatedReport.update({
      where: { id: report.id },
      data:  { status, filePath: downloadUrl, fileSize },
    });

    return NextResponse.json({ success: true, report: updated, downloadUrl }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur inconnue';
    await prisma.generatedReport.update({
      where: { id: report.id },
      data:  { status: 'FAILED', errorMessage: msg },
    });
    return NextResponse.json({ error: 'Erreur lors de la génération', details: msg }, { status: 500 });
  }
}
