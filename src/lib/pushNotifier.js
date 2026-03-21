/**
 * pushNotifier.js — Web Push utility (ADR-044)
 * ยิง push notification ไปยัง browser subscriptions ทั้งหมดของพนักงาน
 *
 * ใช้: await notifyInbox({ title, body, conversationId, tag })
 */

import webpush from 'web-push';
import { getPrisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:admin@thevschool.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY,
);

/**
 * ส่ง push ไปยังทุก active subscription
 * @param {{ title: string, body: string, conversationId?: string, tag?: string }} payload
 */
export async function notifyInbox(payload) {
  const prisma = await getPrisma();

  let subscriptions;
  try {
    subscriptions = await prisma.pushSubscription.findMany();
  } catch (err) {
    logger.error('pushNotifier', 'Failed to fetch subscriptions', err);
    return;
  }

  if (!subscriptions.length) return;

  const message = JSON.stringify({
    title:          payload.title          || 'The V School — ข้อความใหม่',
    body:           payload.body           || 'มีข้อความใหม่ใน Inbox',
    tag:            payload.tag            || 'inbox-message',
    conversationId: payload.conversationId || null,
    icon:           '/icon-192.png',
  });

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        message,
      )
    )
  );

  // cleanup expired / unsubscribed endpoints (410 Gone)
  const expired = [];
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      const status = result.reason?.statusCode;
      if (status === 410 || status === 404) {
        expired.push(subscriptions[i].id);
      } else {
        logger.warn('pushNotifier', `Push failed for sub ${subscriptions[i].id}`, result.reason?.message);
      }
    }
  });

  if (expired.length) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: expired } } }).catch(() => {});
    logger.info('pushNotifier', `Cleaned ${expired.length} expired subscription(s)`);
  }
}
