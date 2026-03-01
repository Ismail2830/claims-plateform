/**
 * Token utilities for API routes (Node.js runtime — uses jsonwebtoken).
 * For Edge runtime (middleware), use jose directly instead of this file.
 */
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// ── Secrets ────────────────────────────────────────────────────────────────
export const ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET ||
  process.env.JWT_SECRET ||
  'change-this-access-secret-in-production';

export const REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'change-this-refresh-secret-in-production';

// ── Access token (15 min) ──────────────────────────────────────────────────
export type AccessTokenPayload =
  | { clientId: string; email: string; cin: string; type: 'CLIENT' }
  | { userId: string; email: string; role: string; type: 'ADMIN' };

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: '15m' });
}

export function verifyAccessToken(token: string): AccessTokenPayload & { iat: number; exp: number } {
  return jwt.verify(token, ACCESS_SECRET) as AccessTokenPayload & { iat: number; exp: number };
}

// ── Refresh token (7 or 30 days) ──────────────────────────────────────────
export type RefreshTokenPayload =
  | { clientId: string; type: 'CLIENT' }
  | { userId: string; type: 'ADMIN' };

/** Signs a refresh token with configurable expiry (default 7d). */
export function signRefreshToken(
  payload: RefreshTokenPayload,
  expiresIn: string = '7d',
): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn } as any);
}

export function verifyRefreshToken(token: string): RefreshTokenPayload & { iat: number; exp: number } {
  return jwt.verify(token, REFRESH_SECRET) as RefreshTokenPayload & { iat: number; exp: number };
}

// ── Hash token before storing in DB ───────────────────────────────────────
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// ── Parse a human-readable device name from User-Agent string ─────────────
export function parseDeviceName(userAgent: string): string {
  if (!userAgent) return 'Unknown device';
  // Mobile
  if (/iPhone/.test(userAgent)) return 'iPhone';
  if (/iPad/.test(userAgent)) return 'iPad';
  if (/Android/.test(userAgent) && /Mobile/.test(userAgent)) return 'Android Phone';
  if (/Android/.test(userAgent)) return 'Android Tablet';
  // Desktop OS
  if (/Windows NT/.test(userAgent)) return 'Windows PC';
  if (/Macintosh/.test(userAgent)) return 'Mac';
  if (/Linux/.test(userAgent)) return 'Linux PC';
  return 'Unknown device';
}

// ── Cookie settings ────────────────────────────────────────────────────────

/**
 * Build refresh-cookie options based on "remember me".
 * - rememberMe = true  → 30-day persistent cookie
 * - rememberMe = false → 7-day cookie (still persistent but shorter; users
 *   can also clear browser cookies for immediate logout)
 */
export function buildRefreshCookieOptions(rememberMe: boolean) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 60 * 60 * 24 * (rememberMe ? 30 : 7),
    path: '/',
  };
}

/** @deprecated Use buildRefreshCookieOptions(false) */
export const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 60 * 60 * 24 * 7,
  path: '/',
};

export const ACCESS_COOKIE_OPTIONS = {
  httpOnly: false, // JS-readable so existing Bearer-Header API calls work  
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 60 * 15, // 15 minutes in seconds
  path: '/',
};

// Cookie names
export const CLIENT_REFRESH_COOKIE = 'client_rt';
export const CLIENT_ACCESS_COOKIE  = 'client_at';
export const ADMIN_REFRESH_COOKIE  = 'admin_rt';
export const ADMIN_ACCESS_COOKIE   = 'admin_at';
