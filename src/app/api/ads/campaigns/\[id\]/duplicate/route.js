/**
 * POST /api/ads/campaigns/[id]/duplicate
 * Duplicate a campaign in Meta
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { can } from '@/lib/permissionMatrix'
import { logger } from '@/lib/logger'
import * as adsOptimizeRepo from '@/lib/repositories/adsOptimizeRepo'

export async function POST(request, { params }) {
  try {
    const { id } = params
    const session = await getServerSession(authOptions)

    // Auth check
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = session.user.role
    if (!can(role, 'marketing', 'create')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { name } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'name required (string)' }, { status: 400 })
    }

    const result = await adsOptimizeRepo.duplicateCampaign(id, name, session.user.id)

    return NextResponse.json(
      {
        success: true,
        sourceCampaignId: id,
        newCampaignId: result.id,
        newCampaignName: name,
      },
      { status: 201 },
    )
  } catch (error) {
    if (error.name === 'RateLimitError') {
      return NextResponse.json(
        { error: 'Rate limited by Meta API', retryAfter: error.retryAfter },
        { status: 429, headers: { 'Retry-After': error.retryAfter } },
      )
    }

    logger.error('[ads/duplicate]', 'POST error', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
