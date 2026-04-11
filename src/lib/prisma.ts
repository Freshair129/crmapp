import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

/** Strip Prisma-specific query params that pg.Pool doesn't understand */
function cleanDbUrl(url: string): string {
  try {
    const parsed = new URL(url)
    parsed.searchParams.delete('pgbouncer')
    parsed.searchParams.delete('connection_limit')
    parsed.searchParams.delete('sslmode')
    return parsed.toString()
  } catch {
    return url
  }
}

export function getInternalPrisma(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  const pool = new pg.Pool({
    connectionString: cleanDbUrl(process.env.DATABASE_URL || ''),
    max: 1,                        // 1 connection per Lambda instance
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
    ssl: { rejectUnauthorized: false },
  })

  const adapter = new PrismaPg(pool)

  const client = new PrismaClient({
    adapter,
    log: ['warn', 'error'],
  })

  // Always cache globally — prevents creating multiple pools per Lambda invocation
  globalForPrisma.prisma = client

  return client;
}

export async function getPrisma(): Promise<PrismaClient> {
  return getInternalPrisma();
}
