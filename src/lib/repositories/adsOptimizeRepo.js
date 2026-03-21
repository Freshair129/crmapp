/**
 * Ads Optimize Repository (ADR-045: Phase 29d)
 * Handles Meta Graph API calls for campaign/adset/ad optimization
 * All operations write audit logs via AuditLog model
 */

import { getPrisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { generateLogId, generateRequestId } from '@/lib/id-generators'

const ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN
const AD_ACCOUNT_ID = process.env.FB_AD_ACCOUNT_ID
const GRAPH_API_URL = 'https://graph.facebook.com/v19.0'

class RateLimitError extends Error {
  constructor(message, retryAfter) {
    super(message)
    this.name = 'RateLimitError'
    this.retryAfter = retryAfter
  }
}

/**
 * Call Meta Graph API with error handling
 * @param {string} method - GET, POST, PATCH, DELETE
 * @param {string} endpoint - API endpoint (e.g. '/123456/status')
 * @param {object} body - Request body (optional)
 * @returns {object} Response from Meta API
 * @throws {RateLimitError} on 429
 * @throws {Error} on 400/403/other errors
 */
async function callMetaAPI(method, endpoint, body = null) {
  const url = `${GRAPH_API_URL}${endpoint}`
  const fetchOptions = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  }

  if (method === 'GET') {
    const params = new URLSearchParams({ access_token: ACCESS_TOKEN })
    return await _makeRequest(`${url}?${params}`, fetchOptions)
  } else {
    const params = new URLSearchParams({ access_token: ACCESS_TOKEN })
    fetchOptions.body = JSON.stringify(body || {})
    return await _makeRequest(`${url}?${params}`, fetchOptions)
  }
}

async function _makeRequest(url, options) {
  const response = await fetch(url, options)

  if (response.status === 429) {
    const retryAfter = response.headers.get('x-app-usage-time') || 900
    throw new RateLimitError('Rate limited by Meta API', parseInt(retryAfter, 10))
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const errorMsg = errorData.error?.message || `Meta API error: ${response.status}`
    throw new Error(`[Meta API] ${response.status}: ${errorMsg}`)
  }

  return await response.json()
}

/**
 * Pause or resume a campaign/adset/ad
 * @param {string} targetId - Campaign/Adset/Ad ID
 * @param {string} targetType - 'campaign' | 'adset' | 'ad'
 * @param {string} status - 'ACTIVE' | 'PAUSED'
 * @param {string} actorEmployeeId - Employee ID performing action
 */
export async function pauseResume(targetId, targetType, status, actorEmployeeId) {
  const prisma = getPrisma()

  try {
    const response = await callMetaAPI('PATCH', `/${targetId}`, {
      status: status === 'ACTIVE' ? 'ACTIVE' : 'PAUSED',
    })

    // Write audit log
    const logId = generateLogId()
    await prisma.auditLog.create({
      data: {
        logId,
        action: status === 'ACTIVE' ? 'ADS_RESUME' : 'ADS_PAUSE',
        actor: actorEmployeeId,
        target: `${targetType}:${targetId}`,
        status: 'SUCCESS',
        details: {
          targetType,
          targetId,
          newStatus: status,
        },
      },
    })

    logger.info('[adsOptimizeRepo]', `${targetType} ${targetId} ${status}`, { logId })
    return response
  } catch (error) {
    logger.error('[adsOptimizeRepo] pauseResume', error.message, {
      targetId,
      targetType,
      status,
      error: error.name,
    })
    throw error
  }
}

/**
 * Update daily budget of an adset (in THB)
 * @param {string} adsetId - Adset ID
 * @param {number} newBudget - Budget in THB (will be converted to cents)
 * @param {string} actorEmployeeId - Employee ID
 */
export async function updateDailyBudget(adsetId, newBudget, actorEmployeeId) {
  const prisma = getPrisma()

  try {
    const budgetInCents = Math.round(newBudget * 100)

    const response = await callMetaAPI('PATCH', `/${adsetId}`, {
      daily_budget: budgetInCents,
    })

    const logId = generateLogId()
    await prisma.auditLog.create({
      data: {
        logId,
        action: 'ADS_BUDGET_UPDATE',
        actor: actorEmployeeId,
        target: `adset:${adsetId}`,
        status: 'SUCCESS',
        details: {
          field: 'daily_budget',
          newValue: newBudget,
          valueInCents: budgetInCents,
        },
      },
    })

    logger.info('[adsOptimizeRepo]', `adset ${adsetId} budget → ${newBudget} THB`, { logId })
    return response
  } catch (error) {
    logger.error('[adsOptimizeRepo] updateDailyBudget', error.message, {
      adsetId,
      newBudget,
      error: error.name,
    })
    throw error
  }
}

/**
 * Update bid amount for an adset
 * @param {string} adsetId - Adset ID
 * @param {number} bidAmount - Bid in THB (will be converted to cents)
 * @param {string} actorEmployeeId - Employee ID
 */
export async function updateBid(adsetId, bidAmount, actorEmployeeId) {
  const prisma = getPrisma()

  try {
    const bidInCents = Math.round(bidAmount * 100)

    const response = await callMetaAPI('PATCH', `/${adsetId}`, {
      bid_amount: bidInCents,
    })

    const logId = generateLogId()
    await prisma.auditLog.create({
      data: {
        logId,
        action: 'ADS_BID_UPDATE',
        actor: actorEmployeeId,
        target: `adset:${adsetId}`,
        status: 'SUCCESS',
        details: {
          field: 'bid_amount',
          newValue: bidAmount,
          valueInCents: bidInCents,
        },
      },
    })

    logger.info('[adsOptimizeRepo]', `adset ${adsetId} bid → ${bidAmount} THB`, { logId })
    return response
  } catch (error) {
    logger.error('[adsOptimizeRepo] updateBid', error.message, {
      adsetId,
      bidAmount,
      error: error.name,
    })
    throw error
  }
}

/**
 * Duplicate a campaign
 * @param {string} campaignId - Campaign ID to copy
 * @param {string} newName - Name for duplicated campaign
 * @param {string} actorEmployeeId - Employee ID
 */
export async function duplicateCampaign(campaignId, newName, actorEmployeeId) {
  const prisma = getPrisma()

  try {
    if (!AD_ACCOUNT_ID) {
      throw new Error('FB_AD_ACCOUNT_ID not set')
    }

    const response = await callMetaAPI('POST', `/act_${AD_ACCOUNT_ID}/campaigns`, {
      name: newName,
      copy_from: campaignId,
    })

    const logId = generateLogId()
    await prisma.auditLog.create({
      data: {
        logId,
        action: 'ADS_CAMPAIGN_DUPLICATE',
        actor: actorEmployeeId,
        target: `campaign:${campaignId}`,
        status: 'SUCCESS',
        details: {
          sourceCampaignId: campaignId,
          newCampaignId: response.id,
          newName,
        },
      },
    })

    logger.info('[adsOptimizeRepo]', `campaign ${campaignId} duplicated → ${response.id}`, { logId })
    return response
  } catch (error) {
    logger.error('[adsOptimizeRepo] duplicateCampaign', error.message, {
      campaignId,
      newName,
      error: error.name,
    })
    throw error
  }
}

/**
 * Create a lifetime budget approval request
 * @param {string} requestedBy - Employee ID requesting
 * @param {string} targetId - Campaign/Adset ID
 * @param {string} targetName - Display name
 * @param {number} currentVal - Current lifetime budget (THB)
 * @param {number} proposedVal - Proposed lifetime budget (THB)
 */
export async function createLifetimeBudgetRequest(requestedBy, targetId, targetName, currentVal, proposedVal) {
  const prisma = getPrisma()

  try {
    const requestId = generateRequestId()

    const request = await prisma.adsOptimizeRequest.create({
      data: {
        requestId,
        requestedBy,
        type: 'LIFETIME_BUDGET',
        targetId,
        targetName,
        currentVal,
        proposedVal,
        status: 'PENDING',
      },
    })

    logger.info('[adsOptimizeRepo]', `lifetime budget request ${requestId} created`, {
      targetId,
      currentVal,
      proposedVal,
    })
    return request
  } catch (error) {
    logger.error('[adsOptimizeRepo] createLifetimeBudgetRequest', error.message, {
      targetId,
      currentVal,
      proposedVal,
      error: error.name,
    })
    throw error
  }
}

/**
 * Approve a lifetime budget request and update Meta
 * @param {string} requestId - OPT-YYYYMMDD-NNN format
 * @param {string} reviewerEmployeeId - Employee ID approving
 */
export async function approveLifetimeBudgetRequest(requestId, reviewerEmployeeId) {
  const prisma = getPrisma()

  try {
    const request = await prisma.adsOptimizeRequest.findUnique({
      where: { requestId },
    })

    if (!request) {
      throw new Error(`Request ${requestId} not found`)
    }

    if (request.status !== 'PENDING') {
      throw new Error(`Request ${requestId} is not PENDING (status: ${request.status})`)
    }

    // Call Meta API to update lifetime budget (in cents)
    const budgetInCents = Math.round(request.proposedVal * 100)
    const metaResponse = await callMetaAPI('PATCH', `/${request.targetId}`, {
      lifetime_budget: budgetInCents,
    })

    // Update request status
    await prisma.adsOptimizeRequest.update({
      where: { requestId },
      data: {
        status: 'APPROVED',
        reviewedBy: reviewerEmployeeId,
        reviewedAt: new Date(),
      },
    })

    // Write audit log
    const logId = generateLogId()
    await prisma.auditLog.create({
      data: {
        logId,
        action: 'ADS_LIFETIME_BUDGET_APPROVED',
        actor: reviewerEmployeeId,
        target: `request:${requestId}`,
        status: 'SUCCESS',
        details: {
          targetId: request.targetId,
          previousValue: request.currentVal,
          newValue: request.proposedVal,
          metaResponse: metaResponse.id || metaResponse.success,
        },
      },
    })

    logger.info('[adsOptimizeRepo]', `lifetime budget request ${requestId} APPROVED`, {
      reviewer: reviewerEmployeeId,
      newBudget: request.proposedVal,
    })
    return { requestId, status: 'APPROVED' }
  } catch (error) {
    logger.error('[adsOptimizeRepo] approveLifetimeBudgetRequest', error.message, {
      requestId,
      reviewer: reviewerEmployeeId,
      error: error.name,
    })
    throw error
  }
}

/**
 * Reject a lifetime budget request
 * @param {string} requestId - OPT-YYYYMMDD-NNN format
 * @param {string} reviewerEmployeeId - Employee ID rejecting
 * @param {string} notes - Rejection reason (optional)
 */
export async function rejectLifetimeBudgetRequest(requestId, reviewerEmployeeId, notes = null) {
  const prisma = getPrisma()

  try {
    const request = await prisma.adsOptimizeRequest.findUnique({
      where: { requestId },
    })

    if (!request) {
      throw new Error(`Request ${requestId} not found`)
    }

    if (request.status !== 'PENDING') {
      throw new Error(`Request ${requestId} is not PENDING (status: ${request.status})`)
    }

    // Update request status
    await prisma.adsOptimizeRequest.update({
      where: { requestId },
      data: {
        status: 'REJECTED',
        reviewedBy: reviewerEmployeeId,
        reviewedAt: new Date(),
        notes: notes || request.notes,
      },
    })

    // Write audit log
    const logId = generateLogId()
    await prisma.auditLog.create({
      data: {
        logId,
        action: 'ADS_LIFETIME_BUDGET_REJECTED',
        actor: reviewerEmployeeId,
        target: `request:${requestId}`,
        status: 'SUCCESS',
        details: {
          targetId: request.targetId,
          proposedValue: request.proposedVal,
          rejectionReason: notes,
        },
      },
    })

    logger.info('[adsOptimizeRepo]', `lifetime budget request ${requestId} REJECTED`, {
      reviewer: reviewerEmployeeId,
    })
    return { requestId, status: 'REJECTED' }
  } catch (error) {
    logger.error('[adsOptimizeRepo] rejectLifetimeBudgetRequest', error.message, {
      requestId,
      reviewer: reviewerEmployeeId,
      error: error.name,
    })
    throw error
  }
}

/**
 * List pending lifetime budget requests (for approval)
 * @returns {array} PENDING requests
 */
export async function getPendingRequests() {
  const prisma = getPrisma()

  try {
    const requests = await prisma.adsOptimizeRequest.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    })

    return requests
  } catch (error) {
    logger.error('[adsOptimizeRepo] getPendingRequests', error.message)
    throw error
  }
}

/**
 * Get a single request by requestId
 * @param {string} requestId - OPT-YYYYMMDD-NNN format
 */
export async function getRequestById(requestId) {
  const prisma = getPrisma()

  try {
    const request = await prisma.adsOptimizeRequest.findUnique({
      where: { requestId },
    })

    if (!request) {
      throw new Error(`Request ${requestId} not found`)
    }

    return request
  } catch (error) {
    logger.error('[adsOptimizeRepo] getRequestById', error.message, { requestId })
    throw error
  }
}

export { RateLimitError }
