import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { verifyAccessToken } from '@/app/lib/tokens';
import { z } from 'zod';
import { getCronExpression, getNextRunDate } from '@/app/lib/reports/report-utils';

function auth(req: NextRequest) {
  const h = req.headers.get('authorization');
  const cookieToken = req.cookies.get('admin_at')?.value;
  const token = h?.startsWith('Bearer ') ? h.substring(7) : cookieToken;
  if (!token) return null;
  try { return verifyAccessToken(token); } catch { return null; }
}

export async function GET(req: NextRequest) {
  const user = auth(req);
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  try {
    const schedules = await prisma.reportSchedule.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        creator: { select: { firstName: true, lastName: true } },
        _count:  { select: { reports: true } },
      },
    });
    return NextResponse.json(schedules);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[GET /api/reports/schedules]', msg);
    return NextResponse.json({ error: 'Erreur serveur', details: msg }, { status: 500 });
  }
}

const ScheduleSchema = z.object({
  name:       z.string().min(1),
  type:       z.enum(['MONTHLY_ACTIVITY','SINISTRALITE','FINANCIAL','ACAPS_COMPLIANCE','MANAGER_PERFORMANCE','CUSTOM']),
  format:     z.enum(['PDF','EXCEL','CSV']),
  frequency:  z.enum(['DAILY','WEEKLY','MONTHLY','QUARTERLY','ANNUAL']),
  recipients: z.array(z.string().email()).min(1),
  sections:   z.array(z.string()).default([]),
  hour:       z.number().int().min(0).max(23).default(7),
  weekDay:    z.number().int().min(0).max(6).optional(),
});

export async function POST(req: NextRequest) {
  const user = auth(req);
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  if (user.type !== 'ADMIN') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  const body   = await req.json().catch(() => null);
  const parsed = ScheduleSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Données invalides', details: parsed.error.issues }, { status: 400 });

  const { name, type, format, frequency, recipients, sections, hour, weekDay } = parsed.data;
  const cronExpression = getCronExpression(frequency, hour, weekDay);
  const nextRunAt      = getNextRunDate(frequency, hour);

  try {
    const schedule = await prisma.reportSchedule.create({
      data: {
        name,
        type,
        format,
        frequency,
        cronExpression,
        recipients,
        sections,
        nextRunAt,
        createdBy: user.userId,
      },
    });
    return NextResponse.json(schedule, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[POST /api/reports/schedules]', msg);
    return NextResponse.json({ error: 'Erreur serveur', details: msg }, { status: 500 });
  }
}
