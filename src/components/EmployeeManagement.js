'use client';

import { useState, useEffect, useRef } from 'react';
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
    BadgeCheck 
} from 'lucide-react';
import PermissionMatrix from './PermissionMatrix';
import { can } from '@/lib/permissionMatrix';

const permissionKeys = [
    { key: 'is_admin', label: 'Administrator', icon: Crown },
    { key: 'can_access_all', label: 'Full Access', icon: Shield },
    { key: 'can_manage_orders', label: 'Orders', icon: Receipt },
    { key: 'can_edit_inventory', label: 'Inventory', icon: Boxes },
    { key: 'can_manage_customers', label: 'Customers', icon: Users },
    { key: 'can_manage_employees', label: 'Employees', icon: UserRound },
    { key: 'can_manage_analytics', label: 'Analytics', icon: LineChart },
    { key: 'can_broadcast_message', label: 'Broadcast', icon: Megaphone },
];

const ROLE_COLORS = {
    Developer: { bg: 'from-violet-600 to-purple-800', badge: 'bg-violet-500/20 text-violet-300 border-violet-500/30' },
    Manager:   { bg: 'from-blue-600 to-blue-900',    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    Supervisor:{ bg: 'from-sky-500 to-cyan-800',     badge: 'bg-sky-500/20 text-sky-300 border-sky-500/30' },
    Admin:     { bg: 'from-[#C9A34E] to-amber-700',  badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    Agent:     { bg: 'from-red-500 to-rose-800',     badge: 'bg-red-500/20 text-red-300 border-red-500/30' },
    Guest:     { bg: 'from-slate-500 to-slate-700',  badge: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
};

function getColor(role) {
    return ROLE_COLORS[role] || ROLE_COLORS.Guest;
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

// ─── Stacked Card Deck ────────────────────────────────────────────────────────
function EmployeeCardDeck({ employees, activeIndex, onSelect, onNext, onPrev }) {
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

    const visible = employees.slice(0, Math.min(employees.length, 4));

    return (
        <div
            className="relative select-none"
            style={{ height: 320, width: '100%' }}
            onMouseDown={handleDragStart} onMouseUp={handleDragEnd}
            onTouchStart={handleDragStart} onTouchEnd={handleDragEnd}
        >
            {/* Ghost cards behind */}
            {[2, 1].map((offset) => {
                const idx = (activeIndex + offset) % employees.length;
                const emp = employees[idx];
                if (!emp || offset >= employees.length) return null;
                const color = getColor(emp.role);
                const scale = 1 - offset * 0.04;
                const translateY = offset * 14;
                const opacity = 1 - offset * 0.25;
                return (
                    <div
                        key={`ghost-${offset}`}
                        className={`absolute inset-x-0 mx-auto rounded-[2rem] bg-gradient-to-br ${color.bg}`}
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
                const color = getColor(emp.role);
                return (
                    <div
                        className={`absolute inset-x-0 mx-auto rounded-[2rem] bg-gradient-to-br ${color.bg} shadow-2xl cursor-grab active:cursor-grabbing`}
                        style={{ width: '100%', height: 280, zIndex: 20, transition: 'transform 0.3s ease' }}
                    >
                        {/* Card noise texture overlay */}
                        <div className="absolute inset-0 rounded-[2rem] opacity-5"
                            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.75\' numOctaves=\'4\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }} />

                        <div className="relative z-10 p-8 h-full flex flex-col justify-between">
                            {/* Top row */}
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-white/50 text-[10px] font-black uppercase tracking-[0.25em] mb-1">Employee</p>
                                    <p className="text-white/90 text-[10px] font-mono">{emp.employeeId}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${color.badge}`}>
                                    {emp.status || 'Active'}
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
                                    <p className="text-white/50 text-[10px] uppercase tracking-widest mt-1">{emp.role} · {emp.department || '—'}</p>
                                </div>
                            </div>

                            {/* Bottom row */}
                            <div className="flex items-end justify-between">
                                <div>
                                    <p className="text-white/40 text-[9px] uppercase tracking-widest mb-0.5">Email</p>
                                    <p className="text-white/80 text-xs font-mono truncate max-w-[180px]">{emp.email || '—'}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-white/40 text-[9px] uppercase tracking-widest mb-0.5">Phone</p>
                                    <p className="text-white/80 text-xs font-mono">{emp.phone || '—'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Nav arrows */}
            <button onClick={onPrev}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-5 z-30 w-10 h-10 rounded-full bg-white/10 border border-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-all flex items-center justify-center backdrop-blur-sm">
                <ChevronLeft className="text-xs" />
            </button>
            <button onClick={onNext}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-5 z-30 w-10 h-10 rounded-full bg-white/10 border border-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-all flex items-center justify-center backdrop-blur-sm">
                <ChevronRight className="text-xs" />
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
                        ? 'w-6 h-2 bg-red-500'
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
            ? 'bg-red-500/10 border-red-500/20'
            : 'bg-white/5 border-white/8'}`}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm ${accent ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white/40'}`}>
                <Icon size={16} />
            </div>
            <p className="text-white/40 text-[9px] font-black uppercase tracking-widest">{label}</p>
            <p className={`text-xl font-black ${accent ? 'text-red-400' : 'text-white'}`}>{value}</p>
            {sub && <p className="text-white/30 text-[10px]">{sub}</p>}
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
    const [activeTab, setActiveTab] = useState('overview'); // overview | permissions | customers | sales

    const filtered = (employees || []).filter(emp => {
        if (!emp) return false;
        const name = `${emp.firstName || ''} ${emp.lastName || ''} ${emp.nickName || ''}`.toLowerCase();
        return name.includes(search.toLowerCase());
    });

    const safeIndex = Math.min(activeIndex, Math.max(filtered.length - 1, 0));
    const emp = filtered[safeIndex] || null;
    const { assignedCustomers, sales, totalRevenue } = getLinkedData(emp, customers);

    // TODO: Phase 29c — Replace with can() helper from permissionMatrix
    const canManage = currentUser?.role === 'DEVELOPER'
        || currentUser?.role === 'ADMIN'
        || currentUser?.role === 'MANAGER';

    const goNext = () => setActiveIndex(i => (i + 1) % filtered.length);
    const goPrev = () => setActiveIndex(i => (i - 1 + filtered.length) % filtered.length);

    const handleSave = async () => {
        if (!emp) return;
        setIsSaving(true);
        try {
            const res = await fetch(`/api/employees/${emp.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm),
            });
            const result = await res.json();
            if (result.success) {
                onRefresh?.();
                setIsEditing(false);
            }
        } catch (err) {
            console.error('[EmployeeManagement] save failed', err);
        } finally {
            setIsSaving(false);
        }
    };

    if (!filtered.length) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-white/20 gap-4">
                <Users className="text-5xl" />
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
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 text-xs" />
                        <input
                            type="text" placeholder="Search..."
                            value={search} onChange={e => { setSearch(e.target.value); setActiveIndex(0); }}
                            className="bg-white/5 border border-white/10 text-white pl-10 pr-5 py-2.5 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#C9A34E]/40 w-48 transition-all"
                        />
                    </div>
                    {canManage && (
                        <button className="bg-[#C9A34E] hover:bg-amber-400 text-[#0A1A2F] px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-[#C9A34E]/20 active:scale-95">
                            <UserPlus className="mr-2 inline-block w-3 h-3" />Add
                        </button>
                    )}
                </div>
            </div>

            {/* Two-column layout */}
            <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-8 items-start">

                {/* LEFT — Card deck + mini list */}
                <div>
                    <div className="px-6">
                        <EmployeeCardDeck
                            employees={filtered}
                            activeIndex={safeIndex}
                            onSelect={setActiveIndex}
                            onNext={goNext}
                            onPrev={goPrev}
                        />
                        <DotPager count={filtered.length} active={safeIndex} onSelect={setActiveIndex} />
                    </div>

                    {/* Thumbnail strip */}
                    <div className="flex gap-3 mt-6 overflow-x-auto pb-2 px-2 custom-scrollbar">
                        {filtered.map((e, i) => {
                            const c = getColor(e.role);
                            return (
                                <button key={e.employeeId} onClick={() => setActiveIndex(i)}
                                    className={`flex-shrink-0 flex flex-col items-center gap-1.5 transition-all ${i === safeIndex ? 'opacity-100 scale-105' : 'opacity-40 hover:opacity-70'}`}>
                                    <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${c.bg} flex items-center justify-center text-white font-black text-sm border-2 ${i === safeIndex ? 'border-white/50' : 'border-transparent'} shadow-lg`}>
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
                                        ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                                        : 'text-white/40 hover:text-white'}`}>
                                    <tab.icon className="text-xs" />
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
                                    <StatCard icon={Star} label="Status" value={emp.status || 'Active'} sub={emp.role} />
                                </div>

                                {/* Info card */}
                                <div className="bg-white/5 border border-white/8 rounded-2xl p-6 space-y-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-white font-black text-sm uppercase tracking-widest">Profile</h3>
                                        {canManage && (
                                            <button onClick={() => { setEditForm({ ...emp }); setIsEditing(true); }}
                                                className="text-[10px] text-white/40 hover:text-[#C9A34E] font-black uppercase tracking-widest transition-colors">
                                                <Pen className="mr-1 inline-block w-2.5 h-2.5" />Edit
                                            </button>
                                        )}
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
                                                <row.icon className="text-white/30 text-xs" />
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
                                    Assigned Customers <span className="text-red-400 ml-2">{assignedCustomers.length}</span>
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
                    <div className="bg-[#0D2040] border border-white/10 rounded-[2rem] w-full max-w-lg p-8 shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-white font-black text-lg">Edit Employee</h3>
                            <button onClick={() => setIsEditing(false)} className="w-8 h-8 rounded-xl bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center">
                                <X className="text-sm" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            {[
                                { key: 'firstName', label: 'First Name' },
                                { key: 'lastName', label: 'Last Name' },
                                { key: 'nickName', label: 'Nickname' },
                                { key: 'email', label: 'Email' },
                                { key: 'phone', label: 'Phone' },
                                { key: 'department', label: 'Department' },
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
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setIsEditing(false)}
                                className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 text-xs font-black uppercase hover:bg-white/10 transition-all">
                                Cancel
                            </button>
                            <button onClick={handleSave} disabled={isSaving}
                                className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-400 text-white text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-red-500/20 disabled:opacity-50">
                                {isSaving ? <Loader2 className="animate-spin inline-block" /> : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
