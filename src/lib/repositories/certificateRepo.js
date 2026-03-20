import { getPrisma } from '@/lib/db';
import { logger } from '@/lib/logger';

// ── Cert level map ─────────────────────────────────────────────────────────
export const CERT_THRESHOLDS = [
    { hours: 30,  level: 'BASIC_30H',   label: 'Basic Certificate (30 ชม.)' },
    { hours: 111, level: 'PRO_111H',    label: 'Professional Certificate (111 ชม.)' },
    { hours: 201, level: 'MASTER_201H', label: 'Master Certificate (201 ชม.)' },
];

export function getCertLevelForHours(hours) {
    // Return the highest threshold the student qualifies for
    const qualified = CERT_THRESHOLDS.filter(t => hours >= t.hours);
    return qualified.length > 0 ? qualified[qualified.length - 1] : null;
}

// ── ID generation ──────────────────────────────────────────────────────────
export async function generateCertId() {
    const prisma = await getPrisma();
    const today = new Date();
    const dateStr = today.getFullYear().toString() +
        (today.getMonth() + 1).toString().padStart(2, '0') +
        today.getDate().toString().padStart(2, '0');
    const prefix = `CERT-${dateStr}-`;
    const last = await prisma.certificate.findFirst({
        where: { certId: { startsWith: prefix } },
        orderBy: { certId: 'desc' },
        select: { certId: true }
    });
    const next = last ? parseInt(last.certId.split('-').pop(), 10) + 1 : 1;
    return `${prefix}${next.toString().padStart(3, '0')}`;
}

// ── Queries ────────────────────────────────────────────────────────────────

export async function listCertificates({ deliveryStatus, customerId, certLevel } = {}) {
    try {
        const prisma = await getPrisma();
        return prisma.certificate.findMany({
            where: {
                ...(deliveryStatus && { deliveryStatus }),
                ...(customerId && { customerId }),
                ...(certLevel && { certLevel }),
            },
            include: {
                customer: {
                    select: { id: true, customerId: true, firstName: true, lastName: true, nickName: true, phonePrimary: true }
                },
                enrollment: {
                    select: { id: true, enrollmentId: true }
                }
            },
            orderBy: { issuedAt: 'desc' }
        });
    } catch (error) {
        logger.error('[CertificateRepo]', 'listCertificates failed', error);
        throw error;
    }
}

export async function getCertificateById(id) {
    try {
        const prisma = await getPrisma();
        return prisma.certificate.findUnique({
            where: { id },
            include: {
                customer: true,
                enrollment: { include: { product: true } }
            }
        });
    } catch (error) {
        logger.error('[CertificateRepo]', 'getCertificateById failed', error);
        throw error;
    }
}

export async function getCertificatesByCustomer(customerId) {
    try {
        const prisma = await getPrisma();
        return prisma.certificate.findMany({
            where: { customerId },
            orderBy: { issuedAt: 'desc' }
        });
    } catch (error) {
        logger.error('[CertificateRepo]', 'getCertificatesByCustomer failed', error);
        throw error;
    }
}

// ── Check if cert already issued for this customer+level ──────────────────
export async function hasCertificate(customerId, certLevel) {
    try {
        const prisma = await getPrisma();
        const existing = await prisma.certificate.findFirst({
            where: { customerId, certLevel }
        });
        return !!existing;
    } catch (error) {
        logger.error('[CertificateRepo]', 'hasCertificate failed', error);
        throw error;
    }
}

// ── Mutations ─────────────────────────────────────────────────────────────

/**
 * Auto-called from enrollmentRepo when hoursAccumulated crosses a threshold.
 * Idempotent — will not create duplicate cert for same customer+level.
 */
export async function autoIssueCertificate({ customerId, enrollmentId, totalHours }) {
    try {
        const certInfo = getCertLevelForHours(totalHours);
        if (!certInfo) return null; // ยังไม่ถึง 30 ชม.

        const already = await hasCertificate(customerId, certInfo.level);
        if (already) return null; // ออกไปแล้ว — idempotent

        const prisma = await getPrisma();
        const certId = await generateCertId();

        const cert = await prisma.certificate.create({
            data: {
                certId,
                customerId,
                enrollmentId: enrollmentId || null,
                certLevel: certInfo.level,
                hoursAtIssuance: totalHours,
                deliveryStatus: 'PENDING',
            }
        });

        logger.error('[CertificateRepo]', `Auto-issued ${certInfo.level} for customer ${customerId} at ${totalHours}h — ${certId}`);
        return cert;
    } catch (error) {
        logger.error('[CertificateRepo]', 'autoIssueCertificate failed', error);
        throw error;
    }
}

/**
 * Staff updates delivery status + optional tracking/address info.
 * Valid transitions: PENDING → PRINTING → READY → SHIPPED → DELIVERED
 */
export async function updateDeliveryStatus(id, {
    deliveryStatus,
    trackingNumber,
    shippedAt,
    deliveredAt,
    deliveryAddress,
    notes,
}) {
    try {
        const VALID_STATUSES = ['PENDING', 'PRINTING', 'READY', 'SHIPPED', 'DELIVERED'];
        if (deliveryStatus && !VALID_STATUSES.includes(deliveryStatus)) {
            throw new Error(`Invalid deliveryStatus: ${deliveryStatus}. Must be one of ${VALID_STATUSES.join('|')}`);
        }

        const prisma = await getPrisma();
        return prisma.certificate.update({
            where: { id },
            data: {
                ...(deliveryStatus && { deliveryStatus }),
                ...(trackingNumber !== undefined && { trackingNumber }),
                ...(deliveryAddress !== undefined && { deliveryAddress }),
                ...(notes !== undefined && { notes }),
                // auto-set timestamps
                ...(deliveryStatus === 'SHIPPED' && !shippedAt && { shippedAt: new Date() }),
                ...(deliveryStatus === 'DELIVERED' && !deliveredAt && { deliveredAt: new Date() }),
                ...(shippedAt && { shippedAt: new Date(shippedAt) }),
                ...(deliveredAt && { deliveredAt: new Date(deliveredAt) }),
            },
            include: {
                customer: { select: { id: true, firstName: true, lastName: true, phonePrimary: true } }
            }
        });
    } catch (error) {
        logger.error('[CertificateRepo]', 'updateDeliveryStatus failed', error);
        throw error;
    }
}
