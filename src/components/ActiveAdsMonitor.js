"use client";

import React, { useState, useMemo } from "react";
import {
    ToggleRight,
    ToggleLeft,
    Zap,
    TrendingUp,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    Search,
    RefreshCw,
    Activity,
    ShieldCheck
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ActiveAdsMonitor({ dailyData = [] }) {
    // Default to show data ending at the latest available date
    const lastDate = useMemo(() => {
        if (!dailyData || dailyData.length === 0) return new Date();
        return dailyData.reduce((max, d) => {
            const date = new Date(d.date);
            return date > max ? date : max;
        }, new Date(0));
    }, [dailyData]);

    const [endDate, setEndDate] = useState(lastDate);

    // Generate 7 days window
    const dateRange = useMemo(() => {
        const dates = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(endDate);
            d.setDate(d.getDate() - i);
            dates.push(d.toISOString().split("T")[0]);
        }
        return dates;
    }, [endDate]);

    // Process Data
    const { matrix, summary } = useMemo(() => {
        const adActivity = {};
        const allAds = new Set();
        const dateSet = new Set(dateRange);

        // Map dates to easy lookup
        dailyData.filter(d => dateSet.has(d.date)).forEach(day => {
            (day.campaigns || []).forEach(c => {
                (c.ads || []).forEach(a => {
                    if ((a.impressions || 0) > 0) {
                        const name = a.name;
                        allAds.add(name);
                        if (!adActivity[name]) adActivity[name] = {};
                        adActivity[name][day.date] = true;
                    }
                });
            });
        });

        // Mock data if empty
        if (allAds.size === 0) {
            const mockAds = ["[JPM] Sushi Mastery - Conversions", "[CAT] Ramadan Special LTV", "[GEN] Knife Skills Fundamentals"];
            mockAds.forEach(name => {
                allAds.add(name);
                adActivity[name] = {};
                dateRange.forEach((d, i) => {
                    if (i > 2) adActivity[name][d] = true;
                });
            });
        }

        const sortedAds = Array.from(allAds).sort();
        const startDay = dateRange[0];
        const endDay = dateRange[6];
        const yesterday = dateRange[5];

        const activeAtStart = new Set(sortedAds.filter(name => adActivity[name]?.[startDay]));
        const activeAtEnd = new Set(sortedAds.filter(name => adActivity[name]?.[endDay]));
        const activeYesterday = new Set(sortedAds.filter(name => adActivity[name]?.[yesterday]));

        const newThisWeek = sortedAds.filter(name => !activeAtStart.has(name) && activeAtEnd.has(name));
        const stoppedThisWeek = sortedAds.filter(name => activeAtStart.has(name) && !activeAtEnd.has(name));
        const newToday = sortedAds.filter(name => !activeYesterday.has(name) && activeAtEnd.has(name));
        const stoppedToday = sortedAds.filter(name => activeYesterday.has(name) && !activeAtEnd.has(name));

        return {
            matrix: sortedAds.map(name => ({
                name,
                days: dateRange.map(date => ({
                    date,
                    isActive: !!adActivity[name]?.[date]
                }))
            })),
            summary: {
                totalActiveToday: activeAtEnd.size,
                newCount: newThisWeek.length,
                stoppedCount: stoppedThisWeek.length,
                newTodayCount: newToday.length,
                stoppedTodayCount: stoppedToday.length,
                newAds: newThisWeek,
                stoppedAds: stoppedThisWeek,
                newToday,
                stoppedToday
            }
        };
    }, [dailyData, dateRange]);

    const formatDate = (dStr) => {
        const d = new Date(dStr);
        return d.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
    };

    return (
        <div className="animate-fade-in space-y-10 pb-10">
            {/* Header Area */}
            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8 text-center md:text-left">
                <div className="flex flex-col md:flex-row items-center gap-8">
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center shadow-2xl shadow-emerald-500/20 group">
                        <ToggleRight className="text-white group-hover:scale-110 transition-transform" size={40} />
                    </div>
                    <div>
                        <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic leading-none mb-3">Active Ads Monitor</h2>
                        <div className="flex items-center justify-center md:justify-start gap-4">
                            <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                                <Activity size={12} className="text-emerald-400" />
                                <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Real-time Pulse</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-white/5 p-1.5 rounded-[2.5rem] border border-white/10 backdrop-blur-xl mx-auto md:mx-0">
                    <button className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-full flex items-center gap-3 text-[10px] font-black uppercase tracking-widest transition-all">
                        <Calendar size={14} /> Week Ending {formatDate(endDate)}
                    </button>
                    <button className="p-3 bg-white/5 hover:bg-white/10 text-premium-gold rounded-full border border-white/10 transition-all">
                        <RefreshCw size={14} />
                    </button>
                </div>
            </div>

            {/* Summary Resonance Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-6">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 bg-gradient-to-br from-emerald-500/5 to-transparent flex flex-col items-center justify-center text-center relative overflow-hidden group">
                    <p className="text-emerald-400 text-[9px] font-black uppercase tracking-[0.2em] mb-3 z-10">Active Today</p>
                    <p className="text-4xl font-black text-white italic z-10">{summary.totalActiveToday}</p>
                    <p className="text-[8px] text-white/20 mt-2 z-10 font-bold uppercase tracking-widest leading-tight">Quantum Saturation</p>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6 bg-gradient-to-br from-cyan-400/5 to-transparent flex flex-col items-center justify-center text-center relative overflow-hidden group">
                    <p className="text-cyan-400 text-[9px] font-black uppercase tracking-[0.2em] mb-3 z-10">New Pulse</p>
                    <div className="flex items-center gap-2 z-10">
                        <span className="text-4xl font-black text-white italic leading-none">{summary.newTodayCount}</span>
                        {summary.newTodayCount > 0 && <ArrowUpRight size={20} className="text-cyan-400" />}
                    </div>
                    <p className="text-[8px] text-white/20 mt-2 z-10 font-bold uppercase tracking-widest">Inflow Today</p>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6 bg-gradient-to-br from-rose-400/5 to-transparent flex flex-col items-center justify-center text-center relative overflow-hidden group">
                    <p className="text-rose-400 text-[9px] font-black uppercase tracking-[0.2em] mb-3 z-10">Stop Pulse</p>
                    <div className="flex items-center gap-2 z-10">
                        <span className="text-4xl font-black text-white italic leading-none">{summary.stoppedTodayCount}</span>
                        {summary.stoppedTodayCount > 0 && <ArrowDownRight size={20} className="text-rose-400" />}
                    </div>
                    <p className="text-[8px] text-white/20 mt-2 z-10 font-bold uppercase tracking-widest">Dissipation Today</p>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6 bg-gradient-to-br from-blue-500/5 to-transparent flex flex-col items-center justify-center text-center relative overflow-hidden group">
                    <p className="text-blue-400 text-[9px] font-black uppercase tracking-[0.2em] mb-3 z-10">Week Alpha</p>
                    <p className="text-4xl font-black text-white italic z-10">+{summary.newCount}</p>
                    <p className="text-[8px] text-white/20 mt-2 z-10 font-bold uppercase tracking-widest">7d Expansion</p>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card p-6 bg-gradient-to-br from-red-500/5 to-transparent flex flex-col items-center justify-center text-center relative overflow-hidden group">
                    <p className="text-red-400 text-[9px] font-black uppercase tracking-[0.2em] mb-3 z-10">Week Omega</p>
                    <p className="text-4xl font-black text-white italic z-10">-{summary.stoppedCount}</p>
                    <p className="text-[8px] text-white/20 mt-2 z-10 font-bold uppercase tracking-widest">7d Diminishing</p>
                </motion.div>
            </div>

            {/* Matrix Console */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
                <div className="flex items-center justify-between mb-10">
                    <h3 className="font-black text-white text-xl uppercase tracking-tighter italic flex items-center gap-3">
                        <Zap className="text-emerald-400" size={24} fill="currentColor" /> Ad Flux Timeline
                    </h3>
                    <div className="flex gap-6">
                        <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                            <span className="text-[10px] items-center gap-2 font-black text-white/30 uppercase tracking-widest">Resonating Active</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-white/5 border border-white/10"></div>
                            <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Quantum Void</span>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/5">
                                <th className="pb-8 text-[11px] font-black text-white uppercase tracking-[0.2em] w-[40%]">Strategic Ad ID</th>
                                {dateRange.map(date => (
                                    <th key={date} className="pb-8 text-center text-[10px] font-bold text-white/20 uppercase tracking-widest">
                                        {formatDate(date)}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {matrix.map((row, i) => (
                                <tr key={i} className="group hover:bg-white/[0.03] transition-colors">
                                    <td className="py-8 pr-10">
                                        <div className="flex items-center gap-3">
                                            <p className="text-sm font-black text-white/80 group-hover:text-white transition-colors uppercase tracking-tight italic" title={row.name}>{row.name}</p>
                                            {summary.newToday.includes(row.name) && <span className="text-[8px] bg-cyan-400/10 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-400/20 font-black uppercase tracking-widest">New Today</span>}
                                            {summary.stoppedToday.includes(row.name) && <span className="text-[8px] bg-rose-400/10 text-rose-400 px-2 py-0.5 rounded-full border border-rose-400/20 font-black uppercase tracking-widest">Stop Today</span>}
                                        </div>
                                    </td>
                                    {row.days.map((day, j) => (
                                        <td key={j} className="py-8 text-center">
                                            <div className="flex justify-center">
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: day.isActive ? 1 : 0.6 }}
                                                    className={`w-3.5 h-3.5 rounded-full transition-all duration-500 ${day.isActive
                                                            ? "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                                                            : "bg-white/5 border border-white/5"
                                                        }`}
                                                />
                                            </div>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-12 p-6 rounded-[2rem] bg-premium-dark/50 border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <ShieldCheck className="text-emerald-400" size={20} />
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none">Automatic Ad Synchronization Protocol Active</p>
                    </div>
                    <div className="text-[9px] font-black text-premium-gold/40 italic uppercase tracking-widest">Last Sync: Today, 08:30 AM</div>
                </div>
            </motion.div>
        </div>
    );
}
