import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';

const GRAPH_API = 'https://graph.facebook.com/v19.0';
const PAGE_ID = process.env.FB_PAGE_ID;
const ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;

/**
 * POST /api/marketing/chat/read
 * Body: { conversationId, recipientId, mode: 'normal' | 'stealth' }
 *
 * normal  → reset unreadCount in DB + send mark_seen to Facebook (customer sees "อ่านแล้ว")
 * stealth → reset unreadCount in DB only — Facebook ไม่รู้ ลูกค้าไม่เห็น read receipt
 */
export async function POST(request) {
    try {
        const { conversationId, recipientId, mode = 'stealth' } = await request.json();

        if (!conversationId) {
            return NextResponse.json({ success: false, error: 'conversationId is required' }, { status: 400 });
        }

        const prisma = await getPrisma();

        // 1. Reset unreadCount in DB เสมอ (ทั้ง 2 mode)
        await prisma.conversation.update({
            where: { conversationId },
            data: { unreadCount: 0 },
        });

        // 2. Normal mode เท่านั้น: ส่ง mark_seen ไป Facebook
        if (mode === 'normal' && recipientId && PAGE_ID && ACCESS_TOKEN) {
            try {
                const res = await fetch(
                    `${GRAPH_API}/${PAGE_ID}/messages?access_token=${ACCESS_TOKEN}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            recipient: { id: recipientId },
                            sender_action: 'mark_seen',
                        }),
                    }
                );
                const data = await res.json();
                if (!res.ok || data.error) {
                    // Non-blocking — log แต่ไม่ fail
                    console.error('[ChatRead] mark_seen failed', data.error?.message || res.status);
                }
            } catch (err) {
                console.error('[ChatRead] mark_seen request failed', err);
            }
        }

        return NextResponse.json({ success: true, mode });
    } catch (error) {
        console.error('[ChatRead] Failed', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
