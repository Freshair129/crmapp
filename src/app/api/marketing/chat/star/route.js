import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';

export async function POST(request) {
    try {
        const { conversationId, isStarred } = await request.json();

        if (!conversationId || typeof isStarred !== 'boolean') {
            return NextResponse.json({ success: false, error: 'conversationId and isStarred (boolean) are required' }, { status: 400 });
        }

        const prisma = await getPrisma();

        await prisma.conversation.upsert({
            where: { conversationId },
            update: { isStarred },
            create: { conversationId, isStarred },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[ChatStar] Star update failed', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
