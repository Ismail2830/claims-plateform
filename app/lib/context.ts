import { NextRequest } from 'next/server';
import { validateClientToken, validateStaffToken, ClientTokenPayload, StaffTokenPayload } from './auth';

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
    // Try to validate as client token first
    const clientToken = validateClientToken(token);
    return { req, clientToken };
  } catch (clientError) {
    try {
      // If client validation fails, try staff token
      const staffToken = validateStaffToken(token);
      return { req, staffToken };
    } catch (staffError) {
      // If both fail, return empty context
      return { req };
    }
  }
}

export type CreateTRPCContext = typeof createTRPCContext;