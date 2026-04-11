import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveOrCreateCustomer } from '@/lib/identityService';
import { getPrisma } from '@/lib/db';
import { normalizePhone } from '@/utils/phoneUtils';
import { generateCustomerId } from '@/lib/idGenerators';

vi.mock('@/lib/db', () => ({ getPrisma: vi.fn() }));

vi.mock('../utils/phoneUtils.js', () => ({
    normalizePhone: vi.fn((p) => p ? `+66${p.slice(1)}` : null),
}));

vi.mock('@/lib/idGenerators', () => ({
    generateCustomerId: vi.fn(),
}));

describe('identityService', () => {
    let mockTx;
    let mockPrisma;

    beforeEach(() => {
        vi.clearAllMocks();
        mockTx = {
            customer: {
                findFirst: vi.fn(),
                update: vi.fn(),
                create: vi.fn(),
            },
        };
        mockPrisma = {
            $transaction: vi.fn((cb) => cb(mockTx)),
        };
        getPrisma.mockResolvedValue(mockPrisma);
    });

    it('should resolve existing customer by PSID', async () => {
        const existing = { id: 'c1', facebookId: 'psid-1', lineId: null, phonePrimary: null };
        mockTx.customer.findFirst.mockResolvedValue(existing);

        const result = await resolveOrCreateCustomer({ psid: 'psid-1', channel: 'FB' });

        expect(result.isNew).toBe(false);
        expect(result.customer.id).toBe('c1');
    });

    it('should merge missing identity fields onto existing customer', async () => {
        const existing = { id: 'c1', facebookId: 'psid-1', lineId: null, phonePrimary: null };
        mockTx.customer.findFirst.mockResolvedValue(existing);
        mockTx.customer.update.mockResolvedValue({ ...existing, lineId: 'line-1' });

        const result = await resolveOrCreateCustomer({
            psid: 'psid-1',
            lineId: 'line-1',
            channel: 'FB',
        });

        expect(result.merged).toBe(true);
        expect(mockTx.customer.update).toHaveBeenCalledWith({
            where: { id: 'c1' },
            data: { lineId: 'line-1' },
        });
    });

    it('should not update if no new identity fields', async () => {
        const existing = { id: 'c1', facebookId: 'psid-1', lineId: 'line-1', phonePrimary: '+66812345678' };
        mockTx.customer.findFirst.mockResolvedValue(existing);

        const result = await resolveOrCreateCustomer({ psid: 'psid-1', channel: 'FB' });

        expect(result.merged).toBe(false);
        expect(mockTx.customer.update).not.toHaveBeenCalled();
    });

    it('should create new customer when no match found', async () => {
        mockTx.customer.findFirst.mockResolvedValue(null);
        generateCustomerId.mockResolvedValue('TVS-CUS-FB-26-0001');
        mockTx.customer.create.mockResolvedValue({ id: 'new-1', customerId: 'TVS-CUS-FB-26-0001' });

        const result = await resolveOrCreateCustomer({
            psid: 'psid-new',
            channel: 'FB',
            name: 'Test User',
        });

        expect(result.isNew).toBe(true);
        expect(mockTx.customer.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                customerId: 'TVS-CUS-FB-26-0001',
                facebookId: 'psid-new',
                facebookName: 'Test User',
            }),
        });
    });

    it('should handle phone normalization', async () => {
        mockTx.customer.findFirst.mockResolvedValue(null);
        generateCustomerId.mockResolvedValue('TVS-CUS-LINE-26-0001');
        mockTx.customer.create.mockResolvedValue({ id: 'new-2' });

        await resolveOrCreateCustomer({
            phone: '0812345678',
            channel: 'LINE',
        });

        expect(mockTx.customer.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                phonePrimary: '+66812345678',
            }),
        });
    });
});
