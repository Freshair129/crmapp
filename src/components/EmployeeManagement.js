'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    Search,
    UserPlus,
    Pen,
    X,
    Loader2,
    ChevronLeft,
    ChevronRight,
    Crown,
    Shield,
    Receipt,
    Boxes,
    UserRound,
    LineChart,
    Megaphone,
    IdCard,
    Coins,
    Star,
    Mail,
    Phone,
    Building2,
    Facebook,
    BadgeCheck,
    Lock,
} from 'lucide-react';
import PermissionMatrix from './PermissionMatrix';
import { can } from '@/lib/permissionMatrix';

// ─── Role config ──────────────────────────────────────────────────────────────
const ROLE_META = {
    DEVELOPER: { label: 'Developer', level: 'L5', bg: 'from-violet-600 to-purple-800', badge: 'bg-violet-500/20 text-violet-300 border-violet-500/30' },
    MANAGER:   { label: 'Manager',   level: 'L4', bg: 'from-blue-600 to-blue-900',    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    ADMIN:     { label: 'Admin',     level: 'L3', bg: 'from-[#C9A34E] to-amber-700',  badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    MARKETING: { label: 'Marketing', level: 'L2.5', bg: 'from-pink-600 to-rose-800', badge: 'bg-pink-500/20 text-pink-300 border-pink-500/30' },
    HEAD_CHEF: { label: 'Head Chef', level: 'L2.5', bg: 'from-orange-500 to-orange-800', badge: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
    EMPLOYEE:  { label: 'Employee',  level: 'L1.5', bg: 'from-teal-500 to-teal-800',  badge: 'bg-teal-500/20 text-teal-300 border-teal-500/30' },
    AGENT:     { label: 'Agent',     level: 'L1', bg: 'from-red-500 to-rose-800',    badge: 'bg-red-500/20 text-red-300 border-red-500/30' },
    GUEST:     { label: 'Guest',     level: 'L0', bg: 'from-slate-500 to-slate-700', badge: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
};

const ALL_ROLES = ['DEVELOPER','MANAGER','ADMIN','MARKETING','HEAD_CHEF','EMPLOYEE','AGENT','GUEST'];

function getRoleMeta(role) {
    return ROLE_META[role] || ROLE_META.GUEST;
}

function getLinkedData(emp, customers = []) {
    if (!emp) return { assignedCustomers: [], sales: [], totalRevenue: 0 };
    const nick = emp.nickName || emp.firstName;
    const full = `${emp.firstName} ${emp.lastName}`;
    const aliases = emp.metadata?.aliases || [];
    const nameKeys = [nick, full, emp.firstName, emp.facebookName, ...aliases]
        .filter(Boolean).map(v => v.toLowerCase());

    const assignedCustomers = customers.filter(c => {
        const agent = (c.agent || c.intelligence?.agent || '').toLowerCase();
        return nameKeys.includes(agent);
    });

    const sales = assignedCustomers.flatMap(c => {
        const orderList = c.orders || [];
        const timelineOrders = (c.timeline || [])
            .filter(t => t.type === 'ORDER')
            .map(t => ({
                orderId: t.title,
                date: t.date,
                totalAmount: t.details?.total || 0,
                status: t.details?.status || 'Completed',
            }));
        const seen = new Set();
        return [...orderList, ...timelineOrders].filter(o => {
            const id = o.orderId || o.id;
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
        });
    });

    const totalRevenue = sales.reduce((s, o) => s + (o.totalAmount || 0), 0);
    return { assignedCustomers, sales, totalRevenue };
}

// ─── Status Toggle Slider (Framer Motion) ────────────────────────────────────
function StatusToggle({ status, onChange, disabled, onCard = false }) {
    const isActive = status === 'ACTIVE';
    // onCard variant: glass style works on colored gradient card background
    const buttonClass = onCard
        ? `relative flex items-center gap-2 px-2.5 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest transition-colors duration-150 ${
              disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
          } ${
              isActive
                  ? 'bg-white/20 border-white/40 text-white hover:bg-white/30'
                  : 'bg-black/20 border-white/15 text-white/50 hover:bg-black/30'
          }`
        : `relative flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-colors duration-150 ${
              disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
          } ${
              isActive
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25'
                  : 'bg-white/5 border-white/15 text-white/40 hover:bg-white/10'
          }`;

    return (
        <motion.button
            whileTap={disabled ? {} : { scale: 0.93 }}
            onClick={() => !disabled && onChange(isActive ? 'INACTIVE' : 'ACTIVE')}
            disabled={disabled}
            title={disabled ? 'ไม่มีสิทธิ์เปลี่ยน status' : (isActive ? 'คลิกเพื่อ Deactivate' : 'คลิกเพื่อ Activate')}
            className={buttonClass}
        >
            {/* Toggle track + sliding knob */}
            <span className={`relative flex items-center rounded-full px-0.5 shrink-0 transition-colors duration-200 ${
                onCard
                    ? `w-8 h-4 ${isActive ? 'bg-white/30' : 'bg-black/30'}`
                    : `w-9 h-[18px] ${isActive ? 'bg-emerald-500/30' : 'bg-white/10'}`
            }`}>
                <motion.span
                    className={`rounded-full shadow-md shrink-0 ${
                        onCard
                            ? `w-3 h-3 ${isActive ? 'bg-white shadow-white/40' : 'bg-white/40'}`
                            : `w-3.5 h-3.5 ${isActive ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]' : 'bg-white/30'}`
                    }`}
                    initial={false}
                    animate={{ x: isActive ? (onCard ? 16 : 18) : 0 }}
                    transition={{ type: 'spring', stiffness: 600, damping: 30 }}
                    style={{ willChange: 'transform' }}
                />
            </span>

            {/* Label with crossfade */}
            <AnimatePresence mode="wait" initial={false}>
                <motion.span
                    key={String(isActive)}
                    initial={{ opacity: 0, y: 3 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -3 }}
                    transition={{ duration: 0.1 }}
                >
                    {isActive ? 'Active' : 'Inactive'}
                </motion.span>
            </AnimatePresence>

            {disabled && <Lock size={onCard ? 8 : 9} className="opacity-50" />}
        </motion.button>
    );
}

// ─── Stacked Card Deck ────────────────────────────────────────────────────────
function EmployeeCardDeck({ employees, activeIndex, onNext, onPrev, onStatusToggle, canManage, togglingStatus }) {
    const dragStartX = useRef(null);

    const handleDragStart = (e) => {
        dragStartX.current = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    };
    const handleDragEnd = (e) => {
        if (dragStartX.current === null) return;
        const endX = e.type === 'touchend' ? e.changedTouches[0].clientX : e.clientX;
        const delta = dragStartX.current - endX;
        if (Math.abs(delta) > 40) delta > 0 ? onNext() : onPrev();
        dragStartX.current = null;
    };

    return (
        <div
            className="relative select-none"
            style={{ height: 320, width: '100%' }}
            onMouseDown={handleDragStart} onMouseUp={handleDragEnd}
            onTouchStart={handleDragStart} onTouchEnd={handleDragEnd}
        >
            {/* Ghost cards */}
            {[2, 1].map((offset) => {
                const idx = (activeIndex + offset) % employees.length;
                const emp = employees[idx];
                if (!emp || offset >= employees.length) return null;
                const meta = getRoleMeta(emp.role);
                const scale = 1 - offset * 0.04;
                const translateY = offset * 14;
                const opacity = 1 - offset * 0.25;
                return (
                    <div
                        key={`ghost-${offset}`}
                        className={`absolute inset-x-0 mx-auto rounded-[2rem] bg-gradient-to-br ${meta.bg}`}
                        style={{
                            width: '100%', height: 280,
                            transform: `scale(${scale}) translateY(${translateY}px)`,
                            transformOrigin: 'top center',
                            opacity,
                            zIndex: 10 - offset,
                        }}
                    />
                );
            })}

            {/* Active Card */}
            {employees.length > 0 && (() => {
                const emp = employees[activeIndex];
                const meta = getRoleMeta(emp.role);
                const isInactive = emp.status === 'INACTIVE';
                return (
                    <div
                        className={`absolute inset-x-0 mx-auto rounded-[2rem] bg-gradient-to-br ${meta.bg} shadow-2xl cursor-grab active:cursor-grabbing ${isInactive ? 'opacity-60 grayscale' : ''}`}
                        style={{ width: '100%', height: 280, zIndex: 20, transition: 'transform 0.3s ease' }}
                    >
                        <div className="absolute inset-0 rounded-[2rem] opacity-5"
                            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.75\' numOctaves=\'4\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }} />

                        <div className="relative z-10 p-8 h-full flex flex-col justify-between">
                            {/* Top row */}
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-white/50 text-[10px] font-black uppercase tracking-[0.25em] mb-1">Employee</p>
                                    <p className="text-white/90 text-[10px] font-mono">{emp.employeeId}</p>
                                </div>
                                {/* Role badge with level */}
                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${meta.badge}`}>
                                    {meta.label} · {meta.level}
                                </span>
                            </div>

                            {/* Avatar + Name center */}
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 rounded-2xl bg-white/20 border-2 border-white/30 overflow-hidden flex items-center justify-center shadow-xl flex-shrink-0">
                                    {emp.profilePicture
                                        ? <img src={emp.profilePicture} alt="" className="w-full h-full object-cover" />
                                        : <span className="text-white font-black text-2xl">{(emp.firstName || 'E').charAt(0)}</span>
                                    }
                                </div>
                                <div>
                                    <h2 className="text-white font-black text-xl tracking-tight leading-none mb-1">
                                        {emp.firstName} {emp.lastName}
                                    </h2>
                                    {emp.nickName && (
                                        <p className="text-white/60 text-xs font-bold">"{emp.nickName}"</p>
                                    )}
                                    <p className="text-white/50 text-[10px] uppercase tracking-widest mt-1">{emp.department || '—'}</p>
                                </div>
                            </div>

                            {/* Bottom row — email + status toggle */}
                            <div className="flex items-end justify-between">
                                <div>
                                    <p className="text-white/40 text-[9px] uppercase tracking-widest mb-0.5">Email</p>
                                    <p className="text-white/80 text-xs font-mono truncate max-w-[160px]">{emp.email || '—'}</p>
                                </div>
                                {/* Framer Motion status toggle — on card */}
                                <StatusToggle
                                    status={emp.status || 'ACTIVE'}
                                    onChange={(newStatus) => onStatusToggle && onStatusToggle(emp, newStatus)}
                                    disabled={!canManage || togglingStatus}
                                    onCard
                                />
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Nav arrows */}
            <button onClick={onPrev}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-5 z-30 w-10 h-10 rounded-full bg-white/10 border border-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-all flex items-center justify-center backdrop-blur-sm">
                <ChevronLeft size={16} />
            </button>
            <button onClick={onNext}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-5 z-30 w-10 h-10 rounded-full bg-white/10 border border-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-all flex items-center justify-center backdrop-blur-sm">
                <ChevronRight size={16} />
            </button>
        </div>
    );
}

// ─── Dot Pagination ───────────────────────────────────────────────────────────
function DotPager({ count, active, onSelect }) {
    return (
        <div className="flex items-center justify-center gap-2 mt-6">
            {Array.from({ length: count }).map((_, i) => (
                <button key={i} onClick={() => onSelect(i)}
                    className={`rounded-full transition-all duration-300 ${i === active
                        ? 'w-6 h-2 bg-[#C9A34E]'
                        : 'w-2 h-2 bg-white/20 hover:bg-white/40'}`}
                />
            ))}
        </div>
    );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, accent = false }) {
    return (
        <div className={`rounded-2xl p-5 border flex flex-col gap-2 ${accent
            ? 'bg-[#C9A34E]/10 border-[#C9A34E]/20'
            : 'bg-white/5 border-white/8'}`}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${accent ? 'bg-[#C9A34E]/20 text-[#C9A34E]' : 'bg-white/10 text-white/40'}`}>
                <Icon size={16} />
            </div>
            <p className="text-white/40 text-[9px] font-black uppercase tracking-widest">{label}</p>
            <p className={`text-xl font-black ${accent ? 'text-[#C9A34E]' : 'text-white'}`}>{value}</p>
            {sub && <p className="text-white/30 text-[10px]">{sub}</p>}
        </div>
    );
}

// ─── Add Employee Modal ───────────────────────────────────────────────────────
function AddEmployeeModal({ onClose, onSaved }) {
    const [form, setForm] = useState({ firstName: '', lastName: '', nickName: '', email: '', phone: '', department: '', role: 'AGENT', password: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleAdd = async () => {
        if (!form.firstName || !form.lastName || !form.email || !form.password) {
            setError('firstName, lastName, email, password จำเป็นต้องกรอก'); return;
        }
        setSaving(true); setError('');
        try {
            const res = await fetch('/api/employees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const result = await res.json();
            if (result.success) { onSaved(); onClose(); }
            else setError(result.error || 'เกิดข้อผิดพลาด');
        } catch (err) {
            setError('Network error');
        } finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[#0D2040] border border-white/10 rounded-[2rem] w-full max-w-lg p-8 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-white font-black text-lg">เพิ่มพนักงานใหม่</h3>
                    <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center">
                        <X size={14} />
                    </button>
                </div>
                {error && <p className="text-red-400 text-xs font-bold mb-4 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>}
                <div className="space-y-4">
                    {[
                        { key: 'firstName', label: 'ชื่อ *' },
                        { key: 'lastName', label: 'นามสกุล *' },
                        { key: 'nickName', label: 'ชื่อเล่น' },
                        { key: 'email', label: 'Email *' },
                        { key: 'phone', label: 'โทรศัพท์' },
                        { key: 'department', label: 'แผนก' },
                        { key: 'password', label: 'รหัสผ่าน *', type: 'password' },
                    ].map(({ key, label, type }) => (
                        <div key={key}>
                            <label className="text-[10px] text-white/40 font-black uppercase tracking-widest block mb-1.5">{label}</label>
                            <input
                                type={type || 'text'}
                                value={form[key] || ''}
                                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                                className="w-full bg-white/5 border border-white/10 text-white px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A34E]/40 transition-all"
                            />
                        </div>
                    ))}
                    {/* Role select */}
                    <div>
                        <label className="text-[10px] text-white/40 font-black uppercase tracking-widest block mb-1.5">Role</label>
                        <select
                            value={form.role}
                            onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                            className="w-full bg-[#0A1A2F] border border-white/10 text-white px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A34E]/40 transition-all appearance-none"
                        >
                            {ALL_ROLES.map(r => (
                                <option key={r} value={r}>{ROLE_META[r].label} ({ROLE_META[r].level})</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="flex gap-3 mt-6">
                    <button onClick={onClose}
                        className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 text-xs font-black uppercase hover:bg-white/10 transition-all">
                        Cancel
                    </button>
                    <button onClick={handleAdd} disabled={saving}
                        className="flex-1 py-3 rounded-xl bg-[#C9A34E] hover:bg-amber-400 text-[#0A1A2F] text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-[#C9A34E]/20 disabled:opacity-50">
                        {saving ? <Loader2 className="animate-spin inline-block" size={14} /> : 'เพิ่มพนักงาน'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function EmployeeManagement({ employees = [], customers = [], onRefresh, currentUser }) {
    const [activeIndex, setActiveIndex] = useState(0);
    const [search, setSearch] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [isSaving, setIsSaving] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [togglingStatus, setTogglingStatus] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

    // ── RBAC: เฉพาะ DEVELOPER / ADMIN / MANAGER (L3+) จัดการพนักงานได้ ──────
    // can(role, 'system', 'view') = true สำหรับ DEVELOPER, ADMIN, MANAGER เท่านั้น
    const canManage = can(currentUser?.role, 'system', 'view');

    const filtered = (employees || []).filter(emp => {
        if (!emp) return false;
        const name = `${emp.firstName || ''} ${emp.lastName || ''} ${emp.nickName || ''}`.toLowerCase();
        return name.includes(search.toLowerCase());
    });

    const safeIndex = Math.min(activeIndex, Math.max(filtered.length - 1, 0));
    const emp = filtered[safeIndex] || null;
    const { assignedCustomers, sales, totalRevenue } = getLinkedData(emp, customers);

    const goNext = () => setActiveIndex(i => (i + 1) % filtered.length);
    const goPrev = () => setActiveIndex(i => (i - 1 + filtered.length) % filtered.length);

    // ── Save edit (accepts optional payload to avoid async state issue) ────────
    const handleSave = async (payload) => {
        if (!emp) return;
        const body = payload || editForm;
        setIsSaving(true);
        try {
            const res = await fetch(`/api/employees/${emp.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const result = await res.json();
            if (result.success) { onRefresh?.(); setIsEditing(false); }
        } catch (err) {
            console.error('[EmployeeManagement] save failed', err);
        } finally { setIsSaving(false); }
    };

    // ── Toggle ACTIVE / INACTIVE ──────────────────────────────────────────────
    const handleStatusToggle = async (targetEmp, newStatus) => {
        if (!canManage || togglingStatus) return;
        setTogglingStatus(true);
        try {
            const res = await fetch(`/api/employees/${targetEmp.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            const result = await res.json();
            if (result.success) onRefresh?.();
        } catch (err) {
            console.error('[EmployeeManagement] status toggle failed', err);
        } finally { setTogglingStatus(false); }
    };

    if (!filtered.length) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-white/20 gap-4">
                <Users size={48} />
                <p className="font-black uppercase tracking-widest text-sm">No employees found</p>
            </div>
        );
    }

    return (
        <div className="animate-fade-in space-y-8">
            {/* Header */}
            <div className="flex items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black text-[#F8F8F6] tracking-tight mb-1">Employee Directory</h2>
                    <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em]">
                        {filtered.length} member{filtered.length !== 1 ? 's' : ''} · V School Team
                    </p>
                </div>
                <div className="flex gap-3">
                    <div className="relative">
                        <Search size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                        <input
                            type="text" placeholder="Search..."
                            value={search} onChange={e => { setSearch(e.target.value); setActiveIndex(0); }}
                            className="bg-white/5 border border-white/10 text-white pl-10 pr-5 py-2.5 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#C9A34E]/40 w-48 transition-all"
                        />
                    </div>
                    {/* Add button — canManage only */}
                    {canManage ? (
                        <button
                            onClick={() => setIsAdding(true)}
                            className="bg-[#C9A34E] hover:bg-amber-400 text-[#0A1A2F] px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-[#C9A34E]/20 active:scale-95 flex items-center gap-2">
                            <UserPlus size={12} />Add
                        </button>
                    ) : (
                        <div className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/3 border border-white/5 text-white/20 text-[10px] font-black uppercase tracking-widest cursor-not-allowed">
                            <Lock size={10} />Read Only
                        </div>
                    )}
                </div>
            </div>

            {/* Two-column layout */}
            <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-8 items-start">

                {/* LEFT — Card deck + thumbnail strip */}
                <div>
                    <div className="px-6">
                        <EmployeeCardDeck
                            employees={filtered}
                            activeIndex={safeIndex}
                            onNext={goNext}
                            onPrev={goPrev}
                            onStatusToggle={handleStatusToggle}
                            canManage={canManage}
                            togglingStatus={togglingStatus}
                        />
                        <DotPager count={filtered.length} active={safeIndex} onSelect={setActiveIndex} />
                    </div>

                    {/* Thumbnail strip */}
                    <div className="flex gap-3 mt-6 overflow-x-auto pb-2 px-2 custom-scrollbar">
                        {filtered.map((e, i) => {
                            const meta = getRoleMeta(e.role);
                            const isInactive = e.status === 'INACTIVE';
                            return (
                                <button key={e.employeeId} onClick={() => setActiveIndex(i)}
                                    className={`flex-shrink-0 flex flex-col items-center gap-1.5 transition-all ${i === safeIndex ? 'opacity-100 scale-105' : 'opacity-40 hover:opacity-70'}`}>
                                    <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${meta.bg} flex items-center justify-center text-white font-black text-sm border-2 ${i === safeIndex ? 'border-white/50' : 'border-transparent'} shadow-lg ${isInactive ? 'grayscale opacity-70' : ''}`}>
                                        {e.profilePicture
                                            ? <img src={e.profilePicture} alt="" className="w-full h-full object-cover rounded-2xl" />
                                            : (e.firstName || 'E').charAt(0)}
                                    </div>
                                    <span className="text-[9px] text-white/60 font-bold">{e.nickName || e.firstName}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* RIGHT — Dashboard */}
                {emp && (
                    <div className="space-y-5">
                        {/* Tab bar */}
                        <div className="flex gap-1 bg-white/5 border border-white/8 rounded-2xl p-1">
                            {[
                                { id: 'overview', icon: IdCard, label: 'Overview' },
                                ...(can(currentUser?.role, 'system', 'view') ? [{ id: 'permissions', icon: Shield, label: 'Permissions' }] : []),
                                { id: 'customers', icon: Users, label: `Customers (${assignedCustomers.length})` },
                                { id: 'sales', icon: Receipt, label: `Sales (${sales.length})` },
                            ].map(tab => (
                                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === tab.id
                                        ? 'bg-[#C9A34E] text-[#0A1A2F] shadow-lg shadow-[#C9A34E]/20'
                                        : 'text-white/40 hover:text-white'}`}>
                                    <tab.icon size={12} />
                                    <span className="hidden md:inline">{tab.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* TAB: Overview */}
                        {activeTab === 'overview' && (
                            <div className="space-y-5">
                                {/* Stat grid */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                    <StatCard icon={Users} label="Customers" value={assignedCustomers.length} />
                                    <StatCard icon={Receipt} label="Orders" value={sales.length} />
                                    <StatCard icon={Coins} label="Revenue" value={`฿${totalRevenue.toLocaleString()}`} accent />
                                    <StatCard icon={Star} label="Role" value={getRoleMeta(emp.role).label} sub={getRoleMeta(emp.role).level} />
                                </div>

                                {/* Info card */}
                                <div className="bg-white/5 border border-white/8 rounded-2xl p-6 space-y-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-white font-black text-sm uppercase tracking-widest">Profile</h3>
                                        <div className="flex items-center gap-3">
                                            {/* Status toggle — canManage only */}
                                            <StatusToggle
                                                status={emp.status || 'ACTIVE'}
                                                onChange={(newStatus) => handleStatusToggle(emp, newStatus)}
                                                disabled={!canManage || togglingStatus}
                                            />
                                            {/* Edit button — canManage only */}
                                            {canManage && (
                                                <button
                                                    onClick={() => { setEditForm({ ...emp }); setIsEditing(true); }}
                                                    className="text-[10px] text-white/40 hover:text-[#C9A34E] font-black uppercase tracking-widest transition-colors flex items-center gap-1">
                                                    <Pen size={10} />Edit
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    {[
                                        { icon: Mail, label: 'Email', val: emp.email },
                                        { icon: Phone, label: 'Phone', val: emp.phone || '—' },
                                        { icon: Building2, label: 'Dept', val: emp.department || '—' },
                                        { icon: Facebook, label: 'Facebook', val: emp.facebookName || '—' },
                                        { icon: BadgeCheck, label: 'Employee ID', val: emp.employeeId },
                                    ].map(row => (
                                        <div key={row.label} className="flex items-center gap-4">
                                            <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                                                <row.icon size={13} className="text-white/30" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[9px] text-white/30 font-black uppercase tracking-widest">{row.label}</p>
                                                <p className="text-white/80 text-xs font-bold truncate">{row.val}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* TAB: Permissions (Role-based Permission Matrix) */}
                        {activeTab === 'permissions' && (
                            <div className="bg-white/5 border border-white/8 rounded-2xl p-6">
                                <PermissionMatrix currentUserRole={currentUser?.role} />
                            </div>
                        )}

                        {/* TAB: Customers */}
                        {activeTab === 'customers' && (
                            <div className="bg-white/5 border border-white/8 rounded-2xl p-6">
                                <h3 className="text-white font-black text-sm uppercase tracking-widest mb-5">
                                    Assigned Customers <span className="text-[#C9A34E] ml-2">{assignedCustomers.length}</span>
                                </h3>
                                {assignedCustomers.length === 0
                                    ? <p className="text-white/30 text-xs text-center py-8">No customers assigned</p>
                                    : (
                                        <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar pr-1">
                                            {assignedCustomers.map(c => (
                                                <div key={c.customerId || c.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all">
                                                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                                                        {(c.firstName || '?').charAt(0)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-white/90 text-xs font-bold truncate">{c.firstName} {c.lastName}</p>
                                                        <p className="text-white/30 text-[10px]">{c.customerId || '—'}</p>
                                                    </div>
                                                    <span className="text-[9px] text-white/30 bg-white/5 px-2 py-0.5 rounded-lg">{c.channel || 'FB'}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )
                                }
                            </div>
                        )}

                        {/* TAB: Sales */}
                        {activeTab === 'sales' && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <StatCard icon={Receipt} label="Total Orders" value={sales.length} />
                                    <StatCard icon={Coins} label="Total Revenue" value={`฿${totalRevenue.toLocaleString()}`} accent />
                                </div>
                                <div className="bg-white/5 border border-white/8 rounded-2xl p-6">
                                    <h3 className="text-white font-black text-sm uppercase tracking-widest mb-5">Order History</h3>
                                    {sales.length === 0
                                        ? <p className="text-white/30 text-xs text-center py-8">No sales recorded</p>
                                        : (
                                            <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                                                {sales.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((o, i) => (
                                                    <div key={o.orderId || i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                                                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${o.status === 'CLOSED' || o.status === 'Completed' ? 'bg-emerald-400' : o.status === 'CANCELLED' ? 'bg-red-400' : 'bg-amber-400'}`} />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-white/70 text-[10px] font-mono truncate">{o.orderId || `Order #${i + 1}`}</p>
                                                            <p className="text-white/30 text-[9px]">{o.date ? new Date(o.date).toLocaleDateString('th-TH') : '—'}</p>
                                                        </div>
                                                        <p className="text-white font-black text-sm flex-shrink-0">฿{(o.totalAmount || 0).toLocaleString()}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )
                                    }
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {isEditing && emp && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-[#0D2040] border border-white/10 rounded-[2rem] w-full max-w-lg p-8 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-white font-black text-lg">Edit Employee</h3>
                            <button onClick={() => setIsEditing(false)} className="w-8 h-8 rounded-xl bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center">
                                <X size={14} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            {[
                                { key: 'firstName', label: 'ชื่อ' },
                                { key: 'lastName', label: 'นามสกุล' },
                                { key: 'nickName', label: 'ชื่อเล่น' },
                                { key: 'email', label: 'Email' },
                                { key: 'phone', label: 'โทรศัพท์' },
                                { key: 'department', label: 'แผนก' },
                            ].map(({ key, label }) => (
                                <div key={key}>
                                    <label className="text-[10px] text-white/40 font-black uppercase tracking-widest block mb-1.5">{label}</label>
                                    <input
                                        type="text"
                                        value={editForm[key] || ''}
                                        onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                                        className="w-full bg-white/5 border border-white/10 text-white px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A34E]/40 transition-all"
                                    />
                                </div>
                            ))}

                            {/* Role selector */}
                            <div>
                                <label className="text-[10px] text-white/40 font-black uppercase tracking-widest block mb-1.5">Role / Permission Level</label>
                                <select
                                    value={editForm.role || 'AGENT'}
                                    onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
                                    className="w-full bg-[#0A1A2F] border border-white/10 text-white px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A34E]/40 transition-all appearance-none"
                                >
                                    {ALL_ROLES.map(r => (
                                        <option key={r} value={r}>{ROLE_META[r].label} — {ROLE_META[r].level}</option>
                                    ))}
                                </select>
                                <p className="text-[9px] text-white/25 mt-1.5 ml-1">
                                    {getRoleMeta(editForm.role || 'AGENT').level} · การเปลี่ยน role จะมีผลทันทีหลัง user login ครั้งถัดไป
                                </p>
                            </div>

                            {/* New password (optional) */}
                            <div>
                                <label className="text-[10px] text-white/40 font-black uppercase tracking-widest block mb-1.5">รหัสผ่านใหม่ (เว้นว่างถ้าไม่เปลี่ยน)</label>
                                <input
                                    type="password"
                                    value={editForm._newPassword || ''}
                                    onChange={e => setEditForm(f => ({ ...f, _newPassword: e.target.value }))}
                                    placeholder="••••••••"
                                    className="w-full bg-white/5 border border-white/10 text-white px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A34E]/40 transition-all"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setIsEditing(false)}
                                className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 text-xs font-black uppercase hover:bg-white/10 transition-all">
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    // Build API payload: rename _newPassword → password
                                    const payload = { ...editForm };
                                    if (payload._newPassword) { payload.password = payload._newPassword; }
                                    delete payload._newPassword;
                                    handleSave(payload); // pass directly — avoids React async state
                                }}
                                disabled={isSaving}
                                className="flex-1 py-3 rounded-xl bg-[#C9A34E] hover:bg-amber-400 text-[#0A1A2F] text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-[#C9A34E]/20 disabled:opacity-50">
                                {isSaving ? <Loader2 className="animate-spin inline-block" size={14} /> : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Employee Modal */}
            {isAdding && (
                <AddEmployeeModal
                    onClose={() => setIsAdding(false)}
                    onSaved={() => { onRefresh?.(); }}
                />
            )}
        </div>
    );
}
