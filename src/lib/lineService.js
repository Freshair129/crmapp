/**
 * LINE Messaging Service (ADR-025 D4)
 * Handles LINE conversion attribution via resolveOrCreateCustomer.
 */

import { resolveOrCreateCustomer } from './identityService.js';

/**
 * Records a LINE conversion and resolves attribution to a Meta Ad.
 * Uses identityService for consistent cross-platform identity resolution.
 *
 * @param {{ lineUserId: string, phone: string, orderAmount: number, productId?: string }} payload
 * @returns {Promise<{ customerId: string, adId: string|null, attributed: boolean }>}
 */
async function recordLineConversion(payload) {
  const { lineUserId, phone, orderAmount } = payload;

  const { customer } = await resolveOrCreateCustomer({
    lineId:  lineUserId,
    phone,
    channel: 'LINE',
  });

  return {
    customerId: customer.id,
    adId:       customer.originId ?? null,
    attributed: !!customer.originId,
  };
}

export { recordLineConversion };
