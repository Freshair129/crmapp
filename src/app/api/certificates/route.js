import { NextResponse } from 'next/server';
import { listCertificates, autoIssueCertificate } from '@/lib/repositories/certificateRepo';
import { logger } from '@/lib/logger';

/**
 * GET /api/certificates
 * Query params: deliveryStatus, customerId, certLevel
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const deliveryStatus = searchParams.get('deliveryStatus') || undefined;
        const customerId     = searchParams.get('customerId') || undefined;
        const certLevel      = searchParams.get('certLevel') || undefined;

        const certs = await listCertificates({ deliveryStatus, customerId, certLevel });
        return NextResponse.json(certs);
    } catch (error) {
        logger.error('[CertificatesAPI]', 'GET error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * POST /api/certificates
 * Manual issue (e.g., staff override)
 * Body: { customerId, enrollmentId?, totalHours }
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const { customerId, enrollmentId, totalHours } = body;

        if (!customerId || totalHours === undefined) {
            return NextResponse.json({ error: 'customerId and totalHours are required' }, { status: 400 });
        }

        const cert = await autoIssueCertificate({ customerId, enrollmentId, totalHours: Number(totalHours) });

        if (!cert) {
            return NextResponse.json(
                { error: 'Certificate already issued for this level, or hours not yet sufficient (< 30h)' },
                { status: 409 }
            );
        }

        return NextResponse.json(cert, { status: 201 });
    } catch (error) {
        logger.error('[CertificatesAPI]', 'POST error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
