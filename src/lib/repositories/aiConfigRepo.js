import { getPrisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * aiConfigRepo — key/value store for AI Reply Assistant settings
 *
 * Keys:
 *   persona              — AI identity / role description
 *   knowledge            — quick notes / school knowledge base
 *   introduction         — default direction hint for AI replies
 *   reply_length         — 'short' | 'medium' | 'long'
 *   admin_style_profile  — analyzed style profile text from a specific admin
 *   admin_style_name     — display name of the admin whose style was analyzed
 *   tone_friendly        — friendly tone guide
 *   tone_formal          — formal tone guide
 *   tone_sales           — sales tone guide
 */

const DEFAULT_VALUES = {
    persona:             'คุณคือผู้ช่วยแอดมินของ The V School โรงเรียนสอนทำอาหารญี่ปุ่นในกรุงเทพฯ ตอบด้วยภาษาที่อบอุ่น เป็นกันเอง และเป็นมืออาชีพ',
    knowledge:           'V School คือโรงเรียนสอนทำอาหารญี่ปุ่น กรุงเทพฯ\n- หลักสูตร: Sushi, Ramen, Bento, Omakase\n- เปิดรับสมัครตลอดปี ไม่จำกัดพื้นฐาน\n- ติดต่อผ่าน LINE และ Facebook Messenger',
    introduction:        '',
    reply_length:        'medium',
    admin_style_profile: '',
    admin_style_name:    '',
    tone_friendly:       'ภาษาเป็นกันเอง อบอุ่น แต่ยังคงความเป็นมืออาชีพ ใช้ครับ/ค่ะ ยิ้มแย้ม ให้ลูกค้ารู้สึกดี',
    tone_formal:         'ภาษาสุภาพเป็นทางการ ตรงประเด็น กระชับ มีน้ำหนัก เหมาะกับการแจ้งข้อมูลสำคัญ',
    tone_sales:          'ภาษาที่ดึงดูดใจ ชักชวน แต่ไม่กดดัน เน้นประโยชน์ที่ลูกค้าจะได้รับ กระตุ้นให้ตัดสินใจ soft CTA',
};

const ALL_KEYS = Object.keys(DEFAULT_VALUES);

/** Get all config values as a plain object { persona, knowledge, tone_friendly, ... } */
export async function getAllAIConfig() {
    try {
        const prisma = await getPrisma();
        const rows = await prisma.aIConfig.findMany({ where: { key: { in: ALL_KEYS } } });
        const result = { ...DEFAULT_VALUES };
        for (const row of rows) {
            result[row.key] = row.value;
        }
        return result;
    } catch (err) {
        logger.error('[aiConfigRepo]', 'getAllAIConfig failed', err);
        return { ...DEFAULT_VALUES };
    }
}

/** Upsert a single key */
export async function setAIConfig(key, value) {
    if (!ALL_KEYS.includes(key)) throw new Error(`Unknown AIConfig key: ${key}`);
    const prisma = await getPrisma();
    return prisma.aIConfig.upsert({
        where: { key },
        update: { value },
        create: { key, value },
    });
}

/** Upsert multiple keys at once — { key: value, ... } */
export async function setMultipleAIConfig(updates) {
    const prisma = await getPrisma();
    const ops = Object.entries(updates)
        .filter(([k]) => ALL_KEYS.includes(k))
        .map(([key, value]) =>
            prisma.aIConfig.upsert({
                where: { key },
                update: { value },
                create: { key, value },
            })
        );
    return prisma.$transaction(ops);
}
