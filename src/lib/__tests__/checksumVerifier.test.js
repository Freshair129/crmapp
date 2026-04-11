import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyChecksum } from '@/services/checksumVerifier';
import { getPrisma } from '@/lib/db';

vi.mock('@/lib/db', () => ({
    getPrisma: vi.fn(),
}));

describe('checksumVerifier', () => {
    let mockPrisma;

    beforeEach(() => {
        vi.clearAllMocks();
        mockPrisma = {
            campaign: {
                findUnique: vi.fn(),
            },
            ad: {
                aggregate: vi.fn(),
            },
        };
        getPrisma.mockResolvedValue(mockPrisma);
    });

    it('should pass when spend matches within tolerance', async () => {
        mockPrisma.campaign.findUnique.mockResolvedValue({ rawData: { spend: 100 } });
        mockPrisma.ad.aggregate.mockResolvedValue({ _sum: { spend: 99.5 } });

        const result = await verifyChecksum('camp-1');

        expect(result.passed).toBe(true);
        expect(result.campaignId).toBe('camp-1');
        expect(result.metaTotal).toBe(100);
        expect(result.calculatedTotal).toBe(99.5);
    });

    it('should fail when spend exceeds tolerance', async () => {
        mockPrisma.campaign.findUnique.mockResolvedValue({ rawData: { spend: 100 } });
        mockPrisma.ad.aggregate.mockResolvedValue({ _sum: { spend: 80 } });

        const result = await verifyChecksum('camp-1');

        expect(result.passed).toBe(false);
        expect(result.delta).toBe(20);
    });

    it('should pass when metaTotal is 0 (avoid divide by zero)', async () => {
        mockPrisma.campaign.findUnique.mockResolvedValue({ rawData: { spend: 0 } });
        mockPrisma.ad.aggregate.mockResolvedValue({ _sum: { spend: 0 } });

        const result = await verifyChecksum('camp-1');
        expect(result.passed).toBe(true);
    });

    it('should handle null campaign rawData', async () => {
        mockPrisma.campaign.findUnique.mockResolvedValue(null);
        mockPrisma.ad.aggregate.mockResolvedValue({ _sum: { spend: null } });

        const result = await verifyChecksum('camp-1');
        expect(result.passed).toBe(true);
        expect(result.metaTotal).toBe(0);
        expect(result.calculatedTotal).toBe(0);
    });

    it('should respect custom tolerance', async () => {
        mockPrisma.campaign.findUnique.mockResolvedValue({ rawData: { spend: 100 } });
        mockPrisma.ad.aggregate.mockResolvedValue({ _sum: { spend: 94 } });

        // 6% delta — fails at default 1% but passes at 10%
        const strict = await verifyChecksum('camp-1', 0.01);
        expect(strict.passed).toBe(false);

        const lenient = await verifyChecksum('camp-1', 0.10);
        expect(lenient.passed).toBe(true);
    });
});
