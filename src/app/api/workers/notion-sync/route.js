// POST /api/workers/notion-sync
// QStash scheduled worker — pull Notion tasks → CRM every 15 minutes
// Verify QStash signature before processing (same pattern as notification worker)

import { NextResponse } from 'next/server';
import { Receiver } from '@upstash/qstash';
import { pullTasksFromNotion } from '@/lib/repositories/notionRepo';

export async function POST(req) {
    // Verify QStash signature if secret is configured
    const qstashSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
    if (qstashSigningKey) {
        try {
            const receiver = new Receiver({
                currentSigningKey:  process.env.QSTASH_CURRENT_SIGNING_KEY,
                nextSigningKey:     process.env.QSTASH_NEXT_SIGNING_KEY,
            });
            const body      = await req.text();
            const signature = req.headers.get('upstash-signature') || '';
            const isValid   = await receiver.verify({ signature, body });
            if (!isValid) {
                return NextResponse.json({ error: 'Invalid QStash signature' }, { status: 401 });
            }
        } catch (e) {
            console.error('[notion-sync worker] signature verify failed', e.message);
            return NextResponse.json({ error: 'Signature error' }, { status: 401 });
        }
    }

    try {
        const result = await pullTasksFromNotion();
        console.log('[notion-sync worker] pull complete:', result);
        return NextResponse.json({ success: true, ...result });
    } catch (e) {
        console.error('[notion-sync worker] error:', e.message);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
