import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Use WebSockets for Neon serverless (required for local dev)
neonConfig.webSocketConstructor = ws;

declare global {
  var __prisma: PrismaClient | undefined;
}

const createPrismaClient = () => {
  const connectionString = process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/fallback';
  const adapter = new PrismaNeon({ connectionString });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
};

export const prisma = globalThis.__prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}