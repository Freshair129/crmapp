import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import FacebookProvider from "next-auth/providers/facebook";
import bcrypt from "bcryptjs";
import { getPrisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const handler = NextAuth({
    providers: [
        // ─── FR1.1: Facebook Meta Login ──────────────────────────────────────
        FacebookProvider({
            clientId: process.env.FACEBOOK_APP_ID,
            clientSecret: process.env.FACEBOOK_APP_SECRET,
            authorization: { params: { scope: "email" } },
        }),

        // ─── Email + Password (existing) ─────────────────────────────────────
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

                    return {
                        id: employee.id,
                        employeeId: employee.employeeId,
                        name: `${employee.firstName} ${employee.lastName}`,
                        email: employee.email,
                        role: employee.role,
                    };
                } catch (error) {
                    logger.error('NEXTAUTH', 'Authorize error', error);
                    return null;
                }
            }
        })
    ],

    secret: process.env.NEXTAUTH_SECRET,

    callbacks: {
        // ─── FR1.1 + FR1.2: ตรวจสอบ Facebook user → ต้องมีใน Employee registry ─
        async signIn({ account, profile }) {
            if (account?.provider === "facebook") {
                try {
                    const prisma = await getPrisma();

                    // หา Employee จาก facebookSub ก่อน (เคย link แล้ว)
                    let employee = await prisma.employee.findUnique({
                        where: { facebookSub: profile.id }
                    });

                    // ถ้ายังไม่ link → ลอง match ด้วย email (auto-link ครั้งแรก)
                    if (!employee && profile.email) {
                        employee = await prisma.employee.findUnique({
                            where: { email: profile.email }
                        });

                        if (employee) {
                            // Auto-link: บันทึก facebookSub ลง Employee
                            await prisma.employee.update({
                                where: { id: employee.id },
                                data: { facebookSub: profile.id }
                            });
                            logger.info('NEXTAUTH', 'Facebook auto-linked to employee', {
                                employeeId: employee.employeeId,
                                facebookSub: profile.id,
                            });
                        }
                    }

                    // FR1.2: ถ้าไม่พบใน registry → ปฏิเสธ
                    if (!employee || employee.status !== "ACTIVE") {
                        logger.warn('NEXTAUTH', 'Facebook login rejected — not in registry', {
                            facebookSub: profile.id,
                            email: profile.email,
                        });
                        return "/auth/signin?error=NotRegistered";
                    }

                    return true;
                } catch (error) {
                    logger.error('NEXTAUTH', 'Facebook signIn callback error', error);
                    return false;
                }
            }

            return true; // Credentials provider — ผ่านแล้วจาก authorize()
        },

        // ─── JWT: แนบ role + employeeId ลงใน token ──────────────────────────
        async jwt({ token, user, account, profile }) {
            // Credentials login: user มี role + employeeId จาก authorize()
            if (user && account?.provider === "credentials") {
                token.role = user.role;
                token.employeeId = user.employeeId;
            }

            // Facebook login: ดึง Employee จาก DB แล้วแนบ role + employeeId
            if (account?.provider === "facebook" && profile?.id) {
                try {
                    const prisma = await getPrisma();
                    const employee = await prisma.employee.findFirst({
                        where: {
                            OR: [
                                { facebookSub: profile.id },
                                { email: profile.email || "" }
                            ]
                        }
                    });

                    if (employee) {
                        token.role = employee.role;
                        token.employeeId = employee.employeeId;
                        token.name = `${employee.firstName} ${employee.lastName}`;
                        token.email = employee.email;
                    }
                } catch (error) {
                    logger.error('NEXTAUTH', 'JWT Facebook lookup error', error);
                }
            }

            return token;
        },

        async session({ session, token }) {
            if (session.user) {
                session.user.role = token.role;
                session.user.employeeId = token.employeeId;
            }
            return session;
        }
    },

    pages: {
        signIn: "/auth/signin",
        error: "/auth/signin",
    }
});

export { handler as GET, handler as POST };
