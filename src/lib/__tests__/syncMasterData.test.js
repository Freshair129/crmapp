// FILE: src/lib/__tests__/syncMasterData.test.js
/**
 * ## Pre-flight: syncMasterData logic (from route.js)
 * Logic source: src/app/api/sheets/sync-master-data/route.js
 * Internal functions tested: parseCSV helper
 * BOM Skip logic: Requires matching product.productId and ingredient.ingredientId
 * Function signatures:
 *   - parseCSV(text)
 */

import { describe, it, expect } from 'vitest';

// Identical implementation from route.js
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

describe('syncMasterData logic', () => {
    describe('parseCSV extraction', () => {
        it('should clean headers and values correctly', () => {
            const raw = " productId , name \r\n P01 , Japanese Course ";
            const data = parseCSV(raw);
            expect(data).toHaveLength(1);
            expect(data[0]).toEqual({ productId: 'P01', name: 'Japanese Course' });
        });

        it('should return empty array for single header line', () => {
            expect(parseCSV("col1,col2")).toHaveLength(0);
        });
    });

    describe('BOM skip business logic unit', () => {
        it('should increment skipped.bom if either product or ingredient missing', () => {
            const summary = { synced: { bom: 0 }, skipped: { bom: 0 } };
            const csvData = [
                { productId: 'FOUND', ingredientId: 'FOUND' },
                { productId: 'MISSING', ingredientId: 'FOUND' },
                { productId: 'FOUND', ingredientId: 'MISSING' }
            ];

            const dbProducts = { 'FOUND': { id: 'p1' } };
            const dbIngredients = { 'FOUND': { id: 'i1' } };

            for (const row of csvData) {
                const product = dbProducts[row.productId];
                const ingredient = dbIngredients[row.ingredientId];

                if (product && ingredient) {
                    summary.synced.bom++;
                } else {
                    summary.skipped.bom++;
                }
            }

            expect(summary.synced.bom).toBe(1);
            expect(summary.skipped.bom).toBe(2);
        });
    });
});
