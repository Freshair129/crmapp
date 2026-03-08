/**
 * LINE Webhook Endpoint
 * POST /api/webhooks/line
 *
 * ADR-016: LINE Messaging API Integration
 * ADR-025: Cross-Platform Identity Resolution
 *
 * Validates LINE signature → parses events → records conversions for ROAS attribution.
 * Must respond 200 OK within 200ms (LINE requirement) — heavy work is fire-and-forget.
 */

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { recordLineConversion } from '@/lib/lineService';
import { logger } from '@/lib/logger';

const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;

/**
 * Verifies LINE webhook signature (HMAC-SHA256).
 * @param {string} rawBody - Raw request body as string
 * @param {string} signature - X-Line-Signature header value
 * @returns {boolean}
 */
function verifyLineSignature(rawBody, signature) {
  if (!LINE_CHANNEL_SECRET || !signature) return false;
  const expected = crypto
    .createHmac('sha256', LINE_CHANNEL_SECRET)
    .update(rawBody)
    .digest('base64');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export async function POST(request) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-line-signature') ?? '';

  if (!verifyLineSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Respond 200 immediately — LINE requires response within 200ms
  // Attribution work runs fire-and-forget after response
  processEvents(body.events ?? []).catch((err) =>
    logger.error('line-webhook', 'processEvents error', err)
  );

  return NextResponse.json({ ok: true });
}

/**
 * Processes LINE webhook events relevant for conversion attribution.
 * Currently handles: message events containing order/phone info.
 * @param {object[]} events
 */
async function processEvents(events) {
  for (const event of events) {
    if (event.type !== 'message') continue;

    const lineUserId = event.source?.userId;
    if (!lineUserId) continue;

    // Extract phone from text message if present (format: "โอน 2500 บาท 0812345678")
    const text = event.message?.text ?? '';
    const phoneMatch = text.match(/0[6-9]\d{8}|(?:\+|00)66\d{8,9}/);
    const phone = phoneMatch ? phoneMatch[0] : '';

    // Parse amount from text if present (e.g. "โอน 2500 บาท")
    const amountMatch = text.match(/(\d[\d,]+)\s*บาท/);
    const orderAmount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0;

    if (!phone && !lineUserId) continue;

    try {
      const result = await recordLineConversion({
        lineUserId,
        phone,
        orderAmount,
      });

      if (result.attributed) {
        logger.info('line-webhook', 'Attribution OK', { customerId: result.customerId, adId: result.adId, amount: orderAmount });
      }
    } catch (err) {
      logger.error('line-webhook', 'recordLineConversion failed', err, { lineUserId });
    }
  }
}
