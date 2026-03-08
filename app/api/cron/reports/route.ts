import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { generateReport } from '@/app/lib/reports/generate-report';
import { formatPeriod, getNextRunDate } from '@/app/lib/reports/report-utils';

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || secret !== expected) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const now = new Date();

  // Find all active schedules due to run
  const dueSchedules = await prisma.reportSchedule.findMany({
    where: {
      isActive:  true,
      nextRunAt: { lte: now },
    },
  });

  const results: { id: string; name: string; success: boolean; error?: string }[] = [];

  for (const schedule of dueSchedules) {
    // Determine period (last complete period depending on frequency)
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to   = new Date(now.getFullYear(), now.getMonth(), 0);

    try {
      const report = await prisma.generatedReport.create({
        data: {
          name:        `${schedule.name} — ${from.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`,
          type:        schedule.type,
          format:      schedule.format,
          period:      formatPeriod(from, to),
          dateFrom:    from,
          dateTo:      to,
          sections:    schedule.sections,
          sentTo:      schedule.recipients,
          status:      'GENERATING',
          scheduleId:  schedule.id,
        },
      });

      const { downloadUrl, fileSize } = await generateReport({
        reportId:   report.id,
        type:       schedule.type,
        format:     schedule.format,
        dateFrom:   from,
        dateTo:     to,
        sections:   schedule.sections,
        recipients: schedule.recipients,
      });

      await prisma.generatedReport.update({
        where: { id: report.id },
        data:  { status: 'SENT', filePath: downloadUrl, fileSize },
      });

      // Update schedule run timestamps
      await prisma.reportSchedule.update({
        where: { id: schedule.id },
        data:  {
          lastRunAt: now,
          nextRunAt: getNextRunDate(schedule.frequency, 7),
        },
      });

      results.push({ id: schedule.id, name: schedule.name, success: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      // Update nextRunAt so it doesn't keep retrying immediately
      await prisma.reportSchedule.update({
        where: { id: schedule.id },
        data:  { nextRunAt: getNextRunDate(schedule.frequency, 7) },
      });
      results.push({ id: schedule.id, name: schedule.name, success: false, error: msg });
    }
  }

  return NextResponse.json({
    processed: dueSchedules.length,
    results,
    timestamp: now.toISOString(),
  });
}
