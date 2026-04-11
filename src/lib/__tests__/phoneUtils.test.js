import { describe, it, expect } from 'vitest';
import { normalizePhone } from '@/utils/phoneUtils';

describe('phoneUtils — normalizePhone', () => {
    describe('Thai mobile numbers', () => {
        it('should normalize 0x format (10 digits)', () => {
            expect(normalizePhone('0812345678')).toBe('+66812345678');
        });

        it('should normalize with dashes', () => {
            expect(normalizePhone('081-234-5678')).toBe('+66812345678');
        });

        it('should normalize with spaces', () => {
            expect(normalizePhone('081 234 5678')).toBe('+66812345678');
        });

        it('should normalize landline (9 digits)', () => {
            expect(normalizePhone('021234567')).toBe('+6621234567');
        });

        it('should handle 06x prefix (new mobile range)', () => {
            expect(normalizePhone('0612345678')).toBe('+66612345678');
        });
    });

    describe('Already E.164 format', () => {
        it('should pass through +66 numbers', () => {
            expect(normalizePhone('+66812345678')).toBe('+66812345678');
        });

        it('should normalize 66 without +', () => {
            expect(normalizePhone('66812345678')).toBe('+66812345678');
        });
    });

    describe('International prefix 00', () => {
        it('should convert 00xx to +xx', () => {
            expect(normalizePhone('0066812345678')).toBe('+66812345678');
        });

        it('should handle US number with 001 prefix', () => {
            expect(normalizePhone('0014155552671')).toBe('+14155552671');
        });
    });

    describe('Invalid inputs', () => {
        it('should return null for non-string input', () => {
            expect(normalizePhone(null)).toBeNull();
            expect(normalizePhone(undefined)).toBeNull();
            expect(normalizePhone(12345)).toBeNull();
        });

        it('should return null for unparseable strings', () => {
            expect(normalizePhone('invalid-phone')).toBeNull();
            expect(normalizePhone('abc')).toBeNull();
            expect(normalizePhone('')).toBeNull();
        });

        it('should return null for too-short numbers', () => {
            expect(normalizePhone('012')).toBeNull();
        });
    });

    describe('Parentheses and mixed formatting', () => {
        it('should strip parentheses', () => {
            expect(normalizePhone('(081) 234-5678')).toBe('+66812345678');
        });
    });
});
