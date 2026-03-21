import { getPrisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import {
    generatePurchaseOrderId, generateApprovalId, generateAcceptanceId,
    generateTrackingId, generateGrnId, generateReturnId,
    generateCreditNoteId, generateIssueId, generateAdvanceId, generateSupplierId
} from '@/lib/idGenerators';

const MODULE = 'ProcurementRepo';

// ═══════════════════════════════════════════════════════════════════════════════
// SUPPLIER CRUD
// ═══════════════════════════════════════════════════════════════════════════════

export async function createSupplier({ name, contactName, phone, email, address, taxId, bankAccount, notes }) {
    try {
        const prisma = await getPrisma();
        const supplierId = await generateSupplierId();
        return prisma.supplier.create({
            data: {
                supplierId,
                name,
                contactName: contactName ?? null,
                phone: phone ?? null,
                email: email ?? null,
                address: address ?? null,
                taxId: taxId ?? null,
                bankAccount: bankAccount ?? null,
                notes: notes ?? null,
            },
        });
    } catch (error) {
        logger.error(MODULE, 'Failed to create supplier', error);
        throw error;
    }
}

export async function getAllSuppliers(opts = {}) {
    try {
        const prisma = await getPrisma();
        const { isActive, search } = opts;
        const where = {};
        if (isActive !== undefined) where.isActive = isActive;
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { contactName: { contains: search, mode: 'insensitive' } },
                { supplierId: { contains: search, mode: 'insensitive' } },
            ];
        }
        return prisma.supplier.findMany({
            where,
            orderBy: { name: 'asc' },
        });
    } catch (error) {
        logger.error(MODULE, 'Failed to get suppliers', error);
        throw error;
    }
}

export async function getSupplierById(id) {
    try {
        const prisma = await getPrisma();
        return prisma.supplier.findUnique({ where: { id } });
    } catch (error) {
        logger.error(MODULE, 'Failed to get supplier by ID', error);
        throw error;
    }
}

export async function updateSupplier(id, data) {
    try {
        const prisma = await getPrisma();
        return prisma.supplier.update({ where: { id }, data });
    } catch (error) {
        logger.error(MODULE, 'Failed to update supplier', error);
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PURCHASE ORDER CRUD + STATUS
// ═══════════════════════════════════════════════════════════════════════════════

export async function createPurchaseOrder({ classId, supplierId, items, notes, createdById }) {
    try {
        const prisma = await getPrisma();
        const poId = await generatePurchaseOrderId();

        return prisma.$transaction(async (tx) => {
            // Compute totalAmount from items
            const totalAmount = items.reduce((sum, item) => {
                const lineTotal = (item.quantity ?? 0) * (item.unitPrice ?? 0);
                return sum + lineTotal;
            }, 0);

            const po = await tx.purchaseOrderV2.create({
                data: {
                    poId,
                    classId: classId ?? null,
                    supplierId: supplierId ?? null,
                    status: 'DRAFT',
                    totalAmount,
                    notes: notes ?? null,
                    createdById: createdById ?? null,
                },
            });

            if (items && items.length > 0) {
                await tx.pOItem.createMany({
                    data: items.map((item) => ({
                        poId: po.id,
                        ingredientId: item.ingredientId ?? null,
                        productId: item.productId ?? null,
                        description: item.description,
                        quantity: item.quantity,
                        unit: item.unit ?? null,
                        unitPrice: item.unitPrice ?? null,
                        totalPrice: (item.quantity ?? 0) * (item.unitPrice ?? 0),
                        notes: item.notes ?? null,
                    })),
                });
            }

            return tx.purchaseOrderV2.findUnique({
                where: { id: po.id },
                include: {
                    items: true,
                    supplier: { select: { name: true, supplierId: true } },
                    createdBy: { select: { firstName: true, lastName: true, nickName: true } },
                },
            });
        });
    } catch (error) {
        logger.error(MODULE, 'Failed to create purchase order', error);
        throw error;
    }
}

export async function getAllPurchaseOrders(opts = {}) {
    try {
        const prisma = await getPrisma();
        const { status, classId, supplierId, limit = 50, offset = 0 } = opts;
        const where = {};
        if (status) where.status = status;
        if (classId) where.classId = classId;
        if (supplierId) where.supplierId = supplierId;

        return prisma.purchaseOrderV2.findMany({
            where,
            include: {
                _count: { select: { items: true } },
                supplier: { select: { name: true, supplierId: true } },
                createdBy: { select: { firstName: true, lastName: true, nickName: true } },
                approvals: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    select: { action: true, createdAt: true, approver: { select: { nickName: true } } },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
        });
    } catch (error) {
        logger.error(MODULE, 'Failed to get purchase orders', error);
        throw error;
    }
}

export async function getPurchaseOrderById(id) {
    try {
        const prisma = await getPrisma();
        return prisma.purchaseOrderV2.findUnique({
            where: { id },
            include: {
                items: true,
                supplier: true,
                createdBy: { select: { firstName: true, lastName: true, nickName: true, employeeId: true } },
                approvals: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        approver: { select: { firstName: true, lastName: true, nickName: true } },
                    },
                },
                acceptance: {
                    include: {
                        purchaser: { select: { firstName: true, lastName: true, nickName: true } },
                    },
                },
                trackings: {
                    orderBy: { createdAt: 'desc' },
                },
                grns: {
                    orderBy: { createdAt: 'desc' },
                    include: { items: true },
                },
                returns: {
                    orderBy: { createdAt: 'desc' },
                },
                creditNotes: {
                    orderBy: { createdAt: 'desc' },
                },
                issues: {
                    orderBy: { createdAt: 'desc' },
                },
                advances: {
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
    } catch (error) {
        logger.error(MODULE, 'Failed to get purchase order by ID', error);
        throw error;
    }
}

export async function updatePurchaseOrderStatus(id, status) {
    try {
        const prisma = await getPrisma();
        return prisma.purchaseOrderV2.update({
            where: { id },
            data: { status },
        });
    } catch (error) {
        logger.error(MODULE, 'Failed to update purchase order status', error);
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// BOM CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

export async function calculateClassBOM(classId) {
    try {
        const prisma = await getPrisma();

        // 1. Find all CourseSchedule records with this classId
        const schedules = await prisma.courseSchedule.findMany({
            where: { classId },
            include: {
                product: {
                    include: {
                        courseMenus: {
                            include: {
                                recipe: {
                                    include: {
                                        ingredients: {
                                            include: { ingredient: true },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (schedules.length === 0) {
            return { classId, totalStudents: 0, ingredients: [] };
        }

        // 2-6. Aggregate ingredient needs across all schedules
        const ingredientMap = new Map(); // ingredientId → { name, unit, totalNeeded }
        let totalStudents = 0;

        for (const schedule of schedules) {
            const studentCount = schedule.confirmedStudents || schedule.maxStudents || 1;
            totalStudents += studentCount;

            if (!schedule.product?.courseMenus) continue;

            for (const menu of schedule.product.courseMenus) {
                if (!menu.recipe?.ingredients) continue;

                for (const ri of menu.recipe.ingredients) {
                    const factor = ri.conversionFactor ?? 1;
                    const qtyForSchedule = ri.qtyPerPerson * studentCount * factor;

                    const existing = ingredientMap.get(ri.ingredientId);
                    if (existing) {
                        existing.totalNeeded += qtyForSchedule;
                    } else {
                        ingredientMap.set(ri.ingredientId, {
                            ingredientId: ri.ingredientId,
                            name: ri.ingredient?.name ?? 'Unknown',
                            unit: ri.ingredient?.unit ?? ri.unit,
                            totalNeeded: qtyForSchedule,
                            currentStock: ri.ingredient?.currentStock ?? 0,
                        });
                    }
                }
            }
        }

        // 7-8. Calculate shortfall for each ingredient
        const ingredients = Array.from(ingredientMap.values()).map((item) => ({
            ingredientId: item.ingredientId,
            name: item.name,
            unit: item.unit,
            totalNeeded: +item.totalNeeded.toFixed(6),
            currentStock: item.currentStock,
            shortfall: +Math.max(0, item.totalNeeded - item.currentStock).toFixed(6),
        }));

        return { classId, totalStudents, ingredients };
    } catch (error) {
        logger.error(MODULE, 'Failed to calculate class BOM', error);
        throw error;
    }
}

export async function createPOFromBOM(classId, createdById) {
    try {
        const bom = await calculateClassBOM(classId);
        const shortfallItems = bom.ingredients.filter((i) => i.shortfall > 0);

        if (shortfallItems.length === 0) {
            logger.info(MODULE, `No shortfall for class ${classId} — PO not needed`);
            return { alreadySufficient: true, classId, ingredients: bom.ingredients };
        }

        const items = shortfallItems.map((item) => ({
            ingredientId: item.ingredientId,
            description: item.name,
            quantity: item.shortfall,
            unit: item.unit,
            unitPrice: 0, // Price to be filled by purchasing team
        }));

        const po = await createPurchaseOrder({
            classId,
            items,
            notes: `Auto-generated from BOM calculation for class ${classId}. ${bom.totalStudents} students total.`,
            createdById,
        });

        logger.info(MODULE, `PO ${po.poId} created from BOM for class ${classId} — ${shortfallItems.length} items`);
        return po;
    } catch (error) {
        logger.error(MODULE, 'Failed to create PO from BOM', error);
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// APPROVAL FLOW
// ═══════════════════════════════════════════════════════════════════════════════

export async function approvePO(poId, approverId, action, reason) {
    try {
        const prisma = await getPrisma();
        const approvalId = await generateApprovalId();

        return prisma.$transaction(async (tx) => {
            // 1. Validate PO status
            const po = await tx.purchaseOrderV2.findUnique({ where: { id: poId } });
            if (!po) throw new Error(`PO not found: ${poId}`);
            if (po.status !== 'REQUEST_REVIEW') {
                throw new Error(`PO ${po.poId} is not in REQUEST_REVIEW status (current: ${po.status})`);
            }

            const validActions = ['APPROVED', 'REJECTED'];
            if (!validActions.includes(action)) {
                throw new Error(`Invalid approval action: ${action}. Must be APPROVED or REJECTED`);
            }

            // 2. Create approval record
            const approval = await tx.pOApproval.create({
                data: {
                    approvalId,
                    poId,
                    action,
                    approverId,
                    reason: reason ?? null,
                },
                include: {
                    approver: { select: { firstName: true, lastName: true, nickName: true } },
                },
            });

            // 3. Update PO status
            const newStatus = action === 'APPROVED' ? 'APPROVED' : 'REJECTED';
            await tx.purchaseOrderV2.update({
                where: { id: poId },
                data: { status: newStatus },
            });

            logger.info(MODULE, `PO ${po.poId} ${action} by ${approval.approver?.nickName ?? approverId}`);
            return approval;
        });
    } catch (error) {
        logger.error(MODULE, 'Failed to approve PO', error);
        throw error;
    }
}

export async function submitForReview(poId) {
    try {
        const prisma = await getPrisma();
        const po = await prisma.purchaseOrderV2.findUnique({ where: { id: poId } });
        if (!po) throw new Error(`PO not found: ${poId}`);
        if (po.status !== 'DRAFT') {
            throw new Error(`PO ${po.poId} is not in DRAFT status (current: ${po.status})`);
        }
        return prisma.purchaseOrderV2.update({
            where: { id: poId },
            data: { status: 'REQUEST_REVIEW' },
        });
    } catch (error) {
        logger.error(MODULE, 'Failed to submit PO for review', error);
        throw error;
    }
}

export async function resubmitPO(poId) {
    try {
        const prisma = await getPrisma();
        const po = await prisma.purchaseOrderV2.findUnique({ where: { id: poId } });
        if (!po) throw new Error(`PO not found: ${poId}`);
        if (po.status !== 'REJECTED') {
            throw new Error(`PO ${po.poId} is not in REJECTED status (current: ${po.status})`);
        }
        return prisma.purchaseOrderV2.update({
            where: { id: poId },
            data: { status: 'DRAFT' },
        });
    } catch (error) {
        logger.error(MODULE, 'Failed to resubmit PO', error);
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACCEPTANCE (PURCHASING)
// ═══════════════════════════════════════════════════════════════════════════════

export async function acceptPO(poId, { purchaserId, orderDate, expectedDeliveryDate, actualOrderRef, notes }) {
    try {
        const prisma = await getPrisma();
        const acceptanceId = await generateAcceptanceId();

        return prisma.$transaction(async (tx) => {
            // 1. Validate PO status
            const po = await tx.purchaseOrderV2.findUnique({ where: { id: poId } });
            if (!po) throw new Error(`PO not found: ${poId}`);
            if (po.status !== 'APPROVED') {
                throw new Error(`PO ${po.poId} is not in APPROVED status (current: ${po.status})`);
            }

            // 2. Create acceptance record
            const acceptance = await tx.pOAcceptance.create({
                data: {
                    acceptanceId,
                    poId,
                    purchaserId,
                    orderDate: new Date(orderDate),
                    expectedDeliveryDate: new Date(expectedDeliveryDate),
                    actualOrderRef: actualOrderRef ?? null,
                    notes: notes ?? null,
                },
                include: {
                    purchaser: { select: { firstName: true, lastName: true, nickName: true } },
                },
            });

            // 3. Update PO status
            await tx.purchaseOrderV2.update({
                where: { id: poId },
                data: { status: 'ORDERING' },
            });

            logger.info(MODULE, `PO ${po.poId} accepted by ${acceptance.purchaser?.nickName ?? purchaserId}`);
            return acceptance;
        });
    } catch (error) {
        logger.error(MODULE, 'Failed to accept PO', error);
        throw error;
    }
}

export async function markAsOrdered(poId, { supplierId, invoiceRef }) {
    try {
        const prisma = await getPrisma();
        const po = await prisma.purchaseOrderV2.findUnique({ where: { id: poId } });
        if (!po) throw new Error(`PO not found: ${poId}`);

        const data = { status: 'ORDERED' };
        if (supplierId) data.supplierId = supplierId;

        const updated = await prisma.purchaseOrderV2.update({
            where: { id: poId },
            data,
        });

        // Store invoiceRef in acceptance if it exists
        if (invoiceRef) {
            await prisma.pOAcceptance.updateMany({
                where: { poId },
                data: { actualOrderRef: invoiceRef },
            });
        }

        logger.info(MODULE, `PO ${updated.poId} marked as ORDERED`);
        return updated;
    } catch (error) {
        logger.error(MODULE, 'Failed to mark PO as ordered', error);
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRACKING
// ═══════════════════════════════════════════════════════════════════════════════

export async function createTracking(poId, { carrier, trackingNumber, estimatedDate, notes, supplierId }) {
    try {
        const prisma = await getPrisma();
        const trackingId = await generateTrackingId();
        return prisma.pOTracking.create({
            data: {
                trackingId,
                poId,
                supplierId: supplierId ?? null,
                carrier: carrier ?? null,
                trackingNumber: trackingNumber ?? null,
                status: 'PREPARING',
                estimatedDate: estimatedDate ? new Date(estimatedDate) : null,
                notes: notes ?? null,
            },
        });
    } catch (error) {
        logger.error(MODULE, 'Failed to create tracking', error);
        throw error;
    }
}

export async function updateTrackingStatus(trackingId, status, actualDate) {
    try {
        const validStatuses = ['PREPARING', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED'];
        if (!validStatuses.includes(status)) {
            throw new Error(`Invalid tracking status: ${status}`);
        }
        const prisma = await getPrisma();
        return prisma.pOTracking.update({
            where: { trackingId },
            data: {
                status,
                actualDate: actualDate ? new Date(actualDate) : (status === 'DELIVERED' ? new Date() : undefined),
            },
        });
    } catch (error) {
        logger.error(MODULE, 'Failed to update tracking status', error);
        throw error;
    }
}

export async function getTrackingsByPO(poId) {
    try {
        const prisma = await getPrisma();
        return prisma.pOTracking.findMany({
            where: { poId },
            include: {
                supplier: { select: { name: true, supplierId: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    } catch (error) {
        logger.error(MODULE, 'Failed to get trackings by PO', error);
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GOODS RECEIVED NOTE (GRN)
// ═══════════════════════════════════════════════════════════════════════════════

export async function createGRN(poId, { receivedById, isPartial, supplierId, notes, items }) {
    try {
        const prisma = await getPrisma();
        const grnId = await generateGrnId();

        return prisma.$transaction(async (tx) => {
            // 1. Create GoodsReceivedNote
            const grn = await tx.goodsReceivedNote.create({
                data: {
                    grnId,
                    poId,
                    supplierId: supplierId ?? null,
                    isPartial: isPartial ?? false,
                    receivedById,
                    notes: notes ?? null,
                },
            });

            // 2. Create GRNItems
            if (items && items.length > 0) {
                await tx.gRNItem.createMany({
                    data: items.map((item) => ({
                        grnId: grn.id,
                        ingredientId: item.ingredientId ?? null,
                        productId: item.productId ?? null,
                        description: item.description,
                        orderedQty: item.orderedQty,
                        receivedQty: item.receivedQty,
                        unit: item.unit ?? null,
                        expiresAt: item.expiresAt ? new Date(item.expiresAt) : null,
                        notes: item.notes ?? null,
                    })),
                });
            }

            // 3. Update Ingredient.currentStock for items with ingredientId
            const ingredientItems = (items || []).filter((item) => item.ingredientId && item.receivedQty > 0);
            for (const item of ingredientItems) {
                await tx.ingredient.update({
                    where: { id: item.ingredientId },
                    data: { currentStock: { increment: item.receivedQty } },
                });
            }

            // 4. Update PO status
            const newStatus = isPartial ? 'PARTIAL' : 'RECEIVED';
            await tx.purchaseOrderV2.update({
                where: { id: poId },
                data: { status: newStatus },
            });

            const result = await tx.goodsReceivedNote.findUnique({
                where: { id: grn.id },
                include: {
                    items: true,
                    receivedBy: { select: { firstName: true, lastName: true, nickName: true } },
                },
            });

            logger.info(MODULE, `GRN ${grnId} created for PO ${poId} — ${(items || []).length} items, partial=${isPartial ?? false}`);
            return result;
        });
    } catch (error) {
        logger.error(MODULE, 'Failed to create GRN', error);
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RETURNS
// ═══════════════════════════════════════════════════════════════════════════════

export async function createReturn(poId, { supplierId, reason, items, returnedById }) {
    try {
        const prisma = await getPrisma();
        const returnId = await generateReturnId();
        return prisma.pOReturn.create({
            data: {
                returnId,
                poId,
                supplierId: supplierId ?? null,
                reason,
                items: items ?? [],
                returnedById,
                status: 'PENDING',
            },
            include: {
                returnedBy: { select: { firstName: true, lastName: true, nickName: true } },
                supplier: { select: { name: true } },
            },
        });
    } catch (error) {
        logger.error(MODULE, 'Failed to create return', error);
        throw error;
    }
}

export async function updateReturnStatus(returnId, status) {
    try {
        const validStatuses = ['PENDING', 'SHIPPED', 'RECEIVED_BY_SUPPLIER', 'RESOLVED'];
        if (!validStatuses.includes(status)) {
            throw new Error(`Invalid return status: ${status}`);
        }
        const prisma = await getPrisma();
        return prisma.pOReturn.update({
            where: { returnId },
            data: { status },
        });
    } catch (error) {
        logger.error(MODULE, 'Failed to update return status', error);
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CREDIT NOTES
// ═══════════════════════════════════════════════════════════════════════════════

export async function createCreditNote(poId, { supplierId, returnId, amount, reason }) {
    try {
        const prisma = await getPrisma();
        const creditNoteId = await generateCreditNoteId();
        return prisma.creditNote.create({
            data: {
                creditNoteId,
                poId,
                supplierId: supplierId ?? null,
                returnId: returnId ?? null,
                amount,
                reason: reason ?? null,
                status: 'PENDING',
            },
            include: {
                supplier: { select: { name: true } },
                linkedReturn: { select: { returnId: true, reason: true } },
            },
        });
    } catch (error) {
        logger.error(MODULE, 'Failed to create credit note', error);
        throw error;
    }
}

export async function updateCreditNoteStatus(creditNoteId, status, receivedAt) {
    try {
        const validStatuses = ['PENDING', 'APPROVED', 'RECEIVED', 'CANCELLED'];
        if (!validStatuses.includes(status)) {
            throw new Error(`Invalid credit note status: ${status}`);
        }
        const prisma = await getPrisma();
        const data = { status };
        if (receivedAt) data.receivedAt = new Date(receivedAt);
        else if (status === 'RECEIVED') data.receivedAt = new Date();
        return prisma.creditNote.update({
            where: { creditNoteId },
            data,
        });
    } catch (error) {
        logger.error(MODULE, 'Failed to update credit note status', error);
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ISSUES
// ═══════════════════════════════════════════════════════════════════════════════

export async function createIssue(poId, { issueType, description, severity, reportedById }) {
    try {
        const prisma = await getPrisma();
        const issueId = await generateIssueId();

        const issue = await prisma.pOIssue.create({
            data: {
                issueId,
                poId,
                issueType,
                description,
                severity: severity ?? 'MEDIUM',
                status: 'OPEN',
                reportedById,
            },
            include: {
                reportedBy: { select: { firstName: true, lastName: true, nickName: true } },
            },
        });

        // Update PO status to ISSUE
        await prisma.purchaseOrderV2.update({
            where: { id: poId },
            data: { status: 'ISSUE' },
        });

        logger.info(MODULE, `Issue ${issueId} created for PO ${poId} — type=${issueType}, severity=${severity ?? 'MEDIUM'}`);
        return issue;
    } catch (error) {
        logger.error(MODULE, 'Failed to create issue', error);
        throw error;
    }
}

export async function resolveIssue(issueId, resolution) {
    try {
        const prisma = await getPrisma();
        return prisma.pOIssue.update({
            where: { issueId },
            data: {
                status: 'RESOLVED',
                resolution,
                resolvedAt: new Date(),
            },
        });
    } catch (error) {
        logger.error(MODULE, 'Failed to resolve issue', error);
        throw error;
    }
}

export async function getIssuesByPO(poId) {
    try {
        const prisma = await getPrisma();
        return prisma.pOIssue.findMany({
            where: { poId },
            include: {
                reportedBy: { select: { firstName: true, lastName: true, nickName: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    } catch (error) {
        logger.error(MODULE, 'Failed to get issues by PO', error);
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADVANCES
// ═══════════════════════════════════════════════════════════════════════════════

export async function createAdvance({ poId, paidById, amount, description, receiptImage }) {
    try {
        const prisma = await getPrisma();
        const advanceId = await generateAdvanceId();
        return prisma.advance.create({
            data: {
                advanceId,
                poId: poId ?? null,
                paidById,
                amount,
                description: description ?? null,
                receiptImage: receiptImage ?? null,
                status: 'PENDING',
            },
            include: {
                paidBy: { select: { firstName: true, lastName: true, nickName: true } },
            },
        });
    } catch (error) {
        logger.error(MODULE, 'Failed to create advance', error);
        throw error;
    }
}

export async function approveAdvance(advanceId, approvedById) {
    try {
        const prisma = await getPrisma();
        return prisma.advance.update({
            where: { advanceId },
            data: {
                status: 'APPROVED',
                approvedById,
            },
            include: {
                approvedBy: { select: { firstName: true, lastName: true, nickName: true } },
            },
        });
    } catch (error) {
        logger.error(MODULE, 'Failed to approve advance', error);
        throw error;
    }
}

export async function reimburseAdvance(advanceId, reimbursedById) {
    try {
        const prisma = await getPrisma();
        return prisma.advance.update({
            where: { advanceId },
            data: {
                status: 'REIMBURSED',
                reimbursedById,
                reimbursedAt: new Date(),
            },
            include: {
                reimbursedBy: { select: { firstName: true, lastName: true, nickName: true } },
            },
        });
    } catch (error) {
        logger.error(MODULE, 'Failed to reimburse advance', error);
        throw error;
    }
}

export async function getAdvancesByPO(poId) {
    try {
        const prisma = await getPrisma();
        return prisma.advance.findMany({
            where: { poId },
            include: {
                paidBy: { select: { firstName: true, lastName: true, nickName: true } },
                approvedBy: { select: { firstName: true, lastName: true, nickName: true } },
                reimbursedBy: { select: { firstName: true, lastName: true, nickName: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    } catch (error) {
        logger.error(MODULE, 'Failed to get advances by PO', error);
        throw error;
    }
}

export async function getPendingAdvances() {
    try {
        const prisma = await getPrisma();
        return prisma.advance.findMany({
            where: {
                status: { in: ['PENDING', 'APPROVED'] },
            },
            include: {
                paidBy: { select: { firstName: true, lastName: true, nickName: true } },
                approvedBy: { select: { firstName: true, lastName: true, nickName: true } },
                purchaseOrder: { select: { poId: true, status: true, totalAmount: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    } catch (error) {
        logger.error(MODULE, 'Failed to get pending advances', error);
        throw error;
    }
}
