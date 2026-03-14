'use client';

import React, { useState, useEffect } from 'react';

export default function ExecutiveAnalytics({ language = 'TH' }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [timeframe, setTimeframe] = useState('this_week');

    const labels = {
        EN: { title: 'Executive Analytics', daily: 'Total Revenue', weekly: 'Orders Count', target: 'Conversion Rate', loading: 'Loading...' },
        TH: { title: 'ระบบวิเคราะห์บริหารงาน', daily: 'ยอดขายรวม', weekly: 'จำนวนออเดอร์', target: 'อัตราการเปลี่ยนเป็นยอดขาย', loading: 'กำลังโหลด...' }
    }[language];

    useEffect(() => {
        setLoading(true);
        console.log(`[ExecutiveAnalytics] Fetching data for ${timeframe}...`);
        
        fetch(`/api/analytics/executive?timeframe=${timeframe}`)
            .then(async (r) => {
                if (!r.ok) {
                    const text = await r.text();
                    console.error(`[ExecutiveAnalytics] API Error: ${r.status}`, text);
                    throw new Error(`API returned ${r.status}`);
                }
                return r.json();
            })
            .then(d => {
                console.log('[ExecutiveAnalytics] Data received:', d);
                // Guard: check for expected fields
                if (d && typeof d.totalRevenue === 'number') {
                    setData(d);
                } else {
                    console.warn('[ExecutiveAnalytics] Malformed data:', d);
                    setData(null);
                }
            })
            .catch(err => {
                console.error('[ExecutiveAnalytics] Fetch failed:', err);
                setData(null);
            })
            .finally(() => setLoading(false));
    }, [timeframe]);

    // helper: แปลง % change (number | null) → display string + direction
    const fmtChange = (val) => {
        if (val === null || val === undefined) return { text: 'N/A', isUp: true, hasData: false };
        return { text: (val >= 0 ? '+' : '') + val + '%', isUp: val >= 0, hasData: true };
    };

    const stats = [
        {
            label: labels.daily,
            value: data?.totalRevenue !== undefined ? '฿' + Math.round(data.totalRevenue).toLocaleString() : '-',
            ...fmtChange(data?.revenueChange),
            icon: <i className="fas fa-chart-line"></i>,
            color: 'text-[#C9A34E]'
        },
        {
            label: 'Ads Revenue',
            value: data?.revenueAds !== undefined ? '฿' + Math.round(data.revenueAds).toLocaleString() : '-',
            ...fmtChange(data?.revenueAdsChange),
            icon: <i className="fab fa-facebook"></i>,
            color: 'text-blue-500'
        },
        {
            label: 'Store Revenue',
            value: data?.revenueStore !== undefined ? '฿' + Math.round(data.revenueStore).toLocaleString() : '-',
            ...fmtChange(data?.revenueStoreChange),
            icon: <i className="fas fa-store"></i>,
            color: 'text-emerald-500'
        },
        {
            label: labels.weekly,
            value: data?.ordersCount !== undefined ? data.ordersCount.toLocaleString() + ' Orders' : '-',
            text: '', hasData: false, isUp: true,
            icon: <i className="fas fa-receipt"></i>,
            color: 'text-indigo-500'
        },
        {
            label: 'Avg. Ticket',
            value: data?.avgTicket !== undefined ? '฿' + Math.round(data.avgTicket).toLocaleString() : '-',
            text: '', hasData: false, isUp: true,
            icon: <i className="fas fa-tag"></i>,
            color: 'text-purple-400'
        },
        {
            label: 'Active Convs.',
            value: data?.activeSessions !== undefined ? data.activeSessions.toLocaleString() + ' Convs' : '-',
            text: '', hasData: false, isUp: true,
            icon: <i className="fas fa-comments"></i>,
            color: 'text-sky-400'
        },
    ];

    if (loading && !data) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-[#C9A34E]/20 border-t-[#C9A34E] rounded-full animate-spin"></div>
                    <p className="text-[#C9A34E] font-black text-xs uppercase tracking-widest animate-pulse">{labels.loading}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto animate-fade-in space-y-8 p-4 md:p-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                <div>
                    <h1 className="text-4xl font-black text-[#F8F8F6] tracking-tight italic uppercase">{labels.title}</h1>
                    <p className="text-[#C9A34E] text-[10px] font-black uppercase tracking-[0.3em] mt-2">Real-time Business Intelligence Engine</p>
                </div>
                
                {/* Timeframe Selector */}
                <div className="flex bg-white/5 border border-white/10 p-1 rounded-2xl">
                    {[['today', 'Today'], ['this_week', 'Week'], ['this_month', 'Month']].map(([key, label]) => (
                        <button
                            key={key}
                            onClick={() => setTimeframe(key)}
                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                timeframe === key
                                ? 'bg-[#C9A34E] text-[#0A1A2F] shadow-lg'
                                : 'text-white/40 hover:text-white'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {stats.map((stat, i) => (
                    <div key={i} className="bg-white/5 border border-white/10 p-6 rounded-[2rem] hover:bg-white/10 transition-all group shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-white/5 group-hover:bg-[#C9A34E]/20 transition-all"></div>
                        <div className="flex justify-between items-start mb-4">
                            <div className={`w-10 h-10 bg-[#0A1A2F] rounded-xl flex items-center justify-center ${stat.color} shadow-xl ring-1 ring-white/10`}>
                                {stat.icon}
                            </div>
                            {stat.hasData ? (
                                <div className={`flex items-center gap-1 text-[10px] font-black ${stat.isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    <i className={`fas fa-arrow-${stat.isUp ? 'up' : 'down'}`}></i>
                                    {stat.text}
                                </div>
                            ) : stat.text === '' ? null : (
                                <span className="text-[10px] font-black text-white/20">N/A</span>
                            )}
                        </div>
                        <p className="text-white/40 text-[9px] font-black uppercase tracking-widest mb-1 truncate">{stat.label}</p>
                        <p className="text-2xl font-black text-[#F8F8F6] italic tracking-tight truncate">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Main Chart Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-[3rem] p-10 relative overflow-hidden shadow-3xl">
                    <div className="flex items-center justify-between mb-10">
                        <h3 className="text-xl font-black text-[#F8F8F6] uppercase tracking-tight italic">Performance Trends</h3>
                        <div className="flex gap-4 items-center">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-[#C9A34E]"></span>
                                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Total Revenue</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Performance Graph */}
                    <div className="h-64 flex items-end gap-2 pb-4 px-2">
                        {data?.trends && data.trends.length > 0 ? (
                            data.trends.map((item, i) => {
                                const maxVal = Math.max(...data.trends.map(t => t.revenue), 1);
                                const height = (item.revenue / maxVal) * 100;
                                const dateObj = new Date(item.date);
                                const label = timeframe === 'this_month' 
                                    ? dateObj.getDate() 
                                    : dateObj.toLocaleDateString('en-US', { weekday: 'short' });

                                return (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer h-full justify-end">
                                        <div className="w-full bg-gradient-to-t from-[#C9A34E]/5 to-[#C9A34E]/40 rounded-t-xl relative hover:from-[#C9A34E]/20 hover:to-[#C9A34E] transition-all" 
                                             style={{ height: `${height}%` }}>
                                            {/* Tooltip */}
                                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[#F8F8F6] text-[#0A1A2F] px-2 py-1 rounded text-[10px] font-black opacity-0 group-hover:opacity-100 transition-opacity shadow-xl whitespace-nowrap z-50">
                                                ฿{Math.round(item.revenue).toLocaleString()}
                                            </div>
                                            {/* Always visible label on top of bar for significant bars */}
                                            {height > 15 && (
                                                <div className="absolute top-2 left-0 w-full text-center text-[8px] font-black text-[#0A1A2F] opacity-0 group-hover:opacity-100 transition-opacity">
                                                    ฿{Math.round(item.revenue/1000)}k
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-[9px] font-black text-white/20 uppercase tracking-widest leading-none mt-2">
                                            {label}
                                        </span>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-white/10 italic text-sm">
                                <i className="fas fa-chart-bar mr-2"></i> No trend data available for this period
                            </div>
                        )}
                    </div>
                </div>

                {/* Conversion Gauge */}
                <div className="bg-[#C9A34E] rounded-[3rem] p-10 text-[#0A1A2F] shadow-3xl flex flex-col items-center justify-center text-center relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                    <div className="relative z-10 w-full">
                        <h3 className="text-2xl font-black italic tracking-tighter uppercase mb-2 leading-none">{labels.target}</h3>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-60 mb-10">Sales Efficiency</p>

                        <div className="relative w-48 h-48 mx-auto mb-10">
                            <svg className="w-full h-full rotate-[-90deg]">
                                <circle cx="96" cy="96" r="88" fill="transparent" stroke="#000" strokeWidth="16" className="opacity-10" />
                                <circle 
                                    cx="96" 
                                    cy="96" 
                                    r="88" 
                                    fill="transparent" 
                                    stroke="#0A1A2F" 
                                    strokeWidth="16" 
                                    strokeDasharray="552.92" 
                                    strokeDashoffset={552.92 - (552.92 * (data?.conversionRate || 0) / 100)} 
                                    strokeLinecap="round" 
                                    className="drop-shadow-xl transition-all duration-1000" 
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-4xl font-black italic">{data?.conversionRate ? data.conversionRate.toFixed(1) + '%' : '0%'}</span>
                                <span className="text-[10px] font-black uppercase tracking-widest mt-1 opacity-60">Conversion</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <p className="text-sm font-black italic leading-none">{data?.ordersCount || 0} Successes</p>
                            <div className="w-full h-1 bg-black/10 rounded-full overflow-hidden">
                                <div className="h-full bg-[#0A1A2F] transition-all duration-1000" style={{ width: `${Math.min(data?.conversionRate || 0, 100)}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
