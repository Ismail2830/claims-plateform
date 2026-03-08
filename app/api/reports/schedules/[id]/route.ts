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

const PatchSchema = z.object({
  name:       z.string().min(1).optional(),
  recipients: z.array(z.string().email()).optional(),
  sections:   z.array(z.string()).optional(),
  isActive:   z.boolean().optional(),
  frequency:  z.enum(['DAILY','WEEKLY','MONTHLY','QUARTERLY','ANNUAL']).optional(),
  hour:       z.number().int().min(0).max(23).optional(),
  weekDay:    z.number().int().min(0).max(6).optional(),
});

export async function PATCH(
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
  const existing = await prisma.reportSchedule.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Planning introuvable' }, { status: 404 });

  const body   = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Données invalides', details: parsed.error.issues }, { status: 400 });

  const updateData: Record<string, unknown> = { ...parsed.data };

  if (parsed.data.frequency || parsed.data.hour !== undefined) {
    const freq    = parsed.data.frequency ?? existing.frequency;
    const hour    = parsed.data.hour ?? 7;
    const weekDay = parsed.data.weekDay;
    updateData.cronExpression = getCronExpression(freq, hour, weekDay);
    updateData.nextRunAt      = getNextRunDate(freq, hour);
  }

  const updated = await prisma.reportSchedule.update({ where: { id }, data: updateData });
  return NextResponse.json(updated);
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
  const existing = await prisma.reportSchedule.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Planning introuvable' }, { status: 404 });

  await prisma.reportSchedule.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
