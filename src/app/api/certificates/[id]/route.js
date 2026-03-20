import { NextResponse } from 'next/server';
import { getCertificateById, updateDeliveryStatus } from '@/lib/repositories/certificateRepo';
import { logger } from '@/lib/logger';

/**
 * GET /api/certificates/[id]
 */
export async function GET(request, { params }) {
    try {
        const cert = await getCertificateById(params.id);
        if (!cert) return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
        return NextResponse.json(cert);
    } catch (error) {
        logger.error('[CertificatesAPI]', 'GET [id] error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * PATCH /api/certificates/[id]
 * Body: { deliveryStatus, trackingNumber?, shippedAt?, deliveredAt?, deliveryAddress?, notes? }
 *
 * Delivery flow: PENDING → PRINTING → READY → SHIPPED → DELIVERED
 */
export async function PATCH(request, { params }) {
    try {
        const body = await request.json();
        const updated = await updateDeliveryStatus(params.id, body);
        return NextResponse.json(updated);
    } catch (error) {
        if (error.message?.startsWith('Invalid deliveryStatus')) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
        logger.error('[CertificatesAPI]', 'PATCH [id] error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
