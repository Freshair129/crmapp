import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { toggleKnowledgeFile, deleteKnowledgeFile } from '@/lib/repositories/knowledgeFileRepo';

// ─── PATCH /api/ai-config/knowledge-files/[id] ─────────────────────────────
// Body: { isActive: boolean }
export async function PATCH(request, { params }) {
    try {
        const { id } = await params;
        const { isActive } = await request.json();
        if (typeof isActive !== 'boolean') {
            return NextResponse.json({ success: false, error: 'isActive must be boolean' }, { status: 400 });
        }
        const file = await toggleKnowledgeFile(id, isActive);
        return NextResponse.json({ success: true, file });
    } catch (err) {
        logger.error('[KnowledgeFiles]', 'PATCH error', err);
        return NextResponse.json({ success: false, error: 'Failed to update file' }, { status: 500 });
    }
}

// ─── DELETE /api/ai-config/knowledge-files/[id] ────────────────────────────
export async function DELETE(request, { params }) {
    try {
        const { id } = await params;
        await deleteKnowledgeFile(id);
        return NextResponse.json({ success: true });
    } catch (err) {
        logger.error('[KnowledgeFiles]', 'DELETE error', err);
        return NextResponse.json({ success: false, error: 'Failed to delete file' }, { status: 500 });
    }
}
