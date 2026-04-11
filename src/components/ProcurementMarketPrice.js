'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, ExternalLink, Link, Activity, RefreshCw } from 'lucide-react';

export default function MarketPricePanel({ language = 'TH' }) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [scraping, setScraping] = useState(false);

    const labels = {
        EN: { title: 'Procurement Market Prices', item: 'Ingredient', cost: 'Our Cost', market: 'Market Price', trend: 'Trend vs Cost', source: 'Source', fetch: 'Force Sync' },
        TH: { title: 'ราคากลางจัดซื้อ', item: 'วัตถุดิบ', cost: 'ต้นทุนเรา', market: 'ราคากลาง', trend: 'ส่วนต่าง', source: 'แหล่งข้อมูล', fetch: 'อัปเดตราคา' }
    }[language];

    const fetchPrices = () => {
        setLoading(true);
        fetch('/api/market-prices')
            .then(res => res.json())
            .then(resData => {
                setData(Array.isArray(resData) ? resData : []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    };

    const handleScraping = async () => {
        setScraping(true);
        try {
            await fetch('/api/workers/scrape-market-prices', { method: 'POST' });
            setTimeout(fetchPrices, 2000); // refresh after 2s
        } catch (e) {
            console.error(e);
        } finally {
            setScraping(false);
        }
    };

    useEffect(() => {
        fetchPrices();
    }, []);

    if (loading) {
        return <div className="p-8 text-center text-slate-400 font-black animate-pulse uppercase tracking-[0.2em]">{language==='TH'? 'กำลังโหลดข้อมูล...':'Loading Data...'}</div>;
    }

    return (
        <div className="p-8 max-w-7xl mx-auto animate-fade-in bg-white border border-slate-100 rounded-[3rem] shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div>
                    <h1 className="text-4xl font-black text-[#0c1a2f] italic uppercase tracking-tight flex items-center gap-3">
                        <Activity className="text-blue-500" size={32} />
                        {labels.title}
                    </h1>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Daily Live Pricing Tracker</p>
                </div>
                
                <button 
                  onClick={handleScraping}
                  disabled={scraping}
                  className="bg-[#0c1a2f] text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all flex items-center gap-3 shadow-xl disabled:opacity-50"
                >
                    <RefreshCw size={16} className={scraping ? 'animate-spin' : ''} />
                    {labels.fetch}
                </button>
            </div>

            <div className="bg-slate-50 rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-inner">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-200/60 bg-white">
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">{labels.item}</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">{labels.source}</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{labels.cost}</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{labels.market}</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{labels.trend}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {data.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="text-center py-12 text-slate-400 text-sm font-bold">
                                        No market prices bound. Add Makro/Lotus URLs to Ingredients.
                                    </td>
                                </tr>
                            ) : data.map(ing => {
                                const isCheaper = ing.priceDiffToCost < 0;
                                const isExpensive = ing.priceDiffToCost > 0;
                                return (
                                <tr key={ing.id} className="hover:bg-slate-50 transition-all group">
                                    <td className="px-8 py-6">
                                        <div className="font-bold text-[#0c1a2f] text-sm flex items-center gap-2">
                                            {ing.name}
                                            {ing.marketUrl && (
                                                <a href={ing.marketUrl} target="_blank" rel="noreferrer" className="text-slate-300 hover:text-blue-500 transition-colors">
                                                    <ExternalLink size={14} />
                                                </a>
                                            )}
                                        </div>
                                        <div className="text-[10px] font-black text-slate-400 tracking-widest uppercase mt-1 opacity-70">
                                            {ing.category} / {ing.unit}
                                        </div>
                                    </td>
                                    
                                    <td className="px-8 py-6">
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${ing.source === 'Makro' ? 'bg-red-50 text-red-600 border border-red-100' : ing.source === 'Lotus' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-slate-100 text-slate-500'}`}>
                                            {ing.source}
                                        </span>
                                    </td>

                                    <td className="px-8 py-6 text-right">
                                        <span className="font-bold text-slate-500 text-sm">
                                            {ing.internalCost > 0 ? `฿${ing.internalCost.toFixed(2)}` : '-'}
                                        </span>
                                    </td>

                                    <td className="px-8 py-6 text-right">
                                        <span className="font-black text-[#0c1a2f] text-xl italic tracking-tight">
                                            {ing.currentMarketPrice > 0 ? `฿${ing.currentMarketPrice.toFixed(2)}` : 'Wait'}
                                        </span>
                                    </td>

                                    <td className="px-8 py-6 text-right">
                                        {ing.internalCost > 0 && ing.currentMarketPrice > 0 ? (
                                            <div className="flex flex-col items-end gap-1">
                                                <div className={`flex items-center gap-1 font-black text-xs ${isCheaper ? 'text-green-500' : isExpensive ? 'text-red-500' : 'text-slate-400'}`}>
                                                    {isCheaper ? <TrendingDown size={14} /> : isExpensive ? <TrendingUp size={14} /> : null}
                                                    {isCheaper ? '-' : isExpensive ? '+' : ''}฿{Math.abs(ing.priceDiffToCost).toFixed(2)}
                                                </div>
                                                <div className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${isCheaper ? 'bg-green-50 text-green-600' : isExpensive ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                                                    {isCheaper ? '' : '+'}{ing.priceDiffPercent.toFixed(1)}%
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-slate-300 text-xs font-bold">-</span>
                                        )}
                                    </td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
