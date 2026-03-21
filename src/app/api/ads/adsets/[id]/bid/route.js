/**
 * PATCH /api/ads/adsets/[id]/bid
 * Update bid amount for an adset
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { can } from '@/lib/permissionMatrix'
import { logger } from '@/lib/logger'
import * as adsOptimizeRepo from '@/lib/repositories/adsOptimizeRepo'

export async function PATCH(request, { params }) {
  try {
    const { id } = params
    const session = await getServerSession(authOptions)

    // Auth check
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = session.user.role
    if (!can(role, 'marketing', 'edit')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { bid_amount } = body

    if (bid_amount === undefined || bid_amount === null) {
      return NextResponse.json({ error: 'bid_amount required (number, THB)' }, { status: 400 })
    }

    if (typeof bid_amount !== 'number' || bid_amount < 0) {
      return NextResponse.json({ error: 'bid_amount must be a positive number' }, { status: 400 })
    }

    const result = await adsOptimizeRepo.updateBid(id, bid_amount, session.user.id)

    return NextResponse.json({
      success: true,
      adsetId: id,
      bidAmountTHB: bid_amount,
      metaResponse: result,
    })
  } catch (error) {
    if (error.name === 'RateLimitError') {
      return NextResponse.json(
        { error: 'Rate limited by Meta API', retryAfter: error.retryAfter },
        { status: 429, headers: { 'Retry-After': error.retryAfter } },
      )
    }

    logger.error('[ads/bid]', 'PATCH error', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
