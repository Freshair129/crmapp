import path from 'node:path'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  earlyAccess: true,
  schema: path.join('prisma', 'schema.prisma'),
  migrate: {
    async adapter(env) {
      const { PrismaPg } = await import('@prisma/adapter-pg')
      const pg = await import('pg')
      const pool = new pg.default.Pool({
        connectionString: env.DIRECT_URL || env.DATABASE_URL,
      })
      return new PrismaPg(pool)
    },
  },
})
