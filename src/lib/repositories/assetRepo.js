import { getPrisma } from '@/lib/db';
import { logger } from '@/lib/logger';

const CAT_MAP = { MARKETING: 'MKT', KITCHEN: 'KTC', OFFICE: 'OFF', GENERAL: 'GEN' };

async function generateAssetId(category) {
    const prisma = await getPrisma();
    const year = new Date().getFullYear();
    const cat3 = CAT_MAP[category?.toUpperCase()] || category?.substring(0, 3).toUpperCase() || 'GEN';
    const prefix = `AST-${cat3}-${year}-`;
    const last = await prisma.asset.findFirst({
        where: { assetId: { startsWith: prefix } },
        orderBy: { assetId: 'desc' }
    });
    const nextSerial = last ? parseInt(last.assetId.split('-').pop(), 10) + 1 : 1;
    return `${prefix}${nextSerial.toString().padStart(3, '0')}`;
}

export async function getAllAssets(opts = {}) {
    try {
        const prisma = await getPrisma();
        const { category, status, search } = opts;

        const where = {};
        if (category) where.category = category;
        if (status) where.status = status;
        if (search) where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { assetId: { contains: search, mode: 'insensitive' } },
            { serialNumber: { contains: search, mode: 'insensitive' } }
        ];

        return prisma.asset.findMany({
            where,
            include: { assignedTo: { select: { firstName: true, lastName: true, nickName: true } } },
            orderBy: [{ category: 'asc' }, { name: 'asc' }]
        });
    } catch (error) {
        logger.error('[AssetRepo]', 'Failed to get assets', error);
        throw error;
    }
}

export async function createAsset({ name, category, status, location, assignedToId, purchaseDate, purchasePrice, vendor, serialNumber, warrantyExpiry, notes }) {
    try {
        const prisma = await getPrisma();
        const assetId = await generateAssetId(category);
        return prisma.asset.create({
            data: {
                assetId, name, category: category ?? 'GENERAL', status: status ?? 'ACTIVE',
                location, assignedToId, vendor, serialNumber, notes,
                purchasePrice: purchasePrice ? Number(purchasePrice) : undefined,
                purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
                warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : undefined
            }
        });
    } catch (error) {
        logger.error('[AssetRepo]', 'Failed to create asset', error);
        throw error;
    }
}

export async function updateAsset(id, data) {
    try {
        const prisma = await getPrisma();
        return prisma.asset.update({
            where: { id },
            data: {
                ...(data.status && { status: data.status }),
                ...(data.location !== undefined && { location: data.location }),
                ...(data.assignedToId !== undefined && { assignedToId: data.assignedToId }),
                ...(data.notes !== undefined && { notes: data.notes }),
                ...(data.lastServiceDate && { lastServiceDate: new Date(data.lastServiceDate) }),
                ...(data.warrantyExpiry && { warrantyExpiry: new Date(data.warrantyExpiry) })
            },
            include: { assignedTo: { select: { firstName: true, lastName: true, nickName: true } } }
        });
    } catch (error) {
        logger.error('[AssetRepo]', 'Failed to update asset', error);
        throw error;
    }
}

export async function getAssetById(id) {
    try {
        const prisma = await getPrisma();
        return prisma.asset.findUnique({
            where: { id },
            include: { assignedTo: true }
        });
    } catch (error) {
        logger.error('[AssetRepo]', 'Failed to get asset by ID', error);
        throw error;
    }
}
