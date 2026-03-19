// FILE 1: src/app/api/sheets/sync-master-data/route.js
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getPrisma } from '@/lib/db';
import { upsertIngredient } from '@/lib/repositories/kitchenRepo';
import { generateProductId } from '@/lib/repositories/courseRepo';
import { getSession } from '@/lib/getSession';

export async function POST(request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const prisma = await getPrisma();
        const urls = {
            courses: process.env.SHEET_COURSES_URL,
            ingredients: process.env.SHEET_INGREDIENTS_URL,
            bom: process.env.SHEET_BOM_URL,
            assets: process.env.SHEET_ASSETS_URL,
        };

        const summary = {
            synced: { courses: 0, ingredients: 0, bom: 0, assets: 0 },
            skipped: { bom: 0 },
            errors: []
        };

        const parseCSV = (text) => {
            const lines = text.split(/\r?\n/).filter(line => line.trim());
            if (lines.length < 2) return [];
            const headers = lines[0].split(',').map(h => h.trim());
            return lines.slice(1).map(line => {
                const values = line.split(',').map(v => v.trim());
                return headers.reduce((obj, header, i) => {
                    obj[header] = values[i];
                    return obj;
                }, {});
            });
        };

        // 1. COURSES
        if (urls.courses) {
            const res = await fetch(urls.courses);
            const data = parseCSV(await res.text());
            for (const row of data) {
                // Require at least a name to process a row
                if (!row.name || !row.name.trim()) continue;

                // Auto-generate productId if the Sheet row doesn't have one yet
                const productId = row.productId?.trim() || await generateProductId(row.category || 'course');

                // Build metadata object from Sheet columns
                const tags = row.tags ? row.tags.split('|').map(t => t.trim()).filter(Boolean) : undefined;
                const metadataUpdate = tags ? { tags } : undefined;

                const sharedFields = {
                    name: row.name.trim(),
                    category: row.category?.trim() || 'course',
                    price: parseFloat(row.price) || 0,
                    ...(row.basePrice ? { basePrice: parseFloat(row.basePrice) } : {}),
                    ...(row.duration ? { duration: parseInt(row.duration) } : {}),
                    ...(row.hours ? { hours: parseFloat(row.hours) } : {}),
                    ...(row.days ? { days: parseFloat(row.days) } : {}),
                    ...(row.sessionType ? { sessionType: row.sessionType.trim() } : {}),
                    ...(row.description ? { description: row.description.trim() } : {}),
                    ...(row.image ? { image: row.image.trim() } : {}),
                    ...(metadataUpdate ? { metadata: metadataUpdate } : {}),
                    ...(row.isActive !== undefined ? { isActive: row.isActive !== 'false' && row.isActive !== '0' } : {}),
                };

                await prisma.product.upsert({
                    where: { productId },
                    update: sharedFields,
                    create: { productId, isActive: true, ...sharedFields }
                });
                summary.synced.courses++;
                logger.info('[SyncMasterData]', `Course upserted: ${productId} — ${row.name}`);
            }
        }

        // 2. INGREDIENTS
        if (urls.ingredients) {
            const res = await fetch(urls.ingredients);
            const data = parseCSV(await res.text());
            for (const row of data) {
                if (!row.ingredientId) continue;
                await upsertIngredient({
                    ingredientId: row.ingredientId,
                    name: row.name,
                    unit: row.unit,
                    currentStock: parseFloat(row.currentStock) || 0,
                    minStock: parseFloat(row.minStock) || 0,
                    category: row.category,
                    costPerUnit: row.costPerUnit ? parseFloat(row.costPerUnit) : undefined
                });
                summary.synced.ingredients++;
            }
        }

        // 3. BOM — deprecated: CourseBOM was removed in Phase 20.
        // BOM is now managed via Recipe → RecipeIngredient in the app UI.
        // Sheet column `bom` is ignored to avoid breaking sync; skipped count preserved.
        if (urls.bom) {
            logger.warn('[SyncMasterData]', 'SHEET_BOM_URL is set but CourseBOM was removed in Phase 20. BOM must be managed via Recipe UI. Skipping BOM sync.');
        }

        // 4. ASSETS
        if (urls.assets) {
            const res = await fetch(urls.assets);
            const data = parseCSV(await res.text());
            for (const row of data) {
                if (!row.assetId) continue;
                await prisma.asset.upsert({
                    where: { assetId: row.assetId },
                    update: {
                        name: row.name,
                        category: row.category,
                        status: row.status,
                        location: row.location,
                        purchasePrice: row.purchasePrice ? parseFloat(row.purchasePrice) : undefined,
                        vendor: row.vendor,
                        serialNumber: row.serialNumber,
                        notes: row.notes
                    },
                    create: {
                        assetId: row.assetId,
                        name: row.name,
                        category: row.category || 'GENERAL',
                        status: row.status || 'ACTIVE',
                        location: row.location,
                        purchasePrice: row.purchasePrice ? parseFloat(row.purchasePrice) : undefined,
                        vendor: row.vendor,
                        serialNumber: row.serialNumber,
                        notes: row.notes
                    }
                });
                summary.synced.assets++;
            }
        }

        return NextResponse.json(summary);
    } catch (error) {
        logger.error('[SyncMasterData]', 'Sync failed', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
