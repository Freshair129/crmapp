import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * POST /api/inbox/ai-reply
 * Body: {
 *   input:       string   — admin's draft/idea (Thai or English)
 *   tone:        'friendly' | 'formal' | 'sales'
 *   customerName?: string
 *   lifecycleStage?: string
 *   recentMessages?: { role: 'admin'|'customer', content: string }[]
 * }
 * Returns: { success, reply }
 */
export async function POST(request) {
    try {
        const { input, tone = 'friendly', customerName, lifecycleStage, recentMessages = [] } = await request.json();

        if (!input?.trim()) {
            return NextResponse.json({ success: false, error: 'Input is required' }, { status: 400 });
        }

        const toneGuide = {
            friendly: 'ภาษาเป็นกันเอง อบอุ่น แต่ยังคงความเป็นมืออาชีพ ใช้ครับ/ค่ะ ยิ้มแย้ม ให้ลูกค้ารู้สึกดี',
            formal:   'ภาษาสุภาพเป็นทางการ ตรงประเด็น กระชับ มีน้ำหนัก เหมาะกับการแจ้งข้อมูลสำคัญ',
            sales:    'ภาษาที่ดึงดูดใจ ชักชวน แต่ไม่กดดัน เน้นประโยชน์ที่ลูกค้าจะได้รับ กระตุ้นให้ตัดสินใจ',
        };

        const customerCtx = [
            customerName ? `ชื่อลูกค้า: ${customerName}` : null,
            lifecycleStage ? `สถานะ: ${lifecycleStage}` : null,
        ].filter(Boolean).join(', ');

        const recentCtx = recentMessages.length > 0
            ? '\n\nบทสนทนาล่าสุด:\n' + recentMessages.slice(-4).map(m =>
                `${m.role === 'customer' ? '👤 ลูกค้า' : '💬 แอดมิน'}: ${m.content}`
            ).join('\n')
            : '';

        const prompt = `คุณคือผู้ช่วยแอดมินของ The V School โรงเรียนสอนทำอาหารญี่ปุ่นในกรุงเทพฯ
ช่วยเขียนข้อความตอบลูกค้าให้แอดมิน โดยใช้น้ำเสียงแบบ: ${toneGuide[tone]}

${customerCtx ? `ข้อมูลลูกค้า: ${customerCtx}` : ''}${recentCtx}

แนวทางที่แอดมินต้องการสื่อ:
"${input}"

กฎ:
- ตอบเป็นภาษาไทย (เว้นแต่ลูกค้าเขียนภาษาอังกฤษ)
- ห้ามใส่เครื่องหมายคำพูด (" ") ครอบข้อความ
- ห้ามอธิบายหรือบอกว่า "ข้อความที่แนะนำ:" ให้ตอบเป็นข้อความสำเร็จรูปพร้อมส่งได้เลย
- ความยาวพอดี ไม่สั้นเกินหรือยาวเกินไป
- ถ้า tone เป็น sales ให้มี soft CTA เช่น ชวนทดลอง/สอบถามเพิ่ม แต่ไม่กดดัน`;

        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(prompt);
        const reply  = result.response.text().trim();

        return NextResponse.json({ success: true, reply });
    } catch (error) {
        logger.error('[AIReply]', 'POST error', error);
        return NextResponse.json({ success: false, error: 'AI service error' }, { status: 500 });
    }
}
