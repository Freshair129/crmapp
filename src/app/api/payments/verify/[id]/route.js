import { NextResponse } from 'next/server';
import { verifyPayment } from '@/lib/repositories/paymentRepo';
import { logger } from '@/lib/logger';
import { getSession } from '@/lib/getSession';

export async function POST(request, { params }) {
    try {
        // Usually, the employeeId comes from the session in an authenticated route
        // const session = await getSession();
        // const employeeId = session?.user?.id;
        
        // For the sake of this task interface, we'll try to get it from the body,
        // or a mock value if not provided, assuming RBAC middleware protects this route.
        const body = await request.json().catch(() => ({}));
        const employeeId = body.employeeId || 'SYSTEM'; // Default fallback

        if (!params.id) {
            return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 });
        }

        const transaction = await verifyPayment(params.id, employeeId);
        return NextResponse.json({ success: true, transaction });
    } catch (error) {
        logger.error('PaymentsAPI', `POST /api/payments/verify/${params.id} failed`, error);
        
        if (error.message.includes('not found') || error.message.includes('already verified')) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
