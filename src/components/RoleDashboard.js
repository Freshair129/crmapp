'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis,
    CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import {
    TrendingUp, Facebook, Store, Receipt, Tag, MessageCircle,
    ArrowUp, ArrowDown, Zap, Users, ChefHat, BarChart2, Shield,
    UserCheck, AlertTriangle, Package, Calendar, ClipboardList,
    Clock, Star, Activity, Database, Settings, Eye, RefreshCw,
    Cpu, DollarSign, ShoppingCart, Utensils, BookOpen, Bell,
    CheckCircle, XCircle, Circle
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { can } from '@/lib/permissionMatrix';
import AdsOptimizePanel from './AdsOptimizePanel';

// ─── Theme Constants ────────────────────────────────────────────────────────
const GOLD = '#cc9d37';
const NAVY = '#0c1a2f';
const NAVY2 = '#0c1a2f';
const TEXT = '#f5f8fb';

// ─── Role Meta (v2.0.0 — 12 new role codes) ─────────────────────────────────
const ROLE_META = {
    DEV: { label: 'Developer',  icon: Cpu,          color: '#a855f7', bg: 'bg-purple-500/10',  border: 'border-purple-500/30',  tab: 'text-purple-400',   ring: 'ring-purple-500' },
    TEC: { label: 'Technician', icon: Settings,     color: '#06b6d4', bg: 'bg-cyan-500/10',    border: 'border-cyan-500/30',    tab: 'text-cyan-400',     ring: 'ring-cyan-500' },
    MGR: { label: 'Manager',    icon: BarChart2,    color: '#3b82f6', bg: 'bg-blue-500/10',    border: 'border-blue-500/30',    tab: 'text-blue-400',     ring: 'ring-blue-500' },
    MKT: { label: 'Marketing',  icon: Facebook,     color: '#ec4899', bg: 'bg-pink-500/10',    border: 'border-pink-500/30',    tab: 'text-pink-400',     ring: 'ring-pink-500' },
    HR:  { label: 'HR',         icon: UserCheck,    color: '#6366f1', bg: 'bg-indigo-500/10',  border: 'border-indigo-500/30',  tab: 'text-indigo-400',   ring: 'ring-indigo-500' },
    PUR: { label: 'Purchasing', icon: ShoppingCart, color: '#f59e0b', bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   tab: 'text-amber-400',    ring: 'ring-amber-500' },
    PD:  { label: 'Head Chef',  icon: ChefHat,      color: '#f97316', bg: 'bg-orange-500/10',  border: 'border-orange-500/30',  tab: 'text-orange-400',   ring: 'ring-orange-500' },
    ADM: { label: 'Admin',      icon: Shield,       color: '#14b8a6', bg: 'bg-teal-500/10',    border: 'border-teal-500/30',    tab: 'text-teal-400',     ring: 'ring-teal-500' },
    ACC: { label: 'Accounting', icon: DollarSign,   color: '#10b981', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', tab: 'text-emerald-400',  ring: 'ring-emerald-500' },
    SLS: { label: 'Sales',      icon: TrendingUp,   color: '#ef4444', bg: 'bg-red-500/10',     border: 'border-red-500/30',     tab: 'text-red-400',      ring: 'ring-red-500' },
    AGT: { label: 'Agent',      icon: MessageCircle,color: '#fb7185', bg: 'bg-rose-500/10',    border: 'border-rose-500/30',    tab: 'text-rose-400',     ring: 'ring-rose-500' },
    STF: { label: 'Staff',      icon: Users,        color: '#64748b', bg: 'bg-slate-500/10',   border: 'border-slate-500/30',   tab: 'text-slate-400',    ring: 'ring-slate-500' },
    // Legacy fallback
    GUEST: { label: 'Guest',    icon: Eye,          color: '#eab308', bg: 'bg-yellow-500/10',  border: 'border-yellow-500/30',  tab: 'text-yellow-400',   ring: 'ring-yellow-500' },
};

// Roles that can see full executive/financial data
// MKT included — needs revenue data to calculate ROAS and campaign ROI
const EXEC_ROLES = new Set(['DEV', 'TEC', 'MGR', 'ACC', 'MKT']);

// Tab list for DEV preview mode
const DEV_TABS = ['MGR', 'TEC', 'ACC', 'MKT', 'HR', 'PUR', 'PD', 'ADM', 'SLS', 'AGT', 'STF'];

// ─── Shared Helpers ──────────────────────────────────────────────────────────
function fmtMoney(v) { return v !== undefined && v !== null ? '฿' + Math.round(v).toLocaleString() : '—'; }
function fmtChange(val) {
    if (val === null || val === undefined) return { text: '—', isUp: true, hasData: false };
    return { text: (val >= 0 ? '+' : '') + val + '%', isUp: val >= 0, hasData: true };
}

function Spinner() {
    return (
        <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-[#cc9d37]/20 border-t-[#cc9d37] rounded-full animate-spin" />
            <p className="text-[#cc9d37] text-[10px] font-black uppercase tracking-widest animate-pulse">Loading...</p>
        </div>
    );
}

function SectionTitle({ title, subtitle, icon: Icon, color }) {
    return (
        <div className="flex items-start gap-3 mb-6">
            {Icon && (
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ background: color + '18', color }}>
                    <Icon size={18} />
                </div>
            )}
            <div>
                <h2 className="text-xl font-black text-[#f5f8fb] uppercase tracking-tight italic leading-none">{title}</h2>
                {subtitle && <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.25em] mt-1">{subtitle}</p>}
            </div>
        </div>
    );
}

function KpiCard({ label, value, change, icon: Icon, color = GOLD, wide = false }) {
    const ch = change !== undefined ? fmtChange(change) : null;
    return (
        <div className={`bg-white/5 border border-white/10 p-5 rounded-[2rem] hover:bg-white/8 transition-all group shadow-xl relative overflow-hidden ${wide ? 'col-span-2' : ''}`}>
            <div className="absolute top-0 left-0 w-full h-0.5 group-hover:bg-[#cc9d37]/20 transition-all bg-white/5" />
            <div className="flex justify-between items-start mb-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg ring-1 ring-white/10"
                    style={{ background: NAVY, color }}>
                    <Icon size={15} />
                </div>
                {ch?.hasData && (
                    <div className={`flex items-center gap-1 text-[10px] font-black ${ch.isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {ch.isUp ? <ArrowUp size={9} /> : <ArrowDown size={9} />}{ch.text}
                    </div>
                )}
            </div>
            <p className="text-white/40 text-[9px] font-black uppercase tracking-widest mb-1 truncate">{label}</p>
            <p className="text-xl font-black text-[#f5f8fb] italic tracking-tight truncate">{value ?? '—'}</p>
        </div>
    );
}

function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-[#0c1a2f] border border-white/10 p-3 rounded-xl shadow-2xl text-xs">
            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">{label}</p>
            {payload.map((e, i) => (
                <div key={i} className="flex items-center justify-between gap-4 mb-1 last:mb-0">
                    <span className="font-bold text-white uppercase">{e.name}:</span>
                    <span className="font-black" style={{ color: e.color }}>
                        {typeof e.value === 'number' && e.name.toLowerCase().includes('revenue') ? '฿' + e.value.toLocaleString() : e.value}
                    </span>
                </div>
            ))}
        </div>
    );
}

// ─── TaskWidget — shared across ALL role dashboards ─────────────────────────
// isManager=true → shows ALL team tasks + assignee names (for supervisor roles)
// isManager=false → shows tasks assigned to the current user only
const PRIORITY_STYLE = {
    L0: { dot: 'bg-red-500',    label: 'CRITICAL', ring: 'border-red-500/30 bg-red-500/5', text: 'text-red-400' },
    L1: { dot: 'bg-orange-500', label: 'HIGH',     ring: 'border-orange-500/20',           text: 'text-orange-400' },
    L2: { dot: 'bg-yellow-400', label: 'MEDIUM',   ring: 'border-white/5',                 text: 'text-yellow-400' },
    L3: { dot: 'bg-white/30',   label: 'NORMAL',   ring: 'border-white/5',                 text: 'text-white/30' },
    L4: { dot: 'bg-white/20',   label: 'LOW',      ring: 'border-white/5',                 text: 'text-white/20' },
    L5: { dot: 'bg-white/10',   label: 'OPTIONAL', ring: 'border-white/5',                 text: 'text-white/10' },
};

// ─── Inventory Dashboard Widget ──────────────────────────────────────────────
const CAT_LABELS = {
    japanese_culinary: 'อาหารญี่ปุ่น', specialty: 'พิเศษ', management: 'การจัดการ', arts: 'ศิลปะ',
    package: 'แพ็กเกจ', full_course: 'คอร์สเต็ม', course: 'คอร์สทั่วไป', food: 'อาหาร',
    equipment: 'อุปกรณ์', side_dish: 'เครื่องเคียง', beverage: 'เครื่องดื่ม', snack: 'ของว่าง', dessert: 'ของหวาน',
};
const PIE_COLORS = ['#cc9d37', '#ef4444', '#3b82f6', '#10b981', '#a855f7', '#f97316', '#ec4899', '#06b6d4', '#6366f1', '#f59e0b'];
const ABC_COLORS = { A: '#ef4444', B: '#f59e0b', C: '#10b981' };

function InventoryWidget() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/dashboard/inventory')
            .then(r => r.json())
            .then(d => { setData(d); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    if (loading) return <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 h-40 flex items-center justify-center"><Spinner /></div>;
    if (!data) return null;

    return (
        <div className="space-y-6">
            {/* Row 1: KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard label="สินค้าทั้งหมด" value={`${data.totalProducts} รายการ`} icon={Package} color="#3b82f6" />
                <KpiCard label="วัตถุดิบ Low Stock" value={`${data.lowStockCount} รายการ`} icon={AlertTriangle} color="#ef4444" />
                <KpiCard label="PO กำลังมาส่ง" value={`${data.incomingPOs?.length || 0} รายการ`} icon={ShoppingCart} color="#f59e0b" />
                <KpiCard label="รับเข้าวันนี้" value={`${data.arrivingToday?.length || 0} Lots`} icon={CheckCircle} color="#10b981" />
            </div>

            {/* Row 2: Pie chart + Low stock list */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pie Chart — products by category */}
                <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-4">สัดส่วนสินค้าตามหมวดหมู่</p>
                    <div className="flex items-center gap-4">
                        <div className="w-40 h-40 flex-shrink-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={data.categoryPie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={65} paddingAngle={2} strokeWidth={0}>
                                        {data.categoryPie.map((_, i) => (
                                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ background: '#19273a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '11px' }}
                                        formatter={(val, name) => [`${val} รายการ`, CAT_LABELS[name] || name]}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex-1 space-y-1.5 overflow-y-auto max-h-40">
                            {data.categoryPie.map((c, i) => (
                                <div key={c.name} className="flex items-center justify-between text-[10px]">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                                        <span className="text-white/60 font-bold truncate">{CAT_LABELS[c.name] || c.name}</span>
                                    </div>
                                    <span className="text-white/30 font-black ml-2">{c.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Low Stock Top 5 */}
                <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-4">
                        <span className="text-red-400">Low Stock</span> — 5 อันดับ
                    </p>
                    {data.lowStock.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-32 gap-2">
                            <CheckCircle size={24} className="text-emerald-400/30" />
                            <p className="text-white/20 text-[10px] font-black uppercase">สต็อกปกติ</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {data.lowStock.map((item, i) => {
                                const pct = item.minStock > 0 ? Math.min(100, (item.currentStock / item.minStock) * 100) : 100;
                                return (
                                    <div key={item.id} className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-white/70 text-xs font-bold truncate flex-1 mr-2">
                                                <span className="text-white/25 mr-1">#{i + 1}</span>
                                                {item.name}
                                            </span>
                                            <span className={`text-[10px] font-black ${pct < 30 ? 'text-red-400' : 'text-amber-400'}`}>
                                                {item.currentStock} / {item.minStock} {item.unit}
                                            </span>
                                        </div>
                                        <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full transition-all" style={{
                                                width: `${pct}%`,
                                                background: pct < 30 ? '#ef4444' : pct < 70 ? '#f59e0b' : '#10b981'
                                            }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Row 3: ABC Analysis + Incoming + Arriving Today */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ABC Analysis */}
                <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-4">ABC Analysis</p>
                    <div className="space-y-3">
                        {['A', 'B', 'C'].map(grade => {
                            const d = data.abcSummary?.[grade] || { count: 0, value: 0 };
                            const totalItems = (data.abcSummary?.A?.count || 0) + (data.abcSummary?.B?.count || 0) + (data.abcSummary?.C?.count || 0);
                            const pct = totalItems > 0 ? (d.count / totalItems * 100).toFixed(0) : 0;
                            return (
                                <div key={grade} className="flex items-center gap-3">
                                    <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black" style={{ background: ABC_COLORS[grade] + '20', color: ABC_COLORS[grade] }}>{grade}</span>
                                    <div className="flex-1">
                                        <div className="flex justify-between text-[10px] mb-0.5">
                                            <span className="text-white/50 font-bold">{d.count} รายการ ({pct}%)</span>
                                            <span className="text-white/30 font-bold">฿{Math.round(d.value).toLocaleString()}</span>
                                        </div>
                                        <div className="h-1 bg-white/8 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: ABC_COLORS[grade] }} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <p className="text-white/20 text-[9px] font-bold pt-1">มูลค่าคงคลังรวม: ฿{Math.round(data.grandTotalValue || 0).toLocaleString()}</p>
                    </div>
                </div>

                {/* Incoming POs */}
                <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-4">
                        <span className="text-amber-400">PO กำลังมาส่ง</span>
                    </p>
                    {(data.incomingPOs?.length || 0) === 0 ? (
                        <div className="flex flex-col items-center justify-center h-24 gap-2">
                            <Package size={20} className="text-white/10" />
                            <p className="text-white/20 text-[10px] font-black">ไม่มี PO ค้าง</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {data.incomingPOs.map(po => (
                                <div key={po.id} className="flex items-center justify-between bg-white/[0.03] rounded-xl px-3 py-2">
                                    <span className="text-white/60 text-[10px] font-bold truncate">{po.requestId}</span>
                                    <span className="text-amber-400/60 text-[9px] font-black">APPROVED</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Arriving Today */}
                <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-4">
                        <span className="text-emerald-400">รับเข้าวันนี้</span>
                    </p>
                    {(data.arrivingToday?.length || 0) === 0 ? (
                        <div className="flex flex-col items-center justify-center h-24 gap-2">
                            <Calendar size={20} className="text-white/10" />
                            <p className="text-white/20 text-[10px] font-black">ไม่มี Lot วันนี้</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {data.arrivingToday.map(lot => (
                                <div key={lot.id} className="flex items-center justify-between bg-white/[0.03] rounded-xl px-3 py-2">
                                    <span className="text-white/60 text-[10px] font-bold truncate">{lot.ingredient?.name || lot.lotId}</span>
                                    <span className="text-emerald-400/60 text-[10px] font-black">{lot.receivedQty} {lot.ingredient?.unit}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function TaskWidget({ isManager = false, accentColor = GOLD }) {
    const { data: session } = useSession();
    const [tasks, setTasks]           = useState([]);
    const [urgentCount, setUrgentCount] = useState(0);
    const [loading, setLoading]       = useState(true);

    useEffect(() => {
        const assigneeParam = (!isManager && session?.user?.id)
            ? `&assigneeId=${session.user.id}` : '';
        fetch(`/api/tasks?limit=8&status=PENDING${assigneeParam}`)
            .then(r => r.json())
            .then(d => {
                setTasks(Array.isArray(d?.data) ? d.data : []);
                setUrgentCount(d?.urgentCount || 0);
            })
            .catch(e => console.error('[TaskWidget]:', e))
            .finally(() => setLoading(false));
    }, [isManager, session?.user?.id]);

    return (
        <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                    <ClipboardList size={13} style={{ color: accentColor }} />
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                        {isManager ? 'Team Tasks' : 'My Tasks'}
                    </p>
                </div>
                {urgentCount > 0 && (
                    <span className="px-2.5 py-1 rounded-xl text-[9px] font-black bg-red-500/15 text-red-400 border border-red-500/30 animate-pulse">
                        ⚠ {urgentCount} URGENT
                    </span>
                )}
            </div>

            {loading ? (
                <div className="h-20 flex items-center justify-center"><Spinner /></div>
            ) : tasks.length === 0 ? (
                <div className="flex flex-col items-center py-6 gap-2">
                    <CheckCircle size={24} className="text-emerald-400" />
                    <p className="text-emerald-400 text-xs font-bold">
                        {isManager ? 'No pending team tasks' : 'All caught up!'}
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {tasks.map((t, i) => {
                        const ps = PRIORITY_STYLE[t.priority] || PRIORITY_STYLE.L3;
                        const isOverdue = t.dueDate && new Date(t.dueDate) < new Date();
                        const assigneeName = t.assignee
                            ? (t.assignee.nickName || t.assignee.firstName || '—')
                            : 'Unassigned';
                        return (
                            <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                                isOverdue ? 'border-red-500/30 bg-red-500/5' : `${ps.ring} bg-white/3 hover:bg-white/8`
                            }`}>
                                <div className={`w-2 h-2 rounded-full shrink-0 ${ps.dot}`} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-bold text-white truncate">{t.title}</p>
                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                        <span className={`text-[9px] font-black uppercase ${ps.text}`}>{ps.label}</span>
                                        {isManager && (
                                            <span className="text-[9px] text-white/30 font-bold">→ {assigneeName}</span>
                                        )}
                                        {t.dueDate && (
                                            <span className={`text-[9px] font-bold ${isOverdue ? 'text-red-400' : 'text-white/20'}`}>
                                                {isOverdue ? '⚠ OVERDUE' : new Date(t.dueDate).toLocaleDateString('th-TH', { day:'numeric', month:'short' })}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg shrink-0 ${
                                    t.status === 'IN_PROGRESS' ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-white/30'
                                }`}>{t.status?.replace('_', ' ')}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ─── useExecData hook ────────────────────────────────────────────────────────
function useExecData(timeframe = 'this_week') {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        setLoading(true);
        fetch(`/api/analytics/executive?timeframe=${timeframe}`)
            .then(r => r.json()).then(d => { if (d?.totalRevenue !== undefined) setData(d); })
            .catch(e => console.error('[RoleDashboard] exec fetch:', e))
            .finally(() => setLoading(false));
    }, [timeframe]);
    return { data, loading };
}

function useHistoryData(days = 30) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        setLoading(true);
        fetch(`/api/analytics/executive/history?days=${days}`)
            .then(r => r.json()).then(d => setData(d))
            .catch(e => console.error('[RoleDashboard] history fetch:', e))
            .finally(() => setLoading(false));
    }, [days]);
    return { data, loading };
}

// ─── REVENUE AREA CHART (shared) ─────────────────────────────────────────────
function RevenueChart({ historyData, historyDays, setHistoryDays, loading }) {
    return (
        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-7 shadow-xl">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-base font-black text-[#f5f8fb] uppercase tracking-tight italic">Revenue Trends</h3>
                    <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-0.5">Ads vs Store</p>
                </div>
                <div className="flex bg-white/5 p-1 rounded-xl gap-1">
                    {[7, 30, 90].map(d => (
                        <button key={d} onClick={() => setHistoryDays(d)}
                            className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all ${historyDays === d ? 'bg-red-500 text-white' : 'text-white/40 hover:text-white'}`}>
                            {d}d
                        </button>
                    ))}
                </div>
            </div>
            {loading ? (
                <div className="h-[180px] flex items-center justify-center"><Spinner /></div>
            ) : (
                <div className="h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={historyData?.revenueHistory || []}>
                            <defs>
                                <linearGradient id="gAds" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="gStore" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={GOLD} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={GOLD} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="dateLabel" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9, fontWeight: 900 }} />
                            <YAxis hide />
                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)' }} />
                            <Area name="Ads Revenue" type="monotone" dataKey="adsRevenue" stroke="#ef4444" fill="url(#gAds)" strokeWidth={2} />
                            <Area name="Store Revenue" type="monotone" dataKey="storeRevenue" stroke={GOLD} fill="url(#gStore)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}

// ─── CONVERSION GAUGE (shared) ───────────────────────────────────────────────
function ConversionGauge({ rate, ordersCount }) {
    const pct = Math.min(rate || 0, 100);
    const r = 70, circ = 2 * Math.PI * r;
    return (
        <div className="bg-[#cc9d37] rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center text-[#0c1a2f] shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
            <h3 className="text-base font-black italic uppercase tracking-tight mb-1">Conversion Rate</h3>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] opacity-60 mb-6">Sales Efficiency</p>
            <div className="relative w-36 h-36 mb-6">
                <svg className="w-full h-full rotate-[-90deg]">
                    <circle cx="72" cy="72" r={r} fill="transparent" stroke="#000" strokeWidth="12" className="opacity-10" />
                    <circle cx="72" cy="72" r={r} fill="transparent" stroke="#0c1a2f" strokeWidth="12"
                        strokeDasharray={circ} strokeDashoffset={circ - circ * pct / 100}
                        strokeLinecap="round" className="transition-all duration-1000" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black italic">{pct.toFixed(1)}%</span>
                    <span className="text-[9px] font-black uppercase tracking-widest mt-0.5 opacity-60">Conv.</span>
                </div>
            </div>
            <p className="text-sm font-black italic">{ordersCount || 0} Orders</p>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD: ADMIN
// ═══════════════════════════════════════════════════════════════════════════
function AdminDash({ language }) {
    const [timeframe, setTimeframe] = useState('this_week');
    const [historyDays, setHistoryDays] = useState(30);
    const { data, loading } = useExecData(timeframe);
    const { data: hist, loading: histLoading } = useHistoryData(historyDays);

    return (
        <div className="space-y-8">
            <div className="flex justify-end">
                <div className="flex bg-white/5 border border-white/10 p-1 rounded-2xl">
                    {[['today', 'Today'], ['this_week', 'Week'], ['this_month', 'Month']].map(([k, l]) => (
                        <button key={k} onClick={() => setTimeframe(k)}
                            className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${timeframe === k ? 'bg-[#cc9d37] text-[#0c1a2f] shadow-lg' : 'text-white/40 hover:text-white'}`}>
                            {l}
                        </button>
                    ))}
                </div>
            </div>

            {loading && !data ? (
                <div className="h-40 flex items-center justify-center"><Spinner /></div>
            ) : (
                <>
                    {/* KPIs */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <KpiCard label="Total Revenue" value={fmtMoney(data?.totalRevenue)} change={data?.revenueChange} icon={TrendingUp} color={GOLD} />
                        <KpiCard label="Ads Revenue" value={fmtMoney(data?.revenueAds)} change={data?.revenueAdsChange} icon={Facebook} color="#ef4444" />
                        <KpiCard label="Store Revenue" value={fmtMoney(data?.revenueStore)} change={data?.revenueStoreChange} icon={Store} color="#10b981" />
                        <KpiCard label="Orders" value={data?.ordersCount !== undefined ? data.ordersCount + ' Orders' : '—'} icon={Receipt} color="#6366f1" />
                    </div>

                    {/* Charts + Gauge */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2">
                            <RevenueChart historyData={hist} historyDays={historyDays} setHistoryDays={setHistoryDays} loading={histLoading} />
                        </div>
                        <ConversionGauge rate={data?.conversionRate} ordersCount={data?.ordersCount} />
                    </div>

                    {/* Operational Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <MessageCircle size={14} className="text-sky-400" />
                                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Active Conversations</p>
                            </div>
                            <p className="text-3xl font-black text-[#f5f8fb] italic">{data?.activeSessions ?? '—'}</p>
                            <p className="text-[10px] text-white/30 mt-1 font-bold uppercase">FB + LINE Inbox</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Tag size={14} className="text-purple-400" />
                                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Avg. Ticket</p>
                            </div>
                            <p className="text-3xl font-black text-[#f5f8fb] italic">{fmtMoney(data?.avgTicket)}</p>
                            <p className="text-[10px] text-white/30 mt-1 font-bold uppercase">Per Order</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Activity size={14} className="text-[#cc9d37]" />
                                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">System Status</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                <p className="text-base font-black text-emerald-400 italic">OPERATIONAL</p>
                            </div>
                            <p className="text-[10px] text-white/30 mt-1 font-bold uppercase">All systems normal</p>
                        </div>
                    </div>

                    {/* Team Tasks */}
                    <TaskWidget isManager={true} accentColor="#14b8a6" />
                </>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD: MANAGER
// ═══════════════════════════════════════════════════════════════════════════
function ManagerDash({ language }) {
    const [timeframe, setTimeframe] = useState('this_week');
    const [historyDays, setHistoryDays] = useState(30);
    const { data, loading } = useExecData(timeframe);
    const { data: hist, loading: histLoading } = useHistoryData(historyDays);

    return (
        <div className="space-y-8">
            <div className="flex justify-end">
                <div className="flex bg-white/5 border border-white/10 p-1 rounded-2xl">
                    {[['today', 'Today'], ['this_week', 'Week'], ['this_month', 'Month']].map(([k, l]) => (
                        <button key={k} onClick={() => setTimeframe(k)}
                            className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${timeframe === k ? 'bg-[#cc9d37] text-[#0c1a2f] shadow-lg' : 'text-white/40 hover:text-white'}`}>
                            {l}
                        </button>
                    ))}
                </div>
            </div>

            {loading && !data ? (
                <div className="h-40 flex items-center justify-center"><Spinner /></div>
            ) : (
                <>
                    {/* Full KPI Row */}
                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                        <KpiCard label="Total Revenue" value={fmtMoney(data?.totalRevenue)} change={data?.revenueChange} icon={TrendingUp} color={GOLD} />
                        <KpiCard label="Ads Revenue" value={fmtMoney(data?.revenueAds)} change={data?.revenueAdsChange} icon={Facebook} color="#ef4444" />
                        <KpiCard label="Store Revenue" value={fmtMoney(data?.revenueStore)} change={data?.revenueStoreChange} icon={Store} color="#10b981" />
                        <KpiCard label="Orders" value={data?.ordersCount !== undefined ? data.ordersCount + ' orders' : '—'} icon={Receipt} color="#6366f1" />
                        <KpiCard label="Avg. Ticket" value={fmtMoney(data?.avgTicket)} icon={Tag} color="#a855f7" />
                        <KpiCard label="Active Convs." value={data?.activeSessions !== undefined ? data.activeSessions + ' convs' : '—'} icon={MessageCircle} color="#0ea5e9" />
                    </div>

                    {/* Charts + Gauge */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2">
                            <RevenueChart historyData={hist} historyDays={historyDays} setHistoryDays={setHistoryDays} loading={histLoading} />
                        </div>
                        <ConversionGauge rate={data?.conversionRate} ordersCount={data?.ordersCount} />
                    </div>

                    {/* Channel Split */}
                    <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6">
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-5">Revenue Channel Split</p>
                        <div className="flex gap-6 items-center">
                            <div className="flex-1 h-4 rounded-full overflow-hidden bg-white/10 flex">
                                {(() => {
                                    const total = (data?.revenueAds || 0) + (data?.revenueStore || 0);
                                    const adsPct = total > 0 ? (data?.revenueAds || 0) / total * 100 : 50;
                                    return (
                                        <>
                                            <div className="h-full bg-red-500 transition-all duration-700" style={{ width: `${adsPct}%` }} />
                                            <div className="h-full bg-[#cc9d37] transition-all duration-700" style={{ width: `${100 - adsPct}%` }} />
                                        </>
                                    );
                                })()}
                            </div>
                            <div className="flex gap-4 text-xs font-bold shrink-0">
                                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Ads</span>
                                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#cc9d37] inline-block" />Store</span>
                            </div>
                        </div>
                    </div>

                    {/* Inventory Overview */}
                    <InventoryWidget />

                    {/* Team Tasks — always visible for manager */}
                    <TaskWidget isManager={true} accentColor="#3b82f6" />
                </>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD: MARKETING
// ═══════════════════════════════════════════════════════════════════════════
function MarketingDash({ language, userRole }) {
    const [timeframe, setTimeframe] = useState('this_week');
    const [historyDays, setHistoryDays] = useState(30);
    const { data, loading } = useExecData(timeframe);
    const { data: hist, loading: histLoading } = useHistoryData(historyDays);
    const [campaigns, setCampaigns] = useState([]);
    const [campsLoading, setCampsLoading] = useState(false);
    const [selectedCampaign, setSelectedCampaign] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const { data: session } = useSession();
    const role = userRole || session?.user?.role;

    useEffect(() => {
        setCampsLoading(true);
        fetch('/api/ads/campaigns')
            .then(r => r.json())
            .then(d => setCampaigns(Array.isArray(d) ? d : d.campaigns || []))
            .catch(e => console.error('[MarketingDash] campaigns:', e))
            .finally(() => setCampsLoading(false));
    }, [refreshKey]);

    return (
        <div className="space-y-8">
            <div className="flex justify-end">
                <div className="flex bg-white/5 border border-white/10 p-1 rounded-2xl">
                    {[['today', 'Today'], ['this_week', 'Week'], ['this_month', 'Month']].map(([k, l]) => (
                        <button key={k} onClick={() => setTimeframe(k)}
                            className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${timeframe === k ? 'bg-[#cc9d37] text-[#0c1a2f] shadow-lg' : 'text-white/40 hover:text-white'}`}>
                            {l}
                        </button>
                    ))}
                </div>
            </div>

            {loading && !data ? (
                <div className="h-40 flex items-center justify-center"><Spinner /></div>
            ) : (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <KpiCard label="Ads Revenue" value={fmtMoney(data?.revenueAds)} change={data?.revenueAdsChange} icon={Facebook} color="#ef4444" />
                        <KpiCard label="Store Revenue" value={fmtMoney(data?.revenueStore)} change={data?.revenueStoreChange} icon={Store} color="#10b981" />
                        <KpiCard label="Active Convs." value={data?.activeSessions !== undefined ? data.activeSessions + ' convs' : '—'} icon={MessageCircle} color="#0ea5e9" />
                        <KpiCard label="Conversion Rate" value={data?.conversionRate ? data.conversionRate.toFixed(1) + '%' : '—'} icon={TrendingUp} color={GOLD} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2">
                            <RevenueChart historyData={hist} historyDays={historyDays} setHistoryDays={setHistoryDays} loading={histLoading} />
                        </div>
                        <ConversionGauge rate={data?.conversionRate} ordersCount={data?.ordersCount} />
                    </div>
                </>
            )}

            {/* Campaigns Table */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-black text-[#f5f8fb] uppercase tracking-tight italic">Active Campaigns</h3>
                    <button onClick={() => setRefreshKey(k => k + 1)}
                        className="flex items-center gap-1.5 text-[10px] font-black text-white/40 hover:text-white uppercase tracking-widest transition-all">
                        <RefreshCw size={11} /> Refresh
                    </button>
                </div>
                {campsLoading ? (
                    <div className="h-32 flex items-center justify-center bg-white/5 border border-white/10 rounded-2xl"><Spinner /></div>
                ) : campaigns.length === 0 ? (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
                        <p className="text-white/30 text-sm font-bold">No campaigns found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto bg-white/5 border border-white/10 rounded-2xl">
                        <table className="w-full text-sm">
                            <thead className="border-b border-white/10 bg-white/5">
                                <tr>{['Campaign', 'Status', 'Budget', 'Spend', 'ROAS', 'Action'].map(h => (
                                    <th key={h} className="px-5 py-4 text-left text-[10px] font-black text-white/50 uppercase tracking-widest">{h}</th>
                                ))}</tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {campaigns.map(c => (
                                    <tr key={c.id} className="hover:bg-white/5 transition-all">
                                        <td className="px-5 py-4">
                                            <p className="font-bold text-white">{c.name}</p>
                                            <p className="text-[10px] text-white/30 mt-0.5">ID: {c.id}</p>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${c.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-yellow-500'}`} />
                                                <span className="text-[10px] font-black text-white/50 uppercase">{c.status === 'ACTIVE' ? 'Active' : 'Paused'}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4"><p className="font-bold text-[#cc9d37]">{fmtMoney(c.dailyBudget)}<span className="text-white/30 text-[10px] font-normal">/day</span></p></td>
                                        <td className="px-5 py-4"><p className="font-bold text-white">{fmtMoney(c.spend)}</p></td>
                                        <td className="px-5 py-4"><p className="font-bold text-emerald-400">{c.roas?.toFixed(2) ?? '—'}</p></td>
                                        <td className="px-5 py-4">
                                            {can(role, 'marketing', 'edit') && (
                                                <button onClick={() => setSelectedCampaign(c)}
                                                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#cc9d37]/10 border border-[#cc9d37]/30 text-[#cc9d37] text-[10px] font-black uppercase tracking-widest hover:bg-[#cc9d37]/20 transition-all">
                                                    <Zap size={10} /> Optimize
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {selectedCampaign && (
                <AdsOptimizePanel
                    campaign={selectedCampaign}
                    onClose={() => setSelectedCampaign(null)}
                    onSuccess={() => { setSelectedCampaign(null); setRefreshKey(k => k + 1); }}
                    currentUserRole={role}
                />
            )}

            {/* My Tasks */}
            <TaskWidget isManager={false} accentColor="#ec4899" />
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD: HEAD_CHEF
// ═══════════════════════════════════════════════════════════════════════════
function HeadChefDash({ language }) {
    const [lowStock, setLowStock] = useState([]);
    const [schedules, setSchedules] = useState([]);
    const [loadingStock, setLoadingStock] = useState(true);
    const [loadingSchedule, setLoadingSchedule] = useState(true);

    useEffect(() => {
        fetch('/api/kitchen/ingredients?lowStockOnly=true')
            .then(r => r.json())
            .then(d => setLowStock(Array.isArray(d) ? d : d.data || []))
            .catch(e => console.error('[HeadChefDash] low stock:', e))
            .finally(() => setLoadingStock(false));

        fetch('/api/schedules?upcoming=true&limit=5')
            .then(r => r.json())
            .then(d => setSchedules(Array.isArray(d) ? d : d.data || []))
            .catch(e => console.error('[HeadChefDash] schedules:', e))
            .finally(() => setLoadingSchedule(false));
    }, []);

    return (
        <div className="space-y-8">

            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`bg-white/5 border rounded-[2rem] p-6 ${lowStock.length > 0 ? 'border-red-500/40' : 'border-emerald-500/30'}`}>
                    <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle size={14} className={lowStock.length > 0 ? 'text-red-400' : 'text-emerald-400'} />
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Low Stock Alerts</p>
                    </div>
                    <p className="text-4xl font-black italic" style={{ color: lowStock.length > 0 ? '#ef4444' : '#10b981' }}>{loadingStock ? '…' : lowStock.length}</p>
                    <p className="text-[10px] text-white/30 mt-1 font-bold uppercase">{lowStock.length > 0 ? 'Items need reorder' : 'All stock OK'}</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6">
                    <div className="flex items-center gap-2 mb-3">
                        <Calendar size={14} className="text-orange-400" />
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Upcoming Classes</p>
                    </div>
                    <p className="text-4xl font-black italic text-orange-400">{loadingSchedule ? '…' : schedules.length}</p>
                    <p className="text-[10px] text-white/30 mt-1 font-bold uppercase">Scheduled sessions</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6">
                    <div className="flex items-center gap-2 mb-3">
                        <Utensils size={14} className="text-[#cc9d37]" />
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Kitchen Status</p>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <p className="text-base font-black text-emerald-400 italic">READY</p>
                    </div>
                    <p className="text-[10px] text-white/30 mt-1 font-bold uppercase">Kitchen operational</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Low Stock List */}
                <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <AlertTriangle size={13} className="text-red-400" />
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Low Stock Ingredients</p>
                    </div>
                    {loadingStock ? (
                        <div className="h-32 flex items-center justify-center"><Spinner /></div>
                    ) : lowStock.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-2">
                            <CheckCircle size={28} className="text-emerald-400" />
                            <p className="text-emerald-400 text-sm font-bold">All ingredients stocked</p>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-[260px] overflow-y-auto">
                            {lowStock.map((item, i) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-red-500/5 border border-red-500/20">
                                    <div>
                                        <p className="text-sm font-bold text-white">{item.name}</p>
                                        <p className="text-[10px] text-white/30 uppercase font-bold">{item.unit}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-red-400">{item.currentStock} <span className="text-[10px] font-normal">{item.unit}</span></p>
                                        <p className="text-[10px] text-white/30">min: {item.minStock}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Upcoming Schedules */}
                <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Calendar size={13} className="text-orange-400" />
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Upcoming Classes</p>
                    </div>
                    {loadingSchedule ? (
                        <div className="h-32 flex items-center justify-center"><Spinner /></div>
                    ) : schedules.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-2">
                            <Calendar size={28} className="text-white/20" />
                            <p className="text-white/30 text-sm font-bold">No upcoming classes</p>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-[260px] overflow-y-auto">
                            {schedules.map((s, i) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-orange-500/5 border border-orange-500/20">
                                    <div>
                                        <p className="text-sm font-bold text-white">{s.courseName || s.title || 'Class'}</p>
                                        <p className="text-[10px] text-white/30 uppercase font-bold">{s.sessionType || 'Session'}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-orange-400 uppercase">
                                            {s.date ? new Date(s.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : '—'}
                                        </p>
                                        <p className="text-[10px] text-white/30">{s.studentCount ? s.studentCount + ' students' : ''}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Inventory Overview */}
            <InventoryWidget />

            {/* My Tasks */}
            <TaskWidget isManager={false} accentColor="#f97316" />
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD: EMPLOYEE
// ═══════════════════════════════════════════════════════════════════════════
function EmployeeDash({ language }) {
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(true);
    const { data: session } = useSession();

    useEffect(() => {
        fetch('/api/schedules?upcoming=true&limit=3')
            .then(r => r.json())
            .then(s => setSchedules(Array.isArray(s) ? s : s.data || []))
            .catch(e => console.error('[EmployeeDash]:', e))
            .finally(() => setLoading(false));
    }, []);

    const now = new Date();
    const greeting = now.getHours() < 12 ? 'Good Morning' : now.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';
    const name = session?.user?.firstName || 'Team Member';

    return (
        <div className="space-y-8">
            {/* Greeting */}
            <div className="bg-gradient-to-r from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-[2rem] p-8">
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-2">{greeting}</p>
                <h2 className="text-3xl font-black text-[#f5f8fb] italic">{name} 👋</h2>
                <p className="text-white/30 text-sm mt-2 font-bold">
                    {now.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
            </div>

            {loading ? (
                <div className="h-40 flex items-center justify-center"><Spinner /></div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* My Tasks — via shared TaskWidget */}
                    <TaskWidget isManager={false} accentColor="#10b981" />

                    {/* Today's Schedule */}
                    <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Calendar size={13} className="text-emerald-400" />
                            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Upcoming Classes</p>
                        </div>
                        {schedules.length === 0 ? (
                            <div className="flex flex-col items-center py-8 gap-2">
                                <Calendar size={28} className="text-white/20" />
                                <p className="text-white/30 text-sm font-bold">No upcoming classes</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {schedules.map((s, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                                        <div>
                                            <p className="text-sm font-bold text-white">{s.courseName || s.title || 'Class'}</p>
                                            <p className="text-[10px] text-white/30">{s.sessionType}</p>
                                        </div>
                                        <p className="text-[10px] font-black text-emerald-400">
                                            {s.date ? new Date(s.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : '—'}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Inventory Overview (view only) */}
            <InventoryWidget />

            {/* Quick Links */}
            <div>
                <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-4">Quick Access</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { label: 'POS System', icon: ShoppingCart, color: '#cc9d37' },
                        { label: 'Customers', icon: Users, color: '#3b82f6' },
                        { label: 'My Tasks', icon: ClipboardList, color: '#10b981' },
                        { label: 'Inbox', icon: MessageCircle, color: '#0ea5e9' },
                    ].map(({ label, icon: Icon, color }) => (
                        <div key={label} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center gap-2 hover:bg-white/10 transition-all cursor-pointer group">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: color + '18', color }}>
                                <Icon size={18} />
                            </div>
                            <p className="text-[10px] font-black text-white/50 uppercase tracking-wider group-hover:text-white transition-all text-center">{label}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD: AGENT
// ═══════════════════════════════════════════════════════════════════════════
function AgentDash({ language }) {
    const { data: session } = useSession();
    const { data: execData, loading } = useExecData('today');

    return (
        <div className="space-y-8">

            {loading && !execData ? (
                <div className="h-40 flex items-center justify-center"><Spinner /></div>
            ) : (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <KpiCard label="Active Convs." value={execData?.activeSessions !== undefined ? execData.activeSessions + ' convs' : '—'} icon={MessageCircle} color="#06b6d4" />
                        <KpiCard label="Orders Today" value={execData?.ordersCount !== undefined ? execData.ordersCount + ' orders' : '—'} icon={Receipt} color={GOLD} />
                        <KpiCard label="Revenue Today" value={fmtMoney(execData?.totalRevenue)} icon={DollarSign} color="#10b981" />
                        <KpiCard label="Avg. Ticket" value={fmtMoney(execData?.avgTicket)} icon={Tag} color="#a855f7" />
                    </div>

                    {/* Tips */}
                    <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-[2rem] p-6 space-y-3">
                        <p className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.3em] mb-2">Agent Tips</p>
                        {[
                            { icon: MessageCircle, text: 'Reply to conversations within 5 minutes for best conversion' },
                            { icon: Star, text: 'Add customer notes after every interaction' },
                            { icon: CheckCircle, text: 'Confirm payment slips via Unified Inbox' },
                        ].map(({ icon: Icon, text }, i) => (
                            <div key={i} className="flex items-start gap-3">
                                <Icon size={14} className="text-cyan-400 mt-0.5 shrink-0" />
                                <p className="text-sm text-white/50 font-bold">{text}</p>
                            </div>
                        ))}
                    </div>

                    {/* My Tasks */}
                    <TaskWidget isManager={false} accentColor="#fb7185" />
                </>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD: GUEST
// ═══════════════════════════════════════════════════════════════════════════
function GuestDash({ language }) {
    const { data, loading } = useExecData('this_week');
    return (
        <div className="space-y-8">
            <div className="flex items-center gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl">
                <Eye size={14} className="text-yellow-400 shrink-0" />
                <p className="text-[11px] font-black text-yellow-400 uppercase tracking-widest">Demo Mode — Read Only View</p>
            </div>
            {loading ? (
                <div className="h-40 flex items-center justify-center"><Spinner /></div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <KpiCard label="Total Revenue" value={fmtMoney(data?.totalRevenue)} icon={TrendingUp} color={GOLD} />
                    <KpiCard label="Orders" value={data?.ordersCount !== undefined ? data.ordersCount + ' orders' : '—'} icon={Receipt} color="#6366f1" />
                    <KpiCard label="Conversion Rate" value={data?.conversionRate ? data.conversionRate.toFixed(1) + '%' : '—'} icon={Activity} color="#10b981" />
                </div>
            )}
        </div>
    );
}

// ─── Component Map (v2.0.0 — 12 new role codes) ──────────────────────────────
const DASH_MAP = {
    // Exec / financial access
    DEV:  ManagerDash,   // DEV uses tab switcher but fallback shows full exec view
    TEC:  ManagerDash,   // Tech sees full operational + system data
    MGR:  ManagerDash,   // Manager — full revenue + operational
    ACC:  AdminDash,     // Accounting — financial overview + enrollments

    // Marketing — sees revenue (for ROAS) + ads/campaign data
    MKT:  ManagerDash,   // Marketing — full revenue view + ads performance

    // Operational domains (no broad revenue)
    PD:   HeadChefDash,  // Head Chef / Production — kitchen + recipes + schedule
    PUR:  HeadChefDash,  // Purchasing — same kitchen/stock view as PD

    // People / service roles
    HR:   EmployeeDash,  // HR — employee-focused tasks + schedule
    ADM:  EmployeeDash,  // Admin — enrollment + tasks + schedule
    SLS:  AgentDash,     // Sales — customers + inbox + own orders
    AGT:  AgentDash,     // Agent — inbox + assigned customers
    STF:  EmployeeDash,  // Staff — tasks + schedule (no customer/revenue data)

    // Legacy
    GUEST: GuestDash,
};

// ═══════════════════════════════════════════════════════════════════════════
// DEVELOPER TAB BAR
// ═══════════════════════════════════════════════════════════════════════════
function DevTabBar({ activeTab, onTabChange }) {
    return (
        <div className="mb-8">
            {/* Header Banner */}
            <div className="flex items-center gap-3 p-3 px-5 mb-5 bg-purple-500/10 border border-purple-500/30 rounded-2xl">
                <Cpu size={14} className="text-purple-400 shrink-0" />
                <p className="text-[11px] font-black text-purple-400 uppercase tracking-widest">Developer Mode — Previewing dashboard as:</p>
                <span className="ml-auto px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {ROLE_META[activeTab]?.label || activeTab}
                </span>
            </div>

            {/* Tab Row */}
            <div className="flex gap-2 flex-wrap">
                {DEV_TABS.map(role => {
                    const meta = ROLE_META[role];
                    const Icon = meta.icon;
                    const isActive = activeTab === role;
                    return (
                        <button key={role} onClick={() => onTabChange(role)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                                isActive
                                    ? `text-[#0c1a2f] border-transparent shadow-lg`
                                    : `text-white/40 hover:text-white border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10`
                            }`}
                            style={isActive ? { background: meta.color, borderColor: meta.color } : {}}>
                            <Icon size={12} />
                            {meta.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXPORT: RoleDashboard
// ═══════════════════════════════════════════════════════════════════════════
// ─── Dashboard title per role ─────────────────────────────────────────────────
const DASH_TITLE = {
    DEV: 'Developer Overview',
    TEC: 'System Dashboard',
    MGR: 'Manager Dashboard',
    ACC: 'Finance Dashboard',
    MKT: 'Marketing Dashboard',
    PD:  'Kitchen Dashboard',
    PUR: 'Procurement Dashboard',
    HR:  'HR Dashboard',
    ADM: 'Admin Dashboard',
    SLS: 'Sales Dashboard',
    AGT: 'Agent Dashboard',
    STF: 'My Dashboard',
};

export default function RoleDashboard({ language = 'TH' }) {
    const { data: session } = useSession();
    const userRole = session?.user?.role || 'GUEST';
    const isDev = userRole === 'DEV';
    const isExec = EXEC_ROLES.has(userRole);

    const [devTab, setDevTab] = useState('MGR');

    // Effective role: DEV sees the selected tab's dashboard; others see their own
    const effectiveRole = isDev ? devTab : userRole;
    const DashComponent = DASH_MAP[effectiveRole] || GuestDash;
    const meta = ROLE_META[userRole] || ROLE_META.GUEST;
    const pageTitle = isDev ? 'Developer Preview' : (DASH_TITLE[userRole] || 'My Dashboard');

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-0">
            {/* Page Header */}
            <div className="flex items-end justify-between mb-10">
                <div>
                    <h1 className="text-4xl font-black text-[#f5f8fb] tracking-tight italic uppercase leading-none">
                        {pageTitle}
                    </h1>
                    <p className="text-[#cc9d37] text-[10px] font-black uppercase tracking-[0.3em] mt-2">
                        {isExec ? 'Business Intelligence · Full Access' : 'Role-Based View · Personalized for you'}
                        {isDev && <span className="ml-3 text-purple-400">· Viewing as: {devTab}</span>}
                    </p>
                </div>
                {/* Role badge */}
                <div className="flex items-center gap-2 px-4 py-2 rounded-2xl border"
                    style={{
                        background: meta.color + '15',
                        borderColor: meta.color + '40',
                        color: meta.color,
                    }}>
                    {React.createElement(meta.icon, { size: 13 })}
                    <span className="text-[10px] font-black uppercase tracking-widest">{meta.label}</span>
                </div>
            </div>

            {/* DEV only: Tab Switcher to preview other role dashboards */}
            {isDev && <DevTabBar activeTab={devTab} onTabChange={setDevTab} />}

            {/* Dashboard Content */}
            <DashComponent language={language} userRole={effectiveRole} />
        </div>
    );
}
