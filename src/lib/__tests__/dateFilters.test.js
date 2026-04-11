import { describe, it, expect } from 'vitest';
import { getMarketingRangeFilter, TIMEFRAME_LABELS, getDateRange } from '@/lib/dateFilters';

describe('dateFilters', () => {
    describe('getMarketingRangeFilter', () => {
        it('should return gte for today', () => {
            const filter = getMarketingRangeFilter('today');
            expect(filter).toHaveProperty('gte');
            expect(filter.gte).toBeInstanceOf(Date);
        });

        it('should return gte for last_7d', () => {
            const filter = getMarketingRangeFilter('last_7d');
            expect(filter).toHaveProperty('gte');
            const diffMs = Date.now() - filter.gte.getTime();
            expect(diffMs).toBeGreaterThanOrEqual(7 * 86400000 - 1000);
            expect(diffMs).toBeLessThanOrEqual(7 * 86400000 + 1000);
        });

        it('should return gte for last_30d', () => {
            const filter = getMarketingRangeFilter('last_30d');
            expect(filter).toHaveProperty('gte');
        });

        it('should return gte for this_month', () => {
            const filter = getMarketingRangeFilter('this_month');
            expect(filter.gte.getDate()).toBe(1);
        });

        it('should return gte and lte for last_month', () => {
            const filter = getMarketingRangeFilter('last_month');
            expect(filter).toHaveProperty('gte');
            expect(filter).toHaveProperty('lte');
            expect(filter.gte < filter.lte).toBe(true);
        });

        it('should return undefined for unknown range', () => {
            expect(getMarketingRangeFilter('unknown')).toBeUndefined();
        });
    });

    describe('TIMEFRAME_LABELS', () => {
        it('should have labels for all timeframes', () => {
            expect(TIMEFRAME_LABELS.today).toBe('Today');
            expect(TIMEFRAME_LABELS.this_week).toBe('This Week');
            expect(TIMEFRAME_LABELS.all_time).toBe('All Time');
        });
    });

    describe('getDateRange', () => {
        it('should return current and prev for today', () => {
            const range = getDateRange('today');
            expect(range.current).toHaveProperty('gte');
            expect(range.prev).toHaveProperty('gte');
            expect(range.prev).toHaveProperty('lt');
        });

        it('should return current and prev for this_week', () => {
            const range = getDateRange('this_week');
            expect(range.current.gte).toBeInstanceOf(Date);
            expect(range.prev.gte).toBeInstanceOf(Date);
        });

        it('should return current and prev for this_month', () => {
            const range = getDateRange('this_month');
            expect(range.current.gte.getDate()).toBe(1);
        });

        it('should return current and prev for last_month', () => {
            const range = getDateRange('last_month');
            expect(range.current.gte < range.current.lt).toBe(true);
        });

        it('should return current and prev for last_90d', () => {
            const range = getDateRange('last_90d');
            expect(range.current).toHaveProperty('gte');
            expect(range.prev).toHaveProperty('gte');
        });

        it('should return current and prev for ytd', () => {
            const range = getDateRange('ytd');
            expect(range.current.gte.getUTCDate()).toBe(1);
        });

        it('should return null ranges for all_time', () => {
            const range = getDateRange('all_time');
            expect(range.current).toBeNull();
            expect(range.prev).toBeNull();
        });

        it('should return null ranges for unknown timeframe (default)', () => {
            const range = getDateRange('something_else');
            expect(range.current).toBeNull();
            expect(range.prev).toBeNull();
        });
    });
});
