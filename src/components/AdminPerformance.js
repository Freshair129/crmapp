'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    RefreshCw, MessageSquareMore,
    Loader2, Inbox, Clock, TrendingUp, BarChart3,
    X, Banknote, Target, Star, Activity,
    Image as ImageIcon, Zap, Trophy,
} from 'lucide-react';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmtBaht(n) {
    if (!n) return '฿0';
    if (n >= 1_000_000) return `฿${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)     return `฿${(n / 1_000).toFixed(1)}K`;
    return `฿${Number(n).toLocaleString()}`;
}

function fmtRelTime(date) {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (diff < 60)    return `${diff} วิที่แล้ว`;
    if (diff < 3600)  return `${Math.floor(diff / 60)} นาทีที่แล้ว`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ชม.ที่แล้ว`;
    return `${Math.floor(diff / 86400)} วันที่แล้ว`;
}

function satisfactionGrade(score) {
    if (score >= 85) return { grade: 'A', label: 'ดีมาก',   color: '#10b981' };
    if (score >= 70) return { grade: 'B', label: 'ดี',      color: '#6366f1' };
    if (score >= 55) return { grade: 'C', label: 'พอใช้',  color: '#f59e0b' };
    return              { grade: 'D', label: 'ควรปรับ', color: '#f43f5e' };
}

const MONTH_TH = ['','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
function thMonth(m) { return MONTH_TH[parseInt(m?.slice(5), 10)] || m; }

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

// ─── Shared style tokens ───────────────────────────────────────────────────────
const S = {
    card:       { background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '22px 24px' },
    cardTitle:  { fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '7px' },
    label:      { fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' },
    value:      { fontSize: '32px', fontWeight: 800, color: '#f1f5f9', margin: '5px 0 4px', lineHeight: 1 },
    sub:        { fontSize: '11px', color: '#94a3b8' },
    tHead:      { fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #334155' },
    tCell:      { padding: '10px 10px', borderBottom: '1px solid #1e293b', verticalAlign: 'middle' },
};

// ─── Hour Heatmap ──────────────────────────────────────────────────────────────
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '4px' }}>
                {hours.map(({ hour, messages }) => (
                    <div key={hour}
                        title={`${String(hour).padStart(2,'0')}:00 น. — ${messages} ข้อความ`}
                        style={{ background: getColor(messages), borderRadius: '4px', aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'default', transition: 'transform 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.15)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                        <span style={{ fontSize: '9px', fontWeight: 700, color: getTextColor(messages), lineHeight: 1 }}>{messages || ''}</span>
                        <span style={{ fontSize: '7px', color: getTextColor(messages), opacity: 0.75, marginTop: '2px' }}>{String(hour).padStart(2,'0')}</span>
                    </div>
                ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px', fontSize: '11px', color: '#64748b' }}>
                <span>น้อย</span>
                {['#1e3a5f','#1d4ed8','#3b82f6','#60a5fa','#93c5fd'].map(c => (
                    <div key={c} style={{ width: '13px', height: '13px', borderRadius: '3px', background: c }} />
                ))}
                <span>มาก</span>
            </div>
        </div>
    );
}

// ─── Monthly SVG Line Chart (Trend) ───────────────────────────────────────────
// Neon palette for futuristic chart — overrides incoming colors for multi-line view
const NEON_PALETTE = [
    '#00f5ff', // cyan
    '#ff2d78', // hot pink
    '#39ff14', // lime
    '#ff9900', // orange
    '#bf00ff', // purple
    '#ffff00', // yellow
    '#00ffcc', // teal
    '#ff4545', // red
];

function MonthlyLineChart({ data, colors, months, height = 140 }) {
    // ── ResizeObserver: measure container, fill it exactly ─────────────────
    const wrapRef = useRef(null);
    const [svgW, setSvgW] = useState(500);

    useEffect(() => {
        const el = wrapRef.current;
        if (!el) return;
        // initial measurement
        setSvgW(el.clientWidth || 500);
        const ro = new ResizeObserver(([entry]) => {
            setSvgW(Math.floor(entry.contentRect.width) || 500);
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    if (!data || data.length === 0 || !months || months.length === 0) return <div ref={wrapRef} style={{ width: '100%', height: '100%' }} />;

    // Use neon palette for multi-line (main chart), fall back to incoming color for mini single-line charts
    const neonColors = data.map((_, i) =>
        data.length > 1 ? NEON_PALETTE[i % NEON_PALETTE.length] : (colors[i] || NEON_PALETTE[0])
    );

    const maxVal    = Math.max(...data.flatMap(d => months.map(m => d.stats?.monthly?.[m] || 0)), 1);
    const padL      = 42;
    const padR      = 16;
    const padT      = 14;
    const padB      = 26;
    // chartW fills the full measured container width
    const chartW    = Math.max(svgW - padL - padR, 80);
    const totalW    = svgW;          // SVG pixel width = container width
    const totalH    = padT + height + padB;
    const stepX     = months.length > 1 ? chartW / (months.length - 1) : chartW / 2;
    const gridLines = 4;
    const gridVals  = Array.from({ length: gridLines + 1 }, (_, i) => Math.round((maxVal / gridLines) * i));

    return (
        <div ref={wrapRef} style={{ width: '100%', height: '100%' }}>
        <svg width={totalW} height={totalH}
             viewBox={`0 0 ${totalW} ${totalH}`}
             style={{ display: 'block', overflow: 'visible' }}>
            <defs>
                {/* Glow filter per neon color */}
                {neonColors.map((c, i) => (
                    <filter key={`glow-${i}`} id={`neon-glow-${i}`} x="-80%" y="-80%" width="260%" height="260%">
                        <feGaussianBlur stdDeviation="2.5" result="blur"/>
                        <feMerge>
                            <feMergeNode in="blur"/>
                            <feMergeNode in="blur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                ))}
                {/* Scanline overlay pattern */}
                <pattern id="scanlines" x="0" y="0" width="2" height="4" patternUnits="userSpaceOnUse">
                    <rect width="2" height="2" fill="transparent"/>
                    <rect y="2" width="2" height="2" fill="#000" fillOpacity="0.06"/>
                </pattern>
                {/* Area gradient per color */}
                {neonColors.map((c, i) => (
                    <linearGradient key={`ngrad-${i}`} id={`ngrad-${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor={c} stopOpacity={0.22}/>
                        <stop offset="60%"  stopColor={c} stopOpacity={0.06}/>
                        <stop offset="100%" stopColor={c} stopOpacity={0}/>
                    </linearGradient>
                ))}
            </defs>

            {/* Dark panel background */}
            <rect x={padL} y={padT} width={chartW} height={height}
                  fill="#020c18" rx="4" opacity="0.8"/>
            {/* Scanlines overlay */}
            <rect x={padL} y={padT} width={chartW} height={height}
                  fill="url(#scanlines)" rx="4"/>

            {/* Horizontal grid lines */}
            {gridVals.map((val, i) => {
                const y = padT + height - (val / maxVal) * height;
                const isBaseline = i === 0;
                return (
                    <g key={`grid-${i}`}>
                        <line
                            x1={padL} y1={y} x2={padL + chartW} y2={y}
                            stroke={isBaseline ? '#0d4f6e' : '#051a2e'}
                            strokeWidth={isBaseline ? 1 : 0.6}
                            strokeDasharray={isBaseline ? 'none' : '5 5'}/>
                        <text x={padL - 7} y={y + 3.5}
                              textAnchor="end" fontSize="8"
                              fill="#1a7a99" fontFamily="'Courier New', monospace" fontWeight="700">
                            {val}
                        </text>
                    </g>
                );
            })}

            {/* Vertical grid lines at each month */}
            {months.map((m, mi) => {
                const x = padL + (months.length > 1 ? mi * stepX : chartW / 2);
                return (
                    <line key={`vgrid-${mi}`}
                          x1={x} y1={padT} x2={x} y2={padT + height}
                          stroke="#051a2e" strokeWidth={0.5} strokeDasharray="3 6"/>
                );
            })}

            {/* Lines + area fills + dots per employee */}
            {data.map((emp, ei) => {
                const col    = neonColors[ei];
                const points = months.map((m, mi) => {
                    const val = emp.stats?.monthly?.[m] || 0;
                    const x   = padL + (months.length > 1 ? mi * stepX : chartW / 2);
                    const y   = padT + height - (val / maxVal) * height;
                    return { x, y, val };
                });

                const lineD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                const areaD = lineD
                    + ` L ${points[points.length - 1].x} ${padT + height}`
                    + ` L ${points[0].x} ${padT + height} Z`;

                return (
                    <g key={`line-${ei}`}>
                        {/* Area fill */}
                        <path d={areaD} fill={`url(#ngrad-${ei})`}/>
                        {/* Outer glow halo on line */}
                        <path d={lineD} fill="none"
                              stroke={col} strokeWidth={5}
                              strokeLinecap="round" strokeLinejoin="round"
                              opacity={0.12}/>
                        {/* Main neon line */}
                        <path d={lineD} fill="none"
                              stroke={col} strokeWidth={1.8}
                              strokeLinecap="round" strokeLinejoin="round"
                              filter={`url(#neon-glow-${ei})`}
                              opacity={0.95}/>
                        {/* Dots */}
                        {points.map((p, pi) => (
                            <g key={`dot-${ei}-${pi}`}>
                                {/* Outer glow ring */}
                                <circle cx={p.x} cy={p.y} r={8} fill={col} opacity={0.08}/>
                                <circle cx={p.x} cy={p.y} r={5} fill={col} opacity={0.18}/>
                                {/* Core dot */}
                                <circle cx={p.x} cy={p.y} r={2.8}
                                        fill={col} filter={`url(#neon-glow-${ei})`}/>
                                {/* Dark center */}
                                <circle cx={p.x} cy={p.y} r={1.2} fill="#020c18"/>
                                {/* Value label */}
                                {p.val > 0 && (
                                    <text x={p.x} y={p.y - 12}
                                          textAnchor="middle" fontSize="8"
                                          fill={col} fontWeight="800"
                                          fontFamily="'Courier New', monospace"
                                          filter={`url(#neon-glow-${ei})`}>
                                        {p.val}
                                    </text>
                                )}
                            </g>
                        ))}
                    </g>
                );
            })}

            {/* X-axis month labels */}
            {months.map((m, mi) => (
                <text key={m}
                    x={padL + (months.length > 1 ? mi * stepX : chartW / 2)}
                    y={padT + height + 19}
                    textAnchor="middle" fontSize="9"
                    fill="#1a7a99" fontWeight="700"
                    fontFamily="'Courier New', monospace">
                    {thMonth(m)}
                </text>
            ))}
        </svg>
        </div>
    );
}

// ─── Satisfaction Ring ─────────────────────────────────────────────────────────
function SatisfactionRing({ score, size = 72 }) {
    const { grade, label, color } = satisfactionGrade(score);
    const r    = (size - 10) / 2;
    const circ = 2 * Math.PI * r;
    const dash = (score / 100) * circ;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <svg width={size} height={size}>
                <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#334155" strokeWidth="7" />
                <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="7"
                    strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
                    transform={`rotate(-90 ${size/2} ${size/2})`} />
                <text x={size/2} y={size/2 - 3} textAnchor="middle" fontSize="16" fontWeight="900" fill={color}>{grade}</text>
                <text x={size/2} y={size/2 + 12} textAnchor="middle" fontSize="8" fill="#64748b">{score}/100</text>
            </svg>
            <span style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color }}>{label}</span>
        </div>
    );
}

// ─── Admin Detail Modal ────────────────────────────────────────────────────────
function AdminModal({ admin, color, allMonths, onClose }) {
    if (!admin) return null;
    const { stats, activityLog } = admin;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
            onClick={onClose}>
            <div style={{ ...S.card, background: '#0f172a', position: 'relative', width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '16px' }}
                onClick={e => e.stopPropagation()}>

                <button onClick={onClose} style={{ position: 'absolute', top: '14px', right: '14px', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '6px 8px', color: '#64748b', cursor: 'pointer' }}>
                    <X size={15} />
                </button>

                {/* Header */}
                <div style={{ paddingBottom: '18px', borderBottom: '1px solid #334155', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '52px', height: '52px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 900, color: '#fff', background: color + '33', border: `1.5px solid ${color}55`, flexShrink: 0 }}>
                        {(admin.firstName || 'A').charAt(0)}
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '18px', fontWeight: 800, color: '#f1f5f9' }}>{admin.fullName}</div>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: color + 'cc', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'monospace' }}>{admin.employeeId} · {admin.role}</div>
                    </div>
                    <SatisfactionRing score={stats.satisfactionScore} />
                </div>

                {/* 6-stat grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
                    {[
                        { label: 'ข้อความ',       val: stats.messages.toLocaleString(),                                                    color: '#f1f5f9' },
                        { label: 'Conversations', val: stats.conversationsHandled.toLocaleString(),                                         color },
                        { label: 'Avg Response',  val: stats.avgResponseTimeMinutes > 0 ? `${stats.avgResponseTimeMinutes.toFixed(1)} min` : '—', color: '#10b981' },
                        { label: 'Revenue',       val: fmtBaht(stats.totalRevenue),                                                        color: '#f59e0b' },
                        { label: 'Closing Rate',  val: `${stats.closingRate}%`,                                                             color: '#6366f1' },
                        { label: 'Follow-up',     val: `${stats.followUpRate}%`,                                                            color: '#f59e0b' },
                    ].map(s => (
                        <div key={s.label} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '12px 14px' }}>
                            <div style={{ ...S.label, marginBottom: '6px' }}>{s.label}</div>
                            <div style={{ fontSize: '22px', fontWeight: 800, color: s.color }}>{s.val}</div>
                        </div>
                    ))}
                </div>

                {/* Monthly chart */}
                {allMonths?.length > 0 && (
                    <div style={{ marginBottom: '20px' }}>
                        <div style={{ ...S.label, marginBottom: '10px' }}>Monthly Trend</div>
                        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '14px' }}>
                            <MonthlyLineChart data={[admin]} colors={[color]} months={allMonths} height={80} />
                        </div>
                    </div>
                )}

                {/* Activity log */}
                {activityLog?.length > 0 && (
                    <div>
                        <div style={{ ...S.label, marginBottom: '10px' }}>Latest Activity</div>
                        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '4px 14px' }}>
                            {activityLog.map(log => {
                                const preview = log.content ? log.content : log.hasAttachment ? `[${log.attachmentType || 'ไฟล์'}]` : '—';
                                return (
                                    <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: '1px solid #334155' }}>
                                        <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: color + '22', border: `1px solid ${color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            {log.hasAttachment ? <ImageIcon size={11} style={{ color }} /> : <MessageSquareMore size={11} style={{ color }} />}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                                                <span style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.customerName}</span>
                                                <span style={{ fontSize: '10px', color: '#475569', flexShrink: 0 }}>{fmtRelTime(log.createdAt)}</span>
                                            </div>
                                            <div style={{ fontSize: '10px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{preview}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

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

    const openModal = useCallback((admin, color) => { setModalAdmin(admin); setModalColor(color); }, []);

    // ── Separate "Admin" scraper placeholder (unattributed messages) ──────────
    // TVS-EMP-2026-0001 / firstName="Admin" = ข้อความที่ scraper ยังไม่ดึงชื่อผู้ส่ง
    const isAdminPlaceholder = (emp) =>
        emp.employeeId === 'TVS-EMP-2026-0001' ||
        (emp.firstName === 'Admin' && (emp.lastName === 'User' || !emp.lastName));

    const allSorted = [...performanceData].sort((a, b) => {
        if (sortBy === 'speed') {
            const aRt = a.stats.avgResponseTimeMinutes > 0 ? a.stats.avgResponseTimeMinutes : Infinity;
            const bRt = b.stats.avgResponseTimeMinutes > 0 ? b.stats.avgResponseTimeMinutes : Infinity;
            return aRt - bRt;
        }
        if (sortBy === 'revenue') return b.stats.totalRevenue - a.stats.totalRevenue;
        if (sortBy === 'closing') return b.stats.closingRate  - a.stats.closingRate;
        return b.stats.messages - a.stats.messages;
    });

    const unidentifiedAdmin = allSorted.find(isAdminPlaceholder) || null;
    const sortedData        = allSorted.filter(emp => !isAdminPlaceholder(emp));

    const top6        = sortedData.slice(0, 6);
    const top6Colors  = top6.map((_, i) => ADMIN_COLORS[i] || '#94a3b8');
    const topAdmin    = sortedData[0];   // real #1 (Admin placeholder excluded)
    const maxMessages = Math.max(...sortedData.map(a => a.stats.messages), 1);
    const currentTF   = TIMEFRAMES.find(t => t.key === timeframe)?.label || '';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '40px' }}>

            {/* ── Header ──────────────────────────────────────────────────────── */}
            <div style={{ ...S.card, padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.3px' }}>🍳 Admin Performance Dashboard</h2>
                    <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>The V School — Chat Performance · Volume · Revenue</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                        style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '7px', padding: '6px 10px', fontSize: '11px', fontWeight: 600, color: '#94a3b8', outline: 'none', cursor: 'pointer' }}>
                        <option value="volume">Highest Volume</option>
                        <option value="speed">Fastest Response</option>
                        <option value="revenue">Highest Revenue</option>
                        <option value="closing">Best Closing Rate</option>
                    </select>
                    <div style={{ display: 'flex', background: '#0f172a', border: '1px solid #334155', borderRadius: '7px', overflow: 'hidden' }}>
                        {TIMEFRAMES.map(tf => (
                            <button key={tf.key} onClick={() => setTimeframe(tf.key)}
                                style={{ padding: '6px 13px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all 0.15s', background: timeframe === tf.key ? '#6366f1' : 'transparent', color: timeframe === tf.key ? '#fff' : '#64748b' }}>
                                {tf.label}
                            </button>
                        ))}
                    </div>
                    <button onClick={fetchPerformance}
                        style={{ padding: '7px 9px', background: '#0f172a', border: '1px solid #334155', borderRadius: '7px', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* ── KPI Cards ───────────────────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
                {[
                    { accent: '#6366f1', icon: '💬', label: 'ข้อความทั้งหมด',   value: (summary.totalMessages || 0).toLocaleString(),  sub: `${summary.totalEmployees || 0} admins active` },
                    { accent: '#f59e0b', icon: '🗂️', label: 'Conversations',     value: (summary.totalConversations || 0).toLocaleString(), sub: 'unique convs ที่มี admin reply' },
                    { accent: '#10b981', icon: '⚡', label: 'Avg. Response',     value: summary.avgResponseTimeMinutes > 0 ? `${summary.avgResponseTimeMinutes.toFixed(1)} min` : 'N/A', sub: 'First-reply speed' },
                    { accent: '#f43f5e', icon: '🏆', label: 'Top Performer',     value: topAdmin ? (topAdmin.nickName || topAdmin.firstName || '—') : '—', valueSize: '20px', sub: topAdmin ? `${topAdmin.stats.messages} ข้อความ · ${topAdmin.stats.conversationsHandled} convs` : '' },
                ].map((kpi, i) => (
                    <div key={i} style={{ ...S.card, padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: kpi.accent }} />
                        <div style={{ position: 'absolute', right: '14px', top: '14px', fontSize: '24px', opacity: 0.12 }}>{kpi.icon}</div>
                        <p style={S.label}>{kpi.label}</p>
                        <p style={{ ...S.value, fontSize: kpi.valueSize || '32px' }}>{kpi.value}</p>
                        <p style={S.sub}>{kpi.sub}</p>
                    </div>
                ))}
            </div>

            {/* ── Charts Row ──────────────────────────────────────────────────── */}
            {!loading && summary.allMonths?.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
                    <div style={{ ...S.card, background: '#030e1c', border: '1px solid #0d3a50', boxShadow: '0 0 18px rgba(0,245,255,0.06), inset 0 0 40px rgba(0,0,0,0.4)' }}>
                        <div style={{ ...S.cardTitle, color: '#00f5ff', textShadow: '0 0 8px rgba(0,245,255,0.5)' }}>
                            <TrendingUp size={13} /> Monthly Message Trend
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginLeft: 'auto' }}>
                                {top6.map((emp, i) => {
                                    const nc = NEON_PALETTE[i % NEON_PALETTE.length];
                                    return (
                                        <div key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: nc, boxShadow: `0 0 6px ${nc}` }} />
                                            <span style={{ fontSize: '10px', color: nc, fontWeight: 700, fontFamily: "'Courier New', monospace", opacity: 0.85 }}>{emp.firstName}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div style={{ width: '100%' }}>
                            <MonthlyLineChart data={top6} colors={top6Colors} months={summary.allMonths} height={190} />
                        </div>
                    </div>
                    <div style={S.card}>
                        <div style={S.cardTitle}><Clock size={13} /> Active Hours (Bangkok)</div>
                        <HourHeatmap hours={summary.hours} />
                    </div>
                </div>
            )}

            {/* ── Leaderboard Table ────────────────────────────────────────────── */}
            <div style={S.card}>
                <div style={S.cardTitle}><Trophy size={13} /> Admin Leaderboard — {currentTF}</div>
                {loading ? (
                    <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <Loader2 size={16} className="animate-spin" /> กำลังโหลด...
                    </div>
                ) : sortedData.length === 0 ? (
                    <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748b' }}>ไม่มีข้อมูลในช่วงนี้</div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                            <thead>
                                <tr>
                                    {['#', 'Admin', 'ข้อความ', 'Conversations', ...summary.allMonths.map(m => thMonth(m)), 'Grade', 'สัดส่วน'].map(h => (
                                        <th key={h} style={S.tHead}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {sortedData.map((admin, i) => {
                                    const color = ADMIN_COLORS[i] || '#94a3b8';
                                    const pct   = Math.round(admin.stats.messages / maxMessages * 100);
                                    const { grade, color: gradeColor } = satisfactionGrade(admin.stats.satisfactionScore);
                                    const rankIcons = ['🥇','🥈','🥉'];
                                    return (
                                        <tr key={admin.id}
                                            onClick={() => openModal(admin, color)}
                                            style={{ cursor: 'pointer', transition: 'background 0.1s' }}
                                            onMouseEnter={e => e.currentTarget.style.background = '#0f172a'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <td style={S.tCell}>
                                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: i < 3 ? '14px' : '11px', fontWeight: 700, background: i === 0 ? '#f59e0b22' : i === 1 ? '#94a3b822' : i === 2 ? '#cd7f3222' : '#0f172a', color: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#cd7f32' : '#475569', border: i >= 3 ? '1px solid #334155' : 'none' }}>
                                                    {i < 3 ? rankIcons[i] : i + 1}
                                                </div>
                                            </td>
                                            <td style={S.tCell}>
                                                <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '13px' }}>{admin.fullName}</div>
                                                <div style={{ fontSize: '10px', color: '#475569', fontFamily: 'monospace' }}>{admin.employeeId}</div>
                                            </td>
                                            <td style={S.tCell}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontWeight: 700, color: '#f1f5f9', fontVariantNumeric: 'tabular-nums' }}>{admin.stats.messages.toLocaleString()}</span>
                                                    <div style={{ height: '5px', borderRadius: '3px', background: '#334155', flex: 1, overflow: 'hidden', minWidth: '50px' }}>
                                                        <div style={{ height: '5px', width: `${pct}%`, background: color, borderRadius: '3px' }} />
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={S.tCell}>
                                                <span style={{ fontWeight: 700, color: '#f1f5f9' }}>{admin.stats.conversationsHandled}</span>
                                                <span style={{ fontSize: '10px', color: '#64748b', marginLeft: '4px' }}>convs</span>
                                            </td>
                                            {summary.allMonths.map(m => (
                                                <td key={m} style={S.tCell}>
                                                    {admin.stats.monthly?.[m]
                                                        ? <span style={{ fontWeight: 700, color: '#f1f5f9' }}>{admin.stats.monthly[m]}</span>
                                                        : <span style={{ color: '#475569' }}>—</span>}
                                                </td>
                                            ))}
                                            <td style={S.tCell}>
                                                <span style={{ fontWeight: 800, fontSize: '13px', color: gradeColor }}>{grade}</span>
                                            </td>
                                            <td style={S.tCell}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <div style={{ height: '5px', borderRadius: '3px', background: '#334155', width: '70px', overflow: 'hidden' }}>
                                                        <div style={{ height: '5px', width: `${pct}%`, background: color, borderRadius: '3px' }} />
                                                    </div>
                                                    <span style={{ fontSize: '11px', color: '#64748b' }}>{pct}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* ── Unidentified messages footnote ── */}
                {unidentifiedAdmin && (
                    <div style={{ marginTop: '10px', padding: '10px 16px', background: '#0f172a', border: '1px dashed #334155', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '14px' }}>⚠️</span>
                            <div>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>ข้อความที่ยังไม่ถูกระบุผู้ส่ง</span>
                                <span style={{ fontSize: '10px', color: '#475569', marginLeft: '8px' }}>scraper ยังไม่ดึงชื่อผู้ตอบ — ไม่นับในลำดับ</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '20px', flexShrink: 0 }}>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '16px', fontWeight: 800, color: '#475569', fontVariantNumeric: 'tabular-nums' }}>{unidentifiedAdmin.stats.messages.toLocaleString()}</div>
                                <div style={{ fontSize: '9px', color: '#334155', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>ข้อความ</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '16px', fontWeight: 800, color: '#475569', fontVariantNumeric: 'tabular-nums' }}>{unidentifiedAdmin.stats.conversationsHandled}</div>
                                <div style={{ fontSize: '9px', color: '#334155', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>conversations</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Employee Cards (Bottom) ──────────────────────────────────────── */}
            <div>
                <div style={{ ...S.cardTitle, marginBottom: '12px' }}>
                    <BarChart3 size={13} /> Individual Admin Cards
                    <span style={{ fontSize: '11px', color: '#475569', fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: '4px' }}>· คลิกเพื่อดูรายละเอียด</span>
                </div>

                {loading ? (
                    <div style={{ ...S.card, padding: '60px', textAlign: 'center', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <Loader2 size={18} className="animate-spin" /> Loading Data...
                    </div>
                ) : sortedData.length === 0 ? (
                    <div style={{ ...S.card, padding: '60px', textAlign: 'center', color: '#64748b' }}>
                        <Inbox size={34} style={{ margin: '0 auto 10px', display: 'block', opacity: 0.35 }} />
                        No admin activity found for this period.
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                        {sortedData.map((admin, index) => {
                            const msgPct  = (admin.stats.messages / maxMessages) * 100;
                            const color   = ADMIN_COLORS[index] || '#94a3b8';
                            const isTop   = index === 0;
                            const { grade, color: satColor } = satisfactionGrade(admin.stats.satisfactionScore);

                            let rtColor = '#10b981';
                            if (admin.stats.avgResponseTimeMinutes > 15) rtColor = '#f59e0b';
                            if (admin.stats.avgResponseTimeMinutes > 60) rtColor = '#f43f5e';
                            if (admin.stats.avgResponseTimeMinutes === 0) rtColor = '#475569';

                            return (
                                <div key={admin.id}
                                    onClick={() => openModal(admin, color)}
                                    style={{ ...S.card, cursor: 'pointer', position: 'relative', overflow: 'hidden', transition: 'border-color 0.2s, box-shadow 0.2s' }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = color + '55'; e.currentTarget.style.boxShadow = `0 4px 20px ${color}14`; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.boxShadow = 'none'; }}>

                                    {/* Colored left accent */}
                                    <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '3px', background: color, borderRadius: '12px 0 0 12px' }} />

                                    {/* Admin header */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', paddingLeft: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ position: 'relative' }}>
                                                <div style={{ width: '44px', height: '44px', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px', fontWeight: 900, color: '#fff', background: color + '33', border: `1.5px solid ${color}44` }}>
                                                    {(admin.firstName || 'A').charAt(0)}
                                                </div>
                                                {isTop && (
                                                    <div style={{ position: 'absolute', bottom: '-5px', right: '-7px', background: color, color: '#0f172a', fontSize: '7px', fontWeight: 900, padding: '2px 5px', borderRadius: '99px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>MVP</div>
                                                )}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '14px' }}>{admin.fullName}</div>
                                                <div style={{ fontSize: '10px', fontWeight: 600, color: color + 'bb', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'monospace' }}>{admin.employeeId}</div>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '16px', fontWeight: 800, color: rtColor }}>{admin.stats.avgResponseTimeMinutes > 0 ? `${admin.stats.avgResponseTimeMinutes.toFixed(1)} min` : '—'}</div>
                                            <div style={{ ...S.label, marginBottom: 0 }}>Avg Response</div>
                                        </div>
                                    </div>

                                    {/* Core stats 2×2 */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px', paddingLeft: '8px' }}>
                                        <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '10px 12px' }}>
                                            <div style={{ ...S.label, marginBottom: '4px' }}>Messages</div>
                                            <div style={{ fontSize: '20px', fontWeight: 800, color: '#f1f5f9' }}>{admin.stats.messages.toLocaleString()}</div>
                                        </div>
                                        <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '10px 12px' }}>
                                            <div style={{ ...S.label, marginBottom: '4px' }}>Conversations</div>
                                            <div style={{ fontSize: '20px', fontWeight: 800, color }}>{admin.stats.conversationsHandled.toLocaleString()}</div>
                                        </div>
                                    </div>

                                    {/* Stat chips */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '10px', paddingLeft: '8px' }}>
                                        {[
                                            { bg: '#f59e0b11', border: '#f59e0b22', c: '#f59e0b', icon: <Banknote size={11} style={{ color: '#f59e0b', margin: '0 auto 3px', display: 'block' }} />, val: fmtBaht(admin.stats.totalRevenue), lbl: 'Revenue' },
                                            { bg: '#6366f111', border: '#6366f122', c: '#818cf8', icon: <Target size={11} style={{ color: '#818cf8', margin: '0 auto 3px', display: 'block' }} />, val: `${admin.stats.closingRate}%`, lbl: 'Closing' },
                                            { bg: '#f59e0b11', border: '#f59e0b22', c: '#f59e0b', icon: <Zap size={11} style={{ color: '#f59e0b', margin: '0 auto 3px', display: 'block' }} />, val: `${admin.stats.followUpRate}%`, lbl: 'Follow-up' },
                                            { bg: satColor + '15', border: satColor + '30', c: satColor, icon: <Star size={11} style={{ color: satColor, margin: '0 auto 3px', display: 'block' }} />, val: grade, lbl: `${admin.stats.satisfactionScore}pt` },
                                        ].map((chip, ci) => (
                                            <div key={ci} style={{ background: chip.bg, border: `1px solid ${chip.border}`, borderRadius: '8px', padding: '8px 4px', textAlign: 'center' }}>
                                                {chip.icon}
                                                <div style={{ fontSize: '10px', fontWeight: 800, color: chip.c }}>{chip.val}</div>
                                                <div style={{ fontSize: '7px', color: '#64748b', textTransform: 'uppercase', marginTop: '1px' }}>{chip.lbl}</div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Activity preview */}
                                    {admin.activityLog?.length > 0 && (
                                        <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '8px 12px', marginBottom: '10px', marginLeft: '8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', color: '#475569', marginBottom: '6px', letterSpacing: '0.08em' }}>
                                                <Activity size={8} /> Latest Activity
                                            </div>
                                            {admin.activityLog.slice(0, 2).map(log => (
                                                <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', padding: '3px 0', borderBottom: '1px solid #1e293b' }}>
                                                    <span style={{ fontWeight: 600, color: '#94a3b8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.customerName}</span>
                                                    <span style={{ color: '#475569', flexShrink: 0 }}>{fmtRelTime(log.createdAt)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Share bar */}
                                    <div style={{ paddingLeft: '8px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', ...S.label, marginBottom: '4px' }}>
                                            <span>Share of total</span>
                                            <span>{msgPct.toFixed(0)}%</span>
                                        </div>
                                        <div style={{ height: '4px', background: '#334155', borderRadius: '2px', overflow: 'hidden' }}>
                                            <div style={{ height: '4px', width: `${msgPct}%`, background: color, borderRadius: '2px', transition: 'width 0.7s ease' }} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Detail Modal ─────────────────────────────────────────────────── */}
            {modalAdmin && (
                <AdminModal admin={modalAdmin} color={modalColor} allMonths={summary.allMonths} onClose={() => setModalAdmin(null)} />
            )}
        </div>
    );
}
