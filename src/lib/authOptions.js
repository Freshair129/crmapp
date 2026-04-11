/**
 * authOptions — shared NextAuth configuration
 *
 * Separated from [...nextauth]/route.js so both the route handler
 * and getSession() helper can import it without circular dependencies.
 * Standard pattern for next-auth v4 + Next.js 14 App Router.
 */
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getPrisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { cache as redis } from "@/lib/redis";
import { VALID_ROLES, isValidRole } from "@/lib/rbac";
import { logAction } from '@/lib/repositories/auditRepo';

export const authOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "text" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                // ─── Rate Limiting ───────────────────────────────────────────
                const rateLimitKey = `ratelimit:auth:${credentials.email}`;
                const attempts = await redis.incr(rateLimitKey);
                if (attempts === 1) await redis.expire(rateLimitKey, 60); // 1 minute window

                if (attempts > 5) {
                    logger.warn('NEXTAUTH', 'Rate limit exceeded', { email: credentials.email });
                    throw new Error("Too many attempts. Please try again in a minute.");
                }

                try {
                    console.error('[AUTH_DEBUG] Step 1: Getting prisma client');
                    const prisma = await getPrisma();
                    console.error('[AUTH_DEBUG] Step 2: Querying employee by email:', credentials.email);
                    // Support login by email OR by employeeId (e.g. TVS-EMP-MKT-001)
                    let employee = await prisma.employee.findUnique({
                        where: { email: credentials.email }
                    });
                    console.error('[AUTH_DEBUG] Step 3: findUnique result:', employee ? `Found: id=${employee.id}, status=${employee.status}, role=${employee.role}` : 'NOT FOUND');
                    if (!employee) {
                        employee = await prisma.employee.findUnique({
                            where: { employeeId: credentials.email }
                        });
                        console.error('[AUTH_DEBUG] Step 3b: findUnique by employeeId:', employee ? `Found` : 'NOT FOUND');
                    }

                    if (!employee || employee.status !== "ACTIVE") {
                        console.error('[AUTH_DEBUG] FAIL: not found or inactive. employee=', JSON.stringify(employee ? {id: employee.id, status: employee.status} : null));
                        logger.warn('NEXTAUTH', 'Auth failed: User not found or inactive', { email: credentials.email });
                        logAction({
                            actorEmail: credentials.email,
                            action:     'LOGIN_FAILED',
                            note:       'User not found or inactive',
                        }).catch(() => {});
                        return null;
                    }

                    // Validate role is in VALID_ROLES (Phase 29 — ADR-045)
                    console.error('[AUTH_DEBUG] Step 4: checking role:', employee.role, 'isValid:', isValidRole(employee.role));
                    if (!isValidRole(employee.role)) {
                        console.error('[AUTH_DEBUG] FAIL: invalid role:', employee.role);
                        logger.warn('NEXTAUTH', 'Auth failed: Invalid role', { email: credentials.email, role: employee.role });
                        logAction({
                            actorId:    employee.id,
                            actorEmail: employee.email,
                            action:     'LOGIN_FAILED',
                            note:       `Invalid role: ${employee.role}`,
                        }).catch(() => {});
                        return null;
                    }

                    console.error('[AUTH_DEBUG] Step 5: comparing password, hash starts with:', employee.passwordHash?.substring(0, 7));
                    const isValid = await bcrypt.compare(credentials.password, employee.passwordHash);
                    console.error('[AUTH_DEBUG] Step 6: bcrypt result:', isValid);

                    if (!isValid) {
                        console.error('[AUTH_DEBUG] FAIL: password mismatch');
                        logger.warn('NEXTAUTH', 'Auth failed: Invalid password', { email: credentials.email });
                        logAction({
                            actorId:    employee.id,
                            actorEmail: employee.email,
                            action:     'LOGIN_FAILED',
                            note:       'Invalid password',
                        }).catch(() => {});
                        return null;
                    }

                    // Success — reset rate limit
                    await redis.del(rateLimitKey).catch(() => {});

                    // ─── Login Audit Log + lastLoginAt ───────────────────────
                    const now = new Date();
                    await Promise.all([
                        logAction({
                            actorId:    employee.id,
                            actorEmail: employee.email,
                            action:     'LOGIN_SUCCESS',
                            entity:     'Employee',
                            entityId:   employee.id,
                            after:      { role: employee.role, roles: employee.roles },
                        }),
                        prisma.employee.update({
                            where: { id: employee.id },
                            data:  { lastLoginAt: now },
                        }),
                    ]).catch(err => {
                        // Non-blocking — login still succeeds even if audit write fails
                        logger.error('NEXTAUTH', 'Audit log write failed', err);
                    });

                    // Normalise roles array — fallback to [role] if roles[] is empty/missing
                    const rolesArr = (employee.roles && employee.roles.length > 0)
                        ? employee.roles
                        : [employee.role];

                    return {
                        id: employee.id,
                        employeeId: employee.employeeId,
                        name: `${employee.firstName} ${employee.lastName}`,
                        firstName: employee.firstName,
                        lastName: employee.lastName,
                        nickName: employee.nickName,
                        email: employee.email,
                        role: employee.role,   // primary role (backward compat)
                        roles: rolesArr,       // full multi-role array
                        lastLoginAt: now.toISOString(),
                    };
                } catch (error) {
                    logger.error('NEXTAUTH', 'Authorize error', error);
                    throw error;
                }
            }
        })
    ],

    secret: process.env.NEXTAUTH_SECRET,

    // ─── Session lifetime ────────────────────────────────────────────────────
    // maxAge: session expires after 8 hours (one workday). Users must re-login.
    // updateAge: refresh the session cookie at most every 1 hour (reduces writes).
    session: {
        strategy: 'jwt',
        maxAge:    8 * 60 * 60,  // 8 hours
        updateAge: 60 * 60,       // re-issue cookie every 1 hour
    },

    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                // ── First login: seed token from authorize() return value ──
                token.role        = user.role;
                token.roles       = user.roles;
                token.employeeId  = user.employeeId;
                token.firstName   = user.firstName;
                token.lastName    = user.lastName;
                token.nickName    = user.nickName;
                token.lastLoginAt = user.lastLoginAt;
                token.refreshedAt = Date.now();
                token.error       = null; // clear any previous error
            } else {
                // ── Subsequent requests: refresh from DB every 5 minutes ──
                // Detects role/permission changes and account deactivation.
                const REFRESH_MS = 5 * 60 * 1000; // 5 minutes
                const stale = !token.refreshedAt || (Date.now() - token.refreshedAt) > REFRESH_MS;
                if (stale) {
                    try {
                        const prisma = await getPrisma();
                        const emp = await prisma.employee.findUnique({
                            where: { id: token.sub },
                            select: {
                                role: true, roles: true,
                                firstName: true, lastName: true, nickName: true,
                                employeeId: true, status: true,
                            },
                        });

                        if (!emp || emp.status !== 'ACTIVE') {
                            // Account disabled or deleted — force sign-out immediately
                            logger.warn('NEXTAUTH', 'Session invalidated: account inactive', { sub: token.sub });
                            token.error = 'AccountDisabled';
                        } else if (!isValidRole(emp.role)) {
                            // Role became invalid — force re-login to pick up correct role
                            token.error = 'InvalidRole';
                        } else {
                            // Check if role or roles array changed since JWT was issued
                            const newRoles = (emp.roles && emp.roles.length > 0) ? emp.roles : [emp.role];
                            const roleChanged  = token.role !== emp.role;
                            const rolesChanged = JSON.stringify([...(token.roles || [])].sort()) !==
                                                 JSON.stringify([...newRoles].sort());

                            if (roleChanged || rolesChanged) {
                                // Permissions changed — force re-login so new permissions take effect
                                logger.info('NEXTAUTH', 'Permissions changed — forcing re-login', {
                                    sub:      token.sub,
                                    oldRole:  token.role,
                                    newRole:  emp.role,
                                });
                                token.error = 'PermissionsChanged';
                            } else {
                                // No change — refresh profile data normally
                                token.role       = emp.role;
                                token.roles      = newRoles;
                                token.firstName  = emp.firstName;
                                token.lastName   = emp.lastName;
                                token.nickName   = emp.nickName;
                                token.employeeId = emp.employeeId;
                                token.error      = null;
                            }
                        }

                        token.refreshedAt = Date.now();
                    } catch (err) {
                        logger.error('NEXTAUTH', 'JWT refresh from DB failed', err);
                        // Do NOT update refreshedAt on error → retry on next request
                    }
                }
            }
            return token;
        },

        async session({ session, token }) {
            if (session.user) {
                const primaryRole = token.role ? String(token.role).toUpperCase() : undefined;
                session.user.role        = primaryRole;
                session.user.roles       = Array.isArray(token.roles)
                    ? token.roles.map(r => String(r).toUpperCase())
                    : (primaryRole ? [primaryRole] : []);
                session.user.employeeId  = token.employeeId;
                session.user.firstName   = token.firstName;
                session.user.lastName    = token.lastName;
                session.user.nickName    = token.nickName;
                session.user.lastLoginAt = token.lastLoginAt;
            }
            // Expose error to client so the app can react (force sign-out)
            session.error = token.error || null;
            return session;
        }
    },

    pages: {
        signIn: "/auth/signin",
        error: "/auth/signin",
    }
};
