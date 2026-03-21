import { describe, it, expect, vi, beforeEach } from 'vitest';
import { middleware } from '../middleware';
import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

vi.mock('next/server', () => ({
    NextResponse: {
        next: vi.fn(() => ({ status: 200 })),
        json: vi.fn((data, init) => ({ ...init, json: () => data })),
    },
}));

vi.mock('next-auth/jwt', () => ({
    getToken: vi.fn(),
}));

describe('Middleware RBAC Guard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.NEXTAUTH_SECRET = 'test-secret';
        process.env.CRON_SECRET = 'cron-secret';
    });

    const mockRequest = (url, role = null, cronSecret = null) => {
        const req = {
            nextUrl: new URL(url, 'http://localhost'),
            headers: {
                get: vi.fn((name) => {
                    if (name === 'x-cron-secret') return cronSecret;
                    return null;
                }),
            },
        };
        getToken.mockResolvedValue(role ? { role } : null);
        return req;
    };

    it('should allow public routes without authentication', async () => {
        const req = mockRequest('/api/auth/session');
        const res = await middleware(req);
        expect(NextResponse.next).toHaveBeenCalled();
    });

    it('should allow cron routes with valid x-cron-secret', async () => {
        const req = mockRequest('/api/marketing/sync', null, 'cron-secret');
        const res = await middleware(req);
        expect(NextResponse.next).toHaveBeenCalled();
    });

    it('should block restricted routes if unauthenticated', async () => {
        const req = mockRequest('/api/marketing/insights');
        const res = await middleware(req);
        expect(NextResponse.json).toHaveBeenCalledWith(
            { error: 'Unauthorized' },
            { status: 401 }
        );
    });

    it('should block if user role is insufficient', async () => {
        const req = mockRequest('/api/employees/list', 'AGENT'); // Requires MANAGER
        const res = await middleware(req);
        expect(NextResponse.json).toHaveBeenCalledWith(
            { error: 'Forbidden' },
            { status: 403 }
        );
    });

    it('should allow if user role is sufficient', async () => {
        const req = mockRequest('/api/marketing/insights', 'MARKETING');
        const res = await middleware(req);
        expect(NextResponse.next).toHaveBeenCalled();
    });

    it('should allow higher roles to access lower role routes', async () => {
        const req = mockRequest('/api/customers/list', 'MANAGER'); // Requires AGENT
        const res = await middleware(req);
        expect(NextResponse.next).toHaveBeenCalled();
    });
});
