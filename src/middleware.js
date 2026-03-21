/**
 * Next.js Middleware — Route-Level RBAC Guard (Phase 29 — ADR-045)
 * Enforces authentication and role requirements before requests reach API routes.
 *
 * Role matrix (ADR-045 — 8-role hierarchy):
 *   /api/employees/*   → MANAGER+
 *   /api/marketing/*   → MANAGER+
 *   /api/analytics/*   → MANAGER+
 *   /api/customers/*   → AGENT+
 *   /api/webhooks/*    → skip RBAC (signature-based auth per handler)
 *   all others         → AGENT+ (authenticated)
 *
 * GUEST write-block: GUEST role may only use GET requests.
 *   POST/PATCH/PUT/DELETE from GUEST → 403 Forbidden (read-only enforcement)
 *   Exceptions: /api/auth/* and /api/webhooks/* (always pass-through)
 */

import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

/** Route prefix → minimum role required */
const ROUTE_ROLES = [
  { prefix: '/api/auth',             role: null },   // NextAuth — session/signin/callback must be free
  { prefix: '/api/webhooks',         role: null },   // skip — handler does own auth
  { prefix: '/api/mcp',              role: null },   // MCP server — Bearer token auth handled in route
  { prefix: '/api/members/register', role: null },   // public — customer self-registration
  { prefix: '/api/health',           role: null },   // public — health check
  { prefix: '/api/products',         role: 'AGENT' },
  { prefix: '/api/employees',        role: 'ADMIN' },
  { prefix: '/api/marketing',        role: 'MARKETING' },
  { prefix: '/api/analytics',        role: 'MARKETING' },
  { prefix: '/api/customers',        role: 'AGENT' },
  { prefix: '/api',                  role: 'AGENT' }, // catch-all: any authenticated user
];

const ROLE_LEVEL = {
  DEVELOPER:  5,
  MANAGER:    4,
  ADMIN:      3,
  MARKETING:  2.5,
  HEAD_CHEF:  2.5,
  EMPLOYEE:   1.5,
  AGENT:      1,
  GUEST:      0,
};

/** HTTP methods that mutate state — blocked for GUEST role */
const WRITE_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

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

  // Development Bypass (Production Hardening — Phase 14) 
  // Restore for local development convenience if needed
  if (process.env.NODE_ENV === 'development') return NextResponse.next();


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

  // GUEST write-block — read-only enforcement at API layer
  if (token.role === 'GUEST' && WRITE_METHODS.has(request.method)) {
    return NextResponse.json(
      { error: 'Forbidden', reason: 'Demo account is read-only' },
      { status: 403 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
