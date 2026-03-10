import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
        const PAGE_ID = process.env.FB_PAGE_ID;

        if (!PAGE_ACCESS_TOKEN || !PAGE_ID) {
            return NextResponse.json({ error: 'Facebook credentials not configured' }, { status: 400 });
        }

        const url = `https://graph.facebook.com/v19.0/${PAGE_ID}/conversations?fields=participants,messages.limit(5){from,message,created_time}&access_token=${PAGE_ACCESS_TOKEN}`;

        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok || data.error) {
            console.error('[chat/conversations] Facebook API error', data.error);
            return NextResponse.json({ error: data.error?.message || 'Failed to fetch conversations' }, { status: 502 });
        }

        const conversations = (data.data || []).map(conv => {
            const customer = conv.participants?.data?.find(p => p.id !== PAGE_ID);
            const messages = conv.messages?.data || [];
            const staffReply = messages.find(m => m.from.id === PAGE_ID);
            const latestMsg = messages[0];

            return {
                conversation_id: conv.id,
                customer_name: customer?.name || 'Unknown',
                customer_id: customer?.id || null,
                last_message: latestMsg?.message || '',
                last_message_time: latestMsg?.created_time || null,
                staff_replied: !!staffReply,
            };
        });

        return NextResponse.json({ conversations, total: conversations.length });
    } catch (error) {
        console.error('[chat/conversations] GET error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
