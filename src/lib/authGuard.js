/**
 * Auth Guard — Route Handler Wrapper (Phase 7 — ADR-026 D3)
 * Per-route RBAC enforcement for Next.js App Router handlers.
 *
 * Usage:
 *   export const GET = requireRole('MANAGER', async (req, session) => {
 *     return NextResponse.json({ employees: await getAll() })
 *   })
 */

import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { hasPermission } from './rbac.js';

/**
 * Wraps a Next.js App Router handler with role enforcement.
 *
 * @param {string}   minRole  - Minimum role required (e.g. 'MANAGER')
 * @param {Function} handler  - async (req, session) => NextResponse
 * @returns {Function}        - wrapped handler ready for export
 */
function requireRole(minRole, handler) {
  return async function guardedHandler(req, ctx) {
    const session = await getServerSession();

    if (!session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session.user.role, minRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return handler(req, session, ctx);
  };
}

/**
 * Returns the current session role, or null if unauthenticated.
 * @returns {Promise<string|null>}
 */
async function getSessionRole() {
  const session = await getServerSession();
  return session?.user?.role ?? null;
}

export { requireRole, getSessionRole };
