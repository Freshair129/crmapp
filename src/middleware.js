/**
 * Next.js Middleware — Route-Level RBAC Guard (Phase 7 — ADR-026)
 * Enforces authentication and role requirements before requests reach API routes.
 *
 * Role matrix (ADR-026 D4):
 *   /api/employees/*   → MANAGER+
 *   /api/marketing/*   → SUPERVISOR+
 *   /api/analytics/*   → SUPERVISOR+
 *   /api/customers/*   → AGENT+
 *   /api/webhooks/*    → skip RBAC (signature-based auth per handler)
 *   all others         → AGENT+ (authenticated)
 */

import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

/** Route prefix → minimum role required */
const ROUTE_ROLES = [
  { prefix: '/api/auth',             role: null },   // NextAuth — session/signin/callback must be free
  { prefix: '/api/webhooks',         role: null },   // skip — handler does own auth
  { prefix: '/api/members/register', role: null },   // public — customer self-registration
  { prefix: '/api/products',         role: 'AGENT' },
  { prefix: '/api/employees',        role: 'MANAGER' },
  { prefix: '/api/marketing',        role: 'SUPERVISOR' },
  { prefix: '/api/analytics',        role: 'SUPERVISOR' },
  { prefix: '/api/customers',        role: 'AGENT' },
  { prefix: '/api',                  role: 'AGENT' }, // catch-all: any authenticated user
];

const ROLE_LEVEL = {
  DEVELOPER:  5,
  MANAGER:    4,
  SUPERVISOR: 3,
  ADMIN:      4, // school owner/director — same access as MANAGER
  AGENT:      1,
  GUEST:      0,
};

function hasPermission(userRole, requiredRole) {
  return (ROLE_LEVEL[userRole] ?? 0) >= (ROLE_LEVEL[requiredRole] ?? 0);
}

/** Sync routes that can be called by cron/script using CRON_SECRET header */
const CRON_ROUTES = [
  '/api/marketing/sync-hourly',
  '/api/marketing/sync',
];

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // CRON_SECRET bypass — allows internal scripts/schedulers to call sync routes
  // without a user session. Header: x-cron-secret: <CRON_SECRET>
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && CRON_ROUTES.some(r => pathname.startsWith(r))) {
    const incoming = request.headers.get('x-cron-secret');
    if (incoming === cronSecret) return NextResponse.next();
  }

  // Find matching rule (first match wins)
  const rule = ROUTE_ROLES.find((r) => pathname.startsWith(r.prefix));

  // No rule or null role → pass through (webhooks, public pages)
  if (!rule || rule.role === null) return NextResponse.next();

  // Read JWT from cookie (set by NextAuth)
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasPermission(token.role, rule.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
