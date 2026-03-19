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

        // 1. COURSES / PACKAGES / FULL COURSES
        // ─────────────────────────────────────────────────────────────────────
        // Google Sheet columns (all except name are optional):
        //
        //  productId     | ถ้าว่าง → auto-gen จาก components ด้านล่าง
        //  name          | ชื่อสินค้า (REQUIRED)
        //  productType   | COURSE | PACKAGE | FULL_COURSE  (default: COURSE)
        //  cuisineCode   | JP | TH | SP | MG | AR          (COURSE)
        //  packCode      | 1FC | 2FC | SP                  (COURSE)
        //  subcatCode    | HO | CO | SC | DS | HC | HR | HN | MG | AR (COURSE)
        //  pkgNo         | 01-99                            (PACKAGE)
        //  pkgShortName  | BUFFET | DELIVERY | …           (PACKAGE)
        //  category      | DB category field (japanese_culinary/package/…)
        //  price         | ราคาขาย
        //  basePrice     | ราคาก่อนลด
        //  hours         | ชั่วโมงเรียน
        //  days          | จำนวนวัน
        //  sessionType   | MORNING | AFTERNOON | EVENING (pipe-separated)
        //  description   | คำอธิบาย
        //  tags          | คั่นด้วย | เช่น sushi|japanese
        //  image         | URL รูปหลัก
        //  isActive      | TRUE / FALSE
        // ─────────────────────────────────────────────────────────────────────
        if (urls.courses) {
            const res = await fetch(urls.courses);
            const data = parseCSV(await res.text());
            for (const row of data) {
                if (!row.name || !row.name.trim()) continue;

                // Resolve productId — use Sheet value or auto-generate
                let productId = row.productId?.trim();
                if (!productId) {
                    const productType = row.productType?.trim().toUpperCase() || 'COURSE';
                    productId = await generateProductId({
                        productType,
                        cuisineCode: row.cuisineCode?.trim() || 'JP',
                        packCode:    row.packCode?.trim()    || '2FC',
                        subcatCode:  row.subcatCode?.trim()  || 'HO',
                        pkgNo:       row.pkgNo ? parseInt(row.pkgNo) : undefined,
                        pkgShortName: row.pkgShortName?.trim(),
                        hours:       row.hours ? parseFloat(row.hours) : 0,
                    });
                }

                // Infer DB category from cuisineCode if not explicitly provided
                const CUISINE_TO_CATEGORY = {
                    JP: 'japanese_culinary', TH: 'thai',
                    SP: 'specialty',         MG: 'management',
                    AR: 'arts',              FC: 'full_course',
                    PKG: 'package',
                };
                const inferredCategory = row.category?.trim()
                    || CUISINE_TO_CATEGORY[row.cuisineCode?.trim().toUpperCase()]
                    || (row.productType === 'PACKAGE' ? 'package' : 'japanese_culinary');

                const tags = row.tags ? row.tags.split('|').map(t => t.trim()).filter(Boolean) : undefined;

                const sharedFields = {
                    name:     row.name.trim(),
                    category: inferredCategory,
                    price:    parseFloat(row.price) || 0,
                    ...(row.basePrice    ? { basePrice:   parseFloat(row.basePrice) }  : {}),
                    ...(row.hours        ? { hours:        parseFloat(row.hours) }      : {}),
                    ...(row.days         ? { days:         parseFloat(row.days) }       : {}),
                    ...(row.sessionType  ? { sessionType:  row.sessionType.trim() }     : {}),
                    ...(row.description  ? { description:  row.description.trim() }     : {}),
                    ...(row.image        ? { image:        row.image.trim() }           : {}),
                    ...(tags             ? { metadata: { tags } }                       : {}),
                    ...(row.isActive !== undefined && row.isActive !== ''
                        ? { isActive: row.isActive !== 'false' && row.isActive !== '0' && row.isActive !== 'FALSE' }
                        : {}),
                };

                await prisma.product.upsert({
                    where: { productId },
                    update: sharedFields,
                    create: { productId, isActive: true, ...sharedFields }
                });
                summary.synced.courses++;
                logger.info('[SyncMasterData]', `Product upserted: ${productId} — ${row.name}`);
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
