import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCertLevelForHours, CERT_THRESHOLDS } from '@/lib/repositories/certificateRepo';
import * as certRepo from '@/lib/repositories/certificateRepo';
import { getPrisma } from '@/lib/db';
import { generateCertId } from '@/lib/idGenerators';

vi.mock('@/lib/db', () => ({
    getPrisma: vi.fn(),
}));

vi.mock('@/lib/idGenerators', () => ({
    generateCertId: vi.fn(),
}));

describe('certificateRepo', () => {
    let mockPrisma;

    beforeEach(() => {
        vi.clearAllMocks();
        mockPrisma = {
            certificate: {
                findMany: vi.fn(),
                findUnique: vi.fn(),
                findFirst: vi.fn(),
                create: vi.fn(),
                update: vi.fn(),
            },
        };
        getPrisma.mockResolvedValue(mockPrisma);
    });

    describe('CERT_THRESHOLDS', () => {
        it('should have 3 levels in ascending order', () => {
            expect(CERT_THRESHOLDS).toHaveLength(3);
            expect(CERT_THRESHOLDS[0].hours).toBeLessThan(CERT_THRESHOLDS[1].hours);
            expect(CERT_THRESHOLDS[1].hours).toBeLessThan(CERT_THRESHOLDS[2].hours);
        });
    });

    describe('getCertLevelForHours', () => {
        it('should return null for < 30 hours', () => {
            expect(getCertLevelForHours(0)).toBeNull();
            expect(getCertLevelForHours(29)).toBeNull();
        });

        it('should return BASIC_30H for 30-110 hours', () => {
            expect(getCertLevelForHours(30).level).toBe('BASIC_30H');
            expect(getCertLevelForHours(110).level).toBe('BASIC_30H');
        });

        it('should return PRO_111H for 111-200 hours', () => {
            expect(getCertLevelForHours(111).level).toBe('PRO_111H');
            expect(getCertLevelForHours(200).level).toBe('PRO_111H');
        });

        it('should return MASTER_201H for 201+ hours', () => {
            expect(getCertLevelForHours(201).level).toBe('MASTER_201H');
            expect(getCertLevelForHours(500).level).toBe('MASTER_201H');
        });
    });

    describe('listCertificates', () => {
        it('should query with filters', async () => {
            mockPrisma.certificate.findMany.mockResolvedValue([]);
            await certRepo.listCertificates({ deliveryStatus: 'PENDING', customerId: 'c1' });
            expect(mockPrisma.certificate.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ deliveryStatus: 'PENDING', customerId: 'c1' }),
                })
            );
        });

        it('should query with no filters', async () => {
            mockPrisma.certificate.findMany.mockResolvedValue([]);
            await certRepo.listCertificates();
            expect(mockPrisma.certificate.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: {} })
            );
        });
    });

    describe('getCertificateById', () => {
        it('should find by id with includes', async () => {
            mockPrisma.certificate.findUnique.mockResolvedValue({ id: 'c1' });
            await certRepo.getCertificateById('c1');
            expect(mockPrisma.certificate.findUnique).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 'c1' },
                    include: expect.objectContaining({ customer: true }),
                })
            );
        });
    });

    describe('hasCertificate', () => {
        it('should return true when cert exists', async () => {
            mockPrisma.certificate.findFirst.mockResolvedValue({ id: 'c1' });
            expect(await certRepo.hasCertificate('cust-1', 'BASIC_30H')).toBe(true);
        });

        it('should return false when no cert', async () => {
            mockPrisma.certificate.findFirst.mockResolvedValue(null);
            expect(await certRepo.hasCertificate('cust-1', 'BASIC_30H')).toBe(false);
        });
    });

    describe('autoIssueCertificate', () => {
        it('should return null if hours below threshold', async () => {
            const result = await certRepo.autoIssueCertificate({ customerId: 'c1', enrollmentId: 'e1', totalHours: 20 });
            expect(result).toBeNull();
        });

        it('should return null if cert already issued (idempotent)', async () => {
            mockPrisma.certificate.findFirst.mockResolvedValue({ id: 'existing' });
            const result = await certRepo.autoIssueCertificate({ customerId: 'c1', enrollmentId: 'e1', totalHours: 50 });
            expect(result).toBeNull();
        });

        it('should create cert when threshold reached and not yet issued', async () => {
            mockPrisma.certificate.findFirst.mockResolvedValue(null);
            generateCertId.mockResolvedValue('CERT-001');
            mockPrisma.certificate.create.mockResolvedValue({ certId: 'CERT-001', certLevel: 'BASIC_30H' });

            const result = await certRepo.autoIssueCertificate({ customerId: 'c1', enrollmentId: 'e1', totalHours: 50 });
            expect(result.certId).toBe('CERT-001');
            expect(mockPrisma.certificate.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    certLevel: 'BASIC_30H',
                    hoursAtIssuance: 50,
                    deliveryStatus: 'PENDING',
                }),
            });
        });
    });

    describe('updateDeliveryStatus', () => {
        it('should throw for invalid status', async () => {
            await expect(certRepo.updateDeliveryStatus('c1', { deliveryStatus: 'INVALID' }))
                .rejects.toThrow('Invalid deliveryStatus');
        });

        it('should update with valid status', async () => {
            mockPrisma.certificate.update.mockResolvedValue({ deliveryStatus: 'SHIPPED' });
            await certRepo.updateDeliveryStatus('c1', { deliveryStatus: 'SHIPPED' });
            expect(mockPrisma.certificate.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 'c1' },
                    data: expect.objectContaining({ deliveryStatus: 'SHIPPED' }),
                })
            );
        });

        it('should auto-set shippedAt when status is SHIPPED', async () => {
            mockPrisma.certificate.update.mockResolvedValue({});
            await certRepo.updateDeliveryStatus('c1', { deliveryStatus: 'SHIPPED' });
            expect(mockPrisma.certificate.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ shippedAt: expect.any(Date) }),
                })
            );
        });
    });
});
