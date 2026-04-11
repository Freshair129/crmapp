import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

/** Strip Prisma-specific query params (pgbouncer, connection_limit) that pg.Pool doesn't understand */
function cleanDbUrl(url: string): string {
  try {
    const parsed = new URL(url)
    parsed.searchParams.delete('pgbouncer')
    parsed.searchParams.delete('connection_limit')
    return parsed.toString()
  } catch {
    return url
  }
}

export function getInternalPrisma(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  // Next.js 15 Turbopack optimization: Use Driver Adapter for 'client' engine
  // This satisfies both Node.js and Edge/Serverless environments.
  // Use cleaned URL — strip pgbouncer=true & connection_limit which pg.Pool doesn't understand
  const pool = new pg.Pool({
    connectionString: cleanDbUrl(process.env.DATABASE_URL || ''),
    max: 2,                    // limit connections per serverless invocation
    idleTimeoutMillis: 10000,  // release idle connections quickly
    connectionTimeoutMillis: 10000,
    ssl: { rejectUnauthorized: false }, // required for Supabase
  })
  const adapter = new PrismaPg(pool)
  
  const client = new PrismaClient({
    adapter,
    log: ['warn', 'error']
  })

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = client
  }
  
  return client;
}

export async function getPrisma(): Promise<PrismaClient> {
  return getInternalPrisma();
}
