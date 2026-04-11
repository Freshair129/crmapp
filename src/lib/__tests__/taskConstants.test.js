import { describe, it, expect } from 'vitest';
import { VALID_PRIORITIES, VALID_STATUSES, VALID_TYPES } from '@/lib/taskConstants';

describe('taskConstants', () => {
    describe('VALID_PRIORITIES', () => {
        it('should have 6 priority levels L0-L5', () => {
            expect(VALID_PRIORITIES).toEqual(['L0', 'L1', 'L2', 'L3', 'L4', 'L5']);
        });
    });

    describe('VALID_STATUSES', () => {
        it('should have 4 statuses', () => {
            expect(VALID_STATUSES).toEqual(['PENDING', 'IN_PROGRESS', 'DONE', 'CANCELLED']);
        });
    });

    describe('VALID_TYPES', () => {
        it('should have 7 task types', () => {
            expect(VALID_TYPES).toEqual(['FOLLOW_UP', 'MEETING', 'CALL', 'EMAIL', 'PURCHASE', 'REVIEW', 'OTHER']);
        });
    });
});
