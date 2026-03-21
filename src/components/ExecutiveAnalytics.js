'use client';

import React, { useState, useEffect } from 'react';
import { 
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, 
    CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { TrendingUp, Facebook, Store, Receipt, Tag, MessageCircle, ArrowUp, ArrowDown, Zap } from 'lucide-react';
import { useSession } from 'next-auth/react';
import AdsOptimizePanel from './AdsOptimizePanel';
import { can } from '@/lib/permissionMatrix';

export default function ExecutiveAnalytics({ language = 'TH' }) {
    const { data: session } = useSession();
    const [data, setData] = useState(null);
    const [historyData, setHistoryData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [timeframe, setTimeframe] = useState('this_week');
    const [historyDays, setHistoryDays] = useState(30);
    const [campaigns, setCampaigns] = useState([]);
    const [campaignsLoading, setCampaignsLoading] = useState(false);
    const [selectedCampaign, setSelectedCampaign] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const labels = {
        EN: { title: 'Executive Analytics', daily: 'Total Revenue', weekly: 'Orders Count', target: 'Conversion Rate', loading: 'Loading...' },
        TH: { title: 'ระบบวิเคราะห์บริหารงาน', daily: 'ยอดขายรวม', weekly: 'จำนวนออเดอร์', target: 'อัตราการเปลี่ยนเป็นยอดขาย', loading: 'กำลังโหลด...' }
    }[language];

    // Fetch primary stats
    useEffect(() => {
        setLoading(true);
        fetch(`/api/analytics/executive?timeframe=${timeframe}`)
            .then(r => r.json())
            .then(d => {
                if (d && typeof d.totalRevenue === 'number') setData(d);
            })
            .catch(err => console.error('[ExecutiveAnalytics] Fetch failed:', err))
            .finally(() => setLoading(false));
    }, [timeframe]);

    // Fetch historical data for charts
    useEffect(() => {
        setHistoryLoading(true);
        fetch(`/api/analytics/executive/history?days=${historyDays}`)
            .then(r => r.json())
            .then(d => setHistoryData(d))
            .catch(err => console.error('[ExecutiveAnalytics] History fetch failed:', err))
            .finally(() => setHistoryLoading(false));
    }, [historyDays]);

    // Fetch campaigns for optimize panel
    useEffect(() => {
        if (!session?.user?.role || !can(session.user.role, 'marketing', 'view')) return;
        
        setCampaignsLoading(true);
        fetch('/api/ads/campaigns')
            .then(r => r.json())
            .then(d => setCampaigns(Array.isArray(d) ? d : d.campaigns || []))
            .catch(err => console.error('[ExecutiveAnalytics] Campaigns fetch failed:', err))
            .finally(() => setCampaignsLoading(false));
    }, [session?.user?.role, refreshKey]);

    const fmtChange = (val) => {
        if (val === null || val === undefined) return { text: 'N/A', isUp: true, hasData: false };
        return { text: (val >= 0 ? '+' : '') + val + '%', isUp: val >= 0, hasData: true };
    };

    const stats = [
        { label: labels.daily, value: data?.totalRevenue !== undefined ? '฿' + Math.round(data.totalRevenue).toLocaleString() : '-', ...fmtChange(data?.revenueChange), icon: <TrendingUp size={16} />, color: 'text-[#C9A34E]' },
        { label: 'Ads Revenue', value: data?.revenueAds !== undefined ? '฿' + Math.round(data.revenueAds).toLocaleString() : '-', ...fmtChange(data?.revenueAdsChange), icon: <Facebook size={16} />, color: 'text-blue-500' },
        { label: 'Store Revenue', value: data?.revenueStore !== undefined ? '฿' + Math.round(data.revenueStore).toLocaleString() : '-', ...fmtChange(data?.revenueStoreChange), icon: <Store size={16} />, color: 'text-emerald-500' },
        { label: labels.weekly, value: data?.ordersCount !== undefined ? data.ordersCount.toLocaleString() + ' Orders' : '-', text: '', hasData: false, isUp: true, icon: <Receipt size={16} />, color: 'text-indigo-500' },
        { label: 'Avg. Ticket', value: data?.avgTicket !== undefined ? '฿' + Math.round(data.avgTicket).toLocaleString() : '-', text: '', hasData: false, isUp: true, icon: <Tag size={16} />, color: 'text-purple-400' },
        { label: 'Active Convs.', value: data?.activeSessions !== undefined ? data.activeSessions.toLocaleString() + ' Convs' : '-', text: '', hasData: false, isUp: true, icon: <MessageCircle size={16} />, color: 'text-sky-400' },
    ];

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-[#0D2040] border border-white/10 p-3 rounded-xl shadow-2xl">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">{label}</p>
                    {payload.map((entry, index) => (
                        <div key={index} className="flex items-center justify-between gap-4 mb-1 last:mb-0">
                            <span className="text-[10px] font-bold text-white uppercase">{entry.name}:</span>
                            <span className="text-xs font-black" style={{ color: entry.color }}>
                                {entry.name.includes('Revenue') ? '฿' + entry.value.toLocaleString() : entry.value + ' ออเดอร์'}
                            </span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

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
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                <div>
                    <h1 className="text-4xl font-black text-[#F8F8F6] tracking-tight italic uppercase">{labels.title}</h1>
                    <p className="text-[#C9A34E] text-[10px] font-black uppercase tracking-[0.3em] mt-2">Real-time Business Intelligence Engine</p>
                </div>
                <div className="flex bg-white/5 border border-white/10 p-1 rounded-2xl">
                    {[['today', 'Today'], ['this_week', 'Week'], ['this_month', 'Month']].map(([key, label]) => (
                        <button key={key} onClick={() => setTimeframe(key)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${timeframe === key ? 'bg-[#C9A34E] text-[#0A1A2F] shadow-lg' : 'text-white/40 hover:text-white'}`}>{label}</button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {stats.map((stat, i) => (
                    <div key={i} className="bg-white/5 border border-white/10 p-6 rounded-[2rem] hover:bg-white/10 transition-all group shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-white/5 group-hover:bg-[#C9A34E]/20 transition-all"></div>
                        <div className="flex justify-between items-start mb-4">
                            <div className={`w-10 h-10 bg-[#0A1A2F] rounded-xl flex items-center justify-center ${stat.color} shadow-xl ring-1 ring-white/10`}>{stat.icon}</div>
                            {stat.hasData && (
                                <div className={`flex items-center gap-1 text-[10px] font-black ${stat.isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {stat.isUp ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                                    {stat.text}
                                </div>
                            )}
                        </div>
                        <p className="text-white/40 text-[9px] font-black uppercase tracking-widest mb-1 truncate">{stat.label}</p>
                        <p className="text-2xl font-black text-[#F8F8F6] italic tracking-tight truncate">{stat.value}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* CHART 1: RevenueAreaChart */}
                <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-[3rem] p-8 shadow-3xl">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-black text-[#F8F8F6] uppercase tracking-tight italic">Revenue Trends</h3>
                            <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-1">Growth Comparison (Ads vs Store)</p>
                        </div>
                        <div className="flex bg-white/5 p-1 rounded-xl">
                            {[7, 30, 90].map(d => (
                                <button key={d} onClick={() => setHistoryDays(d)} className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${historyDays === d ? 'bg-red-500 text-white' : 'text-white/40 hover:text-white'}`}>{d} วัน</button>
                            ))}
                        </div>
                    </div>
                    <div className="h-[220px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={historyData?.revenueHistory || []}>
                                <defs>
                                    <linearGradient id="colorAds" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorStore" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#C9A34E" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#C9A34E" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="dateLabel" axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: 900}} />
                                <YAxis hide />
                                <Tooltip content={<CustomTooltip />} cursor={{stroke: 'rgba(255,255,255,0.1)'}} />
                                <Area name="Ads Revenue" type="monotone" dataKey="adsRevenue" stroke="#ef4444" fillOpacity={1} fill="url(#colorAds)" strokeWidth={3} />
                                <Area name="Store Revenue" type="monotone" dataKey="storeRevenue" stroke="#C9A34E" fillOpacity={1} fill="url(#colorStore)" strokeWidth={3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    {/* CHART 2: OrderVolumeBarChart */}
                    <div className="mt-8 pt-8 border-t border-white/5">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Daily Order Volume</h4>
                        </div>
                        <div className="h-[160px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={historyData?.dailyOrders || []}>
                                    <XAxis dataKey="dateLabel" hide />
                                    <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                                    <Bar name="Ads Count" dataKey="adsCount" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                    <Bar name="Store Count" dataKey="storeCount" fill="#C9A34E" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Conversion Gauge */}
                <div className="bg-[#C9A34E] rounded-[3rem] p-10 text-[#0A1A2F] shadow-3xl flex flex-col items-center justify-center text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                    <div className="relative z-10 w-full">
                        <h3 className="text-2xl font-black italic tracking-tighter uppercase mb-2 leading-none">{labels.target}</h3>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-60 mb-10">Sales Efficiency</p>
                        <div className="relative w-48 h-48 mx-auto mb-10">
                            <svg className="w-full h-full rotate-[-90deg]">
                                <circle cx="96" cy="96" r="88" fill="transparent" stroke="#000" strokeWidth="16" className="opacity-10" />
                                <circle cx="96" cy="96" r="88" fill="transparent" stroke="#0A1A2F" strokeWidth="16" strokeDasharray="552.92" strokeDashoffset={552.92 - (552.92 * (data?.conversionRate || 0) / 100)} strokeLinecap="round" className="drop-shadow-xl transition-all duration-1000" />
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

            {/* Campaigns Section (MARKETING only) */}
            {session?.user?.role && can(session.user.role, 'marketing', 'view') && (
                <div className="mt-12 space-y-6">
                    <div>
                        <h2 className="text-2xl font-black text-[#F8F8F6] tracking-tight italic uppercase">Active Campaigns</h2>
                        <p className="text-[#C9A34E] text-[10px] font-black uppercase tracking-[0.3em] mt-2">Manage & Optimize</p>
                    </div>

                    {campaignsLoading ? (
                        <div className="p-8 flex items-center justify-center">
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-10 h-10 border-4 border-[#C9A34E]/20 border-t-[#C9A34E] rounded-full animate-spin"></div>
                                <p className="text-[#C9A34E] font-black text-xs uppercase tracking-widest animate-pulse">Loading campaigns...</p>
                            </div>
                        </div>
                    ) : campaigns.length === 0 ? (
                        <div className="p-8 bg-white/5 border border-white/10 rounded-2xl text-center">
                            <p className="text-white/40 font-bold text-sm">No campaigns found</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto bg-white/5 border border-white/10 rounded-2xl">
                            <table className="w-full text-sm">
                                <thead className="border-b border-white/10 bg-white/5">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-white/60 uppercase tracking-widest">Campaign</th>
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-white/60 uppercase tracking-widest">Status</th>
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-white/60 uppercase tracking-widest">Budget</th>
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-white/60 uppercase tracking-widest">Spend</th>
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-white/60 uppercase tracking-widest">ROAS</th>
                                        <th className="px-6 py-4 text-center text-[10px] font-black text-white/60 uppercase tracking-widest">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/10">
                                    {campaigns.map((campaign) => (
                                        <tr key={campaign.id} className="hover:bg-white/5 transition-all">
                                            <td className="px-6 py-4">
                                                <p className="font-bold text-white">{campaign.name}</p>
                                                <p className="text-[10px] text-white/40 mt-1">ID: {campaign.id}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${campaign.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-yellow-500'}`}></div>
                                                    <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">
                                                        {campaign.status === 'ACTIVE' ? 'ACTIVE' : 'PAUSED'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="font-bold text-[#C9A34E]">฿{campaign.dailyBudget?.toLocaleString() || '—'}</p>
                                                <p className="text-[10px] text-white/40">/day</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="font-bold text-white">฿{campaign.spend?.toLocaleString() || '—'}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="font-bold text-emerald-400">{campaign.roas?.toFixed(2) || '—'}</p>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {can(session.user.role, 'marketing', 'edit') && (
                                                    <button
                                                        onClick={() => setSelectedCampaign(campaign)}
                                                        className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl bg-[#C9A34E]/10 border border-[#C9A34E]/30 text-[#C9A34E] text-[10px] font-black uppercase tracking-widest hover:bg-[#C9A34E]/20 transition-all"
                                                    >
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
            )}

            {/* Optimize Panel Modal */}
            {selectedCampaign && (
                <AdsOptimizePanel
                    campaign={selectedCampaign}
                    onClose={() => setSelectedCampaign(null)}
                    onSuccess={() => {
                        setSelectedCampaign(null);
                        setRefreshKey(prev => prev + 1);
                    }}
                    currentUserRole={session?.user?.role}
                />
            )}
        </div>
    );
}
