import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getPrisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const handler = NextAuth({
    providers: [
        // ─── Email + Password ─────────────────────────────────────────────────
        // การเข้าระบบทำโดย Manager/Dev สร้าง account ให้ employee เท่านั้น
        // ไม่มี self-signup, ไม่มี OAuth (FB Login ถูกตัดออก — ไม่สามารถ attribute admin reply ได้)
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
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role;
                token.employeeId = user.employeeId;
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
