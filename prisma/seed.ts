import 'dotenv/config';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seeding...');
    console.log('🔌 Using URL:', process.env.DATABASE_URL?.replace(/:.*@/, ':****@'));
    // 1. Employee (Admin)
    const adminPasswordHash = await bcrypt.hash('vschool2026', 10);
    await prisma.employee.upsert({
        where: { employeeId: 'TVS-EMP-2026-0001' },
        update: { passwordHash: adminPasswordHash, role: 'ADMIN', status: 'ACTIVE' },
        create: {
            employeeId: 'TVS-EMP-2026-0001',
            firstName: 'Admin',
            lastName: 'User',
            nickName: 'Admin',
            email: 'admin@vschool.com',
            passwordHash: adminPasswordHash,
            role: 'ADMIN',
            status: 'ACTIVE',
        },
    });
    console.log('✅ Employee seeded');

    // 2. Products (Courses) — sourced from course_summary.md Revision 7.0
    const products = [
        // === Japanese Culinary (TVS-JP) ===
        { productId: 'TVS-JP-2FC-HC-01', name: 'เรียนอาหารญี่ปุ่นพื้นฐาน', price: 9900, category: 'japanese_culinary', isActive: true },
        { productId: 'TVS-JP-2FC-HR-02', name: 'อาหารญี่ปุ่นพื้นบ้าน', price: 11500, category: 'japanese_culinary', isActive: true },
        { productId: 'TVS-JP-2FC-SC-03', name: 'ซูชิและซาซิมิเบื้องต้น', price: 17000, category: 'japanese_culinary', isActive: true },
        { productId: 'TVS-JP-2FC-HN-04', name: 'ราเมนมืออาชีพ', price: 17000, category: 'japanese_culinary', isActive: true },
        { productId: 'TVS-JP-2FC-SC-05', name: 'แล่ปลาแซลมอน', price: 19990, category: 'japanese_culinary', isActive: true },
        { productId: 'TVS-JP-2FC-SC-06', name: 'ฟิวชัน ซูชิ', price: 9900, category: 'japanese_culinary', isActive: true },
        { productId: 'TVS-JP-2FC-HR-07', name: 'ดงบูริ ข้าวหน้า 8 เมนู', price: 8800, category: 'japanese_culinary', isActive: true },
        { productId: 'TVS-JP-2FC-DS-08', name: 'ขนมหวานญี่ปุ่น', price: 4500, category: 'japanese_culinary', isActive: true },
        { productId: 'TVS-JP-2FC-HO-09', name: 'ทาโกะยากิ', price: 2500, category: 'japanese_culinary', isActive: true },
        { productId: 'TVS-JP-2FC-HO-10', name: 'ชาบู ชาบู', price: 5500, category: 'japanese_culinary', isActive: true },
        { productId: 'TVS-JP-2FC-HO-11', name: 'เกี๊ยวซ่า แป้งสด', price: 7500, category: 'japanese_culinary', isActive: true },
        { productId: 'TVS-JP-2FC-HC-12', name: 'อิซากาย่า', price: 7500, category: 'japanese_culinary', isActive: true },
        { productId: 'TVS-JP-2FC-HO-13', name: 'ยากินิกุ', price: 9900, category: 'japanese_culinary', isActive: true },
        { productId: 'TVS-JP-2FC-HN-14', name: 'ราเมนเส้นสด', price: 5500, category: 'japanese_culinary', isActive: true },
        { productId: 'TVS-JP-2FC-CO-15', name: 'น้ำสลัดยอดนิยม', price: 5500, category: 'japanese_culinary', isActive: true },
        { productId: 'TVS-JP-1FC-HO-16', name: 'คัตสึเร็สึ เมนูทอด', price: 8800, category: 'japanese_culinary', isActive: true },
        { productId: 'TVS-JP-1FC-HR-17', name: 'อาหาร เทปันยากิ', price: 12500, category: 'japanese_culinary', isActive: true },
        { productId: 'TVS-JP-1FC-DS-18', name: 'ขนมหวาน 4 ฤดู', price: 32000, category: 'japanese_culinary', isActive: true },
        { productId: 'TVS-JP-1FC-SC-19', name: 'โอมากาเสะปลาไทย', price: 15500, category: 'japanese_culinary', isActive: true },
        { productId: 'TVS-JP-1FC-HC-20', name: 'ทักษะพื้นฐาน โดยเชฟ', price: 12500, category: 'japanese_culinary', isActive: true },
        // === Specialty & Arts ===
        { productId: 'TVS-SP-2FC-HO-01', name: 'แคนนาเดียนล็อบสเตอร์', price: 17000, category: 'specialty', isActive: true },
        { productId: 'TVS-MG-1FC-MG-01', name: 'การบริหารจัดการครัว', price: 9900, category: 'management', isActive: true },
        { productId: 'TVS-AR-1FC-AR-01', name: 'ศิลปะการจัดการจาน', price: 15500, category: 'arts', isActive: true },
        // === Business Packages (TVS-PKGxx) — ราคาพิเศษ ===
        { productId: 'TVS-PKG01-BUFFET-30H', name: 'เปิดร้านบุฟเฟต์', price: 32800, category: 'package', isActive: true },
        { productId: 'TVS-PKG02-DELIVERY-39H', name: 'เปิดร้าน Delivery', price: 33900, category: 'package', isActive: true },
        { productId: 'TVS-PKG03-RAMEN-39H', name: 'เปิดร้านราเมง', price: 39400, category: 'package', isActive: true },
        { productId: 'TVS-PKG04-CAFE-42H', name: 'เปิดร้านคาเฟ่', price: 49600, category: 'package', isActive: true },
        { productId: 'TVS-PKG05-HOTKITCHEN-63H', name: 'เปิดร้านครัวร้อน', price: 51900, category: 'package', isActive: true },
        { productId: 'TVS-PKG06-ABROAD-63H', name: 'ไปต่างประเทศ', price: 59390, category: 'package', isActive: true },
        { productId: 'TVS-PKG07-PROCHEF-78H', name: 'เชฟอาหารญี่ปุ่นมืออาชีพ', price: 74890, category: 'package', isActive: true },
        // === Full Courses (TVS-FC) ===
        { productId: 'TVS-FC-FULL-COURSES-A-111H', name: 'Full Course 111 Hrs', price: 110000, category: 'full_course', isActive: true },
        { productId: 'TVS-FC-FULL-COURSES-B-201H', name: 'Full Course 201 Hrs', price: 160000, category: 'full_course', isActive: true },
    ];
    for (const p of products) {
        await prisma.product.upsert({
            where: { productId: p.productId },
            update: { name: p.name, price: p.price, category: p.category, isActive: p.isActive },
            create: p
        });
    }
    console.log('✅ Products seeded');

    // 3. Customers
    const customers = [
        { customerId: 'TVS-CUS-FB-26-0001', firstName: 'Somchai', lastName: 'Saito', nickName: 'Chai', facebookId: 'fb_test_001', lifecycleStage: 'Lead', membershipTier: 'MEMBER' },
        { customerId: 'TVS-CUS-LN-26-0001', firstName: 'Yuki', lastName: 'Tanaka', nickName: 'Yuki', lineId: 'line_test_001', lifecycleStage: 'Customer', membershipTier: 'VIP' },
    ];
    const seededCustomers = [];
    for (const c of customers) {
        const sc = await prisma.customer.upsert({ where: { customerId: c.customerId }, update: c, create: c });
        seededCustomers.push(sc);
    }
    console.log('✅ Customers seeded');

    // 4. Conversations & Messages
    const convs = [
      { 
        conversationId: 't_10163799966326505', 
        channel: 'facebook', 
        status: 'open', 
        participantName: 'Somchai Saito',
        customerId: seededCustomers[0].id,
        messages: [
          { messageId: 'm_1', content: 'สนใจคอร์สซูชิครับ', fromName: 'Somchai Saito', fromId: 'fb_test_001' },
          { messageId: 'm_2', content: 'สวัสดีค่ะ สนใจเป็นคอร์สพื้นฐานหรือมืออาชีพคะ?', fromName: 'Admin', responderId: (await prisma.employee.findFirst())?.id }
        ]
      },
      { 
        conversationId: 't_202603080001', 
        channel: 'line', 
        status: 'open', 
        participantName: 'Yuki Tanaka',
        customerId: seededCustomers[1].id,
        messages: [
          { messageId: 'm_3', content: 'สอบถามเรื่องการแล่ปลาครับ', fromName: 'Yuki Tanaka', fromId: 'line_test_001' }
        ]
      }
    ];

    for (const c of convs) {
      const { messages, ...convData } = c;
      const conversation = await prisma.conversation.upsert({
        where: { conversationId: convData.conversationId },
        update: { status: convData.status, participantName: convData.participantName },
        create: convData
      });

      for (const m of messages) {
        await prisma.message.upsert({
          where: { messageId: m.messageId },
          update: { content: m.content },
          create: { ...m, conversationId: conversation.id }
        });
      }
    }
    console.log('✅ Conversations & Messages seeded');

    console.log('🚀 Seed complete');
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error('❌ Seed failed:', e);
        await prisma.$disconnect();
        process.exit(1);
    })
