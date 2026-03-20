'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { AlertCircle, Mail, Lock, Loader2, LogIn, Eye, EyeOff } from 'lucide-react';

export default function LoginPage({ onLogin, error: externalError }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(externalError || '');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const result = await signIn('credentials', {
                email,
                password,
                redirect: false,
                // next-auth ใช้ maxAge จาก session config — remember me ยืด session เป็น 30 วัน
                ...(rememberMe && { callbackUrl: '/' }),
            });

            if (result?.error) {
                setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
                if (onLogin) onLogin(null);
            } else if (result?.ok) {
                // Force page reload to get fresh session immediately
                window.location.href = '/';
            }
        } catch (err) {
            console.error('Login error:', err);
            setError('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
            if (onLogin) onLogin(null);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0A1A2F] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#C9A34E]/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl"></div>
            </div>

            <div className="relative z-10 w-full max-w-md">
                {/* Logo & Header */}
                <div className="text-center mb-10">
                    <div className="w-20 h-20 bg-[#C9A34E] rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-[#C9A34E]/20">
                        <span className="text-[#0A1A2F] font-black text-3xl">V</span>
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight mb-2">V SCHOOL</h1>
                    <p className="text-white/40 text-sm font-bold uppercase tracking-[0.2em]">Customer 360 CRM</p>
                </div>

                {/* Login Card */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl">
                    <div className="mb-8">
                        <h2 className="text-xl font-black text-white mb-2">Welcome Back</h2>
                        <p className="text-white/40 text-sm">เข้าสู่ระบบเพื่อใช้งาน Dashboard</p>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-6">
                            <p className="text-red-400 text-sm font-bold flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                {error}
                            </p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email / Employee ID */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Email / Employee ID</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Mail className="w-5 h-5 text-white/20" />
                                </div>
                                <input
                                    required
                                    type="text"
                                    autoComplete="username"
                                    placeholder="email หรือ TVS-MKT-001"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-5 py-4 text-white font-bold placeholder:text-white/20 outline-none focus:border-[#C9A34E]/50 focus:ring-2 focus:ring-[#C9A34E]/20 transition-all"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Password + Show/Hide */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest px-1">Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="w-5 h-5 text-white/20" />
                                </div>
                                <input
                                    required
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-14 py-4 text-white font-bold placeholder:text-white/20 outline-none focus:border-[#C9A34E]/50 focus:ring-2 focus:ring-[#C9A34E]/20 transition-all"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(v => !v)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/30 hover:text-white/60 transition-colors"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Remember Me */}
                        <div className="flex items-center gap-3 px-1">
                            <button
                                type="button"
                                onClick={() => setRememberMe(v => !v)}
                                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                                    rememberMe
                                        ? 'bg-[#C9A34E] border-[#C9A34E]'
                                        : 'bg-transparent border-white/20 hover:border-white/40'
                                }`}
                            >
                                {rememberMe && (
                                    <svg className="w-3 h-3 text-[#0A1A2F]" fill="none" viewBox="0 0 12 12">
                                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                )}
                            </button>
                            <span className="text-white/40 text-sm font-bold select-none cursor-pointer" onClick={() => setRememberMe(v => !v)}>
                                จดจำการเข้าสู่ระบบ
                            </span>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-[#C9A34E] text-[#0A1A2F] py-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-[#C9A34E]/20 hover:scale-[1.02] transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    กำลังเข้าสู่ระบบ...
                                </>
                            ) : (
                                <>
                                    <LogIn className="w-4 h-4" />
                                    เข้าสู่ระบบ
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-white/5 text-center">
                        <p className="text-white/20 text-[10px] font-bold uppercase tracking-widest">บัญชีผู้ใช้</p>
                        <p className="text-white/40 text-xs mt-2">suanranger129@gmail.com</p>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-white/20 text-[10px] font-bold uppercase tracking-widest mt-8">
                    © 2026 V School • Powered by Data Hub
                </p>
            </div>
        </div>
    );
}
