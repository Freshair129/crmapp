import { describe, it, expect } from 'vitest';
import {
    ROLE_HIERARCHY,
    VALID_ROLES,
    hasPermission,
    getRoleLevel,
    isValidRole,
    getMaxRoleLevel,
    hasMultiRolePermission,
} from '@/lib/rbac';

describe('rbac', () => {
    describe('ROLE_HIERARCHY', () => {
        it('should have DEV as the highest role', () => {
            const maxRole = Object.entries(ROLE_HIERARCHY).sort((a, b) => b[1] - a[1])[0];
            expect(maxRole[0]).toBe('DEV');
        });

        it('should have STF as the lowest role', () => {
            const minRole = Object.entries(ROLE_HIERARCHY).sort((a, b) => a[1] - b[1])[0];
            expect(minRole[0]).toBe('STF');
        });

        it('should have 12 roles', () => {
            expect(Object.keys(ROLE_HIERARCHY)).toHaveLength(12);
        });
    });

    describe('VALID_ROLES', () => {
        it('should contain all 12 role codes', () => {
            expect(VALID_ROLES).toHaveLength(12);
            expect(VALID_ROLES).toContain('DEV');
            expect(VALID_ROLES).toContain('STF');
            expect(VALID_ROLES).toContain('MGR');
        });
    });

    describe('getRoleLevel', () => {
        it('should return correct level for known roles', () => {
            expect(getRoleLevel('DEV')).toBe(5);
            expect(getRoleLevel('MGR')).toBe(4);
            expect(getRoleLevel('STF')).toBe(0.5);
        });

        it('should return 0 for unknown roles', () => {
            expect(getRoleLevel('UNKNOWN')).toBe(0);
            expect(getRoleLevel(null)).toBe(0);
            expect(getRoleLevel(undefined)).toBe(0);
        });
    });

    describe('isValidRole', () => {
        it('should return true for valid roles', () => {
            expect(isValidRole('DEV')).toBe(true);
            expect(isValidRole('AGT')).toBe(true);
        });

        it('should return false for invalid roles', () => {
            expect(isValidRole('ADMIN')).toBe(false);
            expect(isValidRole('')).toBe(false);
            expect(isValidRole(null)).toBe(false);
        });
    });

    describe('hasPermission', () => {
        it('should allow higher role to access lower role resources', () => {
            expect(hasPermission('DEV', 'STF')).toBe(true);
            expect(hasPermission('MGR', 'AGT')).toBe(true);
        });

        it('should allow same role', () => {
            expect(hasPermission('MGR', 'MGR')).toBe(true);
        });

        it('should deny lower role accessing higher role resources', () => {
            expect(hasPermission('STF', 'DEV')).toBe(false);
            expect(hasPermission('AGT', 'MGR')).toBe(false);
        });

        it('should deny unknown roles', () => {
            expect(hasPermission('GUEST', 'AGT')).toBe(false);
        });
    });

    describe('getMaxRoleLevel', () => {
        it('should return highest level from array', () => {
            expect(getMaxRoleLevel(['STF', 'MGR', 'AGT'])).toBe(4);
        });

        it('should return 0 for empty array', () => {
            expect(getMaxRoleLevel([])).toBe(0);
        });

        it('should return 0 for non-array', () => {
            expect(getMaxRoleLevel(null)).toBe(0);
            expect(getMaxRoleLevel(undefined)).toBe(0);
        });
    });

    describe('hasMultiRolePermission', () => {
        it('should allow if any role meets requirement', () => {
            expect(hasMultiRolePermission(['STF', 'MGR'], 'MGR')).toBe(true);
        });

        it('should deny if no role meets requirement', () => {
            expect(hasMultiRolePermission(['STF', 'AGT'], 'MGR')).toBe(false);
        });
    });
});
