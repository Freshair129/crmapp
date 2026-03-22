'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
    BookMarked, Plus, X, ChevronDown, ChevronUp,
    Clock, Calendar, Utensils, Wrench, Tag, Loader2,
    Sun, Sunset, Moon, Package, Edit2, Check, AlertTriangle,
    Trash2
} from 'lucide-react';

// 1 วัน = 2 session มาตรฐาน (เช้า + บ่าย)
// EVENING = session ค่ำพิเศษ ไม่ใช่ session ปกติ
const SESSION_LABELS = {
    MORNING:   { label: 'เช้า',        icon: Sun,    color: 'text-amber-400 bg-amber-400/10',   isStandard: true },
    AFTERNOON: { label: 'บ่าย',        icon: Sunset, color: 'text-orange-400 bg-orange-400/10', isStandard: true },
    EVENING:   { label: 'ค่ำ (พิเศษ)', icon: Moon,   color: 'text-indigo-400 bg-indigo-400/10', isStandard: false }
};

const CATEGORIES = ['JP', 'TH', 'WESTERN', 'PASTRY', 'DESSERT', 'OTHER'];

// ─── helpers ────────────────────────────────────────────────────────────────

function sessionCount(hours, days) {
    if (!hours || !days) return null;
    const hoursPerDay = hours / days;
    const sessionsPerDay = hoursPerDay > 6 ? 2 : 1;
    return days * sessionsPerDay;
}

function SessionBadge({ slot }) {
    const cfg = SESSION_LABELS[slot];
    if (!cfg) return null;
    const Icon = cfg.icon;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${cfg.color}`}>
            <Icon size={10} /> {cfg.label}
        </span>
    );
}

// ─── Modal ───────────────────────────────────────────────────────────────────

const MENU_COUNT_OPTIONS = [1,2,3,4,5,6,7,8,9,10];

function AddCourseModal({ onClose, onCreated }) {
    const [form, setForm] = useState({
        name: '', description: '', price: '', hours: '', days: ''
    });
    // sessions = Set of selected keys e.g. new Set(['MORNING','AFTERNOON'])
    const [selectedSessions, setSelectedSessions] = useState(new Set());
    // menus = array of { recipeId, dayNumber, sessionSlot }
    const [menuCount, setMenuCount] = useState('');
    const [menuRows, setMenuRows] = useState([]);
    // instructors
    const [selectedInstructors, setSelectedInstructors] = useState(new Set());
    const [employees, setEmployees] = useState([]);
    const [recipes, setRecipes] = useState([]);
    const [dataLoading, setDataLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        Promise.all([
            fetch('/api/employees').then(r => r.json()),
            fetch('/api/recipes').then(r => r.json())
        ]).then(([empData, recData]) => {
            setEmployees(Array.isArray(empData.data ?? empData) ? (empData.data ?? empData) : []);
            const recs = Array.isArray(recData) ? recData : (recData.data ?? []);
            setRecipes(recs);
            setDataLoading(false);
        });
    }, []);

    // When menuCount changes, resize the menuRows array
    function handleMenuCountChange(val) {
        const n = parseInt(val) || 0;
        setMenuCount(val);
        setMenuRows(prev => {
            const next = [...prev];
            while (next.length < n) next.push({ recipeId: '', dayNumber: 1, sessionSlot: '' });
            return next.slice(0, n);
        });
    }

    function toggleSession(key) {
        setSelectedSessions(prev => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    }

    function toggleInstructor(id) {
        setSelectedInstructors(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }

    function updateMenuRow(idx, field, val) {
        setMenuRows(prev => prev.map((row, i) => i === idx ? { ...row, [field]: val } : row));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            const validMenus = menuRows.filter(m => m.recipeId);
            const res = await fetch('/api/courses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: form.name,
                    description: form.description || undefined,
                    price: parseFloat(form.price),
                    hours: form.hours ? parseFloat(form.hours) : undefined,
                    days: form.days ? parseFloat(form.days) : undefined,
                    sessionType: selectedSessions.size > 0 ? [...selectedSessions].join(',') : undefined,
                    instructorIds: [...selectedInstructors],
                    menus: validMenus
                })
            });
            if (!res.ok) throw new Error(await res.text());
            onCreated(await res.json());
        } catch {
            setError('สร้างคอร์สไม่สำเร็จ กรุณาลองใหม่');
        } finally {
            setSaving(false);
        }
    }

    const maxDays = form.days ? Math.max(1, Math.ceil(parseFloat(form.days))) : 1;
    const inputCls = 'w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm font-bold focus:outline-none focus:border-[#cc9d37]/50';

    return createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#0c1a2f] border border-white/10 rounded-[2rem] w-full max-w-xl flex flex-col shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-8 pt-7 pb-5 border-b border-white/10 shrink-0">
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                        <BookMarked size={22} className="text-[#cc9d37]" /> สร้างคอร์สเรียนใหม่
                    </h3>
                    <button onClick={onClose} className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="overflow-y-auto px-8 py-6 flex-1 min-h-0">
                    <form onSubmit={handleSubmit} id="create-course-form" className="space-y-6">

                        {/* ── Section 1: Basic info ── */}
                        <div className="space-y-4">
                            <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em]">ข้อมูลพื้นฐาน</p>
                            <div>
                                <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">ชื่อคอร์ส *</label>
                                <input required className={inputCls} placeholder="เช่น คอร์สซูชิระดับต้น"
                                    value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">คำอธิบาย</label>
                                <textarea className={`${inputCls} h-16 resize-none`} placeholder="รายละเอียดคอร์ส..."
                                    value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">ราคา (฿) *</label>
                                    <input required type="number" min="0" className={inputCls} placeholder="4500"
                                        value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">ชั่วโมง</label>
                                    <input type="number" min="0" step="0.5" className={inputCls} placeholder="6"
                                        value={form.hours} onChange={e => setForm({ ...form, hours: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">วัน</label>
                                    <select className={inputCls} value={form.days} onChange={e => setForm({ ...form, days: e.target.value })}>
                                        <option value="">-</option>
                                        <option value="0.5">ครึ่งวัน</option>
                                        <option value="1">1 วัน</option>
                                        <option value="2">2 วัน</option>
                                        <option value="3">3 วัน</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* ── Section 2: Sessions (multi-select) ── */}
                        <div>
                            <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] mb-3">ช่วงเวลาที่สอน (เลือกได้มากกว่า 1)</p>
                            <div className="flex gap-2">
                                {Object.entries(SESSION_LABELS).map(([key, cfg]) => {
                                    const Icon = cfg.icon;
                                    const active = selectedSessions.has(key);
                                    return (
                                        <button key={key} type="button" onClick={() => toggleSession(key)}
                                            className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1.5 border transition-all ${active ? `${cfg.color} border-current` : 'border-white/10 text-white/20 hover:text-white/60'}`}>
                                            <Icon size={13} /> {cfg.label}
                                        </button>
                                    );
                                })}
                            </div>
                            {selectedSessions.size > 0 && (
                                <p className="text-[10px] text-white/30 mt-2">
                                    เลือกแล้ว: {[...selectedSessions].map(k => SESSION_LABELS[k]?.label).join(' + ')}
                                </p>
                            )}
                        </div>

                        {/* ── Section 3: Menus ── */}
                        <div>
                            <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] mb-3">รายการเมนูในคอร์ส</p>
                            <div className="mb-3">
                                <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">จำนวนเมนู</label>
                                <select className={`${inputCls} w-32`} value={menuCount} onChange={e => handleMenuCountChange(e.target.value)}>
                                    <option value="">ไม่ระบุ</option>
                                    {MENU_COUNT_OPTIONS.map(n => (
                                        <option key={n} value={n}>{n} เมนู</option>
                                    ))}
                                </select>
                            </div>

                            {menuRows.length > 0 && (
                                <div className="space-y-2">
                                    {dataLoading ? (
                                        <p className="text-white/20 text-xs">กำลังโหลดสูตร...</p>
                                    ) : menuRows.map((row, idx) => (
                                        <div key={idx} className="grid grid-cols-[1.5rem_1fr_auto_auto] items-center gap-2 bg-white/3 rounded-xl px-3 py-2 border border-white/5">
                                            <span className="text-[10px] font-black text-white/25 text-center">{idx + 1}</span>
                                            <select className="bg-transparent text-white text-xs font-bold focus:outline-none truncate"
                                                value={row.recipeId} onChange={e => updateMenuRow(idx, 'recipeId', e.target.value)}>
                                                <option value="">เลือกสูตร...</option>
                                                {recipes.map(r => (
                                                    <option key={r.id} value={r.id}>{r.name}{r.chef ? ` (${r.chef})` : ''}</option>
                                                ))}
                                            </select>
                                            {maxDays > 1 && (
                                                <select className="bg-white/5 text-white text-xs font-bold rounded-lg px-2 py-1.5 focus:outline-none"
                                                    value={row.dayNumber} onChange={e => updateMenuRow(idx, 'dayNumber', parseInt(e.target.value))}>
                                                    {Array.from({ length: maxDays }, (_, i) => (
                                                        <option key={i+1} value={i+1}>วัน {i+1}</option>
                                                    ))}
                                                </select>
                                            )}
                                            <select className="bg-white/5 text-white text-xs font-bold rounded-lg px-2 py-1.5 focus:outline-none"
                                                value={row.sessionSlot} onChange={e => updateMenuRow(idx, 'sessionSlot', e.target.value)}>
                                                <option value="">session?</option>
                                                <option value="MORNING">เช้า</option>
                                                <option value="AFTERNOON">บ่าย</option>
                                                <option value="EVENING">ค่ำ</option>
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* ── Section 4: Instructors (multi-select) ── */}
                        <div>
                            <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] mb-3">เชฟ / อาจารย์ที่สอนได้</p>
                            {dataLoading ? (
                                <p className="text-white/20 text-xs">กำลังโหลด...</p>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {employees.map(emp => {
                                        const active = selectedInstructors.has(emp.id);
                                        const name = emp.nickName || emp.firstName || emp.employeeId;
                                        return (
                                            <button key={emp.id} type="button" onClick={() => toggleInstructor(emp.id)}
                                                className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wide border transition-all ${active ? 'bg-[#cc9d37]/20 border-[#cc9d37]/50 text-[#cc9d37]' : 'border-white/10 text-white/30 hover:text-white/60'}`}>
                                                {name}
                                            </button>
                                        );
                                    })}
                                    {employees.length === 0 && <p className="text-white/20 text-xs italic">ไม่มีพนักงาน</p>}
                                </div>
                            )}
                        </div>

                        {error && <p className="text-red-400 text-xs font-bold">{error}</p>}
                    </form>
                </div>

                <div className="px-8 pb-7 pt-4 border-t border-white/10 shrink-0">
                    <button type="submit" form="create-course-form" disabled={saving}
                        className="w-full bg-[#cc9d37] text-[#0c1a2f] font-black rounded-2xl py-4 uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50">
                        {saving ? 'กำลังสร้าง...' : `สร้างคอร์ส${menuRows.filter(m=>m.recipeId).length > 0 ? ` + ${menuRows.filter(m=>m.recipeId).length} เมนู` : ''}`}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

// ─── AddMenuModal ────────────────────────────────────────────────────────────

function AddMenuModal({ courseId, maxDays, onClose, onAdded }) {
    const [recipes, setRecipes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ recipeId: '', dayNumber: 1, sessionSlot: '', sortOrder: 0 });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetch('/api/recipes')
            .then(r => r.json())
            .then(data => { setRecipes(Array.isArray(data) ? data : data.data || []); setLoading(false); });
    }, []);

    async function handleSubmit(e) {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch(`/api/courses/${courseId}/menus`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, dayNumber: parseInt(form.dayNumber) })
            });
            if (res.status === 409) { alert('เมนูนี้อยู่ในคอร์สแล้ว'); return; }
            if (!res.ok) throw new Error();
            const menu = await res.json();
            onAdded(menu);
        } catch { alert('เพิ่มเมนูไม่สำเร็จ'); }
        finally { setSaving(false); }
    }

    return createPortal(
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-[#0c1a2f] border border-white/10 rounded-[2rem] w-full max-w-md flex flex-col shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/10 shrink-0">
                    <h4 className="font-black text-white uppercase tracking-tighter">เพิ่มเมนูในคอร์ส</h4>
                    <button onClick={onClose} className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10"><X size={18} /></button>
                </div>
                <div className="overflow-y-auto px-6 py-5 flex-1 min-h-0">
                    <form id="add-menu-form" onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-1.5">สูตรอาหาร / Recipe *</label>
                            {loading ? <div className="text-white/30 text-sm">กำลังโหลด...</div> : (
                                <select
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-[#cc9d37]/50"
                                    value={form.recipeId}
                                    onChange={e => setForm({ ...form, recipeId: e.target.value })}
                                >
                                    <option value="">เลือกสูตร...</option>
                                    {recipes.map(r => (
                                        <option key={r.id} value={r.id}>{r.name} {r.chef ? `(${r.chef})` : ''} — {r.recipeId}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-1.5">วันที่</label>
                                <select
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-[#cc9d37]/50"
                                    value={form.dayNumber}
                                    onChange={e => setForm({ ...form, dayNumber: e.target.value })}
                                >
                                    {Array.from({ length: Math.max(1, Math.ceil(maxDays || 1)) }, (_, i) => (
                                        <option key={i + 1} value={i + 1}>วันที่ {i + 1}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-1.5">Session</label>
                                <select
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-[#cc9d37]/50"
                                    value={form.sessionSlot}
                                    onChange={e => setForm({ ...form, sessionSlot: e.target.value })}
                                >
                                    <option value="">ไม่ระบุ</option>
                                    <option value="MORNING">เช้า (session 1)</option>
                                    <option value="AFTERNOON">บ่าย (session 2)</option>
                                    <option value="EVENING">ค่ำ (พิเศษ)</option>
                                </select>
                            </div>
                        </div>
                    </form>
                </div>
                <div className="px-6 pb-6 pt-4 border-t border-white/10 shrink-0">
                    <button type="submit" form="add-menu-form" disabled={saving}
                        className="w-full bg-[#cc9d37] text-[#0c1a2f] font-black rounded-2xl py-3 uppercase tracking-widest disabled:opacity-50">
                        {saving ? 'กำลังเพิ่ม...' : 'เพิ่มเมนู'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

// ─── AddEquipmentModal ───────────────────────────────────────────────────────

function AddEquipmentModal({ courseId, onClose, onAdded }) {
    const [form, setForm] = useState({ name: '', qty: 1, isIncluded: true, estimatedCost: '', notes: '' });
    const [saving, setSaving] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch(`/api/courses/${courseId}/equipment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, qty: parseInt(form.qty), estimatedCost: form.estimatedCost || undefined })
            });
            if (!res.ok) throw new Error();
            onAdded(await res.json());
        } catch { alert('เพิ่มอุปกรณ์ไม่สำเร็จ'); }
        finally { setSaving(false); }
    }

    return createPortal(
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-[#0c1a2f] border border-white/10 rounded-[2rem] w-full max-w-md flex flex-col shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/10 shrink-0">
                    <h4 className="font-black text-white uppercase tracking-tighter">เพิ่มอุปกรณ์คอร์ส</h4>
                    <button onClick={onClose} className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10"><X size={18} /></button>
                </div>
                <div className="overflow-y-auto px-6 py-5 flex-1 min-h-0">
                    <form id="add-eq-form" onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-1.5">ชื่ออุปกรณ์ *</label>
                            <input required
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-[#cc9d37]/50"
                                placeholder="เช่น ผ้ากันเปื้อน V School"
                                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-1.5">จำนวน/คน</label>
                                <input type="number" min="1"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-[#cc9d37]/50"
                                    value={form.qty} onChange={e => setForm({ ...form, qty: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-1.5">ต้นทุน (฿)</label>
                                <input type="number" min="0"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-[#cc9d37]/50"
                                    placeholder="0" value={form.estimatedCost}
                                    onChange={e => setForm({ ...form, estimatedCost: e.target.value })}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">รวมในราคาคอร์ส?</label>
                            <div className="flex gap-2">
                                <button type="button"
                                    onClick={() => setForm({ ...form, isIncluded: true })}
                                    className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase border transition-all ${form.isIncluded ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'border-white/10 text-white/30'}`}>
                                    แถมฟรี
                                </button>
                                <button type="button"
                                    onClick={() => setForm({ ...form, isIncluded: false })}
                                    className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase border transition-all ${!form.isIncluded ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'border-white/10 text-white/30'}`}>
                                    ต้องซื้อเพิ่ม
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
                <div className="px-6 pb-6 pt-4 border-t border-white/10 shrink-0">
                    <button type="submit" form="add-eq-form" disabled={saving}
                        className="w-full bg-[#cc9d37] text-[#0c1a2f] font-black rounded-2xl py-3 uppercase tracking-widest disabled:opacity-50">
                        {saving ? 'กำลังเพิ่ม...' : 'เพิ่มอุปกรณ์'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

// ─── CourseCard ──────────────────────────────────────────────────────────────

function CourseCard({ course, onUpdated }) {
    const [expanded, setExpanded] = useState(false);
    const [showMenuModal, setShowMenuModal] = useState(false);
    const [showEqModal, setShowEqModal] = useState(false);
    const [menus, setMenus] = useState(course.courseMenus || []);
    const [equipment, setEquipment] = useState(course.courseEquipment || []);

    const sc = sessionCount(course.hours, course.days);

    // group menus by day
    const byDay = menus.reduce((acc, m) => {
        const day = m.dayNumber || 1;
        if (!acc[day]) acc[day] = [];
        acc[day].push(m);
        return acc;
    }, {});

    async function deleteMenu(menuId) {
        if (!confirm('ลบเมนูนี้ออกจากคอร์ส?')) return;
        await fetch(`/api/courses/${course.id}/menus?menuId=${menuId}`, { method: 'DELETE' });
        setMenus(prev => prev.filter(m => m.id !== menuId));
    }

    async function deleteEquipment(eqId) {
        if (!confirm('ลบอุปกรณ์นี้?')) return;
        await fetch(`/api/courses/${course.id}/equipment?equipmentId=${eqId}`, { method: 'DELETE' });
        setEquipment(prev => prev.filter(e => e.id !== eqId));
    }

    return (
        <div className="bg-white/5 rounded-[2rem] border border-white/10 hover:border-[#cc9d37]/30 transition-all">
            {/* Header row */}
            <div className="p-6 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-lg font-black text-white uppercase tracking-tight">{course.name}</h3>
                        <span className="text-[9px] font-black text-white/25 uppercase tracking-widest">{course.productId}</span>
                    </div>
                    {course.description && <p className="text-xs text-white/40 mt-1 line-clamp-1">{course.description}</p>}

                    {/* Stat chips */}
                    <div className="flex flex-wrap gap-2 mt-3">
                        <span className="text-[#cc9d37] font-black text-sm">
                            ฿{course.price?.toLocaleString()}
                        </span>
                        {course.hours && (
                            <span className="flex items-center gap-1 text-[10px] font-black text-white/40 bg-white/5 px-2 py-1 rounded-full">
                                <Clock size={10} /> {course.hours}h
                            </span>
                        )}
                        {course.days && (
                            <span className="flex items-center gap-1 text-[10px] font-black text-white/40 bg-white/5 px-2 py-1 rounded-full">
                                <Calendar size={10} /> {course.days === 0.5 ? 'ครึ่งวัน' : `${course.days} วัน`}
                            </span>
                        )}
                        {sc && (
                            <span className="flex items-center gap-1 text-[10px] font-black text-emerald-400/70 bg-emerald-500/5 px-2 py-1 rounded-full">
                                {sc} session ({course.days} วัน × {sc / course.days} session/วัน)
                            </span>
                        )}
                        {/* multi-session badges */}
                        {course.sessionType && course.sessionType.split(',').map(s => (
                            <SessionBadge key={s} slot={s.trim()} />
                        ))}
                        <span className="flex items-center gap-1 text-[10px] font-black text-white/30 bg-white/5 px-2 py-1 rounded-full">
                            <Utensils size={10} /> {menus.length} เมนู
                        </span>
                        {equipment.length > 0 && (
                            <span className="flex items-center gap-1 text-[10px] font-black text-white/30 bg-white/5 px-2 py-1 rounded-full">
                                <Package size={10} /> {equipment.length} อุปกรณ์
                            </span>
                        )}
                        {course.instructorIds?.length > 0 && (
                            <span className="flex items-center gap-1 text-[10px] font-black text-white/30 bg-white/5 px-2 py-1 rounded-full">
                                👨‍🍳 {course.instructorIds.length} เชฟ
                            </span>
                        )}
                    </div>
                </div>
                <button
                    onClick={() => setExpanded(v => !v)}
                    className="p-2 rounded-xl text-white/30 hover:text-white/70 hover:bg-white/10 transition-all shrink-0"
                >
                    {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
            </div>

            {/* Expanded detail */}
            {expanded && (
                <div className="border-t border-white/8 px-6 pb-6 pt-4 space-y-6">
                    {/* Menus grouped by day */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">เมนูในคอร์ส</span>
                            <button
                                onClick={() => setShowMenuModal(true)}
                                className="flex items-center gap-1.5 text-[10px] font-black text-[#cc9d37] hover:text-amber-300 uppercase tracking-widest"
                            >
                                <Plus size={12} /> เพิ่มเมนู
                            </button>
                        </div>

                        {menus.length === 0 ? (
                            <p className="text-white/20 text-xs italic">ยังไม่มีเมนู — กด + เพิ่มเมนูเพื่อเริ่มต้น</p>
                        ) : (
                            <div className="space-y-4">
                                {Object.entries(byDay).map(([day, items]) => (
                                    <div key={day}>
                                        <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-2">วันที่ {day}</p>
                                        <div className="space-y-2">
                                            {items.map(m => (
                                                <div key={m.id} className="flex items-center justify-between bg-white/3 rounded-xl px-4 py-2.5 border border-white/5">
                                                    <div className="flex items-center gap-3">
                                                        <Utensils size={13} className="text-[#cc9d37] shrink-0" />
                                                        <div>
                                                            <p className="text-sm font-bold text-white">{m.recipe?.name}</p>
                                                            <p className="text-[9px] text-white/25">{m.recipe?.recipeId} {m.recipe?.chef ? `· ${m.recipe.chef}` : ''}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {m.sessionSlot && <SessionBadge slot={m.sessionSlot} />}
                                                        <button onClick={() => deleteMenu(m.id)} className="p-1 text-white/20 hover:text-red-400 transition-colors">
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Equipment */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">อุปกรณ์คอร์ส</span>
                            <button
                                onClick={() => setShowEqModal(true)}
                                className="flex items-center gap-1.5 text-[10px] font-black text-[#cc9d37] hover:text-amber-300 uppercase tracking-widest"
                            >
                                <Plus size={12} /> เพิ่ม
                            </button>
                        </div>
                        {equipment.length === 0 ? (
                            <p className="text-white/20 text-xs italic">ยังไม่มีอุปกรณ์</p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {equipment.map(eq => (
                                    <div key={eq.id} className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-1.5 border border-white/8 group">
                                        <Wrench size={11} className="text-white/40" />
                                        <span className="text-xs font-bold text-white/60">{eq.name} ×{eq.qty}</span>
                                        <span className={`text-[9px] font-black uppercase ${eq.isIncluded ? 'text-emerald-400' : 'text-amber-400'}`}>
                                            {eq.isIncluded ? 'แถม' : 'ซื้อเพิ่ม'}
                                        </span>
                                        <button onClick={() => deleteEquipment(eq.id)} className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-all">
                                            <X size={11} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showMenuModal && (
                <AddMenuModal
                    courseId={course.id}
                    maxDays={course.days || 1}
                    onClose={() => setShowMenuModal(false)}
                    onAdded={menu => { setMenus(prev => [...prev, menu]); setShowMenuModal(false); }}
                />
            )}
            {showEqModal && (
                <AddEquipmentModal
                    courseId={course.id}
                    onClose={() => setShowEqModal(false)}
                    onAdded={eq => { setEquipment(prev => [...prev, eq]); setShowEqModal(false); }}
                />
            )}
        </div>
    );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function CoursePage({ language = 'TH' }) {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [search, setSearch] = useState('');

    const fetchCourses = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/courses');
            const data = await res.json();
            setCourses(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('[CoursePage]', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchCourses(); }, [fetchCourses]);

    const filtered = courses.filter(c =>
        !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.productId?.includes(search)
    );

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
            <Loader2 className="w-12 h-12 text-[#cc9d37] animate-spin" />
            <span className="text-[#cc9d37] font-black animate-pulse uppercase tracking-[0.3em]">กำลังโหลดคอร์สเรียน...</span>
        </div>
    );

    return (
        <div className="bg-[#0c1a2f]/30 backdrop-blur-md rounded-[2.5rem] border border-white/10 p-8">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
                <div className="flex items-center gap-6">
                    <div className="bg-[#cc9d37] p-4 rounded-3xl shadow-xl shadow-amber-900/30">
                        <BookMarked size={32} className="text-[#0c1a2f]" />
                    </div>
                    <div>
                        <h2 className="text-4xl font-black text-white uppercase tracking-tighter">คอร์สเรียน</h2>
                        <span className="text-xs font-black text-[#cc9d37] uppercase tracking-widest">{courses.length} คอร์ส</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <input
                        type="text"
                        placeholder="ค้นหาคอร์ส..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-white text-sm font-bold placeholder:text-white/20 focus:outline-none focus:border-[#cc9d37]/40 w-48"
                    />
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 bg-[#cc9d37] text-[#0c1a2f] font-black text-xs uppercase tracking-widest px-5 py-2.5 rounded-2xl hover:scale-105 active:scale-95 transition-all"
                    >
                        <Plus size={16} /> สร้างคอร์ส
                    </button>
                </div>
            </div>

            {/* Course list */}
            {filtered.length === 0 ? (
                <div className="text-center py-20">
                    <BookMarked size={48} className="text-white/10 mx-auto mb-4" />
                    <p className="text-white/20 font-black uppercase tracking-widest">
                        {search ? 'ไม่พบคอร์สที่ค้นหา' : 'ยังไม่มีคอร์สเรียน — กดสร้างคอร์สเพื่อเริ่มต้น'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                    {filtered.map(course => (
                        <CourseCard
                            key={course.id}
                            course={course}
                            onUpdated={updated => setCourses(prev => prev.map(c => c.id === updated.id ? updated : c))}
                        />
                    ))}
                </div>
            )}

            {showAddModal && (
                <AddCourseModal
                    onClose={() => setShowAddModal(false)}
                    onCreated={course => {
                        setCourses(prev => [course, ...prev]);
                        setShowAddModal(false);
                    }}
                />
            )}
        </div>
    );
}
