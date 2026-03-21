"use client";

import { signIn } from "next-auth/react";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function SignInForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl") || "/";

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState(
        searchParams.get("error") === "NotRegistered"
            ? "ไม่พบบัญชีในระบบ กรุณาติดต่อ Admin"
            : ""
    );
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            const result = await signIn("credentials", {
                email,
                password,
                redirect: false,
                callbackUrl,
            });

            if (result?.error) {
                setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
                setIsLoading(false);
            } else {
                window.location.href = callbackUrl;
            }
        } catch (err) {
            setError("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0A1A2F] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#C9A34E]/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-10">
                    <div className="w-20 h-20 bg-[#C9A34E] rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-[#C9A34E]/20">
                        <span className="text-[#0A1A2F] font-black text-3xl">V</span>
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight mb-2">V SCHOOL</h1>
                    <p className="text-white/40 text-sm font-bold uppercase tracking-[0.2em]">Customer 360 CRM</p>
                </div>

                {/* Card */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl">
                    <div className="mb-8">
                        <h2 className="text-xl font-black text-white mb-1">Welcome Back</h2>
                        <p className="text-white/40 text-sm">เข้าสู่ระบบเพื่อใช้งาน Dashboard</p>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-6 flex items-center gap-3">
                            <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-red-400 text-sm font-bold">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email / Employee ID */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">
                                Email / Employee ID
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <svg className="w-5 h-5 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                                <input
                                    id="email"
                                    type="text"
                                    required
                                    autoComplete="username"
                                    placeholder="email หรือ TVS-EMP-MKT-001"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-5 py-4 text-white font-bold placeholder:text-white/20 outline-none focus:border-[#C9A34E]/50 focus:ring-2 focus:ring-[#C9A34E]/20 transition-all"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Password + Show/Hide */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">
                                Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <svg className="w-5 h-5 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    autoComplete={rememberMe ? "current-password" : "off"}
                                    placeholder="••••••••"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-14 py-4 text-white font-bold placeholder:text-white/20 outline-none focus:border-[#C9A34E]/50 focus:ring-2 focus:ring-[#C9A34E]/20 transition-all"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                {/* Toggle show/hide */}
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    tabIndex={-1}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/30 hover:text-white/70 transition-colors"
                                    aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                                >
                                    {showPassword ? (
                                        /* Eye Off */
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                        </svg>
                                    ) : (
                                        /* Eye */
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Remember Me */}
                        <div className="flex items-center gap-3 px-1 pt-1">
                            <button
                                type="button"
                                onClick={() => setRememberMe((v) => !v)}
                                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                                    rememberMe
                                        ? "bg-[#C9A34E] border-[#C9A34E]"
                                        : "bg-transparent border-white/20 hover:border-white/50"
                                }`}
                                aria-label="จดจำการเข้าสู่ระบบ"
                            >
                                {rememberMe && (
                                    <svg className="w-3 h-3 text-[#0A1A2F]" fill="none" viewBox="0 0 12 12">
                                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                )}
                            </button>
                            <span
                                className="text-white/40 text-sm font-bold select-none cursor-pointer hover:text-white/60 transition-colors"
                                onClick={() => setRememberMe((v) => !v)}
                            >
                                จดจำการเข้าสู่ระบบ
                            </span>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-[#C9A34E] text-[#0A1A2F] py-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-[#C9A34E]/20 hover:scale-[1.02] transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    กำลังเข้าสู่ระบบ...
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                    </svg>
                                    เข้าสู่ระบบ
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-white/5 space-y-3">
                        {/* Admin hint */}
                        <div className="text-center">
                            <p className="text-white/20 text-[10px] font-bold uppercase tracking-widest">บัญชีผู้ดูแล</p>
                            <p className="text-white/40 text-xs mt-1">suanranger129@gmail.com</p>
                        </div>
                        {/* Demo account */}
                        <div
                            onClick={() => { setEmail('demo@vschool.co.th'); setPassword('vschool-demo'); }}
                            className="cursor-pointer group bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/15 hover:border-amber-500/30 rounded-2xl p-3 transition-all text-center"
                        >
                            <p className="text-amber-400/60 group-hover:text-amber-400 text-[10px] font-black uppercase tracking-widest transition-colors">
                                🔍 Demo Account (Read Only)
                            </p>
                            <p className="text-white/30 text-[10px] mt-0.5">คลิกเพื่อกรอกข้อมูลอัตโนมัติ</p>
                        </div>
                    </div>
                </div>

                <p className="text-center text-white/20 text-[10px] font-bold uppercase tracking-widest mt-8">
                    © 2026 V School • Powered by Data Hub
                </p>
            </div>
        </div>
    );
}

export default function SignInPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#0A1A2F]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#C9A34E]" />
            </div>
        }>
            <SignInForm />
        </Suspense>
    );
}
