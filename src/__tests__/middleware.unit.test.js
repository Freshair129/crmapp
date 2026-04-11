import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next-auth/jwt
vi.mock('next-auth/jwt', () => ({
    getToken: vi.fn(),
}));

// Mock next/server
vi.mock('next/server', () => ({
    NextResponse: {
        json: vi.fn((body, opts) => ({ body, status: opts?.status || 200, type: 'json' })),
        next: vi.fn(() => ({ type: 'next' })),
    },
}));

import { middleware } from '@/middleware';
import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';

function makeRequest(pathname, method = 'GET', headers = {}) {
    return {
        nextUrl: { pathname },
        method,
        headers: {
            get: (key) => headers[key] || null,
        },
    };
}

describe('middleware', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubEnv('NODE_ENV', 'production');
        vi.stubEnv('NEXTAUTH_SECRET', 'test-secret');
        vi.stubEnv('CRON_SECRET', 'cron-secret-123');
    });

    describe('development bypass', () => {
        it('should bypass all checks in development', async () => {
            vi.stubEnv('NODE_ENV', 'development');
            const result = await middleware(makeRequest('/api/employees'));
            expect(result.type).toBe('next');
        });
    });

    describe('public routes (null role)', () => {
        const publicPaths = ['/api/auth/signin', '/api/webhooks/facebook', '/api/mcp', '/api/members/register', '/api/health', '/api/workers/notification'];

        for (const path of publicPaths) {
            it(`should pass through ${path} without auth`, async () => {
                const result = await middleware(makeRequest(path));
                expect(result.type).toBe('next');
            });
        }
    });

    describe('CRON_SECRET bypass', () => {
        it('should allow cron routes with valid secret', async () => {
            const result = await middleware(makeRequest(
                '/api/marketing/sync',
                'GET',
                { 'x-cron-secret': 'cron-secret-123' }
            ));
            expect(result.type).toBe('next');
        });

        it('should not bypass non-cron routes with cron secret', async () => {
            getToken.mockResolvedValue(null);
            const result = await middleware(makeRequest(
                '/api/employees',
                'GET',
                { 'x-cron-secret': 'cron-secret-123' }
            ));
            expect(result.status).toBe(401);
        });
    });

    describe('authentication', () => {
        it('should return 401 when no token', async () => {
            getToken.mockResolvedValue(null);
            const result = await middleware(makeRequest('/api/customers'));
            expect(result.status).toBe(401);
        });
    });

    describe('role-based access', () => {
        it('should allow DEV to access any route', async () => {
            getToken.mockResolvedValue({ role: 'DEV' });
            const result = await middleware(makeRequest('/api/employees'));
            expect(result.type).toBe('next');
        });

        it('should allow MGR to access marketing routes', async () => {
            getToken.mockResolvedValue({ role: 'MGR' });
            const result = await middleware(makeRequest('/api/marketing/campaigns'));
            expect(result.type).toBe('next');
        });

        it('should deny STF from employee routes (requires ADM)', async () => {
            getToken.mockResolvedValue({ role: 'STF' });
            const result = await middleware(makeRequest('/api/employees'));
            expect(result.status).toBe(403);
        });

        it('should deny AGT from marketing routes (requires MKT)', async () => {
            getToken.mockResolvedValue({ role: 'AGT' });
            const result = await middleware(makeRequest('/api/marketing/campaigns'));
            expect(result.status).toBe(403);
        });

        it('should allow AGT to access customer routes', async () => {
            getToken.mockResolvedValue({ role: 'AGT' });
            const result = await middleware(makeRequest('/api/customers'));
            expect(result.type).toBe('next');
        });
    });

    describe('STF write-block', () => {
        // Note: STF (level 0.5) < AGT (level 1), so STF is denied by role check
        // on ALL /api routes. The write-block is defense-in-depth.
        // We test that STF gets 403 for any API route (role-based denial).

        it('should deny STF from any API route (role too low)', async () => {
            getToken.mockResolvedValue({ role: 'STF' });
            const result = await middleware(makeRequest('/api/products', 'GET'));
            expect(result.status).toBe(403);
        });

        it('should deny STF POST (role + write block)', async () => {
            getToken.mockResolvedValue({ role: 'STF' });
            const result = await middleware(makeRequest('/api/products', 'POST'));
            expect(result.status).toBe(403);
        });

        it('should not block write from non-STF roles', async () => {
            getToken.mockResolvedValue({ role: 'AGT' });
            const result = await middleware(makeRequest('/api/customers', 'POST'));
            expect(result.type).toBe('next');
        });
    });

    describe('route matching priority', () => {
        it('should match /api/notion before catch-all /api', async () => {
            getToken.mockResolvedValue({ role: 'AGT' }); // AGT < MGR
            const result = await middleware(makeRequest('/api/notion/sync'));
            expect(result.status).toBe(403); // Requires MGR
        });

        it('should match /api/audit before catch-all', async () => {
            getToken.mockResolvedValue({ role: 'AGT' }); // AGT < ADM
            const result = await middleware(makeRequest('/api/audit'));
            expect(result.status).toBe(403);
        });
    });
});
