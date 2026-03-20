import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getAllAIConfig } from '@/lib/repositories/aiConfigRepo';
import { getActiveFilesWithContent } from '@/lib/repositories/knowledgeFileRepo';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * POST /api/inbox/ai-reply
 * Body: {
 *   input:            string   — admin's draft/idea
 *   tone:             'friendly' | 'formal' | 'sales'
 *   customerName?:    string
 *   lifecycleStage?:  string
 *   recentMessages?:  { role: 'admin'|'customer', content: string }[]
 * }
 * Returns: { success, reply }
 */
export async function POST(request) {
    try {
        const { input, tone = 'friendly', customerName, lifecycleStage, recentMessages = [] } = await request.json();

        if (!input?.trim()) {
            return NextResponse.json({ success: false, error: 'Input is required' }, { status: 400 });
        }

        // ── Load config + knowledge files in parallel ──────────────────────
        const [aiConfig, knowledgeFiles] = await Promise.all([
            getAllAIConfig(),
            getActiveFilesWithContent(),
        ]);

        const toneGuide = {
            friendly: aiConfig.tone_friendly,
            formal:   aiConfig.tone_formal,
            sales:    aiConfig.tone_sales,
        };

        // ── Build customer context ─────────────────────────────────────────
        const customerCtx = [
            customerName   ? `ชื่อลูกค้า: ${customerName}`   : null,
            lifecycleStage ? `สถานะ: ${lifecycleStage}`       : null,
        ].filter(Boolean).join(', ');

        // ── Recent conversation history (last 10 messages) ─────────────────
        const recentCtx = recentMessages.length > 0
            ? '\n\nบทสนทนาล่าสุด:\n' + recentMessages.slice(-10).map(m =>
                `${m.role === 'customer' ? '👤 ลูกค้า' : '💬 แอดมิน'}: ${m.content}`
            ).join('\n')
            : '';

        // ── Build knowledge file index + text sections ─────────────────────
        const textFiles  = knowledgeFiles.filter(f => f.contentText);
        const imageFiles = knowledgeFiles.filter(f => f.contentB64);

        const fileIndex = knowledgeFiles.length > 0
            ? '\n=== ไฟล์ความรู้ที่คุณมี (' + knowledgeFiles.length + ' ไฟล์) ===\n' +
              knowledgeFiles.map((f, i) => `  ${i + 1}. ${f.filename} [${f.fileType.toUpperCase()}]`).join('\n') +
              '\n==============================='
            : '';

        const textSections = textFiles.length > 0
            ? '\n\n=== เนื้อหาไฟล์ความรู้ ===\n' +
              textFiles.map((f, i) => `--- [${i + 1}] ${f.filename} ---\n${f.contentText}`).join('\n\n') +
              '\n========================'
            : '';

        // ── Compose system prompt ──────────────────────────────────────────
        const systemPrompt = `${aiConfig.persona}${fileIndex}

คุณต้องอ่านไฟล์ความรู้ก่อนเสมอ แล้วจึงสร้างคำตอบที่อ้างอิงข้อมูลจริงจากไฟล์เหล่านั้น
${aiConfig.knowledge ? `\n=== ข้อมูลพื้นฐาน ===\n${aiConfig.knowledge}\n=====================` : ''}${textSections}`;

        // ── Compose user prompt ────────────────────────────────────────────
        const userPrompt = `ช่วยเขียนข้อความตอบลูกค้าให้แอดมิน โดยใช้น้ำเสียงแบบ: ${toneGuide[tone] ?? toneGuide.friendly}

${customerCtx ? `ข้อมูลลูกค้า: ${customerCtx}` : ''}${recentCtx}

แนวทางที่แอดมินต้องการสื่อ:
"${input}"

กฎ:
- ตอบเป็นภาษาไทย (เว้นแต่ลูกค้าเขียนภาษาอังกฤษ)
- ห้ามใส่เครื่องหมายคำพูด (" ") ครอบข้อความ
- ห้ามอธิบายหรือบอกว่า "ข้อความที่แนะนำ:" ให้ตอบเป็นข้อความสำเร็จรูปพร้อมส่งได้เลย
- ความยาวพอดี ไม่สั้นเกินหรือยาวเกิน
- ถ้า tone เป็น sales ให้มี soft CTA แต่ไม่กดดัน
- ถ้ามีข้อมูลราคาหรือรายละเอียดคอร์สในไฟล์ความรู้ ให้อ้างอิงข้อมูลจริงเท่านั้น ห้ามเดา`;

        // ── Build Gemini request parts ─────────────────────────────────────
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            systemInstruction: systemPrompt,
        });

        // Image files → inline parts for Gemini vision
        const imageParts = imageFiles.map(f => {
            const base64Data = f.contentB64.replace(/^data:[^;]+;base64,/, '');
            return { inlineData: { data: base64Data, mimeType: f.mimeType } };
        });

        const requestParts = imageParts.length > 0
            ? [...imageParts, { text: userPrompt }]
            : userPrompt;

        const result = await model.generateContent(requestParts);
        const reply  = result.response.text().trim();

        return NextResponse.json({ success: true, reply });

    } catch (error) {
        logger.error('[AIReply]', 'POST error', error);
        return NextResponse.json({ success: false, error: 'AI service error' }, { status: 500 });
    }
}
