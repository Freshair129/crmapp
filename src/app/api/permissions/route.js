import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { getPrisma } from '@/lib/prisma'
import { PERMISSIONS, can } from '@/lib/permissionMatrix'

const CONFIG_KEY = 'permission_matrix'

// GET — return current effective permissions (DB overrides merged onto static base)
export async function GET() {
  try {
    const prisma = await getPrisma()
    const row = await prisma.$queryRaw`
      SELECT value FROM app_config WHERE key = ${CONFIG_KEY} LIMIT 1
    `
    const overrides = row?.[0]?.value || null
    // Merge: DB overrides win over static base, but fill any missing keys from base
    const effective = {}
    for (const role of Object.keys(PERMISSIONS)) {
      effective[role] = { ...PERMISSIONS[role], ...(overrides?.[role] || {}) }
    }
    return NextResponse.json({ permissions: effective })
  } catch (err) {
    console.error('[permissions GET]', err)
    return NextResponse.json({ permissions: PERMISSIONS })
  }
}

// PATCH — save full role overrides
export async function PATCH(req) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.role || !can(session.user.role, 'system', 'view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { permissions } = await req.json()
    if (!permissions || typeof permissions !== 'object') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const prisma = await getPrisma()
    await prisma.$executeRaw`
      INSERT INTO app_config (key, value, updated_at)
      VALUES (${CONFIG_KEY}, ${JSON.stringify(permissions)}::jsonb, NOW())
      ON CONFLICT (key) DO UPDATE
        SET value = EXCLUDED.value,
            updated_at = NOW()
    `
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[permissions PATCH]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
