/**
 * Centralized ID Generator — Single Source of Truth
 * All human-readable IDs follow id_standards.yaml conventions.
 *
 * Pattern A: "by-prefix" — findFirst(prefix, orderBy desc) → increment last serial
 * Pattern B: "by-count"  — count records created today → count + 1
 *
 * Every generator returns a Promise<string>.
 */

import { getPrisma } from '@/lib/db';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function yyyymmdd() {
    const d = new Date();
    return d.getFullYear().toString()
        + (d.getMonth() + 1).toString().padStart(2, '0')
        + d.getDate().toString().padStart(2, '0');
}

function yymm() {
    const d = new Date();
    return d.getFullYear().toString().slice(-2)
        + (d.getMonth() + 1).toString().padStart(2, '0');
}

function yyyy() {
    return new Date().getFullYear().toString();
}

function yyyymm() {
    const d = new Date();
    return d.getFullYear().toString()
        + (d.getMonth() + 1).toString().padStart(2, '0');
}

/** Pattern A: find last record by prefix → increment serial */
async function nextSerialByPrefix(model, field, prefix, pad = 3) {
    const prisma = await getPrisma();
    const last = await prisma[model].findFirst({
        where: { [field]: { startsWith: prefix } },
        orderBy: { [field]: 'desc' },
        select: { [field]: true },
    });
    const serial = last
        ? parseInt(last[field].split('-').pop(), 10) + 1
        : 1;
    return `${prefix}${serial.toString().padStart(pad, '0')}`;
}

/** Pattern B: count records created today → count + 1 */
async function nextSerialByCount(model, pad = 3) {
    const prisma = await getPrisma();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const count = await prisma[model].count({
        where: { createdAt: { gte: today, lt: tomorrow } },
    });
    return (count + 1).toString().padStart(pad, '0');
}

// ─── Customer / Member ────────────────────────────────────────────────────────

/** TVS-CUS-[CH]-[YYMM]-[XXXX] */
export async function generateCustomerId(channel = 'WB') {
    const prefix = `TVS-CUS-${channel}-${yymm()}-`;
    return nextSerialByPrefix('customer', 'customerId', prefix, 4);
}

/** MEM-[YY][AGENT][INTENT]-[XXXX] */
export async function generateMemberId(agent = 'BKK', intent = 'P') {
    const yy = new Date().getFullYear().toString().slice(-2);
    const prefix = `MEM-${yy}${agent}${intent}-`;
    return nextSerialByPrefix('customer', 'memberId', prefix, 4);
}

// ─── Employee / Agent ─────────────────────────────────────────────────────────

const EMPLOYMENT_TYPE = { employee: 'EMP', freelance: 'FL', contract: 'CT' };
const DEPT_CODE = {
    marketing: 'MKT', management: 'MGT', purchasing: 'PD', sales: 'SLS',
    'assistant manager': 'AM', admin: 'ADM', 'graphic design': 'GD',
    'computer graphic': 'CG', multimedia: 'MM', 'motion graphic': 'MGFX',
    editor: 'ED', 'content creator': 'CC',
};
const AGENT_TYPE = { human: 'HM', ai: 'AI' };

/** TVS-[TYPE]-[DEPT]-[NNN] */
export async function generateEmployeeId(department, employmentType) {
    const type = EMPLOYMENT_TYPE[(employmentType || '').toLowerCase()] || 'EMP';
    const dept = DEPT_CODE[(department || '').toLowerCase()] || 'GEN';
    const prefix = `TVS-${type}-${dept}-`;
    return nextSerialByPrefix('employee', 'employeeId', prefix, 3);
}

/** AGT-[TYPE]-[YYMM]-[NNN] */
export async function generateAgentId(agentType = 'human') {
    const type = AGENT_TYPE[(agentType || '').toLowerCase()] || 'HM';
    const prefix = `AGT-${type}-${yymm()}-`;
    return nextSerialByPrefix('employee', 'agentId', prefix, 3);
}

// ─── Enrollment / Schedule ────────────────────────────────────────────────────

/** ENR-[YYYYMMDD]-[NNN] */
export async function generateEnrollmentId() {
    const prefix = `ENR-${yyyymmdd()}-`;
    return nextSerialByPrefix('enrollment', 'enrollmentId', prefix, 3);
}

/** SCH-[YYYYMMDD]-[NNN] */
export async function generateScheduleId() {
    const prefix = `SCH-${yyyymmdd()}-`;
    return nextSerialByPrefix('courseSchedule', 'scheduleId', prefix, 3);
}

/** CLS-[YYYYMM]-[NNN] */
export async function generateClassId() {
    const prefix = `CLS-${yyyymm()}-`;
    return nextSerialByPrefix('courseSchedule', 'classId', prefix, 3);
}

// ─── Kitchen / Recipe ─────────────────────────────────────────────────────────

/** RCP-[YYYY]-[NNN] */
export async function generateRecipeId() {
    const prefix = `RCP-${yyyy()}-`;
    return nextSerialByPrefix('recipe', 'recipeId', prefix, 3);
}

/** PR-[YYYYMMDD]-[NNN] */
export async function generatePurchaseRequestId() {
    const prefix = `PR-${yyyymmdd()}-`;
    return nextSerialByPrefix('purchaseRequest', 'requestId', prefix, 3);
}

/** LOT-[YYYYMMDD]-[NNN] */
export async function generateLotId() {
    const prefix = `LOT-${yyyymmdd()}-`;
    return nextSerialByPrefix('ingredientLot', 'lotId', prefix, 3);
}

// ─── Package ──────────────────────────────────────────────────────────────────

/** PKG-[YYYY]-[NNN] */
export async function generatePackageId() {
    const prefix = `PKG-${yyyy()}-`;
    return nextSerialByPrefix('package', 'packageId', prefix, 3);
}

/** PENR-[YYYY]-[XXXX] */
export async function generatePackageEnrollmentId() {
    const prefix = `PENR-${yyyy()}-`;
    return nextSerialByPrefix('packageEnrollment', 'enrollmentId', prefix, 4);
}

// ─── Asset ────────────────────────────────────────────────────────────────────

const CAT_MAP = { MARKETING: 'MKT', KITCHEN: 'KTC', OFFICE: 'OFF', GENERAL: 'GEN' };

/** AST-[CAT3]-[YYYY]-[NNN] */
export async function generateAssetId(category) {
    const cat3 = CAT_MAP[category?.toUpperCase()] || category?.substring(0, 3).toUpperCase() || 'GEN';
    const prefix = `AST-${cat3}-${yyyy()}-`;
    return nextSerialByPrefix('asset', 'assetId', prefix, 3);
}

// ─── Certificate ──────────────────────────────────────────────────────────────

/** CERT-[YYYYMMDD]-[NNN] */
export async function generateCertId() {
    const prefix = `CERT-${yyyymmdd()}-`;
    return nextSerialByPrefix('certificate', 'certId', prefix, 3);
}

// ─── Task ─────────────────────────────────────────────────────────────────────

/** TSK-[YYYYMMDD]-[NNN] */
export async function generateTaskId() {
    const prefix = `TSK-${yyyymmdd()}-`;
    return nextSerialByPrefix('task', 'taskId', prefix, 3);
}

// ─── Audit / Notification / Ads Optimize ──────────────────────────────────────

/** LOG-[YYYYMMDD]-[NNN] (by count) */
export async function generateLogId() {
    const serial = await nextSerialByCount('auditLog', 3);
    return `LOG-${yyyymmdd()}-${serial}`;
}

/** NOT-[YYYYMMDD]-[NNN] (by count) */
export async function generateNotificationRuleId() {
    const serial = await nextSerialByCount('notificationRule', 3);
    return `NOT-${yyyymmdd()}-${serial}`;
}

/** OPT-[YYYYMMDD]-[NNN] (by count) */
export async function generateRequestId() {
    const serial = await nextSerialByCount('adsOptimizeRequest', 3);
    return `OPT-${yyyymmdd()}-${serial}`;
}

// ─── Inventory Control ───────────────────────────────────────────────────────

/** MOV-[YYYYMMDD]-[NNN] */
export async function generateMovementId() {
    const prefix = `MOV-${yyyymmdd()}-`;
    return nextSerialByPrefix('stockMovement', 'movementId', prefix, 3);
}

/** CNT-[YYYYMMDD]-[NNN] */
export async function generateStockCountId() {
    const prefix = `CNT-${yyyymmdd()}-`;
    return nextSerialByPrefix('stockCount', 'countId', prefix, 3);
}

// ─── Procurement (PO Lifecycle) ──────────────────────────────────────────────

/** PO-[YYYYMMDD]-[NNN] */
export async function generatePurchaseOrderId() {
    const prefix = `PO-${yyyymmdd()}-`;
    return nextSerialByPrefix('purchaseOrderV2', 'poId', prefix, 3);
}

/** APV-[YYYYMMDD]-[NNN] */
export async function generateApprovalId() {
    const prefix = `APV-${yyyymmdd()}-`;
    return nextSerialByPrefix('pOApproval', 'approvalId', prefix, 3);
}

/** ACC-[YYYYMMDD]-[NNN] */
export async function generateAcceptanceId() {
    const prefix = `ACC-${yyyymmdd()}-`;
    return nextSerialByPrefix('pOAcceptance', 'acceptanceId', prefix, 3);
}

/** TRK-[YYYYMMDD]-[NNN] */
export async function generateTrackingId() {
    const prefix = `TRK-${yyyymmdd()}-`;
    return nextSerialByPrefix('pOTracking', 'trackingId', prefix, 3);
}

/** GRN-[YYYYMMDD]-[NNN] */
export async function generateGrnId() {
    const prefix = `GRN-${yyyymmdd()}-`;
    return nextSerialByPrefix('goodsReceivedNote', 'grnId', prefix, 3);
}

/** RTN-[YYYYMMDD]-[NNN] */
export async function generateReturnId() {
    const prefix = `RTN-${yyyymmdd()}-`;
    return nextSerialByPrefix('pOReturn', 'returnId', prefix, 3);
}

/** CN-[YYYYMMDD]-[NNN] */
export async function generateCreditNoteId() {
    const prefix = `CN-${yyyymmdd()}-`;
    return nextSerialByPrefix('creditNote', 'creditNoteId', prefix, 3);
}

/** ISS-[YYYYMMDD]-[NNN] */
export async function generateIssueId() {
    const prefix = `ISS-${yyyymmdd()}-`;
    return nextSerialByPrefix('pOIssue', 'issueId', prefix, 3);
}

/** ADV-[YYYYMMDD]-[NNN] */
export async function generateAdvanceId() {
    const prefix = `ADV-${yyyymmdd()}-`;
    return nextSerialByPrefix('advance', 'advanceId', prefix, 3);
}

/** SUP-[NNN] */
export async function generateSupplierId() {
    const prefix = 'SUP-';
    return nextSerialByPrefix('supplier', 'supplierId', prefix, 3);
}
