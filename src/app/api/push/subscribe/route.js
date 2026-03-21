/**
 * POST /api/push/subscribe  — บันทึก push subscription ของ browser
 * DELETE /api/push/subscribe — ลบ subscription (unsubscribe)
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPrisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.employeeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { endpoint, keys, userAgent } = await req.json();
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: 'Invalid subscription object' }, { status: 400 });
    }

    const prisma = await getPrisma();

    // หา Employee จาก session
    const employee = await prisma.employee.findFirst({
      where: { employeeId: session.user.employeeId },
      select: { id: true },
    });
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // upsert โดยใช้ endpoint เป็น unique key
    await prisma.pushSubscription.upsert({
      where:  { endpoint },
      create: { employeeId: employee.id, endpoint, p256dh: keys.p256dh, auth: keys.auth, userAgent },
      update: { p256dh: keys.p256dh, auth: keys.auth, userAgent },
    });

    logger.info('push/subscribe', `Subscribed: ${session.user.employeeId}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error('push/subscribe', 'POST error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.employeeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { endpoint } = await req.json();
    if (!endpoint) {
      return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 });
    }

    const prisma = await getPrisma();
    await prisma.pushSubscription.deleteMany({ where: { endpoint } });

    logger.info('push/subscribe', `Unsubscribed: ${session.user.employeeId}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error('push/subscribe', 'DELETE error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
