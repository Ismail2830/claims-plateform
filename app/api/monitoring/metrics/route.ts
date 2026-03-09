import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { prisma } from '@/app/lib/prisma';

/** Returns hourly counts of claims & documents over the last 24 h. */
export async function GET(req: NextRequest) {
  const auth = await requireRole(req, ['SUPER_ADMIN']);
  if (!auth.ok) return auth.response;

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [recentClaims, recentDocs] = await Promise.all([
    prisma.claim.findMany({
      where:   { createdAt: { gte: since } },
      select:  { createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.claimDocument.findMany({
      where:   { createdAt: { gte: since } },
      select:  { createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  // Aggregate into 24 buckets (1 per hour)
  const buckets: { hour: string; claims: number; documents: number }[] = [];
  for (let i = 0; i < 24; i++) {
    const start = new Date(since.getTime() + i * 60 * 60 * 1000);
    const end   = new Date(start.getTime() + 60 * 60 * 1000);
    const label = start.toISOString().slice(11, 16); // HH:MM
    buckets.push({
      hour:      label,
      claims:    recentClaims.filter((c: { createdAt: Date }) => c.createdAt >= start && c.createdAt < end).length,
      documents: recentDocs.filter((d: { createdAt: Date }) => d.createdAt >= start && d.createdAt < end).length,
    });
  }

  return NextResponse.json({ success: true, data: buckets });
}
