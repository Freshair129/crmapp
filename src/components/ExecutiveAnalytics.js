'use client';

import React from 'react';

export default function ExecutiveAnalytics({ language = 'TH' }) {
    const labels = {
        EN: { title: 'Executive Analytics', daily: 'Daily Revenue', weekly: 'Weekly Sales', target: 'Monthly Goal' },
        TH: { title: 'ระบบวิเคราะห์บริหารงาน', daily: 'ยอดขายวันนี้', weekly: 'ยอดขายรายสัปดาห์', target: 'เป้าหมายรายเดือน' }
    }[language];

    const stats = [
        { label: labels.daily, value: '฿12,450', change: '+12.5%', isUp: true, icon: <i className="fas fa-dollar-sign"></i>, color: 'text-emerald-500' },
        { label: labels.weekly, value: '฿84,200', change: '+5.2%', isUp: true, icon: <i className="fas fa-trending-up"></i>, color: 'text-blue-500' },
        { label: 'Active Sessions', value: '142', change: '-2.1%', isUp: false, icon: <i className="fas fa-users"></i>, color: 'text-rose-500' },
        { label: 'Average Ticket', value: '฿590', change: '+8.4%', isUp: true, icon: <i className="fas fa-crosshairs"></i>, color: 'text-[#C9A34E]' },
    ];

    return (
        <div className="p-8 max-w-7xl mx-auto animate-fade-in space-y-8">
            {/* Header */}
            <div className="mb-10">
                <h1 className="text-4xl font-black text-[#F8F8F6] tracking-tight italic uppercase">{labels.title}</h1>
                <p className="text-[#C9A34E] text-[10px] font-black uppercase tracking-[0.3em] mt-2">Real-time Business Intelligence Engine</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <div key={i} className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] hover:bg-white/10 transition-all group shadow-2xl">
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-12 h-12 bg-[#0A1A2F] rounded-2xl flex items-center justify-center text-[#C9A34E] shadow-xl ring-1 ring-white/10">
                                {stat.icon}
                            </div>
                            <div className={`flex items-center gap-1 text-[10px] font-black ${stat.isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {stat.isUp ? <i className="fas fa-arrow-up"></i> : <i className="fas fa-arrow-down"></i>}
                                {stat.change}
                            </div>
                        </div>
                        <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">{stat.label}</p>
                        <p className="text-3xl font-black text-[#F8F8F6] italic tracking-tight">{stat.value}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Chart Placeholder */}
                <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-[3rem] p-10 relative overflow-hidden shadow-3xl">
                    <div className="flex items-center justify-between mb-10">
                        <h3 className="text-xl font-black text-[#F8F8F6] uppercase tracking-tight italic">{labels.weekly}</h3>
                        <div className="flex gap-2">
                            <span className="w-3 h-3 rounded-full bg-[#C9A34E]"></span>
                            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                        </div>
                    </div>
                    {/* Visual placeholder for graph */}
                    <div className="h-64 flex items-end gap-3 pb-4 px-2">
                        {[40, 70, 45, 90, 65, 80, 55].map((h, i) => (
                            <div key={i} className="flex-1 bg-gradient-to-t from-[#C9A34E]/20 to-[#C9A34E] rounded-t-xl group relative cursor-pointer hover:brightness-125 transition-all" style={{ height: `${h}%` }}>
                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white text-[#0A1A2F] px-2 py-1 rounded text-[10px] font-black opacity-0 group-hover:opacity-100 transition-opacity shadow-xl">฿{h * 120}</div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between mt-4 px-2 text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">
                        <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                    </div>
                </div>

                {/* Goal Wheel Placeholder */}
                <div className="bg-[#C9A34E] rounded-[3rem] p-10 text-[#0A1A2F] shadow-3xl flex flex-col items-center justify-center text-center relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                    <div className="relative z-10 w-full">
                        <h3 className="text-2xl font-black italic tracking-tighter uppercase mb-2 leading-none">{labels.target}</h3>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-60 mb-10">Revenue Milestone</p>

                        <div className="relative w-48 h-48 mx-auto mb-10">
                            <svg className="w-full h-full rotate-[-90deg]">
                                <circle cx="96" cy="96" r="88" fill="transparent" stroke="#000" strokeWidth="16" className="opacity-10" />
                                <circle cx="96" cy="96" r="88" fill="transparent" stroke="#0A1A2F" strokeWidth="16" strokeDasharray="552.92" strokeDashoffset="138" strokeLinecap="round" className="drop-shadow-xl" />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-4xl font-black italic">75%</span>
                                <span className="text-[10px] font-black uppercase tracking-widest mt-1 opacity-60">Complete</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <p className="text-sm font-black italic leading-none">฿750,000 / ฿1,000,000</p>
                            <div className="w-full h-1 bg-black/10 rounded-full overflow-hidden">
                                <div className="h-full bg-[#0A1A2F] w-3/4"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
