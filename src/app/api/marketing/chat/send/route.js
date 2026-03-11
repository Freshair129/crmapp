import { NextResponse } from 'next/server';

const GRAPH_API = 'https://graph.facebook.com/v19.0';
const PAGE_ID = process.env.FB_PAGE_ID;
const ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;

export async function POST(request) {
    try {
        const { recipientId, message } = await request.json();

        if (!recipientId || !message) {
            return NextResponse.json({ success: false, error: 'recipientId and message are required' }, { status: 400 });
        }

        if (!PAGE_ID || !ACCESS_TOKEN) {
            return NextResponse.json({ success: false, error: 'Facebook credentials not configured' }, { status: 503 });
        }

        const res = await fetch(`${GRAPH_API}/${PAGE_ID}/messages?access_token=${ACCESS_TOKEN}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                recipient: { id: recipientId },
                message: { text: message },
                messaging_type: 'RESPONSE',
            }),
        });

        const data = await res.json();

        if (!res.ok || data.error) {
            const errMsg = data.error?.message || `Facebook API ${res.status}`;
            console.error('[ChatSend] Facebook send failed', errMsg);
            return NextResponse.json({ success: false, error: errMsg }, { status: 502 });
        }

        return NextResponse.json({ success: true, data: { message_id: data.message_id } });
    } catch (error) {
        console.error('[ChatSend] Send failed', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
