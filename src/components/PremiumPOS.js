'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { CheckCircle, Loader2, Search, Plus, ShoppingBasket, ShoppingCart, Trash2, Minus, ArrowRight } from 'lucide-react';

export default function PremiumPOS({ language = 'TH' }) {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [cart, setCart] = useState([]);
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');
    const [checkoutSuccess, setCheckoutSuccess] = useState(false);
    
    const [customerPhone, setCustomerPhone] = useState('');
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [customerLookupLoading, setCustomerLookupLoading] = useState(false);
    const [customerError, setCustomerError] = useState('');

    useEffect(() => {
        fetch('/api/products')
            .then(r => r.json())
            .then(data => {
                setProducts(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
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
                setCustomerError('ไม่พบลูกค้า กรุณาลงทะเบียนก่อน');
                setCustomerLookupLoading(false);
                return;
            }

            await fetch('/api/orders', {
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

            setShowCustomerModal(false);
            setCustomerPhone('');
            setCustomerError('');
            setCheckoutSuccess(true);
            setTimeout(() => {
                setCheckoutSuccess(false);
                setCart([]);
            }, 3000);
        } catch (error) {
            setCustomerError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
        } finally {
            setCustomerLookupLoading(false);
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
                        <p className="font-bold opacity-80 uppercase tracking-widest text-xs">Transaction Processed</p>
                    </div>
                </div>
            )}

            {/* Customer Modal */}
            {showCustomerModal && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#0A1A2F]/90 backdrop-blur-lg p-6">
                    <div className="bg-[#0A1A2F] border border-[#C9A34E]/30 p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md flex flex-col gap-6">
                        <div className="text-center">
                            <h2 className="text-3xl font-black text-[#F8F8F6] italic uppercase mb-2">ค้นหาลูกค้า</h2>
                            <p className="text-[#C9A34E] text-[10px] font-black uppercase tracking-widest">Customer Authentication</p>
                        </div>
                        
                        <div className="space-y-2">
                            <input
                                type="text"
                                placeholder="เบอร์โทรศัพท์"
                                value={customerPhone}
                                onChange={(e) => setCustomerPhone(e.target.value)}
                                className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold placeholder:text-white/20 focus:border-[#C9A34E]/50 outline-none transition-all text-center text-xl"
                            />
                            {customerError && <p className="text-red-500 text-[10px] font-black text-center uppercase">{customerError}</p>}
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => { setShowCustomerModal(false); setCustomerError(''); }}
                                className="flex-1 px-6 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest border border-white/10 text-white/40 hover:bg-white/5 transition-all"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleConfirmCheckout}
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

                {/* Grid */}
                <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 content-start custom-scrollbar">
                    {filteredProducts.map(product => (
                        <div
                            key={product.id}
                            onClick={() => addItem(product)}
                            className="group bg-white/5 border border-white/5 hover:border-[#C9A34E]/30 rounded-[2rem] p-4 transition-all duration-500 cursor-pointer relative overflow-hidden active:scale-95"
                        >
                            <div className="aspect-square bg-slate-900 rounded-2xl mb-4 overflow-hidden relative">
                                <img 
                                    src={product.image || 'https://via.placeholder.com/300x300?text=No+Image'} 
                                    className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700" 
                                    alt={product.name} 
                                    onError={(e) => { e.target.src = 'https://via.placeholder.com/300x300?text=V+School'; }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0A1A2F] to-transparent opacity-60"></div>
                                <div className="absolute top-2 right-2 bg-white/10 backdrop-blur-md px-2 py-1 rounded text-[8px] font-black text-[#C9A34E] uppercase tracking-widest border border-white/5">
                                    {product.category}
                                </div>
                            </div>
                            <div>
                                <h4 className="font-bold text-[#F8F8F6] text-sm leading-tight mb-2 line-clamp-1">{product.name}</h4>
                                <div className="flex items-center justify-between">
                                    <span className="text-[#C9A34E] font-black text-lg italic">฿{product.price}</span>
                                    <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-white/40 group-hover:bg-[#C9A34E] group-hover:text-[#0A1A2F] transition-all">
                                        <Plus size={14} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

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

