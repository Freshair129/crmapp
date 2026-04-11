const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        const count = await prisma.message.count({
            where: {
                createdAt: {
                    gte: new Date('2026-01-01T00:00:00Z')
                }
            }
        });
        console.log(`✅ Messages since Jan 1, 2026: ${count}`);

        const convs = await prisma.conversation.count({
            where: {
                lastMessageAt: {
                    gte: new Date('2026-01-01T00:00:00Z')
                }
            }
        });
        console.log(`✅ Conversations active since Jan 1, 2026: ${convs}`);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
check();
