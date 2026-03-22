/**
 * Unit tests for adsOptimizeRepo.js (Phase 32 — v1.8.0)
 * Tests: pauseResume, updateDailyBudget, updateBid, duplicateCampaign,
 *        createLifetimeBudgetRequest, approveLifetimeBudgetRequest,
 *        rejectLifetimeBudgetRequest, getPendingRequests, getRequestById
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Must be hoisted — AD_ACCOUNT_ID is captured at module load time
vi.hoisted(() => {
    process.env.FB_AD_ACCOUNT_ID = 'act_123456789';
    process.env.FB_ACCESS_TOKEN = 'test_token';
});

import * as adsOptimizeRepo from '@/lib/repositories/adsOptimizeRepo';
import { getPrisma } from '@/lib/db';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/db', () => ({
    getPrisma: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
    },
}));

vi.mock('@/lib/idGenerators', () => ({
    generateLogId: vi.fn().mockResolvedValue('LOG-20260322-001'),
    generateRequestId: vi.fn().mockResolvedValue('OPT-20260322-001'),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockFetchSuccess(responseData = { success: true }) {
    global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => responseData,
    });
}

function mockFetchError(status = 400, message = 'Meta API error') {
    global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status,
        headers: { get: () => null },
        json: async () => ({ error: { message } }),
    });
}

function mockFetchRateLimit() {
    global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        headers: { get: () => '900' },
        json: async () => ({}),
    });
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('adsOptimizeRepo', () => {
    let mockPrisma;

    beforeEach(() => {
        vi.clearAllMocks();
        mockPrisma = {
            auditLog: {
                create: vi.fn().mockResolvedValue({ logId: 'LOG-20260322-001' }),
            },
            adsOptimizeRequest: {
                create: vi.fn(),
                findUnique: vi.fn(),
                update: vi.fn(),
                findMany: vi.fn(),
            },
        };
        getPrisma.mockResolvedValue(mockPrisma);
    });

    // ─── pauseResume ──────────────────────────────────────────────────────
    describe('pauseResume', () => {
        it('calls Meta PATCH and writes audit log on PAUSED', async () => {
            mockFetchSuccess({ id: '123', success: true });

            const result = await adsOptimizeRepo.pauseResume(
                '123456',
                'campaign',
                'PAUSED',
                'TVS-EMP-MKT-001'
            );

            expect(global.fetch).toHaveBeenCalledOnce();
            const fetchUrl = global.fetch.mock.calls[0][0];
            expect(fetchUrl).toContain('/123456');

            expect(mockPrisma.auditLog.create).toHaveBeenCalledOnce();
            const auditArgs = mockPrisma.auditLog.create.mock.calls[0][0].data;
            expect(auditArgs.action).toBe('ADS_PAUSE');
            expect(auditArgs.actor).toBe('TVS-EMP-MKT-001');
            expect(auditArgs.target).toBe('campaign:123456');
            expect(auditArgs.status).toBe('SUCCESS');
        });

        it('writes ADS_RESUME action when status is ACTIVE', async () => {
            mockFetchSuccess({ success: true });

            await adsOptimizeRepo.pauseResume('789', 'adset', 'ACTIVE', 'TVS-EMP-MKT-001');

            const auditArgs = mockPrisma.auditLog.create.mock.calls[0][0].data;
            expect(auditArgs.action).toBe('ADS_RESUME');
        });

        it('throws and does not write audit log on Meta API error', async () => {
            mockFetchError(400, 'Ad account is disabled');

            await expect(
                adsOptimizeRepo.pauseResume('123', 'campaign', 'PAUSED', 'TVS-EMP-MKT-001')
            ).rejects.toThrow('Ad account is disabled');

            expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
        });

        it('throws RateLimitError on 429', async () => {
            mockFetchRateLimit();

            await expect(
                adsOptimizeRepo.pauseResume('123', 'campaign', 'PAUSED', 'TVS-EMP-MKT-001')
            ).rejects.toMatchObject({ name: 'RateLimitError', retryAfter: 900 });
        });
    });

    // ─── updateDailyBudget ────────────────────────────────────────────────
    describe('updateDailyBudget', () => {
        it('converts THB to cents correctly (×100)', async () => {
            mockFetchSuccess({ success: true });

            await adsOptimizeRepo.updateDailyBudget('adset-1', 500, 'TVS-EMP-MKT-001');

            const fetchBody = JSON.parse(global.fetch.mock.calls[0][1].body);
            expect(fetchBody.daily_budget).toBe(50000); // 500 × 100
        });

        it('rounds fractional baht to nearest cent', async () => {
            mockFetchSuccess({ success: true });

            await adsOptimizeRepo.updateDailyBudget('adset-1', 99.99, 'TVS-EMP-MKT-001');

            const fetchBody = JSON.parse(global.fetch.mock.calls[0][1].body);
            expect(fetchBody.daily_budget).toBe(9999); // Math.round(99.99 × 100) = 9999
        });

        it('writes ADS_BUDGET_UPDATE audit log with correct values', async () => {
            mockFetchSuccess({ success: true });

            await adsOptimizeRepo.updateDailyBudget('adset-1', 300, 'TVS-EMP-MKT-001');

            const auditArgs = mockPrisma.auditLog.create.mock.calls[0][0].data;
            expect(auditArgs.action).toBe('ADS_BUDGET_UPDATE');
            expect(auditArgs.details.newValue).toBe(300);
            expect(auditArgs.details.valueInCents).toBe(30000);
        });

        it('throws on Meta API error', async () => {
            mockFetchError(403, 'Insufficient permissions');

            await expect(
                adsOptimizeRepo.updateDailyBudget('adset-1', 500, 'TVS-EMP-MKT-001')
            ).rejects.toThrow('Insufficient permissions');
        });
    });

    // ─── updateBid ────────────────────────────────────────────────────────
    describe('updateBid', () => {
        it('converts bid amount to cents and calls PATCH', async () => {
            mockFetchSuccess({ success: true });

            await adsOptimizeRepo.updateBid('adset-2', 25, 'TVS-EMP-MKT-001');

            const fetchBody = JSON.parse(global.fetch.mock.calls[0][1].body);
            expect(fetchBody.bid_amount).toBe(2500); // 25 × 100
        });

        it('writes ADS_BID_UPDATE audit log', async () => {
            mockFetchSuccess({ success: true });

            await adsOptimizeRepo.updateBid('adset-2', 25, 'TVS-EMP-MKT-001');

            const auditArgs = mockPrisma.auditLog.create.mock.calls[0][0].data;
            expect(auditArgs.action).toBe('ADS_BID_UPDATE');
            expect(auditArgs.details.field).toBe('bid_amount');
        });
    });

    // ─── duplicateCampaign ────────────────────────────────────────────────
    describe('duplicateCampaign', () => {
        it('calls Meta POST with correct endpoint and name', async () => {
            mockFetchSuccess({ id: 'new-campaign-id' });

            const result = await adsOptimizeRepo.duplicateCampaign(
                'camp-001', 'Copy of Summer Campaign', 'TVS-EMP-MKT-001'
            );

            const fetchUrl = global.fetch.mock.calls[0][0];
            expect(fetchUrl).toContain('/act_act_123456789/campaigns');

            const fetchBody = JSON.parse(global.fetch.mock.calls[0][1].body);
            expect(fetchBody.name).toBe('Copy of Summer Campaign');
            expect(fetchBody.copy_from).toBe('camp-001');
        });

        it('writes ADS_CAMPAIGN_DUPLICATE audit log with new campaign ID', async () => {
            mockFetchSuccess({ id: 'new-camp-999' });

            await adsOptimizeRepo.duplicateCampaign('camp-001', 'New Copy', 'TVS-EMP-MKT-001');

            const auditArgs = mockPrisma.auditLog.create.mock.calls[0][0].data;
            expect(auditArgs.action).toBe('ADS_CAMPAIGN_DUPLICATE');
            expect(auditArgs.details.newCampaignId).toBe('new-camp-999');
        });

        it('throws on Meta API error during duplication', async () => {
            mockFetchError(400, 'Campaign cannot be copied');

            await expect(
                adsOptimizeRepo.duplicateCampaign('camp-001', 'Copy', 'TVS-EMP-MKT-001')
            ).rejects.toThrow('Campaign cannot be copied');

            expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
        });
    });

    // ─── createLifetimeBudgetRequest ─────────────────────────────────────
    describe('createLifetimeBudgetRequest', () => {
        it('creates DB record with PENDING status and correct fields', async () => {
            const mockRequest = {
                requestId: 'OPT-20260322-001',
                status: 'PENDING',
                targetId: 'camp-001',
                currentVal: 10000,
                proposedVal: 20000,
            };
            mockPrisma.adsOptimizeRequest.create.mockResolvedValue(mockRequest);

            const result = await adsOptimizeRepo.createLifetimeBudgetRequest(
                'TVS-EMP-MKT-001', 'camp-001', 'Summer 2026', 10000, 20000
            );

            expect(mockPrisma.adsOptimizeRequest.create).toHaveBeenCalledOnce();
            const createArgs = mockPrisma.adsOptimizeRequest.create.mock.calls[0][0].data;
            expect(createArgs.status).toBe('PENDING');
            expect(createArgs.type).toBe('LIFETIME_BUDGET');
            expect(createArgs.currentVal).toBe(10000);
            expect(createArgs.proposedVal).toBe(20000);
            expect(createArgs.targetId).toBe('camp-001');
            expect(result).toEqual(mockRequest);
        });

        it('does NOT call Meta API — just creates DB record', async () => {
            mockPrisma.adsOptimizeRequest.create.mockResolvedValue({});
            // fetch should not be called
            global.fetch = vi.fn();

            await adsOptimizeRepo.createLifetimeBudgetRequest(
                'TVS-EMP-MKT-001', 'camp-001', 'Test', 5000, 10000
            );

            expect(global.fetch).not.toHaveBeenCalled();
        });
    });

    // ─── approveLifetimeBudgetRequest ─────────────────────────────────────
    describe('approveLifetimeBudgetRequest', () => {
        const pendingRequest = {
            requestId: 'OPT-20260322-001',
            status: 'PENDING',
            targetId: 'camp-001',
            currentVal: 10000,
            proposedVal: 20000,
        };

        it('calls Meta PATCH with proposedVal converted to cents', async () => {
            mockPrisma.adsOptimizeRequest.findUnique.mockResolvedValue(pendingRequest);
            mockPrisma.adsOptimizeRequest.update.mockResolvedValue({});
            mockFetchSuccess({ success: true });

            await adsOptimizeRepo.approveLifetimeBudgetRequest(
                'OPT-20260322-001', 'TVS-EMP-MKT-001'
            );

            const fetchBody = JSON.parse(global.fetch.mock.calls[0][1].body);
            expect(fetchBody.lifetime_budget).toBe(2000000); // 20000 × 100
        });

        it('updates request status to APPROVED', async () => {
            mockPrisma.adsOptimizeRequest.findUnique.mockResolvedValue(pendingRequest);
            mockPrisma.adsOptimizeRequest.update.mockResolvedValue({});
            mockFetchSuccess({ success: true });

            await adsOptimizeRepo.approveLifetimeBudgetRequest(
                'OPT-20260322-001', 'TVS-EMP-MKT-001'
            );

            const updateArgs = mockPrisma.adsOptimizeRequest.update.mock.calls[0][0].data;
            expect(updateArgs.status).toBe('APPROVED');
            expect(updateArgs.reviewedBy).toBe('TVS-EMP-MKT-001');
            expect(updateArgs.reviewedAt).toBeInstanceOf(Date);
        });

        it('writes ADS_LIFETIME_BUDGET_APPROVED audit log', async () => {
            mockPrisma.adsOptimizeRequest.findUnique.mockResolvedValue(pendingRequest);
            mockPrisma.adsOptimizeRequest.update.mockResolvedValue({});
            mockFetchSuccess({ success: true });

            await adsOptimizeRepo.approveLifetimeBudgetRequest(
                'OPT-20260322-001', 'TVS-EMP-MKT-001'
            );

            const auditArgs = mockPrisma.auditLog.create.mock.calls[0][0].data;
            expect(auditArgs.action).toBe('ADS_LIFETIME_BUDGET_APPROVED');
        });

        it('throws if request not found', async () => {
            mockPrisma.adsOptimizeRequest.findUnique.mockResolvedValue(null);

            await expect(
                adsOptimizeRepo.approveLifetimeBudgetRequest('OPT-NOT-EXIST', 'TVS-EMP-MKT-001')
            ).rejects.toThrow('Request OPT-NOT-EXIST not found');
        });

        it('throws if request is not PENDING', async () => {
            mockPrisma.adsOptimizeRequest.findUnique.mockResolvedValue({
                ...pendingRequest,
                status: 'APPROVED',
            });

            await expect(
                adsOptimizeRepo.approveLifetimeBudgetRequest('OPT-20260322-001', 'TVS-EMP-MKT-001')
            ).rejects.toThrow('is not PENDING');
        });

        it('returns { requestId, status: APPROVED } on success', async () => {
            mockPrisma.adsOptimizeRequest.findUnique.mockResolvedValue(pendingRequest);
            mockPrisma.adsOptimizeRequest.update.mockResolvedValue({});
            mockFetchSuccess({ success: true });

            const result = await adsOptimizeRepo.approveLifetimeBudgetRequest(
                'OPT-20260322-001', 'TVS-EMP-MKT-001'
            );

            expect(result).toEqual({ requestId: 'OPT-20260322-001', status: 'APPROVED' });
        });
    });

    // ─── rejectLifetimeBudgetRequest ──────────────────────────────────────
    describe('rejectLifetimeBudgetRequest', () => {
        const pendingRequest = {
            requestId: 'OPT-20260322-001',
            status: 'PENDING',
            targetId: 'camp-001',
            proposedVal: 20000,
            notes: null,
        };

        it('updates status to REJECTED with reviewer and reason', async () => {
            mockPrisma.adsOptimizeRequest.findUnique.mockResolvedValue(pendingRequest);
            mockPrisma.adsOptimizeRequest.update.mockResolvedValue({});

            await adsOptimizeRepo.rejectLifetimeBudgetRequest(
                'OPT-20260322-001', 'TVS-EMP-MKT-001', 'Budget too high'
            );

            const updateArgs = mockPrisma.adsOptimizeRequest.update.mock.calls[0][0].data;
            expect(updateArgs.status).toBe('REJECTED');
            expect(updateArgs.reviewedBy).toBe('TVS-EMP-MKT-001');
            expect(updateArgs.notes).toBe('Budget too high');
        });

        it('does NOT call Meta API on rejection', async () => {
            mockPrisma.adsOptimizeRequest.findUnique.mockResolvedValue(pendingRequest);
            mockPrisma.adsOptimizeRequest.update.mockResolvedValue({});
            global.fetch = vi.fn();

            await adsOptimizeRepo.rejectLifetimeBudgetRequest(
                'OPT-20260322-001', 'TVS-EMP-MKT-001', 'Budget too high'
            );

            expect(global.fetch).not.toHaveBeenCalled();
        });

        it('writes ADS_LIFETIME_BUDGET_REJECTED audit log', async () => {
            mockPrisma.adsOptimizeRequest.findUnique.mockResolvedValue(pendingRequest);
            mockPrisma.adsOptimizeRequest.update.mockResolvedValue({});

            await adsOptimizeRepo.rejectLifetimeBudgetRequest(
                'OPT-20260322-001', 'TVS-EMP-MKT-001', 'Over budget'
            );

            const auditArgs = mockPrisma.auditLog.create.mock.calls[0][0].data;
            expect(auditArgs.action).toBe('ADS_LIFETIME_BUDGET_REJECTED');
            expect(auditArgs.details.rejectionReason).toBe('Over budget');
        });

        it('throws if request not found', async () => {
            mockPrisma.adsOptimizeRequest.findUnique.mockResolvedValue(null);

            await expect(
                adsOptimizeRepo.rejectLifetimeBudgetRequest('OPT-GHOST', 'TVS-EMP-MKT-001')
            ).rejects.toThrow('Request OPT-GHOST not found');
        });

        it('throws if request is already APPROVED', async () => {
            mockPrisma.adsOptimizeRequest.findUnique.mockResolvedValue({
                ...pendingRequest,
                status: 'APPROVED',
            });

            await expect(
                adsOptimizeRepo.rejectLifetimeBudgetRequest('OPT-20260322-001', 'TVS-EMP-MKT-001')
            ).rejects.toThrow('is not PENDING');
        });

        it('returns { requestId, status: REJECTED } on success', async () => {
            mockPrisma.adsOptimizeRequest.findUnique.mockResolvedValue(pendingRequest);
            mockPrisma.adsOptimizeRequest.update.mockResolvedValue({});

            const result = await adsOptimizeRepo.rejectLifetimeBudgetRequest(
                'OPT-20260322-001', 'TVS-EMP-MKT-001', 'reason'
            );

            expect(result).toEqual({ requestId: 'OPT-20260322-001', status: 'REJECTED' });
        });
    });

    // ─── getPendingRequests ───────────────────────────────────────────────
    describe('getPendingRequests', () => {
        it('queries for PENDING requests ordered by createdAt desc', async () => {
            const mockRequests = [
                { requestId: 'OPT-20260322-002', status: 'PENDING' },
                { requestId: 'OPT-20260322-001', status: 'PENDING' },
            ];
            mockPrisma.adsOptimizeRequest.findMany.mockResolvedValue(mockRequests);

            const result = await adsOptimizeRepo.getPendingRequests();

            expect(mockPrisma.adsOptimizeRequest.findMany).toHaveBeenCalledWith({
                where: { status: 'PENDING' },
                orderBy: { createdAt: 'desc' },
            });
            expect(result).toEqual(mockRequests);
        });

        it('returns empty array when no pending requests', async () => {
            mockPrisma.adsOptimizeRequest.findMany.mockResolvedValue([]);

            const result = await adsOptimizeRepo.getPendingRequests();

            expect(result).toEqual([]);
        });
    });

    // ─── getRequestById ───────────────────────────────────────────────────
    describe('getRequestById', () => {
        it('returns request when found', async () => {
            const mockRequest = { requestId: 'OPT-20260322-001', status: 'PENDING' };
            mockPrisma.adsOptimizeRequest.findUnique.mockResolvedValue(mockRequest);

            const result = await adsOptimizeRepo.getRequestById('OPT-20260322-001');

            expect(mockPrisma.adsOptimizeRequest.findUnique).toHaveBeenCalledWith({
                where: { requestId: 'OPT-20260322-001' },
            });
            expect(result).toEqual(mockRequest);
        });

        it('throws when request not found', async () => {
            mockPrisma.adsOptimizeRequest.findUnique.mockResolvedValue(null);

            await expect(
                adsOptimizeRepo.getRequestById('OPT-GHOST')
            ).rejects.toThrow('Request OPT-GHOST not found');
        });
    });
});
