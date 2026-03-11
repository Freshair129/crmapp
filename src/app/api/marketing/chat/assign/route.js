import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';

export async function POST(request) {
    try {
        const { conversationId, agentName } = await request.json();

        if (!conversationId || !agentName) {
            return NextResponse.json({ success: false, error: 'conversationId and agentName are required' }, { status: 400 });
        }

        const prisma = await getPrisma();

        await prisma.conversation.upsert({
            where: { conversationId },
            update: { assignedAgent: agentName },
            create: { conversationId, assignedAgent: agentName },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[ChatAssign] Assign failed', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
