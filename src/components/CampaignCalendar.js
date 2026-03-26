import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Antenna, Megaphone, Eye, Flame, List } from 'lucide-react';

export default function CampaignCalendar() {
    const [viewDate, setViewDate] = useState(new Date());
    const [ads, setAds] = useState([]);
    const [loading, setLoading] = useState(true);

    // Navigation
    const nextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    const prevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));

    // Today in Thai timezone (YYYY-MM-DD)
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });

    // Calculate Boundaries
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const { sinceDate, untilDate } = useMemo(() => {
        const start = new Date(year, month, 1);
        const end = new Date(year, month + 1, 0);
        const formatD = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return { sinceDate: formatD(start), untilDate: formatD(end) };
    }, [year, month]);

    // Fetch ad daily metrics for the viewed month
    useEffect(() => {
        let isMounted = true;
        async function fetchData() {
            setLoading(true);
            try {
                const res = await fetch(`/api/marketing/ad-calendar?since=${sinceDate}&until=${untilDate}`);
                const data = await res.json();
                if (!isMounted) return;
                setAds(data.success ? (data.data || []) : []);
            } catch (err) {
                console.error('[CampaignCalendar] Fetch error:', err);
            } finally {
                if (isMounted) setLoading(false);
            }
        }
        fetchData();
        return () => { isMounted = false; };
    }, [sinceDate, untilDate]);

    // Calendar Grid Calculation
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startDayOfWeek = new Date(year, month, 1).getDay(); // 0=Sun
    const startOffset = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1; // Mon=0

    const calendarCells = useMemo(() => {
        const cells = [];
        for (let i = 0; i < startOffset; i++) cells.push({ day: null });
        for (let i = 1; i <= daysInMonth; i++) cells.push({ day: i });
        return cells;
    }, [startOffset, daysInMonth]);

    // Build ad segments
    const processedAds = useMemo(() => {
        return ads.map(ad => {
            const spendDays = (ad.days || [])
                .filter(d => d.spend > 0)
                .map(d => d.date)
                .sort();

            if (spendDays.length === 0) return null;

            const firstDay = spendDays[0];
            let lastDay = spendDays[spendDays.length - 1];

            const todayTime = new Date(todayStr).getTime();
            const lastDayTime = new Date(lastDay).getTime();
            const daysSinceLastSpend = (todayTime - lastDayTime) / 86400000;
            const isDelivering = ad.status === 'ACTIVE' && daysSinceLastSpend <= 3;

            if (isDelivering) lastDay = todayStr;

            const firstDayNum = (() => {
                const d = new Date(firstDay);
                if (d.getFullYear() === year && d.getMonth() === month) return d.getDate();
                return 1;
            })();

            const lastDayNum = (() => {
                const d = new Date(lastDay);
                if (d.getFullYear() === year && d.getMonth() === month) return d.getDate();
                return daysInMonth;
            })();

            const activeDays = new Set();
            for (let d = firstDayNum; d <= lastDayNum; d++) activeDays.add(d);

            const totalSpend = (ad.days || []).reduce((s, d) => s + (d.spend || 0), 0);
            const totalImpressions = (ad.days || []).reduce((s, d) => s + (d.impressions || 0), 0);
            const totalClicks = (ad.days || []).reduce((s, d) => s + (d.clicks || 0), 0);

            return {
                ...ad,
                activeDays,
                firstDayNum,
                lastDayNum,
                isDelivering,
                daysActive: activeDays.size,
                totalSpend,
                totalImpressions,
                totalClicks,
            };
        }).filter(Boolean);
    }, [ads, year, month, daysInMonth, todayStr]);

    // Row assignment for non-overlapping bars
    const adSegmentsMap = useMemo(() => {
        const map = new Map();
        const rowEndDay = [];

        processedAds.forEach(ad => {
            let assignedRow = -1;
            for (let r = 0; r < rowEndDay.length; r++) {
                if (rowEndDay[r] < ad.firstDayNum) {
                    assignedRow = r;
                    rowEndDay[r] = ad.lastDayNum;
                    break;
                }
            }
            if (assignedRow === -1) {
                assignedRow = rowEndDay.length;
                rowEndDay.push(ad.lastDayNum);
            }
            map.set(ad.ad_id, { activeDays: ad.activeDays, assignedRow });
        });

        return map;
    }, [processedAds]);

    const summarySpend = processedAds.reduce((s, a) => s + (a.totalSpend || 0), 0);
    const summaryImpressions = processedAds.reduce((s, a) => s + (a.totalImpressions || 0), 0);
    const deliveringCount = processedAds.filter(a => a.isDelivering).length;

    const isToday = (day) => {
        const today = new Date();
        return day && day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    };

    const fmt = (num) => Number(num).toLocaleString('th-TH', { maximumFractionDigits: 0 });
    const fmtDec = (num) => Number(num).toLocaleString('th-TH', { maximumFractionDigits: 2 });
    const monthName = viewDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    const COLORS = [
        'bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
        'bg-blue-500', 'bg-purple-500', 'bg-cyan-500', 'bg-orange-500',
        'bg-teal-500', 'bg-pink-500', 'bg-lime-500', 'bg-violet-500'
    ];

    const DELIVERING_PULSE = 'ring-2 ring-emerald-400 ring-offset-1 ring-offset-[#0c1a2f]';

    return (
        <div className="bg-[#0c1a2f]/50 border border-white/10 rounded-[2rem] p-8 animate-fade-in relative z-10 w-full overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-xl font-black text-white tracking-tight">Campaign Calendar</h3>
                    <p className="text-xs font-bold text-white/40 uppercase tracking-widest mt-1">
                        Individual Ad Delivery • Source: ad_daily_metrics
                    </p>
                </div>
                <div className="flex items-center gap-4 bg-white/5 p-1.5 rounded-2xl border border-white/10">
                    <button onClick={prevMonth} disabled={loading} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 text-white/40 hover:text-indigo-400 transition-all font-black disabled:opacity-50">
                        <ChevronLeft size={14} />
                    </button>
                    <div className="w-40 text-center text-lg font-black text-white">{monthName}</div>
                    <button onClick={nextMonth} disabled={loading} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 text-white/40 hover:text-indigo-400 transition-all font-black disabled:opacity-50">
                        <ChevronRight size={14} />
                    </button>
                </div>
            </div>

            {/* KPI Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-emerald-500/10 border border-emerald-500/30 p-5 rounded-[1.5rem] relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><Antenna size={48} className="text-emerald-400" /></div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1">Delivering Now</p>
                    <div className="flex items-end gap-2">
                        <p className="text-3xl font-black text-emerald-400">{loading ? '...' : deliveringCount}</p>
                        {!loading && deliveringCount > 0 && (
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mb-2"></div>
                        )}
                    </div>
                    <span className="text-[9px] text-emerald-400/50 font-bold">ACTIVE + Spend ≤ Yesterday</span>
                </div>

                <div className="bg-indigo-500/10 border border-indigo-500/30 p-5 rounded-[1.5rem] relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><Megaphone size={48} className="text-indigo-400" /></div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-1">Ads with Spend</p>
                    <p className="text-3xl font-black text-white">{loading ? '...' : processedAds.length}</p>
                    <span className="text-[9px] text-white/40 font-bold">Unique ads in {viewDate.toLocaleString('default', { month: 'short' })}</span>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/30 p-5 rounded-[1.5rem] relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><Eye size={48} className="text-amber-400" /></div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-1">Impressions</p>
                    <p className="text-3xl font-black text-white">{loading ? '...' : fmt(summaryImpressions)}</p>
                    <span className="text-[9px] text-white/40 font-bold">Total views this month</span>
                </div>

                <div className="bg-rose-500/10 border border-rose-500/30 p-5 rounded-[1.5rem] relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><Flame size={48} className="text-rose-400" /></div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-rose-400 mb-1">Actual Spend</p>
                    <p className="text-3xl font-black text-white">฿{loading ? '...' : fmt(summarySpend)}</p>
                    <span className="text-[9px] text-white/40 font-bold">Facebook billing data</span>
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-6 mb-4 px-1">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-3 bg-emerald-500 rounded-sm ring-2 ring-emerald-400 ring-offset-1 ring-offset-[#0c1a2f]"></div>
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Delivering</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-3 bg-indigo-500 rounded-sm"></div>
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Completed / Paused</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-3 bg-indigo-500/20 rounded-sm border border-dashed border-indigo-400/50"></div>
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">No Spend Day (gap)</span>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="border border-white/10 rounded-2xl overflow-hidden relative min-h-[400px]">
                {loading && (
                    <div className="absolute inset-0 bg-[#0c1a2f]/80 backdrop-blur-sm z-50 flex items-center justify-center">
                        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}

                {/* Day Headers */}
                <div className="grid grid-cols-7 border-b border-white/10 bg-white/5">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                        <div key={d} className="p-3 text-center text-[10px] font-black uppercase tracking-widest text-white/40">{d}</div>
                    ))}
                </div>

                {/* Calendar Body */}
                <div className="grid grid-cols-7">
                    {calendarCells.map((cell, idx) => {
                        const slots = Array(20).fill(null);
                        let hiddenCount = 0;

                        if (cell.day) {
                            processedAds.forEach(ad => {
                                const info = adSegmentsMap.get(ad.ad_id);
                                if (info?.activeDays.has(cell.day)) {
                                    if (info.assignedRow !== -1 && info.assignedRow < 20) {
                                        slots[info.assignedRow] = ad;
                                    } else {
                                        hiddenCount++;
                                    }
                                }
                            });
                        }

                        const maxUsedSlot = slots.reduce((max, s, i) => s ? i : max, -1);

                        return (
                            <div key={idx} className={`min-h-[100px] border-b border-r border-white/5 py-1.5 flex flex-col relative overflow-hidden ${cell.day ? 'bg-transparent' : 'bg-white/[0.02]'}`}>
                                {cell.day && (
                                    <>
                                        <div className="w-full flex justify-center mb-0.5">
                                            <div className={`text-[10px] font-black inline-flex justify-center items-center w-6 h-6 rounded-full ${isToday(cell.day) ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/40' : 'text-white/30'}`}>
                                                {cell.day}
                                            </div>
                                        </div>

                                        <div className="flex-1 flex flex-col pt-0.5" style={{ gap: '1px' }}>
                                            {slots.slice(0, Math.max(maxUsedSlot + 1, 0)).map((ad, sIdx) => {
                                                if (!ad) return <div key={`empty-${sIdx}`} className="h-[16px]"></div>;

                                                const info = adSegmentsMap.get(ad.ad_id);
                                                const isStart = !info?.activeDays.has(cell.day - 1);
                                                const isEnd = !info?.activeDays.has(cell.day + 1);

                                                const hash = (ad.ad_id || ad.name || '').split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
                                                const colorClass = ad.isDelivering ? 'bg-emerald-500' : COLORS[hash % COLORS.length];

                                                let roundClass = '';
                                                if (isStart && isEnd) roundClass = 'mx-0.5 rounded-md';
                                                else if (isStart) roundClass = 'ml-0.5 rounded-l-md';
                                                else if (isEnd) roundClass = 'mr-0.5 rounded-r-md';

                                                const ringClass = ad.isDelivering ? DELIVERING_PULSE : '';

                                                return (
                                                    <div
                                                        key={ad.ad_id}
                                                        title={`${ad.name}\nStatus: ${ad.status}${ad.deliveryStatus ? ` (${ad.deliveryStatus})` : ''}${ad.isDelivering ? ' (DELIVERING)' : ''}\nSpend: ฿${fmtDec(ad.totalSpend)}\nImpressions: ${fmt(ad.totalImpressions)}\nClicks: ${fmt(ad.totalClicks)}\nActive ${ad.daysActive} day(s)`}
                                                        className={`h-[16px] relative flex items-center px-1 text-[8px] font-bold text-white shadow-sm cursor-help transition-all hover:brightness-110 ${colorClass} ${roundClass} ${ringClass}`}
                                                        style={{ zIndex: 10 - sIdx }}
                                                    >
                                                        {isStart && (
                                                            <span className="truncate w-full drop-shadow-sm leading-none">{ad.name}</span>
                                                        )}
                                                        {isEnd && !isStart && (
                                                            <span className="text-[7px] text-white/70 ml-auto whitespace-nowrap">฿{fmt(ad.totalSpend)}</span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                            {hiddenCount > 0 && (
                                                <div className="text-[8px] font-black text-white/30 w-full text-right pr-1 mt-0.5">
                                                    +{hiddenCount} more
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Ad Summary Table */}
            {!loading && processedAds.length > 0 && (
                <div className="mt-8 border border-white/10 rounded-2xl overflow-hidden">
                    <div className="bg-white/5 px-6 py-4 border-b border-white/10">
                        <h4 className="text-sm font-black text-white/70 uppercase tracking-widest flex items-center gap-2">
                            <List className="text-indigo-400" size={14} />
                            Ad Delivery Summary • {viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </h4>
                    </div>
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white/5 text-[9px] font-black text-white/40 uppercase tracking-widest">
                                <th className="p-3 pl-6"></th>
                                <th className="p-3">Ad Name</th>
                                <th className="p-3 text-center">Status</th>
                                <th className="p-3 text-center">Days Active</th>
                                <th className="p-3 text-right">Spend</th>
                                <th className="p-3 text-right">Impressions</th>
                                <th className="p-3 text-right pr-6">Clicks</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-xs font-bold text-white/80">
                            {processedAds.map((ad) => {
                                const hash = (ad.ad_id || '').split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
                                const dotColor = ad.isDelivering ? 'bg-emerald-500 animate-pulse' : COLORS[hash % COLORS.length];
                                return (
                                    <tr key={ad.ad_id} className="hover:bg-white/5 transition-colors">
                                        <td className="p-3 pl-6">
                                            <div className={`w-3 h-3 rounded-full ${dotColor}`}></div>
                                        </td>
                                        <td className="p-3 max-w-[250px]">
                                            <p className="truncate font-black text-white">{ad.name}</p>
                                            <p className="text-[9px] text-white/40 font-bold">
                                                {ad.firstDayNum}–{ad.lastDayNum} {viewDate.toLocaleString('default', { month: 'short' })}
                                            </p>
                                        </td>
                                        <td className="p-3 text-center">
                                            {ad.isDelivering ? (
                                                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full text-[9px] font-black uppercase tracking-wider inline-flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                                                    {ad.deliveryStatus || 'Delivering'}
                                                </span>
                                            ) : (
                                                <div className="flex flex-col items-center gap-0.5">
                                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${ad.status === 'ACTIVE' ? 'bg-blue-500/20 text-blue-400' : 'bg-white/10 text-white/40'}`}>
                                                        {ad.status}
                                                    </span>
                                                    {ad.deliveryStatus && ad.deliveryStatus !== ad.status && (
                                                        <span className="text-[7px] font-black text-white/30 uppercase tracking-tighter">
                                                            {ad.deliveryStatus}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-3 text-center text-white/50">{ad.daysActive}d</td>
                                        <td className="p-3 text-right font-black text-white">฿{fmtDec(ad.totalSpend)}</td>
                                        <td className="p-3 text-right text-white/60">{fmt(ad.totalImpressions)}</td>
                                        <td className="p-3 text-right pr-6 text-white/50">{fmt(ad.totalClicks)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot className="bg-white/5 border-t-2 border-white/10">
                            <tr className="text-xs font-black">
                                <td className="p-3 pl-6"></td>
                                <td className="p-3 text-white uppercase tracking-widest">Total</td>
                                <td className="p-3"></td>
                                <td className="p-3"></td>
                                <td className="p-3 text-right text-white">฿{fmtDec(summarySpend)}</td>
                                <td className="p-3 text-right text-white/60">{fmt(summaryImpressions)}</td>
                                <td className="p-3 text-right pr-6 text-white/50">{fmt(processedAds.reduce((s, a) => s + (a.totalClicks || 0), 0))}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </div>
    );
}
