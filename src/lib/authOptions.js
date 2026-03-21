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

/**
 * generateLogId — LOG-YYYYMMDD-SERIAL
 * Serial = last 4 digits of ms timestamp (unique enough per day within a single process)
 */
async function generateLogId(prisma) {
    const today = new Date();
    const datePart = today.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    const prefix = `LOG-${datePart}-`;
    const last = await prisma.auditLog.findFirst({
        where: { logId: { startsWith: prefix } },
        orderBy: { logId: 'desc' },
        select: { logId: true },
    });
    const serial = last
        ? String(parseInt(last.logId.split('-')[2], 10) + 1).padStart(4, '0')
        : '0001';
    return `${prefix}${serial}`;
}

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
                    const prisma = await getPrisma();
                    // Support login by email OR by employeeId (e.g. TVS-MKT-001)
                    let employee = await prisma.employee.findUnique({
                        where: { email: credentials.email }
                    });
                    if (!employee) {
                        employee = await prisma.employee.findUnique({
                            where: { employeeId: credentials.email }
                        });
                    }

                    if (!employee || employee.status !== "ACTIVE") {
                        logger.warn('NEXTAUTH', 'Auth failed: User not found or inactive', { email: credentials.email });
                        return null;
                    }

                    // Validate role is in VALID_ROLES (Phase 29 — ADR-045)
                    if (!isValidRole(employee.role)) {
                        logger.warn('NEXTAUTH', 'Auth failed: Invalid role', { email: credentials.email, role: employee.role });
                        return null;
                    }

                    const isValid = await bcrypt.compare(credentials.password, employee.passwordHash);

                    if (!isValid) {
                        logger.warn('NEXTAUTH', 'Auth failed: Invalid password', { email: credentials.email });
                        return null;
                    }

                    // Success — reset rate limit
                    await redis.del(rateLimitKey).catch(() => {});

                    // ─── Login Audit Log + lastLoginAt ───────────────────────
                    const now = new Date();
                    const logId = await generateLogId(prisma).catch(() => `LOG-${Date.now()}`);
                    await Promise.all([
                        prisma.auditLog.create({
                            data: {
                                logId,
                                action: 'LOGIN',
                                actor: employee.employeeId,
                                target: employee.email,
                                status: 'SUCCESS',
                                details: {
                                    role: employee.role,
                                    firstName: employee.firstName,
                                    lastName: employee.lastName,
                                    loginAt: now.toISOString(),
                                },
                            },
                        }),
                        prisma.employee.update({
                            where: { id: employee.id },
                            data: { lastLoginAt: now },
                        }),
                    ]).catch(err => {
                        // Non-blocking — login still succeeds even if audit write fails
                        logger.error('NEXTAUTH', 'Audit log write failed', err);
                    });

                    return {
                        id: employee.id,
                        employeeId: employee.employeeId,
                        name: `${employee.firstName} ${employee.lastName}`,
                        firstName: employee.firstName,
                        lastName: employee.lastName,
                        nickName: employee.nickName,
                        email: employee.email,
                        role: employee.role,
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

    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role        = user.role;
                token.employeeId  = user.employeeId;
                token.firstName   = user.firstName;
                token.lastName    = user.lastName;
                token.nickName    = user.nickName;
                token.lastLoginAt = user.lastLoginAt;
            }
            return token;
        },

        async session({ session, token }) {
            if (session.user) {
                session.user.role        = token.role;
                session.user.employeeId  = token.employeeId;
                session.user.firstName   = token.firstName;
                session.user.lastName    = token.lastName;
                session.user.nickName    = token.nickName;
                session.user.lastLoginAt = token.lastLoginAt;
            }
            return session;
        }
    },

    pages: {
        signIn: "/auth/signin",
        error: "/auth/signin",
    }
};
