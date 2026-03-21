/**
 * GET /api/ads/optimize/requests - list pending requests
 * POST /api/ads/optimize/requests - create lifetime budget request
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { can } from '@/lib/permissionMatrix'
import { logger } from '@/lib/logger'
import * as adsOptimizeRepo from '@/lib/repositories/adsOptimizeRepo'

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)

    // Auth check
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = session.user.role
    // Managers+ can view pending requests
    if (!can(role, 'marketing', 'approve')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const requests = await adsOptimizeRepo.getPendingRequests()

    return NextResponse.json({
      success: true,
      count: requests.length,
      data: requests,
    })
  } catch (error) {
    logger.error('[ads/optimize/requests]', 'GET error', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)

    // Auth check
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = session.user.role
    // MARKETING+ can create requests
    if (!can(role, 'marketing', 'create')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { targetId, targetName, currentVal, proposedVal } = body

    if (!targetId || !targetName || currentVal === undefined || proposedVal === undefined) {
      return NextResponse.json(
        { error: 'targetId, targetName, currentVal, proposedVal all required' },
        { status: 400 },
      )
    }

    if (typeof currentVal !== 'number' || typeof proposedVal !== 'number') {
      return NextResponse.json({ error: 'currentVal and proposedVal must be numbers (THB)' }, { status: 400 })
    }

    const result = await adsOptimizeRepo.createLifetimeBudgetRequest(
      session.user.id,
      targetId,
      targetName,
      currentVal,
      proposedVal,
    )

    return NextResponse.json(
      {
        success: true,
        requestId: result.requestId,
        status: result.status,
      },
      { status: 201 },
    )
  } catch (error) {
    logger.error('[ads/optimize/requests]', 'POST error', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
