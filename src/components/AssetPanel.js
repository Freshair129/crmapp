'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Monitor, ChefHat, Briefcase, Box, Plus, Edit3, MapPin, User, X, Loader2, Search, Camera, Trash2, ImageIcon, Save } from 'lucide-react';

const MAX_PHOTOS = 5;

// Client-side image compression using Canvas
async function compressImage(file, maxWidthPx = 1200, qualityJpeg = 0.75) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;
                if (width > maxWidthPx) {
                    height = Math.round((height * maxWidthPx) / width);
                    width = maxWidthPx;
                }
                canvas.width = width;
                canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', qualityJpeg));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

export default function AssetPanel({ language = 'TH' }) {
    const [loading, setLoading] = useState(true);
    const [assets, setAssets] = useState([]);
    const [filter, setFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [saving, setSaving] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const fileInputRef = useRef(null);

    const emptyForm = {
        name: '', category: 'GENERAL', status: 'ACTIVE',
        location: '', vendor: '', serialNumber: '',
        purchasePrice: '', purchaseDate: '', warrantyExpiry: '', notes: ''
    };
    const [form, setForm] = useState(emptyForm);
    const [editForm, setEditForm] = useState({});

    const t = {
        TH: {
            title: 'ทะเบียนคุมสินทรัพย์', add: 'เพิ่มอุปกรณ์', all: 'ทั้งหมด',
            marketing: 'การตลาด', kitchen: 'ห้องครัว', office: 'สำนักงาน', general: 'ทั่วไป',
            active: 'ใช้งานปกติ', repair: 'ส่งซ่อม', broken: 'ชำรุด', disposed: 'จำหน่ายออก',
            search: 'ค้นหารหัสหรือชื่ออุปกรณ์...', total: 'ทั้งหมด', needsAttention: 'ต้องดูแล',
            save: 'บันทึก', create: 'ลงทะเบียนใหม่', cancel: 'ยกเลิก',
            addModal: 'ลงทะเบียนอุปกรณ์ใหม่', editModal: 'แก้ไขข้อมูลอุปกรณ์',
            photos: 'รูปภาพอุปกรณ์', addPhoto: 'เพิ่มรูป',
            photoLimit: `สูงสุด ${MAX_PHOTOS} รูป`,
            name: 'ชื่ออุปกรณ์ *', category: 'หมวดหมู่ *', status: 'สถานะ *',
            location: 'สถานที่ *', vendor: 'ผู้จำหน่าย', serial: 'Serial Number',
            price: 'ราคาที่ซื้อ (บาท)', purchaseDate: 'วันที่ซื้อ', warrantyExpiry: 'วันหมดประกัน',
            notes: 'หมายเหตุ',
        },
        EN: {
            title: 'ASSET MANAGEMENT', add: 'Add Asset', all: 'ALL',
            marketing: 'MARKETING', kitchen: 'KITCHEN', office: 'OFFICE', general: 'GENERAL',
            active: 'ACTIVE', repair: 'IN REPAIR', broken: 'BROKEN', disposed: 'DISPOSED',
            search: 'Search ID or name...', total: 'TOTAL', needsAttention: 'ATTENTION',
            save: 'SAVE', create: 'REGISTER NEW', cancel: 'Cancel',
            addModal: 'REGISTER NEW ASSET', editModal: 'EDIT ASSET',
            photos: 'ASSET PHOTOS', addPhoto: 'ADD PHOTO',
            photoLimit: `Max ${MAX_PHOTOS} photos`,
            name: 'Asset Name *', category: 'Category *', status: 'Status *',
            location: 'Location *', vendor: 'Vendor', serial: 'Serial Number',
            price: 'Purchase Price (THB)', purchaseDate: 'Purchase Date', warrantyExpiry: 'Warranty Expiry',
            notes: 'Notes',
        }
    }[language];

    useEffect(() => { fetchAssets(); }, []);

    const fetchAssets = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/assets');
            const data = await res.json();
            setAssets(Array.isArray(data) ? data : []);
        } catch (err) { console.error('[AssetPanel] fetchAssets failed', err); }
        finally { setLoading(false); }
    };

    // ── Add new asset ──────────────────────────────────────────
    const handleSubmitAdd = async (e) => {
        e.preventDefault();
        if (!form.name || !form.location) return alert('กรุณากรอกชื่อและสถานที่');
        try {
            setSaving(true);
            const res = await fetch('/api/assets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    purchasePrice: form.purchasePrice ? Number(form.purchasePrice) : undefined,
                    purchaseDate: form.purchaseDate || undefined,
                    warrantyExpiry: form.warrantyExpiry || undefined,
                })
            });
            if (!res.ok) throw new Error('Failed');
            const created = await res.json();
            setAssets(prev => [created, ...prev]);
            setShowAddModal(false);
            setForm(emptyForm);
        } catch { alert('เกิดข้อผิดพลาด'); }
        finally { setSaving(false); }
    };

    // ── Open edit modal ────────────────────────────────────────
    const openEdit = (asset) => {
        setSelectedAsset(asset);
        setEditForm({
            name: asset.name || '',
            category: asset.category || 'GENERAL',
            status: asset.status || 'ACTIVE',
            location: asset.location || '',
            vendor: asset.vendor || '',
            serialNumber: asset.serialNumber || '',
            purchasePrice: asset.purchasePrice || '',
            purchaseDate: asset.purchaseDate ? asset.purchaseDate.split('T')[0] : '',
            warrantyExpiry: asset.warrantyExpiry ? asset.warrantyExpiry.split('T')[0] : '',
            notes: asset.notes || '',
        });
    };

    // ── Save edit ──────────────────────────────────────────────
    const handleSubmitEdit = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            const res = await fetch(`/api/assets/${selectedAsset.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...editForm,
                    purchasePrice: editForm.purchasePrice ? Number(editForm.purchasePrice) : undefined,
                    purchaseDate: editForm.purchaseDate || undefined,
                    warrantyExpiry: editForm.warrantyExpiry || undefined,
                })
            });
            if (!res.ok) throw new Error('Failed');
            const updated = await res.json();
            setAssets(prev => prev.map(a => a.id === updated.id ? { ...a, ...updated } : a));
            setSelectedAsset(prev => ({ ...prev, ...updated }));
        } catch { alert('บันทึกไม่สำเร็จ'); }
        finally { setSaving(false); }
    };

    // ── Photo upload ───────────────────────────────────────────
    const handlePhotoUpload = async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        const currentCount = Array.isArray(selectedAsset?.photos) ? selectedAsset.photos.length : 0;
        const remaining = MAX_PHOTOS - currentCount;
        if (remaining <= 0) { alert(`ครบ ${MAX_PHOTOS} รูปแล้ว`); return; }

        setUploadingPhoto(true);
        try {
            for (const file of files.slice(0, remaining)) {
                const compressed = await compressImage(file);
                const res = await fetch(`/api/assets/${selectedAsset.id}/photos`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ photo: compressed })
                });
                if (!res.ok) { const err = await res.json(); alert(err.error); break; }
                const { photos } = await res.json();
                setSelectedAsset(prev => ({ ...prev, photos }));
                setAssets(prev => prev.map(a => a.id === selectedAsset.id ? { ...a, photos } : a));
            }
        } catch { alert('อัพโหลดรูปไม่สำเร็จ'); }
        finally { setUploadingPhoto(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
    };

    // ── Photo delete ───────────────────────────────────────────
    const handleDeletePhoto = async (index) => {
        if (!confirm('ลบรูปนี้?')) return;
        try {
            const res = await fetch(`/api/assets/${selectedAsset.id}/photos`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ index })
            });
            if (!res.ok) throw new Error();
            const { photos } = await res.json();
            setSelectedAsset(prev => ({ ...prev, photos }));
            setAssets(prev => prev.map(a => a.id === selectedAsset.id ? { ...a, photos } : a));
        } catch { alert('ลบรูปไม่สำเร็จ'); }
    };

    const filtered = assets.filter(asset => {
        const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) || asset.assetId.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = filter === 'ALL' || asset.category === filter;
        const matchesStatus = statusFilter === 'ALL' || asset.status === statusFilter;
        return matchesSearch && matchesCategory && matchesStatus;
    });

    const activeCount = assets.filter(a => a.status === 'ACTIVE').length;
    const attentionCount = assets.filter(a => ['IN_REPAIR', 'BROKEN'].includes(a.status)).length;

    const CategoryIcon = ({ cat, size = 20 }) => {
        switch (cat) {
            case 'MARKETING': return <Monitor size={size} />;
            case 'KITCHEN': return <ChefHat size={size} />;
            case 'OFFICE': return <Briefcase size={size} />;
            default: return <Box size={size} />;
        }
    };

    const statusColors = {
        ACTIVE: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        IN_REPAIR: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        BROKEN: 'bg-red-500/10 text-red-500 border-red-500/20',
        DISPOSED: 'bg-white/5 text-white/40 border-white/10'
    };

    const inputCls = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-[#cc9d37]/50 placeholder-white/20";
    const labelCls = "block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2";

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
            <Loader2 className="w-12 h-12 text-[#cc9d37] animate-spin" />
            <span className="text-[#cc9d37] font-black animate-pulse uppercase tracking-[0.3em]">SYNCHRONIZING ASSETS...</span>
        </div>
    );

    // ── Shared form fields (used in both Add & Edit modals) ────
    const FormFields = ({ values, onChange }) => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
                <label className={labelCls}>{t.name}</label>
                <input type="text" required className={inputCls} placeholder="เช่น กล้อง Sony ZV-E10"
                    value={values.name} onChange={e => onChange('name', e.target.value)} />
            </div>
            <div>
                <label className={labelCls}>{t.category}</label>
                <select className={inputCls} value={values.category} onChange={e => onChange('category', e.target.value)}>
                    <option value="MARKETING">การตลาด</option>
                    <option value="KITCHEN">ห้องครัว</option>
                    <option value="OFFICE">สำนักงาน</option>
                    <option value="GENERAL">ทั่วไป</option>
                </select>
            </div>
            <div>
                <label className={labelCls}>{t.status}</label>
                <select className={inputCls} value={values.status} onChange={e => onChange('status', e.target.value)}>
                    <option value="ACTIVE">ใช้งานปกติ</option>
                    <option value="IN_REPAIR">ส่งซ่อม</option>
                    <option value="BROKEN">ชำรุด</option>
                    <option value="DISPOSED">จำหน่ายออก</option>
                </select>
            </div>
            <div className="md:col-span-2">
                <label className={labelCls}>{t.location}</label>
                <input type="text" required className={inputCls} placeholder="เช่น ห้องครัว ชั้น 2"
                    value={values.location} onChange={e => onChange('location', e.target.value)} />
            </div>
            <div>
                <label className={labelCls}>{t.vendor}</label>
                <input type="text" className={inputCls} placeholder="เช่น Power Buy"
                    value={values.vendor} onChange={e => onChange('vendor', e.target.value)} />
            </div>
            <div>
                <label className={labelCls}>{t.serial}</label>
                <input type="text" className={inputCls} placeholder="SN-XXXXXXXX"
                    value={values.serialNumber} onChange={e => onChange('serialNumber', e.target.value)} />
            </div>
            <div>
                <label className={labelCls}>{t.price}</label>
                <input type="number" min="0" className={inputCls} placeholder="0"
                    value={values.purchasePrice} onChange={e => onChange('purchasePrice', e.target.value)} />
            </div>
            <div>
                <label className={labelCls}>{t.purchaseDate}</label>
                <input type="date" className={inputCls}
                    value={values.purchaseDate} onChange={e => onChange('purchaseDate', e.target.value)} />
            </div>
            <div className="md:col-span-2">
                <label className={labelCls}>{t.warrantyExpiry}</label>
                <input type="date" className={inputCls}
                    value={values.warrantyExpiry} onChange={e => onChange('warrantyExpiry', e.target.value)} />
            </div>
            <div className="md:col-span-2">
                <label className={labelCls}>{t.notes}</label>
                <textarea rows={3} className={inputCls} placeholder="หมายเหตุเพิ่มเติม..."
                    value={values.notes} onChange={e => onChange('notes', e.target.value)} />
            </div>
        </div>
    );

    return (
        <div className="space-y-8">
            {/* ── Header ─────────────────────────────────────────── */}
            <div className="bg-[#0c1a2f]/50 backdrop-blur-xl rounded-[2.5rem] border border-white/10 p-8">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
                    <div>
                        <h1 className="text-4xl font-black text-[#F8F8F6] uppercase tracking-tighter mb-4">{t.title}</h1>
                        <div className="flex gap-4">
                            <div className="bg-white/5 px-6 py-2 rounded-2xl border border-white/10">
                                <p className="text-[10px] text-white/40 font-black uppercase tracking-widest">{t.total}</p>
                                <p className="text-2xl font-black text-[#cc9d37]">{assets.length}</p>
                            </div>
                            <div className="bg-emerald-500/5 px-6 py-2 rounded-2xl border border-emerald-500/20">
                                <p className="text-[10px] text-emerald-500/40 font-black uppercase tracking-widest">{t.active}</p>
                                <p className="text-2xl font-black text-emerald-500">{activeCount}</p>
                            </div>
                            <div className="bg-red-500/5 px-6 py-2 rounded-2xl border border-red-500/20">
                                <p className="text-[10px] text-red-500/40 font-black uppercase tracking-widest">{t.needsAttention}</p>
                                <p className="text-2xl font-black text-red-500">{attentionCount}</p>
                            </div>
                        </div>
                    </div>
                    <button onClick={() => setShowAddModal(true)}
                        className="bg-[#cc9d37] text-[#0c1a2f] font-black rounded-2xl px-8 py-4 flex items-center gap-3 hover:bg-amber-400 transition-all shadow-xl shadow-amber-900/20 uppercase tracking-widest text-sm">
                        <Plus size={20} /> {t.add}
                    </button>
                </div>

                <div className="flex flex-col gap-6">
                    <div className="flex flex-wrap gap-2 pb-4 border-b border-white/5">
                        {['ALL', 'MARKETING', 'KITCHEN', 'OFFICE', 'GENERAL'].map(cat => (
                            <button key={cat} onClick={() => setFilter(cat)}
                                className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all ${filter === cat ? 'bg-[#cc9d37] text-[#0c1a2f]' : 'bg-white/5 text-white/40 border border-white/10'}`}>
                                <CategoryIcon cat={cat} size={14} />
                                {cat === 'ALL' ? t.all : t[cat.toLowerCase()]}
                            </button>
                        ))}
                    </div>
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                            <input type="text" placeholder={t.search} value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                className="bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-[#cc9d37]/50 w-full font-bold" />
                        </div>
                        <select className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-black uppercase tracking-widest text-xs focus:outline-none"
                            value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                            <option value="ALL">{t.all} STATUS</option>
                            <option value="ACTIVE">{t.active}</option>
                            <option value="IN_REPAIR">{t.repair}</option>
                            <option value="BROKEN">{t.broken}</option>
                            <option value="DISPOSED">{t.disposed}</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* ── Asset Grid ─────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filtered.map(asset => {
                    const photos = Array.isArray(asset.photos) ? asset.photos : [];
                    return (
                        <div key={asset.id} onClick={() => openEdit(asset)}
                            className="bg-white/5 rounded-3xl border border-white/10 p-6 cursor-pointer hover:border-[#cc9d37]/50 hover:bg-white/[0.07] transition-all group">
                            {/* Thumbnail */}
                            {photos.length > 0 ? (
                                <div className="w-full h-32 rounded-2xl overflow-hidden mb-4">
                                    <img src={photos[0]} alt={asset.name} className="w-full h-full object-cover" />
                                </div>
                            ) : (
                                <div className="w-full h-32 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                                    <CategoryIcon cat={asset.category} size={40} />
                                </div>
                            )}
                            <div className="flex justify-between items-start mb-3">
                                <div className={`p-2 rounded-xl ${asset.status === 'ACTIVE' ? 'bg-[#cc9d37]/10 text-[#cc9d37]' : 'bg-white/5 text-white/40'}`}>
                                    <CategoryIcon cat={asset.category} size={18} />
                                </div>
                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${statusColors[asset.status]}`}>
                                    {t[asset.status?.toLowerCase().split('_').pop()]}
                                </span>
                            </div>
                            <h3 className="text-lg font-black text-white uppercase mb-1 truncate">{asset.name}</h3>
                            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-4">{asset.assetId}</p>
                            <div className="space-y-2 pt-3 border-t border-white/5">
                                <div className="flex items-center gap-2 text-white/40">
                                    <MapPin size={12} className="text-[#cc9d37]/50" />
                                    <span className="text-xs font-bold uppercase truncate">{asset.location}</span>
                                </div>
                                {photos.length > 0 && (
                                    <div className="flex items-center gap-2 text-white/30">
                                        <Camera size={12} className="text-[#cc9d37]/40" />
                                        <span className="text-xs font-bold">{photos.length}/{MAX_PHOTOS} รูป</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ══ ADD MODAL ══════════════════════════════════════════ */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#0c1a2f] border border-white/10 rounded-[2rem] p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">{t.addModal}</h2>
                            <button onClick={() => setShowAddModal(false)} className="p-2 text-white/40 hover:text-white"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleSubmitAdd} className="space-y-5">
                            <FormFields values={form} onChange={(k, v) => setForm(f => ({ ...f, [k]: v }))} />
                            <div className="flex gap-4 pt-4 border-t border-white/10">
                                <button type="button" onClick={() => setShowAddModal(false)}
                                    className="flex-1 py-4 rounded-2xl border border-white/10 text-white/60 font-black uppercase tracking-widest text-sm hover:bg-white/5 transition-all">
                                    {t.cancel}
                                </button>
                                <button type="submit" disabled={saving}
                                    className="flex-1 py-4 rounded-2xl bg-[#cc9d37] text-[#0c1a2f] font-black uppercase tracking-widest text-sm hover:bg-amber-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                    {saving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                                    {t.create}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ══ EDIT MODAL ═════════════════════════════════════════ */}
            {selectedAsset && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#0c1a2f] border border-white/10 rounded-[2rem] w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        {/* Edit header */}
                        <div className="flex justify-between items-center p-8 pb-0">
                            <div>
                                <h2 className="text-2xl font-black text-white uppercase tracking-tighter">{t.editModal}</h2>
                                <p className="text-xs font-black text-[#cc9d37] uppercase tracking-widest mt-1">{selectedAsset.assetId}</p>
                            </div>
                            <button onClick={() => setSelectedAsset(null)} className="p-2 text-white/40 hover:text-white"><X size={24} /></button>
                        </div>

                        <div className="p-8 space-y-8">
                            {/* ── Photo Section ─────────────────────────── */}
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <label className={labelCls}>{t.photos} ({Array.isArray(selectedAsset.photos) ? selectedAsset.photos.length : 0}/{MAX_PHOTOS})</label>
                                    {(Array.isArray(selectedAsset.photos) ? selectedAsset.photos.length : 0) < MAX_PHOTOS && (
                                        <button type="button" onClick={() => fileInputRef.current?.click()}
                                            disabled={uploadingPhoto}
                                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#cc9d37]/10 border border-[#cc9d37]/30 text-[#cc9d37] text-xs font-black uppercase tracking-widest hover:bg-[#cc9d37]/20 transition-all disabled:opacity-50">
                                            {uploadingPhoto ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                                            {t.addPhoto}
                                        </button>
                                    )}
                                    <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
                                </div>

                                <div className="grid grid-cols-5 gap-3">
                                    {(Array.isArray(selectedAsset.photos) ? selectedAsset.photos : []).map((photo, idx) => (
                                        <div key={idx} className="relative group aspect-square rounded-2xl overflow-hidden border border-white/10">
                                            <img src={photo} alt={`photo-${idx}`} className="w-full h-full object-cover" />
                                            <button onClick={() => handleDeletePhoto(idx)}
                                                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-red-400">
                                                <Trash2 size={20} />
                                            </button>
                                        </div>
                                    ))}
                                    {/* Empty slots */}
                                    {Array.from({ length: MAX_PHOTOS - (Array.isArray(selectedAsset.photos) ? selectedAsset.photos.length : 0) }).map((_, i) => (
                                        <div key={`empty-${i}`} onClick={() => fileInputRef.current?.click()}
                                            className="aspect-square rounded-2xl border border-dashed border-white/10 flex items-center justify-center text-white/20 cursor-pointer hover:border-[#cc9d37]/30 hover:text-[#cc9d37]/40 transition-all">
                                            <ImageIcon size={20} />
                                        </div>
                                    ))}
                                </div>
                                <p className="text-[10px] text-white/20 mt-2 font-bold uppercase tracking-widest">{t.photoLimit} · คลิกที่ช่องว่างเพื่อเพิ่ม</p>
                            </div>

                            {/* ── Edit Form ─────────────────────────────── */}
                            <form onSubmit={handleSubmitEdit} className="space-y-5">
                                <FormFields values={editForm} onChange={(k, v) => setEditForm(f => ({ ...f, [k]: v }))} />
                                <div className="flex gap-4 pt-4 border-t border-white/10">
                                    <button type="button" onClick={() => setSelectedAsset(null)}
                                        className="flex-1 py-4 rounded-2xl border border-white/10 text-white/60 font-black uppercase tracking-widest text-sm hover:bg-white/5 transition-all">
                                        {t.cancel}
                                    </button>
                                    <button type="submit" disabled={saving}
                                        className="flex-1 py-4 rounded-2xl bg-[#cc9d37] text-[#0c1a2f] font-black uppercase tracking-widest text-sm hover:bg-amber-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                        {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                        {t.save}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
