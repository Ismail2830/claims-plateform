import { NextRequest } from 'next/server';
import { verifyAccessToken, AccessTokenPayload } from './tokens';

// Use the same token types as the login/auth routes (type: 'CLIENT' | 'ADMIN')
export type ClientTokenPayload = Extract<AccessTokenPayload, { type: 'CLIENT' }>;
export type StaffTokenPayload = Extract<AccessTokenPayload, { type: 'ADMIN' }>;

export interface Context {
  req?: NextRequest;
  clientToken?: ClientTokenPayload;
  staffToken?: StaffTokenPayload;
}

export async function createTRPCContext(opts: { req?: NextRequest }): Promise<Context> {
  const { req } = opts;

  if (!req) {
    return { req };
  }

  // Extract token from Authorization header
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return { req };
  }

  try {
    // Use verifyAccessToken which uses JWT_ACCESS_SECRET || JWT_SECRET
    // — the same secret used by the login/verify-2fa routes
    const payload = verifyAccessToken(token);
    if (payload.type === 'CLIENT') {
      return { req, clientToken: payload };
    } else if (payload.type === 'ADMIN') {
      return { req, staffToken: payload };
    }
    return { req };
  } catch {
    // Token invalid or expired
    return { req };
  }
}

export type CreateTRPCContext = typeof createTRPCContext;