import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

interface WeeklyTrend {
  week:       string;
  faible:     number;
  moyen:      number;
  eleve:      number;
  suspicieux: number;
  avgScore:   number;
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon ...
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET() {
  try {
    // Last 8 complete weeks from today
    const now      = new Date();
    const cutoff   = new Date(now.getTime() - 8 * 7 * 24 * 60 * 60 * 1000);

    const claims = await prisma.claim.findMany({
      where: {
        scoredAt:   { not: null, gte: cutoff },
        scoreRisque: { not: null },
      },
      select: {
        scoreRisque: true,
        labelRisque: true,
        scoredAt:    true,
      },
    });

    // Group by week
    const weeks = new Map<string, { faible: number; moyen: number; eleve: number; suspicieux: number; scores: number[] }>();

    // Pre-populate 8 weeks so weeks without data still appear
    for (let i = 7; i >= 0; i--) {
      const weekStart = getWeekStart(new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000));
      const key = weekStart.toISOString().slice(0, 10);
      if (!weeks.has(key)) {
        weeks.set(key, { faible: 0, moyen: 0, eleve: 0, suspicieux: 0, scores: [] });
      }
    }

    for (const claim of claims) {
      if (!claim.scoredAt) continue;
      const weekStart = getWeekStart(claim.scoredAt);
      const key = weekStart.toISOString().slice(0, 10);

      const entry = weeks.get(key) ?? { faible: 0, moyen: 0, eleve: 0, suspicieux: 0, scores: [] };

      switch (claim.labelRisque) {
        case 'FAIBLE':     entry.faible++;     break;
        case 'MOYEN':      entry.moyen++;      break;
        case 'ELEVE':      entry.eleve++;      break;
        case 'SUSPICIEUX': entry.suspicieux++; break;
      }
      if (claim.scoreRisque !== null) entry.scores.push(claim.scoreRisque);

      weeks.set(key, entry);
    }

    // Sort by date and label S1..S8
    const sorted = [...weeks.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-8);

    const trend: WeeklyTrend[] = sorted.map(([, entry], idx) => ({
      week:       `S${idx + 1}`,
      faible:     entry.faible,
      moyen:      entry.moyen,
      eleve:      entry.eleve,
      suspicieux: entry.suspicieux,
      avgScore:   entry.scores.length > 0
        ? Math.round(entry.scores.reduce((s, v) => s + v, 0) / entry.scores.length)
        : 0,
    }));

    return NextResponse.json(trend);
  } catch (err) {
    console.error('[ai-scoring/trends] Error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
