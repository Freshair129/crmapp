import { describe, it, expect } from 'vitest';
import { SIDEBAR_PROFILES, canSeeItem, getProfile, getAllowedItems } from '@/lib/sidebarProfiles';

describe('sidebarProfiles', () => {
    describe('SIDEBAR_PROFILES', () => {
        it('should have DEV as null (full access)', () => {
            expect(SIDEBAR_PROFILES.DEV).toBeNull();
        });

        it('should have arrays for restricted roles', () => {
            expect(Array.isArray(SIDEBAR_PROFILES.STF)).toBe(true);
            expect(Array.isArray(SIDEBAR_PROFILES.AGT)).toBe(true);
            expect(Array.isArray(SIDEBAR_PROFILES.MGR)).toBe(true);
        });

        it('should have 12 role profiles', () => {
            expect(Object.keys(SIDEBAR_PROFILES)).toHaveLength(12);
        });
    });

    describe('canSeeItem', () => {
        it('should allow DEV to see everything', () => {
            expect(canSeeItem('DEV', 'anything')).toBe(true);
            expect(canSeeItem('DEV', 'facebook-ads')).toBe(true);
        });

        it('should allow STF to see whitelisted items', () => {
            expect(canSeeItem('STF', 'pos-system')).toBe(true);
            expect(canSeeItem('STF', 'tasks')).toBe(true);
        });

        it('should deny STF from non-whitelisted items', () => {
            expect(canSeeItem('STF', 'facebook-ads')).toBe(false);
            expect(canSeeItem('STF', 'procurement')).toBe(false);
        });

        it('should support multi-role array (union)', () => {
            // STF can see pos-system, AGT can see customers
            expect(canSeeItem(['STF', 'AGT'], 'pos-system')).toBe(true);
            expect(canSeeItem(['STF', 'AGT'], 'customers')).toBe(true);
        });

        it('should grant full access if any role is DEV', () => {
            expect(canSeeItem(['STF', 'DEV'], 'anything')).toBe(true);
        });

        it('should be case-insensitive for role', () => {
            expect(canSeeItem('dev', 'anything')).toBe(true);
        });
    });

    describe('getProfile', () => {
        it('should return null for DEV', () => {
            expect(getProfile('DEV')).toBeNull();
        });

        it('should return array for STF', () => {
            expect(Array.isArray(getProfile('STF'))).toBe(true);
        });

        it('should return null for unknown role', () => {
            expect(getProfile('UNKNOWN')).toBeNull();
        });
    });

    describe('getAllowedItems', () => {
        it('should return null when any role has full access', () => {
            expect(getAllowedItems(['STF', 'DEV'])).toBeNull();
        });

        it('should return union of items for multiple roles', () => {
            const items = getAllowedItems(['STF', 'AGT']);
            // STF has pos-system, AGT has customers
            expect(items).toContain('pos-system');
            expect(items).toContain('customers');
        });

        it('should return items for single role string', () => {
            const items = getAllowedItems('STF');
            expect(Array.isArray(items)).toBe(true);
            expect(items).toContain('tasks');
        });

        it('should return null for DEV alone', () => {
            expect(getAllowedItems(['DEV'])).toBeNull();
        });
    });
});
