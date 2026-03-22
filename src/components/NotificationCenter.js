'use client';

import React, { useState } from 'react';
import { Plus, Settings, RotateCw, Zap, MessageSquare, Bell, Trash2 } from 'lucide-react';

export default function NotificationCenter({ language = 'TH' }) {
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState(null);
    const [config, setConfig] = useState({ mode: 'manual', interval: 15, lastSyncAt: null });
    const [loadingConfig, setLoadingConfig] = useState(true);

    const labels = {
        EN: { 
            title: 'Notification Center', 
            desc: 'Unified Marketing & Content Alerts', 
            add: 'New Rule', 
            sync: 'Content Sheets Sync',
            syncDesc: 'Sync content from Google Sheets to LINE now',
            syncing: 'Syncing...',
            syncDone: 'Sync Completed',
            mode: 'Sync Mode',
            auto: 'Auto',
            manual: 'Manual',
            interval: 'Interval',
            lastSync: 'Last Sync'
        },
        TH: { 
            title: 'ศูนย์การแจ้งเตือน', 
            desc: 'ระบบจัดการแจ้งเตือนการตลาดและคอนเทนต์', 
            add: 'เพิ่มกฎใหม่',
            sync: 'ซิงค์งาน Google Sheets',
            syncDesc: 'กดเพื่อส่งแจ้งเตือนงาน Content เข้าไลน์กลุ่มทันที',
            syncing: 'กำลังซิงค์...',
            syncDone: 'ซิงค์สำเร็จแล้ว',
            mode: 'โหมดการซิงค์',
            auto: 'อัตโนมัติ',
            manual: 'แมนนวล',
            interval: 'ความถี่',
            lastSync: 'ซิงค์ล่าสุด'
        }
    }[language];

    React.useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await fetch('/api/marketing/sheets/config');
                const data = await res.json();
                setConfig(data);
            } catch (err) {
                console.error('Failed to fetch sync config:', err);
            } finally {
                setLoadingConfig(false);
            }
        };
        fetchConfig();
    }, []);

    const updateConfig = async (newConfig) => {
        try {
            const res = await fetch('/api/marketing/sheets/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newConfig)
            });
            const data = await res.json();
            setConfig(data);
        } catch (err) {
            console.error('Failed to update sync config:', err);
        }
    };

    const handleManualSync = async () => {
        setIsSyncing(true);
        setSyncResult(null);
        try {
            const res = await fetch('/api/marketing/sheets/sync', { method: 'POST' });
            const data = await res.json();
            setSyncResult(data.success ? 'success' : 'error');
            
            // Re-fetch config to get updated lastSyncAt
            const configRes = await fetch('/api/marketing/sheets/config');
            const newConfig = await configRes.json();
            setConfig(newConfig);

            setTimeout(() => setSyncResult(null), 3000);
        } catch (err) {
            setSyncResult('error');
        } finally {
            setIsSyncing(false);
        }
    };

    const rules = [
        { title: 'Ad Spend Threshold', trigger: 'Spending > ฿5,000 / Day', target: 'Management Group', active: true },
        { title: 'Daily ROI Summary', trigger: 'Every Day at 09:00 AM', target: 'Marketing Team', active: true },
        // { title: 'Trello Content Feed', trigger: 'Every 10 mins (Polling)', target: 'Content Group', active: true },
    ];

    return (
        <div className="p-10 max-w-6xl mx-auto animate-fade-in">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-16">
                <div>
                    <h1 className="text-4xl font-black text-[#f5f8fb] tracking-tight italic uppercase">{labels.title}</h1>
                    <p className="text-[#cc9d37] text-[10px] font-black uppercase tracking-[0.3em] mt-1">{labels.desc}</p>
                </div>
                <button className="bg-white/5 border border-white/10 text-white/40 px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-white/10 transition-all flex items-center gap-3">
                    <Plus size={16} />
                    {labels.add}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-white">
                {/* Sync Mode Toggle & Interval Card */}
                <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col">
                    <div className="flex justify-between items-start mb-10">
                        <div className="w-12 h-12 bg-[#0c1a2f] rounded-2xl flex items-center justify-center text-[#cc9d37] shadow-xl border border-white/10">
                            <Settings size={20} />
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => updateConfig({ mode: 'manual' })}
                                className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${config.mode === 'manual' ? 'bg-[#cc9d37] text-[#0c1a2f] border-transparent' : 'border-white/10 text-white/40'}`}
                            >
                                {labels.manual}
                            </button>
                            <button 
                                onClick={() => updateConfig({ mode: 'auto' })}
                                className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${config.mode === 'auto' ? 'bg-[#06C755] text-white border-transparent shadow-[0_0_10px_rgba(6,199,85,0.3)]' : 'border-white/10 text-white/40'}`}
                            >
                                {labels.auto}
                            </button>
                        </div>
                    </div>

                    <h3 className="text-xl font-black text-white italic tracking-tight uppercase mb-4">{labels.mode}</h3>
                    
                    <div className="space-y-6 mt-2">
                        <div>
                            <p className="text-[10px] font-black text-[#cc9d37] uppercase tracking-widest mb-2">{labels.interval}</p>
                            <select 
                                value={config.interval}
                                onChange={(e) => updateConfig({ interval: e.target.value })}
                                disabled={config.mode === 'manual'}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-[#cc9d37] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                <option value="15">15 Minutes</option>
                                <option value="30">30 Minutes</option>
                                <option value="60">1 Hour</option>
                                <option value="360">6 Hours</option>
                                <option value="1440">Daily</option>
                            </select>
                        </div>

                        <div>
                            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">{labels.lastSync}</p>
                            <p className="text-xs font-bold text-[#cc9d37]">
                                {config.lastSyncAt ? new Date(config.lastSyncAt).toLocaleString(language === 'TH' ? 'th-TH' : 'en-US') : 'Never'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Manual Trigger Card */}
                <div 
                    onClick={!isSyncing ? handleManualSync : null}
                    className={`bg-gradient-to-br from-[#0c1a2f] to-[#19273a] border-2 ${syncResult === 'success' ? 'border-emerald-500/50' : 'border-[#cc9d37]/20'} p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden transition-all hover:scale-[102%] cursor-pointer group`}
                >
                    <div className="flex justify-between items-start mb-10">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl border ${isSyncing ? 'bg-amber-500 text-white animate-spin' : 'bg-[#cc9d37] text-[#0c1a2f] border-white/10'}`}>
                            {isSyncing ? <RotateCw size={20} /> : <Zap size={20} />}
                        </div>
                        {syncResult === 'success' && (
                            <span className="bg-emerald-500/20 text-emerald-400 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-emerald-500/30">
                                {labels.syncDone}
                            </span>
                        )}
                    </div>

                    <h3 className="text-xl font-black text-white italic tracking-tight uppercase mb-4">{labels.sync}</h3>
                    <p className="text-white/40 text-xs font-bold leading-relaxed mb-8">{labels.syncDesc}</p>

                    <div className="flex items-center gap-3 mt-auto">
                        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            {isSyncing && <div className="h-full bg-[#cc9d37] animate-shimmer" style={{ width: '60%' }}></div>}
                        </div>
                        <span className="text-[10px] font-black uppercase text-[#cc9d37] tracking-tighter">
                            {isSyncing ? labels.syncing : 'Push Trigger'}
                        </span>
                    </div>
                    
                    {/* Background Icon Watermark */}
                    <div className="absolute -bottom-6 -right-6 text-white/5 text-8xl transform -rotate-12 pointer-events-none group-hover:scale-110 transition-transform">
                        <MessageSquare size={96} />
                    </div>
                </div>

                {rules.map((rule, i) => (
                    <div key={i} className={`bg-white/5 border border-white/10 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden transition-all hover:bg-white/10 ${!rule.active ? 'opacity-50 grayscale' : ''}`}>
                        <div className="flex justify-between items-start mb-10">
                            <div className="w-12 h-12 bg-[#0c1a2f] rounded-2xl flex items-center justify-center text-[#cc9d37] shadow-xl border border-white/10">
                                <Bell size={20} />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`w-3 h-3 rounded-full ${rule.active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`}></span>
                                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{rule.active ? 'Active' : 'Disabled'}</span>
                            </div>
                        </div>

                        <h3 className="text-xl font-black text-white italic tracking-tight uppercase mb-4">{rule.title}</h3>

                        <div className="space-y-4 mb-8">
                            <div>
                                <p className="text-[10px] font-black text-[#cc9d37] uppercase tracking-widest mb-1">Trigger Condition</p>
                                <p className="text-sm font-bold text-white/60">{rule.trigger}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-[#cc9d37] uppercase tracking-widest mb-1">Notification Path</p>
                                <div className="flex items-center gap-2 text-[#06C755] font-black text-xs">
                                    <MessageSquare size={14} />
                                    {rule.target}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button className="flex-1 py-3 bg-white/5 border border-white/5 rounded-xl text-white/40 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest">Edit</button>
                            <button className="w-12 h-12 bg-white/5 border border-white/5 rounded-xl text-white/40 hover:text-red-500 transition-all flex items-center justify-center">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}

                {/* Automation Add Card (Minimized) */}
                <div className="border-4 border-dashed border-white/5 rounded-[2.5rem] flex flex-col items-center justify-center p-10 group cursor-pointer hover:border-[#cc9d37]/30 transition-all gap-4">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center text-white/20 group-hover:bg-[#cc9d37]/10 group-hover:text-[#cc9d37] transition-all text-2xl">
                        <Plus size={32} />
                    </div>
                    <p className="font-black text-[10px] uppercase tracking-[0.3em] text-white/20 group-hover:text-white transition-all">Define Automation</p>
                </div>
            </div>
        </div>
    );
}
