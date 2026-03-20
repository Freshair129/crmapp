'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    RefreshCw, Timer, CheckCircle2, MessageSquareMore,
    UserCog, Loader2, Inbox, Clock, TrendingUp, BarChart3,
    X, ChevronRight, Banknote, Target, Star, Activity,
    Image as ImageIcon, Zap,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtBaht(n) {
    if (!n) return '฿0';
    if (n >= 1_000_000) return `฿${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)     return `฿${(n / 1_000).toFixed(1)}K`;
    return `฿${Number(n).toLocaleString()}`;
}

function fmtRelTime(date) {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (diff < 60)   return `${diff} วินาทีที่แล้ว`;
    if (diff < 3600) return `${Math.floor(diff / 60)} นาทีที่แล้ว`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ชั่วโมงที่แล้ว`;
    return `${Math.floor(diff / 86400)} วันที่แล้ว`;
}

function satisfactionGrade(score) {
    if (score >= 85) return { grade: 'A', label: 'ดีมาก', color: '#10b981' };
    if (score >= 70) return { grade: 'B', label: 'ดี',    color: '#6366f1' };
    if (score >= 55) return { grade: 'C', label: 'พอใช้', color: '#f59e0b' };
    return              { grade: 'D', label: 'ควรปรับ', color: '#f43f5e' };
}

const MONTH_TH = ['','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
function thMonth(m) { return MONTH_TH[parseInt(m?.slice(5), 10)] || m; }

// ─── Tiny SVG bar chart ────────────────────────────────────────────────────────
function MiniBarChart({ data, colors, months, height = 120 }) {
    if (!data || data.length === 0 || !months || months.length === 0) return null;
    const maxVal = Math.max(...data.flatMap(d => months.map(m => d.monthly?.[m] || 0)), 1);
    const barW   = 14;
    const gap    = 4;
    const groupW = data.length * (barW + gap) + 8;
    const totalW = months.length * (groupW + 12) + 40;

    return (
        <svg width="100%" viewBox={`0 0 ${totalW} ${height + 30}`} preserveAspectRatio="xMidYMid meet">
            {months.map((m, mi) => (
                data.map((emp, ei) => {
                    const val  = emp.monthly?.[m] || 0;
                    const barH = Math.max((val / maxVal) * height, val > 0 ? 2 : 0);
                    const x    = mi * (groupW + 12) + 30 + ei * (barW + gap);
                    const y    = height - barH;
                    return (
                        <g key={`${m}-${ei}`}>
                            <rect x={x} y={y} width={barW} height={barH} rx={3} fill={colors[ei] || '#94a3b8'} opacity={0.85} />
                            {val > 0 && (
                                <text x={x + barW / 2} y={y - 3} textAnchor="middle" fontSize="8" fill={colors[ei] || '#94a3b8'} opacity={0.9}>{val}</text>
                            )}
                        </g>
                    );
                })
            ))}
            {months.map((m, mi) => (
                <text key={m} x={mi * (groupW + 12) + 30 + (data.length * (barW + gap)) / 2} y={height + 14}
                    textAnchor="middle" fontSize="9" fill="#64748b">
                    {thMonth(m)}
                </text>
            ))}
        </svg>
    );
}

// ─── Hour heatmap ──────────────────────────────────────────────────────────────
function HourHeatmap({ hours }) {
    if (!hours || hours.length === 0) return null;
    const maxVal = Math.max(...hours.map(h => h.messages), 1);
    const getColor = (v) => {
        const r = v / maxVal;
        if (r < 0.05) return '#0f172a';
        if (r < 0.2)  return '#1e3a5f';
        if (r < 0.4)  return '#1d4ed8';
        if (r < 0.65) return '#3b82f6';
        if (r < 0.85) return '#60a5fa';
        return '#93c5fd';
    };
    const getTextColor = (v) => (v / maxVal) >= 0.4 ? '#0f172a' : '#94a3b8';

    return (
        <div>
            <div className="grid grid-cols-12 gap-1">
                {hours.map(({ hour, messages }) => (
                    <div
                        key={hour}
                        title={`${String(hour).padStart(2, '0')}:00 น. — ${messages} ข้อความ`}
                        className="rounded aspect-square flex flex-col items-center justify-center cursor-default transition-transform hover:scale-110"
                        style={{ background: getColor(messages) }}
                    >
                        <span className="text-[9px] font-bold leading-none" style={{ color: getTextColor(messages) }}>{messages || ''}</span>
                        <span className="text-[7px] leading-none mt-0.5" style={{ color: getTextColor(messages), opacity: 0.7 }}>
                            {String(hour).padStart(2, '0')}
                        </span>
                    </div>
                ))}
            </div>
            <div className="flex items-center gap-2 mt-2 text-[9px] text-white/30">
                <span>น้อย</span>
                {['#1e3a5f','#1d4ed8','#3b82f6','#60a5fa','#93c5fd'].map(c => (
                    <div key={c} className="w-3 h-3 rounded-sm" style={{ background: c }} />
                ))}
                <span>มาก</span>
            </div>
        </div>
    );
}

// ─── Satisfaction ring ─────────────────────────────────────────────────────────
function SatisfactionRing({ score, size = 80 }) {
    const { grade, label, color } = satisfactionGrade(score);
    const r = (size - 12) / 2;
    const circ = 2 * Math.PI * r;
    const dash = (score / 100) * circ;

    return (
        <div className="flex flex-col items-center gap-1">
            <svg width={size} height={size}>
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e293b" strokeWidth="8" />
                <circle
                    cx={size / 2} cy={size / 2} r={r}
                    fill="none" stroke={color} strokeWidth="8"
                    strokeDasharray={`${dash} ${circ}`}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
                <text x={size / 2} y={size / 2 - 4} textAnchor="middle" fontSize="18" fontWeight="900" fill={color}>{grade}</text>
                <text x={size / 2} y={size / 2 + 12} textAnchor="middle" fontSize="9" fill="#64748b">{score}/100</text>
            </svg>
            <span className="text-[9px] font-black uppercase tracking-widest" style={{ color }}>{label}</span>
        </div>
    );
}

// ─── Activity log item ─────────────────────────────────────────────────────────
function ActivityItem({ log, color }) {
    const preview = log.content
        ? log.content
        : log.hasAttachment
            ? `[${log.attachmentType || 'ไฟล์'}]`
            : '—';

    return (
        <div className="flex items-start gap-3 py-2.5 border-b border-white/5 last:border-0">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: color + '22', border: `1px solid ${color}44` }}>
                {log.hasAttachment
                    ? <ImageIcon size={12} style={{ color }} />
                    : <MessageSquareMore size={12} style={{ color }} />
                }
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-black text-white truncate">{log.customerName}</span>
                    <span className="text-[9px] text-white/30 whitespace-nowrap flex-shrink-0">{fmtRelTime(log.createdAt)}</span>
                </div>
                <p className="text-[10px] text-white/40 truncate mt-0.5">{preview}</p>
            </div>
        </div>
    );
}

// ─── Admin Detail Modal ────────────────────────────────────────────────────────
function AdminModal({ admin, color, allMonths, onClose }) {
    if (!admin) return null;
    const { stats, activityLog } = admin;
    const { grade, label, color: scoreColor } = satisfactionGrade(stats.satisfactionScore);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
            onClick={onClose}>
            <div
                className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem] border border-white/15 shadow-2xl"
                style={{ background: '#0A1A2F' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Close */}
                <button onClick={onClose}
                    className="absolute top-5 right-5 z-10 p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-white/50 hover:text-white">
                    <X size={18} />
                </button>

                {/* Header */}
                <div className="p-8 pb-0">
                    <div className="flex items-center gap-5 mb-6">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white"
                            style={{ background: color + '33', border: `1.5px solid ${color}55` }}>
                            {(admin.firstName || 'A').charAt(0)}
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-white">{admin.fullName}</h3>
                            <p className="text-[11px] font-bold uppercase tracking-widest mt-0.5" style={{ color: color + 'bb' }}>
                                {admin.employeeId} · {admin.role || admin.department}
                            </p>
                        </div>
                        <div className="ml-auto">
                            <SatisfactionRing score={stats.satisfactionScore} size={80} />
                        </div>
                    </div>

                    {/* 6-stat grid */}
                    <div className="grid grid-cols-3 gap-3 mb-6">
                        {[
                            { label: 'Messages Sent', value: stats.messages.toLocaleString(),           icon: <MessageSquareMore size={14} />, color: '#e2e8f0' },
                            { label: 'Chats Handled', value: stats.conversationsHandled.toLocaleString(), icon: <Inbox size={14} />,            color },
                            { label: 'Avg Response',  value: stats.avgResponseTimeMinutes > 0 ? `${stats.avgResponseTimeMinutes.toFixed(1)} min` : '—', icon: <Timer size={14} />, color: '#10b981' },
                            { label: 'Revenue',       value: fmtBaht(stats.totalRevenue),               icon: <Banknote size={14} />,          color: '#C9A34E' },
                            { label: 'Closing Rate',  value: `${stats.closingRate}%`,                    icon: <Target size={14} />,            color: '#6366f1' },
                            { label: 'Follow-up',     value: `${stats.followUpRate}%`,                   icon: <Zap size={14} />,               color: '#f59e0b' },
                        ].map(({ label, value, icon, color: c }) => (
                            <div key={label} className="bg-white/5 rounded-2xl p-4 border border-white/5">
                                <div className="flex items-center gap-1.5 mb-2" style={{ color: c }}>
                                    {icon}
                                    <span className="text-[9px] font-black uppercase tracking-widest text-white/40">{label}</span>
                                </div>
                                <p className="text-xl font-black" style={{ color: c }}>{value}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Satisfaction score breakdown */}
                <div className="px-8 mb-6">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-3 flex items-center gap-2">
                        <Star size={11} /> Satisfaction Score Breakdown
                    </p>
                    <div className="bg-white/5 rounded-2xl p-5 border border-white/5 space-y-3">
                        {[
                            { label: 'Response Speed (max 40)', val: stats.avgResponseTimeMinutes > 0 ? (stats.avgResponseTimeMinutes < 5 ? 40 : stats.avgResponseTimeMinutes < 15 ? 32 : stats.avgResponseTimeMinutes < 30 ? 22 : stats.avgResponseTimeMinutes < 60 ? 12 : 5) : 0, max: 40, color: '#10b981' },
                            { label: 'Closing Rate (max 35)',   val: Math.min(Math.round((stats.closingRate / 100) * 35), 35), max: 35, color: '#6366f1' },
                            { label: 'Follow-up Rate (max 25)', val: Math.min(Math.round((stats.followUpRate / 100) * 25), 25), max: 25, color: '#f59e0b' },
                        ].map(({ label, val, max, color: c }) => (
                            <div key={label}>
                                <div className="flex justify-between text-[9px] font-bold text-white/40 mb-1">
                                    <span>{label}</span>
                                    <span style={{ color: c }}>{val}/{max}</span>
                                </div>
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-700"
                                        style={{ width: `${(val / max) * 100}%`, background: c }} />
                                </div>
                            </div>
                        ))}
                        <div className="pt-2 border-t border-white/5 flex justify-between text-[10px] font-black">
                            <span className="text-white/40">Total Score</span>
                            <span style={{ color: scoreColor }}>{stats.satisfactionScore}/100 — {label}</span>
                        </div>
                    </div>
                </div>

                {/* Monthly trend */}
                {allMonths?.length > 0 && (
                    <div className="px-8 mb-6">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-3 flex items-center gap-2">
                            <TrendingUp size={11} /> Monthly Message Trend
                        </p>
                        <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                            <div className="flex gap-1 items-end h-14">
                                {allMonths.map(m => {
                                    const v    = admin.stats.monthly?.[m] || 0;
                                    const maxV = Math.max(...allMonths.map(mm => admin.stats.monthly?.[mm] || 0), 1);
                                    const h    = Math.max((v / maxV) * 48, v > 0 ? 2 : 0);
                                    return (
                                        <div key={m} className="flex-1 flex flex-col items-center justify-end" title={`${thMonth(m)}: ${v} msgs`}>
                                            <span className="text-[7px] font-bold mb-0.5" style={{ color: v > 0 ? color : 'transparent' }}>{v || ''}</span>
                                            <div className="w-full rounded-t" style={{ height: `${h}px`, background: v > 0 ? color + 'bb' : '#1e293b' }} />
                                            <span className="text-[7px] text-white/20 mt-0.5">{thMonth(m)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* Activity log */}
                <div className="px-8 pb-8">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-3 flex items-center gap-2">
                        <Activity size={11} /> Activity Log
                    </p>
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                        {activityLog && activityLog.length > 0 ? (
                            activityLog.map(log => (
                                <ActivityItem key={log.id} log={log} color={color} />
                            ))
                        ) : (
                            <div className="py-6 text-center text-white/20 text-[11px] font-bold uppercase tracking-widest">
                                ไม่มีกิจกรรมในช่วงเวลานี้
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Color palette ─────────────────────────────────────────────────────────────
const ADMIN_COLORS = [
    '#6366f1','#f59e0b','#10b981','#f43f5e','#a78bfa',
    '#34d399','#fb923c','#f472b6','#38bdf8','#4ade80',
    '#e879f9','#facc15','#2dd4bf','#818cf8',
];

const TIMEFRAMES = [
    { key: 'today',      label: 'วันนี้' },
    { key: 'this_week',  label: 'สัปดาห์' },
    { key: 'this_month', label: 'เดือนนี้' },
    { key: 'last_month', label: 'เดือนที่แล้ว' },
    { key: 'year_2026',  label: '2026' },
    { key: 'all_time',   label: 'ทั้งหมด' },
];

// ─── Main Component ────────────────────────────────────────────────────────────
export default function AdminPerformance() {
    const [performanceData, setPerformanceData] = useState([]);
    const [summary,         setSummary]         = useState({ totalMessages: 0, totalConversations: 0, totalRevenue: 0, avgResponseTimeMinutes: 0, allMonths: [], hours: [] });
    const [loading,         setLoading]         = useState(true);
    const [timeframe,       setTimeframe]       = useState('year_2026');
    const [sortBy,          setSortBy]          = useState('volume');
    const [modalAdmin,      setModalAdmin]      = useState(null);
    const [modalColor,      setModalColor]      = useState('#6366f1');

    useEffect(() => { fetchPerformance(); }, [timeframe]);

    const fetchPerformance = async () => {
        setLoading(true);
        try {
            const res    = await fetch(`/api/analytics/admin-performance?timeframe=${timeframe}`);
            const result = await res.json();
            if (result.success) {
                setPerformanceData(result.data);
                setSummary(result.summary);
            }
        } catch (err) {
            console.error('[AdminPerformance] fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const openModal = useCallback((admin, color) => {
        setModalAdmin(admin);
        setModalColor(color);
    }, []);

    const sortedData = [...performanceData].sort((a, b) => {
        if (sortBy === 'speed') {
            const aRt = a.stats.avgResponseTimeMinutes > 0 ? a.stats.avgResponseTimeMinutes : Infinity;
            const bRt = b.stats.avgResponseTimeMinutes > 0 ? b.stats.avgResponseTimeMinutes : Infinity;
            return aRt - bRt;
        }
        if (sortBy === 'revenue')  return b.stats.totalRevenue  - a.stats.totalRevenue;
        if (sortBy === 'closing')  return b.stats.closingRate   - a.stats.closingRate;
        return b.stats.messages - a.stats.messages;
    });

    const top6       = sortedData.slice(0, 6);
    const top6Colors = top6.map((_, i) => ADMIN_COLORS[i] || '#94a3b8');
    const maxMessages = Math.max(...sortedData.map(a => a.stats.messages), 1);

    return (
        <div className="animate-fade-in space-y-8 pb-10">

            {/* ── Header & Filter ─────────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h2 className="text-3xl font-black text-[#F8F8F6] tracking-tight mb-2 uppercase">Chat Performance</h2>
                    <p className="text-[#C9A34E] text-xs font-black uppercase tracking-[0.2em]">ADMIN RESPONSIVENESS · VOLUME · REVENUE</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Sort:</span>
                        <select
                            value={sortBy} onChange={e => setSortBy(e.target.value)}
                            className="bg-[#0A1A2F]/80 p-2 rounded-xl border border-white/10 text-[10px] font-black uppercase text-white tracking-widest outline-none cursor-pointer"
                        >
                            <option value="volume">Highest Volume</option>
                            <option value="speed">Fastest Response</option>
                            <option value="revenue">Highest Revenue</option>
                            <option value="closing">Best Closing Rate</option>
                        </select>
                    </div>

                    <div className="flex bg-[#0A1A2F]/80 p-1 rounded-2xl border border-white/10">
                        {TIMEFRAMES.map(tf => (
                            <button key={tf.key} onClick={() => setTimeframe(tf.key)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    timeframe === tf.key
                                        ? 'bg-[#C9A34E] text-[#0A1A2F] shadow-lg shadow-[#C9A34E]/20'
                                        : 'text-white/40 hover:text-white'
                                }`}>
                                {tf.label}
                            </button>
                        ))}
                    </div>

                    <button onClick={fetchPerformance}
                        className="p-3 bg-white/5 border border-white/10 rounded-2xl text-[#C9A34E] hover:bg-white/10 transition-all">
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* ── Summary KPI cards (4 cards) ──────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#0A1A2F]/50 border border-white/10 p-6 rounded-[2rem] relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-5 text-emerald-400"><Timer size={56} /></div>
                    <p className="text-white/40 text-[9px] font-black uppercase tracking-[0.2em] mb-2">Team Avg. Response</p>
                    <p className="text-3xl font-black text-emerald-400">
                        {summary.avgResponseTimeMinutes > 0 ? summary.avgResponseTimeMinutes.toFixed(1) : 'N/A'}
                        {summary.avgResponseTimeMinutes > 0 && <span className="text-base"> min</span>}
                    </p>
                    <p className="mt-3 text-[9px] font-bold text-emerald-400 flex items-center gap-1"><CheckCircle2 size={10} /> First-reply speed</p>
                </div>
                <div className="bg-[#0A1A2F]/50 border border-white/10 p-6 rounded-[2rem] relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-5 text-white"><MessageSquareMore size={56} /></div>
                    <p className="text-white/40 text-[9px] font-black uppercase tracking-[0.2em] mb-2">Total Messages</p>
                    <p className="text-3xl font-black text-white">{(summary.totalMessages || 0).toLocaleString()}</p>
                    <p className="mt-3 text-[9px] font-bold text-white/20">{summary.totalEmployees} admins active</p>
                </div>
                <div className="bg-[#0A1A2F]/50 border border-white/10 p-6 rounded-[2rem] relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-5 text-[#C9A34E]"><UserCog size={56} /></div>
                    <p className="text-white/40 text-[9px] font-black uppercase tracking-[0.2em] mb-2">Conversations</p>
                    <p className="text-3xl font-black text-[#C9A34E]">{(summary.totalConversations || 0).toLocaleString()}</p>
                    <p className="mt-3 text-[9px] font-bold text-white/20">Across all channels</p>
                </div>
                <div className="bg-[#0A1A2F]/50 border border-white/10 p-6 rounded-[2rem] relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-5 text-[#C9A34E]"><Banknote size={56} /></div>
                    <p className="text-white/40 text-[9px] font-black uppercase tracking-[0.2em] mb-2">Total Revenue</p>
                    <p className="text-3xl font-black text-[#C9A34E]">{fmtBaht(summary.totalRevenue || 0)}</p>
                    <p className="mt-3 text-[9px] font-bold text-white/20">Chat-attributed orders</p>
                </div>
            </div>

            {/* ── Charts row ──────────────────────────────────────────────────── */}
            {!loading && summary.allMonths?.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-[#0A1A2F]/50 border border-white/10 rounded-[2rem] p-6">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                                <TrendingUp size={12} /> Monthly Message Trend
                            </p>
                            <div className="flex flex-wrap gap-x-3 gap-y-1">
                                {top6.map((emp, i) => (
                                    <div key={emp.id} className="flex items-center gap-1">
                                        <div className="w-2 h-2 rounded-full" style={{ background: top6Colors[i] }} />
                                        <span className="text-[8px] text-white/40 font-bold">{emp.firstName}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <MiniBarChart data={top6} colors={top6Colors} months={summary.allMonths} height={110} />
                    </div>

                    <div className="bg-[#0A1A2F]/50 border border-white/10 rounded-[2rem] p-6">
                        <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <Clock size={12} /> Active Hours (Bangkok)
                        </p>
                        <HourHeatmap hours={summary.hours} />
                    </div>
                </div>
            )}

            {/* ── Individual Admin Cards ───────────────────────────────────────── */}
            <div>
                <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <BarChart3 size={12} /> Individual Admin Stats
                    <span className="text-white/20 normal-case font-normal ml-1">· คลิกการ์ดเพื่อดูรายละเอียด</span>
                </p>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {loading ? (
                        <div className="col-span-2 py-20 flex justify-center items-center">
                            <div className="text-[#C9A34E] text-2xl animate-pulse flex items-center gap-2">
                                <Loader2 size={24} className="animate-spin" /> Loading Data...
                            </div>
                        </div>
                    ) : sortedData.length === 0 ? (
                        <div className="col-span-2 py-20 flex justify-center items-center bg-white/5 border border-dashed border-white/10 rounded-[2.5rem]">
                            <div className="text-white/30 text-sm font-black uppercase tracking-widest text-center">
                                <Inbox size={40} className="mb-4 mx-auto block" />
                                No admin activity found for this period.
                            </div>
                        </div>
                    ) : (
                        sortedData.map((admin, index) => {
                            const msgPercent = (admin.stats.messages / maxMessages) * 100;
                            const color      = ADMIN_COLORS[index] || '#94a3b8';
                            const isTop      = index === 0;
                            const { grade, color: satColor } = satisfactionGrade(admin.stats.satisfactionScore);

                            let rtColor = 'text-emerald-400';
                            if (admin.stats.avgResponseTimeMinutes > 15) rtColor = 'text-amber-400';
                            if (admin.stats.avgResponseTimeMinutes > 60) rtColor = 'text-rose-400';
                            if (admin.stats.avgResponseTimeMinutes === 0) rtColor = 'text-white/20';

                            return (
                                <div key={admin.id}
                                    onClick={() => openModal(admin, color)}
                                    className="group cursor-pointer bg-gradient-to-br from-[#0A1A2F] to-[#112240] border border-white/10 rounded-[2rem] p-6 hover:border-white/25 hover:shadow-xl transition-all relative overflow-hidden"
                                    style={{ '--hover-color': color }}>

                                    {isTop && <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-2xl" style={{ background: color + '22' }} />}

                                    {/* "Click to expand" hint on hover */}
                                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg"
                                            style={{ background: color + '22', color }}>
                                            <ChevronRight size={10} /> Detail
                                        </div>
                                    </div>

                                    {/* Admin header */}
                                    <div className="flex items-center justify-between mb-5 relative z-10">
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <div className="w-14 h-14 rounded-2xl flex items-center justify-center border font-black text-xl text-white"
                                                    style={{ background: color + '33', borderColor: color + '44' }}>
                                                    {(admin.firstName || 'A').charAt(0)}
                                                </div>
                                                {isTop && (
                                                    <div className="absolute -bottom-2 -right-2 text-[#0A1A2F] text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest shadow-lg"
                                                        style={{ background: color }}>MVP</div>
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black text-white tracking-tight">{admin.fullName}</h3>
                                                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: color + 'bb' }}>
                                                    {admin.employeeId}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="flex items-center gap-2 justify-end mb-1">
                                                <Clock size={14} className="text-white/30" />
                                                <span className={`text-xl font-black ${rtColor}`}>
                                                    {admin.stats.avgResponseTimeMinutes > 0
                                                        ? `${admin.stats.avgResponseTimeMinutes.toFixed(1)} min`
                                                        : '—'}
                                                </span>
                                            </div>
                                            <p className="text-[8px] text-white/30 uppercase font-black tracking-widest">Avg Response</p>
                                        </div>
                                    </div>

                                    {/* Core stats 2×2 */}
                                    <div className="grid grid-cols-2 gap-3 mb-4 relative z-10">
                                        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                            <p className="text-[8px] text-white/30 uppercase font-black tracking-widest mb-1">Messages Sent</p>
                                            <p className="text-xl font-black text-white">{admin.stats.messages.toLocaleString()}</p>
                                        </div>
                                        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                            <p className="text-[8px] text-white/30 uppercase font-black tracking-widest mb-1">Chats Handled</p>
                                            <p className="text-xl font-black" style={{ color }}>{admin.stats.conversationsHandled.toLocaleString()}</p>
                                        </div>
                                    </div>

                                    {/* New stat chips */}
                                    <div className="grid grid-cols-4 gap-2 mb-4 relative z-10">
                                        {/* Revenue */}
                                        <div className="bg-[#C9A34E]/10 border border-[#C9A34E]/20 rounded-xl p-2.5 flex flex-col items-center">
                                            <Banknote size={12} className="text-[#C9A34E] mb-1" />
                                            <p className="text-[10px] font-black text-[#C9A34E]">{fmtBaht(admin.stats.totalRevenue)}</p>
                                            <p className="text-[7px] text-white/30 uppercase font-black tracking-wide mt-0.5">Revenue</p>
                                        </div>
                                        {/* Closing rate */}
                                        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-2.5 flex flex-col items-center">
                                            <Target size={12} className="text-indigo-400 mb-1" />
                                            <p className="text-[10px] font-black text-indigo-400">{admin.stats.closingRate}%</p>
                                            <p className="text-[7px] text-white/30 uppercase font-black tracking-wide mt-0.5">Closing</p>
                                        </div>
                                        {/* Follow-up */}
                                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 flex flex-col items-center">
                                            <Zap size={12} className="text-amber-400 mb-1" />
                                            <p className="text-[10px] font-black text-amber-400">{admin.stats.followUpRate}%</p>
                                            <p className="text-[7px] text-white/30 uppercase font-black tracking-wide mt-0.5">Follow-up</p>
                                        </div>
                                        {/* Satisfaction grade */}
                                        <div className="rounded-xl p-2.5 flex flex-col items-center border"
                                            style={{ background: satColor + '15', borderColor: satColor + '30' }}>
                                            <Star size={12} style={{ color: satColor }} className="mb-1" />
                                            <p className="text-[10px] font-black" style={{ color: satColor }}>{grade}</p>
                                            <p className="text-[7px] text-white/30 uppercase font-black tracking-wide mt-0.5">{admin.stats.satisfactionScore}pt</p>
                                        </div>
                                    </div>

                                    {/* Activity log preview (latest 2) */}
                                    {admin.activityLog?.length > 0 && (
                                        <div className="mb-4 relative z-10 bg-white/3 rounded-xl p-3 border border-white/5">
                                            <p className="text-[8px] font-black uppercase tracking-widest text-white/25 mb-2 flex items-center gap-1">
                                                <Activity size={8} /> Latest Activity
                                            </p>
                                            {admin.activityLog.slice(0, 2).map(log => (
                                                <div key={log.id} className="flex items-center gap-2 text-[10px] py-1 border-b border-white/5 last:border-0">
                                                    <span className="font-bold text-white/60 truncate">{log.customerName}</span>
                                                    <span className="text-white/25 flex-shrink-0">{fmtRelTime(log.createdAt)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Monthly mini-bars */}
                                    {summary.allMonths?.length > 0 && (
                                        <div className="flex gap-1 mb-4 relative z-10 items-end h-7">
                                            {summary.allMonths.map(m => {
                                                const v    = admin.stats.monthly?.[m] || 0;
                                                const maxV = Math.max(...sortedData.map(a => a.stats.monthly?.[m] || 0), 1);
                                                const h    = Math.max((v / maxV) * 24, v > 0 ? 2 : 0);
                                                return (
                                                    <div key={m} className="flex-1 flex flex-col items-center justify-end" title={`${thMonth(m)}: ${v} msgs`}>
                                                        <div className="w-full rounded-t" style={{ height: `${h}px`, background: v > 0 ? color + 'bb' : '#1e293b' }} />
                                                        <span className="text-[7px] text-white/20 mt-0.5">{thMonth(m)}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Volume bar */}
                                    <div className="space-y-1 relative z-10">
                                        <div className="flex justify-between text-[9px] font-black uppercase text-white/30 tracking-widest">
                                            <span>Share of total</span>
                                            <span>{msgPercent.toFixed(0)}%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                            <div className="h-full rounded-full transition-all duration-700"
                                                style={{ width: `${msgPercent}%`, background: color }} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* ── Detail Modal ─────────────────────────────────────────────────── */}
            {modalAdmin && (
                <AdminModal
                    admin={modalAdmin}
                    color={modalColor}
                    allMonths={summary.allMonths}
                    onClose={() => setModalAdmin(null)}
                />
            )}
        </div>
    );
}
