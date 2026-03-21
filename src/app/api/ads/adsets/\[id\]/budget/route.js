/**
 * PATCH /api/ads/adsets/[id]/budget
 * Update daily budget for an adset
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
    const { daily_budget } = body

    if (daily_budget === undefined || daily_budget === null) {
      return NextResponse.json({ error: 'daily_budget required (number, THB)' }, { status: 400 })
    }

    if (typeof daily_budget !== 'number' || daily_budget < 0) {
      return NextResponse.json({ error: 'daily_budget must be a positive number' }, { status: 400 })
    }

    const result = await adsOptimizeRepo.updateDailyBudget(id, daily_budget, session.user.id)

    return NextResponse.json({
      success: true,
      adsetId: id,
      budgetTHB: daily_budget,
      metaResponse: result,
    })
  } catch (error) {
    if (error.name === 'RateLimitError') {
      return NextResponse.json(
        { error: 'Rate limited by Meta API', retryAfter: error.retryAfter },
        { status: 429, headers: { 'Retry-After': error.retryAfter } },
      )
    }

    logger.error('[ads/budget]', 'PATCH error', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
