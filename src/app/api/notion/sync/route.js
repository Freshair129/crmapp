// POST /api/notion/sync?direction=push  — push CRM tasks → Notion
// POST /api/notion/sync?direction=pull  — pull Notion tasks → CRM
// GET  /api/notion/sync                 — sync status
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import {
    pushAllTasksToNotion,
    pullTasksFromNotion,
    getNotionSyncStatus,
} from '@/lib/repositories/notionRepo';

export async function GET() {
    try {
        const status = await getNotionSyncStatus();
        return NextResponse.json({ success: true, ...status });
    } catch (e) {
        console.error('[GET /api/notion/sync]', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const direction = searchParams.get('direction') || 'pull';

    try {
        if (direction === 'push') {
            const result = await pushAllTasksToNotion();
            return NextResponse.json({ success: true, direction: 'push', ...result });
        }

        if (direction === 'pull') {
            const result = await pullTasksFromNotion();
            return NextResponse.json({ success: true, direction: 'pull', ...result });
        }

        return NextResponse.json({ error: 'Invalid direction. Use push or pull.' }, { status: 400 });
    } catch (e) {
        console.error('[POST /api/notion/sync]', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
