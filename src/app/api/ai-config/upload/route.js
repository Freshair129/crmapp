import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * POST /api/ai-config/upload
 * Accepts multipart/form-data with field `file` (.docx or .xlsx)
 * Returns: { success, text } — extracted plain text from the file
 */
export async function POST(request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file || typeof file === 'string') {
            return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
        }

        const fileName = file.name?.toLowerCase() ?? '';
        const buffer = Buffer.from(await file.arrayBuffer());
        let text = '';

        if (fileName.endsWith('.docx')) {
            const mammoth = (await import('mammoth')).default;
            const result = await mammoth.extractRawText({ buffer });
            text = result.value.trim();

        } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
            const XLSX = (await import('xlsx')).default;
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            const lines = [];
            for (const sheetName of workbook.SheetNames) {
                const sheet = workbook.Sheets[sheetName];
                const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
                lines.push(`[${sheetName}]`);
                for (const row of rows) {
                    const line = row.filter(Boolean).join(' | ');
                    if (line.trim()) lines.push(line);
                }
            }
            text = lines.join('\n').trim();

        } else {
            return NextResponse.json({ success: false, error: 'รองรับเฉพาะไฟล์ .docx และ .xlsx เท่านั้น' }, { status: 400 });
        }

        if (!text) {
            return NextResponse.json({ success: false, error: 'ไม่พบข้อความในไฟล์' }, { status: 422 });
        }

        // Truncate to 8000 chars to stay within Gemini prompt limits
        const truncated = text.length > 8000 ? text.slice(0, 8000) + '\n...[truncated]' : text;

        return NextResponse.json({ success: true, text: truncated, chars: truncated.length });

    } catch (err) {
        logger.error('[AIConfig/upload]', 'parse error', err);
        return NextResponse.json({ success: false, error: 'Failed to parse file' }, { status: 500 });
    }
}
