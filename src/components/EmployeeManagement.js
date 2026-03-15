'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Crown, 
  Shield, 
  Receipt, 
  Package, 
  Users, 
  UserRound, 
  LineChart, 
  Megaphone, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  UserPlus, 
  IdCard, 
  Coins, 
  Star, 
  Pencil, 
  Mail, 
  Phone, 
  Building2, 
  Facebook, 
  BadgeId, 
  X, 
  Loader2 
} from 'lucide-react';

const permissionKeys = [
    { key: 'is_admin', label: 'Administrator', icon: Crown },
    { key: 'can_access_all', label: 'Full Access', icon: Shield },
    { key: 'can_manage_orders', label: 'Orders', icon: Receipt },
    { key: 'can_edit_inventory', label: 'Inventory', icon: Package },
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
                <ChevronLeft size={16} />
            </button>
            <button onClick={onNext}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-5 z-30 w-10 h-10 rounded-full bg-white/10 border border-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-all flex items-center justify-center backdrop-blur-sm">
                <ChevronRight size={
