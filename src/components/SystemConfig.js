'use client';

import React from 'react';
import { Settings, Globe, Bell, ShieldCheck, Info } from 'lucide-react';

export default function SystemConfig({ language = 'TH', setLanguage }) {
    const labels = {
        EN: { title: 'System Configuration', lang: 'Display Language', notify: 'Notification Pulse', security: 'Access Protocol' },
        TH: { title: 'การตั้งค่าระบบศูนย์กลาง', lang: 'ภาษาที่แสดงผล', notify: 'ระบบแจ้งเตือนหลัก', security: 'มาตรการความปลอดภัย' }
    }[language];

    return (
        <div className="p-10 max-w-4xl mx-auto animate-fade-in space-y-12">
            <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-[#cc9d37] text-[#0c1a2f] rounded-[1.5rem] flex items-center justify-center text-3xl shadow-2xl rotate-[-6deg]">
                    <Settings size={32} />
                </div>
                <div>
                    <h1 className="text-4xl font-black text-[#F8F8F6] tracking-tight italic uppercase">{labels.title}</h1>
                    <p className="text-[#cc9d37] text-[10px] font-black uppercase tracking-[0.3em] mt-1">Global System Parameters</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {/* Language Selection */}
                <div className="bg-white/5 border border-white/10 p-10 rounded-[2.5rem] shadow-2xl group hover:bg-white/10 transition-all">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-[#0c1a2f] rounded-2xl flex items-center justify-center text-[#cc9d37] shadow-xl border border-white/10">
                                <Globe size={24} />
                            </div>
                            <div>
                                <h3 className="font-black text-[#F8F8F6] text-lg uppercase tracking-tight">{labels.lang}</h3>
                                <p className="text-white/20 text-[10px] font-black uppercase tracking-widest mt-1">Multi-regional Interface Toggle</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4 p-2 bg-black/30 rounded-3xl border border-white/5">
                        <button
                            onClick={() => setLanguage('EN')}
                            className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${language === 'EN' ? 'bg-[#F8F8F6] text-[#0c1a2f] shadow-xl' : 'text-white/40 hover:text-white'}`}
                        >
                            <span className="text-xl">🇺🇸</span> English (US)
                        </button>
                        <button
                            onClick={() => setLanguage('TH')}
                            className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${language === 'TH' ? 'bg-[#F8F8F6] text-[#0c1a2f] shadow-xl' : 'text-white/40 hover:text-white'}`}
                        >
                            <span className="text-xl">🇹🇭</span> ภาษาไทย
                        </button>
                    </div>
                </div>

                {/* Notifications Toggle */}
                <div className="bg-white/5 border border-white/10 p-10 rounded-[2.5rem] flex items-center justify-between group hover:bg-white/10 transition-all shadow-2xl">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#0c1a2f] rounded-2xl flex items-center justify-center text-[#cc9d37] shadow-xl border border-white/10">
                            <Bell size={24} />
                        </div>
                        <div>
                            <h3 className="font-black text-[#F8F8F6] text-lg uppercase tracking-tight">{labels.notify}</h3>
                            <p className="text-white/20 text-[10px] font-black uppercase tracking-widest mt-1">Real-time Dashboard Alerts</p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked className="sr-only peer" />
                        <div className="w-14 h-8 bg-black/40 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-[#cc9d37] after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-white/10"></div>
                    </label>
                </div>

                {/* Informational Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] flex items-center gap-6 hover:bg-white/10 transition-all cursor-pointer shadow-lg animate-slide-up">
                        <div className="w-12 h-12 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center shadow-inner border border-rose-500/20">
                            <ShieldCheck size={24} />
                        </div>
                        <div>
                            <h4 className="font-black text-white text-md uppercase tracking-tight italic">Audit Security</h4>
                            <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Protocol V-7.4</p>
                        </div>
                    </div>
                    <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] flex items-center gap-6 hover:bg-white/10 transition-all cursor-pointer shadow-lg animate-slide-up">
                        <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center shadow-inner border border-blue-500/20">
                            <Info size={24} />
                        </div>
                        <div>
                            <h4 className="font-black text-white text-md uppercase tracking-tight italic">System Meta</h4>
                            <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Build v5.0.2</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
