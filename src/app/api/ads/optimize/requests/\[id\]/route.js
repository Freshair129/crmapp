/**
 * PATCH /api/ads/optimize/requests/[id]
 * Approve or reject a lifetime budget request
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
    // MANAGER+ can approve/reject
    if (!can(role, 'marketing', 'approve')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { action, notes } = body

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'action required: approve or reject' },
        { status: 400 },
      )
    }

    let result

    if (action === 'approve') {
      result = await adsOptimizeRepo.approveLifetimeBudgetRequest(id, session.user.id)
    } else {
      result = await adsOptimizeRepo.rejectLifetimeBudgetRequest(id, session.user.id, notes || null)
    }

    return NextResponse.json({
      success: true,
      requestId: id,
      ...result,
    })
  } catch (error) {
    if (error.name === 'RateLimitError') {
      return NextResponse.json(
        { error: 'Rate limited by Meta API', retryAfter: error.retryAfter },
        { status: 429, headers: { 'Retry-After': error.retryAfter } },
      )
    }

    logger.error('[ads/optimize/requests/[id]]', 'PATCH error', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
