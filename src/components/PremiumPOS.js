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

// ─── Product Detail Modal ─────────────────────────────────────────────────
const SESSION_LABEL = { MORNING: 'เช้า', AFTERNOON: 'บ่าย', EVENING: 'เย็น' };

function ProductDetailModal({ product, onClose, onAddToCart, inCart }) {
    const [data, setData] = useState(null);
    const [loadingStats, setLoadingStats] = useState(true);
    const [activeImg, setActiveImg] = useState(0);

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

                    {/* Enrollment / Student Stats */}
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

    const categories = ['All', 'japanese_culinary', 'specialty', 'management', 'arts', 'package', 'full_course'];

    const categoryLabels = {
        EN: {
            japanese_culinary: 'Japanese',
            specialty: 'Specialty',
            management: 'Management',
            arts: 'Arts',
            package: 'Package',
            full_course: 'Full Course',
            All: 'All'
        },
        TH: {
            japanese_culinary: 'อาหารญี่ปุ่น',
            specialty: 'พิเศษ',
            management: 'การจัดการ',
            arts: 'ศิลปะ',
            package: 'แพ็คเกจ',
            full_course: 'คอร์สเต็ม',
            All: 'ทั้งหมด'
        }
    }[language];

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
            const matchesCategory = activeCategory === 'All' || p.category === activeCategory;
            return matchesSearch && matchesCategory;
        });
    }, [products, search, activeCategory]);

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
            <div className="flex h-full items-center justify-center bg-[#0A1A2F]/50 rounded-[2.5rem] border border-white/10">
                <div className="text-[#C9A34E] font-black animate-pulse uppercase tracking-[0.3em]">กำลังโหลด...</div>
            </div>
        );
    }

    return (
        <div className="flex flex-col lg:flex-row h-full bg-[#0A1A2F]/50 rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl animate-fade-in relative">
            {/* Success Modal */}
            {checkoutSuccess && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#0A1A2F]/80 backdrop-blur-md">
                    <div className="bg-[#C9A34E] text-[#0A1A2F] p-12 rounded-[3rem] shadow-2xl flex flex-col items-center gap-6 animate-scale-up">
                        <CheckCircle size={112} />
                        <h2 className="text-4xl font-black italic tracking-tight">SUCCESS!</h2>
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

            {/* Customer Modal */}
            {showCustomerModal && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#0A1A2F]/90 backdrop-blur-lg p-6">
                    <div className="bg-[#0A1A2F] border border-[#C9A34E]/30 p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md flex flex-col gap-6">
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

            {/* Main Content */}
            <div className="flex-1 flex flex-col p-8 overflow-hidden">
                <div className="flex items-center justify-between mb-10">
                    <div>
                        <h1 className="text-4xl font-black text-[#F8F8F6] tracking-tight italic uppercase">{labels.title}</h1>
                        <p className="text-[#C9A34E] text-[10px] font-black uppercase tracking-[0.3em] mt-1">Premium Retail Intelligence</p>
                    </div>
                    <div className="relative w-80">
                        <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" />
                        <input
                            type="text"
                            placeholder={labels.search}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-14 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold placeholder:text-white/20 focus:bg-white/10 focus:border-[#C9A34E]/50 transition-all outline-none"
                        />
                    </div>
                </div>

                {/* Categories */}
                <div className="flex gap-3 mb-10 overflow-x-auto pb-2 custom-scrollbar">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border ${activeCategory === cat ? 'bg-[#C9A34E] border-[#C9A34E] text-[#0A1A2F] shadow-lg shadow-[#C9A34E]/20' : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white'}`}
                        >
                            {categoryLabels[cat] || cat}
                        </button>
                    ))}
                </div>

                {/* Product Grid — POS-optimised compact cards */}
                <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 content-start custom-scrollbar">
                    {/* Empty / error state */}
                    {filteredProducts.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-24 gap-4 text-center">
                            <span style={{ fontSize: '3rem' }}>🍽️</span>
                            <p className="font-black text-xs uppercase tracking-[0.2em] text-white/20">
                                {fetchError
                                    ? `โหลดสินค้าไม่สำเร็จ — ${fetchError}`
                                    : search
                                        ? `ไม่พบสินค้า "${search}"`
                                        : 'ยังไม่มีสินค้าในระบบ'}
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
                                >
                                    ลองใหม่
                                </button>
                            )}
                        </div>
                    )}
                    {filteredProducts.map(product => {
                        const emoji = getEmoji(product.category, product.name);
                        const inCart = cart.find(i => i.id === product.id);
                        return (
                            <div
                                key={product.id}
                                onClick={() => setSelectedProduct(product)}
                                className={`group cursor-pointer flex flex-col gap-3 rounded-2xl p-4 border transition-all duration-200 active:scale-95 select-none ${
                                    inCart
                                        ? 'bg-[#C9A34E]/10 border-[#C9A34E]/40'
                                        : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-[#C9A34E]/30'
                                }`}
                            >
                                {/* Top row: emoji icon + add button */}
                                <div className="flex items-start justify-between">
                                    <div
                                        className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                                        style={{ background: 'rgba(201,163,78,0.08)', border: '1px solid rgba(201,163,78,0.15)' }}
                                    >
                                        {emoji}
                                    </div>
                                    {/* + button — adds directly without opening modal */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); addItem(product); }}
                                        className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
                                            inCart
                                                ? 'bg-[#C9A34E] text-[#0A1A2F]'
                                                : 'bg-white/5 border border-white/10 text-white/30 group-hover:bg-[#C9A34E] group-hover:text-[#0A1A2F] group-hover:border-transparent'
                                        }`}
                                    >
                                        {inCart
                                            ? <span className="text-[9px] font-black">{inCart.quantity}</span>
                                            : <Plus size={10} />
                                        }
                                    </button>
                                </div>

                                {/* Product name */}
                                <div className="flex-1">
                                    <h4 className="font-bold text-[#F8F8F6] text-[11px] leading-snug line-clamp-2">
                                        {product.name}
                                    </h4>
                                    <p className="text-[8px] font-black uppercase tracking-widest text-white/25 mt-1">
                                        {categoryLabels[product.category] || product.category || 'คอร์ส'}
                                    </p>
                                </div>

                                {/* Price */}
                                <p className="text-[#C9A34E] font-black text-sm leading-none">
                                    ฿{Number(product.price).toLocaleString()}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Product Detail Modal */}
            {selectedProduct && (
                <ProductDetailModal
                    product={selectedProduct}
                    onClose={() => setSelectedProduct(null)}
                    onAddToCart={(p) => { addItem(p); setSelectedProduct(null); }}
                    inCart={cart.find(i => i.id === selectedProduct.id)}
                />
            )}

            {/* Cart Sidebar */}
            <div className="w-full lg:w-[400px] bg-black/30 border-l border-white/10 backdrop-blur-xl flex flex-col p-8">
                <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center text-2xl shadow-inner border border-orange-500/20">
                            <ShoppingBasket size={24} />
                        </div>
                        <h3 className="text-2xl font-black text-[#F8F8F6] tracking-tight">{labels.cart}</h3>
                    </div>
                    <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">{cart.length} Items</span>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto space-y-4 mb-8 custom-scrollbar">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-white/10 gap-4 opacity-40">
                            <ShoppingCart size={48} />
                            <p className="font-black text-xs uppercase tracking-[0.2em]">Cart Empty</p>
                        </div>
                    ) : (
                        cart.map(item => (
                            <div key={item.id} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex gap-4 group hover:bg-white/10 transition-all">
                                <img
                                    src={item.image || 'https://via.placeholder.com/100x100?text=No+Image'}
                                    className="w-14 h-14 rounded-xl object-cover grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all"
                                    alt={item.name}
                                    onError={(e) => { e.target.src = 'https://via.placeholder.com/100x100?text=V'; }}
                                />
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <h5 className="font-bold text-white text-xs mb-1 line-clamp-1">{item.name}</h5>
                                        <button onClick={() => removeItem(item.id)} className="text-white/20 hover:text-red-500 transition-colors">
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between mt-2">
                                        <div className="flex items-center gap-3 bg-black/20 px-2 py-1 rounded-lg">
                                            <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="text-white/40 hover:text-[#C9A34E]">
                                                <Minus size={10} />
                                            </button>
                                            <span className="text-xs font-black text-white w-4 text-center">{item.quantity}</span>
                                            <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="text-white/40 hover:text-[#C9A34E]">
                                                <Plus size={10} />
                                            </button>
                                        </div>
                                        <span className="text-[#C9A34E] font-black text-sm italic">฿{item.price * item.quantity}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="mt-auto space-y-6 pt-6 border-t border-white/10">
                    <div className="space-y-3">
                        <div className="flex justify-between text-white/40 text-[10px] font-black uppercase tracking-widest">
                            <span>Subtotal</span>
                            <span>฿{subtotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-white/40 text-[10px] font-black uppercase tracking-widest">
                            <span>Tax (7%)</span>
                            <span>฿{tax.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between text-2xl font-black text-[#F8F8F6] italic pt-2 border-t border-white/5">
                            <span className="text-[#C9A34E] uppercase tracking-tighter">Total</span>
                            <span>฿{total.toLocaleString()}</span>
                        </div>
                    </div>

                    <button
                        disabled={cart.length === 0}
                        onClick={handleCheckout}
                        className="w-full bg-[#C9A34E] hover:bg-amber-400 disabled:bg-white/5 disabled:text-white/10 text-[#0A1A2F] py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-xl shadow-[#C9A34E]/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                        {labels.checkout}
                        <ArrowRight size={10} />
                    </button>
                </div>
            </div>
        </div>
    );
}
