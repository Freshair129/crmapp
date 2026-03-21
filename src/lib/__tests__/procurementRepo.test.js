import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/db', () => ({ getPrisma: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
vi.mock('@/lib/idGenerators', () => ({
    generatePurchaseOrderId: vi.fn().mockResolvedValue('PO-20260315-001'),
    generateApprovalId: vi.fn().mockResolvedValue('APV-20260315-001'),
    generateAcceptanceId: vi.fn().mockResolvedValue('ACC-20260315-001'),
    generateTrackingId: vi.fn().mockResolvedValue('TRK-20260315-001'),
    generateGrnId: vi.fn().mockResolvedValue('GRN-20260315-001'),
    generateReturnId: vi.fn().mockResolvedValue('RTN-20260315-001'),
    generateCreditNoteId: vi.fn().mockResolvedValue('CN-20260315-001'),
    generateIssueId: vi.fn().mockResolvedValue('ISS-20260315-001'),
    generateAdvanceId: vi.fn().mockResolvedValue('ADV-20260315-001'),
    generateSupplierId: vi.fn().mockResolvedValue('SUP-001'),
}));

import { getPrisma } from '@/lib/db';
import {
    createSupplier,
    getAllSuppliers,
    updateSupplier,
    createPurchaseOrder,
    getAllPurchaseOrders,
    getPurchaseOrderById,
    calculateClassBOM,
    createPOFromBOM,
    submitForReview,
    approvePO,
    resubmitPO,
    acceptPO,
    createGRN,
    createIssue,
    createReturn,
    createCreditNote,
    createAdvance,
    approveAdvance,
    reimburseAdvance,
} from '@/lib/repositories/procurementRepo';

let mockPrisma;

beforeEach(() => {
    mockPrisma = {
        supplier: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
        purchaseOrderV2: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
        pOItem: { createMany: vi.fn() },
        pOApproval: { create: vi.fn() },
        pOAcceptance: { create: vi.fn() },
        pOTracking: { create: vi.fn(), findMany: vi.fn(), update: vi.fn() },
        goodsReceivedNote: { create: vi.fn(), findUnique: vi.fn() },
        gRNItem: { createMany: vi.fn() },
        pOReturn: { create: vi.fn(), update: vi.fn() },
        creditNote: { create: vi.fn(), update: vi.fn() },
        pOIssue: { create: vi.fn(), findMany: vi.fn(), update: vi.fn() },
        advance: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
        ingredient: { update: vi.fn() },
        courseSchedule: { findMany: vi.fn() },
        recipe: { findMany: vi.fn() },
        $transaction: vi.fn(async (cb) => await cb(mockPrisma)),
    };
    getPrisma.mockResolvedValue(mockPrisma);
});

afterEach(() => {
    vi.restoreAllMocks();
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUPPLIER
// ═══════════════════════════════════════════════════════════════════════════════

describe('createSupplier', () => {
    it('creates supplier with generated SUP-NNN id', async () => {
        const expected = { id: 'uuid-1', supplierId: 'SUP-001', name: 'Thai Foods Co.' };
        mockPrisma.supplier.create.mockResolvedValue(expected);

        const result = await createSupplier({ name: 'Thai Foods Co.', phone: '0812345678' });

        expect(result).toEqual(expected);
        expect(mockPrisma.supplier.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                supplierId: 'SUP-001',
                name: 'Thai Foods Co.',
                phone: '0812345678',
                contactName: null,
                email: null,
                address: null,
                taxId: null,
                bankAccount: null,
                notes: null,
            }),
        });
    });
});

describe('getAllSuppliers', () => {
    it('returns list with search filter', async () => {
        const suppliers = [{ id: '1', name: 'Thai Foods' }];
        mockPrisma.supplier.findMany.mockResolvedValue(suppliers);

        const result = await getAllSuppliers({ search: 'Thai' });

        expect(result).toEqual(suppliers);
        expect(mockPrisma.supplier.findMany).toHaveBeenCalledWith({
            where: {
                OR: [
                    { name: { contains: 'Thai', mode: 'insensitive' } },
                    { contactName: { contains: 'Thai', mode: 'insensitive' } },
                    { supplierId: { contains: 'Thai', mode: 'insensitive' } },
                ],
            },
            orderBy: { name: 'asc' },
        });
    });
});

describe('updateSupplier', () => {
    it('updates supplier fields', async () => {
        const updated = { id: 'uuid-1', name: 'New Name' };
        mockPrisma.supplier.update.mockResolvedValue(updated);

        const result = await updateSupplier('uuid-1', { name: 'New Name' });

        expect(result).toEqual(updated);
        expect(mockPrisma.supplier.update).toHaveBeenCalledWith({
            where: { id: 'uuid-1' },
            data: { name: 'New Name' },
        });
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PURCHASE ORDER CRUD
// ═══════════════════════════════════════════════════════════════════════════════

describe('createPurchaseOrder', () => {
    it('creates PO + POItems in $transaction and computes totalAmount', async () => {
        const items = [
            { ingredientId: 'ing-1', description: 'Rice', quantity: 10, unitPrice: 50 },
            { ingredientId: 'ing-2', description: 'Soy Sauce', quantity: 5, unitPrice: 100 },
        ];
        const createdPO = { id: 'po-uuid', poId: 'PO-20260315-001' };
        const fullPO = { ...createdPO, items, totalAmount: 1000 };

        mockPrisma.purchaseOrderV2.create.mockResolvedValue(createdPO);
        mockPrisma.pOItem.createMany.mockResolvedValue({ count: 2 });
        mockPrisma.purchaseOrderV2.findUnique.mockResolvedValue(fullPO);

        const result = await createPurchaseOrder({
            classId: 'CLS-202603-001',
            items,
            createdById: 'emp-1',
        });

        expect(result).toEqual(fullPO);
        // totalAmount = (10*50) + (5*100) = 1000
        expect(mockPrisma.purchaseOrderV2.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                poId: 'PO-20260315-001',
                status: 'DRAFT',
                totalAmount: 1000,
            }),
        });
        expect(mockPrisma.pOItem.createMany).toHaveBeenCalledWith({
            data: expect.arrayContaining([
                expect.objectContaining({ description: 'Rice', quantity: 10, totalPrice: 500 }),
                expect.objectContaining({ description: 'Soy Sauce', quantity: 5, totalPrice: 500 }),
            ]),
        });
    });
});

describe('getAllPurchaseOrders', () => {
    it('returns with includes and respects status filter', async () => {
        const poList = [{ id: 'po-1', poId: 'PO-001', status: 'DRAFT' }];
        mockPrisma.purchaseOrderV2.findMany.mockResolvedValue(poList);

        const result = await getAllPurchaseOrders({ status: 'DRAFT' });

        expect(result).toEqual(poList);
        expect(mockPrisma.purchaseOrderV2.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { status: 'DRAFT' },
                include: expect.objectContaining({
                    _count: { select: { items: true } },
                    supplier: expect.any(Object),
                }),
            }),
        );
    });
});

describe('getPurchaseOrderById', () => {
    it('returns full deep include', async () => {
        const fullPO = { id: 'po-1', poId: 'PO-001', items: [], approvals: [] };
        mockPrisma.purchaseOrderV2.findUnique.mockResolvedValue(fullPO);

        const result = await getPurchaseOrderById('po-1');

        expect(result).toEqual(fullPO);
        expect(mockPrisma.purchaseOrderV2.findUnique).toHaveBeenCalledWith({
            where: { id: 'po-1' },
            include: expect.objectContaining({
                items: true,
                supplier: true,
                approvals: expect.any(Object),
                acceptance: expect.any(Object),
                trackings: expect.any(Object),
                grns: expect.any(Object),
                returns: expect.any(Object),
                creditNotes: expect.any(Object),
                issues: expect.any(Object),
                advances: expect.any(Object),
            }),
        });
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BOM CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

describe('calculateClassBOM', () => {
    it('calculates ingredients needed from schedules, computes shortfall', async () => {
        mockPrisma.courseSchedule.findMany.mockResolvedValue([
            {
                confirmedStudents: 4,
                maxStudents: 6,
                product: {
                    courseMenus: [
                        {
                            recipe: {
                                ingredients: [
                                    {
                                        ingredientId: 'ing-1',
                                        qtyPerPerson: 0.5,
                                        conversionFactor: 1,
                                        unit: 'kg',
                                        ingredient: { name: 'Rice', unit: 'kg', currentStock: 1 },
                                    },
                                ],
                            },
                        },
                    ],
                },
            },
        ]);

        const result = await calculateClassBOM('CLS-202603-001');

        expect(result.classId).toBe('CLS-202603-001');
        expect(result.totalStudents).toBe(4);
        expect(result.ingredients).toHaveLength(1);
        // totalNeeded = 0.5 * 4 * 1 = 2.0, currentStock = 1, shortfall = 1.0
        expect(result.ingredients[0].totalNeeded).toBe(2);
        expect(result.ingredients[0].currentStock).toBe(1);
        expect(result.ingredients[0].shortfall).toBe(1);
    });

    it('returns empty ingredients when no schedules found', async () => {
        mockPrisma.courseSchedule.findMany.mockResolvedValue([]);

        const result = await calculateClassBOM('CLS-NONE');

        expect(result).toEqual({ classId: 'CLS-NONE', totalStudents: 0, ingredients: [] });
    });
});

describe('createPOFromBOM', () => {
    it('creates PO from shortfall items only', async () => {
        // Mock calculateClassBOM indirectly via courseSchedule.findMany
        mockPrisma.courseSchedule.findMany.mockResolvedValue([
            {
                confirmedStudents: 5,
                product: {
                    courseMenus: [
                        {
                            recipe: {
                                ingredients: [
                                    {
                                        ingredientId: 'ing-1',
                                        qtyPerPerson: 2,
                                        conversionFactor: 1,
                                        unit: 'kg',
                                        ingredient: { name: 'Rice', unit: 'kg', currentStock: 3 },
                                    },
                                    {
                                        ingredientId: 'ing-2',
                                        qtyPerPerson: 1,
                                        conversionFactor: 1,
                                        unit: 'bottle',
                                        ingredient: { name: 'Soy', unit: 'bottle', currentStock: 100 },
                                    },
                                ],
                            },
                        },
                    ],
                },
            },
        ]);

        const createdPO = { id: 'po-uuid', poId: 'PO-20260315-001' };
        mockPrisma.purchaseOrderV2.create.mockResolvedValue(createdPO);
        mockPrisma.pOItem.createMany.mockResolvedValue({ count: 1 });
        mockPrisma.purchaseOrderV2.findUnique.mockResolvedValue(createdPO);

        const result = await createPOFromBOM('CLS-202603-001', 'emp-1');

        // Rice: needed=10, stock=3, shortfall=7 -> included
        // Soy: needed=5, stock=100, shortfall=0 -> excluded
        expect(mockPrisma.pOItem.createMany).toHaveBeenCalledWith({
            data: expect.arrayContaining([
                expect.objectContaining({ ingredientId: 'ing-1', description: 'Rice', quantity: 7 }),
            ]),
        });
        // Soy should NOT be in items
        const createManyCall = mockPrisma.pOItem.createMany.mock.calls[0][0];
        expect(createManyCall.data).toHaveLength(1);
    });

    it('returns alreadySufficient when no shortfall', async () => {
        mockPrisma.courseSchedule.findMany.mockResolvedValue([
            {
                confirmedStudents: 1,
                product: {
                    courseMenus: [
                        {
                            recipe: {
                                ingredients: [
                                    {
                                        ingredientId: 'ing-1',
                                        qtyPerPerson: 1,
                                        conversionFactor: 1,
                                        unit: 'kg',
                                        ingredient: { name: 'Rice', unit: 'kg', currentStock: 999 },
                                    },
                                ],
                            },
                        },
                    ],
                },
            },
        ]);

        const result = await createPOFromBOM('CLS-202603-001', 'emp-1');

        expect(result.alreadySufficient).toBe(true);
        expect(mockPrisma.purchaseOrderV2.create).not.toHaveBeenCalled();
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// APPROVAL FLOW
// ═══════════════════════════════════════════════════════════════════════════════

describe('submitForReview', () => {
    it('transitions DRAFT to REQUEST_REVIEW', async () => {
        mockPrisma.purchaseOrderV2.findUnique.mockResolvedValue({ id: 'po-1', poId: 'PO-001', status: 'DRAFT' });
        mockPrisma.purchaseOrderV2.update.mockResolvedValue({ id: 'po-1', status: 'REQUEST_REVIEW' });

        const result = await submitForReview('po-1');

        expect(result.status).toBe('REQUEST_REVIEW');
        expect(mockPrisma.purchaseOrderV2.update).toHaveBeenCalledWith({
            where: { id: 'po-1' },
            data: { status: 'REQUEST_REVIEW' },
        });
    });

    it('throws if PO is not DRAFT', async () => {
        mockPrisma.purchaseOrderV2.findUnique.mockResolvedValue({ id: 'po-1', poId: 'PO-001', status: 'APPROVED' });

        await expect(submitForReview('po-1')).rejects.toThrow('not in DRAFT status');
    });
});

describe('approvePO', () => {
    it('creates APV record and sets PO to APPROVED', async () => {
        mockPrisma.purchaseOrderV2.findUnique.mockResolvedValue({ id: 'po-1', poId: 'PO-001', status: 'REQUEST_REVIEW' });
        const approval = { approvalId: 'APV-20260315-001', action: 'APPROVED', approver: { nickName: 'Boss' } };
        mockPrisma.pOApproval.create.mockResolvedValue(approval);
        mockPrisma.purchaseOrderV2.update.mockResolvedValue({ id: 'po-1', status: 'APPROVED' });

        const result = await approvePO('po-1', 'approver-1', 'APPROVED');

        expect(result).toEqual(approval);
        expect(mockPrisma.pOApproval.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ approvalId: 'APV-20260315-001', action: 'APPROVED', poId: 'po-1' }),
            }),
        );
        expect(mockPrisma.purchaseOrderV2.update).toHaveBeenCalledWith({
            where: { id: 'po-1' },
            data: { status: 'APPROVED' },
        });
    });

    it('creates APV record with reason and sets PO to REJECTED', async () => {
        mockPrisma.purchaseOrderV2.findUnique.mockResolvedValue({ id: 'po-1', poId: 'PO-001', status: 'REQUEST_REVIEW' });
        const approval = { approvalId: 'APV-20260315-001', action: 'REJECTED', reason: 'Too expensive' };
        mockPrisma.pOApproval.create.mockResolvedValue(approval);
        mockPrisma.purchaseOrderV2.update.mockResolvedValue({ id: 'po-1', status: 'REJECTED' });

        const result = await approvePO('po-1', 'approver-1', 'REJECTED', 'Too expensive');

        expect(result).toEqual(approval);
        expect(mockPrisma.purchaseOrderV2.update).toHaveBeenCalledWith({
            where: { id: 'po-1' },
            data: { status: 'REJECTED' },
        });
    });

    it('throws error if PO not in REQUEST_REVIEW status', async () => {
        mockPrisma.purchaseOrderV2.findUnique.mockResolvedValue({ id: 'po-1', poId: 'PO-001', status: 'DRAFT' });

        await expect(approvePO('po-1', 'approver-1', 'APPROVED')).rejects.toThrow('not in REQUEST_REVIEW status');
    });
});

describe('resubmitPO', () => {
    it('transitions REJECTED to DRAFT', async () => {
        mockPrisma.purchaseOrderV2.findUnique.mockResolvedValue({ id: 'po-1', poId: 'PO-001', status: 'REJECTED' });
        mockPrisma.purchaseOrderV2.update.mockResolvedValue({ id: 'po-1', status: 'DRAFT' });

        const result = await resubmitPO('po-1');

        expect(result.status).toBe('DRAFT');
    });

    it('throws if PO is not REJECTED', async () => {
        mockPrisma.purchaseOrderV2.findUnique.mockResolvedValue({ id: 'po-1', poId: 'PO-001', status: 'DRAFT' });

        await expect(resubmitPO('po-1')).rejects.toThrow('not in REJECTED status');
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ACCEPTANCE
// ═══════════════════════════════════════════════════════════════════════════════

describe('acceptPO', () => {
    it('creates ACC record and sets PO to ORDERING', async () => {
        mockPrisma.purchaseOrderV2.findUnique.mockResolvedValue({ id: 'po-1', poId: 'PO-001', status: 'APPROVED' });
        const acceptance = { acceptanceId: 'ACC-20260315-001', purchaser: { nickName: 'Aoi' } };
        mockPrisma.pOAcceptance.create.mockResolvedValue(acceptance);
        mockPrisma.purchaseOrderV2.update.mockResolvedValue({ id: 'po-1', status: 'ORDERING' });

        const result = await acceptPO('po-1', {
            purchaserId: 'emp-2',
            orderDate: '2026-03-15',
            expectedDeliveryDate: '2026-03-20',
        });

        expect(result).toEqual(acceptance);
        expect(mockPrisma.purchaseOrderV2.update).toHaveBeenCalledWith({
            where: { id: 'po-1' },
            data: { status: 'ORDERING' },
        });
    });

    it('throws if PO is not APPROVED', async () => {
        mockPrisma.purchaseOrderV2.findUnique.mockResolvedValue({ id: 'po-1', poId: 'PO-001', status: 'DRAFT' });

        await expect(
            acceptPO('po-1', { purchaserId: 'emp-2', orderDate: '2026-03-15', expectedDeliveryDate: '2026-03-20' }),
        ).rejects.toThrow('not in APPROVED status');
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GRN
// ═══════════════════════════════════════════════════════════════════════════════

describe('createGRN', () => {
    it('creates GRN + items, increments ingredient stock, PO to RECEIVED', async () => {
        const grnItems = [
            { ingredientId: 'ing-1', description: 'Rice', orderedQty: 10, receivedQty: 10, unit: 'kg' },
        ];
        const grnCreated = { id: 'grn-uuid', grnId: 'GRN-20260315-001' };
        const fullGrn = { ...grnCreated, items: grnItems };

        mockPrisma.goodsReceivedNote.create.mockResolvedValue(grnCreated);
        mockPrisma.gRNItem.createMany.mockResolvedValue({ count: 1 });
        mockPrisma.ingredient.update.mockResolvedValue({});
        mockPrisma.purchaseOrderV2.update.mockResolvedValue({ status: 'RECEIVED' });
        mockPrisma.goodsReceivedNote.findUnique.mockResolvedValue(fullGrn);

        const result = await createGRN('po-1', { receivedById: 'emp-1', items: grnItems });

        expect(result).toEqual(fullGrn);
        expect(mockPrisma.ingredient.update).toHaveBeenCalledWith({
            where: { id: 'ing-1' },
            data: { currentStock: { increment: 10 } },
        });
        expect(mockPrisma.purchaseOrderV2.update).toHaveBeenCalledWith({
            where: { id: 'po-1' },
            data: { status: 'RECEIVED' },
        });
    });

    it('sets PO to PARTIAL when isPartial=true', async () => {
        const grnCreated = { id: 'grn-uuid', grnId: 'GRN-20260315-001' };
        mockPrisma.goodsReceivedNote.create.mockResolvedValue(grnCreated);
        mockPrisma.purchaseOrderV2.update.mockResolvedValue({ status: 'PARTIAL' });
        mockPrisma.goodsReceivedNote.findUnique.mockResolvedValue(grnCreated);

        await createGRN('po-1', { receivedById: 'emp-1', isPartial: true, items: [] });

        expect(mockPrisma.purchaseOrderV2.update).toHaveBeenCalledWith({
            where: { id: 'po-1' },
            data: { status: 'PARTIAL' },
        });
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ISSUES + RETURNS + CREDIT NOTES
// ═══════════════════════════════════════════════════════════════════════════════

describe('createIssue', () => {
    it('creates ISS record and sets PO to ISSUE', async () => {
        const issue = { issueId: 'ISS-20260315-001', issueType: 'QUALITY', reportedBy: { nickName: 'Aoi' } };
        mockPrisma.pOIssue.create.mockResolvedValue(issue);
        mockPrisma.purchaseOrderV2.update.mockResolvedValue({ status: 'ISSUE' });

        const result = await createIssue('po-1', {
            issueType: 'QUALITY',
            description: 'Bad rice',
            severity: 'HIGH',
            reportedById: 'emp-2',
        });

        expect(result).toEqual(issue);
        expect(mockPrisma.pOIssue.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    issueId: 'ISS-20260315-001',
                    issueType: 'QUALITY',
                    severity: 'HIGH',
                    status: 'OPEN',
                }),
            }),
        );
        expect(mockPrisma.purchaseOrderV2.update).toHaveBeenCalledWith({
            where: { id: 'po-1' },
            data: { status: 'ISSUE' },
        });
    });
});

describe('createReturn', () => {
    it('creates RTN record with PENDING status', async () => {
        const ret = { returnId: 'RTN-20260315-001', status: 'PENDING' };
        mockPrisma.pOReturn.create.mockResolvedValue(ret);

        const result = await createReturn('po-1', {
            reason: 'Wrong item',
            items: [{ name: 'Rice', qty: 5 }],
            returnedById: 'emp-1',
        });

        expect(result).toEqual(ret);
        expect(mockPrisma.pOReturn.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    returnId: 'RTN-20260315-001',
                    poId: 'po-1',
                    reason: 'Wrong item',
                    status: 'PENDING',
                }),
            }),
        );
    });
});

describe('createCreditNote', () => {
    it('creates CN record with PENDING status', async () => {
        const cn = { creditNoteId: 'CN-20260315-001', amount: 500, status: 'PENDING' };
        mockPrisma.creditNote.create.mockResolvedValue(cn);

        const result = await createCreditNote('po-1', {
            amount: 500,
            reason: 'Returned goods',
            returnId: 'rtn-uuid',
        });

        expect(result).toEqual(cn);
        expect(mockPrisma.creditNote.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    creditNoteId: 'CN-20260315-001',
                    poId: 'po-1',
                    amount: 500,
                    status: 'PENDING',
                    returnId: 'rtn-uuid',
                }),
            }),
        );
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADVANCES
// ═══════════════════════════════════════════════════════════════════════════════

describe('createAdvance', () => {
    it('creates ADV record with PENDING status', async () => {
        const adv = { advanceId: 'ADV-20260315-001', amount: 3000, status: 'PENDING' };
        mockPrisma.advance.create.mockResolvedValue(adv);

        const result = await createAdvance({
            poId: 'po-1',
            paidById: 'emp-1',
            amount: 3000,
            description: 'Ingredient purchase',
        });

        expect(result).toEqual(adv);
        expect(mockPrisma.advance.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    advanceId: 'ADV-20260315-001',
                    amount: 3000,
                    status: 'PENDING',
                }),
            }),
        );
    });
});

describe('approveAdvance', () => {
    it('transitions PENDING to APPROVED', async () => {
        const approved = { advanceId: 'ADV-001', status: 'APPROVED', approvedBy: { nickName: 'Boss' } };
        mockPrisma.advance.update.mockResolvedValue(approved);

        const result = await approveAdvance('ADV-001', 'approver-1');

        expect(result.status).toBe('APPROVED');
        expect(mockPrisma.advance.update).toHaveBeenCalledWith({
            where: { advanceId: 'ADV-001' },
            data: { status: 'APPROVED', approvedById: 'approver-1' },
            include: expect.any(Object),
        });
    });
});

describe('reimburseAdvance', () => {
    it('transitions APPROVED to REIMBURSED and sets reimbursedAt', async () => {
        const reimbursed = { advanceId: 'ADV-001', status: 'REIMBURSED', reimbursedAt: new Date() };
        mockPrisma.advance.update.mockResolvedValue(reimbursed);

        const result = await reimburseAdvance('ADV-001', 'reimburser-1');

        expect(result.status).toBe('REIMBURSED');
        expect(mockPrisma.advance.update).toHaveBeenCalledWith({
            where: { advanceId: 'ADV-001' },
            data: expect.objectContaining({
                status: 'REIMBURSED',
                reimbursedById: 'reimburser-1',
                reimbursedAt: expect.any(Date),
            }),
            include: expect.any(Object),
        });
    });
});
