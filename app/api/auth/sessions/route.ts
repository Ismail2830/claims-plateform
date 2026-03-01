import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import {
  verifyAccessToken,
  hashToken,
  CLIENT_ACCESS_COOKIE,
} from '@/app/lib/tokens';

// ── Helper: extract and verify the client access token ────────────────────
function getClientId(request: NextRequest): string | null {
  try {
    const cookie = request.cookies.get(CLIENT_ACCESS_COOKIE)?.value;
    const bearer = request.headers.get('authorization')?.replace('Bearer ', '');
    const raw = cookie || bearer;
    if (!raw) return null;
    const payload = verifyAccessToken(raw);
    if ('clientId' in payload) return payload.clientId;
    return null;
  } catch {
    return null;
  }
}

// ── GET /api/auth/sessions — list active sessions for the client ───────────
export async function GET(request: NextRequest) {
  const clientId = getClientId(request);
  if (!clientId) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const sessions = await prisma.session.findMany({
    where: {
      clientId,
      isRevoked: false,
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      ipAddress: true,
      userAgent: true,
      deviceName: true,
      rememberMe: true,
      lastActivity: true,
      expiresAt: true,
      createdAt: true,
    },
    orderBy: { lastActivity: 'desc' },
  });

  return NextResponse.json({ success: true, data: sessions });
}

// ── DELETE /api/auth/sessions — revoke a session by id ────────────────────
export async function DELETE(request: NextRequest) {
  const clientId = getClientId(request);
  if (!clientId) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  let sessionId: string;
  try {
    const body = await request.json();
    sessionId = body.sessionId;
  } catch {
    return NextResponse.json({ success: false, message: 'sessionId is required' }, { status: 400 });
  }

  if (!sessionId) {
    return NextResponse.json({ success: false, message: 'sessionId is required' }, { status: 400 });
  }

  // Verify ownership before revoking
  const session = await prisma.session.findFirst({
    where: { id: sessionId, clientId },
  });

  if (!session) {
    return NextResponse.json({ success: false, message: 'Session not found' }, { status: 404 });
  }

  await prisma.session.update({
    where: { id: sessionId },
    data: { isRevoked: true },
  });

  return NextResponse.json({ success: true, message: 'Session revoked' });
}

// ── DELETE /api/auth/sessions?all=true — revoke ALL other sessions ─────────
// Implemented via query param on the same DELETE handler above; we handle it:
export async function PATCH(request: NextRequest) {
  // PATCH /api/auth/sessions/revoke-others: revoke all sessions except the current one
  const clientId = getClientId(request);
  if (!clientId) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  let currentSessionId: string | undefined;
  try {
    const body = await request.json();
    currentSessionId = body.currentSessionId;
  } catch {
    // ok — currentSessionId can be absent
  }

  await prisma.session.updateMany({
    where: {
      clientId,
      isRevoked: false,
      ...(currentSessionId ? { id: { not: currentSessionId } } : {}),
    },
    data: { isRevoked: true },
  });

  return NextResponse.json({ success: true, message: 'All other sessions revoked' });
}
