import path from 'node:path'
import { defineConfig } from 'prisma/config'

// Prisma v7.5.0: migrate.adapter removed from PrismaConfig type
// Driver adapter is configured in src/lib/prisma.ts (PrismaClient constructor)
export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
})
