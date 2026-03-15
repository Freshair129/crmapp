'use client';

import React, { useState, useEffect } from 'react';
import { 
    AlertTriangle, 
    CheckCircle2, 
    ShieldCheck, 
    Loader2, 
    Zap, 
    List, 
    TrendingUp, 
    Flame, 
    ArrowDownWideNarrow, 
    ArrowDown, 
    ArrowUp, 
    RefreshCw, 
    Megaphone, 
    Coins, 
    DollarSign, 
    EyeOff, 
    Eye, 
    Images, 
    Image, 
    Layers, 
    ChevronUp, 
    ChevronDown, 
    UserCircle, 
    ShoppingCart 
} from 'lucide-react';
import AskAIButton from './AskAIButton';
import CampaignCalendar from './CampaignCalendar';

const fmt = (val, dec = 0) => {
    if (typeof val !== 'number' || isNaN(val)) return '0';
    return val.toLocaleString(undefined, {
        minimumFractionDigits: dec,
        maximumFractionDigits: dec,
    });
};

const getDaysDelta = (dateStr) => {
    if (!dateStr) return 0;
    const start = new Date(dateStr);
    const now = new Date();
    const diff = now - start;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
};

const VerifyMetric = ({ value, base, comparison, type = 'ctr' }) => {
    if (!base || base === 0) return null;

    let calculated = 0;
    if (type === 'ctr') {
        calculated = comparison / base;
    } else if (type === 'cpc') {
        calculated = comparison / base;
    }

    const diff = Math.abs(value - calculated);
    const isVerified = type === 'ctr' ? diff < 0.001 : diff < 0.1;

    if (!isVerified) return (
        <span className="ml-1 text-[8px] text-rose-500 cursor-help" title={`Mismatch! API: ${fmt(value * (type === 'ctr' ? 100 : 1), 2)}${type === 'ctr' ? '%' : ''} vs Calc: ${fmt(calculated * (type === 'ctr' ? 100 : 1), 2)}${type === 'ctr' ? '%' : ''}`}>
            <AlertTriangle size={8} />
        </span>
    );

    return (
        <span className="ml-1 text-[7px] text-emerald-500/40 cursor-help" title="Verified: Math matches raw data">
            <CheckCircle2 size={7} />
        </span>
    );
};

const MetricSource = ({ source, type = 'api' }) => (
    <span className={`ml-1 text-[7px] px-1 rounded font-black uppercase tracking-tighter ${type === 'api' ? 'bg-blue-500/10 text-blue-400/60' : 'bg-purple-500/10 text-purple-400/60'}`} title={`Data Source: ${source}`}>
        {source}
    </span>
);

const DataIntegrityHeader = ({ syncTime, healthScore, onForceSync, isSyncing }) => (
    <div className="flex items-center justify-between mb-8 px-8 py-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
        <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">System Health: Enterprise Grade</span>
            </div>
            <div className="h-4 w-[1px] bg-white/10"></div>
            <div className="flex items-center gap-2">
                <ShieldCheck className="text-emerald-400 w-3 h-3" />
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Reconciliation: Active</span>
            </div>
            <div className="h-4 w-[1px] bg-white/10"></div>
            <button
                onClick={onForceSync}
                disabled={isSyncing}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${isSyncing ? 'bg-white/5 text-white/40 cursor-not-allowed' : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/40 border border-blue-500/30'}`}
            >
                {isSyncing ? (
                    <><Loader2 className="animate-spin w-3 h-3" /> Syncing via Live API...</>
                ) : (
                    <><Zap className="w-3 h-3" /> Force Sync Now</>
                )}
            </button>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-bold text-white/30">
            <span>Last Sync: {syncTime}</span>
            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">Data Confidence: {healthScore}%</span>
        </div>
    </div>
);

export default function CampaignTracking({ customers }) {
    const [campaigns, setCampaigns] = useState([]);
    const [adsets, setAdsets] = useState([]);
    const [ads, setAds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCampaignId, setSelectedCampaignId] = useState('all');
    const [expandedAdset, setExpandedAdset] = useState(null);
    const [sortBy, setSortBy] = useState('revenue'); // revenue, roas, ctr, spend, orders
    const [sortOrder, setSortOrder] = useState('desc');
    const [viewMode, setViewMode] = useState('timeline'); // performance or timeline

    const [statusFilter, setStatusFilter] = useState('DELIVERING'); // DELIVERING, ACTIVE, or '' (all)
    const [dateRange, setDateRange] = useState('last_30d'); // maximum (Lifetime) or last_30d

    const [syncTime, setSyncTime] = useState('Syncing...');
    const [healthScore, setHealthScore] = useState(100);
    const [isSyncing, setIsSyncing] = useState(false);

    // Calculate time ago
    const formatTimeAgo = (isoString) => {
        if (!isoString || new Date(isoString).getTime() === 0) return 'Never';
        const seconds = Math.floor((new Date() - new Date(isoString)) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " years ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " months ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " days ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " hours ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " mins ago";
        return "Just now";
    };

    useEffect(() => {
        loadMarketingData();
    }, [dateRange, statusFilter]);

    async function loadMarketingData() {
        setLoading(true);
        try {
            // Both DELIVERING and ACTIVE use the 'ACTIVE' status filter for the API call to avoid downloading paused ads
            const apiStatusParam = (statusFilter === 'DELIVERING' || statusFilter === 'ACTIVE') ? 'ACTIVE' : '';
            const statusParam = apiStatusParam ? `&status=${apiStatusParam}` : '';

            const [campRes, adsetRes, adsRes] = await Promise.all([
                fetch(`/api/marketing/campaigns?range=${dateRange}${statusParam}`),
                fetch(`/api/marketing/adsets?range=${dateRange}${statusParam}`),
                fetch(`/api/marketing/ads?range=${dateRange}${statusParam}`)
            ]);

            const [campData, adsetData, adsData] = await Promise.all([
                campRes.json(),
                adsetRes.json(),
                adsRes.json()
            ]);

            if (campData.success) {
                const sorted = (campData.data || []).sort((a, b) => {
                    const sA = (a.status || '').toUpperCase();
                    const sB = (b.status || '').toUpperCase();
                    if (sA === 'ACTIVE' && sB !== 'ACTIVE') return -1;
                    if (sA !== 'ACTIVE' && sB === 'ACTIVE') return 1;
                    return 0;
                });
                setCampaigns(sorted);

                if (campData.lastSync) {
                    setSyncTime(formatTimeAgo(campData.lastSync));

                    // Health Score decays if sync is too old (> 6 hours)
                    const hoursOld = (new Date() - new Date(campData.lastSync)) / 3600000;
                    if (hoursOld > 24) setHealthScore(40);
                    else if (hoursOld > 6) setHealthScore(75);
                    else setHealthScore(100);
                } else {
                    setSyncTime('Unknown');
                }
            }
            if (adsetData.success) setAdsets(adsetData.data || []);
            if (adsData.success) {
                setAds(adsData.data || []);
            }
        } catch (e) {
            console.error('Failed to load marketing data', e);
        } finally {
            setLoading(false);
        }
    }

    const handleForceSync = async () => {
        setIsSyncing(true);
        try {
            await fetch('/api/marketing/sync-incremental', { method: 'POST' });
            // Background sync started. Let the user know, then reload data after 5s
            // assuming it takes roughly 4-8 seconds for the python worker to finish via child_process
            setTimeout(() => {
                loadMarketingData();
                setIsSyncing(false);
            }, 6000);
        } catch (err) {
            console.error('Force sync failed:', err);
            setIsSyncing(false);
        }
    };

    const toggleVisibility = async (campaignId, currentStatus) => {
        const newStatus = !currentStatus;
        // Optimistic UI update
        setCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, isVisible: newStatus } : c));
        try {
            await fetch(`/api/marketing/campaigns/${campaignId}/visibility`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isVisible: newStatus })
            });
        } catch (err) {
            console.error('Failed to toggle visibility:', err);
            // Revert on failure
            setCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, isVisible: currentStatus } : c));
        }
    };

    const getCampaignOrders = (campaignId) => {
        // Find customers linked to this campaign
        const linkedCustomers = customers.filter(cust =>
            cust.intelligence?.attribution?.campaign_id === campaignId
        );

        // Extract orders from their timelines
        return linkedCustomers.flatMap(cust =>
            (cust.timeline || [])
                .filter(t => t.type === 'ORDER')
                .map(order => ({
                    ...order,
                    customerName: `${cust.profile?.first_name} ${cust.profile?.last_name}`,
                    agent: cust.profile?.agent || order.details?.agent || 'Unknown'
                }))
        ).sort((a, b) => new Date(b.date) - new Date(a.date));
    };

    // Calculate metrics for all campaigns and sort
    let baseCampaigns = campaigns;
    if (statusFilter === 'DELIVERING') {
        baseCampaigns = campaigns.filter(c => (c.spend || 0) > 0);
    }

    const processedCampaigns = baseCampaigns.map(campaign => {
        const campaignOrders = getCampaignOrders(campaign.id);
        const revenue = campaignOrders.reduce((sum, o) => sum + (o.details?.total || o.details?.amount || 0), 0);
        const spend = campaign.spend || 0;
        const roas = spend > 0 ? (revenue / spend) : 0;
        const ctr = campaign.ctr || 0;
        const orders = campaignOrders.length;
        const profit = revenue - spend;
        const duration = getDaysDelta(campaign.start_time);

        // Gap Analysis: CRM Revenue vs FB Purchase Value
        const fbRevenue = adsets
            .filter(a => a.campaign_id === campaign.id)
            .reduce((sum, adset) => {
                const fbPurchaseValue = adset.action_values?.filter(v => ['purchase', 'omni_purchase', 'offsite_conversion.fb_pixel_purchase'].includes(v.action_type)).map(v => parseFloat(v.value)).reduce((a, b) => Math.max(a, b), 0) || 0;
                return sum + fbPurchaseValue;
            }, 0);

        const revenueGap = revenue > 0 ? ((revenue - fbRevenue) / revenue) * 100 : 0;

        return {
            ...campaign,
            metrics: { revenue, roas, ctr, orders, spend, profit, duration, fbRevenue, revenueGap }
        };
    }).sort((a, b) => {
        // Priority 1: If sorting by Duration, prioritize ACTIVE status first
        if (sortBy === 'duration') {
            const sA = (a.status || '').toUpperCase();
            const sB = (b.status || '').toUpperCase();
            if (sA === 'ACTIVE' && sB !== 'ACTIVE') return -1;
            if (sA !== 'ACTIVE' && sB === 'ACTIVE') return 1;
        }

        // Priority 2: Metric being sorted
        const valA = a.metrics[sortBy];
        const valB = b.metrics[sortBy];

        if (valA !== valB) {
            return sortOrder === 'desc' ? valB - valA : valA - valB;
        }

        // Priority 3: Status (ACTIVE first for other metrics)
        const sA = (a.status || '').toUpperCase();
        const sB = (b.status || '').toUpperCase();
        if (sA === 'ACTIVE' && sB !== 'ACTIVE') return -1;
        if (sA !== 'ACTIVE' && sB === 'ACTIVE') return 1;

        return a.name.localeCompare(b.name);
    });

    const filteredCampaigns = selectedCampaignId === 'all'
        ? processedCampaigns
        : processedCampaigns.filter(c => c.id === selectedCampaignId);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <div className="w-12 h-12 border-4 border-[#C9A34E] border-t-transparent rounded-full animate-spin"></div>
                <p className="text-white/40 font-black text-xs uppercase tracking-widest">Loading Tracking Intelligence...</p>
            </div>
        );
    }

    return (
        <div className="animate-fade-in space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <div className="flex items-center gap-6 mb-2">
                        <h2 className="text-3xl font-black text-[#F8F8F6] tracking-tight">Campaign Tracking</h2>
                        <div className="flex bg-white/5 border border-white/10 p-1 rounded-xl">
                            <button
                                onClick={() => {
                                    setViewMode('timeline');
                                    setDateRange('last_30d'); // Ensure valid fallback date
                                    setStatusFilter('');
                                }}
                                className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'timeline' ? 'bg-[#C9A34E] text-black shadow-lg' : 'text-white/40 hover:text-white'}`}
                            >
                                <List className="mr-2 w-4 h-4" /> Timeline
                            </button>
                            <button
                                onClick={() => setViewMode('performance')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'performance' ? 'bg-[#C9A34E] text-black shadow-lg' : 'text-white/40 hover:text-white'}`}
                            >
                                <TrendingUp className="mr-2 w-4 h-4" /> Performance
                            </button>
                        </div>
                    </div>
                    <p className="text-white/40 text-sm font-bold uppercase tracking-[0.2em]">ROI & SALES ATTRIBUTION</p>
                </div>
                <div className="flex items-center gap-4">
                    {viewMode === 'performance' && (
                        <>
                            <div className="flex bg-white/5 border border-white/10 p-1 rounded-xl">
                                <button
                                    onClick={() => setDateRange('this_month')}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${dateRange === 'this_month' ? 'bg-[#C9A34E] text-black shadow-lg' : 'text-white/40 hover:text-white'}`}
                                >
                                    This Mth
                                </button>
                                <button
                                    onClick={() => setDateRange('last_month')}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${dateRange === 'last_month' ? 'bg-[#C9A34E] text-black shadow-lg' : 'text-white/40 hover:text-white'}`}
                                >
                                    Last Mth
                                </button>
                                <button
                                    onClick={() => setDateRange('last_30d')}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${dateRange === 'last_30d' ? 'bg-[#C9A34E] text-black shadow-lg' : 'text-white/40 hover:text-white'}`}
                                >
                                    30 Days
                                </button>
                            </div>

                            <div className="flex items-center bg-white/5 border border-white/10 p-1 rounded-xl">
                                <button
                                    onClick={() => setStatusFilter('DELIVERING')}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === 'DELIVERING' ? 'bg-emerald-500 text-black shadow-lg' : 'text-white/40 hover:text-white'}`}
                                >
                                    <Flame className="text-[#C9A34E] mr-1 w-3 h-3" /> Delivering
                                </button>
                                <button
                                    onClick={() => setStatusFilter('ACTIVE')}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === 'ACTIVE' ? 'bg-blue-500 text-black shadow-lg' : 'text-white/40 hover:text-white'}`}
                                >
                                    Active
                                </button>
                                <button
                                    onClick={() => setStatusFilter('')}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === '' ? 'bg-white/20 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                                >
                                    All
                                </button>
                            </div>

                            <div className="flex items-center bg-white/5 border border-white/10 rounded-xl px-3 py-1">
                                <ArrowDownWideNarrow className="text-white/20 w-3 h-3 mr-2" />
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="bg-transparent text-white text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer"
                                >
                                    <option value="revenue">Revenue</option>
                                    <option value="profit">Profit/Loss</option>
                                    <option value="duration">Duration</option>
                                    <option value="roas">CRM ROAS</option>
                                    <option value="ctr">CTR</option>
                                    <option value="spend">Spend</option>
                                    <option value="orders">Orders</option>
                                </select>
                                <button
                                    onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                                    className="ml-3 text-white/40 hover:text-[#C9A34E] transition-colors"
                                >
                                    {sortOrder === 'desc' ? <ArrowDown size={10} /> : <ArrowUp size={10} />}
                                </button>
                            </div>

                            <select
                                value={selectedCampaignId}
                                onChange={(e) => setSelectedCampaignId(e.target.value)}
                                className="bg-white/5 border border-white/10 text-white text-xs font-bold px-4 py-2 rounded-xl outline-none focus:border-[#C9A34E] transition-colors"
                            >
                                <option value="all">View All Campaigns</option>
                                {campaigns.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                            <button
                                onClick={loadMarketingData}
                                className="p-2 w-10 h-10 bg-white/5 border border-white/10 rounded-xl text-white/60 hover:text-white transition-colors"
                            >
                                <RefreshCw className="w-3 h-3" />
                            </button>
                        </>
                    )}
                </div>
            </div>

            <DataIntegrityHeader
                syncTime={syncTime}
                healthScore={healthScore}
                onForceSync={handleForceSync}
                isSyncing={isSyncing}
            />

            {viewMode === 'timeline' ? (
                <CampaignCalendar />
            ) : (
                <>
                    {/* Summary KPI Stats */}
                    {(() => {
                        // Only calculate KPIs for visible campaigns
                        const visibleCampaigns = processedCampaigns.filter(c => c.isVisible !== false);
                        const activeCampaigns = visibleCampaigns.filter(c => (c.status || '').toUpperCase() === 'ACTIVE').length;
                        const totalSpend = visibleCampaigns.reduce((sum, c) => sum + (c.spend || 0), 0);
                        const totalBudget = visibleCampaigns.reduce((sum, c) => sum + (c.daily_budget || c.lifetime_budget || 0), 0);
                        const totalRevenue = visibleCampaigns.reduce((sum, c) => sum + (c.metrics?.revenue || 0), 0);
                        const overallRoas = totalSpend > 0 ? (totalRevenue / totalSpend) : 0;
                        const burnRate = totalBudget > 0 ? ((totalSpend / totalBudget) * 100) : 0;

                        return (
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                                <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                                    <div className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1 flex items-center gap-1">
                                        <Megaphone className="text-indigo-400 w-3 h-3" /> Active Campaigns
                                    </div>
                                    <p className="text-2xl font-black text-white">{activeCampaigns}</p>
                                    <span className="text-[10px] text-white/30 font-bold">of {processedCampaigns.length} total</span>
                                </div>
                                <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                                    <div className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1 flex items-center gap-1">
                                        <Coins className="text-amber-400 w-3 h-3" /> Total Spend
                                    </div>
                                    <p className="text-2xl font-black text-white">฿{fmt(totalSpend)}</p>
                                    <span className="text-[10px] text-white/30 font-bold">Budget: ฿{fmt(totalBudget)}</span>
                                </div>
                                <div className="bg-white/5 border border-white/10 p-5 rounded-2xl relative overflow-hidden">
                                    <div className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1 flex items-center gap-1">
                                        <Flame className="text-orange-400 w-3 h-3" /> Burn Rate
                                    </div>
                                    <p className="text-2xl font-black text-white">{burnRate.toFixed(1)}%</p>
                                    <div className="w-full bg-white/5 h-1 mt-2 rounded-full overflow-hidden">
                                        <div style={{ width: `${Math.min(burnRate, 100)}%` }} className="h-full bg-orange-500 rounded-full"></div>
                                    </div>
                                </div>
                                <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                                    <div className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1 flex items-center gap-1">
                                        <DollarSign className="text-[#C9A34E] w-3 h-3" /> Revenue Generated
                                    </div>
                                    <p className="text-2xl font-black text-white">฿{fmt(totalRevenue)}</p>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${overallRoas >= 1 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                        {fmt(overallRoas, 2)}x ROAS
                                    </span>
                                </div>
                            </div>
                        );
                    })()}

                    {filteredCampaigns.map(campaign => {
                        const campaignAdsets = adsets.filter(a => a.campaign_id === campaign.id);
                        const campaignOrders = getCampaignOrders(campaign.id);
                        const totalRevenue = campaign.metrics.revenue;
                        const roas = campaign.metrics.roas;

                        return (
                            <div key={campaign.id} className="bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden">
                                {/* Campaign Header */}
                                <div className={`p-8 bg-white/5 border-b border-white/10 transition-opacity duration-300 ${campaign.isVisible === false ? 'opacity-40 grayscale' : 'opacity-100'}`}>
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <div className="flex items-center gap-3 mb-2">
                                                <button
                                                    onClick={() => toggleVisibility(campaign.id, campaign.isVisible !== false)}
                                                    className={`w-6 h-6 flex items-center justify-center rounded-full transition-colors ${campaign.isVisible === false ? 'bg-white/10 text-white/40 hover:text-white' : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/4
