import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as auditRepo from '@/lib/repositories/auditRepo';
import { getPrisma } from '@/lib/db';
import { generateAuditId } from '@/lib/idGenerators';

vi.mock('@/lib/db', () => ({
    getPrisma: vi.fn(),
}));

vi.mock('@/lib/idGenerators', () => ({
    generateAuditId: vi.fn(),
}));

describe('auditRepo', () => {
    let mockPrisma;

    beforeEach(() => {
        vi.clearAllMocks();
        mockPrisma = {
            auditLog: {
                create: vi.fn(),
                findMany: vi.fn(),
                findUnique: vi.fn(),
                update: vi.fn(),
            },
        };
        getPrisma.mockResolvedValue(mockPrisma);
    });

    describe('logAction', () => {
        it('should create audit entry with DONE status for non-approval actions', async () => {
            generateAuditId.mockResolvedValue('AUD-20260325-0001');
            const entry = { auditId: 'AUD-20260325-0001', action: 'LOGIN_SUCCESS', status: 'DONE' };
            mockPrisma.auditLog.create.mockResolvedValue(entry);

            const result = await auditRepo.logAction({ action: 'LOGIN_SUCCESS', actorId: 'emp1' });

            expect(result).toEqual(entry);
            expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    auditId: 'AUD-20260325-0001',
                    status: 'DONE',
                    action: 'LOGIN_SUCCESS',
                }),
            });
        });

        it('should set PENDING_APPROVAL for approval-required actions', async () => {
            generateAuditId.mockResolvedValue('AUD-20260325-0002');
            mockPrisma.auditLog.create.mockResolvedValue({});

            await auditRepo.logAction({ action: 'ROLE_CHANGE', actorId: 'emp1' });

            expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
                data: expect.objectContaining({ status: 'PENDING_APPROVAL' }),
            });
        });

        it('should return null on error (non-blocking)', async () => {
            generateAuditId.mockResolvedValue('AUD-X');
            mockPrisma.auditLog.create.mockRejectedValue(new Error('DB'));
            const result = await auditRepo.logAction({ action: 'LOGIN_SUCCESS' });
            expect(result).toBeNull();
        });

        for (const action of ['ROLE_CHANGE', 'EMPLOYEE_DEACTIVATE', 'CANCEL_ORDER', 'MANUAL_STOCK_ADJUST', 'PAYMENT_REFUND']) {
            it(`should mark ${action} as PENDING_APPROVAL`, async () => {
                generateAuditId.mockResolvedValue('AUD-X');
                mockPrisma.auditLog.create.mockResolvedValue({});
                await auditRepo.logAction({ action });
                expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
                    data: expect.objectContaining({ status: 'PENDING_APPROVAL' }),
                });
            });
        }
    });

    describe('getPendingApprovals', () => {
        it('should query PENDING_APPROVAL with default limit', async () => {
            mockPrisma.auditLog.findMany.mockResolvedValue([]);
            await auditRepo.getPendingApprovals();
            expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
                where: { status: 'PENDING_APPROVAL' },
                orderBy: { createdAt: 'asc' },
                take: 50,
            });
        });

        it('should filter by action when provided', async () => {
            mockPrisma.auditLog.findMany.mockResolvedValue([]);
            await auditRepo.getPendingApprovals({ action: 'ROLE_CHANGE', limit: 10 });
            expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
                where: { status: 'PENDING_APPROVAL', action: 'ROLE_CHANGE' },
                orderBy: { createdAt: 'asc' },
                take: 10,
            });
        });
    });

    describe('approveAction', () => {
        it('should approve a pending entry', async () => {
            mockPrisma.auditLog.findUnique.mockResolvedValue({ auditId: 'A1', status: 'PENDING_APPROVAL', note: null });
            mockPrisma.auditLog.update.mockResolvedValue({ status: 'APPROVED' });

            const result = await auditRepo.approveAction('A1', 'approver1', 'Looks good');
            expect(mockPrisma.auditLog.update).toHaveBeenCalledWith({
                where: { auditId: 'A1' },
                data: expect.objectContaining({ status: 'APPROVED', approverId: 'approver1', note: 'Looks good' }),
            });
        });

        it('should throw if audit log not found', async () => {
            mockPrisma.auditLog.findUnique.mockResolvedValue(null);
            await expect(auditRepo.approveAction('NOPE', 'approver1')).rejects.toThrow('not found');
        });

        it('should throw if not pending', async () => {
            mockPrisma.auditLog.findUnique.mockResolvedValue({ auditId: 'A1', status: 'DONE' });
            await expect(auditRepo.approveAction('A1', 'approver1')).rejects.toThrow('not pending');
        });
    });

    describe('rejectAction', () => {
        it('should reject a pending entry', async () => {
            mockPrisma.auditLog.findUnique.mockResolvedValue({ auditId: 'A1', status: 'PENDING_APPROVAL' });
            mockPrisma.auditLog.update.mockResolvedValue({ status: 'REJECTED' });

            await auditRepo.rejectAction('A1', 'approver1', 'Not allowed');
            expect(mockPrisma.auditLog.update).toHaveBeenCalledWith({
                where: { auditId: 'A1' },
                data: expect.objectContaining({ status: 'REJECTED', note: 'Not allowed' }),
            });
        });

        it('should throw if not found', async () => {
            mockPrisma.auditLog.findUnique.mockResolvedValue(null);
            await expect(auditRepo.rejectAction('X', 'a', 'reason')).rejects.toThrow('not found');
        });
    });

    describe('getAuditTrail', () => {
        it('should query by entity and entityId', async () => {
            mockPrisma.auditLog.findMany.mockResolvedValue([]);
            await auditRepo.getAuditTrail('Employee', 'emp-1');
            expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
                where: { entity: 'Employee', entityId: 'emp-1' },
                orderBy: { createdAt: 'desc' },
                take: 100,
            });
        });
    });

    describe('getActorHistory', () => {
        it('should query by actorId', async () => {
            mockPrisma.auditLog.findMany.mockResolvedValue([]);
            await auditRepo.getActorHistory('emp-1', 50);
            expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
                where: { actorId: 'emp-1' },
                orderBy: { createdAt: 'desc' },
                take: 50,
            });
        });
    });

    describe('getAuditLogs', () => {
        it('should apply all filters', async () => {
            mockPrisma.auditLog.findMany.mockResolvedValue([]);
            await auditRepo.getAuditLogs({ action: 'LOGIN_SUCCESS', status: 'DONE', entity: 'Employee', actorId: 'emp-1', limit: 10 });
            expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({
                    action: 'LOGIN_SUCCESS',
                    status: 'DONE',
                    entity: 'Employee',
                    actorId: 'emp-1',
                }),
                take: 10,
            }));
        });

        it('should work with no filters', async () => {
            mockPrisma.auditLog.findMany.mockResolvedValue([]);
            await auditRepo.getAuditLogs();
            expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: {},
                take: 50,
            }));
        });
    });
});
