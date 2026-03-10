'use client';

import React, { useState } from 'react';

const INITIAL_PRODUCTS = [
    { id: '1', name: 'Thai Iced Tea', category: 'Drinks', price: 65, image: 'https://images.unsplash.com/photo-1558857563-b371f31ca706?w=200&h=200&fit=crop' },
    { id: '2', name: 'Green Tea Latte', category: 'Drinks', price: 75, image: 'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?w=200&h=200&fit=crop' },
    { id: '3', name: 'Pad Thai', category: 'Food', price: 120, image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=200&h=200&fit=crop' },
];

export default function InventoryManager({ language = 'TH' }) {
    const [products, setProducts] = useState(INITIAL_PRODUCTS);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    const [formData, setFormData] = useState({ name: '', price: '', category: 'Drinks', image: '' });

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase())
    );

    const handleOpenModal = (product = null) => {
        if (product) {
            setEditingProduct(product);
            setFormData({ name: product.name, price: product.price, category: product.category, image: product.image });
        } else {
            setEditingProduct(null);
            setFormData({ name: '', price: '', category: 'Drinks', image: '' });
        }
        setIsModalOpen(true);
    };

    const handleSave = (e) => {
        e.preventDefault();
        if (editingProduct) {
            setProducts(products.map(p => p.id === editingProduct.id ? { ...p, ...formData, price: Number(formData.price) } : p));
        } else {
            setProducts([...products, { ...formData, id: Date.now().toString(), price: Number(formData.price) }]);
        }
        setIsModalOpen(false);
    };

    const labels = {
        EN: { title: 'Product Inventory', add: 'Add Product', name: 'Name', price: 'Price', category: 'Category', actions: 'Actions' },
        TH: { title: 'คลังสินค้าแนวใหม่', add: 'เพิ่มสินค้า', name: 'ชื่อสินค้า', price: 'ราคา', category: 'หมวดหมู่', actions: 'จัดการ' }
    }[language];

    return (
        <div className="p-8 max-w-7xl mx-auto animate-fade-in bg-[#0A1A2F]/30 rounded-[3rem] border border-white/10 shadow-3xl">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div>
                    <h1 className="text-4xl font-black text-[#F8F8F6] tracking-tight italic uppercase">{labels.title}</h1>
                    <p className="text-[#C9A34E] text-[10px] font-black uppercase tracking-[0.3em] mt-2">Inventory Control & Distribution</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-[#C9A34E] text-[#0A1A2F] px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center gap-3 shadow-xl shadow-[#C9A34E]/20"
                >
                    <Plus size={18} />
                    {labels.add}
                </button>
            </div>

            {/* Search */}
            <div className="relative mb-10 max-w-xl">
                <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-white/20"></i>
                <input
                    type="text"
                    placeholder="Search products..."
                    className="w-full pl-14 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold placeholder:text-white/20 focus:bg-white/10 focus:border-[#C9A34E]/50 transition-all outline-none shadow-xl"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* Table Section */}
            <div className="bg-white/5 rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/5">
                                <th className="px-8 py-6 text-[10px] font-black text-white/20 uppercase tracking-widest">Image</th>
                                <th className="px-8 py-6 text-[10px] font-black text-white/20 uppercase tracking-widest">{labels.name}</th>
                                <th className="px-8 py-6 text-[10px] font-black text-white/20 uppercase tracking-widest">{labels.category}</th>
                                <th className="px-8 py-6 text-[10px] font-black text-white/20 uppercase tracking-widest">{labels.price}</th>
                                <th className="px-8 py-6 text-[10px] font-black text-white/20 uppercase tracking-widest text-right">{labels.actions}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredProducts.map(p => (
                                <tr key={p.id} className="hover:bg-white/5 transition-all group">
                                    <td className="px-8 py-6">
                                        <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-xl border border-white/10 relative">
                                            <img src={p.image} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" alt="" />
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className="font-bold text-[#F8F8F6] text-sm group-hover:text-[#C9A34E] transition-colors">{p.name}</span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className="px-3 py-1 bg-[#C9A34E]/10 border border-[#C9A34E]/30 rounded-full text-[9px] font-black text-[#C9A34E] uppercase tracking-widest">
                                            {p.category}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className="font-black text-white text-lg italic tracking-tight">฿{p.price}</span>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex justify-end gap-3">
                                            <button
                                                onClick={() => handleOpenModal(p)}
                                                className="w-10 h-10 bg-white/5 hover:bg-[#C9A34E] hover:text-[#0A1A2F] text-white/40 rounded-xl transition-all flex items-center justify-center"
                                            >
                                                <i className="fas fa-edit"></i>
                                            </button>
                                            <button
                                                onClick={() => { setDeletingId(p.id); setIsDeleteModalOpen(true); }}
                                                className="w-10 h-10 bg-white/5 hover:bg-red-500 hover:text-white text-white/40 rounded-xl transition-all flex items-center justify-center"
                                            >
                                                <i className="fas fa-trash"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* CRUD Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#0A1A2F]/80 backdrop-blur-md p-6 animate-fade-in">
                    <div className="bg-[#F8F8F6] w-full max-w-2xl rounded-[3rem] shadow-3xl overflow-hidden animate-scale-up border-8 border-[#0A1A2F]/10">
                        <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h2 className="text-3xl font-black text-[#0A1A2F] italic tracking-tight uppercase leading-none">
                                {editingProduct ? 'Update Product' : 'Provision Asset'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 bg-white rounded-full shadow-md flex items-center justify-center text-slate-400 hover:text-[#0A1A2F] transition-all"><i className="fas fa-times"></i></button>
                        </div>
                        <form onSubmit={handleSave} className="p-10 grid grid-cols-2 gap-8">
                            <div className="col-span-2 space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Product Identification</label>
                                <input required className="w-full bg-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-700 focus:ring-4 focus:ring-[#C9A34E]/20 focus:bg-white transition-all outline-none" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Premium Thai Wagyu" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Pricing (THB)</label>
                                <input required type="number" className="w-full bg-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-700 focus:ring-4 focus:ring-[#C9A34E]/20 focus:bg-white transition-all outline-none" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Classification</label>
                                <select className="w-full bg-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-700 outline-none" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                    <option>Drinks</option>
                                    <option>Food</option>
                                    <option>Desserts</option>
                                </select>
                            </div>
                            <div className="col-span-2 space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Visual Asset (URL)</label>
                                <input className="w-full bg-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-700 focus:ring-4 focus:ring-[#C9A34E]/20 focus:bg-white transition-all outline-none" value={formData.image} onChange={e => setFormData({ ...formData, image: e.target.value })} placeholder="https://unsplash..." />
                            </div>
                            <div className="col-span-2 flex gap-4 mt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-5 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 border-2 border-slate-100 hover:bg-slate-50 transition-all">Cancel</button>
                                <button type="submit" className="flex-1 py-5 bg-[#0A1A2F] text-white rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl hover:scale-[1.02] transition-all">Save Asset</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* DELETE MODAL */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-[130] flex items-center justify-center bg-[#0A1A2F]/90 backdrop-blur-xl p-6">
                    <div className="bg-white rounded-[3rem] p-12 text-center max-w-md animate-scale-up">
                        <div className="w-24 h-24 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8 text-4xl shadow-inner"><i className="fas fa-trash"></i></div>
                        <h3 className="text-3xl font-black text-[#0A1A2F] italic uppercase mb-2">Eliminate?</h3>
                        <p className="text-slate-400 font-bold text-sm mb-10 leading-relaxed uppercase tracking-widest">Are you sure you want to remove this asset? This action is permanent.</p>
                        <div className="flex gap-4">
                            <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-4 text-slate-400 font-black uppercase tracking-widest hover:underline">Cancel</button>
                            <button onClick={handleDelete} className="flex-1 py-5 bg-red-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-2xl shadow-red-600/20">Remove</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
