/**
 * auditRepo.js — Audit Log Repository
 * Phase 34.5 — Full audit trail + approval workflow
 *
 * Actions (no approval needed):
 *   LOGIN_SUCCESS, LOGIN_FAILED, LOGOUT,
 *   VERIFY_PAYMENT, STOCK_DEDUCTION
 *
 * Actions (approval required → status = PENDING_APPROVAL):
 *   ROLE_CHANGE, EMPLOYEE_DEACTIVATE,
 *   CANCEL_ORDER, MANUAL_STOCK_ADJUST, PAYMENT_REFUND
 */

import { getPrisma }       from '@/lib/db';
import { logger }          from '@/lib/logger';
import { generateAuditId } from '@/lib/idGenerators';

// Actions that require approval before taking effect
const APPROVAL_REQUIRED = new Set([
    'ROLE_CHANGE',
    'EMPLOYEE_DEACTIVATE',
    'CANCEL_ORDER',
    'MANUAL_STOCK_ADJUST',
    'PAYMENT_REFUND',
]);

// ─── Write ─────────────────────────────────────────────────────────────────

/**
 * logAction — append an entry to audit_logs
 *
 * @param {object} params
 * @param {string|null}  params.actorId      Employee.id (null for LOGIN_FAILED)
 * @param {string|null}  params.actorEmail   email snapshot
 * @param {string}       params.action       LOGIN_SUCCESS | ROLE_CHANGE | ...
 * @param {string|null}  params.entity       "Employee" | "Order" | ...
 * @param {string|null}  params.entityId     affected record id
 * @param {object|null}  params.before       state before change
 * @param {object|null}  params.after        state after change
 * @param {string|null}  params.note         reason / comment
 * @param {string|null}  params.ip
 * @param {string|null}  params.userAgent
 * @returns {Promise<object>} created AuditLog
 */
export async function logAction({
    actorId    = null,
    actorEmail = null,
    action,
    entity     = null,
    entityId   = null,
    before     = null,
    after      = null,
    note       = null,
    ip         = null,
    userAgent  = null,
}) {
    try {
        const prisma  = await getPrisma();
        const auditId = await generateAuditId();
        const status  = APPROVAL_REQUIRED.has(action) ? 'PENDING_APPROVAL' : 'DONE';

        const entry = await prisma.auditLog.create({
            data: {
                auditId,
                actorId,
                actorEmail,
                action,
                entity,
                entityId,
                before,
                after,
                status,
                note,
                ip,
                userAgent,
            },
        });

        logger.info('[auditRepo]', `logged ${action}`, { auditId, actorId, entity, entityId });
        return entry;
    } catch (error) {
        // Audit log failure MUST NOT block the caller — log and continue
        logger.error('[auditRepo]', 'logAction failed', error);
        return null;
    }
}

// ─── Approval Workflow ──────────────────────────────────────────────────────

/**
 * getPendingApprovals — list actions waiting for approval
 * @param {object} opts
 * @param {number} opts.limit
 * @param {string|null} opts.action   filter by action type
 */
export async function getPendingApprovals({ limit = 50, action = null } = {}) {
    const prisma = await getPrisma();
    return prisma.auditLog.findMany({
        where: {
            status: 'PENDING_APPROVAL',
            ...(action ? { action } : {}),
        },
        orderBy: { createdAt: 'asc' },
        take: limit,
    });
}

/**
 * approveAction — approver accepts a PENDING_APPROVAL entry
 * @param {string} auditId      AUD-YYYYMMDD-NNNN
 * @param {string} approverId   Employee.id of approver
 * @param {string|null} note
 */
export async function approveAction(auditId, approverId, note = null) {
    const prisma = await getPrisma();
    const entry  = await prisma.auditLog.findUnique({ where: { auditId } });
    if (!entry)                              throw new Error(`AuditLog ${auditId} not found`);
    if (entry.status !== 'PENDING_APPROVAL') throw new Error(`AuditLog ${auditId} is not pending (status: ${entry.status})`);

    return prisma.auditLog.update({
        where: { auditId },
        data:  {
            status:     'APPROVED',
            approverId,
            approvedAt: new Date(),
            note:       note ?? entry.note,
        },
    });
}

/**
 * rejectAction — approver rejects a PENDING_APPROVAL entry
 * @param {string} auditId
 * @param {string} approverId
 * @param {string} note         reason for rejection (required)
 */
export async function rejectAction(auditId, approverId, note) {
    const prisma = await getPrisma();
    const entry  = await prisma.auditLog.findUnique({ where: { auditId } });
    if (!entry)                              throw new Error(`AuditLog ${auditId} not found`);
    if (entry.status !== 'PENDING_APPROVAL') throw new Error(`AuditLog ${auditId} is not pending`);

    return prisma.auditLog.update({
        where: { auditId },
        data:  {
            status:     'REJECTED',
            approverId,
            approvedAt: new Date(),
            note:       note,
        },
    });
}

// ─── Query ──────────────────────────────────────────────────────────────────

/**
 * getAuditTrail — history for a specific entity record
 * @param {string} entity     "Employee" | "Order" | ...
 * @param {string} entityId
 * @param {number} limit
 */
export async function getAuditTrail(entity, entityId, limit = 100) {
    const prisma = await getPrisma();
    return prisma.auditLog.findMany({
        where:   { entity, entityId },
        orderBy: { createdAt: 'desc' },
        take:    limit,
    });
}

/**
 * getActorHistory — all actions by a specific employee
 * @param {string} actorId    Employee.id
 * @param {number} limit
 */
export async function getActorHistory(actorId, limit = 100) {
    const prisma = await getPrisma();
    return prisma.auditLog.findMany({
        where:   { actorId },
        orderBy: { createdAt: 'desc' },
        take:    limit,
    });
}

/**
 * getAuditLogs — paginated list with filters
 * @param {object} opts
 * @param {string|null} opts.action
 * @param {string|null} opts.status
 * @param {string|null} opts.entity
 * @param {string|null} opts.actorId
 * @param {number}      opts.limit
 * @param {string|null} opts.cursor   auditId for cursor pagination
 */
export async function getAuditLogs({
    action   = null,
    status   = null,
    entity   = null,
    actorId  = null,
    limit    = 50,
    cursor   = null,
} = {}) {
    const prisma = await getPrisma();
    return prisma.auditLog.findMany({
        where: {
            ...(action  ? { action }  : {}),
            ...(status  ? { status }  : {}),
            ...(entity  ? { entity }  : {}),
            ...(actorId ? { actorId } : {}),
            ...(cursor  ? { createdAt: { lt: (await prisma.auditLog.findUnique({ where: { auditId: cursor }, select: { createdAt: true } }))?.createdAt } } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take:    limit,
    });
}
