'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Gift, Plus, Search, X, ChevronDown, ChevronUp,
    Clock, DollarSign, BookOpen, Repeat2, Lock,
    Check, Loader2, RefreshCw, Edit2, Tag, Star
} from 'lucide-react';

function formatPrice(n) {
    return n?.toLocaleString('th-TH', { minimumFractionDigits: 0 }) ?? '—';
}

function SwapGroupBadge({ group, isLocked }) {
    if (isLocked) return <span className="flex items-center gap-1 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full"><Lock size={10} /> ล็อค</span>;
    if (group) return <span className="flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full"><Repeat2 size={10} /> {group}</span>;
    return null;
}

function CourseRow({ pc }) {
    const product = pc.product;
    return (
        <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg text-sm">
            <div className="flex items-center gap-2">
                <BookOpen size={13} className="text-amber-500 shrink-0" />
                <div>
                    <span className="font-medium text-gray-800">{product.name}</span>
                    <span className="text-gray-400 text-xs ml-2">{product.productId}</span>
                </div>
            </div>
            <div className="flex items-center gap-2">
                {product.hours && (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock size={11} /> {product.hours}h
                    </span>
                )}
                <span className="text-xs text-gray-600">฿{formatPrice(product.price)}</span>
                {!pc.isRequired && (
                    <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">optional</span>
                )}
                <SwapGroupBadge group={pc.swapGroup} isLocked={pc.isLocked} />
            </div>
        </div>
    );
}

function PackageCard({ pkg, onEdit }) {
    const [expanded, setExpanded] = useState(false);
    const discount = pkg.originalPrice - pkg.packagePrice;
    const discountPct = pkg.originalPrice > 0 ? Math.round((discount / pkg.originalPrice) * 100) : 0;
    const totalHours = pkg.courses.reduce((sum, c) => sum + (c.product?.hours ?? 0), 0);

    const swapGroups = [...new Set(pkg.courses.filter(c => c.swapGroup).map(c => c.swapGroup))];

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div
                className="flex items-start justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpanded(v => !v)}
            >
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center shrink-0 mt-0.5">
                        <Gift size={18} className="text-purple-600" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-gray-900">{pkg.name}</h3>
                            {!pkg.isActive && (
                                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">ปิดใช้งาน</span>
                            )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="text-xs text-gray-400">{pkg.packageId}</span>
                            <span className="text-sm font-bold text-purple-700">฿{formatPrice(pkg.packagePrice)}</span>
                            <span className="text-xs text-gray-400 line-through">฿{formatPrice(pkg.originalPrice)}</span>
                            {discountPct > 0 && (
                                <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-semibold">-{discountPct}%</span>
                            )}
                            {totalHours > 0 && (
                                <span className="flex items-center gap-1 text-xs text-gray-500">
                                    <Clock size={11} /> {totalHours}h รวม
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-xs text-gray-500">{pkg.courses.length} คอร์ส</span>
                            {pkg.gifts.length > 0 && (
                                <span className="text-xs bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full">
                                    ของแถม {pkg.gifts.length} รายการ
                                </span>
                            )}
                            {swapGroups.length > 0 && (
                                <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                                    <Repeat2 size={10} /> เลือกคอร์สได้
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={e => { e.stopPropagation(); onEdit(pkg); }}
                        className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500"
                    >
                        <Edit2 size={14} />
                    </button>
                    {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </div>
            </div>

            {expanded && (
                <div className="border-t border-gray-100 p-4 space-y-4">
                    {pkg.description && (
                        <p className="text-sm text-gray-600 italic">{pkg.description}</p>
                    )}

                    {/* Price breakdown */}
                    <div className="bg-purple-50 rounded-xl p-3 grid grid-cols-3 gap-3 text-center">
                        <div>
                            <div className="text-xs text-gray-500">ราคาปกติ</div>
                            <div className="font-bold text-gray-700">฿{formatPrice(pkg.originalPrice)}</div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500">ส่วนลด</div>
                            <div className="font-bold text-red-600">-฿{formatPrice(discount)}</div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500">ราคา Package</div>
                            <div className="font-bold text-purple-700 text-lg">฿{formatPrice(pkg.packagePrice)}</div>
                        </div>
                    </div>

                    {/* Swap groups info */}
                    {swapGroups.length > 0 && (
                        <div className="bg-blue-50 rounded-lg p-3 text-sm">
                            <div className="flex items-center gap-1 font-semibold text-blue-700 mb-1">
                                <Repeat2 size={14} /> เงื่อนไขเลือกคอร์ส (ใช้สิทธิ์ได้ 1 ครั้ง)
                            </div>
                            {swapGroups.map(g => {
                                const groupCourses = pkg.courses.filter(c => c.swapGroup === g);
                                const max = groupCourses[0]?.swapGroupMax;
                                return (
                                    <div key={g} className="text-blue-600 text-xs mt-1">
                                        กลุ่ม {g}: เลือกได้{max ? ` ${max}` : ' ทั้งหมด'} จาก {groupCourses.length} คอร์ส
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Courses */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <BookOpen size={14} className="text-amber-500" />
                            <span className="text-sm font-semibold text-gray-700">คอร์สในแพ็กเกจ</span>
                        </div>
                        <div className="space-y-1.5">
                            {pkg.courses
                                .sort((a, b) => a.sortOrder - b.sortOrder)
                                .map(pc => <CourseRow key={pc.id} pc={pc} />)}
                        </div>
                    </div>

                    {/* Gifts */}
                    {pkg.gifts.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Star size={14} className="text-amber-500" />
                                <span className="text-sm font-semibold text-gray-700">ของแถม / สิทธิพิเศษ</span>
                            </div>
                            <div className="space-y-1.5">
                                {pkg.gifts.map(g => (
                                    <div key={g.id} className="flex items-center justify-between py-1.5 px-3 bg-amber-50 rounded-lg text-sm">
                                        <div className="flex items-center gap-2">
                                            <Gift size={13} className="text-amber-500" />
                                            <span className="font-medium text-gray-800">{g.name}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-gray-600">×{g.qty}</span>
                                            {g.estimatedCost != null && (
                                                <span className="text-xs text-gray-400 ml-2">฿{formatPrice(g.estimatedCost)}</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function AddPackageModal({ onClose, onSaved, products }) {
    const [form, setForm] = useState({ name: '', description: '', originalPrice: '', packagePrice: '' });
    const [courses, setCourses] = useState([]);
    const [gifts, setGifts] = useState([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const addCourse = () => setCourses(c => [...c, { productId: '', isRequired: true, isLocked: false, swapGroup: '', swapGroupMax: '' }]);
    const removeCourse = i => setCourses(c => c.filter((_, idx) => idx !== i));
    const setCourseField = (i, k, v) => setCourses(c => c.map((row, idx) => idx === i ? { ...row, [k]: v } : row));

    const addGift = () => setGifts(g => [...g, { name: '', qty: 1, estimatedCost: '', notes: '' }]);
    const removeGift = i => setGifts(g => g.filter((_, idx) => idx !== i));
    const setGiftField = (i, k, v) => setGifts(g => g.map((row, idx) => idx === i ? { ...row, [k]: v } : row));

    // Auto-calculate originalPrice from selected courses
    useEffect(() => {
        const total = courses.reduce((sum, c) => {
            const product = products.find(p => p.id === c.productId);
            return sum + (product?.price ?? 0);
        }, 0);
        if (total > 0) set('originalPrice', total);
    }, [courses, products]);

    const handleSave = async () => {
        if (!form.name.trim()) { setError('กรุณาระบุชื่อแพ็กเกจ'); return; }
        if (!form.packagePrice) { setError('กรุณาระบุราคาแพ็กเกจ'); return; }
        setSaving(true); setError('');
        try {
            const res = await fetch('/api/packages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    originalPrice: Number(form.originalPrice),
                    packagePrice: Number(form.packagePrice),
                    courses: courses.filter(c => c.productId).map((c, i) => ({ ...c, sortOrder: i })),
                    gifts: gifts.filter(g => g.name)
                })
            });
            if (!res.ok) { const d = await res.json(); setError(d.error || 'เกิดข้อผิดพลาด'); return; }
            const data = await res.json();
            onSaved(data);
        } catch {
            setError('เกิดข้อผิดพลาด');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Gift size={20} className="text-purple-500" /> สร้างแพ็กเกจใหม่
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
                </div>
                <div className="p-6 space-y-5">
                    {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm">{error}</div>}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อแพ็กเกจ *</label>
                            <input className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 outline-none" value={form.name} onChange={e => set('name', e.target.value)} placeholder="เช่น V School Starter Pack" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ราคาปกติรวม (฿)</label>
                            <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50 focus:ring-2 focus:ring-purple-400 outline-none" value={form.originalPrice} onChange={e => set('originalPrice', e.target.value)} placeholder="คำนวณอัตโนมัติจากคอร์ส" />
                            <p className="text-xs text-gray-400 mt-0.5">คำนวณอัตโนมัติเมื่อเลือกคอร์ส</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ราคาแพ็กเกจจริง (฿) *</label>
                            <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 outline-none" value={form.packagePrice} onChange={e => set('packagePrice', e.target.value)} placeholder="ราคาหลังลด" />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">คำอธิบาย</label>
                            <textarea className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 outline-none" rows={2} value={form.description} onChange={e => set('description', e.target.value)} placeholder="รายละเอียดแพ็กเกจ..." />
                        </div>
                    </div>

                    {/* Courses */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-gray-700 flex items-center gap-1"><BookOpen size={14} className="text-amber-500" /> คอร์สในแพ็กเกจ</span>
                            <button onClick={addCourse} className="text-xs bg-amber-50 text-amber-600 px-2 py-1 rounded-lg hover:bg-amber-100 flex items-center gap-1"><Plus size={12} /> เพิ่มคอร์ส</button>
                        </div>
                        <div className="space-y-2">
                            {courses.map((row, i) => (
                                <div key={i} className="border rounded-lg p-3 space-y-2">
                                    <div className="grid grid-cols-12 gap-2 items-center">
                                        <select className="col-span-6 border rounded px-2 py-1.5 text-xs" value={row.productId} onChange={e => setCourseField(i, 'productId', e.target.value)}>
                                            <option value="">-- เลือกคอร์ส --</option>
                                            {products.map(p => <option key={p.id} value={p.id}>{p.name} (฿{formatPrice(p.price)})</option>)}
                                        </select>
                                        <label className="col-span-2 flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
                                            <input type="checkbox" checked={row.isRequired} onChange={e => setCourseField(i, 'isRequired', e.target.checked)} />
                                            บังคับ
                                        </label>
                                        <label className="col-span-2 flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
                                            <input type="checkbox" checked={row.isLocked} onChange={e => setCourseField(i, 'isLocked', e.target.checked)} />
                                            ล็อค
                                        </label>
                                        <div className="col-span-1" />
                                        <button onClick={() => removeCourse(i)} className="col-span-1 text-red-400 hover:text-red-600 flex justify-end"><X size={14} /></button>
                                    </div>
                                    {!row.isLocked && (
                                        <div className="grid grid-cols-2 gap-2">
                                            <input className="border rounded px-2 py-1.5 text-xs" value={row.swapGroup} onChange={e => setCourseField(i, 'swapGroup', e.target.value)} placeholder="กลุ่ม swap (เช่น GROUP_A)" />
                                            <input type="number" className="border rounded px-2 py-1.5 text-xs" value={row.swapGroupMax} onChange={e => setCourseField(i, 'swapGroupMax', e.target.value)} placeholder="เลือกได้สูงสุด (ว่าง = ทั้งหมด)" />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Gifts */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-gray-700 flex items-center gap-1"><Star size={14} className="text-amber-500" /> ของแถม</span>
                            <button onClick={addGift} className="text-xs bg-amber-50 text-amber-600 px-2 py-1 rounded-lg hover:bg-amber-100 flex items-center gap-1"><Plus size={12} /> เพิ่มของแถม</button>
                        </div>
                        <div className="space-y-2">
                            {gifts.map((row, i) => (
                                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                                    <input className="col-span-5 border rounded px-2 py-1.5 text-xs" value={row.name} onChange={e => setGiftField(i, 'name', e.target.value)} placeholder="ชื่อของแถม" />
                                    <input type="number" className="col-span-2 border rounded px-2 py-1.5 text-xs" value={row.qty} onChange={e => setGiftField(i, 'qty', e.target.value)} placeholder="จำนวน" />
                                    <input type="number" className="col-span-3 border rounded px-2 py-1.5 text-xs" value={row.estimatedCost} onChange={e => setGiftField(i, 'estimatedCost', e.target.value)} placeholder="ต้นทุน (฿)" />
                                    <div className="col-span-1" />
                                    <button onClick={() => removeGift(i)} className="col-span-1 text-red-400 hover:text-red-600"><X size={14} /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-3 p-6 border-t">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">ยกเลิก</button>
                    <button onClick={handleSave} disabled={saving} className="px-6 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2">
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        บันทึก
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function PackagePage() {
    const [packages, setPackages] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showAdd, setShowAdd] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [pkgRes, prodRes] = await Promise.all([
                fetch('/api/packages'),
                fetch('/api/products?category=course&isActive=true')
            ]);
            const [pkgData, prodData] = await Promise.all([pkgRes.json(), prodRes.json()]);
            setPackages(Array.isArray(pkgData) ? pkgData : []);
            setProducts(Array.isArray(prodData) ? prodData : []);
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const filtered = packages.filter(p => {
        if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const handleSaved = (newPkg) => {
        setPackages(prev => [newPkg, ...prev]);
        setShowAdd(false);
    };

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Gift className="text-purple-500" /> แพ็กเกจคอร์ส
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">{packages.length} แพ็กเกจ</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={fetchData} className="p-2 rounded-lg border hover:bg-gray-50 text-gray-500">
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={() => setShowAdd(true)}
                        className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl hover:bg-purple-700 text-sm font-medium shadow-sm"
                    >
                        <Plus size={16} /> สร้างแพ็กเกจ
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    className="w-full pl-9 pr-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-purple-400 outline-none"
                    placeholder="ค้นหาแพ็กเกจ..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            {/* Package List */}
            {loading ? (
                <div className="flex items-center justify-center py-20 text-gray-400">
                    <Loader2 size={28} className="animate-spin mr-2" /> กำลังโหลด...
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                    <Gift size={48} className="mx-auto mb-3 opacity-30" />
                    <p>{search ? 'ไม่พบแพ็กเกจที่ค้นหา' : 'ยังไม่มีแพ็กเกจ กด "สร้างแพ็กเกจ" เพื่อเริ่มต้น'}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(pkg => (
                        <PackageCard key={pkg.id} pkg={pkg} onEdit={() => {}} />
                    ))}
                </div>
            )}

            {showAdd && (
                <AddPackageModal
                    onClose={() => setShowAdd(false)}
                    onSaved={handleSaved}
                    products={products}
                />
            )}
        </div>
    );
}
