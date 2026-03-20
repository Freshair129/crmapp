import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getAllAIConfig } from '@/lib/repositories/aiConfigRepo';

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

        // ── Pull config from DB (persona + knowledge + tone guides) ──
        const aiConfig = await getAllAIConfig();

        const toneGuide = {
            friendly: aiConfig.tone_friendly,
            formal:   aiConfig.tone_formal,
            sales:    aiConfig.tone_sales,
        };

        // ── Build customer context ──
        const customerCtx = [
            customerName    ? `ชื่อลูกค้า: ${customerName}`    : null,
            lifecycleStage  ? `สถานะ: ${lifecycleStage}`        : null,
        ].filter(Boolean).join(', ');

        // ── Recent conversation history (last 10 messages) ──
        const recentCtx = recentMessages.length > 0
            ? '\n\nบทสนทนาล่าสุด:\n' + recentMessages.slice(-10).map(m =>
                `${m.role === 'customer' ? '👤 ลูกค้า' : '💬 แอดมิน'}: ${m.content}`
            ).join('\n')
            : '';

        // ── Compose prompt ──
        const prompt = `${aiConfig.persona}

=== ข้อมูลโรงเรียน ===
${aiConfig.knowledge}
======================

ช่วยเขียนข้อความตอบลูกค้าให้แอดมิน โดยใช้น้ำเสียงแบบ: ${toneGuide[tone] ?? toneGuide.friendly}

${customerCtx ? `ข้อมูลลูกค้า: ${customerCtx}` : ''}${recentCtx}

แนวทางที่แอดมินต้องการสื่อ:
"${input}"

กฎ:
- ตอบเป็นภาษาไทย (เว้นแต่ลูกค้าเขียนภาษาอังกฤษ)
- ห้ามใส่เครื่องหมายคำพูด (" ") ครอบข้อความ
- ห้ามอธิบายหรือบอกว่า "ข้อความที่แนะนำ:" ให้ตอบเป็นข้อความสำเร็จรูปพร้อมส่งได้เลย
- ความยาวพอดี ไม่สั้นเกินหรือยาวเกิน
- ถ้า tone เป็น sales ให้มี soft CTA แต่ไม่กดดัน`;

        const model  = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const result = await model.generateContent(prompt);
        const reply  = result.response.text().trim();

        return NextResponse.json({ success: true, reply });

    } catch (error) {
        logger.error('[AIReply]', 'POST error', error);
        return NextResponse.json({ success: false, error: 'AI service error' }, { status: 500 });
    }
}
