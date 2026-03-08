import { jwtVerify } from 'jose';
import { NextResponse } from 'next/server';
import type { UserRole } from './permissions';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SessionUser {
  userId: string;
  email: string;
  role: UserRole;
  type: 'ADMIN';
}

type RequireRoleResult =
  | { ok: true; user: SessionUser }
  | { ok: false; response: NextResponse };

// ─── Secret helper ────────────────────────────────────────────────────────────

function getAccessSecret(): Uint8Array {
  const raw =
    process.env.JWT_ACCESS_SECRET ||
    process.env.JWT_SECRET ||
    'change-this-access-secret-in-production';
  return new TextEncoder().encode(raw);
}

// ─── requireRole ─────────────────────────────────────────────────────────────
/**
 * Extract + verify the JWT from the request, then check the caller's role.
 *
 * Usage:
 *   const auth = await requireRole(request, ['EXPERT', 'MANAGER_JUNIOR']);
 *   if (!auth.ok) return auth.response;
 *   const { user } = auth;
 */
export async function requireRole(
  request: Request,
  allowedRoles: UserRole[]
): Promise<RequireRoleResult> {
  // 1. Pull token from Authorization header or admin_at cookie
  let token: string | undefined;

  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  }

  if (!token) {
    // Cookies are on the raw Headers object in Route Handlers
    const cookieHeader = request.headers.get('cookie') ?? '';
    const match = cookieHeader.match(/(?:^|;\s*)admin_at=([^;]+)/);
    if (match) token = match[1];
  }

  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }),
    };
  }

  // 2. Verify token
  let payload: { type?: string; role?: string; userId?: string; email?: string };
  try {
    const { payload: p } = await jwtVerify(token, getAccessSecret());
    payload = p as typeof payload;
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Token invalide ou expiré' }, { status: 401 }),
    };
  }

  // 3. Must be an ADMIN-type token
  if (payload.type !== 'ADMIN') {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 }),
    };
  }

  const role = payload.role as UserRole;

  // 4. Check allowed roles
  if (!allowedRoles.includes(role)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Vous n\'avez pas les droits nécessaires pour cette action' },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true,
    user: {
      userId: payload.userId!,
      email:  payload.email!,
      role,
      type: 'ADMIN',
    },
  };
}

// ─── getClaimsScope ───────────────────────────────────────────────────────────
/**
 * Returns a Prisma `where` clause that scopes claims to what the caller
 * is allowed to see based on their role.
 *
 * EXPERT         → only claims assigned to them
 * MANAGER_JUNIOR → claims assigned to members of their team
 * MANAGER_SENIOR / ADMIN / SUPER_ADMIN → all claims
 */
export async function getClaimsScope(
  userId: string,
  role: UserRole
): Promise<Record<string, unknown>> {
  if (role === 'EXPERT') {
    return { assignedTo: userId };
  }

  if (role === 'MANAGER_JUNIOR') {
    // Dynamically import prisma to keep this module lightweight for edge
    const { prisma } = await import('@/app/lib/prisma');
    const memberships = await prisma.teamMember.findMany({
      where: { userId },
      select: { team: { select: { members: { select: { userId: true } } } } },
    });
    const teamUserIds = memberships.flatMap((m) =>
      m.team.members.map((mb) => mb.userId)
    );
    // Include own claims too
    const ids = Array.from(new Set([userId, ...teamUserIds]));
    return { assignedTo: { in: ids } };
  }

  // MANAGER_SENIOR, ADMIN, SUPER_ADMIN → no restriction
  return {};
}
