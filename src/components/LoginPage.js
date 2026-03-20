'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';

/* ── Decorative lightning bolt SVG ── */
function Bolt({ size = 28, color = '#1a1a1a', style = {} }) {
    return (
        <svg width={size} height={size * 1.8} viewBox="0 0 20 36" fill="none" style={style}>
            <path d="M12 1L2 20h7L6 35l12-19h-7L12 1z" fill={color} />
        </svg>
    );
}

export default function LoginPage({ onLogin, error: externalError }) {
    const [email, setEmail]       = useState('');
    const [password, setPassword] = useState('');
    const [error, setError]       = useState(externalError || '');
    const [isLoading, setIsLoading]       = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe]     = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            const result = await signIn('credentials', {
                email,
                password,
                redirect: false,
                ...(rememberMe && { callbackUrl: '/' }),
            });
            if (result?.error) {
                setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
                if (onLogin) onLogin(null);
            } else if (result?.ok) {
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
        <div className="min-h-screen flex overflow-hidden">

            {/* ══════════════════════════════════════════
                LEFT PANEL — overhead food photo
            ══════════════════════════════════════════ */}
            <div className="hidden lg:block w-[45%] relative overflow-hidden flex-shrink-0">

                {/* Full-bleed overhead food photo */}
                <img
                    src="https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=900&h=1200&fit=crop&q=85"
                    alt="Japanese food overhead"
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentNode.style.background = '#1a1a1a';
                    }}
                />

                {/* Warm dark overlay — bottom fade for logo legibility */}
                <div className="absolute inset-0"
                     style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.0) 40%, rgba(0,0,0,0.55) 100%)' }} />

                {/* Subtle warm tint overlay */}
                <div className="absolute inset-0"
                     style={{ background: 'rgba(197,140,40,0.10)', mixBlendMode: 'multiply' }} />

                {/* V School logo — bottom left */}
                <div className="absolute bottom-8 left-8 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                         style={{ background: '#C9A34E' }}>
                        <span style={{ color: '#0A1A2F', fontWeight: 900, fontSize: 18 }}>V</span>
                    </div>
                    <div>
                        <p style={{ color: 'white', fontWeight: 900, fontSize: 13, letterSpacing: '0.1em' }}>V SCHOOL</p>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Japanese Culinary Arts · Bangkok</p>
                    </div>
                </div>

                {/* Curved right edge */}
                <div
                    className="absolute right-0 top-0 bottom-0 w-16"
                    style={{
                        background: '#FAF7F2',
                        borderRadius: '80% 0 0 80% / 50%',
                    }}
                />
            </div>

            {/* ══════════════════════════════════════════
                RIGHT PANEL — cream + form
            ══════════════════════════════════════════ */}
            <div
                className="flex-1 flex items-center justify-center p-8 relative overflow-hidden"
                style={{ background: '#FAF7F2' }}
            >
                {/* Decorative bolts */}
                <Bolt size={26} color="#1a1a1a" style={{ position: 'absolute', top: 28, right: 320, opacity: 0.5, transform: 'rotate(5deg)' }} />
                <Bolt size={20} color='#C9A34E' style={{ position: 'absolute', bottom: 120, right: 48, opacity: 0.6, transform: 'rotate(-15deg)' }} />
                <Bolt size={18} color="#1a1a1a" style={{ position: 'absolute', bottom: 40, left: 40, opacity: 0.35, transform: 'rotate(8deg)' }} />

                {/* Faded corner ingredient images */}
                <div className="absolute top-0 right-0 w-44 h-44 rounded-full overflow-hidden opacity-[0.08] pointer-events-none"
                     style={{ transform: 'translate(30%, -30%)' }}>
                    <img src="https://images.unsplash.com/photo-1518779578993-ec3579fee39f?w=200&h=200&fit=crop" className="w-full h-full object-cover" alt="" />
                </div>
                <div className="absolute bottom-0 right-0 w-36 h-36 rounded-full overflow-hidden opacity-[0.07] pointer-events-none"
                     style={{ transform: 'translate(20%, 20%)' }}>
                    <img src="https://images.unsplash.com/photo-1526470608268-f674ce90ebd4?w=200&h=200&fit=crop" className="w-full h-full object-cover" alt="" />
                </div>

                {/* ── Form area ── */}
                <div className="w-full max-w-sm relative z-10">

                    {/* Heading */}
                    <h1 className="font-black text-[#1a1a1a] mb-8"
                        style={{ fontSize: 28, lineHeight: 1.2, letterSpacing: '-0.02em' }}>
                        ยินดีต้อนรับกลับ!
                    </h1>

                    {/* Error */}
                    {error && (
                        <div className="rounded-2xl p-3 mb-5 flex items-center gap-2"
                             style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                            <AlertCircle size={14} color="#ef4444" />
                            <p style={{ color: '#ef4444', fontSize: 12, fontWeight: 700 }}>{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">

                        {/* Email field */}
                        <input
                            required
                            type="text"
                            autoComplete="username"
                            placeholder="Email / Employee ID"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full rounded-2xl px-5 py-4 outline-none transition-all font-medium"
                            style={{
                                background: '#EDE9E0',
                                border: '2px solid transparent',
                                color: '#1a1a1a',
                                fontSize: 14,
                            }}
                            onFocus={e => e.target.style.borderColor = '#C9A34E'}
                            onBlur={e => e.target.style.borderColor = 'transparent'}
                        />

                        {/* Password field */}
                        <div className="relative">
                            <input
                                required
                                type={showPassword ? 'text' : 'password'}
                                placeholder="รหัสผ่าน"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full rounded-2xl px-5 py-4 pr-12 outline-none transition-all font-medium"
                                style={{
                                    background: '#EDE9E0',
                                    border: '2px solid transparent',
                                    color: '#1a1a1a',
                                    fontSize: 14,
                                }}
                                onFocus={e => e.target.style.borderColor = '#C9A34E'}
                                onBlur={e => e.target.style.borderColor = 'transparent'}
                            />
                            <button
                                type="button"
                                tabIndex={-1}
                                onClick={() => setShowPassword(v => !v)}
                                className="absolute inset-y-0 right-4 flex items-center"
                                style={{ color: 'rgba(0,0,0,0.3)' }}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>

                        {/* Forgot password */}
                        <div className="text-right">
                            <span className="text-sm font-bold cursor-pointer hover:underline"
                                  style={{ color: '#C9A34E' }}>
                                ลืมรหัสผ่าน?
                            </span>
                        </div>

                        {/* Submit button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                            style={{
                                background: '#C9A34E',
                                color: '#0A1A2F',
                                padding: '16px',
                                fontSize: 14,
                                letterSpacing: '0.05em',
                                boxShadow: '0 8px 24px rgba(201,163,78,0.35)',
                            }}
                        >
                            {isLoading ? (
                                <><Loader2 size={16} className="animate-spin" /> กำลังเข้าสู่ระบบ...</>
                            ) : (
                                'เข้าสู่ระบบ'
                            )}
                        </button>
                    </form>

                    {/* OR divider */}
                    <div className="flex items-center gap-4 my-6">
                        <div className="flex-1 h-px" style={{ background: 'rgba(201,163,78,0.3)' }} />
                        <span style={{ color: '#999', fontSize: 13, fontWeight: 600 }}>หรือ</span>
                        <div className="flex-1 h-px" style={{ background: 'rgba(201,163,78,0.3)' }} />
                    </div>

                    {/* Remember me row */}
                    <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <button
                                type="button"
                                onClick={() => setRememberMe(v => !v)}
                                className="w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0"
                                style={{
                                    background: rememberMe ? '#C9A34E' : 'transparent',
                                    borderColor: rememberMe ? '#C9A34E' : 'rgba(0,0,0,0.2)',
                                }}
                            >
                                {rememberMe && (
                                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                        <path d="M1 4l3 3 5-6" stroke="#0A1A2F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                )}
                            </button>
                            <span style={{ color: 'rgba(0,0,0,0.45)', fontSize: 13, fontWeight: 600 }}
                                  onClick={() => setRememberMe(v => !v)}>
                                จดจำการเข้าสู่ระบบ
                            </span>
                        </label>
                    </div>

                    {/* Footer */}
                    <p className="text-center mt-10"
                       style={{ color: 'rgba(0,0,0,0.2)', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                        © 2026 V School · Powered by Data Hub
                    </p>
                </div>
            </div>
        </div>
    );
}
