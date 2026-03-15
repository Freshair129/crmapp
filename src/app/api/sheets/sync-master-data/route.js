// FILE 1: src/app/api/sheets/sync-master-data/route.js
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getPrisma } from '@/lib/db';
import { upsertIngredient, upsertBOM } from '@/lib/repositories/kitchenRepo';
import { getServerSession } from 'next-auth';

export async function POST(request) {
    try {
        const session = await getServerSession();
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
                if (!row.productId) continue;
                await prisma.product.upsert({
                    where: { productId: row.productId },
                    update: {
                        name: row.name,
                        category: row.category,
                        price: parseFloat(row.price) || 0,
                        duration: parseInt(row.duration) || 0,
                        description: row.description
                    },
                    create: {
                        productId: row.productId,
                        name: row.name,
                        category: row.category || 'course',
                        price: parseFloat(row.price) || 0,
                        duration: parseInt(row.duration) || 0,
                        description: row.description,
                        isActive: true
                    }
                });
                summary.synced.courses++;
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

        // 3. BOM
        if (urls.bom) {
            const res = await fetch(urls.bom);
            const data = parseCSV(await res.text());
            for (const row of data) {
                const product = await prisma.product.findUnique({ where: { productId: row.productId } });
                const ingredient = await prisma.ingredient.findUnique({ where: { ingredientId: row.ingredientId } });

                if (product && ingredient) {
                    await upsertBOM({
                        productId: product.id,
                        ingredientId: ingredient.id,
                        qtyPerPerson: parseFloat(row.qtyPerPerson) || 0,
                        unit: row.unit
                    });
                    summary.synced.bom++;
                } else {
                    logger.warn('[SyncMasterData]', `BOM skip: Product ${row.productId} or Ingredient ${row.ingredientId} not found`);
                    summary.skipped.bom++;
                }
            }
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
