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
  { prefix: '/api/workers',          role: null },   // QStash workers — verify signature in route
  { prefix: '/api/notion',           role: 'MGR' },  // Notion sync — MGR+ only
  { prefix: '/api/products',         role: 'AGT' },
  { prefix: '/api/employees',        role: 'ADM' },
  { prefix: '/api/audit',            role: 'ADM' },  // audit log — ADM+ only
  { prefix: '/api/marketing',        role: 'MKT' },
  { prefix: '/api/analytics',        role: 'MKT' },
  { prefix: '/api/customers',        role: 'AGT' },
  { prefix: '/api',                  role: 'AGT' }, // catch-all: any authenticated user
];

// Phase 36 — 12 new role codes (ADR-045 updated)
const ROLE_LEVEL = {
  DEV: 5,
  MGR: 4,
  TEC: 3.5,
  HR:  3,
  ACC: 3,
  MKT: 2.5,
  PUR: 2.5,
  PD:  2.5,
  ADM: 2,
  SLS: 1.5,
  AGT: 1,
  STF: 0.5,
};

/** HTTP methods that mutate state — blocked for GUEST role */
const WRITE_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

function hasPermission(userRole, requiredRole) {
  return (ROLE_LEVEL[userRole] ?? 0) >= (ROLE_LEVEL[requiredRole] ?? 0);
}

/** Sync routes that can be called by cron/script using CRON_SECRET header */
const CRON_ROUTES = [
  '/api/marketing/sync-hourly',
  '/api/marketing/sync-daily',
  '/api/marketing/sync',
  '/api/marketing/backfill',
];

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Auth bypass — login system removed, all routes public
  return NextResponse.next();


  // CRON_SECRET bypass — x-cron-secret or Authorization: Bearer <secret>
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && CRON_ROUTES.some(r => pathname.startsWith(r))) {
    const byCronHeader = request.headers.get('x-cron-secret') === cronSecret;
    const byBearer     = request.headers.get('authorization') === `Bearer ${cronSecret}`;
    const byQStash     = !!request.headers.get('upstash-signature'); // QStash worker
    if (byCronHeader || byBearer || byQStash) return NextResponse.next();
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

  // STF write-block — read-only enforcement at API layer (replaces old GUEST check)
  if (token.role === 'STF' && WRITE_METHODS.has(request.method)) {
    return NextResponse.json(
      { error: 'Forbidden', reason: 'Staff account is read-only' },
      { status: 403 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
