'use client';

import { useState, useRef, useEffect } from 'react';
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
    ArrowUpRight,
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

// Avatar gradient colors (for card dark-bg design)
const ROLE_AVATAR = {
    DEVELOPER: ['#7c3aed','#4c1d95'],
    MANAGER:   ['#2563eb','#1e3a8a'],
    ADMIN:     ['#C9A34E','#92400e'],
    MARKETING: ['#db2777','#831843'],
    HEAD_CHEF: ['#f97316','#9a3412'],
    EMPLOYEE:  ['#14b8a6','#134e4a'],
    AGENT:     ['#ef4444','#7f1d1d'],
    GUEST:     ['#64748b','#1e293b'],
};

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
function StatusToggle({ status, onChange, disabled, onCard = false, bare = false }) {
    const isActive = status === 'ACTIVE';

    // bare = no border / no bg — just track + label floating (for dark card bottom)
    const buttonClass = bare
        ? `relative flex items-center gap-2 text-[9px] font-black uppercase tracking-widest transition-colors duration-150 ${
              disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
          } ${isActive ? 'text-emerald-400' : 'text-white/30'}`
        : onCard
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

    const trackSize = bare ? 'w-8 h-4' : onCard ? 'w-8 h-4' : 'w-9 h-[18px]';
    const trackBg   = bare
        ? (isActive ? 'bg-emerald-500/40' : 'bg-white/08')
        : onCard
        ? (isActive ? 'bg-white/30' : 'bg-black/30')
        : (isActive ? 'bg-emerald-500/30' : 'bg-white/10');
    const knobSize  = (bare || onCard) ? 'w-3 h-3' : 'w-3.5 h-3.5';
    const knobBg    = bare
        ? (isActive ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]' : 'bg-white/35')
        : onCard
        ? (isActive ? 'bg-white shadow-white/40' : 'bg-white/40')
        : (isActive ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]' : 'bg-white/30');

    return (
        <motion.button
            whileTap={disabled ? {} : { scale: 0.93 }}
            onClick={() => !disabled && onChange(isActive ? 'INACTIVE' : 'ACTIVE')}
            disabled={disabled}
            title={disabled ? 'ไม่มีสิทธิ์เปลี่ยน status' : (isActive ? 'คลิกเพื่อ Deactivate' : 'คลิกเพื่อ Activate')}
            className={buttonClass}
        >
            {/* Toggle track + sliding knob */}
            <span className={`relative flex items-center rounded-full px-0.5 shrink-0 transition-colors duration-200 ${trackSize} ${trackBg}`}>
                <motion.span
                    className={`rounded-full shadow-md shrink-0 ${knobSize} ${knobBg}`}
                    initial={false}
                    animate={{ x: isActive ? 16 : 0 }}
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

            {disabled && <Lock size={bare ? 8 : onCard ? 8 : 9} className="opacity-50" />}
        </motion.button>
    );
}

// ─── Sparkline SVG ────────────────────────────────────────────────────────────
function Sparkline({ sales = [], color = '#00f5ff' }) {
    // Group totals into last 6 months
    const now = new Date();
    const buckets = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        return { key: `${d.getFullYear()}-${d.getMonth()}`, v: 0 };
    });
    sales.forEach(s => {
        if (!s.date) return;
        const d   = new Date(s.date);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        const b   = buckets.find(b => b.key === key);
        if (b) b.v += (s.totalAmount || 0);
    });
    const data = buckets.map(b => b.v);
    const max  = Math.max(...data, 1);
    const W = 100, H = 30;
    const cx = color.replace('#', '');
    const pts = data
        .map((v, i) => `${(i / (data.length - 1)) * W},${H - (v / max) * (H - 4) - 2}`)
        .join(' ');
    return (
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full" style={{ height: H }}>
            <defs>
                <linearGradient id={`spk-${cx}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.35" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.01" />
                </linearGradient>
            </defs>
            <polygon points={`0,${H} ${pts} ${W},${H}`} fill={`url(#spk-${cx})`} />
            <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round"
                style={{ filter: `drop-shadow(0 0 3px ${color}88)` }} />
        </svg>
    );
}

// ─── KPI block (role-aware) ───────────────────────────────────────────────────
const SALES_ROLES = new Set(['AGENT', 'EMPLOYEE', 'ADMIN', 'MANAGER', 'HEAD_CHEF']);
function KpiBlock({ emp, linked, barColor }) {
    const isSalesRole  = SALES_ROLES.has(emp.role);
    const revenue      = linked.totalRevenue;
    const custCount    = linked.assignedCustomers.length;
    const validOrders  = linked.sales.filter(s => s.status !== 'CANCELLED').length;
    const closeRate    = custCount > 0 ? Math.round((validOrders / custCount) * 100) : 0;
    const fmtRevenue   = revenue >= 1_000_000
        ? `฿${(revenue / 1_000_000).toFixed(1)}M`
        : revenue >= 1_000
        ? `฿${Math.round(revenue / 1_000)}k`
        : `฿${revenue}`;

    if (!isSalesRole || custCount === 0) {
        return (
            <div className="flex items-center justify-center py-4">
                <p className="text-white/15 text-[10px] tracking-widest uppercase">No linked data</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2">
            {/* 3 stat pills */}
            <div className="grid grid-cols-3 gap-2">
                {[
                    { label: 'Revenue',   value: fmtRevenue },
                    { label: 'Customers', value: `${custCount}` },
                    { label: 'Close',     value: `${closeRate}%` },
                ].map(({ label, value }) => (
                    <div key={label} className="flex flex-col items-center justify-center py-2 rounded-xl"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <span className="text-white font-black text-[15px] leading-none">{value}</span>
                        <span className="text-white/30 text-[8px] uppercase tracking-widest mt-1">{label}</span>
                    </div>
                ))}
            </div>
            {/* Sparkline */}
            <div className="rounded-xl overflow-hidden px-2 pt-1.5 pb-0.5"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p className="text-white/20 text-[7px] uppercase tracking-widest mb-1">6-month trend</p>
                <Sparkline sales={linked.sales} color={barColor} />
            </div>
        </div>
    );
}

// ─── File-folder Stacked Card Deck (Framer Motion) ───────────────────────────
function EmployeeCardDeck({ employees, activeIndex, onNext, onPrev, onStatusToggle, canManage, togglingStatus, customers = [], onOpenDetail }) {
    const n = employees.length;
    if (n === 0) return null;

    // Circular shortest offset from activeIndex
    const getOffset = (i) => {
        let off = i - activeIndex;
        if (off > n / 2)  off -= n;
        if (off < -n / 2) off += n;
        return off;
    };

    // Spring targets for each card based on its offset
    const getAnimate = (offset) => {
        const abs = Math.abs(offset);
        const sign = offset < 0 ? -1 : 1;
        return {
            scale:   abs === 0 ? 1      : 1 - abs * 0.065,
            y:       abs === 0 ? 0      : abs * 24,
            rotateZ: abs === 0 ? 0      : sign * abs * 3.5,
            opacity: abs > 2   ? 0      : 1 - abs * 0.22,
            zIndex:  abs === 0 ? 30     : 30 - abs * 6,
            x: 0,
        };
    };

    return (
        <div className="relative select-none" style={{ height: 430, width: '100%' }}>

            {/* Cards — rendered back→front via zIndex, all employees keyed by id */}
            {employees.map((emp, i) => {
                const offset  = getOffset(i);
                const abs     = Math.abs(offset);
                if (abs > 3) return null;   // skip far-off cards entirely

                const isActive = offset === 0;
                const meta     = getRoleMeta(emp.role);
                const animate  = getAnimate(offset);
                const isInactive = emp.status === 'INACTIVE';

                const avatarColors = ROLE_AVATAR[emp.role] || ROLE_AVATAR.GUEST;
                const contactItems = [
                    emp.phone        && { icon: Phone,    label: emp.phone },
                    emp.email        && { icon: Mail,     label: 'Email' },
                    emp.facebookName && { icon: Facebook, label: emp.facebookName },
                ].filter(Boolean);

                // Permission level bar
                const levelStr  = meta.level; // e.g. 'L5', 'L2.5'
                const levelNum  = parseFloat(levelStr.replace('L', ''));
                const fillPct   = Math.round((levelNum / 5) * 100);
                const barColor  = avatarColors[0];

                // KPI data
                const linked = getLinkedData(emp, customers);

                return (
                    <motion.div
                        key={emp.id}
                        animate={animate}
                        initial={false}
                        transition={{ type: 'spring', stiffness: 340, damping: 30 }}
                        drag={isActive ? 'x' : false}
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.18}
                        onDragEnd={(_, info) => {
                            if (info.offset.x < -55) onNext();
                            else if (info.offset.x > 55) onPrev();
                        }}
                        whileDrag={{ scale: 1.03, boxShadow: '0 40px 80px rgba(0,0,0,0.7)' }}
                        style={{
                            position: 'absolute',
                            width: '100%',
                            height: 372,
                            cursor: isActive ? 'grab' : 'default',
                            transformOrigin: '50% 110%',
                            pointerEvents: isActive ? 'auto' : 'none',
                        }}
                    >
                        {/* ── Smoke / haze effects (active card only) ── */}
                        {isActive && !isInactive && (
                            <>
                                {/* Bottom smoke bloom */}
                                <motion.div
                                    className="absolute pointer-events-none"
                                    style={{
                                        bottom: -28, left: '5%', width: '90%', height: 70,
                                        borderRadius: '50%',
                                        background: `radial-gradient(ellipse, ${avatarColors[0]}22 0%, transparent 68%)`,
                                        filter: 'blur(22px)',
                                    }}
                                    animate={{ opacity: [0.55, 1, 0.55], scaleX: [1, 1.15, 1] }}
                                    transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
                                />
                                {/* Left wisp */}
                                <motion.div
                                    className="absolute pointer-events-none"
                                    style={{
                                        top: '30%', left: -18, width: 60, height: 120,
                                        borderRadius: '50%',
                                        background: `radial-gradient(ellipse, ${avatarColors[0]}14 0%, transparent 70%)`,
                                        filter: 'blur(16px)',
                                    }}
                                    animate={{ opacity: [0.4, 0.8, 0.4], y: [0, -8, 0] }}
                                    transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
                                />
                                {/* Right wisp */}
                                <motion.div
                                    className="absolute pointer-events-none"
                                    style={{
                                        top: '25%', right: -18, width: 60, height: 110,
                                        borderRadius: '50%',
                                        background: `radial-gradient(ellipse, ${avatarColors[1]}18 0%, transparent 70%)`,
                                        filter: 'blur(18px)',
                                    }}
                                    animate={{ opacity: [0.35, 0.75, 0.35], y: [0, -10, 0] }}
                                    transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1.6 }}
                                />
                                {/* Top ambient glow */}
                                <motion.div
                                    className="absolute pointer-events-none"
                                    style={{
                                        top: -10, left: '20%', width: '60%', height: 40,
                                        borderRadius: '50%',
                                        background: `radial-gradient(ellipse, ${avatarColors[0]}10 0%, transparent 70%)`,
                                        filter: 'blur(14px)',
                                    }}
                                    animate={{ opacity: [0.3, 0.7, 0.3] }}
                                    transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
                                />
                            </>
                        )}

                        {/* ── Rounded rect glass card (pseudo-concave via bg-circle overlay) ── */}
                        <div className="h-full relative overflow-hidden"
                            style={{
                                borderRadius: 32,
                                background: 'rgba(10,10,22,0.92)',
                                border: isActive
                                    ? `1.5px solid ${avatarColors[0]}80`
                                    : '1px solid rgba(255,255,255,0.10)',
                                boxShadow: isActive
                                    ? `0 0 0 1px ${avatarColors[0]}15, 0 20px 40px rgba(0,0,0,0.5)`
                                    : '0 8px 24px rgba(0,0,0,0.4)',
                                filter: isInactive ? 'grayscale(0.45) brightness(0.75)' : 'none',
                                zIndex: 1,
                            }}>

                            {/* ① Role-color tint gradient */}
                            <div className="absolute inset-0 pointer-events-none" style={{
                                background: `linear-gradient(135deg, ${avatarColors[0]}${isActive ? '2e' : '12'} 0%, ${avatarColors[1]}10 100%)`,
                                borderRadius: 'inherit',
                            }} />
                            {/* ② Glass sheen — top-left diagonal highlight */}
                            <div className="absolute pointer-events-none" style={{
                                top: 0, left: 0, width: '68%', height: '42%',
                                background: 'linear-gradient(135deg, rgba(255,255,255,0.11) 0%, rgba(255,255,255,0.03) 50%, transparent 100%)',
                                borderTopLeftRadius: 32,
                            }} />
                            {/* ③ Linear shimmer sweep — Framer Motion */}
                            <motion.div
                                className="absolute inset-0 pointer-events-none"
                                style={{
                                    background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.13) 50%, transparent 65%)',
                                    borderRadius: 'inherit',
                                }}
                                animate={{ x: ['-110%', '210%'] }}
                                transition={{ duration: 2.2, repeat: Infinity, ease: 'linear', repeatDelay: 3.5 }}
                            />

                            {/* Content sits on top */}
                            <div className="relative flex flex-col h-full p-6" style={{ zIndex: 1 }}>

                            {/* ── TOP ROW: avatar left · name/role/id right ── */}
                            <div className="relative flex items-start gap-3">
                                {/* Circular avatar */}
                                <div
                                    className="w-[56px] h-[56px] rounded-full overflow-hidden flex items-center justify-center shrink-0 shadow-xl"
                                    style={{
                                        background: `linear-gradient(135deg, ${avatarColors[0]}, ${avatarColors[1]})`,
                                        boxShadow: `0 4px 20px ${avatarColors[0]}55, 0 0 0 2px rgba(255,255,255,0.12)`,
                                    }}
                                >
                                    {emp.profilePicture
                                        ? <img src={emp.profilePicture} alt="" className="w-full h-full object-cover" />
                                        : <span className="text-white font-black text-xl select-none leading-none">{(emp.firstName || 'E').charAt(0)}</span>
                                    }
                                </div>
                                {/* Name / role / ID — right of avatar */}
                                <div className="flex-1 min-w-0 pt-0.5">
                                    <h2 className="text-white font-bold text-[1.35rem] leading-tight tracking-tight truncate"
                                        style={{ textShadow: '0 1px 8px rgba(0,0,0,0.5)' }}>
                                        {emp.firstName} {emp.lastName}
                                    </h2>
                                    <p className="text-white/50 text-[11px] mt-0.5 truncate">
                                        {meta.label}{emp.department ? ` · ${emp.department}` : ''}
                                        {emp.nickName ? ` · "${emp.nickName}"` : ''}
                                    </p>
                                    {emp.employeeId && (
                                        <p className="text-white/28 text-[9px] mt-0.5 font-mono tracking-wider truncate">
                                            {emp.employeeId}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* ── KPI MIDDLE ── */}
                            <div className="mt-3 flex-1 min-h-0">
                                <KpiBlock emp={emp} linked={linked} barColor={barColor} />
                            </div>

                            {/* ── BOTTOM ROW: contacts+toggle left · priority bar right ── */}
                            <div className="flex items-end justify-between gap-3 mt-3 pt-2"
                                style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>

                                {/* LEFT: contact pills + active toggle */}
                                <div className="min-w-0 flex-1 flex flex-col gap-1.5">
                                    <div className="flex gap-1.5 flex-wrap">
                                        {contactItems.length > 0 ? contactItems.map(({ icon: Ic, label: cLabel }, idx) => (
                                            <span key={idx} className="flex items-center gap-1 px-2 py-1 rounded-full text-white/55 text-[9px] font-semibold shrink-0"
                                                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                                <Ic size={8} className="shrink-0" />{cLabel}
                                            </span>
                                        )) : (
                                            <span className="text-white/15 text-[9px]">—</span>
                                        )}
                                    </div>
                                    {/* Active toggle — bare (no frame), green when active */}
                                    <StatusToggle
                                        status={emp.status}
                                        bare
                                        disabled={!canManage || togglingStatus}
                                        onChange={(next) => {
                                            if (!canManage || togglingStatus) return;
                                            onStatusToggle && onStatusToggle(emp, next);
                                        }}
                                    />
                                </div>

                                {/* RIGHT: priority bar + level circle */}
                                <div className="flex flex-col items-end gap-1 shrink-0 w-[88px]">
                                    <p className="text-white/25 text-[7px] uppercase tracking-widest font-bold">Priority</p>
                                    <div className="flex items-center gap-2 w-full">
                                        <div className="relative flex-1 h-[4px] rounded-full overflow-hidden"
                                            style={{ background: 'rgba(255,255,255,0.08)' }}>
                                            <motion.div
                                                className="absolute inset-y-0 left-0 rounded-full"
                                                style={{ background: barColor, boxShadow: `0 0 5px ${barColor}88` }}
                                                animate={{ width: `${fillPct}%` }}
                                                transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                                            />
                                        </div>
                                        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[8px] font-black"
                                            style={{
                                                background: `${barColor}22`,
                                                border: `1.5px solid ${barColor}55`,
                                                color: barColor,
                                                boxShadow: `0 0 6px ${barColor}44`,
                                            }}>
                                            {levelStr}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            </div>{/* ── close inner content div ── */}
                        </div>{/* ── close glass card div ── */}

                        {/* ── FAB button — inside card, top-right corner ── */}
                        <motion.button
                            onClick={(e) => { e.stopPropagation(); onOpenDetail && onOpenDetail(emp); }}
                            whileHover={{ scale: 1.10 }}
                            whileTap={{ scale: 0.92 }}
                            className="absolute flex items-center justify-center"
                            style={{
                                top: 14, right: 14, width: 44, height: 44,
                                borderRadius: '50%',
                                background: `radial-gradient(circle at 38% 35%, ${avatarColors[0]}55, rgba(14,14,28,0.88))`,
                                boxShadow: `0 4px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15), 0 0 12px ${avatarColors[0]}33`,
                                border: `1.5px solid ${avatarColors[0]}50`,
                                cursor: 'pointer',
                                zIndex: 20,
                            }}
                            title="เปิด Full Dashboard"
                        >
                            <ArrowUpRight size={18} className="text-white" style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))' }} />
                        </motion.button>
                    </motion.div>
                );
            })}

            {/* ── Nav arrows ─────────────────────────────────────────── */}
            <button onClick={onPrev}
                className="absolute left-0 top-[186px] -translate-x-5 z-40 w-9 h-9 rounded-full bg-white/8 border border-white/10 text-white/50 hover:bg-white/16 hover:text-white transition-all flex items-center justify-center backdrop-blur-sm">
                <ChevronLeft size={15} />
            </button>
            <button onClick={onNext}
                className="absolute right-0 top-[186px] translate-x-5 z-40 w-9 h-9 rounded-full bg-white/8 border border-white/10 text-white/50 hover:bg-white/16 hover:text-white transition-all flex items-center justify-center backdrop-blur-sm">
                <ChevronRight size={15} />
            </button>
        </div>
    );
}

// ─── Thumbnail Strip Carousel (centered wheel) ───────────────────────────────
function ThumbnailStrip({ employees, activeIndex, onSelect }) {
    const ITEM_W  = 52;
    const GAP     = 14;
    const STRIDE  = ITEM_W + GAP;

    const containerRef = useRef(null);
    const [containerW, setContainerW] = useState(0);

    useEffect(() => {
        if (!containerRef.current) return;
        const ro = new ResizeObserver(entries => {
            setContainerW(entries[0].contentRect.width);
        });
        ro.observe(containerRef.current);
        return () => ro.disconnect();
    }, []);

    // x offset that keeps activeIndex centered in container
    const offsetX = containerW / 2 - activeIndex * STRIDE - ITEM_W / 2;

    return (
        <div ref={containerRef} className="relative overflow-hidden mt-5" style={{ height: 70 }}>
            {/* Left fade mask */}
            <div className="absolute inset-y-0 left-0 w-14 z-10 pointer-events-none"
                style={{ background: 'linear-gradient(to right, #0A1A2F 30%, transparent)' }} />
            {/* Right fade mask */}
            <div className="absolute inset-y-0 right-0 w-14 z-10 pointer-events-none"
                style={{ background: 'linear-gradient(to left, #0A1A2F 30%, transparent)' }} />

            {/* Center highlight ring */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[26px] w-[52px] h-[52px] rounded-full pointer-events-none z-0"
                style={{ border: '1.5px solid rgba(201,163,78,0.35)', boxShadow: '0 0 12px rgba(201,163,78,0.15)' }} />

            {/* Animated row */}
            <motion.div
                className="absolute flex items-center"
                style={{ gap: GAP, top: 0, bottom: 0, left: 0 }}
                animate={{ x: containerW ? offsetX : 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            >
                {employees.map((e, i) => {
                    const dist       = Math.abs(i - activeIndex);
                    const isActive   = dist === 0;
                    const avatarColors = ROLE_AVATAR[e.role] || ROLE_AVATAR.GUEST;
                    const isInactive = e.status === 'INACTIVE';

                    return (
                        <motion.button
                            key={e.id}
                            onClick={() => onSelect(i)}
                            animate={{
                                scale:   isActive ? 1.12 : Math.max(0.58, 1 - dist * 0.15),
                                opacity: Math.max(0.08, 1 - dist * 0.27),
                            }}
                            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                            className="flex-shrink-0 flex flex-col items-center gap-1 focus:outline-none"
                            style={{ width: ITEM_W }}
                        >
                            <div
                                className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-white font-black text-sm"
                                style={{
                                    background: `linear-gradient(135deg, ${avatarColors[0]}, ${avatarColors[1]})`,
                                    border: isActive ? '2px solid rgba(255,255,255,0.35)' : '2px solid transparent',
                                    boxShadow: isActive ? `0 0 14px ${avatarColors[0]}66` : 'none',
                                    filter: isInactive ? 'grayscale(0.7)' : 'none',
                                }}
                            >
                                {e.profilePicture
                                    ? <img src={e.profilePicture} alt="" className="w-full h-full object-cover" />
                                    : (e.firstName || 'E').charAt(0)
                                }
                            </div>
                            <motion.span
                                animate={{ opacity: isActive ? 1 : 0 }}
                                transition={{ duration: 0.2 }}
                                className="text-[9px] text-white/65 font-bold whitespace-nowrap truncate text-center"
                                style={{ maxWidth: ITEM_W }}
                            >
                                {e.nickName || e.firstName}
                            </motion.span>
                        </motion.button>
                    );
                })}
            </motion.div>
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
    const [form, setForm] = useState({ firstName: '', lastName: '', nickName: '', email: '', phone: '', department: '', employmentType: 'employee', agentCode: '', role: 'AGENT', password: '', facebookName: '', facebookUrl: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleAdd = async () => {
        if (!form.firstName || !form.lastName || !form.email || !form.password) {
            setError('firstName, lastName, email, password จำเป็นต้องกรอก'); return;
        }
        if (!form.agentCode || form.agentCode.length < 3 || form.agentCode.length > 4) {
            setError('Agent Code ต้องเป็น 3-4 ตัวอักษร (เช่น AOI, FAH)'); return;
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
                        { key: 'agentCode', label: 'Agent Code * (3-4 ตัวอักษร เช่น AOI, FAH)', maxLength: 4 },
                        { key: 'email', label: 'Email *' },
                        { key: 'phone', label: 'โทรศัพท์' },
                        { key: 'password', label: 'รหัสผ่าน *', type: 'password' },
                    ].map(({ key, label, type, maxLength }) => (
                        <div key={key}>
                            <label className="text-[10px] text-white/40 font-black uppercase tracking-widest block mb-1.5">{label}</label>
                            <input
                                type={type || 'text'}
                                maxLength={maxLength}
                                value={form[key] || ''}
                                onChange={e => setForm(f => ({ ...f, [key]: key === 'agentCode' ? e.target.value.toUpperCase().replace(/[^A-Z]/g, '') : e.target.value }))}
                                className={`w-full bg-white/5 border border-white/10 text-white px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A34E]/40 transition-all ${key === 'agentCode' ? 'font-mono tracking-widest uppercase' : ''}`}
                                placeholder={key === 'agentCode' ? 'เช่น AOI, FAH, PNP' : ''}
                            />
                        </div>
                    ))}
                    {/* Employment Type select */}
                    <div>
                        <label className="text-[10px] text-white/40 font-black uppercase tracking-widest block mb-1.5">ประเภทการจ้าง</label>
                        <select
                            value={form.employmentType}
                            onChange={e => setForm(f => ({ ...f, employmentType: e.target.value }))}
                            className="w-full bg-[#0A1A2F] border border-white/10 text-white px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A34E]/40 transition-all appearance-none"
                        >
                            <option value="employee">พนักงานประจำ (EMP)</option>
                            <option value="freelance">ฟรีแลนซ์ (FL)</option>
                            <option value="contract">สัญญาจ้าง (CT)</option>
                        </select>
                    </div>
                    {/* Department select */}
                    <div>
                        <label className="text-[10px] text-white/40 font-black uppercase tracking-widest block mb-1.5">แผนก / ตำแหน่ง</label>
                        <select
                            value={form.department}
                            onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                            className="w-full bg-[#0A1A2F] border border-white/10 text-white px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A34E]/40 transition-all appearance-none"
                        >
                            <option value="">-- เลือกแผนก --</option>
                            <option value="marketing">Marketing (MKT)</option>
                            <option value="management">Management (MGT)</option>
                            <option value="purchasing">Purchasing (PD)</option>
                            <option value="sales">Sales (SLS)</option>
                            <option value="assistant manager">Assistant Manager (AM)</option>
                            <option value="admin">Admin (ADM)</option>
                            <option value="graphic design">Graphic Design (GD)</option>
                            <option value="computer graphic">Computer Graphic (CG)</option>
                            <option value="multimedia">Multimedia (MM)</option>
                            <option value="motion graphic">Motion Graphic (MGFX)</option>
                            <option value="editor">Editor (ED)</option>
                            <option value="content creator">Content Creator (CC)</option>
                        </select>
                    </div>
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

                    {/* Facebook fields */}
                    <div className="border-t border-white/8 pt-4">
                        <p className="text-[9px] text-[#1877F2]/60 font-black uppercase tracking-widest mb-3 flex items-center gap-1.5">
                            <Facebook size={10} /> Facebook (ไม่บังคับ)
                        </p>
                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] text-white/40 font-black uppercase tracking-widest block mb-1.5">ชื่อ Facebook</label>
                                <input
                                    type="text"
                                    placeholder="เช่น สมชาย ใจดี"
                                    value={form.facebookName || ''}
                                    onChange={e => setForm(f => ({ ...f, facebookName: e.target.value }))}
                                    className="w-full bg-white/5 border border-white/10 text-white px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1877F2]/30 transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-white/40 font-black uppercase tracking-widest block mb-1.5">Facebook URL / โปรไฟล์</label>
                                <input
                                    type="text"
                                    placeholder="facebook.com/username"
                                    value={form.facebookUrl || ''}
                                    onChange={e => setForm(f => ({ ...f, facebookUrl: e.target.value }))}
                                    className="w-full bg-white/5 border border-white/10 text-white px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1877F2]/30 transition-all font-mono"
                                />
                            </div>
                        </div>
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
    const detailPanelRef = useRef(null);
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
                            customers={customers}
                            onOpenDetail={(targetEmp) => {
                                // sync active card then scroll to detail panel
                                const idx = filtered.findIndex(e => e.id === targetEmp.id);
                                if (idx >= 0) setActiveIndex(idx);
                                setTimeout(() => {
                                    detailPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }, 80);
                            }}
                        />
                    </div>

                    <ThumbnailStrip
                        employees={filtered}
                        activeIndex={safeIndex}
                        onSelect={setActiveIndex}
                    />
                </div>

                {/* RIGHT — Dashboard */}
                {emp && (
                    <div ref={detailPanelRef} className="space-y-5">
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
                                        { icon: Mail,      label: 'Email',       val: emp.email },
                                        { icon: Phone,     label: 'Phone',       val: emp.phone || '—' },
                                        { icon: Building2, label: 'Dept',        val: emp.department || '—' },
                                        { icon: BadgeCheck,label: 'Employee ID', val: emp.employeeId },
                                        { icon: IdCard,    label: 'Agent ID',    val: emp.agentId || '—' },
                                        { icon: Star,      label: 'Agent Code',  val: emp.agentCode || '—' },
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

                                    {/* Facebook section */}
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-xl bg-[#1877F2]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <Facebook size={13} className="text-[#1877F2]/70" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[9px] text-white/30 font-black uppercase tracking-widest mb-0.5">Facebook</p>
                                            <p className="text-white/80 text-xs font-bold truncate">{emp.facebookName || '—'}</p>
                                            {emp.facebookUrl ? (
                                                <a
                                                    href={emp.facebookUrl.startsWith('http') ? emp.facebookUrl : `https://${emp.facebookUrl}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-[#1877F2]/70 hover:text-[#1877F2] text-[10px] font-mono truncate block transition-colors"
                                                >
                                                    {emp.facebookUrl}
                                                </a>
                                            ) : (
                                                <p className="text-white/20 text-[10px]">ไม่มี URL</p>
                                            )}
                                        </div>
                                    </div>
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

                            {/* Facebook fields */}
                            <div className="border-t border-white/8 pt-4">
                                <p className="text-[9px] text-[#1877F2]/60 font-black uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                    <Facebook size={10} /> Facebook
                                </p>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-[10px] text-white/40 font-black uppercase tracking-widest block mb-1.5">ชื่อ Facebook</label>
                                        <input
                                            type="text"
                                            placeholder="เช่น สมชาย ใจดี"
                                            value={editForm.facebookName || ''}
                                            onChange={e => setEditForm(f => ({ ...f, facebookName: e.target.value }))}
                                            className="w-full bg-white/5 border border-white/10 text-white px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1877F2]/30 transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-white/40 font-black uppercase tracking-widest block mb-1.5">Facebook URL / โปรไฟล์</label>
                                        <input
                                            type="text"
                                            placeholder="facebook.com/username หรือ https://..."
                                            value={editForm.facebookUrl || ''}
                                            onChange={e => setEditForm(f => ({ ...f, facebookUrl: e.target.value }))}
                                            className="w-full bg-white/5 border border-white/10 text-white px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1877F2]/30 transition-all font-mono"
                                        />
                                    </div>
                                </div>
                            </div>

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
