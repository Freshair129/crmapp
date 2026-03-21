import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/db', () => ({ getPrisma: vi.fn() }));

import { getPrisma } from '@/lib/db';
import {
    generateCustomerId,
    generateMemberId,
    generateEmployeeId,
    generateAgentId,
    generateEnrollmentId,
    generateScheduleId,
    generateRecipeId,
    generateTaskId,
    generateMovementId,
    generateStockCountId,
    generatePurchaseOrderId,
    generateSupplierId,
    generateLogId,
} from '../idGenerators';

let mockPrisma;

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-15'));

    mockPrisma = {
        customer: { findFirst: vi.fn() },
        employee: { findFirst: vi.fn() },
        enrollment: { findFirst: vi.fn() },
        courseSchedule: { findFirst: vi.fn() },
        recipe: { findFirst: vi.fn() },
        task: { findFirst: vi.fn() },
        stockMovement: { findFirst: vi.fn() },
        stockCount: { findFirst: vi.fn() },
        purchaseOrderV2: { findFirst: vi.fn() },
        supplier: { findFirst: vi.fn() },
        auditLog: { count: vi.fn() },
    };

    getPrisma.mockResolvedValue(mockPrisma);
});

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
});

// ─── generateCustomerId ─────────────────────────────────────────────────────

describe('generateCustomerId', () => {
    it('first customer (no existing) returns TVS-CUS-FB-2603-0001', async () => {
        mockPrisma.customer.findFirst.mockResolvedValue(null);
        const id = await generateCustomerId('FB');
        expect(id).toBe('TVS-CUS-FB-2603-0001');
    });

    it('with existing customer increments serial (0001 → 0002)', async () => {
        mockPrisma.customer.findFirst.mockResolvedValue({
            customerId: 'TVS-CUS-FB-2603-0001',
        });
        const id = await generateCustomerId('FB');
        expect(id).toBe('TVS-CUS-FB-2603-0002');
    });

    it('different channel (LN) returns TVS-CUS-LN-2603-0001', async () => {
        mockPrisma.customer.findFirst.mockResolvedValue(null);
        const id = await generateCustomerId('LN');
        expect(id).toBe('TVS-CUS-LN-2603-0001');
    });
});

// ─── generateEmployeeId ─────────────────────────────────────────────────────

describe('generateEmployeeId', () => {
    it('default (no dept/type) returns TVS-EMP-GEN-001', async () => {
        mockPrisma.employee.findFirst.mockResolvedValue(null);
        const id = await generateEmployeeId();
        expect(id).toBe('TVS-EMP-GEN-001');
    });

    it('marketing/freelance returns TVS-FL-MKT-001', async () => {
        mockPrisma.employee.findFirst.mockResolvedValue(null);
        const id = await generateEmployeeId('marketing', 'freelance');
        expect(id).toBe('TVS-FL-MKT-001');
    });

    it('with existing employee increments serial', async () => {
        mockPrisma.employee.findFirst.mockResolvedValue({
            employeeId: 'TVS-EMP-GEN-003',
        });
        const id = await generateEmployeeId();
        expect(id).toBe('TVS-EMP-GEN-004');
    });
});

// ─── generateAgentId ────────────────────────────────────────────────────────

describe('generateAgentId', () => {
    it('human agent returns AGT-HM-2603-001', async () => {
        mockPrisma.employee.findFirst.mockResolvedValue(null);
        const id = await generateAgentId('human');
        expect(id).toBe('AGT-HM-2603-001');
    });

    it('ai agent returns AGT-AI-2603-001', async () => {
        mockPrisma.employee.findFirst.mockResolvedValue(null);
        const id = await generateAgentId('ai');
        expect(id).toBe('AGT-AI-2603-001');
    });
});

// ─── generateMemberId ───────────────────────────────────────────────────────

describe('generateMemberId', () => {
    it('default returns MEM-26BKKP-0001', async () => {
        mockPrisma.customer.findFirst.mockResolvedValue(null);
        const id = await generateMemberId();
        expect(id).toBe('MEM-26BKKP-0001');
    });
});

// ─── generateEnrollmentId ───────────────────────────────────────────────────

describe('generateEnrollmentId', () => {
    it('first of day returns ENR-20260315-001', async () => {
        mockPrisma.enrollment.findFirst.mockResolvedValue(null);
        const id = await generateEnrollmentId();
        expect(id).toBe('ENR-20260315-001');
    });
});

// ─── generateScheduleId ─────────────────────────────────────────────────────

describe('generateScheduleId', () => {
    it('with existing schedule increments serial', async () => {
        mockPrisma.courseSchedule.findFirst.mockResolvedValue({
            scheduleId: 'SCH-20260315-002',
        });
        const id = await generateScheduleId();
        expect(id).toBe('SCH-20260315-003');
    });
});

// ─── generateRecipeId ───────────────────────────────────────────────────────

describe('generateRecipeId', () => {
    it('first of year returns RCP-2026-001', async () => {
        mockPrisma.recipe.findFirst.mockResolvedValue(null);
        const id = await generateRecipeId();
        expect(id).toBe('RCP-2026-001');
    });
});

// ─── generateTaskId ─────────────────────────────────────────────────────────

describe('generateTaskId', () => {
    it('first of day returns TSK-20260315-001', async () => {
        mockPrisma.task.findFirst.mockResolvedValue(null);
        const id = await generateTaskId();
        expect(id).toBe('TSK-20260315-001');
    });
});

// ─── generateMovementId ─────────────────────────────────────────────────────

describe('generateMovementId', () => {
    it('first of day returns MOV-20260315-001', async () => {
        mockPrisma.stockMovement.findFirst.mockResolvedValue(null);
        const id = await generateMovementId();
        expect(id).toBe('MOV-20260315-001');
    });
});

// ─── generateStockCountId ───────────────────────────────────────────────────

describe('generateStockCountId', () => {
    it('first of day returns CNT-20260315-001', async () => {
        mockPrisma.stockCount.findFirst.mockResolvedValue(null);
        const id = await generateStockCountId();
        expect(id).toBe('CNT-20260315-001');
    });
});

// ─── generatePurchaseOrderId ────────────────────────────────────────────────

describe('generatePurchaseOrderId', () => {
    it('first of day returns PO-20260315-001', async () => {
        mockPrisma.purchaseOrderV2.findFirst.mockResolvedValue(null);
        const id = await generatePurchaseOrderId();
        expect(id).toBe('PO-20260315-001');
    });
});

// ─── generateSupplierId ────────────────────────────────────────────────────

describe('generateSupplierId', () => {
    it('first ever returns SUP-001', async () => {
        mockPrisma.supplier.findFirst.mockResolvedValue(null);
        const id = await generateSupplierId();
        expect(id).toBe('SUP-001');
    });

    it('with existing SUP-005 returns SUP-006', async () => {
        mockPrisma.supplier.findFirst.mockResolvedValue({
            supplierId: 'SUP-005',
        });
        const id = await generateSupplierId();
        expect(id).toBe('SUP-006');
    });
});

// ─── generateLogId (Pattern B — count) ──────────────────────────────────────

describe('generateLogId', () => {
    it('count=0 returns LOG-20260315-001', async () => {
        mockPrisma.auditLog.count.mockResolvedValue(0);
        const id = await generateLogId();
        expect(id).toBe('LOG-20260315-001');
    });

    it('count=5 returns LOG-20260315-006', async () => {
        mockPrisma.auditLog.count.mockResolvedValue(5);
        const id = await generateLogId();
        expect(id).toBe('LOG-20260315-006');
    });
});
