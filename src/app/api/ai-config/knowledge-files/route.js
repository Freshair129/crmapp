import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { listKnowledgeFiles, createKnowledgeFile } from '@/lib/repositories/knowledgeFileRepo';

const MAX_TEXT_CHARS  = 12000; // per-file text limit
const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3 MB raw image limit

const SUPPORTED_TYPES = {
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/msword': 'docx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.ms-excel': 'xlsx',
    'text/plain': 'txt',
    'image/jpeg': 'image',
    'image/jpg': 'image',
    'image/png': 'image',
    'image/webp': 'image',
    'image/gif': 'image',
};

// ─── GET /api/ai-config/knowledge-files ────────────────────────────────────
export async function GET() {
    try {
        const files = await listKnowledgeFiles();
        return NextResponse.json({ success: true, files });
    } catch (err) {
        logger.error('[KnowledgeFiles]', 'GET error', err);
        return NextResponse.json({ success: false, error: 'Failed to list files' }, { status: 500 });
    }
}

// ─── POST /api/ai-config/knowledge-files ───────────────────────────────────
// multipart/form-data with field `file`
export async function POST(request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file || typeof file === 'string') {
            return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
        }

        const originalName = file.name ?? 'unknown';
        const mimeType     = file.type ?? '';
        const fileType     = SUPPORTED_TYPES[mimeType] ?? detectTypeFromName(originalName);

        if (!fileType) {
            return NextResponse.json({
                success: false,
                error: 'ไม่รองรับไฟล์ประเภทนี้ รองรับ: .docx, .xlsx, .txt, .jpg, .png, .webp, .gif',
            }, { status: 400 });
        }

        const buffer    = Buffer.from(await file.arrayBuffer());
        const sizeBytes = buffer.length;

        let contentText = null;
        let contentB64  = null;

        // ── Extract content by type ──────────────────────────────────────────
        if (fileType === 'docx') {
            const mammoth = (await import('mammoth')).default;
            const result  = await mammoth.extractRawText({ buffer });
            contentText   = truncate(result.value.trim(), MAX_TEXT_CHARS);

        } else if (fileType === 'xlsx') {
            const XLSX   = (await import('xlsx')).default;
            const wb     = XLSX.read(buffer, { type: 'buffer' });
            const lines  = [];
            for (const sheetName of wb.SheetNames) {
                const sheet = wb.Sheets[sheetName];
                const rows  = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
                lines.push(`[${sheetName}]`);
                for (const row of rows) {
                    const line = row.filter(Boolean).join(' | ');
                    if (line.trim()) lines.push(line);
                }
            }
            contentText = truncate(lines.join('\n').trim(), MAX_TEXT_CHARS);

        } else if (fileType === 'txt') {
            contentText = truncate(buffer.toString('utf8').trim(), MAX_TEXT_CHARS);

        } else if (fileType === 'image') {
            if (sizeBytes > MAX_IMAGE_BYTES) {
                return NextResponse.json({
                    success: false,
                    error: `รูปภาพต้องไม่เกิน 3 MB (ไฟล์นี้ ${(sizeBytes / 1024 / 1024).toFixed(1)} MB)`,
                }, { status: 413 });
            }
            // Store as base64 data URL for Gemini inline part
            contentB64 = `data:${mimeType};base64,${buffer.toString('base64')}`;
        }

        if (!contentText && !contentB64) {
            return NextResponse.json({ success: false, error: 'ไม่พบเนื้อหาในไฟล์' }, { status: 422 });
        }

        const record = await createKnowledgeFile({
            filename: originalName,
            fileType,
            mimeType,
            contentText,
            contentB64,
            sizeBytes,
        });

        return NextResponse.json({
            success: true,
            file: record,
            chars: contentText?.length ?? 0,
        });

    } catch (err) {
        logger.error('[KnowledgeFiles]', 'POST upload error', err);
        return NextResponse.json({ success: false, error: 'Failed to process file' }, { status: 500 });
    }
}

// ── helpers ─────────────────────────────────────────────────────────────────

function truncate(str, limit) {
    return str.length > limit ? str.slice(0, limit) + '\n...[truncated]' : str;
}

function detectTypeFromName(name) {
    const ext = name.split('.').pop()?.toLowerCase();
    const map = { docx: 'docx', doc: 'docx', xlsx: 'xlsx', xls: 'xlsx', txt: 'txt',
                  jpg: 'image', jpeg: 'image', png: 'image', webp: 'image', gif: 'image' };
    return map[ext] ?? null;
}
