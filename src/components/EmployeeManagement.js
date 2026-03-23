'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
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
    Briefcase,
    Camera,
    Cake,
    Medal,
} from 'lucide-react';
import PermissionMatrix from './PermissionMatrix';
import { can } from '@/lib/permissionMatrix';

// ─── Role config (Phase 36 — S/R role redesign) ───────────────────────────────
// levelNum ใช้คำนวณ priority bar (0–5), level ใช้แสดงผล (S1, R2, ...)
const ROLE_META = {
    DEV: { label: 'Developer',   level: 'S1',  levelNum: 5,   bg: 'from-violet-600 to-purple-800',   badge: 'bg-violet-500/20 text-violet-300 border-violet-500/30' },
    TEC: { label: 'Tech / IT',   level: 'S2',  levelNum: 3.5, bg: 'from-cyan-500 to-cyan-800',       badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
    MGR: { label: 'Management',  level: 'R2',  levelNum: 4,   bg: 'from-blue-600 to-blue-900',       badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    MKT: { label: 'Marketing',   level: 'R3',  levelNum: 2.5, bg: 'from-pink-600 to-rose-800',       badge: 'bg-pink-500/20 text-pink-300 border-pink-500/30' },
    HR:  { label: 'HR',          level: 'R4',  levelNum: 3,   bg: 'from-indigo-500 to-indigo-800',   badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
    PUR: { label: 'Purchasing',  level: 'R5',  levelNum: 2.5, bg: 'from-amber-500 to-amber-800',     badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    PD:  { label: 'Warehouse',   level: 'R6',  levelNum: 2.5, bg: 'from-orange-500 to-orange-800',   badge: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
    ADM: { label: 'Admin / Doc', level: 'R7',  levelNum: 2,   bg: 'from-teal-500 to-teal-800',       badge: 'bg-teal-500/20 text-teal-300 border-teal-500/30' },
    ACC: { label: 'Accounting',  level: 'R8',  levelNum: 3,   bg: 'from-emerald-500 to-emerald-800', badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    SLS: { label: 'Sales',       level: 'R9',  levelNum: 1.5, bg: 'from-red-500 to-rose-800',        badge: 'bg-red-500/20 text-red-300 border-red-500/30' },
    AGT: { label: 'Agent',       level: 'R10', levelNum: 1,   bg: 'from-rose-400 to-rose-700',       badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
    STF: { label: 'Staff',       level: 'R11', levelNum: 0.5, bg: 'from-slate-500 to-slate-700',     badge: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
};

const ALL_ROLES = ['DEV','TEC','MGR','MKT','HR','PUR','PD','ADM','ACC','SLS','AGT','STF'];

// ─── Grade config ──────────────────────────────────────────────────────────────
// S = Special (food plating specialist / chef competition winner)
const GRADE_META = {
    S: { label: 'S', desc: 'Special',   color: '#f0c040', bg: 'rgba(240,192,64,0.18)',  border: 'rgba(240,192,64,0.45)' },
    A: { label: 'A', desc: 'ดีมาก',     color: '#60a5fa', bg: 'rgba(96,165,250,0.15)',  border: 'rgba(96,165,250,0.40)' },
    B: { label: 'B', desc: 'ดี',        color: '#34d399', bg: 'rgba(52,211,153,0.15)',  border: 'rgba(52,211,153,0.40)' },
    C: { label: 'C', desc: 'พอใช้',     color: '#fbbf24', bg: 'rgba(251,191,36,0.15)',  border: 'rgba(251,191,36,0.40)' },
    D: { label: 'D', desc: 'ต้องปรับปรุง', color: '#f87171', bg: 'rgba(248,113,113,0.15)', border: 'rgba(248,113,113,0.40)' },
};

// Avatar gradient colors (for card dark-bg design)
const ROLE_AVATAR = {
    DEV: ['#7c3aed','#4c1d95'],
    TEC: ['#06b6d4','#164e63'],
    MGR: ['#2563eb','#1e3a8a'],
    MKT: ['#db2777','#831843'],
    HR:  ['#6366f1','#312e81'],
    PUR: ['#f59e0b','#92400e'],
    PD:  ['#f97316','#9a3412'],
    ADM: ['#14b8a6','#134e4a'],
    ACC: ['#10b981','#064e3b'],
    SLS: ['#ef4444','#7f1d1d'],
    AGT: ['#fb7185','#881337'],
    STF: ['#64748b','#1e293b'],
};

// ─── Rank / Score system ──────────────────────────────────────────────────────
const RANK_CONFIG = {
    S: { label: 'Specialist', color: '#FFD700', bg: 'rgba(255,215,0,0.13)',   border: 'rgba(255,215,0,0.40)',   glow: '0 0 18px rgba(255,215,0,0.50)' },
    A: { label: 'Expert',     color: '#c084fc', bg: 'rgba(192,132,252,0.13)', border: 'rgba(192,132,252,0.40)', glow: '0 0 18px rgba(192,132,252,0.45)' },
    B: { label: 'Proficient', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.35)',  glow: '0 0 16px rgba(96,165,250,0.40)' },
    C: { label: 'Developing', color: '#34d399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.35)',  glow: '0 0 14px rgba(52,211,153,0.35)' },
    D: { label: 'Beginner',   color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.25)', glow: 'none' },
};

function getRankLetter(score) {
    if (score >= 90) return 'S';
    if (score >= 75) return 'A';
    if (score >= 55) return 'B';
    if (score >= 35) return 'C';
    return 'D';
}

/**
// ─── Animation helpers ────────────────────────────────────────────────────────
/** Count up from 0 → target using rAF with ease-out cubic, resets when target changes */
function useCountUp(target, duration = 900) {
    const [val, setVal] = useState(0);
    useEffect(() => {
        setVal(0);
        if (!target) return;
        const startTime = performance.now();
        let raf;
        const tick = (now) => {
            const progress = Math.min((now - startTime) / duration, 1);
            const eased    = 1 - Math.pow(1 - progress, 3); // ease-out cubic
            setVal(Math.round(eased * target));
            if (progress < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [target, duration]);
    return val;
}

/** Renders an animated metric value string: "72%", "฿12k", "5", "฿500" */
function AnimatedMetricValue({ value }) {
    const isBaht = String(value).startsWith('฿');
    const isK    = String(value).includes('k');
    const isPct  = String(value).endsWith('%');
    const raw    = parseFloat(String(value).replace(/[฿k%,]/g, ''));
    const target = isNaN(raw) ? 0 : (isK ? raw * 1000 : raw);
    const anim   = useCountUp(target);
    if (isNaN(raw)) return <span>{value}</span>;
    if (isBaht)     return <span>฿{anim >= 1000 ? Math.round(anim / 1000) + 'k' : anim}</span>;
    if (isPct)      return <span>{anim}%</span>;
    return <span>{anim}</span>;
}

/** Animated progress bar — framer-motion width 0 → norm% */
function AnimatedBar({ norm, color, delay = 0 }) {
    return (
        <div className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
            <motion.div
                className="h-full rounded-full"
                style={{ background: color, boxShadow: `0 0 4px ${color}66` }}
                initial={{ width: 0 }}
                animate={{ width: `${norm}%` }}
                transition={{ duration: 0.7, delay, ease: 'easeOut' }}
            />
        </div>
    );
}

/**
 * getEmployeeDomain — classify by role + department
 * 'kitchen' : HEAD_CHEF or department contains kitchen/chef/culinary/cook
 * 'admin'   : OWNER/MANAGER/DEVELOPER/ADMIN
 * 'sales'   : everything else (AGENT, EMPLOYEE, MARKETING, etc.)
 */
function getEmployeeDomain(emp) {
    if (!emp) return 'sales';
    const role = (emp.role || '').toUpperCase();
    const dept = (emp.department || '').toLowerCase();
    if (role === 'HEAD_CHEF' || /kitchen|chef|culinary|cook|ครัว/.test(dept)) return 'kitchen';
    if (['OWNER','MANAGER','DEVELOPER','ADMIN'].includes(role))                return 'admin';
    return 'sales';
}

/**
 * calcEmployeeScore — composite 100-pt score
 * Metrics differ by domain so kitchen staff don't see irrelevant REVENUE/CUSTOMERS
 */
function calcEmployeeScore(linked, domain = 'sales') {
    // HR placeholders — replace with real values when HR table is integrated
    const attendance = 80;
    const jobDone    = 72;
    const teamwork   = 78;

    if (domain === 'kitchen') {
        // Kitchen: score is purely HR metrics (no customer/revenue data)
        const score = Math.round(jobDone * 0.35 + teamwork * 0.30 + attendance * 0.35);
        return {
            score: Math.min(score, 100),
            metrics: [
                { label: 'Job Done',  value: `${jobDone}%`,    norm: jobDone,    note: 'placeholder' },
                { label: 'Teamwork',  value: `${teamwork}%`,   norm: teamwork,   note: 'placeholder' },
                { label: 'Attend',    value: `${attendance}%`, norm: attendance, note: 'placeholder' },
                { label: 'Job Done',  value: `${jobDone}%`,    norm: jobDone,    note: 'placeholder' },
                { label: 'Teamwork',  value: `${teamwork}%`,   norm: teamwork,   note: 'placeholder' },
                { label: 'Attend',    value: `${attendance}%`, norm: attendance, note: 'placeholder' },
            ],
        };
    }

    // Sales / Admin domain: include customer & revenue metrics
    const custCount  = linked.assignedCustomers.length;
    const revenue    = linked.totalRevenue;
    const validSales = linked.sales.filter(s => s.status !== 'CANCELLED').length;
    const closeRate  = custCount > 0 ? Math.round((validSales / custCount) * 100) : 0;
    const custNorm   = Math.min(Math.round((custCount / 15) * 100), 100);
    const revNorm    = Math.min(Math.round((revenue  / 80000) * 100), 100);
    const closeNorm  = closeRate;

    const score = Math.round(
        custNorm   * 0.15 +
        revNorm    * 0.20 +
        closeNorm  * 0.15 +
        jobDone    * 0.20 +
        teamwork   * 0.15 +
        attendance * 0.15
    );

    return {
        score: Math.min(score, 100),
        metrics: [
            { label: 'ลูกค้า',  value: `${custCount}`,              norm: custNorm,  note: 'customers' },
            { label: 'ยอดขาย', value: revenue >= 1000 ? `฿${Math.round(revenue/1000)}k` : `฿${revenue}`, norm: revNorm, note: 'revenue' },
            { label: 'Close%',  value: `${closeRate}%`,             norm: closeNorm, note: 'close rate' },
            { label: 'Job Done',value: `${jobDone}%`,               norm: jobDone,   note: 'placeholder' },
            { label: 'Teamwork',value: `${teamwork}%`,              norm: teamwork,  note: 'placeholder' },
            { label: 'Attend',  value: `${attendance}%`,            norm: attendance,note: 'placeholder' },
        ],
    };
}

// ─── Tenure calculator ───────────────────────────────────────────────────────
// Prefers hiredAt (actual start date); falls back to createdAt (system registration date)
function calcTenure(hiredAt, createdAt) {
    const raw = hiredAt || createdAt;
    if (!raw) return null;
    const start = new Date(raw);
    const now   = new Date();
    let years  = now.getFullYear() - start.getFullYear();
    let months = now.getMonth()    - start.getMonth();
    if (months < 0) { years--; months += 12; }
    if (years < 0)  return null;
    if (years === 0 && months === 0) {
        const days = Math.floor((now - start) / 86400000);
        return { label: `${days} วัน`, short: `${days}d` };
    }
    if (years === 0) return { label: `${months} เดือน`, short: `${months}m` };
    if (months === 0) return { label: `${years} ปี`, short: `${years}y` };
    return { label: `${years} ปี ${months} เดือน`, short: `${years}y ${months}m` };
}

// Age calculator from dateOfBirth — returns null if no value
function calcAge(dateOfBirth) {
    if (!dateOfBirth) return null;
    const birth = new Date(dateOfBirth);
    const now   = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const monthDiff = now.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age--;
    return age >= 0 ? age : null;
}

// Format dateOfBirth to CE display string: "1 มกราคม 1990 (อายุ 34 ปี)"
const MONTHS_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
function formatDOB(dateOfBirth) {
    if (!dateOfBirth) return null;
    const d   = new Date(dateOfBirth);
    const day = d.getDate();
    const mon = MONTHS_TH[d.getMonth()];
    const yr  = d.getFullYear();
    const age = calcAge(dateOfBirth);
    return { short: `${day} ${mon} ${yr}`, full: `${day} ${mon} ${yr}${age !== null ? ` (${age} ปี)` : ''}` };
}

// Circular SVG score ring — animated arc draw
function ScoreRing({ score, color, size = 56 }) {
    const r    = (size - 7) / 2;
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
            style={{ transform: 'rotate(-90deg)', display: 'block' }}>
            <circle cx={size/2} cy={size/2} r={r}
                fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="4.5" />
            <motion.circle
                cx={size/2} cy={size/2} r={r}
                fill="none" stroke={color} strokeWidth="4.5"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: score / 100 }}
                transition={{ duration: 0.9, ease: 'easeOut' }}
                style={{ filter: `drop-shadow(0 0 4px ${color}99)` }}
            />
        </svg>
    );
}

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

// ─── Sparkline SVG — animated line draw ──────────────────────────────────────
function Sparkline({ sales = [], color = '#00f5ff' }) {
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

    // Build SVG path from points
    const points = data.map((v, i) => [
        (i / (data.length - 1)) * W,
        H - (v / max) * (H - 4) - 2
    ]);
    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ');
    const areaPath = `${linePath} L${W},${H} L0,${H}Z`;

    return (
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full" style={{ height: H }}>
            <defs>
                <linearGradient id={`spk-${cx}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.30" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.01" />
                </linearGradient>
            </defs>
            {/* Area fill fades in */}
            <motion.path
                d={areaPath} fill={`url(#spk-${cx})`}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.8 }}
            />
            {/* Line draws left → right */}
            <motion.path
                d={linePath}
                fill="none" stroke={color} strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.1, ease: 'easeInOut' }}
                style={{ filter: `drop-shadow(0 0 3px ${color}88)` }}
            />
            {/* Dot at end of line */}
            <motion.circle
                cx={points[points.length - 1][0]}
                cy={points[points.length - 1][1]}
                r={2} fill={color}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3, delay: 1.1 }}
                style={{ filter: `drop-shadow(0 0 4px ${color})` }}
            />
        </svg>
    );
}

// ─── Mini Dashboard ───────────────────────────────────────────────────────────
// Wrapper: watches isActive → increments animKey → forces full content remount
// so every animation (count-up, arc, sparkline) replays on each card-swipe
function MiniDashboard({ emp, linked, barColor, isActive }) {
    const [animKey, setAnimKey] = useState(0);
    useEffect(() => {
        if (isActive) setAnimKey(k => k + 1);
    }, [isActive]);
    return <MiniDashboardContent key={animKey} emp={emp} linked={linked} barColor={barColor} />;
}

function MiniDashboardContent({ emp, linked, barColor }) {
    const domain     = getEmployeeDomain(emp);
    const { score, metrics } = calcEmployeeScore(linked, domain);
    const rankLetter = getRankLetter(score);
    const rank       = RANK_CONFIG[rankLetter];
    const animScore  = useCountUp(score);

    return (
        <div className="flex flex-col gap-2 h-full">
            {/* ── Rank zone ── */}
            <div className="flex items-center gap-3"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '10px 12px' }}>

                {/* Rank badge */}
                <div className="flex flex-col items-center justify-center shrink-0 w-[52px] h-[52px] rounded-2xl"
                    style={{ background: rank.bg, border: `1.5px solid ${rank.border}`, boxShadow: rank.glow }}>
                    <span className="font-black leading-none" style={{ fontSize: 22, color: rank.color }}>{rankLetter}</span>
                    <span className="text-[7px] font-black uppercase tracking-widest" style={{ color: rank.color, opacity: 0.7 }}>{rank.label.substring(0,4)}</span>
                </div>

                {/* Score ring — arc draws in, number counts up */}
                <div className="relative shrink-0">
                    <ScoreRing score={score} color={rank.color} size={52} />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="font-black text-[13px] leading-none" style={{ color: rank.color }}>{animScore}</span>
                    </div>
                </div>

                {/* Score breakdown bars — animate width */}
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                    {metrics.slice(0, 3).map((m, idx) => (
                        <div key={m.label} className="flex items-center gap-1.5">
                            <span className="text-white/35 text-[8px] w-[38px] shrink-0 truncate">{m.label}</span>
                            <AnimatedBar norm={m.norm} color={rank.color} delay={idx * 0.12} />
                            <span className="text-white/55 text-[8px] font-bold w-[24px] text-right shrink-0">
                                <AnimatedMetricValue value={m.value} />
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── 3 bottom metrics row — values count up ── */}
            <div className="grid grid-cols-3 gap-1.5">
                {metrics.slice(3).map((m, idx) => (
                    <motion.div
                        key={m.label}
                        className="flex flex-col items-center justify-center py-1.5 rounded-xl"
                        style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${m.note === 'placeholder' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.08)'}` }}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.3 + idx * 0.08 }}
                    >
                        <span className="font-black text-[13px] leading-none"
                            style={{ color: m.note === 'placeholder' ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.85)' }}>
                            <AnimatedMetricValue value={m.value} />
                        </span>
                        <span className="text-white/25 text-[7px] uppercase tracking-widest mt-0.5">{m.label}</span>
                        {m.note === 'placeholder' && (
                            <span className="text-[6px] text-white/15 mt-0.5">HR pending</span>
                        )}
                    </motion.div>
                ))}
            </div>

            {/* ── Sparkline — sales/admin only ── */}
            {domain !== 'kitchen' && (
                <div className="rounded-xl overflow-hidden px-2 pt-1 pb-0.5"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <p className="text-white/18 text-[7px] uppercase tracking-widest mb-0.5">6-month revenue</p>
                    <Sparkline sales={linked.sales} color={barColor} />
                </div>
            )}
            {domain === 'kitchen' && (
                <div className="rounded-xl px-3 py-2 flex items-center gap-2"
                    style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.15)' }}>
                    <span style={{ fontSize: 14 }}>👨‍🍳</span>
                    <span className="text-[9px] text-orange-300/60 uppercase tracking-widest">Kitchen Staff — HR metrics only</span>
                </div>
            )}
        </div>
    );
}

// ─── File-folder Stacked Card Deck (Framer Motion) ───────────────────────────
function EmployeeCardDeck({ employees, activeIndex, onNext, onPrev, onStatusToggle, canManage, togglingStatus, customers = [], onOpenDetail, onEditDirect, currentUser }) {
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
            opacity: abs === 0 ? 1 : abs === 1 ? 0.35 : abs === 2 ? 0.12 : 0,
            zIndex:  abs === 0 ? 30     : 30 - abs * 6,
            x: 0,
        };
    };

    return (
        <div className="relative select-none mx-auto" style={{ height: 534, width: 340 }}>

            {/* Cards — rendered back→front via zIndex, all employees keyed by id */}
            {employees.map((emp, i) => {
                const offset  = getOffset(i);
                const abs     = Math.abs(offset);
                if (abs > 3) return null;   // skip far-off cards entirely

                const isActive = offset === 0;
                const isMyCard = !!(currentUser?.email && emp.email === currentUser.email);
                const meta     = getRoleMeta(emp.role);
                const animate  = getAnimate(offset);
                const isInactive = emp.status === 'INACTIVE';

                const avatarColors = ROLE_AVATAR[emp.role] || ROLE_AVATAR.GUEST;
                const contactItems = [
                    emp.phone        && { icon: Phone,    label: emp.phone },
                    emp.email        && { icon: Mail,     label: 'Email' },
                    emp.facebookName && { icon: Facebook, label: emp.facebookName },
                ].filter(Boolean);

                // Permission level bar — use levelNum from ROLE_META (not parsed string)
                const levelStr  = meta.level;    // e.g. 'S1', 'R2', 'R11'
                const levelNum  = meta.levelNum ?? 1;
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
                            width: 340,
                            height: 492,
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
                            {/* ③ Linear shimmer sweep — front card only */}
                            {isActive && (
                                <motion.div
                                    className="absolute inset-0 pointer-events-none"
                                    style={{
                                        background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.13) 50%, transparent 65%)',
                                        borderRadius: 'inherit',
                                    }}
                                    animate={{ x: ['-110%', '210%'] }}
                                    transition={{ duration: 2.2, repeat: Infinity, ease: 'linear', repeatDelay: 3.5 }}
                                />
                            )}

                            {/* Content sits on top */}
                            <div className="relative flex flex-col h-full p-5" style={{ zIndex: 1 }}>

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
                                        {meta.label}{emp.jobTitle ? ` · ${emp.jobTitle}` : emp.department ? ` · ${emp.department}` : ''}
                                        {emp.nickName ? ` · "${emp.nickName}"` : ''}
                                    </p>
                                    {emp.employeeId && (
                                        <p className="text-white/28 text-[9px] mt-0.5 font-mono tracking-wider truncate">
                                            {emp.employeeId}
                                        </p>
                                    )}
                                    {/* Tenure + Grade badges row */}
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {(() => {
                                            const tenure = calcTenure(emp.hiredAt, emp.createdAt);
                                            if (!tenure) return null;
                                            return (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest"
                                                    style={{ background: `${avatarColors[0]}20`, border: `1px solid ${avatarColors[0]}40`, color: avatarColors[0] }}>
                                                    <svg width="7" height="7" viewBox="0 0 7 7" fill="none" style={{ display:'inline' }}>
                                                        <circle cx="3.5" cy="3.5" r="3" stroke="currentColor" strokeWidth="1"/>
                                                        <path d="M3.5 2v1.5l1 0.7" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round"/>
                                                    </svg>
                                                    {tenure.label}
                                                </span>
                                            );
                                        })()}
                                        {/* Grade badge */}
                                        {emp.grade && GRADE_META[emp.grade] && (() => {
                                            const g = GRADE_META[emp.grade];
                                            return (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest"
                                                    style={{ background: g.bg, border: `1px solid ${g.border}`, color: g.color }}>
                                                    <Medal size={7} style={{ display:'inline' }} />
                                                    Grade {g.label} · {g.desc}
                                                </span>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>

                            {/* ── MINI DASHBOARD ── */}
                            <div className="mt-3 flex-1 min-h-0">
                                <MiniDashboard emp={emp} linked={linked} barColor={barColor} isActive={isActive} />
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

                            {/* ── "My Card" indicator ── */}
                            {isMyCard && (
                                <>
                                    {/* Gold accent line at top */}
                                    <div className="absolute top-0 inset-x-0 h-[2px] pointer-events-none"
                                        style={{
                                            background: 'linear-gradient(90deg, transparent, #cc9d37, transparent)',
                                            borderTopLeftRadius: 32, borderTopRightRadius: 32,
                                        }} />
                                    {/* YOU pill — bottom center */}
                                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
                                        <div className="flex items-center gap-1 px-2.5 py-[3px] rounded-full text-[8px] font-black uppercase tracking-widest"
                                            style={{
                                                background: 'rgba(201,163,78,0.16)',
                                                border: '1px solid rgba(201,163,78,0.50)',
                                                color: '#cc9d37',
                                            }}>
                                            ◆ การ์ดของคุณ
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>{/* ── close glass card div ── */}

                        {/* ── FAB button — top-right corner ── */}
                        <motion.button
                            onClick={(e) => { e.stopPropagation(); onOpenDetail && onOpenDetail(emp); }}
                            whileHover={{ scale: 1.10 }}
                            whileTap={{ scale: 0.92 }}
                            className="absolute flex items-center justify-center"
                            style={{
                                top: 14, right: 14, width: 44, height: 44,
                                borderRadius: '50%',
                                background: `linear-gradient(135deg, ${avatarColors[0]}, ${avatarColors[1]})`,
                                boxShadow: `0 4px 20px ${avatarColors[0]}55, 0 0 0 2px rgba(255,255,255,0.12)`,
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
                style={{ background: 'linear-gradient(to right, #0c1a2f 30%, transparent)' }} />
            {/* Right fade mask */}
            <div className="absolute inset-y-0 right-0 w-14 z-10 pointer-events-none"
                style={{ background: 'linear-gradient(to left, #0c1a2f 30%, transparent)' }} />

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
// rawValue: numeric target for count-up animation
// format: (n) => string  — e.g. v => `฿${v.toLocaleString()}` or v => `${v}%`
function StatCard({ icon: Icon, label, value, rawValue, format, sub, accent = false }) {
    const animVal = useCountUp(typeof rawValue === 'number' ? rawValue : 0);
    const display = typeof rawValue === 'number'
        ? (format ? format(animVal) : String(animVal))
        : value;
    return (
        <div className={`rounded-2xl p-5 border flex flex-col gap-2 ${accent
            ? 'bg-[#cc9d37]/10 border-[#cc9d37]/20'
            : 'bg-white/5 border-white/8'}`}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${accent ? 'bg-[#cc9d37]/20 text-[#cc9d37]' : 'bg-white/10 text-white/40'}`}>
                <Icon size={16} />
            </div>
            <p className="text-white/40 text-[9px] font-black uppercase tracking-widest">{label}</p>
            <p className={`text-xl font-black ${accent ? 'text-[#cc9d37]' : 'text-white'}`}>{display}</p>
            {sub && <p className="text-white/30 text-[10px]">{sub}</p>}
        </div>
    );
}

// ─── Add Employee Modal ───────────────────────────────────────────────────────
function AddEmployeeModal({ onClose, onSaved }) {
    const [form, setForm] = useState({ firstName: '', lastName: '', nickName: '', email: '', phone: '', department: '', jobTitle: '', employmentType: 'employee', agentCode: '', role: 'AGENT', password: '', facebookName: '', facebookUrl: '', hiredAt: '', dateOfBirth: '', grade: '' });
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
            <div className="bg-[#0c1a2f] border border-white/10 rounded-[2rem] w-full max-w-lg p-8 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
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
                                className={`w-full bg-white/5 border border-white/10 text-white px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#cc9d37]/40 transition-all ${key === 'agentCode' ? 'font-mono tracking-widest uppercase' : ''}`}
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
                            className="w-full bg-[#0c1a2f] border border-white/10 text-white px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#cc9d37]/40 transition-all appearance-none"
                        >
                            <option value="employee">พนักงานประจำ (EMP)</option>
                            <option value="freelance">ฟรีแลนซ์ (FL)</option>
                            <option value="contract">สัญญาจ้าง (CT)</option>
                        </select>
                    </div>
                    {/* Department select */}
                    <div>
                        <label className="text-[10px] text-white/40 font-black uppercase tracking-widest block mb-1.5">แผนก (Department)</label>
                        <select
                            value={form.department}
                            onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                            className="w-full bg-[#0c1a2f] border border-white/10 text-white px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#cc9d37]/40 transition-all appearance-none"
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
                    {/* Job Title input */}
                    <div>
                        <label className="text-[10px] text-white/40 font-black uppercase tracking-widest block mb-1.5">ตำแหน่ง (Job Title)</label>
                        <input
                            type="text"
                            placeholder="เช่น Pastry Chef, Marketing Officer"
                            value={form.jobTitle}
                            onChange={e => setForm(f => ({ ...f, jobTitle: e.target.value }))}
                            className="w-full bg-[#0c1a2f] border border-white/10 text-white px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#cc9d37]/40 transition-all"
                        />
                    </div>
                    {/* Role select */}
                    <div>
                        <label className="text-[10px] text-white/40 font-black uppercase tracking-widest block mb-1.5">Role</label>
                        <select
                            value={form.role}
                            onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                            className="w-full bg-[#0c1a2f] border border-white/10 text-white px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#cc9d37]/40 transition-all appearance-none"
                        >
                            {ALL_ROLES.map(r => (
                                <option key={r} value={r}>{ROLE_META[r].label} ({ROLE_META[r].level})</option>
                            ))}
                        </select>
                    </div>

                    {/* วันที่เริ่มงาน */}
                    <div>
                        <label className="text-[10px] text-white/40 font-black uppercase tracking-widest block mb-1.5">วันที่เริ่มงาน</label>
                        <input
                            type="date"
                            value={form.hiredAt || ''}
                            onChange={e => setForm(f => ({ ...f, hiredAt: e.target.value }))}
                            className="w-full bg-white/5 border border-white/10 text-white px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#cc9d37]/40 transition-all"
                            style={{ colorScheme: 'dark' }}
                        />
                        <p className="text-[9px] text-white/20 mt-1 ml-1">ใช้คำนวณอายุงาน — ถ้าไม่ใส่จะใช้วันที่ลงระบบแทน</p>
                    </div>

                    {/* วันเดือนปีเกิด (Add Modal) */}
                    <div>
                        <label className="text-[10px] text-white/40 font-black uppercase tracking-widest block mb-1.5">วันเดือนปีเกิด (ค.ศ.)</label>
                        <input
                            type="date"
                            value={form.dateOfBirth || ''}
                            onChange={e => setForm(f => ({ ...f, dateOfBirth: e.target.value }))}
                            className="w-full bg-white/5 border border-white/10 text-white px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#cc9d37]/40 transition-all"
                            style={{ colorScheme: 'dark' }}
                        />
                        {form.dateOfBirth && (() => {
                            const d = formatDOB(form.dateOfBirth);
                            return d ? <p className="text-[9px] text-[#cc9d37]/60 mt-1 ml-1">{d.full}</p> : null;
                        })()}
                    </div>

                    {/* isInstructor toggle */}
                    <div className="col-span-2">
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <div
                                onClick={() => setForm(f => ({ ...f, isInstructor: !f.isInstructor }))}
                                className={`relative w-11 h-6 rounded-full transition-colors ${form.isInstructor ? 'bg-[#cc9d37]' : 'bg-white/10'}`}
                            >
                                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.isInstructor ? 'translate-x-6' : 'translate-x-1'}`} />
                            </div>
                            <div>
                                <p className="text-sm font-black text-white group-hover:text-[#cc9d37] transition-colors">เชฟ / อาจารย์ผู้สอน</p>
                                <p className="text-[9px] text-white/30">เปิดเพื่อให้ปรากฏในรายชื่อผู้สอนเมื่อสร้างรอบเรียน</p>
                            </div>
                        </label>
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
                                    autoComplete="off"
                                    readOnly
                                    onFocus={e => e.target.removeAttribute('readonly')}
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
                                    autoComplete="off"
                                    readOnly
                                    onFocus={e => e.target.removeAttribute('readonly')}
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
                        className="flex-1 py-3 rounded-xl bg-[#cc9d37] hover:bg-amber-400 text-[#0c1a2f] text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-[#cc9d37]/20 disabled:opacity-50">
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
    const [saveError, setSaveError] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const avatarInputRef = useRef(null);

    // ── Profile picture upload: convert file → base64 → editForm.profilePicture ──
    const handleAvatarChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            setEditForm(f => ({ ...f, profilePicture: ev.target.result }));
        };
        reader.readAsDataURL(file);
    };

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
    const empDomain = getEmployeeDomain(emp);
    const validSalesCount = sales.filter(s => s.status !== 'CANCELLED').length;
    const closeRate = assignedCustomers.length > 0
        ? Math.round((validSalesCount / assignedCustomers.length) * 100)
        : 0;

    const goNext = () => setActiveIndex(i => (i + 1) % filtered.length);
    const goPrev = () => setActiveIndex(i => (i - 1 + filtered.length) % filtered.length);

    // ── Save edit (accepts optional payload to avoid async state issue) ────────
    const handleSave = async (payload) => {
        if (!emp) return;
        const body = payload || editForm;
        setIsSaving(true);
        setSaveError(null);
        try {
            const res = await fetch(`/api/employees/${emp.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const result = await res.json();
            if (result.success) {
                onRefresh?.();
                setIsEditing(false);
            } else {
                setSaveError(result.error || 'บันทึกไม่สำเร็จ กรุณาลองใหม่');
            }
        } catch (err) {
            console.error('[EmployeeManagement] save failed', err);
            setSaveError('เกิดข้อผิดพลาด กรุณาลองใหม่');
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
                    <h2 className="text-3xl font-black text-[#f5f8fb] tracking-tight mb-1">Employee Directory</h2>
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
                            className="bg-white/5 border border-white/10 text-white pl-10 pr-5 py-2.5 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#cc9d37]/40 w-48 transition-all"
                        />
                    </div>
                    {/* Add button — canManage only */}
                    {canManage ? (
                        <button
                            onClick={() => setIsAdding(true)}
                            className="bg-[#cc9d37] hover:bg-amber-400 text-[#0c1a2f] px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-[#cc9d37]/20 active:scale-95 flex items-center gap-2">
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
                            currentUser={currentUser}
                            onEditDirect={(targetEmp) => {
                                const idx = filtered.findIndex(e => e.id === targetEmp.id);
                                if (idx >= 0) setActiveIndex(idx);
                                const roles = (targetEmp.roles && targetEmp.roles.length > 0) ? targetEmp.roles : [targetEmp.role || 'AGENT'];
                                setEditForm({ ...targetEmp, roles });
                                setIsEditing(true);
                            }}
                            onOpenDetail={(targetEmp) => {
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
                        {/* Tab bar + Edit button */}
                        <div className="flex items-center gap-2">
                            <div className="flex flex-1 gap-1 bg-white/5 border border-white/8 rounded-2xl p-1">
                                {[
                                    { id: 'overview', icon: IdCard, label: 'Overview' },
                                    ...(can(currentUser?.role, 'system', 'view') ? [{ id: 'permissions', icon: Shield, label: 'Permissions' }] : []),
                                    ...(empDomain !== 'kitchen' ? [
                                        { id: 'customers', icon: Users,   label: `Customers (${assignedCustomers.length})` },
                                        { id: 'sales',     icon: Receipt, label: `Sales (${sales.length})` },
                                    ] : []),
                                ].map(tab => (
                                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === tab.id
                                            ? 'bg-[#cc9d37] text-[#0c1a2f] shadow-lg shadow-[#cc9d37]/20'
                                            : 'text-white/40 hover:text-white'}`}>
                                        <tab.icon size={12} />
                                        <span className="hidden md:inline">{tab.label}</span>
                                    </button>
                                ))}
                            </div>
                            {/* Edit button — always visible when canManage */}
                            {canManage && (
                                <button
                                    onClick={() => {
                                const roles = (emp.roles && emp.roles.length > 0) ? emp.roles : [emp.role || 'AGENT'];
                                setEditForm({ ...emp, roles });
                                setIsEditing(true);
                            }}
                                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white/50 hover:text-[#cc9d37] hover:border-[#cc9d37]/30 text-[10px] font-black uppercase tracking-widest transition-all shrink-0">
                                    <Pen size={11} />แก้ไข
                                </button>
                            )}
                        </div>

                        {/* TAB: Overview */}
                        {activeTab === 'overview' && (
                            <div className="space-y-5">
                                {/* Stat grid — metrics differ by domain */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                    {empDomain === 'kitchen' ? (
                                        <>
                                            <StatCard icon={Star}         label="Role"      value={getRoleMeta(emp.role).label} sub={getRoleMeta(emp.role).level} />
                                            <StatCard icon={Building2}    label="แผนก"      value={emp.department || '—'} />
                                            <StatCard icon={Briefcase}    label="ตำแหน่ง"  value={emp.jobTitle || '—'} />
                                            {(() => { const t = calcTenure(emp.hiredAt, emp.createdAt); return t ? <StatCard icon={ArrowUpRight} label="อายุงาน" value={t.label} /> : null; })()}
                                        </>
                                    ) : (
                                        <>
                                            <StatCard
                                                icon={Users}
                                                label="ลูกค้าที่ดูแล"
                                                rawValue={assignedCustomers.length}
                                                sub={`${assignedCustomers.length} ราย`}
                                            />
                                            <StatCard
                                                icon={Coins}
                                                label="ยอดสะสม"
                                                rawValue={totalRevenue}
                                                format={v => `฿${v.toLocaleString()}`}
                                                accent
                                            />
                                            <StatCard
                                                icon={Receipt}
                                                label="%ปิดการขาย"
                                                rawValue={closeRate}
                                                format={v => `${v}%`}
                                                sub={`${validSalesCount} / ${assignedCustomers.length} ออเดอร์`}
                                            />
                                            <StatCard icon={Star} label="Role" value={getRoleMeta(emp.role).label} sub={getRoleMeta(emp.role).level} />
                                        </>
                                    )}
                                </div>

                                {/* Info card */}
                                <div className="bg-white/5 border border-white/8 rounded-2xl p-6 space-y-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-white font-black text-sm uppercase tracking-widest">Profile</h3>
                                    </div>
                                    {[
                                        { icon: Mail,      label: 'Email',       val: emp.email },
                                        { icon: Phone,     label: 'Phone',       val: emp.phone || '—' },
                                        { icon: Building2, label: 'แผนก',        val: emp.department || '—' },
                                        { icon: Briefcase, label: 'ตำแหน่ง',     val: emp.jobTitle || '—' },
                                        { icon: Cake,      label: 'วันเกิด',     val: (() => { const d = formatDOB(emp.dateOfBirth); return d ? d.full : '—'; })() },
                                        { icon: Medal,     label: 'เกรด',        val: emp.grade && GRADE_META[emp.grade] ? `${emp.grade} · ${GRADE_META[emp.grade].desc}` : '—' },
                                        { icon: BadgeCheck,label: 'Employee ID', val: emp.employeeId },
                                        { icon: IdCard,    label: 'Agent ID',    val: emp.agentId || '—' },
                                        { icon: Star,      label: 'Agent Code',  val: emp.agentCode || '—' },
                                        { icon: ArrowUpRight, label: 'อายุงาน', val: (() => { const t = calcTenure(emp.hiredAt, emp.createdAt); return t ? t.label : '—'; })() },
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

                                    {/* Multi-role badges */}
                                    {emp.roles && emp.roles.length > 1 && (
                                        <div className="flex items-start gap-4">
                                            <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <Shield size={13} className="text-[#cc9d37]/50" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[9px] text-white/30 font-black uppercase tracking-widest mb-1.5">Multi-Role</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {emp.roles.map(r => (
                                                        <span key={r} className={`text-[9px] font-black px-2 py-0.5 rounded-lg border ${ROLE_META[r]?.badge || 'bg-white/5 text-white/40 border-white/10'}`}>
                                                            {ROLE_META[r]?.label || r}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

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
                                <PermissionMatrix currentUserRole={currentUser?.role} targetRole={editForm.role || emp?.role} />
                            </div>
                        )}

                        {/* TAB: Customers */}
                        {activeTab === 'customers' && (
                            <div className="bg-white/5 border border-white/8 rounded-2xl p-6">
                                <h3 className="text-white font-black text-sm uppercase tracking-widest mb-5">
                                    Assigned Customers <span className="text-[#cc9d37] ml-2">{assignedCustomers.length}</span>
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
                    <div className="bg-[#0c1a2f] border border-white/10 rounded-[2rem] w-full max-w-lg p-8 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-white font-black text-lg">Edit Employee</h3>
                            <button onClick={() => setIsEditing(false)} className="w-8 h-8 rounded-xl bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center">
                                <X size={14} />
                            </button>
                        </div>

                        {/* ── Profile Picture Upload ── */}
                        <div className="flex flex-col items-center mb-6">
                            <p className="text-[10px] text-white/30 font-black uppercase tracking-widest mb-3">รูปโปรไฟล์</p>
                            <div
                                className="relative cursor-pointer group"
                                onClick={() => avatarInputRef.current?.click()}
                                title="คลิกเพื่อเปลี่ยนรูปโปรไฟล์"
                            >
                                {/* Avatar circle */}
                                <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center"
                                    style={{
                                        background: `linear-gradient(135deg, ${(ROLE_AVATAR[emp?.role] || ROLE_AVATAR.GUEST)[0]}, ${(ROLE_AVATAR[emp?.role] || ROLE_AVATAR.GUEST)[1]})`,
                                        boxShadow: `0 4px 20px ${(ROLE_AVATAR[emp?.role] || ROLE_AVATAR.GUEST)[0]}55, 0 0 0 2px rgba(255,255,255,0.12)`,
                                    }}>
                                    {editForm.profilePicture
                                        ? <img src={editForm.profilePicture} alt="" className="w-full h-full object-cover" />
                                        : <span className="text-white font-black text-3xl select-none leading-none">{(emp?.firstName || 'E').charAt(0)}</span>
                                    }
                                </div>
                                {/* Camera overlay on hover */}
                                <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                    <Camera size={20} className="text-white" />
                                </div>
                            </div>
                            <p className="text-[9px] text-white/20 mt-2">คลิกรูปเพื่อเปลี่ยน · รองรับ JPG, PNG, WebP</p>
                            {/* Hidden file input */}
                            <input
                                ref={avatarInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleAvatarChange}
                            />
                        </div>

                        <div className="space-y-4">
                            {[
                                { key: 'firstName', label: 'ชื่อ' },
                                { key: 'lastName', label: 'นามสกุล' },
                                { key: 'nickName', label: 'ชื่อเล่น' },
                                { key: 'agentCode', label: 'Agent Code (3-4 ตัวอักษร)' },
                                { key: 'email', label: 'Email' },
                                { key: 'phone', label: 'โทรศัพท์' },
                            ].map(({ key, label }) => (
                                <div key={key}>
                                    <label className="text-[10px] text-white/40 font-black uppercase tracking-widest block mb-1.5">{label}</label>
                                    <input
                                        type="text"
                                        value={editForm[key] || ''}
                                        onChange={e => setEditForm(f => ({ ...f, [key]: key === 'agentCode' ? e.target.value.toUpperCase().replace(/[^A-Z]/g, '') : e.target.value }))}
                                        maxLength={key === 'agentCode' ? 4 : undefined}
                                        className={`w-full bg-white/5 border border-white/10 text-white px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#cc9d37]/40 transition-all ${key === 'agentCode' ? 'font-mono tracking-widest uppercase' : ''}`}
                                    />
                                </div>
                            ))}
                            {/* Department select (edit) */}
                            <div>
                                <label className="text-[10px] text-white/40 font-black uppercase tracking-widest block mb-1.5">แผนก (Department)</label>
                                <select
                                    value={editForm.department || ''}
                                    onChange={e => setEditForm(f => ({ ...f, department: e.target.value }))}
                                    className="w-full bg-[#0c1a2f] border border-white/10 text-white px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#cc9d37]/40 transition-all appearance-none"
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
                            {/* Job Title input (edit) */}
                            <div>
                                <label className="text-[10px] text-white/40 font-black uppercase tracking-widest block mb-1.5">ตำแหน่ง (Job Title)</label>
                                <input
                                    type="text"
                                    placeholder="เช่น Pastry Chef, Marketing Officer"
                                    value={editForm.jobTitle || ''}
                                    onChange={e => setEditForm(f => ({ ...f, jobTitle: e.target.value }))}
                                    className="w-full bg-[#0c1a2f] border border-white/10 text-white px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#cc9d37]/40 transition-all"
                                />
                            </div>

                            {/* วันที่เริ่มงาน */}
                            <div>
                                <label className="text-[10px] text-white/40 font-black uppercase tracking-widest block mb-1.5">วันที่เริ่มงาน</label>
                                <input
                                    type="date"
                                    value={editForm.hiredAt ? editForm.hiredAt.slice(0, 10) : ''}
                                    onChange={e => setEditForm(f => ({ ...f, hiredAt: e.target.value || null }))}
                                    className="w-full bg-white/5 border border-white/10 text-white px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#cc9d37]/40 transition-all"
                                    style={{ colorScheme: 'dark' }}
                                />
                                <p className="text-[9px] text-white/20 mt-1 ml-1">ใช้คำนวณอายุงาน — ถ้าไม่ใส่จะใช้วันที่ลงระบบแทน</p>
                            </div>

                            {/* วันเดือนปีเกิด */}
                            <div>
                                <label className="text-[10px] text-white/40 font-black uppercase tracking-widest block mb-1.5">วันเดือนปีเกิด (ค.ศ.)</label>
                                <input
                                    type="date"
                                    value={editForm.dateOfBirth ? new Date(editForm.dateOfBirth).toISOString().slice(0, 10) : ''}
                                    onChange={e => setEditForm(f => ({ ...f, dateOfBirth: e.target.value || null }))}
                                    className="w-full bg-white/5 border border-white/10 text-white px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#cc9d37]/40 transition-all"
                                    style={{ colorScheme: 'dark' }}
                                />
                                {editForm.dateOfBirth && (() => {
                                    const d = formatDOB(editForm.dateOfBirth);
                                    return d ? <p className="text-[9px] text-[#cc9d37]/60 mt-1 ml-1">{d.full}</p> : null;
                                })()}
                            </div>

                            {/* isInstructor toggle */}
                            <div className="col-span-2">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div
                                        onClick={() => setEditForm(f => ({ ...f, isInstructor: !f.isInstructor }))}
                                        className={`relative w-11 h-6 rounded-full transition-colors ${editForm.isInstructor ? 'bg-[#cc9d37]' : 'bg-white/10'}`}
                                    >
                                        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${editForm.isInstructor ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-white group-hover:text-[#cc9d37] transition-colors">เชฟ / อาจารย์ผู้สอน</p>
                                        <p className="text-[9px] text-white/30">เปิดเพื่อให้ปรากฏในรายชื่อผู้สอนเมื่อสร้างรอบเรียน</p>
                                    </div>
                                </label>
                            </div>

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
                                            autoComplete="off"
                                            readOnly
                                            onFocus={e => e.target.removeAttribute('readonly')}
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
                                            autoComplete="off"
                                            readOnly
                                            onFocus={e => e.target.removeAttribute('readonly')}
                                            placeholder="facebook.com/username หรือ https://..."
                                            value={editForm.facebookUrl || ''}
                                            onChange={e => setEditForm(f => ({ ...f, facebookUrl: e.target.value }))}
                                            className="w-full bg-white/5 border border-white/10 text-white px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1877F2]/30 transition-all font-mono"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* ── Grade ───────────────────────────────────────── */}
                            <div className="border-t border-white/8 pt-4">
                                <p className="text-[9px] text-[#f0c040]/70 font-black uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                    <Medal size={10} /> เกรดพนักงาน
                                </p>
                                <div className="flex gap-2 flex-wrap">
                                    {[null, 'S', 'A', 'B', 'C', 'D'].map(g => {
                                        const meta = g ? GRADE_META[g] : null;
                                        const isSelected = (editForm.grade || null) === g;
                                        return (
                                            <button
                                                key={g ?? 'none'}
                                                type="button"
                                                onClick={() => setEditForm(f => ({ ...f, grade: g }))}
                                                className="px-3 py-1.5 rounded-xl text-[11px] font-black transition-all border"
                                                style={isSelected
                                                    ? meta
                                                        ? { background: meta.bg, border: `1.5px solid ${meta.border}`, color: meta.color, boxShadow: `0 0 10px ${meta.color}40` }
                                                        : { background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.3)', color: '#fff' }
                                                    : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.35)' }
                                                }
                                            >
                                                {g ? `${g} · ${meta.desc}` : '— ไม่มี'}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* ── Role / Multi-role Assign ─────────────────────── */}
                            <div className="border-t border-white/8 pt-4">
                                <p className="text-[9px] text-[#cc9d37]/70 font-black uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                    <Shield size={10} /> Role &amp; Permissions
                                </p>

                                {/* Primary role select */}
                                <div className="mb-3">
                                    <label className="text-[10px] text-white/40 font-black uppercase tracking-widest block mb-1.5">Primary Role</label>
                                    <select
                                        value={editForm.role || 'AGENT'}
                                        onChange={e => {
                                            const newRole = e.target.value;
                                            // Keep roles[] in sync: primary role must be in array
                                            const currentRoles = Array.isArray(editForm.roles) ? editForm.roles : [editForm.role || 'AGENT'];
                                            const withoutOldPrimary = currentRoles.filter(r => r !== editForm.role);
                                            const newRoles = [newRole, ...withoutOldPrimary].filter(Boolean);
                                            setEditForm(f => ({ ...f, role: newRole, roles: [...new Set(newRoles)] }));
                                        }}
                                        className="w-full bg-[#0c1a2f] border border-white/10 text-white px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#cc9d37]/40 transition-all appearance-none"
                                    >
                                        {ALL_ROLES.map(r => (
                                            <option key={r} value={r}>{ROLE_META[r]?.label || r} — {ROLE_META[r]?.level || ''}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Additional roles — checkbox grid */}
                                <div>
                                    <label className="text-[10px] text-white/40 font-black uppercase tracking-widest block mb-2">Additional Roles (Multi-role)</label>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {ALL_ROLES.filter(r => r !== (editForm.role || 'AGENT')).map(r => {
                                            const currentRoles = Array.isArray(editForm.roles) ? editForm.roles : [];
                                            const checked = currentRoles.includes(r);
                                            const meta = ROLE_META[r] || {};
                                            return (
                                                <label key={r}
                                                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border cursor-pointer transition-all select-none ${checked ? 'bg-white/8 border-[#cc9d37]/30' : 'bg-white/3 border-white/6 hover:border-white/15'}`}>
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={e => {
                                                            const currentRoles = Array.isArray(editForm.roles) ? editForm.roles : [editForm.role || 'AGENT'];
                                                            let newRoles;
                                                            if (e.target.checked) {
                                                                newRoles = [...new Set([...currentRoles, r])];
                                                            } else {
                                                                newRoles = currentRoles.filter(x => x !== r);
                                                            }
                                                            setEditForm(f => ({ ...f, roles: newRoles }));
                                                        }}
                                                        className="accent-[#cc9d37] w-3 h-3 flex-shrink-0"
                                                    />
                                                    <div className="min-w-0">
                                                        <p className="text-white/70 text-[10px] font-black truncate">{meta.label || r}</p>
                                                        <p className="text-white/25 text-[9px]">{meta.level || ''}</p>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                    <p className="text-[9px] text-white/20 mt-2 ml-0.5">
                                        Active roles: {(() => {
                                            const activeRoles = Array.isArray(editForm.roles) && editForm.roles.length > 0
                                                ? editForm.roles
                                                : [editForm.role || 'AGENT'];
                                            return activeRoles.map(r => ROLE_META[r]?.label || r).join(', ');
                                        })()} · มีผลหลัง login ครั้งถัดไป
                                    </p>
                                </div>
                            </div>

                            {/* New password (optional) */}
                            <div>
                                <label className="text-[10px] text-white/40 font-black uppercase tracking-widest block mb-1.5">รหัสผ่านใหม่ (เว้นว่างถ้าไม่เปลี่ยน)</label>
                                <input
                                    type="password"
                                    value={editForm._newPassword || ''}
                                    onChange={e => setEditForm(f => ({ ...f, _newPassword: e.target.value }))}
                                    placeholder="••••••••"
                                    className="w-full bg-white/5 border border-white/10 text-white px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#cc9d37]/40 transition-all"
                                />
                            </div>
                        </div>
                        {saveError && (
                            <div className="mt-4 px-4 py-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-[11px] font-bold">
                                ⚠️ {saveError}
                            </div>
                        )}
                        <div className="flex gap-3 mt-4">
                            <button onClick={() => { setIsEditing(false); setSaveError(null); }}
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
                                className="flex-1 py-3 rounded-xl bg-[#cc9d37] hover:bg-amber-400 text-[#0c1a2f] text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-[#cc9d37]/20 disabled:opacity-50">
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
