import { resolveOrCreateCustomer } from './identityService.js';
import { cache } from './redis.js';

const QUOTA_CACHE_KEY = 'line:quota_exceeded';

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


/**
 * Generic function to send a push message via LINE Messaging API.
 * 
 * @param {string} to - The recipient ID (User ID or Group ID)
 * @param {Array<Object>} messages - Array of LINE message objects
 * @returns {Promise<boolean>} - Success status
 */
async function pushMessage(to, messages) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!token || !to) {
    console.warn('[LineService] Missing credentials or recipient, message suppressed');
    return false;
  }

  // Circuit Breaker: Skip if quota was previously exceeded
  const isSilenced = await cache.get(QUOTA_CACHE_KEY);
  if (isSilenced) {
    return false;
  }

  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ to, messages })
    });

    if (!response.ok) {
      const error = await response.json();
      const errorStr = JSON.stringify(error);
      
      if (response.status === 402 || errorStr.includes('monthly limit')) {
        const alreadySilenced = await cache.get(QUOTA_CACHE_KEY);
        if (!alreadySilenced) {
          console.warn('[LineService] Monthly quota reached. Silencing future alerts for 24h.');
          await cache.set(QUOTA_CACHE_KEY, true, 86400);
        }
        return false;
      }
      
      throw new Error(errorStr);
    }
    return true;
  } catch (err) {
    const isSilenced = await cache.get(QUOTA_CACHE_KEY);
    if (!isSilenced) {
        console.error('[LineService] Push failed:', err.message || err);
    }
    return false;
  }
}

/**
 * Sends a text alert to the configured LINE Group ID.
 * Refactored to use generic pushMessage.
 * 
 * @param {string} message - The message body to send
 * @returns {Promise<boolean>} - Success status
 */
async function sendLineAlert(message) {
  const groupId = process.env.LINE_GROUP_ID;
  if (!groupId) return false;
  
  return pushMessage(groupId, [{ type: 'text', text: message }]);
}

export { recordLineConversion, sendLineAlert, pushMessage };
