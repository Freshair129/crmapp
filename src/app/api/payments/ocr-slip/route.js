/**
 * POST /api/payments/ocr-slip
 * Accepts a slip image (multipart form-data) and returns Gemini OCR result.
 * Used by POS to verify transfer slips in real-time — no URL needed, raw base64.
 */
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '@/lib/logger';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request) {
    try {
        const formData = await request.formData();
        const file = formData.get('slip');
        if (!file) {
            return NextResponse.json({ error: 'No slip file provided' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const mimeType = file.type || 'image/jpeg';

        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            generationConfig: { responseMimeType: 'application/json' },
        });

        const prompt = `
Analyze this image to determine if it is a Thai bank transfer slip.
Return strictly as JSON with these fields:
- "isSlip": boolean
- "confidence": number 0.0–1.0
- "amount": number in THB (null if not found)
- "date": ISO 8601 string (null if not found)
- "refNumber": transaction reference number string (null if not found)
- "bankName": sender or recipient bank name (null if not found)
- "senderName": sender account name if visible (null if not found)
- "rawText": key text lines for auditing (null if empty)
`;

        const result = await model.generateContent([
            prompt,
            { inlineData: { data: base64, mimeType } },
        ]);

        const parsed = JSON.parse(result.response.text());
        logger.info('[OCR-Slip]', `confidence=${parsed.confidence} amount=${parsed.amount} ref=${parsed.refNumber}`);
        return NextResponse.json(parsed);
    } catch (error) {
        logger.error('[OCR-Slip]', 'POST error', error);
        return NextResponse.json({ error: error.message || 'OCR failed' }, { status: 500 });
    }
}
