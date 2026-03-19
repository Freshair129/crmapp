import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

export function getInternalPrisma(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  // Next.js 15 Turbopack optimization: Use Driver Adapter for 'client' engine
  // This satisfies both Node.js and Edge/Serverless environments.
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaPg(pool)
  
  const client = new PrismaClient({
    adapter,
    log: ['warn', 'error']
  })

  // Cache singleton on globalThis for warm reuse (both dev and production)
  globalForPrisma.prisma = client

  return client;
}

export async function getPrisma(): Promise<PrismaClient> {
  return getInternalPrisma();
}
