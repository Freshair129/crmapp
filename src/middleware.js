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
  { prefix: '/api/webhooks',         role: null },   // skip — handler does own auth
  { prefix: '/api/members/register', role: null },   // public — customer self-registration
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
  ADMIN:      2,
  AGENT:      1,
  GUEST:      0,
};

function hasPermission(userRole, requiredRole) {
  return (ROLE_LEVEL[userRole] ?? 0) >= (ROLE_LEVEL[requiredRole] ?? 0);
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

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
