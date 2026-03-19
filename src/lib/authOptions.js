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
                    const employee = await prisma.employee.findUnique({
                        where: { email: credentials.email }
                    });

                    if (!employee || employee.status !== "ACTIVE") {
                        logger.warn('NEXTAUTH', 'Auth failed: User not found or inactive', { email: credentials.email });
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
                    await Promise.all([
                        prisma.auditLog.create({
                            data: {
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
