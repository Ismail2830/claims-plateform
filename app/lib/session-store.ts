/**
 * WhatsApp Chatbot Session Store
 * Backed by Upstash Redis (ioredis client)
 * TTL: 30 minutes per session
 */

import Redis from 'ioredis';

// ─── Redis Client (singleton) ─────────────────────────────────────────────────

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    const url = process.env.UPSTASH_REDIS_URL;
    if (!url) {
      throw new Error('UPSTASH_REDIS_URL environment variable is not set.');
    }
    redis = new Redis(url, {
      // Upstash requires TLS; ioredis respects rediss:// scheme automatically
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
      lazyConnect: true,
    });

    redis.on('error', (err) => {
      console.error('[Redis] Connection error:', err.message);
    });
  }
  return redis;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserSession {
  step: string;
  context: Record<string, string>;
  clientId?: string;
}

const SESSION_TTL_SECONDS = 60 * 30; // 30 minutes

function sessionKey(phone: string): string {
  return `wa:${phone}`;
}

const DEFAULT_SESSION: UserSession = { step: 'MENU', context: {} };

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Retrieve session for a phone number.
 * Returns a default { step: 'MENU', context: {} } if not found.
 */
export async function getSession(phone: string): Promise<UserSession> {
  try {
    const raw = await getRedis().get(sessionKey(phone));
    if (!raw) return { ...DEFAULT_SESSION, context: {} };
    return JSON.parse(raw) as UserSession;
  } catch (err) {
    console.error('[Session] getSession error:', err);
    return { ...DEFAULT_SESSION, context: {} };
  }
}

/**
 * Persist a session for a phone number with 30-minute TTL.
 */
export async function setSession(phone: string, session: UserSession): Promise<void> {
  try {
    await getRedis().set(sessionKey(phone), JSON.stringify(session), 'EX', SESSION_TTL_SECONDS);
  } catch (err) {
    console.error('[Session] setSession error:', err);
  }
}

/**
 * Delete a session (e.g. after flow completion or agent handoff).
 */
export async function clearSession(phone: string): Promise<void> {
  try {
    await getRedis().del(sessionKey(phone));
  } catch (err) {
    console.error('[Session] clearSession error:', err);
  }
}
