import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

declare global {
  var __prisma: PrismaClient | undefined;
}

// Create connection pool with build-time fallback
const createPool = () => {
  // Allow build to proceed without DATABASE_URL during static generation
  const connectionString = process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/fallback';
  
  return new Pool({ 
    connectionString,
    // Vercel serverless optimization
    max: 1,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
};

// Only create pool and adapter if DATABASE_URL exists or we're not in build mode
const createPrismaClient = () => {
  if (!process.env.DATABASE_URL && process.env.NODE_ENV === 'production') {
    console.warn('DATABASE_URL not set in production environment');
  }
  
  try {
    const pool = createPool();
    const adapter = new PrismaPg(pool);
    
    return new PrismaClient({ 
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  } catch (error) {
    // Fallback for build time when DATABASE_URL might not be available
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }
};

export const prisma = globalThis.__prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}