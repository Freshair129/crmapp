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

/* ── Background food illustration (SVG line-art) ── */
function FoodLineArt() {
    return (
        <svg viewBox="0 0 400 500" className="absolute inset-0 w-full h-full" style={{ opacity: 0.18 }} fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Bowl */}
            <ellipse cx="200" cy="280" rx="120" ry="30" stroke="#1a1a1a" strokeWidth="3" />
            <path d="M80 280 Q80 380 200 390 Q320 380 320 280" stroke="#1a1a1a" strokeWidth="3" />
            {/* Noodles / food inside */}
            <path d="M110 295 Q140 275 170 295 Q200 315 230 295 Q260 275 290 295" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" />
            <path d="M115 310 Q145 290 175 310 Q205 330 235 310 Q265 290 285 310" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" />
            {/* Chopsticks */}
            <line x1="180" y1="230" x2="210" y2="270" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round" />
            <line x1="200" y1="225" x2="225" y2="268" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round" />
            {/* Leaf top right */}
            <path d="M310 80 Q360 50 370 110 Q330 130 310 80Z" stroke="#1a1a1a" strokeWidth="2" />
            <path d="M310 80 Q340 90 370 110" stroke="#1a1a1a" strokeWidth="1.5" />
            {/* Small circles / garnish */}
            <circle cx="155" cy="320" r="8" stroke="#1a1a1a" strokeWidth="2" />
            <circle cx="245" cy="315" r="6" stroke="#1a1a1a" strokeWidth="2" />
            <circle cx="200" cy="330" r="5" stroke="#1a1a1a" strokeWidth="2" />
            {/* Leaf bottom left */}
            <path d="M50 380 Q30 340 70 320 Q90 360 50 380Z" stroke="#1a1a1a" strokeWidth="2" />
            <path d="M50 380 Q60 350 70 320" stroke="#1a1a1a" strokeWidth="1.5" />
            {/* Onion rings */}
            <ellipse cx="330" cy="200" rx="30" ry="12" stroke="#1a1a1a" strokeWidth="2" />
            <ellipse cx="330" cy="200" rx="20" ry="8" stroke="#1a1a1a" strokeWidth="1.5" />
        </svg>
    );
}

/* ── Japanese food photo cards (Unsplash) ── */
const FOOD_PHOTOS = [
    { url: 'https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=300&h=300&fit=crop&q=80', alt: 'Japanese bento' },
    { url: 'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=300&h=300&fit=crop&q=80', alt: 'Sushi' },
    { url: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=300&h=300&fit=crop&q=80', alt: 'Japanese cooking' },
    { url: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=300&h=300&fit=crop&q=80', alt: 'Japanese bowl' },
];

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
                LEFT PANEL — orange + photo strip
            ══════════════════════════════════════════ */}
            <div className="hidden lg:flex w-[42%] relative overflow-hidden flex-shrink-0">

                {/* Orange background */}
                <div className="absolute inset-0" style={{ background: '#F5A820' }} />

                {/* Food line-art illustration overlay */}
                <FoodLineArt />

                {/* Lightning bolts — left panel */}
                <Bolt size={22} color="#1a1a1a" style={{ position: 'absolute', top: 32, right: 88, opacity: 0.55, transform: 'rotate(-8deg)' }} />
                <Bolt size={18} color="#1a1a1a" style={{ position: 'absolute', bottom: 60, right: 60, opacity: 0.45, transform: 'rotate(12deg)' }} />

                {/* Dark photo strip on far left */}
                <div
                    className="absolute left-0 top-0 bottom-0 flex flex-col overflow-hidden"
                    style={{ width: '42%', background: '#141414', padding: '20px 14px', gap: 12 }}
                >
                    {/* V School logo */}
                    <div className="flex items-center gap-2 mb-2 flex-shrink-0">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                             style={{ background: '#C9A34E' }}>
                            <span style={{ color: '#0A1A2F', fontWeight: 900, fontSize: 16 }}>V</span>
                        </div>
                        <div>
                            <p style={{ color: 'white', fontWeight: 900, fontSize: 10, letterSpacing: '0.1em' }}>V SCHOOL</p>
                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 7, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Restaurant Vegetarian</p>
                        </div>
                    </div>

                    {/* Photo cards */}
                    {FOOD_PHOTOS.map((photo, i) => (
                        <div
                            key={i}
                            className="flex-shrink-0 w-full rounded-2xl overflow-hidden"
                            style={{ aspectRatio: '1/1', background: '#2a2a2a' }}
                        >
                            <img
                                src={photo.url}
                                alt={photo.alt}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.parentNode.style.background = '#1e1e1e';
                                    e.target.parentNode.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:2rem">🍱</div>`;
                                }}
                            />
                        </div>
                    ))}
                </div>

                {/* Curved right edge of left panel */}
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
