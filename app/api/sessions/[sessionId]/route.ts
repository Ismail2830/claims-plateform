import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { prisma } from '@/app/lib/prisma';

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  const auth = await requireRole(req, ['SUPER_ADMIN']);
  if (!auth.ok) return auth.response;

  const { sessionId } = await context.params;

  const deleted = await prisma.activeSession.deleteMany({
    where: { id: sessionId },
  });

  if (deleted.count === 0) {
    return NextResponse.json({ success: false, error: 'Session introuvable' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
