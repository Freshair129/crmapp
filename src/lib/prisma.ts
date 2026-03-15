import { PrismaClient } from '../generated/prisma-client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function createPrismaClient(): PrismaClient {
  const pool = new pg.Pool({ 
    connectionString: process.env.DATABASE_URL,
    max: 10,             // Limit connections to prevent overhead
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  })
  const adapter = new PrismaPg(pool)
  
  const client = new PrismaClient({
    adapter,
    log: ['warn', 'error']  // query log ปิดไว้ — เปิดเมื่อ debug เท่านั้น
  })

  return client
}

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export async function getPrisma(): Promise<PrismaClient> {
  return prisma
}
