/**
 * revenueAudit.test.js
 * Unit tests for revenue calculation helpers — used as audit verification.
 * Run: npx vitest run src/lib/__tests__/revenueAudit.test.js
 */

import { describe, it, expect } from 'vitest';
import {
    getRevenue,
    sumRevenue,
    safePct,
    perItemRevenue,
    avgChurnRisk,
} from '@/lib/revenueHelpers';

// ─── getRevenue ───────────────────────────────────────────────────────────────

describe('getRevenue()', () => {
    it('prefers _orderRevenue when present', () => {
        const c = { _orderRevenue: 15000, intelligence: { metrics: { total_spend: 9999 } } };
        expect(getRevenue(c)).toBe(15000);
    });

    it('falls back to intelligence.metrics.total_spend when _orderRevenue is 0 or absent', () => {
        const c = { _orderRevenue: 0, intelligence: { metrics: { total_spend: 5000 } } };
        expect(getRevenue(c)).toBe(5000);
    });

    it('returns 0 when both sources are absent', () => {
        expect(getRevenue({})).toBe(0);
        expect(getRevenue({ intelligence: {} })).toBe(0);
        expect(getRevenue(null)).toBe(0);
        expect(getRevenue(undefined)).toBe(0);
    });

    it('returns _orderRevenue=30000 for fully enriched customer', () => {
        const c = { _orderRevenue: 30000, intelligence: { metrics: { total_spend: 30000 } } };
        expect(getRevenue(c)).toBe(30000);
    });
});

// ─── sumRevenue ───────────────────────────────────────────────────────────────

describe('sumRevenue()', () => {
    it('sums _orderRevenue across customers', () => {
        const customers = [
            { _orderRevenue: 10000 },
            { _orderRevenue: 25000 },
            { _orderRevenue: 5000 },
        ];
        expect(sumRevenue(customers)).toBe(40000);
    });

    it('returns 0 for empty array', () => {
        expect(sumRevenue([])).toBe(0);
    });

    it('returns 0 for null/undefined', () => {
        expect(sumRevenue(null)).toBe(0);
        expect(sumRevenue(undefined)).toBe(0);
    });

    it('mixed _orderRevenue + intelligence fallback', () => {
        const customers = [
            { _orderRevenue: 8000 },
            { _orderRevenue: 0, intelligence: { metrics: { total_spend: 3000 } } },
            {},
        ];
        expect(sumRevenue(customers)).toBe(11000);
    });
});

// ─── safePct ──────────────────────────────────────────────────────────────────

describe('safePct()', () => {
    it('returns correct percentage string', () => {
        expect(safePct(5000, 20000)).toBe('25.0%');
    });

    it('returns null when total = 0 (prevents NaN%/Infinity%)', () => {
        expect(safePct(5000, 0)).toBeNull();
        expect(safePct(0, 0)).toBeNull();
    });

    it('handles full 100% case', () => {
        expect(safePct(20000, 20000)).toBe('100.0%');
    });

    it('respects decimal places parameter', () => {
        expect(safePct(1000, 3000, 2)).toBe('33.33%');
    });

    it('COGS at 45%: ฿4500 of ฿10000 = 45.0%', () => {
        expect(safePct(4500, 10000)).toBe('45.0%');
    });

    it('OpEx at 50%: ฿5000 of ฿10000 = 50.0%', () => {
        expect(safePct(5000, 10000)).toBe('50.0%');
    });

    it('Net profit at -5000 of 0 revenue returns null (not Infinity%)', () => {
        expect(safePct(-5000, 0)).toBeNull();
    });
});

// ─── perItemRevenue ───────────────────────────────────────────────────────────

describe('perItemRevenue()', () => {
    it('distributes evenly: ฿3000 / 3 items = ฿1000 each', () => {
        const items = [{ name: 'A' }, { name: 'B' }, { name: 'C' }];
        expect(perItemRevenue(3000, items)).toBe(1000);
    });

    it('returns full amount when items is empty (no division by zero)', () => {
        expect(perItemRevenue(5000, [])).toBe(5000);
    });

    it('returns full amount when items is null', () => {
        expect(perItemRevenue(5000, null)).toBe(5000);
    });

    it('single item: returns full amount', () => {
        expect(perItemRevenue(8025, [{ name: 'Course' }])).toBe(8025);
    });
});

// ─── avgChurnRisk ─────────────────────────────────────────────────────────────

describe('avgChurnRisk()', () => {
    it('returns 0 for empty customers (no NaN)', () => {
        expect(avgChurnRisk([])).toBe('0');
        expect(avgChurnRisk(null)).toBe('0');
    });

    it('all High risk = 100', () => {
        const customers = [
            { intelligence: { metrics: { churn_risk_level: 'High' } } },
            { intelligence: { metrics: { churn_risk_level: 'High' } } },
        ];
        expect(avgChurnRisk(customers)).toBe('100');
    });

    it('all Medium risk = 50', () => {
        const customers = [
            { intelligence: { metrics: { churn_risk_level: 'Medium' } } },
            { intelligence: { metrics: { churn_risk_level: 'Medium' } } },
        ];
        expect(avgChurnRisk(customers)).toBe('50');
    });

    it('mixed: 1 High + 1 Low = 50 avg', () => {
        const customers = [
            { intelligence: { metrics: { churn_risk_level: 'High' } } },
            { intelligence: { metrics: { churn_risk_level: 'Low' } } },
        ];
        expect(avgChurnRisk(customers)).toBe('50');
    });

    it('no intelligence field = treated as 0 risk', () => {
        const customers = [{}, { intelligence: {} }, { intelligence: { metrics: {} } }];
        expect(avgChurnRisk(customers)).toBe('0');
    });
});

// ─── Integration: Financial Overview audit scenario ───────────────────────────

describe('Financial Overview audit scenario', () => {
    const customers = [
        { _orderRevenue: 12000 }, // Dinner VMC
        { _orderRevenue: 10500 }, // Dinner Shabu
        { _orderRevenue: 7500  }, // Hayashi Box
    ];

    it('totalRevenue = ฿30,000', () => {
        expect(sumRevenue(customers)).toBe(30000);
    });

    it('COGS at 45% = ฿13,500', () => {
        const cogs = sumRevenue(customers) * 0.45;
        expect(cogs).toBe(13500);
    });

    it('COGS % of revenue = 45.0%', () => {
        const total = sumRevenue(customers);
        const cogs = total * 0.45;
        expect(safePct(cogs, total)).toBe('45.0%');
    });

    it('OpEx ฿5,000 of ฿30,000 revenue = 16.7%', () => {
        const total = sumRevenue(customers);
        expect(safePct(5000, total)).toBe('16.7%');
    });

    it('Net Profit = ฿30,000 - ฿13,500 - ฿5,000 = ฿11,500', () => {
        const total = sumRevenue(customers);
        const cogs = total * 0.45;
        const opex = 5000;
        expect(total - cogs - opex).toBe(11500);
    });

    it('Net Profit margin = 38.3%', () => {
        const total = sumRevenue(customers);
        const cogs = total * 0.45;
        const opex = 5000;
        const netProfit = total - cogs - opex;
        expect(safePct(netProfit, total)).toBe('38.3%');
    });
});
