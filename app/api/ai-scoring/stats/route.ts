import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function GET() {
  try {
    const claims = await prisma.claim.findMany({
      select: {
        scoreRisque:     true,
        labelRisque:     true,
        decisionIa:      true,
        scoreConfidence: true,
        declarationDate: true,
      },
    });

    const scored   = claims.filter(c => c.scoreRisque !== null);
    const unscored = claims.filter(c => c.scoreRisque === null);

    const faible     = scored.filter(c => c.labelRisque === 'FAIBLE');
    const moyen      = scored.filter(c => c.labelRisque === 'MOYEN');
    const eleve      = scored.filter(c => c.labelRisque === 'ELEVE');
    const suspicieux = scored.filter(c => c.labelRisque === 'SUSPICIEUX');

    const total = scored.length;

    const distribution = {
      faible:     { count: faible.length,     percentage: total > 0 ? (faible.length     / total) * 100 : 0 },
      moyen:      { count: moyen.length,      percentage: total > 0 ? (moyen.length      / total) * 100 : 0 },
      eleve:      { count: eleve.length,      percentage: total > 0 ? (eleve.length      / total) * 100 : 0 },
      suspicieux: { count: suspicieux.length, percentage: total > 0 ? (suspicieux.length / total) * 100 : 0 },
    };

    const avgScore = total > 0
      ? scored.reduce((sum, c) => sum + (c.scoreRisque ?? 0), 0) / total
      : 0;

    const withConf    = scored.filter(c => c.scoreConfidence !== null);
    const avgConfidence = withConf.length > 0
      ? (withConf.reduce((sum, c) => sum + (c.scoreConfidence ?? 0), 0) / withConf.length) * 100
      : 0;

    const autoApproved = scored.filter(c => c.decisionIa === 'AUTO_APPROUVER').length;
    const needsReview  = scored.filter(c => c.decisionIa === 'REVISION_MANUELLE').length;
    const escalated    = scored.filter(c => c.decisionIa === 'ESCALADER').length;

    const fraudRate = total > 0
      ? ((eleve.length + suspicieux.length) / total) * 100
      : 0;

    // Trend: compare avg score this calendar month vs last month
    const now             = new Date();
    const startThisMonth  = new Date(now.getFullYear(), now.getMonth(), 1);
    const startLastMonth  = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const thisMonth = scored.filter(c => new Date(c.declarationDate) >= startThisMonth);
    const lastMonth = scored.filter(c => {
      const d = new Date(c.declarationDate);
      return d >= startLastMonth && d < startThisMonth;
    });

    const avgThis = thisMonth.length > 0
      ? thisMonth.reduce((s, c) => s + (c.scoreRisque ?? 0), 0) / thisMonth.length
      : 0;
    const avgLast = lastMonth.length > 0
      ? lastMonth.reduce((s, c) => s + (c.scoreRisque ?? 0), 0) / lastMonth.length
      : 0;

    const trendLastMonth = avgLast > 0 ? ((avgThis - avgLast) / avgLast) * 100 : 0;

    return NextResponse.json({
      distribution,
      totalScored:    scored.length,
      totalUnscored:  unscored.length,
      avgScore:       Math.round(avgScore * 10) / 10,
      avgConfidence:  Math.round(avgConfidence * 10) / 10,
      autoApproved,
      needsReview,
      escalated,
      fraudRate:      Math.round(fraudRate * 10) / 10,
      trendLastMonth: Math.round(trendLastMonth * 10) / 10,
    });
  } catch (err) {
    console.error('[ai-scoring/stats] Error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
