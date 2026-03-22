'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { CheckCircle, Loader2, Search, Plus, ShoppingBasket, ShoppingCart, Trash2, Minus, ArrowRight, UserPlus, X, Clock, Users, GraduationCap, Tag, ImageOff, ShoppingBag, TrendingUp } from 'lucide-react';
import { useSession } from 'next-auth/react';

// ─── Product Placeholder ───────────────────────────────────────────────────
const CATEGORY_EMOJI = {
    'ญี่ปุ่น': '🍱', 'japanese': '🍱',
    'sushi': '🍣',   'Sushi': '🍣',
    'ramen': '🍜',   'Ramen': '🍜',
    'tempura': '🍤', 'Tempura': '🍤',
    'thai': '🍛',    'Thai': '🍛',
    'dessert': '🍰', 'Dessert': '🍰',
    'bakery': '🥐',  'Bakery': '🥐',
    'beverage': '🍵','Beverage': '🍵',
    'cake': '🎂',    'Cake': '🎂',
    'food': '🍜',    'side_dish': '🥗',
    'equipment': '🔪','knife': '🗡️',
    'kitchen': '🍳', 'fish_tool': '🐟',
    'sushi_eqt': '🍣','sharpening': '⚙️',
};

const CATEGORY_ICONS = {
    'All': '🍽️',
    'japanese_culinary': '🍱',
    'specialty': '🍣',
    'management': '📋',
    'arts': '🎨',
    'package': '🎁',
    'full_course': '👨‍🍳',
};

function getEmoji(category = '', name = '') {
    const key = Object.keys(CATEGORY_EMOJI).find(k =>
        category.toLowerCase().includes(k.toLowerCase()) ||
        name.toLowerCase().includes(k.toLowerCase())
    );
    return key ? CATEGORY_EMOJI[key] : '🍽️';
}

function ProductPlaceholder({ category, name }) {
    const emoji = getEmoji(category, name);
    return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2 select-none"
             style={{ background: 'linear-gradient(135deg, #0c1a2f 0%, #19273a 60%, #19273a 100%)' }}>
            <span style={{ fontSize: '2.8rem', lineHeight: 1, filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))' }}>
                {emoji}
            </span>
            <span className="text-[#cc9d37] text-[7px] font-black uppercase tracking-[0.2em] opacity-70">
                V SCHOOL
            </span>
        </div>
    );
}
// ──────────────────────────────────────────────────────────────────────────

// ─── Equipment country of origin (curated list) ───────────────────────────
const ORIGIN_COUNTRIES = [
    { code: 'JP', label: 'ญี่ปุ่น',     flag: '🇯🇵' },
    { code: 'CN', label: 'จีน',          flag: '🇨🇳' },
    { code: 'KR', label: 'เกาหลีใต้',   flag: '🇰🇷' },
    { code: 'TW', label: 'ไต้หวัน',     flag: '🇹🇼' },
    { code: 'TH', label: 'ไทย',          flag: '🇹🇭' },
    { code: 'DE', label: 'เยอรมัน',     flag: '🇩🇪' },
    { code: 'SE', label: 'สวีเดน',      flag: '🇸🇪' },
    { code: 'FR', label: 'ฝรั่งเศส',    flag: '🇫🇷' },
    { code: 'IT', label: 'อิตาลี',      flag: '🇮🇹' },
    { code: 'US', label: 'อเมริกา',     flag: '🇺🇸' },
    { code: 'VN', label: 'เวียดนาม',    flag: '🇻🇳' },
    { code: 'ES', label: 'สเปน',        flag: '🇪🇸' },
];
const COUNTRY_MAP = Object.fromEntries(ORIGIN_COUNTRIES.map(c => [c.code, c]));

// ─── Product Detail Modal ─────────────────────────────────────────────────
const SESSION_LABEL = { MORNING: 'เช้า', AFTERNOON: 'บ่าย', EVENING: 'เย็น' };

function ProductDetailModal({ product, onClose, onAddToCart, inCart, onProductUpdate }) {
    const [data, setData] = useState(null);
    const [loadingStats, setLoadingStats] = useState(true);
    const [activeImg, setActiveImg] = useState(0);
    // equipment spec edit state
    const isEquipment = product.category === 'equipment';
    const [specEdit, setSpecEdit] = useState({
        brand:         product.brand         || '',
        originCountry: product.originCountry || '',
    });
    const [specSaving, setSpecSaving] = useState(false);
    const [specSaved,  setSpecSaved]  = useState(false);

    const saveSpec = async (patch) => {
        setSpecSaving(true);
        try {
            const res = await fetch(`/api/products/${product.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(patch),
            });
            if (res.ok) {
                const updated = await res.json();
                setSpecSaved(true);
                setTimeout(() => setSpecSaved(false), 2000);
                if (onProductUpdate) onProductUpdate(updated);
            }
        } catch (_) { /* silent */ }
        finally { setSpecSaving(false); }
    };

    const emoji = getEmoji(product.category, product.name);

    // Extract images from metadata or single image field
    const rawImages = useMemo(() => {
        const meta = product.metadata || {};
        const extras = Array.isArray(meta.images) ? meta.images : [];
        const all = product.image ? [product.image, ...extras] : extras;
        return all.filter(Boolean).slice(0, 6);
    }, [product]);

    // Extract tags from metadata
    const tags = useMemo(() => {
        const meta = product.metadata || {};
        if (Array.isArray(meta.tags)) return meta.tags;
        if (typeof meta.tags === 'string') return meta.tags.split(',').map(t => t.trim()).filter(Boolean);
        return [];
    }, [product]);

    const sessions = product.sessionType
        ? product.sessionType.split(',').map(s => SESSION_LABEL[s.trim()] || s.trim())
        : [];

    useEffect(() => {
        fetch(`/api/products/${product.id}/stats`)
            .then(r => r.ok ? r.json() : null)
            .then(d => { setData(d); setLoadingStats(false); })
            .catch(() => setLoadingStats(false));
    }, [product.id]);

    const stats = data?.stats;
    const isCourse = ['japanese_culinary','specialty','management','arts','full_course','course'].includes(product.category);

    // Close on backdrop click
    const handleBackdrop = (e) => { if (e.target === e.currentTarget) onClose(); };

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={handleBackdrop}
        >
            <div className="relative bg-[#0d1f35] border border-white/10 rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">

                {/* Close */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
                >
                    <X size={14} />
                </button>

                {/* ── Image gallery ── */}
                <div className="relative w-full bg-[#0a1628] flex-shrink-0" style={{ height: 220 }}>
                    {rawImages.length > 0 ? (
                        <>
                            <img
                                src={rawImages[activeImg]}
                                className="w-full h-full object-cover"
                                alt={product.name}
                                onError={(e) => { e.target.style.display = 'none'; }}
                            />
                            {/* Thumbnail strip */}
                            {rawImages.length > 1 && (
                                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 px-4">
                                    {rawImages.map((img, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setActiveImg(i)}
                                            className={`w-10 h-10 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${i === activeImg ? 'border-[#cc9d37]' : 'border-white/20 opacity-60 hover:opacity-100'}`}
                                        >
                                            <img src={img} className="w-full h-full object-cover" alt="" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        /* No image — show large emoji */
                        <div className="w-full h-full flex flex-col items-center justify-center gap-3"
                             style={{ background: 'linear-gradient(135deg,#0c1a2f 0%,#19273a 60%,#19273a 100%)' }}>
                            <span style={{ fontSize: '4rem', lineHeight: 1, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.6))' }}>{emoji}</span>
                            <span className="text-[#cc9d37] text-[8px] font-black uppercase tracking-[0.3em] opacity-60">V SCHOOL</span>
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0d1f35] via-transparent to-transparent pointer-events-none" />
                </div>

                {/* ── Scrollable body ── */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 custom-scrollbar">

                    {/* Name + price row */}
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <h2 className="text-lg font-black text-[#F8F8F6] leading-snug">{product.name}</h2>
                            {product.productId && (
                                <p className="text-[9px] font-mono text-white/25 mt-0.5 tracking-wider">{product.productId}</p>
                            )}
                            {product.description && (
                                <p className="text-xs text-white/40 mt-1 leading-relaxed">{product.description}</p>
                            )}
                        </div>
                        <div className="text-right flex-shrink-0">
                            <p className="text-2xl font-black text-[#cc9d37]">฿{Number(product.price).toLocaleString()}</p>
                            {product.basePrice && product.basePrice !== product.price && (
                                <p className="text-[10px] text-white/30 line-through">฿{Number(product.basePrice).toLocaleString()}</p>
                            )}
                        </div>
                    </div>

                    {/* Meta chips */}
                    <div className="flex flex-wrap gap-2">
                        {product.hours && (
                            <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black text-white/50">
                                <Clock size={10} /> {product.hours} ชม.
                            </span>
                        )}
                        {product.days && (
                            <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black text-white/50">
                                <Clock size={10} /> {product.days} วัน
                            </span>
                        )}
                        {sessions.map(s => (
                            <span key={s} className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[10px] font-black text-blue-300">
                                {s}
                            </span>
                        ))}
                        <span className="px-2.5 py-1 rounded-lg bg-[#cc9d37]/10 border border-[#cc9d37]/20 text-[10px] font-black text-[#cc9d37]">
                            {product.category}
                        </span>
                    </div>

                    {/* Tags */}
                    {tags.length > 0 && (
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-white/25 mb-2 flex items-center gap-1">
                                <Tag size={9} /> Tags
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {tags.map(tag => (
                                    <span key={tag} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-white/50">
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Equipment Full Spec Panel ── */}
                    {isEquipment && (
                        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 space-y-4">
                            <p className="text-[9px] font-black uppercase tracking-widest text-white/25 flex items-center gap-1.5">
                                🔪 ข้อมูลสินค้า
                            </p>

                            {/* ── read-only spec grid ── */}
                            <div className="grid grid-cols-2 gap-2 text-[11px]">
                                {/* hand */}
                                {product.hand && (
                                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#1a2535] border border-white/8">
                                        <span className="text-base leading-none">{product.hand === 'LEFT' ? '✋' : '🤚'}</span>
                                        <div>
                                            <p className="text-[8px] font-black uppercase text-white/25">มือที่ใช้</p>
                                            <p className="font-bold text-white/70">{product.hand === 'LEFT' ? 'มือซ้าย' : product.hand === 'RIGHT' ? 'มือขวา' : 'สองมือ'}</p>
                                        </div>
                                    </div>
                                )}
                                {/* material */}
                                {product.material && (
                                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#1a2535] border border-white/8">
                                        <span className="text-base leading-none">⚙️</span>
                                        <div>
                                            <p className="text-[8px] font-black uppercase text-white/25">วัสดุ</p>
                                            <p className="font-bold text-white/70">{product.material}</p>
                                        </div>
                                    </div>
                                )}
                                {/* product dimension */}
                                {product.dimension && (
                                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#1a2535] border border-white/8">
                                        <span className="text-base leading-none">📐</span>
                                        <div>
                                            <p className="text-[8px] font-black uppercase text-white/25">ขนาดสินค้า</p>
                                            <p className="font-bold text-white/70">{product.dimension}</p>
                                        </div>
                                    </div>
                                )}
                                {/* product weight */}
                                {product.unitAmount && (
                                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#1a2535] border border-white/8">
                                        <span className="text-base leading-none">⚖️</span>
                                        <div>
                                            <p className="text-[8px] font-black uppercase text-white/25">น้ำหนักสินค้า</p>
                                            <p className="font-bold text-white/70">{product.unitAmount} {product.unitType || 'g'}</p>
                                        </div>
                                    </div>
                                )}
                                {/* box size */}
                                {product.size && (
                                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#1a2535] border border-white/8">
                                        <span className="text-base leading-none">📦</span>
                                        <div>
                                            <p className="text-[8px] font-black uppercase text-white/25">ขนาดกล่อง</p>
                                            <p className="font-bold text-white/70">{product.size}</p>
                                        </div>
                                    </div>
                                )}
                                {/* country */}
                                {(specEdit.originCountry || product.originCountry) && (
                                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#cc9d37]/8 border border-[#cc9d37]/20">
                                        <span className="text-base leading-none">{COUNTRY_MAP[specEdit.originCountry || product.originCountry]?.flag}</span>
                                        <div>
                                            <p className="text-[8px] font-black uppercase text-white/25">ผู้ผลิต</p>
                                            <p className="font-bold text-[#cc9d37]">{COUNTRY_MAP[specEdit.originCountry || product.originCountry]?.label}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* ── Shipping section ── */}
                            {(product.shippingWeightG || product.boxDimW) && (
                                <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 space-y-2">
                                    <p className="text-[8px] font-black uppercase tracking-widest text-blue-400/60 flex items-center gap-1.5">
                                        🚚 ข้อมูลจัดส่ง
                                    </p>
                                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                                        {product.shippingWeightG && (
                                            <div>
                                                <p className="text-[8px] text-white/25 font-black uppercase">น้ำหนักรวม</p>
                                                <p className="font-black text-blue-300">{product.shippingWeightG} g</p>
                                            </div>
                                        )}
                                        {product.boxWeightG && (
                                            <div>
                                                <p className="text-[8px] text-white/25 font-black uppercase">น้ำหนักกล่อง</p>
                                                <p className="font-bold text-white/50">{product.boxWeightG} g</p>
                                            </div>
                                        )}
                                        {product.boxDimW && (
                                            <div className="col-span-2">
                                                <p className="text-[8px] text-white/25 font-black uppercase mb-0.5">ขนาดกล่อง (กว้าง × ยาว × สูง)</p>
                                                <p className="font-black text-blue-300">
                                                    {product.boxDimW} × {product.boxDimL} × {product.boxDimH} cm
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ── editable: brand + country ── */}
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[8px] font-black uppercase tracking-widest text-white/20 block mb-1">ยี่ห้อ</label>
                                    <input
                                        type="text"
                                        value={specEdit.brand}
                                        onChange={e => setSpecEdit(s => ({ ...s, brand: e.target.value }))}
                                        onBlur={() => saveSpec({ brand: specEdit.brand })}
                                        placeholder="เช่น Masahiro, Suehiro"
                                        className="w-full px-3 py-2 rounded-xl bg-[#1a2535] border border-white/10 text-white text-[11px] font-bold placeholder:text-white/15 outline-none focus:border-[#cc9d37]/40 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-[8px] font-black uppercase tracking-widest text-white/20 block mb-1">ประเทศผู้ผลิต</label>
                                    <select
                                        value={specEdit.originCountry}
                                        onChange={e => {
                                            const val = e.target.value;
                                            setSpecEdit(s => ({ ...s, originCountry: val }));
                                            saveSpec({ originCountry: val });
                                        }}
                                        className="w-full px-3 py-2 rounded-xl bg-[#1a2535] border border-white/10 text-white text-[11px] font-bold outline-none focus:border-[#cc9d37]/40 transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="">— เลือกประเทศ —</option>
                                        {ORIGIN_COUNTRIES.map(c => (
                                            <option key={c.code} value={c.code}>{c.flag} {c.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {(specSaving || specSaved) && (
                                <p className={`text-[9px] font-black text-right ${specSaved ? 'text-green-400' : 'text-white/30'}`}>
                                    {specSaving ? '⏳ กำลังบันทึก...' : '✓ บันทึกแล้ว'}
                                </p>
                            )}
                        </div>
                    )}

                    {/* ── Enrollment / Student Stats ── */}
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-white/25 mb-3 flex items-center gap-1">
                            <GraduationCap size={9} /> สถานะนักเรียน
                        </p>
                        {loadingStats ? (
                            <div className="flex items-center gap-2 text-white/20 text-xs">
                                <Loader2 size={12} className="animate-spin" /> กำลังโหลด...
                            </div>
                        ) : stats ? (
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
                                    <p className="text-lg font-black text-[#cc9d37]">{stats.totalSold}</p>
                                    <p className="text-[9px] font-black uppercase tracking-wide text-white/30 mt-0.5 flex items-center justify-center gap-1">
                                        <ShoppingBag size={8} /> ขายแล้ว
                                    </p>
                                </div>
                                <div className={`rounded-xl p-3 text-center border ${stats.pendingStudents > 0 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-white/5 border-white/5'}`}>
                                    <p className={`text-lg font-black ${stats.pendingStudents > 0 ? 'text-amber-400' : 'text-white/40'}`}>{stats.pendingStudents}</p>
                                    <p className="text-[9px] font-black uppercase tracking-wide text-white/30 mt-0.5 flex items-center justify-center gap-1">
                                        <Users size={8} /> รอเรียน
                                    </p>
                                </div>
                                <div className="bg-green-500/5 rounded-xl p-3 text-center border border-green-500/10">
                                    <p className="text-lg font-black text-green-400">{stats.completedStudents}</p>
                                    <p className="text-[9px] font-black uppercase tracking-wide text-white/30 mt-0.5 flex items-center justify-center gap-1">
                                        <CheckCircle size={8} /> จบแล้ว
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-[10px] text-white/20">ไม่สามารถโหลดข้อมูลได้</p>
                        )}

                        {/* Pending warning */}
                        {stats?.pendingStudents >= 5 && (
                            <div className="mt-3 flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                <TrendingUp size={13} className="text-amber-400 flex-shrink-0 mt-0.5" />
                                <p className="text-[10px] text-amber-300 leading-relaxed">
                                    มีนักเรียนรอเรียน <span className="font-black">{stats.pendingStudents} คน</span> — พิจารณาเปิดรอบใหม่
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Footer: Add to Cart ── */}
                <div className="px-6 py-4 border-t border-white/5 flex-shrink-0">
                    <button
                        onClick={() => { onAddToCart(product); onClose(); }}
                        className="w-full flex items-center justify-center gap-3 bg-[#cc9d37] hover:bg-amber-400 text-[#0c1a2f] py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all active:scale-95"
                    >
                        {inCart ? (
                            <>
                                <Plus size={14} />
                                เพิ่มอีก 1 (ในตะกร้า {inCart.quantity})
                            </>
                        ) : (
                            <>
                                <ShoppingCart size={14} />
                                เพิ่มลงตะกร้า
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
// ──────────────────────────────────────────────────────────────────────────

export default function PremiumPOS({ language = 'TH' }) {
    const { data: session } = useSession();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [cart, setCart] = useState([]);
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');
    const [checkoutSuccess, setCheckoutSuccess] = useState(false);
    const [enrollmentCount, setEnrollmentCount] = useState(0);
    const [fetchError, setFetchError] = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(null);

    const [mainMode, setMainMode] = useState('course'); // 'course' | 'food'

    const [customerPhone, setCustomerPhone] = useState('');
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [customerLookupLoading, setCustomerLookupLoading] = useState(false);
    const [customerError, setCustomerError] = useState('');

    // Inline Customer Creation
    const [showRegisterForm, setShowRegisterForm] = useState(false);
    const [regForm, setRegForm] = useState({ firstName: '', lastName: '', nickName: '' });

    // Order Type Modal (step 0)
    const [showOrderTypeModal, setShowOrderTypeModal] = useState(false);
    const [orderTypeForm, setOrderTypeForm] = useState({
        type: 'DINE_IN', // DINE_IN | TAKE_AWAY | DELIVERY
        platform: '',
        platformOrderId: '',
        gpRate: '30', // default 30% GP for delivery
        includeUtensils: false, // ช้อนซ่อม
    });

    // Guest Mode
    const [isGuestMode, setIsGuestMode] = useState(false);

    // Payment Modal
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [pendingCustomer, setPendingCustomer] = useState(null);
    const [paymentForm, setPaymentForm] = useState({
        method: 'CASH',
        bankName: '',
        isDeposit: false,
        depositAmount: '',
        discountAmount: '',
        discountPercent: '',
        promoCode: '',
        salesStaffId: '',
        closedById: '',
        cashierId: '',
        notes: '',
    });

    // Slip upload + OCR
    const [slipFile, setSlipFile] = useState(null);
    const [slipOcr, setSlipOcr] = useState(null);   // { amount, refNumber, date, confidence }
    const [slipUploading, setSlipUploading] = useState(false);

    // Receipt Modal
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [lastOrder, setLastOrder] = useState(null);
    const [lastCustomer, setLastCustomer] = useState(null);

    // Employee list for dropdowns
    const [employees, setEmployees] = useState([]);
    // assignedStaff = read-only, auto-resolved from customer's latest conversation
    const [assignedStaff, setAssignedStaff] = useState(null); // { id, firstName, lastName, employeeId }

    // Customer pre-selection in cart panel
    const [cartCustomerSearch, setCartCustomerSearch] = useState('');
    const [cartCustomer, setCartCustomer] = useState(null);       // selected customer for this order
    const [cartCustomerLoading, setCartCustomerLoading] = useState(false);
    const [cartCustomerResults, setCartCustomerResults] = useState([]);

    useEffect(() => {
        fetch('/api/employees')
            .then(r => r.json())
            .then(data => setEmployees(Array.isArray(data) ? data : data.employees || []))
            .catch(() => {});
        // Load html2canvas for receipt image export
        if (!window.html2canvas) {
            const s = document.createElement('script');
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
            document.head.appendChild(s);
        }
    }, []);

    useEffect(() => {
        fetch('/api/products')
            .then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status} — ${r.statusText}`);
                return r.json();
            })
            .then(data => {
                const list = Array.isArray(data) ? data : [];
                console.log(`[POS] Loaded ${list.length} products`, list.slice(0, 3));
                setProducts(list);
                setLoading(false);
            })
            .catch(err => {
                console.error('[POS] Product fetch failed:', err.message);
                setFetchError(err.message);
                setLoading(false);
            });
    }, []);

    // ── Category definitions per mode ──────────────────────────────────────
    const COURSE_CATS = ['japanese_culinary', 'specialty', 'management', 'arts', 'package', 'full_course', 'course'];
    const FOOD_CATS   = ['food', 'side_dish', 'beverage', 'snack', 'dessert'];
    const EQT_CATS    = ['equipment'];

    const courseSubCats = ['All', 'japanese_culinary', 'specialty', 'management', 'arts', 'package', 'full_course', 'course'];
    const foodSubCats   = ['All', 'food', 'side_dish', 'beverage', 'snack', 'dessert'];
    const eqtSubCats    = ['All', 'knife', 'kitchen', 'fish_tool', 'sushi', 'sharpening'];

    const categories = mainMode === 'course' ? courseSubCats
                     : mainMode === 'food'   ? foodSubCats
                     : eqtSubCats;

    const COURSE_ICONS = {
        All: '🎓', japanese_culinary: '🍱', specialty: '🍣',
        management: '📋', arts: '🎨', package: '🎁', full_course: '👨‍🍳', course: '📚'
    };
    const FOOD_ICONS = {
        All: '🍽️', food: '🍜', side_dish: '🥗', beverage: '🍵', snack: '🍘', dessert: '🍰'
    };
    const EQT_ICONS = {
        All: '🔪', knife: '🗡️', kitchen: '🍳', fish_tool: '🐟', sushi: '🍣', sharpening: '⚙️'
    };
    const subCatIcons = mainMode === 'course' ? COURSE_ICONS
                      : mainMode === 'food'   ? FOOD_ICONS
                      : EQT_ICONS;

    const COURSE_LABELS = {
        All: 'ทั้งหมด', japanese_culinary: 'อาหารญี่ปุ่น', specialty: 'พิเศษ',
        management: 'การจัดการ', arts: 'ศิลปะ', package: 'แพ็คเกจ', full_course: 'คอร์สเต็ม', course: 'คอร์สทั่วไป'
    };
    const FOOD_LABELS = {
        All: 'ทั้งหมด', food: 'เมนูหลัก', side_dish: 'เครื่องเคียง', beverage: 'เครื่องดื่ม', snack: 'ของว่าง', dessert: 'ของหวาน'
    };
    const EQT_LABELS = {
        All: 'ทั้งหมด', knife: 'มีด', kitchen: 'อุปกรณ์ครัว', fish_tool: 'อุปกรณ์แล่ปลา', sushi: 'อุปกรณ์ซูชิ', sharpening: 'ลับมีด'
    };
    const categoryLabels = mainMode === 'course' ? COURSE_LABELS
                         : mainMode === 'food'   ? FOOD_LABELS
                         : EQT_LABELS;

    const filteredProducts = useMemo(() => {
        const isCourseProd = (p) => COURSE_CATS.includes(p.category);
        const isFoodProd   = (p) => FOOD_CATS.includes(p.category);
        const isEqtProd    = (p) => EQT_CATS.includes(p.category);

        return products.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
            const matchesMode = mainMode === 'course' ? isCourseProd(p)
                              : mainMode === 'food'   ? isFoodProd(p)
                              : isEqtProd(p);
            // Equipment filters by fallbackSubCategory; others filter by category
            const matchesSub = activeCategory === 'All'
                ? true
                : mainMode === 'equipment'
                    ? (p.fallbackSubCategory === activeCategory)
                    : p.category === activeCategory;
            return matchesSearch && matchesMode && matchesSub;
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [products, search, activeCategory, mainMode]);

    const addItem = (product) => {
        const existing = cart.find(item => item.id === product.id);
        if (existing) {
            setCart(cart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
        } else {
            setCart([...cart, { ...product, quantity: 1 }]);
        }
    };

    const updateQuantity = (id, q) => {
        if (q < 1) {
            setCart(cart.filter(item => item.id !== id));
            return;
        }
        setCart(cart.map(item => item.id === id ? { ...item, quantity: q } : item));
    };

    const removeItem = (id) => setCart(cart.filter(item => item.id !== id));

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.07;
    const total = subtotal + tax;

    // ── Cart customer search ──────────────────────────────────────────────
    const TIER_META = {
        TIER1: { label: 'V Member',   color: '#9CA3AF', bg: 'bg-gray-500/20',   badge: '🥈' },
        TIER2: { label: 'V Silver',   color: '#C0C0C0', bg: 'bg-gray-300/20',   badge: '🥈' },
        TIER3: { label: 'V Gold',     color: '#cc9d37', bg: 'bg-amber-500/20',  badge: '🥇' },
        TIER4: { label: 'V Platinum', color: '#E5E4E2', bg: 'bg-slate-300/20',  badge: '💎' },
        TIER5: { label: 'V Black',    color: '#9b8cff', bg: 'bg-purple-500/20', badge: '⬛' },
    };

    const searchCartCustomer = async (q) => {
        setCartCustomerSearch(q);
        if (q.length < 2) { setCartCustomerResults([]); return; }
        setCartCustomerLoading(true);
        try {
            const res = await fetch(`/api/customers?search=${encodeURIComponent(q)}&limit=5`);
            const data = await res.json();
            setCartCustomerResults(Array.isArray(data) ? data : data.customers || []);
        } catch { setCartCustomerResults([]); }
        finally { setCartCustomerLoading(false); }
    };

    const selectCartCustomer = (c) => {
        setCartCustomer(c);
        setCartCustomerSearch('');
        setCartCustomerResults([]);
    };

    const handleCheckout = () => {
        // ไม่ reset isGuestMode ที่นี่ — ให้ user set ได้จากตะกร้า
        setSlipFile(null);
        setSlipOcr(null);
        setShowOrderTypeModal(true);
    };

    const handleOrderTypeConfirmWithCartCustomer = () => {
        // ถ้าเลือกลูกค้าไว้แล้วในตะกร้า → ข้าม customer modal
        setShowOrderTypeModal(false);
        if (isGuestMode) {
            openPaymentModal({ id: 'guest-customer-00000000-0000-0000-0000-000000000000', firstName: 'ลูกค้า', lastName: 'ทั่วไป', customerId: 'WALK-IN-GUEST' });
        } else if (cartCustomer) {
            openPaymentModal(cartCustomer);
        } else {
            setShowCustomerModal(true);
            setShowRegisterForm(false);
            setCustomerError('');
        }
    };

    // Guest shortcut — ข้าม OrderType modal + ข้าม Customer modal เลย
    const handleGuestCheckout = () => {
        setIsGuestMode(true);
        setSlipFile(null);
        setSlipOcr(null);
        setOrderTypeForm(f => ({ ...f, type: 'TAKE_AWAY' })); // ลูกค้าทั่วไป default = take away
        openPaymentModal({
            id: 'guest-customer-00000000-0000-0000-0000-000000000000',
            firstName: 'ลูกค้า', lastName: 'ทั่วไป',
            customerId: 'WALK-IN-GUEST',
        });
    };

    const handleOrderTypeConfirm = () => {
        setShowOrderTypeModal(false);
        if (isGuestMode) {
            // Skip customer lookup — use system GUEST customer
            openPaymentModal({
                id: 'guest-customer-00000000-0000-0000-0000-000000000000',
                firstName: 'ลูกค้า', lastName: 'ทั่วไป',
                customerId: 'WALK-IN-GUEST',
            });
        } else {
            setShowCustomerModal(true);
            setShowRegisterForm(false);
            setCustomerError('');
        }
    };

    const handleSlipUpload = async (file) => {
        if (!file) return;
        setSlipFile(file);
        setSlipUploading(true);
        setSlipOcr(null);
        try {
            const formData = new FormData();
            formData.append('slip', file);
            const res = await fetch('/api/payments/ocr-slip', { method: 'POST', body: formData });
            if (res.ok) {
                const result = await res.json();
                setSlipOcr(result); // { amount, refNumber, date, confidence }
            }
        } catch (err) {
            console.error('[POS] Slip OCR error', err);
        } finally {
            setSlipUploading(false);
        }
    };

    const openPaymentModal = async (customer) => {
        setPendingCustomer(customer);
        setShowCustomerModal(false);
        setCustomerPhone('');
        setCustomerError('');
        setAssignedStaff(null);

        // Fetch assigned staff from customer's latest conversation
        try {
            const res = await fetch(`/api/inbox/conversations?customerId=${customer.id}&limit=1`);
            if (res.ok) {
                const data = await res.json();
                const convs = Array.isArray(data) ? data : (data.conversations || []);
                const latest = convs[0];
                if (latest?.assignedEmployee) {
                    setAssignedStaff(latest.assignedEmployee);
                } else if (latest?.assignedEmployeeId) {
                    // fallback: look up in employees list
                    const emp = employees.find(e => e.id === latest.assignedEmployeeId);
                    if (emp) setAssignedStaff(emp);
                }
            }
        } catch (_) { /* silent — assigned staff is optional */ }

        // Pre-fill cashier with current logged-in user
        setPaymentForm(f => ({
            ...f,
            cashierId: session?.user?.employeeId || '',
        }));
        setShowPaymentModal(true);
    };

    const handleRegisterCustomer = async () => {
        if (!regForm.firstName || !regForm.lastName || !customerPhone) {
            setCustomerError('กรุณากรอกข้อมูลให้ครบถ้วน');
            return;
        }
        setCustomerLookupLoading(true);
        try {
            const res = await fetch('/api/customers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...regForm,
                    phonePrimary: customerPhone,
                    channel: 'WALK_IN'
                })
            });
            const customer = await res.json();
            if (customer.id) {
                openPaymentModal(customer);
            } else {
                setCustomerError('ไม่สามารถสร้างลูกค้าได้');
            }
        } catch (err) {
            setCustomerError('เกิดข้อผิดพลาดในการสร้างลูกค้า');
        } finally {
            setCustomerLookupLoading(false);
        }
    };

    const handleConfirmCheckout = async () => {
        if (!customerPhone.trim()) return;
        setCustomerLookupLoading(true);
        setCustomerError('');
        try {
            const res = await fetch('/api/customers?search=' + customerPhone.trim());
            const data = await res.json();
            const customer = Array.isArray(data) ? data[0] : (data.customers?.[0] || null);

            if (!customer) {
                setCustomerError('ไม่พบลูกค้า');
                setShowRegisterForm(true);
                setCustomerLookupLoading(false);
                return;
            }

            openPaymentModal(customer);
        } catch (error) {
            setCustomerError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
        } finally {
            setCustomerLookupLoading(false);
        }
    };

    const processOrder = async (customer, pmtForm) => {
        const discAmt = Number(pmtForm?.discountAmount || 0);
        const discPct = Number(pmtForm?.discountPercent || 0);
        const discountApplied = discAmt > 0 ? discAmt : (discPct > 0 ? subtotal * (discPct / 100) : 0);
        const finalTotal = Math.max(0, total - discountApplied);

        // Delivery GP
        const gpRate = orderTypeForm.type === 'DELIVERY' ? Number(orderTypeForm.gpRate || 0) / 100 : 0;
        const deliveryNetAmount = gpRate > 0 ? finalTotal * (1 - gpRate) : null;

        // Transfer → PENDING until slip verified; cash/card → CLOSED
        const orderStatus = pmtForm?.method === 'TRANSFER' ? 'PENDING' : 'CLOSED';

        try {
            const orderRes = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customerId: customer.id,
                    totalAmount: finalTotal,
                    discountAmount: discountApplied,
                    discountPercent: discPct || null,
                    promoCode: pmtForm?.promoCode || null,
                    paymentMethod: pmtForm?.method || 'CASH',
                    bankName: pmtForm?.bankName || null,
                    isDeposit: pmtForm?.isDeposit || false,
                    depositAmount: pmtForm?.isDeposit ? Number(pmtForm.depositAmount || 0) : finalTotal,
                    closedById: pmtForm?.closedById || null,
                    salesStaffId: assignedStaff?.id || pmtForm?.salesStaffId || null,
                    cashierId: pmtForm?.cashierId || null,
                    notes: pmtForm?.notes || null,
                    orderType: orderTypeForm.type,
                    deliveryPlatform: orderTypeForm.type === 'DELIVERY' ? orderTypeForm.platform || null : null,
                    deliveryOrderId: orderTypeForm.type === 'DELIVERY' ? orderTypeForm.platformOrderId || null : null,
                    deliveryGpRate: gpRate > 0 ? gpRate : null,
                    deliveryNetAmount,
                    isGuestOrder: isGuestMode,
                    includeUtensils: orderTypeForm.includeUtensils || false,
                    items: cart.map(i => ({
                        productId: i.productId || i.id,
                        name: i.name,
                        price: i.price,
                        qty: i.quantity
                    })),
                    status: orderStatus,
                    date: new Date().toISOString()
                })
            });

            if (orderRes.ok) {
                // UPGRADE 2: Enrollment Creation
                const courseItems = cart.filter(item =>
                    ['course', 'package', 'full_course', 'japanese_culinary', 'specialty', 'management'].includes(item.category)
                );

                let createdEnrollments = 0;
                for (const item of courseItems) {
                    try {
                        await fetch('/api/enrollments', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                customerId: customer.id,
                                productId: item.id,
                                soldById: session?.user?.employeeId || null,
                                totalPrice: item.price * item.quantity,
                                notes: 'POS checkout'
                            })
                        });
                        createdEnrollments++;
                    } catch (err) {
                        console.error('[POS] Enrollment failed', err);
                    }
                }
                setEnrollmentCount(createdEnrollments);

                const orderData = await orderRes.json();

                // Award V Points (fire-and-forget — ไม่ block receipt)
                const earnedVp = !isGuestMode ? Math.floor(finalTotal / 150) * 300 : 0;
                if (!isGuestMode && customer?.id) {
                    fetch('/api/customers/' + customer.id + '/vpoints', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ orderAmount: finalTotal }),
                    }).catch(e => console.error('[POS] VPoint award failed', e));
                }

                setLastOrder({ ...orderData, discountApplied, finalTotal, pmtForm, cartSnapshot: [...cart], assignedStaffSnap: assignedStaff, orderTypeSnap: { ...orderTypeForm }, deliveryNetAmount, gpRate, orderStatus, slipOcrSnap: slipOcr ? { ...slipOcr } : null, earnedVp });
                setLastCustomer(customer);
                setShowPaymentModal(false);
                setShowReceiptModal(true);
            }
        } catch (err) {
            setCustomerError('เกิดข้อผิดพลาดในการสั่งซื้อ');
        }
    };

    const labels = {
        EN: { title: 'V School POS', search: 'Search...', cart: 'Cart', checkout: 'Checkout', total: 'Total' },
        TH: { title: 'V School POS', search: 'ค้นหา...', cart: 'ตะกร้า', checkout: 'ชำระเงิน', total: 'ยอดรวม' }
    }[language];

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center bg-[#0d1626] rounded-[2.5rem]">
                <div className="text-[#cc9d37] font-black animate-pulse uppercase tracking-[0.3em]">กำลังโหลด...</div>
            </div>
        );
    }

    return (
        <div className="flex h-full overflow-hidden bg-[#0d1626] rounded-[2.5rem] animate-fade-in relative">
            {/* ── Receipt Modal ── */}
            {showReceiptModal && lastOrder && lastCustomer && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-lg p-4">
                    <div className="bg-[#111827] border border-[#cc9d37]/30 rounded-[2rem] shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden">
                        {/* Header — PENDING vs CLOSED */}
                        <div className={`${lastOrder.orderStatus === 'PENDING' ? 'bg-amber-500' : 'bg-[#cc9d37]'} text-[#0c1a2f] px-8 py-5 rounded-t-[2rem] flex items-center justify-between`}>
                            <div className="flex items-center gap-3">
                                {lastOrder.orderStatus === 'PENDING'
                                    ? <Clock size={28} />
                                    : <CheckCircle size={28} />
                                }
                                <div>
                                    <div className="font-black text-lg uppercase tracking-wide">
                                        {lastOrder.orderStatus === 'PENDING' ? 'รอยืนยันการโอน' : 'ชำระเงินสำเร็จ'}
                                    </div>
                                    <div className="text-[10px] font-bold opacity-70 uppercase">
                                        {lastOrder.orderStatus === 'PENDING' ? 'Pending Transfer Verification' : 'Transaction Complete'}
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="font-black text-2xl">฿{(lastOrder.finalTotal || lastOrder.totalAmount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</div>
                                {lastOrder.pmtForm?.isDeposit && <div className="text-[10px] font-black bg-[#0c1a2f]/20 px-2 py-0.5 rounded-full">มัดจำ ฿{Number(lastOrder.pmtForm?.depositAmount || 0).toLocaleString()}</div>}
                            </div>
                        </div>

                        {/* PENDING warning banner */}
                        {lastOrder.orderStatus === 'PENDING' && (
                            <div className="mx-6 mt-4 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 flex items-start gap-3">
                                <span className="text-amber-400 text-lg mt-0.5">⏳</span>
                                <div className="text-xs">
                                    <div className="font-black text-amber-400 uppercase tracking-wide">ออเดอร์รอการยืนยัน</div>
                                    <div className="text-white/50 mt-0.5">
                                        {lastOrder.slipOcrSnap
                                            ? `ตรวจสอบสลิปแล้ว (${Math.round((lastOrder.slipOcrSnap.confidence || 0) * 100)}%) — รอพนักงานยืนยันในระบบ`
                                            : 'ยังไม่ได้รับสลิป — แจ้งลูกค้าโอนเงินและส่งสลิปมายัง inbox'
                                        }
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Receipt Body — printable */}
                        <div id="receipt-body" className="flex-1 overflow-y-auto px-8 py-6 space-y-4 text-[#F8F8F6]">
                            {/* Customer */}
                            <div className="bg-white/5 rounded-xl px-4 py-3 flex justify-between items-center">
                                <span className="text-[10px] font-black uppercase text-[#cc9d37] tracking-widest">ลูกค้า</span>
                                <span className="font-bold text-sm">{lastCustomer.firstName} {lastCustomer.lastName}</span>
                            </div>

                            {/* Items */}
                            <div className="space-y-1">
                                <div className="text-[10px] font-black uppercase text-[#cc9d37] tracking-widest mb-2">รายการสินค้า</div>
                                {(lastOrder.cartSnapshot || []).map((item, i) => (
                                    <div key={i} className="flex justify-between text-sm py-1 border-b border-white/5">
                                        <span className="text-white/80">{item.name} × {item.quantity}</span>
                                        <span className="font-bold">฿{(item.price * item.quantity).toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Summary */}
                            <div className="bg-white/5 rounded-xl px-4 py-3 space-y-1.5 text-sm">
                                <div className="flex justify-between text-white/60"><span>ยอดรวม</span><span>฿{(lastOrder.cartSnapshot || []).reduce((s,i) => s + i.price*i.quantity, 0).toLocaleString()}</span></div>
                                <div className="flex justify-between text-white/60"><span>VAT 7%</span><span>฿{(((lastOrder.cartSnapshot || []).reduce((s,i) => s + i.price*i.quantity, 0)) * 0.07).toLocaleString('th-TH',{minimumFractionDigits:2})}</span></div>
                                {lastOrder.discountApplied > 0 && <div className="flex justify-between text-green-400"><span>ส่วนลด{lastOrder.pmtForm?.promoCode ? ` (${lastOrder.pmtForm.promoCode})` : ''}</span><span>-฿{lastOrder.discountApplied.toLocaleString('th-TH',{minimumFractionDigits:2})}</span></div>}
                                <div className="flex justify-between font-black text-[#cc9d37] text-base border-t border-white/10 pt-2"><span>ยอดสุทธิ</span><span>฿{(lastOrder.finalTotal || lastOrder.totalAmount || 0).toLocaleString('th-TH',{minimumFractionDigits:2})}</span></div>
                            </div>

                            {/* Payment Info */}
                            <div className="bg-white/5 rounded-xl px-4 py-3 space-y-1.5 text-sm">
                                <div className="text-[10px] font-black uppercase text-[#cc9d37] tracking-widest mb-2">วิธีชำระเงิน</div>
                                <div className="flex justify-between"><span className="text-white/60">ประเภท</span><span className="font-bold">{{ CASH: 'เงินสด', TRANSFER: 'โอนเงิน', CREDIT_CARD: 'บัตรเครดิต' }[lastOrder.pmtForm?.method] || '-'}</span></div>
                                {lastOrder.pmtForm?.bankName && <div className="flex justify-between"><span className="text-white/60">ธนาคาร</span><span className="font-bold">{lastOrder.pmtForm.bankName}</span></div>}
                                {lastOrder.pmtForm?.isDeposit && <div className="flex justify-between text-amber-400"><span>ชำระมัดจำ</span><span>฿{Number(lastOrder.pmtForm.depositAmount || 0).toLocaleString()}</span></div>}
                                {lastOrder.pmtForm?.notes && <div className="flex justify-between"><span className="text-white/60">หมายเหตุ</span><span className="text-right max-w-[60%] text-white/80">{lastOrder.pmtForm.notes}</span></div>}
                                {(lastOrder.orderTypeSnap?.type === 'TAKE_AWAY' || lastOrder.orderTypeSnap?.type === 'DELIVERY') && (
                                    <div className="flex justify-between">
                                        <span className="text-white/60">ช้อนซ่อม</span>
                                        <span className={`font-bold ${lastOrder.orderTypeSnap?.includeUtensils ? 'text-green-400' : 'text-white/40'}`}>
                                            {lastOrder.orderTypeSnap?.includeUtensils ? '✅ รับ' : '❌ ไม่รับ'}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Staff */}
                            {(lastOrder.assignedStaffSnap || lastOrder.pmtForm?.closedById || lastOrder.pmtForm?.cashierId) && (
                                <div className="bg-white/5 rounded-xl px-4 py-3 space-y-1.5 text-sm">
                                    <div className="text-[10px] font-black uppercase text-[#cc9d37] tracking-widest mb-2">พนักงาน</div>
                                    {lastOrder.assignedStaffSnap && <div className="flex justify-between"><span className="text-white/60">ดูแลลูกค้า</span><span className="font-bold">{lastOrder.assignedStaffSnap.firstName} {lastOrder.assignedStaffSnap.lastName || ''}</span></div>}
                                    {lastOrder.pmtForm?.closedById && <div className="flex justify-between"><span className="text-white/60">ปิดการขาย</span><span className="font-bold">{employees.find(e => e.id === lastOrder.pmtForm.closedById)?.firstName || '-'}</span></div>}
                                    {lastOrder.pmtForm?.cashierId && <div className="flex justify-between"><span className="text-white/60">แคชเชีย</span><span className="font-bold">{employees.find(e => e.id === lastOrder.pmtForm.cashierId)?.firstName || '-'}</span></div>}
                                </div>
                            )}
                            {enrollmentCount > 0 && <div className="text-center text-green-400 font-bold text-sm py-2">✅ ลงทะเบียนคอร์ส {enrollmentCount} รายการแล้ว</div>}
                            {lastOrder.earnedVp > 0 && (
                                <div className="bg-gradient-to-r from-[#cc9d37]/15 to-[#cc9d37]/5 border border-[#cc9d37]/30 rounded-xl px-4 py-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">⭐</span>
                                        <div>
                                            <div className="text-[10px] text-[#cc9d37]/70 font-black uppercase tracking-widest">V Point ที่ได้รับ</div>
                                            <div className="text-white/50 text-[10px]">สะสมทุก ฿150 = 300 VP</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[#cc9d37] font-black text-xl">+{lastOrder.earnedVp.toLocaleString()}</div>
                                        <div className="text-[#cc9d37]/60 text-[10px] font-bold">V POINTS</div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="px-8 py-5 border-t border-white/10 grid grid-cols-3 gap-3">
                            <button
                                onClick={() => { window.print(); }}
                                className="flex flex-col items-center gap-1.5 py-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-white text-xs font-black uppercase tracking-wider"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                                พิมพ์
                            </button>
                            <button
                                onClick={() => {
                                    const el = document.getElementById('receipt-body');
                                    if (!el || !window.html2canvas) { alert('กำลังโหลด กรุณาลองอีกครั้ง'); return; }
                                    window.html2canvas(el, { backgroundColor: '#111827', scale: 2 }).then(canvas => {
                                        const a = document.createElement('a');
                                        a.download = `receipt-${lastOrder.orderId?.slice(0,8) || Date.now()}.png`;
                                        a.href = canvas.toDataURL();
                                        a.click();
                                    });
                                }}
                                className="flex flex-col items-center gap-1.5 py-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-white text-xs font-black uppercase tracking-wider"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                                บันทึกรูป
                            </button>
                            <button
                                onClick={() => {
                                    setShowReceiptModal(false);
                                    setCart([]);
                                    setEnrollmentCount(0);
                                    setLastOrder(null);
                                    setLastCustomer(null);
                                    setAssignedStaff(null);
                                    setPaymentForm({ method: 'CASH', bankName: '', isDeposit: false, depositAmount: '', discountAmount: '', discountPercent: '', promoCode: '', closedById: '', cashierId: '', notes: '' });
                                    setOrderTypeForm({ type: 'DINE_IN', platform: '', platformOrderId: '', gpRate: '30', includeUtensils: false });
                                    setIsGuestMode(false);
                                    setSlipFile(null);
                                    setSlipOcr(null);
                                    setCartCustomer(null);
                                    setCartCustomerSearch('');
                                    setCartCustomerResults([]);
                                }}
                                className="flex flex-col items-center gap-1.5 py-3 bg-[#cc9d37] hover:bg-[#cc9d37] rounded-xl transition-all text-[#0c1a2f] text-xs font-black uppercase tracking-wider"
                            >
                                <CheckCircle className="w-5 h-5" />
                                เสร็จสิ้น
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Order Type Modal (Step 0) ── */}
            {showOrderTypeModal && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-lg p-4">
                    <div className="bg-[#111827] border border-[#cc9d37]/30 rounded-[2rem] shadow-2xl w-full max-w-md flex flex-col">
                        <div className="px-8 py-6 border-b border-white/10">
                            <h2 className="text-2xl font-black text-[#F8F8F6] italic uppercase">ประเภทออเดอร์</h2>
                            <p className="text-[#cc9d37] text-[10px] font-black uppercase tracking-widest mt-1">Order Type</p>
                        </div>
                        <div className="px-8 py-6 space-y-5">
                            {/* Order Type */}
                            <div className="grid grid-cols-3 gap-2">
                                {[['DINE_IN','🍽️','Walk In'],['TAKE_AWAY','📦','Take Away'],['DELIVERY','🛵','Delivery']].map(([val,icon,label]) => (
                                    <button key={val} onClick={() => setOrderTypeForm(f => ({ ...f, type: val }))}
                                        className={`py-4 rounded-xl font-black text-xs uppercase flex flex-col items-center gap-1.5 transition-all ${orderTypeForm.type === val ? 'bg-[#cc9d37] text-[#0c1a2f]' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>
                                        <span className="text-2xl">{icon}</span>
                                        {label}
                                    </button>
                                ))}
                            </div>

                            {/* Delivery fields */}
                            {orderTypeForm.type === 'DELIVERY' && (
                                <div className="space-y-3 bg-white/5 rounded-xl p-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-white/50 tracking-widest">แพลตฟอร์ม *</label>
                                        <div className="grid grid-cols-3 gap-2 flex-wrap">
                                            {['GrabFood','Foodpanda','LINE MAN','Shopee Food','Robinhood','อื่นๆ'].map(p => (
                                                <button key={p} onClick={() => setOrderTypeForm(f => ({ ...f, platform: p }))}
                                                    className={`py-2 px-2 rounded-lg font-bold text-[10px] uppercase transition-all ${orderTypeForm.platform === p ? 'bg-[#cc9d37] text-[#0c1a2f]' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>
                                                    {p}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <input type="text" placeholder="เลขออเดอร์จากแพลตฟอร์ม" value={orderTypeForm.platformOrderId}
                                        onChange={e => setOrderTypeForm(f => ({ ...f, platformOrderId: e.target.value }))}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold outline-none focus:border-[#cc9d37]/50 placeholder:text-white/20 transition-all" />
                                    <div className="flex items-center gap-3">
                                        <label className="text-[10px] font-black uppercase text-white/50 tracking-widest whitespace-nowrap">GP (%)</label>
                                        <input type="number" min="0" max="50" value={orderTypeForm.gpRate}
                                            onChange={e => setOrderTypeForm(f => ({ ...f, gpRate: e.target.value }))}
                                            className="w-24 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white font-black outline-none focus:border-[#cc9d37]/50 transition-all text-center" />
                                        <span className="text-white/40 text-sm font-bold">
                                            ยอดสุทธิหลังหัก GP: ฿{(total * (1 - Number(orderTypeForm.gpRate || 0) / 100)).toLocaleString('th-TH', { minimumFractionDigits: 0 })}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* ช้อนซ่อม — Take Away / Delivery เท่านั้น */}
                            {(orderTypeForm.type === 'TAKE_AWAY' || orderTypeForm.type === 'DELIVERY') && (
                                <div className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3">
                                    <div>
                                        <div className="font-black text-sm text-white">รับช้อนซ่อม / ตะเกียบ</div>
                                        <div className="text-[10px] text-white/40 mt-0.5">ใส่ช้อนซ่อมในถุงด้วย</div>
                                    </div>
                                    <button onClick={() => setOrderTypeForm(f => ({ ...f, includeUtensils: !f.includeUtensils }))}
                                        className={`w-12 h-6 rounded-full transition-all relative ${orderTypeForm.includeUtensils ? 'bg-[#cc9d37]' : 'bg-white/10'}`}>
                                        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${orderTypeForm.includeUtensils ? 'left-7' : 'left-1'}`} />
                                    </button>
                                </div>
                            )}

                            {/* Guest mode toggle */}
                            <div className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3">
                                <div>
                                    <div className="font-black text-sm text-white">ลูกค้าทั่วไป (ไม่ลงทะเบียน)</div>
                                    <div className="text-[10px] text-white/40 mt-0.5">ข้ามการกรอกเบอร์โทร / เลขสมาชิก</div>
                                </div>
                                <button onClick={() => setIsGuestMode(g => !g)}
                                    className={`w-12 h-6 rounded-full transition-all relative ${isGuestMode ? 'bg-[#cc9d37]' : 'bg-white/10'}`}>
                                    <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isGuestMode ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>
                        </div>
                        <div className="px-8 py-5 border-t border-white/10 flex gap-3">
                            <button onClick={() => setShowOrderTypeModal(false)}
                                className="flex-1 py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-white/60 font-black text-sm uppercase transition-all">
                                ยกเลิก
                            </button>
                            <button onClick={handleOrderTypeConfirmWithCartCustomer}
                                disabled={orderTypeForm.type === 'DELIVERY' && !orderTypeForm.platform}
                                className="flex-[2] py-4 bg-[#cc9d37] hover:bg-[#cc9d37] disabled:opacity-40 rounded-2xl text-[#0c1a2f] font-black text-sm uppercase transition-all">
                                ถัดไป →
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Payment Details Modal ── */}
            {showPaymentModal && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-lg p-4">
                    <div className="bg-[#111827] border border-[#cc9d37]/30 rounded-[2rem] shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
                        <div className="px-8 py-6 border-b border-white/10">
                            <h2 className="text-2xl font-black text-[#F8F8F6] italic uppercase">รายละเอียดการชำระเงิน</h2>
                            <p className="text-[#cc9d37] text-[10px] font-black uppercase tracking-widest mt-1">Payment Details</p>
                        </div>
                        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5">
                            {/* Summary */}
                            <div className="bg-[#cc9d37]/10 border border-[#cc9d37]/30 rounded-xl px-4 py-3 flex justify-between items-center">
                                <span className="text-white/60 text-sm font-bold">ยอดรวม (incl. VAT 7%)</span>
                                <span className="text-[#cc9d37] text-xl font-black">฿{total.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                            </div>

                            {/* Payment Method */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-white/50 tracking-widest">วิธีชำระเงิน *</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[['CASH','เงินสด','💵'],['TRANSFER','โอนเงิน','🏦'],['CREDIT_CARD','บัตรเครดิต','💳']].map(([val,label,icon]) => (
                                        <button key={val} onClick={() => setPaymentForm(f => ({ ...f, method: val }))}
                                            className={`py-3 rounded-xl font-black text-xs uppercase transition-all ${paymentForm.method === val ? 'bg-[#cc9d37] text-[#0c1a2f]' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>
                                            {icon} {label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Bank + Slip (if transfer) */}
                            {paymentForm.method === 'TRANSFER' && (
                                <>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-white/50 tracking-widest">ธนาคาร</label>
                                    <select value={paymentForm.bankName} onChange={e => setPaymentForm(f => ({ ...f, bankName: e.target.value }))}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold outline-none focus:border-[#cc9d37]/50 transition-all">
                                        <option value="">-- เลือกธนาคาร --</option>
                                        {['กสิกรไทย (KBank)','กรุงไทย (KTB)','ไทยพาณิชย์ (SCB)','กรุงเทพ (BBL)','ทหารไทยธนชาต (TTB)','ออมสิน','PromptPay','อื่นๆ'].map(b => <option key={b} value={b}>{b}</option>)}
                                    </select>
                                </div>

                                {/* Slip Upload */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-white/50 tracking-widest">แนบสลิป <span className="text-white/30 normal-case font-normal">(ไม่บังคับ — Gemini OCR)</span></label>
                                    <label className={`flex flex-col items-center justify-center gap-2 w-full py-4 rounded-xl border-2 border-dashed cursor-pointer transition-all ${slipFile ? 'border-[#cc9d37]/60 bg-[#cc9d37]/5' : 'border-white/15 hover:border-white/30 bg-white/3'}`}>
                                        <input type="file" accept="image/*" className="hidden"
                                            onChange={e => { if (e.target.files[0]) handleSlipUpload(e.target.files[0]); }} />
                                        {slipUploading ? (
                                            <><Loader2 size={20} className="text-[#cc9d37] animate-spin"/><span className="text-[11px] text-white/50">กำลังตรวจสอบสลิป…</span></>
                                        ) : slipOcr ? (
                                            <div className="w-full px-3 space-y-1 text-xs">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[#cc9d37] font-black">✅ ตรวจสอบสลิปแล้ว</span>
                                                    <span className={`px-2 py-0.5 rounded-full font-black text-[10px] ${slipOcr.confidence >= 0.8 ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                                        {Math.round((slipOcr.confidence || 0) * 100)}% match
                                                    </span>
                                                </div>
                                                {slipOcr.amount && <div className="flex justify-between text-white/70"><span>ยอด</span><span className="font-bold text-white">฿{Number(slipOcr.amount).toLocaleString('th-TH',{minimumFractionDigits:2})}</span></div>}
                                                {slipOcr.refNumber && <div className="flex justify-between text-white/70"><span>Ref.</span><span className="font-bold text-white/80 truncate max-w-[55%]">{slipOcr.refNumber}</span></div>}
                                                {slipOcr.date && <div className="flex justify-between text-white/70"><span>วันที่</span><span className="font-bold text-white/80">{slipOcr.date}</span></div>}
                                                {slipOcr.bankName && <div className="flex justify-between text-white/70"><span>ธนาคาร</span><span className="font-bold text-white/80">{slipOcr.bankName}</span></div>}
                                                {slipOcr.confidence < 0.8 && <div className="text-amber-400 text-[10px] pt-1">⚠️ ความมั่นใจต่ำ — ตรวจสอบด้วยตนเองก่อนยืนยัน</div>}
                                                <button onClick={e => { e.preventDefault(); setSlipFile(null); setSlipOcr(null); }}
                                                    className="mt-1 text-white/30 hover:text-red-400 text-[10px] underline">เปลี่ยนสลิป</button>
                                            </div>
                                        ) : (
                                            <><span className="text-2xl">🧾</span><span className="text-[11px] text-white/40 font-bold">คลิกเพื่อแนบสลิปโอนเงิน</span><span className="text-[10px] text-white/25">รองรับ JPG / PNG / HEIC</span></>
                                        )}
                                    </label>
                                </div>
                                </>
                            )}

                            {/* Full / Deposit */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-white/50 tracking-widest">ประเภทการชำระ</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[[false,'ชำระเต็ม','💯'],[true,'มัดจำ','📋']].map(([val,label,icon]) => (
                                        <button key={String(val)} onClick={() => setPaymentForm(f => ({ ...f, isDeposit: val }))}
                                            className={`py-3 rounded-xl font-black text-xs uppercase transition-all ${paymentForm.isDeposit === val ? 'bg-[#cc9d37] text-[#0c1a2f]' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>
                                            {icon} {label}
                                        </button>
                                    ))}
                                </div>
                                {paymentForm.isDeposit && (
                                    <input type="number" placeholder="จำนวนมัดจำ (฿)" value={paymentForm.depositAmount}
                                        onChange={e => setPaymentForm(f => ({ ...f, depositAmount: e.target.value }))}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold outline-none focus:border-[#cc9d37]/50 placeholder:text-white/20 transition-all" />
                                )}
                            </div>

                            {/* Discount */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-white/50 tracking-widest">ส่วนลด</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <input type="number" placeholder="ส่วนลด (฿)" value={paymentForm.discountAmount}
                                        onChange={e => setPaymentForm(f => ({ ...f, discountAmount: e.target.value, discountPercent: '' }))}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold outline-none focus:border-[#cc9d37]/50 placeholder:text-white/20 transition-all" />
                                    <input type="number" placeholder="ส่วนลด (%)" value={paymentForm.discountPercent}
                                        onChange={e => setPaymentForm(f => ({ ...f, discountPercent: e.target.value, discountAmount: '' }))}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold outline-none focus:border-[#cc9d37]/50 placeholder:text-white/20 transition-all" />
                                </div>
                                <input type="text" placeholder="โค้ดโปรโมชั่น" value={paymentForm.promoCode}
                                    onChange={e => setPaymentForm(f => ({ ...f, promoCode: e.target.value }))}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold outline-none focus:border-[#cc9d37]/50 placeholder:text-white/20 transition-all uppercase" />
                            </div>

                            {/* Staff */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-white/50 tracking-widest">พนักงาน</label>
                                <div className="grid grid-cols-1 gap-2">
                                    {/* พนักงานดูแล — read-only จาก customer profile */}
                                    <div className={`w-full px-4 py-3 rounded-xl border flex items-center justify-between ${assignedStaff ? 'bg-[#cc9d37]/10 border-[#cc9d37]/40' : 'bg-white/5 border-white/10'}`}>
                                        <span className="text-[10px] font-black uppercase text-white/40 tracking-wider">👤 พนักงานดูแลลูกค้า</span>
                                        {assignedStaff
                                            ? <span className="font-black text-sm text-[#cc9d37]">{assignedStaff.firstName} {assignedStaff.lastName || ''}<span className="text-white/40 font-normal text-[10px] ml-1">({assignedStaff.employeeId || 'assigned'})</span></span>
                                            : <span className="text-white/30 text-sm italic">ไม่มีข้อมูล</span>
                                        }
                                    </div>
                                    {/* พนักงานปิดการขาย — selectable */}
                                    <select value={paymentForm.closedById} onChange={e => setPaymentForm(f => ({ ...f, closedById: e.target.value }))}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold outline-none focus:border-[#cc9d37]/50 transition-all">
                                        <option value="">🏆 พนักงานปิดการขาย</option>
                                        {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.employeeId})</option>)}
                                    </select>
                                    {/* แคชเชีย — selectable, default = current user */}
                                    <select value={paymentForm.cashierId} onChange={e => setPaymentForm(f => ({ ...f, cashierId: e.target.value }))}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold outline-none focus:border-[#cc9d37]/50 transition-all">
                                        <option value="">🧾 แคชเชีย (ออกบิล)</option>
                                        {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.employeeId})</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Notes */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-white/50 tracking-widest">หมายเหตุ</label>
                                <textarea placeholder="หมายเหตุ (ถ้ามี)" value={paymentForm.notes}
                                    onChange={e => setPaymentForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold outline-none focus:border-[#cc9d37]/50 placeholder:text-white/20 transition-all resize-none" />
                            </div>
                        </div>

                        {/* Footer buttons */}
                        <div className="px-8 py-5 border-t border-white/10 flex gap-3">
                            <button onClick={() => { setShowPaymentModal(false); setShowCustomerModal(true); }}
                                className="flex-1 py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-white/60 font-black text-sm uppercase transition-all">
                                ← ย้อนกลับ
                            </button>
                            <button
                                onClick={() => processOrder(pendingCustomer, paymentForm)}
                                disabled={paymentForm.isDeposit && !paymentForm.depositAmount}
                                className="flex-[2] py-4 bg-[#cc9d37] hover:bg-[#cc9d37] disabled:opacity-40 rounded-2xl text-[#0c1a2f] font-black text-sm uppercase transition-all">
                                ✅ ยืนยันชำระเงิน
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Customer Modal ── */}
            {showCustomerModal && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-lg p-6">
                    <div className="bg-[#111827] border border-[#cc9d37]/30 p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md flex flex-col gap-6">
                        <div className="text-center">
                            <h2 className="text-3xl font-black text-[#F8F8F6] italic uppercase mb-2">
                                {showRegisterForm ? 'ลงทะเบียนลูกค้าใหม่' : 'ค้นหาลูกค้า'}
                            </h2>
                            <p className="text-[#cc9d37] text-[10px] font-black uppercase tracking-widest">Customer Authentication</p>
                        </div>

                        <div className="space-y-4">
                            {!showRegisterForm ? (
                                <>
                                    <input
                                        type="text"
                                        placeholder="เบอร์โทรศัพท์"
                                        value={customerPhone}
                                        onChange={(e) => setCustomerPhone(e.target.value)}
                                        className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold placeholder:text-white/20 focus:border-[#cc9d37]/50 outline-none transition-all text-center text-xl"
                                    />
                                    {customerError && (
                                        <div className="flex flex-col items-center gap-3">
                                            <p className="text-red-500 text-[10px] font-black text-center uppercase">{customerError}</p>
                                            <button
                                                onClick={() => setShowRegisterForm(true)}
                                                className="text-[#cc9d37] flex items-center gap-2 font-black text-[10px] uppercase hover:underline"
                                            >
                                                <UserPlus size={14} /> สร้างลูกค้าใหม่
                                            </button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <input
                                            type="text"
                                            placeholder="ชื่อ"
                                            value={regForm.firstName}
                                            onChange={(e) => setRegForm({...regForm, firstName: e.target.value})}
                                            className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold placeholder:text-white/20 outline-none focus:border-[#cc9d37]/50"
                                        />
                                        <input
                                            type="text"
                                            placeholder="นามสกุล"
                                            value={regForm.lastName}
                                            onChange={(e) => setRegForm({...regForm, lastName: e.target.value})}
                                            className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold placeholder:text-white/20 outline-none focus:border-[#cc9d37]/50"
                                        />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="ชื่อเล่น (ถ้ามี)"
                                        value={regForm.nickName}
                                        onChange={(e) => setRegForm({...regForm, nickName: e.target.value})}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold placeholder:text-white/20 outline-none focus:border-[#cc9d37]/50"
                                    />
                                    <input
                                        type="text"
                                        disabled
                                        value={customerPhone}
                                        className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white font-bold opacity-50"
                                    />
                                    {customerError && <p className="text-red-500 text-[10px] font-black text-center uppercase">{customerError}</p>}
                                </div>
                            )}
                        </div>

                        {/* Guest fallback — ลูกค้าไม่มีสมาชิก กดข้ามได้เลยตรงนี้ */}
                        {!showRegisterForm && (
                            <button
                                onClick={() => {
                                    setIsGuestMode(true);
                                    setShowCustomerModal(false);
                                    setOrderTypeForm(f => ({ ...f, type: f.type || 'TAKE_AWAY' }));
                                    openPaymentModal({
                                        id: 'guest-customer-00000000-0000-0000-0000-000000000000',
                                        firstName: 'ลูกค้า', lastName: 'ทั่วไป',
                                        customerId: 'WALK-IN-GUEST',
                                    });
                                }}
                                className="w-full py-3 rounded-xl border border-dashed border-white/15 text-white/40 hover:border-white/30 hover:text-white/60 hover:bg-white/5 font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                            >
                                <Users size={13} />
                                ลูกค้าทั่วไป / ไม่มีสมาชิก — ข้ามขั้นตอนนี้
                            </button>
                        )}

                        <div className="flex gap-4">
                            <button
                                onClick={() => { setShowCustomerModal(false); setShowRegisterForm(false); setCustomerError(''); }}
                                className="flex-1 px-6 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest border border-white/10 text-white/40 hover:bg-white/5 transition-all"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={showRegisterForm ? handleRegisterCustomer : handleConfirmCheckout}
                                disabled={customerLookupLoading || !customerPhone.trim()}
                                className="flex-1 bg-[#cc9d37] text-[#0c1a2f] px-6 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-400 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                            >
                                {customerLookupLoading ? <Loader2 size={16} className="animate-spin" /> : 'ยืนยัน'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Main Content ── */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-8 pt-6 pb-4 flex-shrink-0">
                    <div>
                        <h1 className="text-2xl font-black text-white tracking-tight">V School POS</h1>
                        <p className="text-white/30 text-[11px] font-bold mt-0.5">
                            {new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                    </div>
                    <div className="relative">
                        <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
                        <input
                            type="text"
                            placeholder={mainMode === 'course' ? 'ค้นหาคอร์ส...' : mainMode === 'food' ? 'ค้นหาเมนูอาหาร...' : 'ค้นหาอุปกรณ์...'}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-72 pl-11 pr-5 py-3 bg-[#1a2535] border border-white/8 rounded-2xl text-white text-sm font-medium placeholder:text-white/20 focus:border-[#cc9d37]/40 outline-none transition-all"
                        />
                    </div>
                </div>

                {/* ── Main Mode Toggle ── */}
                <div className="flex items-center gap-2.5 px-8 pb-4 flex-shrink-0 flex-wrap">
                    {[
                        { key: 'course',    label: 'คอร์สเรียน', icon: '🎓',
                          count: products.filter(p => ['japanese_culinary','specialty','management','arts','package','full_course','course'].includes(p.category)).length },
                        { key: 'food',      label: 'อาหาร',      icon: '🍜',
                          count: products.filter(p => ['food','side_dish','beverage','snack','dessert'].includes(p.category)).length },
                        { key: 'equipment', label: 'อุปกรณ์',    icon: '🔪',
                          count: products.filter(p => p.category === 'equipment').length },
                    ].map(({ key, label, icon, count }) => (
                        <button
                            key={key}
                            onClick={() => { setMainMode(key); setActiveCategory('All'); }}
                            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-2xl font-black text-sm flex-shrink-0 transition-all ${
                                mainMode === key
                                    ? 'bg-[#cc9d37] text-[#0c1a2f] shadow-lg shadow-[#cc9d37]/20'
                                    : 'bg-[#1a2535] text-white/35 hover:text-white/60 border border-white/8'
                            }`}
                        >
                            <span className="text-base leading-none">{icon}</span>
                            <span>{label}</span>
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-lg ${
                                mainMode === key ? 'bg-[#0c1a2f]/20 text-[#0c1a2f]' : 'bg-white/8 text-white/25'
                            }`}>{count}</span>
                        </button>
                    ))}
                    <div className="flex-1 h-px mx-2" style={{ background: 'rgba(255,255,255,0.05)' }} />
                    <span className="text-white/15 text-[10px] font-black uppercase tracking-widest">
                        {filteredProducts.length} รายการ
                    </span>
                </div>

                {/* Sub-Category Pills */}
                <div className="flex gap-2.5 px-8 pb-4 overflow-x-auto flex-shrink-0 custom-scrollbar">
                    {categories.map(cat => {
                        const isActive = activeCategory === cat;
                        const icon = subCatIcons[cat] || '📚';
                        return (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs flex-shrink-0 transition-all border ${
                                    isActive
                                        ? 'border-[#cc9d37]/60 bg-[#cc9d37]/10 text-white/90'
                                        : 'border-white/6 bg-[#1a2535]/70 text-white/30 hover:text-white/55 hover:border-white/15'
                                }`}
                            >
                                <span className="text-sm leading-none">{icon}</span>
                                <span>{categoryLabels[cat] || cat}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Product Grid — image-first cards */}
                <div className="flex-1 overflow-y-auto px-8 pb-6 custom-scrollbar">
                    {filteredProducts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 gap-4">
                            <span className="text-5xl opacity-20">
                                {mainMode === 'food' ? '🍜' : mainMode === 'equipment' ? '🔪' : '🎓'}
                            </span>
                            <p className="text-white/20 text-xs font-black uppercase tracking-[0.2em]">
                                {fetchError
                                    ? `โหลดไม่สำเร็จ — ${fetchError}`
                                    : search
                                    ? `ไม่พบ "${search}"`
                                    : mainMode === 'food' ? 'ยังไม่มีรายการอาหาร'
                                    : mainMode === 'equipment' ? 'ยังไม่มีรายการอุปกรณ์'
                                    : 'ยังไม่มีคอร์ส'}
                            </p>
                            {fetchError && (
                                <button
                                    className="text-[#cc9d37] text-[10px] font-black uppercase tracking-widest hover:underline"
                                    onClick={() => {
                                        setFetchError(null);
                                        setLoading(true);
                                        fetch('/api/products')
                                            .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
                                            .then(data => { setProducts(Array.isArray(data) ? data : []); setLoading(false); })
                                            .catch(err => { setFetchError(err.message); setLoading(false); });
                                    }}
                                >ลองใหม่</button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filteredProducts.map(product => {
                                const inCart = cart.find(i => i.id === product.id);
                                return (
                                    <div
                                        key={product.id}
                                        onClick={() => setSelectedProduct(product)}
                                        className="cursor-pointer group select-none"
                                    >
                                        {/* Image card */}
                                        <div className={`relative w-full aspect-square rounded-2xl overflow-hidden mb-3 transition-all duration-200 ${
                                            inCart
                                                ? 'ring-2 ring-[#cc9d37]/70 shadow-lg shadow-[#cc9d37]/10'
                                                : 'hover:ring-2 hover:ring-white/15'
                                        }`}>
                                            {product.image ? (
                                                <>
                                                    <img
                                                        src={product.image}
                                                        alt={product.name}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                        onError={(e) => { e.target.style.display = 'none'; }}
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                                                </>
                                            ) : (
                                                <ProductPlaceholder category={product.category} name={product.name} />
                                            )}

                                            {/* Cart qty badge */}
                                            {inCart && (
                                                <div className="absolute top-2 left-2 bg-[#cc9d37] text-[#0c1a2f] min-w-[22px] h-[22px] px-1 rounded-lg flex items-center justify-center text-[10px] font-black shadow-lg">
                                                    {inCart.quantity}
                                                </div>
                                            )}

                                            {/* Hand dominance badge (top-right on image) */}
                                            {product.hand && (
                                                <div className={`absolute top-2 right-2 px-1.5 py-0.5 rounded-md text-[9px] font-black shadow-md ${
                                                    product.hand === 'LEFT'
                                                        ? 'bg-blue-500/80 text-white'
                                                        : product.hand === 'RIGHT'
                                                        ? 'bg-violet-500/80 text-white'
                                                        : 'bg-white/20 text-white'
                                                }`}>
                                                    {product.hand === 'LEFT' ? '✋L' : product.hand === 'RIGHT' ? 'R✋' : 'L/R'}
                                                </div>
                                            )}

                                            {/* Quick-add button */}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); addItem(product); }}
                                                className="absolute bottom-2 right-2 w-9 h-9 bg-[#cc9d37] hover:bg-amber-300 text-[#0c1a2f] rounded-xl flex items-center justify-center shadow-lg transition-all active:scale-90 opacity-0 group-hover:opacity-100"
                                            >
                                                <Plus size={16} />
                                            </button>

                                            {/* Shipping weight tag (bottom-left on image) — equipment only */}
                                            {product.shippingWeightG && (
                                                <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-sm text-white/70 px-1.5 py-0.5 rounded-md text-[9px] font-bold">
                                                    📦 {product.shippingWeightG}g
                                                </div>
                                            )}
                                        </div>

                                        {/* Name + price */}
                                        <div className="px-0.5">
                                            <h4 className="text-white font-bold text-[12px] leading-snug line-clamp-2 mb-1">
                                                {product.name}
                                            </h4>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-[#cc9d37] font-black text-sm">
                                                    ฿{Number(product.price).toLocaleString()}
                                                </span>
                                                {product.hours && (
                                                    <span className="text-white/25 text-[10px]">{product.hours} ชม.</span>
                                                )}
                                            </div>
                                            {/* Equipment spec micro-tags */}
                                            {product.category === 'equipment' && (
                                                <div className="flex flex-wrap gap-1">
                                                    {product.material && (
                                                        <span className="px-1.5 py-0.5 rounded-md bg-[#1a2535] border border-white/8 text-[8px] font-bold text-white/40">
                                                            {product.material}
                                                        </span>
                                                    )}
                                                    {product.size && (
                                                        <span className="px-1.5 py-0.5 rounded-md bg-[#1a2535] border border-white/8 text-[8px] font-bold text-white/40">
                                                            {product.size}
                                                        </span>
                                                    )}
                                                    {product.originCountry && COUNTRY_MAP[product.originCountry] && (
                                                        <span className="px-1.5 py-0.5 rounded-md bg-[#1a2535] border border-white/8 text-[8px] font-bold text-white/40">
                                                            {COUNTRY_MAP[product.originCountry].flag}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Product Detail Modal ── */}
            {selectedProduct && (
                <ProductDetailModal
                    product={selectedProduct}
                    onClose={() => setSelectedProduct(null)}
                    onAddToCart={(p) => { addItem(p); setSelectedProduct(null); }}
                    inCart={cart.find(i => i.id === selectedProduct.id)}
                    onProductUpdate={(updated) => {
                        setProducts(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));
                        setSelectedProduct(prev => prev?.id === updated.id ? { ...prev, ...updated } : prev);
                    }}
                />
            )}

            {/* ── Order Panel (right) ── */}
            <div className="w-[300px] bg-[#111827] border-l border-white/8 flex flex-col flex-shrink-0">

                {/* Panel header */}
                <div className="px-6 pt-6 pb-5 flex items-center justify-between border-b border-white/8 flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-black text-white">Order</h2>
                        <p className="text-white/30 text-[11px] font-bold mt-0.5">Walk In · {cart.length} รายการ</p>
                    </div>
                    <div className="w-8 h-8 rounded-xl bg-[#cc9d37]/10 border border-[#cc9d37]/25 flex items-center justify-center">
                        <ShoppingBasket size={14} className="text-[#cc9d37]" />
                    </div>
                </div>

                {/* ── Customer Card / Search ── */}
                <div className="px-4 py-3 border-b border-white/8 flex-shrink-0">
                    {cartCustomer ? (
                        // Customer Card
                        <div className="bg-white/5 rounded-2xl p-3 space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-[#cc9d37]/20 flex items-center justify-center text-sm font-black text-[#cc9d37]">
                                        {(cartCustomer.firstName || '?')[0]}
                                    </div>
                                    <div>
                                        <div className="font-black text-white text-sm leading-tight">
                                            {cartCustomer.firstName} {cartCustomer.lastName || ''}
                                            {cartCustomer.nickName ? <span className="text-white/40 font-normal text-[10px] ml-1">({cartCustomer.nickName})</span> : null}
                                        </div>
                                        <div className="text-white/30 text-[10px]">{cartCustomer.phonePrimary || cartCustomer.customerId}</div>
                                    </div>
                                </div>
                                <button onClick={() => setCartCustomer(null)} className="text-white/20 hover:text-white/60 transition-colors"><X size={14}/></button>
                            </div>

                            {/* Tier + VP */}
                            {(() => {
                                const tier = cartCustomer.membershipTier || 'TIER1';
                                const meta = TIER_META[tier] || TIER_META['TIER1'];
                                const vp = cartCustomer.vpPoints || 0;
                                const spend = cartCustomer.totalSpend || 0;
                                const NEXT_SPEND = { TIER1: 20000, TIER2: 50000, TIER3: 100000, TIER4: 200000, TIER5: null };
                                const nextSpend = NEXT_SPEND[tier];
                                const spendPct = nextSpend ? Math.min(100, Math.round((spend / nextSpend) * 100)) : 100;
                                return (
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${meta.bg}`} style={{ color: meta.color }}>
                                                {meta.badge} {meta.label}
                                            </span>
                                            <span className="text-[#cc9d37] font-black text-[11px]">
                                                {vp.toLocaleString()} <span className="text-white/40 font-normal">V Point</span>
                                            </span>
                                        </div>
                                        {/* Milestone bar */}
                                        {nextSpend && (
                                            <div className="space-y-0.5">
                                                <div className="flex justify-between text-[9px] text-white/30">
                                                    <span>ยอดสะสม ฿{spend.toLocaleString()}</span>
                                                    <span>เป้า ฿{nextSpend.toLocaleString()}</span>
                                                </div>
                                                <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                                                    <div className="h-full rounded-full transition-all" style={{ width: `${spendPct}%`, background: meta.color }}/>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    ) : (
                        // Search input
                        <div className="relative">
                            <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl border border-white/8 focus-within:border-[#cc9d37]/40 transition-all">
                                <Search size={13} className="text-white/30 flex-shrink-0"/>
                                <input
                                    type="text"
                                    value={cartCustomerSearch}
                                    onChange={e => searchCartCustomer(e.target.value)}
                                    placeholder="ค้นหาสมาชิก (ชื่อ / เบอร์)"
                                    className="flex-1 bg-transparent text-white text-xs font-bold outline-none placeholder:text-white/20"
                                />
                                {cartCustomerLoading && <Loader2 size={12} className="text-white/30 animate-spin flex-shrink-0"/>}
                            </div>
                            {cartCustomerResults.length > 0 && (
                                <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-[#1a2535] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                                    {cartCustomerResults.map(c => {
                                        const tier = c.membershipTier || 'TIER1';
                                        const meta = TIER_META[tier] || TIER_META['TIER1'];
                                        return (
                                            <button key={c.id} onClick={() => selectCartCustomer(c)}
                                                className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-white/5 transition-colors text-left">
                                                <div className="w-7 h-7 rounded-full bg-[#cc9d37]/15 flex items-center justify-center text-xs font-black text-[#cc9d37] flex-shrink-0">
                                                    {(c.firstName || '?')[0]}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-white text-xs font-bold truncate">{c.firstName} {c.lastName || ''} {c.nickName ? `(${c.nickName})` : ''}</div>
                                                    <div className="text-white/30 text-[10px]">{c.phonePrimary || ''}</div>
                                                </div>
                                                <span className="text-[9px] font-black flex-shrink-0" style={{ color: meta.color }}>{meta.badge}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Cart items */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 custom-scrollbar">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center gap-3 py-12">
                            <ShoppingCart size={36} className="text-white/10" />
                            <p className="text-white/15 text-[10px] font-black uppercase tracking-widest">ยังไม่มีรายการ</p>
                        </div>
                    ) : (
                        cart.map(item => {
                            const emoji = getEmoji(item.category, item.name);
                            return (
                                <div key={item.id} className="flex items-start gap-3 group">
                                    {/* Thumbnail */}
                                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-[#1a2535] flex-shrink-0">
                                        {item.image ? (
                                            <img
                                                src={item.image}
                                                alt={item.name}
                                                className="w-full h-full object-cover"
                                                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                            />
                                        ) : null}
                                        <div className={`w-full h-full items-center justify-center text-2xl bg-[#1a2535] ${item.image ? 'hidden' : 'flex'}`}>
                                            {emoji}
                                        </div>
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white text-[11px] font-bold leading-snug line-clamp-2">
                                            {item.name} ({item.quantity}x)
                                        </p>
                                        <p className="text-white/30 text-[10px] mt-0.5">
                                            • {categoryLabels[item.category] || item.category}
                                        </p>
                                        {/* Qty controls */}
                                        <div className="flex items-center gap-2 mt-2">
                                            <button
                                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                className="w-5 h-5 rounded-md bg-white/8 text-white/40 hover:text-[#cc9d37] flex items-center justify-center transition-colors"
                                            ><Minus size={9} /></button>
                                            <span className="text-white/60 text-[10px] font-black w-4 text-center">{item.quantity}</span>
                                            <button
                                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                className="w-5 h-5 rounded-md bg-white/8 text-white/40 hover:text-[#cc9d37] flex items-center justify-center transition-colors"
                                            ><Plus size={9} /></button>
                                        </div>
                                    </div>

                                    {/* Price + delete */}
                                    <div className="text-right flex-shrink-0 pt-0.5">
                                        <p className="text-white font-black text-sm">฿{(item.price * item.quantity).toLocaleString()}</p>
                                        <button
                                            onClick={() => removeItem(item.id)}
                                            className="text-white/15 hover:text-red-400 transition-colors mt-1.5 block ml-auto"
                                        ><Trash2 size={11} /></button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Totals + Checkout */}
                <div className="px-6 pb-6 pt-4 border-t border-white/8 flex-shrink-0 space-y-2.5">
                    <div className="flex justify-between text-white/40 text-[11px] font-bold">
                        <span>Sub Total</span>
                        <span>฿{subtotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-white/40 text-[11px] font-bold">
                        <span>Tax (7%)</span>
                        <span>฿{tax.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="border-t border-dashed border-white/15 pt-3 flex justify-between items-center">
                        <span className="text-white font-black text-sm">Total</span>
                        <span className="text-white font-black text-xl">฿{total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    </div>

                    <button
                        disabled={cart.length === 0}
                        onClick={handleCheckout}
                        className="w-full mt-1 bg-[#cc9d37] hover:bg-amber-400 disabled:bg-white/8 disabled:text-white/15 text-[#0c1a2f] py-4 rounded-2xl font-black text-sm shadow-lg shadow-[#cc9d37]/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        <ShoppingBasket size={16} />
                        ชำระเงิน
                    </button>

                    {/* Guest shortcut — ข้ามขั้นตอนค้นหาสมาชิก */}
                    <button
                        disabled={cart.length === 0}
                        onClick={handleGuestCheckout}
                        className="w-full py-2.5 rounded-2xl font-black text-[11px] uppercase tracking-wider disabled:opacity-30 transition-all flex items-center justify-center gap-1.5 text-white/40 hover:text-white/70 hover:bg-white/5 active:scale-95"
                    >
                        <Users size={13} />
                        ลูกค้าทั่วไป / ไม่มีสมาชิก
                    </button>
                </div>
            </div>
        </div>
    );
}
