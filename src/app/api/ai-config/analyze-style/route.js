import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getPrisma } from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * GET /api/ai-config/analyze-style
 * Returns list of employees with their outbound message count
 */
export async function GET() {
    try {
        const prisma = await getPrisma();

        // Get all employees with a count of messages they've sent
        const employees = await prisma.employee.findMany({
            select: {
                id:         true,
                employeeId: true,
                firstName:  true,
                lastName:   true,
                role:       true,
                _count: {
                    select: {
                        respondedMessages: true,
                    },
                },
            },
            orderBy: { firstName: 'asc' },
        });

        return NextResponse.json({
            success: true,
            employees: employees.map(e => ({
                id:           e.id,
                employeeId:   e.employeeId,
                name:         `${e.firstName}${e.lastName ? ' ' + e.lastName : ''}`,
                role:         e.role,
                messageCount: e._count.respondedMessages,
            })),
        });
    } catch (err) {
        logger.error('[AnalyzeStyle]', 'GET error', err);
        return NextResponse.json({ success: false, error: 'Failed to load employees' }, { status: 500 });
    }
}

/**
 * POST /api/ai-config/analyze-style
 * Body: { employeeId: string (UUID) }
 * Fetches the admin's outbound messages → Gemini analysis → returns style profile
 */
export async function POST(request) {
    try {
        const { employeeId } = await request.json();
        if (!employeeId) {
            return NextResponse.json({ success: false, error: 'employeeId required' }, { status: 400 });
        }

        const prisma = await getPrisma();

        // Verify employee exists
        const employee = await prisma.employee.findUnique({
            where:  { id: employeeId },
            select: { firstName: true, lastName: true, employeeId: true },
        });
        if (!employee) {
            return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 });
        }

        // Fetch up to 200 messages sent by this admin (outbound, non-empty, meaningful length)
        const messages = await prisma.message.findMany({
            where: {
                responderId: employeeId,
                content:     { not: null },
            },
            select:  { content: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
            take:    200,
        });

        if (messages.length < 5) {
            return NextResponse.json({
                success: false,
                error: `พบข้อความจาก ${employee.firstName} เพียง ${messages.length} ข้อความ — ต้องการอย่างน้อย 5 ข้อความเพื่อวิเคราะห์`,
            }, { status: 422 });
        }

        // Build sample text for Gemini (max ~8000 chars)
        const sampleMessages = messages
            .filter(m => m.content && m.content.trim().length > 3)
            .map((m, i) => `[${i + 1}] ${m.content.trim()}`)
            .join('\n');

        const truncated = sampleMessages.length > 8000
            ? sampleMessages.slice(0, 8000) + '\n...(ตัดให้พอดี)'
            : sampleMessages;

        // Gemini analysis prompt
        const analysisPrompt = `คุณเป็นผู้เชี่ยวชาญวิเคราะห์สไตล์การสื่อสาร

ต่อไปนี้คือข้อความที่แอดมิน "${employee.firstName}" ส่งหาลูกค้า (${messages.length} ข้อความ):
────────────────────────────────────────
${truncated}
────────────────────────────────────────

วิเคราะห์สไตล์การสื่อสารของแอดมินคนนี้ แล้วสรุปเป็น "Style Profile" ที่ AI อื่นสามารถนำไปเลียนแบบได้ทันที

ต้องครอบคลุม 5 หัวข้อนี้เท่านั้น:
1. **คำติดปาก / สำนวนที่ใช้บ่อย** — คำ วลี หรืออีโมจิที่ใช้ซ้ำๆ
2. **ความยาวและโครงสร้างข้อความ** — สั้น/กลาง/ยาว, มีหลายย่อหน้าไหม, ใช้ bullet ไหม
3. **ภาษาและน้ำเสียง** — ทางการ/เป็นกันเอง, ใช้ครับ/ค่ะ/คะ/นะ อย่างไร, ระดับความอบอุ่น
4. **ขั้นตอนการตอบ** — มีลำดับการตอบที่ชัดเจนไหม เช่น ทักก่อน → ตอบ → CTA
5. **การจัดการปัญหาหรือคำถามยาก** — ปฏิเสธอย่างไร, อธิบายราคา/รายละเอียดอย่างไร

ตอบเป็นภาษาไทย กระชับ ตรงประเด็น ไม่ต้องอธิบายยืดยาว เน้นให้ AI นำไปใช้ได้เลย`;

        const model  = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const result = await model.generateContent(analysisPrompt);
        const profile = result.response.text().trim();

        const adminName = `${employee.firstName}${employee.lastName ? ' ' + employee.lastName : ''}`;

        return NextResponse.json({
            success:      true,
            profile,
            adminName,
            messageCount: messages.length,
        });

    } catch (err) {
        logger.error('[AnalyzeStyle]', 'POST error', err);
        return NextResponse.json({ success: false, error: 'Style analysis failed' }, { status: 500 });
    }
}
