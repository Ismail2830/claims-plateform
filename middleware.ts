import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// ── Secrets (TextEncoder needed for jose) ─────────────────────────────────
function getAccessSecret() {
  const raw =
    process.env.JWT_ACCESS_SECRET ||
    process.env.JWT_SECRET ||
    'change-this-access-secret-in-production';
  return new TextEncoder().encode(raw);
}

// ── Route categories ──────────────────────────────────────────────────────
const CLIENT_ROUTES = ['/dashboard/client', '/claims/create'];

const ADMIN_ROUTES = [
  '/dashboard/admin',
  '/dashboard/super-admin',
  '/dashboard/manager',
  '/dashboard/manager-senior',
  '/dashboard/manager-junior',
  '/dashboard/expert',
];

const AUTH_PAGES = ['/auth/login', '/auth/register', '/auth/admin'];

function matchesAny(pathname: string, routes: string[]): boolean {
  return routes.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getAccessSecret());
    return payload as { type?: string; role?: string; clientId?: string; userId?: string };
  } catch {
    return null;
  }
}

// ── Middleware ────────────────────────────────────────────────────────────
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── CORS for API routes ────────────────────────────────────────────────
  if (pathname.startsWith('/api/')) {
    const response = NextResponse.next();
    const origin = request.headers.get('origin');
    const allowedOrigins = [
      'http://localhost:3000',
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
    ].filter(Boolean) as string[];

    if (origin && (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development')) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    }
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Allow-Credentials', 'true');

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: response.headers });
    }
    return response;
  }

  // ── Client route protection ────────────────────────────────────────────
  if (matchesAny(pathname, CLIENT_ROUTES)) {
    const token =
      request.cookies.get('client_at')?.value ||
      request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.redirect(new URL('/auth/login?reason=session_expired', request.url));
    }
    const payload = await verifyToken(token);
    if (!payload || payload.type !== 'CLIENT') {
      const res = NextResponse.redirect(new URL('/auth/login?reason=session_expired', request.url));
      res.cookies.set('client_at', '', { maxAge: 0, path: '/' });
      return res;
    }
  }

  // ── Admin route protection ─────────────────────────────────────────────
  if (matchesAny(pathname, ADMIN_ROUTES)) {
    const token =
      request.cookies.get('admin_at')?.value ||
      request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.redirect(new URL('/auth/admin?reason=session_expired', request.url));
    }
    const payload = await verifyToken(token);
    if (!payload || payload.type !== 'ADMIN') {
      const res = NextResponse.redirect(new URL('/auth/admin?reason=session_expired', request.url));
      res.cookies.set('admin_at', '', { maxAge: 0, path: '/' });
      return res;
    }
    // Super-admin role guard
    if (pathname.startsWith('/dashboard/super-admin') && payload.role !== 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/dashboard/admin', request.url));
    }
  }

  // ── Redirect authenticated users away from login pages ────────────────
  if (matchesAny(pathname, AUTH_PAGES)) {
    const clientToken = request.cookies.get('client_at')?.value;
    const adminToken  = request.cookies.get('admin_at')?.value;

    if (clientToken && (await verifyToken(clientToken))?.type === 'CLIENT') {
      return NextResponse.redirect(new URL('/dashboard/client', request.url));
    }
    if (adminToken) {
      const adminPayload = await verifyToken(adminToken);
      if (adminPayload?.type === 'ADMIN') {
        const roleRedirects: Record<string, string> = {
          SUPER_ADMIN:    '/dashboard/super-admin',
          ADMIN:          '/dashboard/admin',
          MANAGER_SENIOR: '/dashboard/manager-senior',
          MANAGER_JUNIOR: '/dashboard/manager-junior',
          EXPERT:         '/dashboard/expert',
        };
        const dest = roleRedirects[adminPayload.role ?? ''] ?? '/dashboard/admin';
        return NextResponse.redirect(new URL(dest, request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
};