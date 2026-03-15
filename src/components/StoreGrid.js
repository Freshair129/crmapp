'use client';
import { useState } from 'react';
import { 
    ShoppingBasket, 
    CheckCircle2, 
    Star, 
    PackageOpen, 
    ShoppingBag, 
    X, 
    Coins, 
    Trash2, 
    Wallet, 
    ArrowRight 
} from 'lucide-react';

export default function StoreGrid({ products = [], allProducts = [], activeCustomer, onSelectProduct, onAddToCart, cart = [], setCart, onCheckout, isCartOpen, setIsCartOpen }) {
    const [paymentMethod, setPaymentMethod] = useState('wallet'); // 'wallet' or 'transfer'
    const cartTotal = (cart || []).reduce((sum, item) => sum + ((item?.price || 0) * (item?.qty || 0)), 0);
    const cartItemCount = (cart || []).reduce((sum, item) => sum + (item?.qty || 0), 0);

    function removeFromCart(productId, type) {
        if (setCart && cart) {
            setCart(cart.filter(c => !(c?.id === productId && c?.type === type)));
        }
    }

    return (
        <div className="animate-fade-in relative min-h-full">
            {/* Sticky Header with Glassmorphism */}
            <div className="sticky top-0 z-40 -mx-10 px-10 py-4 mb-6 bg-slate-900/50 backdrop-blur-xl border-b border-white/10 flex items-center justify-between shadow-2xl">
                <div>
                    <h2 className="text-2xl font-black text-white tracking-tight">Course Store</h2>
                    <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">Premium Learning Catalog</p>
                </div>

                {activeCustomer && (
                    <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-2 rounded-[2rem] pl-6 shadow-inner">
                        <div className="text-right hidden md:block">
                            <p className="text-[9px] text-white/30 font-black uppercase tracking-[0.2em] leading-none mb-1">Shopping For</p>
                            <p className="text-sm font-black text-white leading-none">
                                {activeCustomer.profile?.nick_name || activeCustomer.profile?.first_name || activeCustomer.name}
                            </p>
                        </div>

                        {/* Avatar */}
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black shadow-lg border border-white/20 ${activeCustomer.profile?.membership_tier === 'ELITE' || activeCustomer.level === 'Elite' ? 'bg-gradient-to-tr from-cyan-400 to-blue-600' :
                            activeCustomer.profile?.membership_tier === 'PLATINUM' || activeCustomer.level === 'Platinum' ? 'bg-gradient-to-tr from-slate-300 to-slate-500' :
                                'bg-gradient-to-tr from-amber-400 to-orange-500'
                            }`}>
                            {(activeCustomer.profile?.nick_name || activeCustomer.profile?.first_name || activeCustomer.name || 'C').charAt(0)}
                        </div>

                        {/* Integrated Cart Button - Locked to User */}
                        <div className="h-10 w-[1px] bg-white/10 ml-1 mr-1"></div>

                        <button
                            onClick={() => setIsCartOpen(true)}
                            className="w-12 h-12 bg-gradient-to-tr from-orange-600 to-amber-500 text-white rounded-2xl shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all group relative border border-white/20"
                        >
                            <ShoppingBasket className="w-5 h-5 group-hover:animate-bounce" />
                            {cartItemCount > 0 && (
                                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-lg animate-bounce-short">
                                    {cartItemCount}
                                </span>
                            )}
                        </button>
                    </div>
                )}
            </div>

            {/* Product Grid - Full Width now */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xxl:grid-cols-5 gap-4">
                {(products || []).filter(p => p).map((product) => {
                    const hasDiscount = product.base_price && product.base_price > product.price;
                    const discountPercent = hasDiscount
                        ? Math.round(((product.base_price - product.price) / product.base_price) * 100)
                        : 0;

                    // Check ownership (recursive for bundles)
                    const isOwned = activeCustomer?.inventory?.learning_courses?.some(item => {
                        // 1. Direct match (Stand-alone Course or Bundle Header)
                        if (item.course_id === product.id || item.bundle_id === product.id) return true;

                        // 2. Nested match (Course inside a Bundle)
                        if (item.type === 'bundle' && item.items) {
                            return item.items.some(subItem => subItem.course_id === product.id);
                        }
                        return false;
                    });

                    return (
                        <div
                            key={`${product.type}-${product.id}`}
                            onClick={() => onSelectProduct(product)}
                            className={`bg-white rounded-xl overflow-hidden border transition-all duration-500 cursor-pointer group flex flex-col h-full ${isOwned
                                ? 'border-slate-200 opacity-80 hover:opacity-100 grayscale hover:grayscale-0'
                                : 'border-slate-200 hover:border-orange-400 hover:shadow-2xl hover:-translate-y-2'
                                }`}
                        >
                            {/* Image Section */}
                            <div className="aspect-[4/5] bg-slate-50 relative overflow-hidden">
                                <img
                                    src={product.image || 'https://via.placeholder.com/400?text=V+School'}
                                    alt={product.name}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                                />

                                {/* Badges container */}
                                <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
                                    <div className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${product.type === 'bundle'
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'bg-white/90 backdrop-blur-sm text-slate-700 shadow-sm'
                                        }`}>
                                        {product.type === 'bundle' ? 'Package' : 'Course'}
                                    </div>

                                    {isOwned && (
                                        <div className="bg-green-500 text-white px-2 py-0.5 rounded text-[10px] font-bold shadow-sm flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3" /> OWNED
                                        </div>
                                    )}

                                    {!isOwned && hasDiscount && (
                                        <div className="bg-red-500 text-white px-2 py-0.5 rounded text-[10px] font-bold shadow-sm animate-pulse">
                                            SAVE {discountPercent}%
                                        </div>
                                    )}
                                </div>

                                {/* Quick View Overlay (appears on hover) */}
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
                                    <div className="bg-white text-orange-600 px-4 py-2 rounded-full font-bold text-xs shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                                        VIEW DETAILS
                                    </div>
                                </div>
                            </div>

                            {/* Info Section */}
                            <div className="p-4 flex-1 flex flex-col">
                                <h3 className="font-bold text-slate-800 text-sm leading-snug line-clamp-2 h-10 mb-3 group-hover:text-orange-600 transition-colors">
                                    {product.name}
                                </h3>

                                <div className="mt-auto">
                                    {/* Price Row */}
                                    <div className="flex flex-col mb-2">
                                        {hasDiscount && (
                                            <span className="text-[11px] text-slate-400 line-through">
                                                ฿{product.base_price.toLocaleString()}
                                            </span>
                                        )}
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-orange-600 font-extrabold text-lg">
                                                ฿{(product.price || 0).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Footer Row (Rating + Sold count feel) */}
                                    <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                                        <div className="flex items-center gap-1">
                                            <div className="flex text-amber-400">
                                                <Star className="w-2.5 h-2.5 fill-current" />
                                                <Star className="w-2.5 h-2.5 fill-current" />
                                                <Star className="w-2.5 h-2.5 fill-current" />
                                                <Star className="w-2.5 h-2.5 fill-current" />
                                                <Star className="w-2.5 h-2.5 fill-current" />
                                            </div>
                                            <span className="text-[10px] font-medium text-slate-400">5.0</span>
                                        </div>
                                        <div className="text-[10px] text-slate-400">
                                            1.2k+ Sold
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {products.length === 0 && (
                    <div className="text-center py-20 text-slate-400 col-span-full">
                        <PackageOpen className="w-10 h-10 mb-4 mx-auto opacity-20" />
                        <p>Loading products...</p>
                    </div>
                )}
            </div>

            {/* Cart Popup Overlay */}
            {isCartOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-end animate-fade-in">
                    <div
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        onClick={() => setIsCartOpen(false)}
                    ></div>

                    <div className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col animate-slide-in-right border-l border-slate-200">
                        {/* Cart Header - Fixed at Top */}
                        <div className="flex-shrink-0 border-b border-slate-100 p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600">
                                        <ShoppingBag className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-800 text-xl tracking-tight">Shopping Cart</h3>
                                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{cartItemCount} items selected</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsCartOpen(false)}
                                    className="w-10 h-10 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full flex items-center justify-center transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Mini Profile Section */}
                            {activeCustomer && (
                                <div className="p-4 bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl text-white shadow-xl relative overflow-hidden border border-white/10">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>

                                    <div className="relative z-10 flex items-center gap-4">
                                        {/* Avatar */}
                                        <div className="relative">
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shadow-inner overflow-hidden border-2 border-white/20 ${activeCustomer.profile?.membership_tier === 'ELITE' ? 'bg-gradient-to-tr from-cyan-400 to-blue-600' :
                                                activeCustomer.profile?.membership_tier === 'PLATINUM' ? 'bg-gradient-to-tr from-slate-300 to-slate-400' :
                                                    'bg-gradient-to-tr from-amber-400 to-yellow-600'
                                                }`}>
                                                {activeCustomer.profile?.profile_picture ? (
                                                    <img src={activeCustomer.profile.profile_picture} alt="Avatar" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span>{(activeCustomer.profile?.nick_name || activeCustomer.profile?.first_name || 'C').charAt(0)}</span>
                                                )}
                                            </div>
                                            <div className="absolute -bottom-1 -right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-slate-800"></div>
                                        </div>

                                        {/* Name & Tier */}
                               
