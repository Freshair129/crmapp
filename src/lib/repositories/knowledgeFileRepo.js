import { getPrisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * knowledgeFileRepo — manages AI knowledge base files
 *
 * Each file has:
 *   - contentText : extracted text (docx / xlsx / txt) — injected into AI system prompt
 *   - contentB64  : base64 data URL (images)           — sent as Gemini inline part
 */

/** List all files ordered by sortOrder then createdAt, optionally only active ones */
export async function listKnowledgeFiles({ activeOnly = false } = {}) {
    try {
        const prisma = await getPrisma();
        return await prisma.knowledgeFile.findMany({
            where: activeOnly ? { isActive: true } : undefined,
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
            select: {
                id: true, filename: true, fileType: true, mimeType: true,
                sizeBytes: true, isActive: true, sortOrder: true, createdAt: true,
                // intentionally omit contentText + contentB64 from list (heavy)
            },
        });
    } catch (err) {
        logger.error('[knowledgeFileRepo]', 'listKnowledgeFiles failed', err);
        return [];
    }
}

/** Get active files WITH content — used by AI reply route */
export async function getActiveFilesWithContent() {
    try {
        const prisma = await getPrisma();
        return await prisma.knowledgeFile.findMany({
            where: { isActive: true },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
            select: {
                id: true, filename: true, fileType: true, mimeType: true,
                contentText: true, contentB64: true, sizeBytes: true,
            },
        });
    } catch (err) {
        logger.error('[knowledgeFileRepo]', 'getActiveFilesWithContent failed', err);
        return [];
    }
}

/** Save a new knowledge file record */
export async function createKnowledgeFile({ filename, fileType, mimeType, contentText, contentB64, sizeBytes }) {
    const prisma = await getPrisma();
    return prisma.knowledgeFile.create({
        data: { filename, fileType, mimeType, contentText, contentB64, sizeBytes },
        select: { id: true, filename: true, fileType: true, mimeType: true, sizeBytes: true, isActive: true, createdAt: true },
    });
}

/** Toggle isActive on a file */
export async function toggleKnowledgeFile(id, isActive) {
    const prisma = await getPrisma();
    return prisma.knowledgeFile.update({
        where: { id },
        data: { isActive },
        select: { id: true, filename: true, isActive: true },
    });
}

/** Delete a file record */
export async function deleteKnowledgeFile(id) {
    const prisma = await getPrisma();
    return prisma.knowledgeFile.delete({ where: { id } });
}
