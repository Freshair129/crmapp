/**
 * POST /api/ads/[type]/[id]/status
 * Pause or resume a campaign/adset/ad
 * type: campaign | adset | ad
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { can } from '@/lib/permissionMatrix'
import { logger } from '@/lib/logger'
import * as adsOptimizeRepo from '@/lib/repositories/adsOptimizeRepo'

const VALID_TYPES = ['campaign', 'adset', 'ad']

export async function POST(request, { params }) {
  try {
    const { type, id } = params
    const session = await getServerSession(authOptions)

    // Auth check
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = session.user.role
    if (!can(role, 'marketing', 'edit')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Validate type
    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be one of: campaign, adset, ad' },
        { status: 400 },
      )
    }

    const body = await request.json()
    const { status } = body

    if (!status || !['ACTIVE', 'PAUSED'].includes(status)) {
      return NextResponse.json(
        { error: 'status required: ACTIVE or PAUSED' },
        { status: 400 },
      )
    }

    const result = await adsOptimizeRepo.pauseResume(id, type, status, session.user.id)

    return NextResponse.json({
      success: true,
      type,
      id,
      status,
      metaResponse: result,
    })
  } catch (error) {
    if (error.name === 'RateLimitError') {
      return NextResponse.json(
        { error: 'Rate limited by Meta API', retryAfter: error.retryAfter },
        { status: 429, headers: { 'Retry-After': error.retryAfter } },
      )
    }

    logger.error('[ads/status]', 'POST error', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
