import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { verifyAccessToken } from '@/app/lib/tokens';
import { fetchMonthlyData } from '@/app/lib/reports/generate-report';

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
  if (user.type !== 'ADMIN') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  const sp = req.nextUrl.searchParams;
  const dateFromStr = sp.get('dateFrom');
  const dateToStr   = sp.get('dateTo');

  if (!dateFromStr || !dateToStr) {
    return NextResponse.json({ error: 'Paramètres dateFrom et dateTo requis' }, { status: 400 });
  }

  const dateFrom = new Date(dateFromStr);
  const dateTo   = new Date(dateToStr);

  if (isNaN(dateFrom.getTime()) || isNaN(dateTo.getTime()) || dateFrom > dateTo) {
    return NextResponse.json({ error: 'Dates invalides' }, { status: 400 });
  }

  const data = await fetchMonthlyData(dateFrom, dateTo, user.userId);
  return NextResponse.json(data);
}
