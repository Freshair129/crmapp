/**
 * Service Worker — Web Push Handler (ADR-044)
 * รับ push events จาก server และแสดง browser notification
 * เมื่อ user click → focus หน้า inbox
 */

const INBOX_URL = '/inbox';

// ── Push Event ──────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'ข้อความใหม่', body: event.data.text() };
  }

  const title   = payload.title   || 'The V School — ข้อความใหม่';
  const options = {
    body:    payload.body    || 'มีข้อความใหม่ใน inbox',
    icon:    payload.icon    || '/icon-192.png',
    badge:   '/icon-badge.png',
    tag:     payload.tag     || 'inbox-message',   // รวม notif ใหม่ทับอันเก่า (same tag)
    renotify: true,
    data: {
      conversationId: payload.conversationId || null,
      url: INBOX_URL,
    },
    actions: [
      { action: 'open',    title: 'เปิด Inbox' },
      { action: 'dismiss', title: 'ปิด' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification Click ──────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || INBOX_URL;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // หา tab ที่เปิด CRM อยู่แล้ว → focus + navigate
      for (const client of clientList) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.postMessage({
            type: 'PUSH_NAVIGATE',
            conversationId: event.notification.data?.conversationId,
          });
          return;
        }
      }
      // ไม่มี tab เปิดอยู่ → เปิด tab ใหม่
      return clients.openWindow(targetUrl);
    })
  );
});

// ── Activate: skip waiting ──────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});
