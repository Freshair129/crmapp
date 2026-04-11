import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireRole, getSessionRole } from '@/lib/authGuard';

// Mock next-auth
vi.mock('next-auth', () => ({
    getServerSession: vi.fn(),
}));

// Mock next/server
vi.mock('next/server', () => ({
    NextResponse: {
        json: vi.fn((body, opts) => ({ body, status: opts?.status || 200 })),
    },
}));

// Mock rbac
vi.mock('@/lib/rbac.js', () => ({
    hasPermission: vi.fn(),
}));

import { getServerSession } from 'next-auth';
import { hasPermission } from '@/lib/rbac.js';

describe('authGuard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('requireRole', () => {
        it('should return 401 when no session', async () => {
            getServerSession.mockResolvedValue(null);
            const handler = vi.fn();
            const guarded = requireRole('MGR', handler);

            const result = await guarded({}, {});

            expect(result.status).toBe(401);
            expect(handler).not.toHaveBeenCalled();
        });

        it('should return 401 when session has no role', async () => {
            getServerSession.mockResolvedValue({ user: {} });
            const handler = vi.fn();
            const guarded = requireRole('MGR', handler);

            const result = await guarded({}, {});

            expect(result.status).toBe(401);
        });

        it('should return 403 when role insufficient', async () => {
            getServerSession.mockResolvedValue({ user: { role: 'STF' } });
            hasPermission.mockReturnValue(false);
            const handler = vi.fn();
            const guarded = requireRole('MGR', handler);

            const result = await guarded({}, {});

            expect(result.status).toBe(403);
            expect(handler).not.toHaveBeenCalled();
        });

        it('should call handler when role is sufficient', async () => {
            const session = { user: { role: 'DEV' } };
            getServerSession.mockResolvedValue(session);
            hasPermission.mockReturnValue(true);
            const handler = vi.fn().mockResolvedValue({ data: 'ok' });
            const guarded = requireRole('MGR', handler);

            const result = await guarded('req', 'ctx');

            expect(handler).toHaveBeenCalledWith('req', session, 'ctx');
            expect(result).toEqual({ data: 'ok' });
        });
    });

    describe('getSessionRole', () => {
        it('should return role when authenticated', async () => {
            getServerSession.mockResolvedValue({ user: { role: 'MGR' } });
            expect(await getSessionRole()).toBe('MGR');
        });

        it('should return null when not authenticated', async () => {
            getServerSession.mockResolvedValue(null);
            expect(await getSessionRole()).toBeNull();
        });

        it('should return null when no role in session', async () => {
            getServerSession.mockResolvedValue({ user: {} });
            expect(await getSessionRole()).toBeNull();
        });
    });
});
