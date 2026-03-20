import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getAllAIConfig } from '@/lib/repositories/aiConfigRepo';
import { getActiveFilesWithContent } from '@/lib/repositories/knowledgeFileRepo';
import { createAIAssistLog } from '@/lib/repositories/aiAssistLogRepo';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * POST /api/inbox/ai-reply
 * Body: {
 *   input:            string   — admin's introduction/direction hint
 *   tone:             'friendly' | 'formal' | 'sales'
 *   conversationId?:  string   — thread ID (t_xxx / LINE id) for history tracking
 *   inboxId?:         string   — conversations table UUID
 *   customerName?:    string
 *   lifecycleStage?:  string
 *   recentMessages?:  { role: 'admin'|'customer', content: string }[]
 * }
 * Returns: { success, reply, logId }
 *
 * ── Prompt Architecture ────────────────────────────────────────────────────
 *  SYSTEM INSTRUCTION  (immutable — set once, never changes per request)
 *    • AI persona & identity
 *    • Knowledge files (index + content)
 *    • Quick notes
 *    • Hard rules (language, format, no quote marks, etc.)
 *
 *  USER MESSAGE        (dynamic — built fresh each request)
 *    • Customer info (name, lifecycle stage, thread ID)
 *    • Full conversation history (chat context)
 *    • Desired tone
 *    • Admin's introduction/hint
 * ──────────────────────────────────────────────────────────────────────────
 */
export async function POST(request) {
    try {
        const {
            input,               // optional per-request override (from inbox panel)
            tone = 'friendly',
            conversationId,
            inboxId,
            customerName,
            lifecycleStage,
            recentMessages = [],
            adminStyleOverride,  // per-request style profile (from Admin Style Mode in inbox)
            adminStyleName,      // display name for the overriding admin
        } = await request.json();

        // ── Load config + knowledge files in parallel ──────────────────────
        const [aiConfig, knowledgeFiles] = await Promise.all([
            getAllAIConfig(),
            getActiveFilesWithContent(),
        ]);

        const toneGuides = {
            friendly: aiConfig.tone_friendly,
            formal:   aiConfig.tone_formal,
            sales:    aiConfig.tone_sales,
        };
        const selectedTone = toneGuides[tone] ?? toneGuides.friendly;

        // ── Build knowledge sections ───────────────────────────────────────
        const textFiles  = knowledgeFiles.filter(f => f.contentText);
        const imageFiles = knowledgeFiles.filter(f => f.contentB64);

        const knowledgeIndex = knowledgeFiles.length > 0
            ? '\n\n=== ข้อมูลอ้างอิงของร้าน (ไฟล์ภายในของ V School — ไม่ใช่ไฟล์จากลูกค้า) ===\n' +
              knowledgeFiles.map((f, i) => `  ${i + 1}. ${f.filename} [${f.fileType.toUpperCase()}]`).join('\n') +
              '\nให้ใช้ข้อมูลในเอกสารเหล่านี้เป็นฐานความรู้ก่อนตอบเสมอ'
            : '';

        const knowledgeSections = textFiles.length > 0
            ? '\n\n=== เนื้อหาเอกสารอ้างอิงของร้าน (ข้อมูลภายใน — ไม่ใช่จากลูกค้า) ===\n' +
              textFiles.map((f, i) =>
                  `--- [${i + 1}] ${f.filename} ---\n${f.contentText}`
              ).join('\n\n') +
              '\n========================================================'
            : '';

        const quickNotes = aiConfig.knowledge
            ? `\n\n=== Quick Notes — ข้อมูลพื้นฐานของร้าน (ไม่ใช่จากลูกค้า) ===\n${aiConfig.knowledge}\n=============================================================`
            : '';

        // ══════════════════════════════════════════════════════════════════
        //  SYSTEM INSTRUCTION — immutable, defines AI identity + rules
        // ══════════════════════════════════════════════════════════════════
        const systemInstruction = [
            // 1. Persona (who the AI is)
            aiConfig.persona,

            // 2. Knowledge files index + content
            knowledgeIndex,
            knowledgeSections,

            // 3. Quick notes
            quickNotes,

            // 4. Reply length instruction
            (() => {
                const lengthMap = {
                    short:  'ตอบสั้นมาก — 1 ถึง 2 ประโยคเท่านั้น กระชับที่สุด',
                    medium: 'ตอบความยาวปานกลาง — ประมาณ 2 ถึง 4 ประโยค ครอบคลุมประเด็นสำคัญ',
                    long:   'ตอบแบบละเอียด — หลายย่อหน้า ครอบคลุมทุกแง่มุม อาจใช้ bullet ถ้าเหมาะสม',
                };
                const lengthGuide = lengthMap[aiConfig.reply_length] || lengthMap.medium;
                return `\n\n=== ความยาวการตอบ ===\n${lengthGuide}\n====================`;
            })(),

            // 5. Admin style profile — per-request override takes priority over config saved style
            (() => {
                const styleProfile = adminStyleOverride?.trim() || aiConfig.admin_style_profile?.trim();
                const styleName    = adminStyleOverride?.trim() ? (adminStyleName || '') : (aiConfig.admin_style_name || '');
                if (!styleProfile) return null;
                const source = adminStyleOverride?.trim() ? 'Override จาก Inbox' : 'จาก Config';
                return `\n\n=== สไตล์การสื่อสารที่ต้องเลียนแบบ (${styleName} · ${source}) ===\n${styleProfile}\n=======================================================================`;
            })(),

            // 6. Hard rules (never change regardless of user input)
            `
=== กฎการตอบที่ต้องปฏิบัติเสมอ ===
- ตอบเป็นข้อความสำเร็จรูปพร้อมส่งได้ทันที ห้ามอธิบายหรือใส่ label เช่น "ข้อความที่แนะนำ:"
- ห้ามใส่เครื่องหมายคำพูด (" ") ครอบข้อความ
- ตอบเป็นภาษาไทย เว้นแต่ลูกค้าเขียนภาษาอังกฤษ
- ถ้ามีข้อมูลราคาหรือรายละเอียดในเอกสารอ้างอิง ให้ใช้ข้อมูลจริงเท่านั้น ห้ามเดา
- ถ้า tone เป็น sales ให้มี soft CTA แต่ไม่กดดัน
- ปฏิบัติตามกฎความยาวการตอบอย่างเคร่งครัด
===================================`,
        ].filter(Boolean).join('');

        // ══════════════════════════════════════════════════════════════════
        //  USER MESSAGE — dynamic, built fresh per request
        // ══════════════════════════════════════════════════════════════════
        const customerSection = [
            customerName    ? `ชื่อลูกค้า: ${customerName}` : null,
            lifecycleStage  ? `สถานะ: ${lifecycleStage}`    : null,
            conversationId  ? `Thread ID: ${conversationId}` : null,
        ].filter(Boolean);

        const chatHistory = recentMessages.length > 0
            ? `\n=== ประวัติบทสนทนา (${recentMessages.length} ข้อความล่าสุด) ===\n` +
              recentMessages.map(m =>
                  `${m.role === 'customer' ? '👤 ลูกค้า' : '💬 แอดมิน'}: ${m.content}`
              ).join('\n') +
              '\n======================================================='
            : '\n[ยังไม่มีประวัติบทสนทนา — นี่อาจเป็นข้อความแรก]';

        const userMessage = [
            customerSection.length > 0
                ? `=== ข้อมูลลูกค้า ===\n${customerSection.join('\n')}\n===================`
                : null,

            chatHistory,

            `\n=== น้ำเสียงที่ต้องการ ===\n${selectedTone}\n=========================`,

            // Introduction: per-request override takes priority over config default
            (() => {
                const intro = input?.trim() || aiConfig.introduction?.trim();
                if (!intro) return null;
                const source = input?.trim() ? 'Override จากแอดมิน' : 'แนวทางจาก Config';
                return `\n=== แนวทางการตอบ (Introduction · ${source}) ===\n"${intro}"\n` +
                       `(ใช้แนวทางนี้เป็นทิศทาง แต่อ้างอิงบริบทบทสนทนาและข้อมูลความรู้เสมอ)\n` +
                       `================================================`;
            })(),
        ].filter(Boolean).join('\n');

        // ── Build Gemini request ───────────────────────────────────────────
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            systemInstruction,
        });

        // Image files → vision inline parts (appended before text)
        const imageParts = imageFiles.map(f => ({
            inlineData: {
                data: f.contentB64.replace(/^data:[^;]+;base64,/, ''),
                mimeType: f.mimeType,
            },
        }));

        const requestParts = imageParts.length > 0
            ? [...imageParts, { text: userMessage }]
            : userMessage;

        const result = await model.generateContent(requestParts);
        const reply  = result.response.text().trim();

        // ── Save to AI assist log (non-fatal) ─────────────────────────────
        const log = await createAIAssistLog({
            conversationId: conversationId ?? 'unknown',
            inboxId,
            input:          input?.trim() || aiConfig.introduction?.trim() || '',
            tone,
            reply,
            customerName,
        });

        return NextResponse.json({ success: true, reply, logId: log?.id ?? null });

    } catch (error) {
        logger.error('[AIReply]', 'POST error', error);
        return NextResponse.json({ success: false, error: 'AI service error' }, { status: 500 });
    }
}
