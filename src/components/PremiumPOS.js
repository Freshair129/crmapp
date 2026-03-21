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
             style={{ background: 'linear-gradient(135deg, #0d2240 0%, #152A47 60%, #1a1a2e 100%)' }}>
            <span style={{ fontSize: '2.8rem', lineHeight: 1, filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))' }}>
                {emoji}
            </span>
            <span className="text-[#C9A34E] text-[7px] font-black uppercase tracking-[0.2em] opacity-70">
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
                                            className={`w-10 h-10 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${i === activeImg ? 'border-[#C9A34E]' : 'border-white/20 opacity-60 hover:opacity-100'}`}
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
                             style={{ background: 'linear-gradient(135deg,#0d2240 0%,#152A47 60%,#1a1a2e 100%)' }}>
                            <span style={{ fontSize: '4rem', lineHeight: 1, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.6))' }}>{emoji}</span>
                            <span className="text-[#C9A34E] text-[8px] font-black uppercase tracking-[0.3em] opacity-60">V SCHOOL</span>
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
                            <p className="text-2xl font-black text-[#C9A34E]">฿{Number(product.price).toLocaleString()}</p>
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
                        <span className="px-2.5 py-1 rounded-lg bg-[#C9A34E]/10 border border-[#C9A34E]/20 text-[10px] font-black text-[#C9A34E]">
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

                    {/* ── Equipment Specs Panel ── */}
                    {isEquipment && (
                        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 space-y-3">
                            <p className="text-[9px] font-black uppercase tracking-widest text-white/25 flex items-center gap-1.5">
                                🔪 ข้อมูลอุปกรณ์
                            </p>

                            {/* read-only chips row */}
                            <div className="flex flex-wrap gap-2">
                                {product.size && (
                                    <span className="px-2.5 py-1 rounded-lg bg-[#1a2535] border border-white/10 text-[10px] font-black text-white/55">
                                        📦 {product.size}
                                    </span>
                                )}
                                {product.dimension && (
                                    <span className="px-2.5 py-1 rounded-lg bg-[#1a2535] border border-white/10 text-[10px] font-black text-white/55">
                                        📐 {product.dimension}
                                    </span>
                                )}
                                {product.unitAmount && product.unitType && (
                                    <span className="px-2.5 py-1 rounded-lg bg-[#1a2535] border border-white/10 text-[10px] font-black text-white/55">
                                        ⚖️ {product.unitAmount} {product.unitType}
                                    </span>
                                )}
                                {(product.originCountry || specEdit.originCountry) && (
                                    <span className="px-2.5 py-1 rounded-lg bg-[#C9A34E]/10 border border-[#C9A34E]/20 text-[10px] font-black text-[#C9A34E]">
                                        {COUNTRY_MAP[specEdit.originCountry || product.originCountry]?.flag} {COUNTRY_MAP[specEdit.originCountry || product.originCountry]?.label}
                                    </span>
                                )}
                            </div>

                            {/* editable: brand + country */}
                            <div className="grid grid-cols-2 gap-2">
                                {/* Brand */}
                                <div>
                                    <label className="text-[8px] font-black uppercase tracking-widest text-white/20 block mb-1">ยี่ห้อ</label>
                                    <input
                                        type="text"
                                        value={specEdit.brand}
                                        onChange={e => setSpecEdit(s => ({ ...s, brand: e.target.value }))}
                                        onBlur={() => saveSpec({ brand: specEdit.brand })}
                                        placeholder="เช่น Masahiro, Suehiro"
                                        className="w-full px-3 py-2 rounded-xl bg-[#1a2535] border border-white/10 text-white text-[11px] font-bold placeholder:text-white/15 outline-none focus:border-[#C9A34E]/40 transition-all"
                                    />
                                </div>

                                {/* Origin country dropdown */}
                                <div>
                                    <label className="text-[8px] font-black uppercase tracking-widest text-white/20 block mb-1">ประเทศผู้ผลิต</label>
                                    <select
                                        value={specEdit.originCountry}
                                        onChange={e => {
                                            const val = e.target.value;
                                            setSpecEdit(s => ({ ...s, originCountry: val }));
                                            saveSpec({ originCountry: val });
                                        }}
                                        className="w-full px-3 py-2 rounded-xl bg-[#1a2535] border border-white/10 text-white text-[11px] font-bold outline-none focus:border-[#C9A34E]/40 transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="">— เลือกประเทศ —</option>
                                        {ORIGIN_COUNTRIES.map(c => (
                                            <option key={c.code} value={c.code}>
                                                {c.flag} {c.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* save indicator */}
                            {(specSaving || specSaved) && (
                                <p className={`text-[9px] font-black text-right transition-all ${specSaved ? 'text-green-400' : 'text-white/30'}`}>
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
                                    <p className="text-lg font-black text-[#C9A34E]">{stats.totalSold}</p>
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
                        className="w-full flex items-center justify-center gap-3 bg-[#C9A34E] hover:bg-amber-400 text-[#0A1A2F] py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all active:scale-95"
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

    const handleCheckout = () => {
        setShowCustomerModal(true);
        setShowRegisterForm(false);
        setCustomerError('');
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
                await processOrder(customer);
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

            await processOrder(customer);
        } catch (error) {
            setCustomerError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
        } finally {
            setCustomerLookupLoading(false);
        }
    };

    const processOrder = async (customer) => {
        try {
            const orderRes = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customerId: customer.id,
                    totalAmount: total,
                    items: cart.map(i => ({
                        productId: i.productId || i.id,
                        name: i.name,
                        price: i.price,
                        qty: i.quantity
                    })),
                    status: 'CLOSED',
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

                setShowCustomerModal(false);
                setCustomerPhone('');
                setCustomerError('');
                setCheckoutSuccess(true);
                setTimeout(() => {
                    setCheckoutSuccess(false);
                    setCart([]);
                    setEnrollmentCount(0);
                }, 4000);
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
                <div className="text-[#C9A34E] font-black animate-pulse uppercase tracking-[0.3em]">กำลังโหลด...</div>
            </div>
        );
    }

    return (
        <div className="flex h-full overflow-hidden bg-[#0d1626] rounded-[2.5rem] animate-fade-in relative">
            {/* ── Success Modal ── */}
            {checkoutSuccess && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
                    <div className="bg-[#C9A34E] text-[#0A1A2F] p-12 rounded-[3rem] shadow-2xl flex flex-col items-center gap-6 animate-scale-up">
                        <CheckCircle size={96} />
                        <h2 className="text-4xl font-black tracking-tight">SUCCESS!</h2>
                        <div className="text-center">
                            <p className="font-bold opacity-80 uppercase tracking-widest text-xs mb-2">Transaction Processed</p>
                            {enrollmentCount > 0 && (
                                <p className="font-black text-sm border-t border-[#0A1A2F]/10 pt-2">
                                    ✅ ลงทะเบียนคอร์ส {enrollmentCount} รายการแล้ว
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Customer Modal ── */}
            {showCustomerModal && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-lg p-6">
                    <div className="bg-[#111827] border border-[#C9A34E]/30 p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md flex flex-col gap-6">
                        <div className="text-center">
                            <h2 className="text-3xl font-black text-[#F8F8F6] italic uppercase mb-2">
                                {showRegisterForm ? 'ลงทะเบียนลูกค้าใหม่' : 'ค้นหาลูกค้า'}
                            </h2>
                            <p className="text-[#C9A34E] text-[10px] font-black uppercase tracking-widest">Customer Authentication</p>
                        </div>

                        <div className="space-y-4">
                            {!showRegisterForm ? (
                                <>
                                    <input
                                        type="text"
                                        placeholder="เบอร์โทรศัพท์"
                                        value={customerPhone}
                                        onChange={(e) => setCustomerPhone(e.target.value)}
                                        className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold placeholder:text-white/20 focus:border-[#C9A34E]/50 outline-none transition-all text-center text-xl"
                                    />
                                    {customerError && (
                                        <div className="flex flex-col items-center gap-3">
                                            <p className="text-red-500 text-[10px] font-black text-center uppercase">{customerError}</p>
                                            <button
                                                onClick={() => setShowRegisterForm(true)}
                                                className="text-[#C9A34E] flex items-center gap-2 font-black text-[10px] uppercase hover:underline"
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
                                            className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold placeholder:text-white/20 outline-none focus:border-[#C9A34E]/50"
                                        />
                                        <input
                                            type="text"
                                            placeholder="นามสกุล"
                                            value={regForm.lastName}
                                            onChange={(e) => setRegForm({...regForm, lastName: e.target.value})}
                                            className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold placeholder:text-white/20 outline-none focus:border-[#C9A34E]/50"
                                        />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="ชื่อเล่น (ถ้ามี)"
                                        value={regForm.nickName}
                                        onChange={(e) => setRegForm({...regForm, nickName: e.target.value})}
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-bold placeholder:text-white/20 outline-none focus:border-[#C9A34E]/50"
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
                                className="flex-1 bg-[#C9A34E] text-[#0A1A2F] px-6 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-400 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
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
                            className="w-72 pl-11 pr-5 py-3 bg-[#1a2535] border border-white/8 rounded-2xl text-white text-sm font-medium placeholder:text-white/20 focus:border-[#C9A34E]/40 outline-none transition-all"
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
                                    ? 'bg-[#C9A34E] text-[#0A1A2F] shadow-lg shadow-[#C9A34E]/20'
                                    : 'bg-[#1a2535] text-white/35 hover:text-white/60 border border-white/8'
                            }`}
                        >
                            <span className="text-base leading-none">{icon}</span>
                            <span>{label}</span>
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-lg ${
                                mainMode === key ? 'bg-[#0A1A2F]/20 text-[#0A1A2F]' : 'bg-white/8 text-white/25'
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
                                        ? 'border-[#C9A34E]/60 bg-[#C9A34E]/10 text-white/90'
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
                                    className="text-[#C9A34E] text-[10px] font-black uppercase tracking-widest hover:underline"
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
                                                ? 'ring-2 ring-[#C9A34E]/70 shadow-lg shadow-[#C9A34E]/10'
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
                                                <div className="absolute top-2 left-2 bg-[#C9A34E] text-[#0A1A2F] min-w-[22px] h-[22px] px-1 rounded-lg flex items-center justify-center text-[10px] font-black shadow-lg">
                                                    {inCart.quantity}
                                                </div>
                                            )}

                                            {/* Quick-add button */}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); addItem(product); }}
                                                className="absolute bottom-2 right-2 w-9 h-9 bg-[#C9A34E] hover:bg-amber-300 text-[#0A1A2F] rounded-xl flex items-center justify-center shadow-lg transition-all active:scale-90 opacity-0 group-hover:opacity-100"
                                            >
                                                <Plus size={16} />
                                            </button>
                                        </div>

                                        {/* Name + price */}
                                        <div className="px-0.5">
                                            <h4 className="text-white font-bold text-[12px] leading-snug line-clamp-2 mb-1">
                                                {product.name}
                                            </h4>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[#C9A34E] font-black text-sm">
                                                    ฿{Number(product.price).toLocaleString()}
                                                </span>
                                                {product.hours && (
                                                    <span className="text-white/25 text-[10px]">{product.hours} ชม.</span>
                                                )}
                                            </div>
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
                    <div className="w-8 h-8 rounded-xl bg-[#C9A34E]/10 border border-[#C9A34E]/25 flex items-center justify-center">
                        <ShoppingBasket size={14} className="text-[#C9A34E]" />
                    </div>
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
                                                className="w-5 h-5 rounded-md bg-white/8 text-white/40 hover:text-[#C9A34E] flex items-center justify-center transition-colors"
                                            ><Minus size={9} /></button>
                                            <span className="text-white/60 text-[10px] font-black w-4 text-center">{item.quantity}</span>
                                            <button
                                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                className="w-5 h-5 rounded-md bg-white/8 text-white/40 hover:text-[#C9A34E] flex items-center justify-center transition-colors"
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
                        className="w-full mt-1 bg-[#C9A34E] hover:bg-amber-400 disabled:bg-white/8 disabled:text-white/15 text-[#0A1A2F] py-4 rounded-2xl font-black text-sm shadow-lg shadow-[#C9A34E]/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        <ShoppingBasket size={16} />
                        ชำระเงิน
                    </button>
                </div>
            </div>
        </div>
    );
}
