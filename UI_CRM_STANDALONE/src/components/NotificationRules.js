
'use client';

import React from 'react';

export default function NotificationRules({ language = 'TH' }) {
    const labels = {
        EN: { title: 'Notification Rules', desc: 'Automated Marketing Alerts & Triggers', add: 'New Rule', group: 'Target Group' },
        TH: { title: 'กฎการแจ้งเตือน', desc: 'ระบบจัดการแจ้งเตือนการตลาดอัตโนมัติ', add: 'เพิ่มกฎใหม่', group: 'กลุ่มเป้าหมาย' }
    }[language];

    const rules = [
        { title: 'Ad Spend Threshold', trigger: 'Spending > ฿5,000 / Day', target: 'Management Group', active: true },
        { title: 'Daily ROI Summary', trigger: 'Every Day at 09:00 AM', target: 'Marketing Team', active: true },
        { title: 'New Customer Lead', trigger: 'Contact from Facebook Message', target: 'Sale Agents', active: false },
    ];

    return (
        <div className="p-10 max-w-6xl mx-auto animate-fade-in">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-16">
                <div>
                    <h1 className="text-4xl font-black text-[#F8F8F6] tracking-tight italic uppercase">{labels.title}</h1>
                    <p className="text-[#C9A34E] text-[10px] font-black uppercase tracking-[0.3em] mt-1">{labels.desc}</p>
                </div>
                <button className="bg-[#C9A34E] text-[#0A1A2F] px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:scale-105 transition-all flex items-center gap-3">
                    <i className="fas fa-plus"></i>
                    {labels.add}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {rules.map((rule, i) => (
                    <div key={i} className={`bg-white/5 border border-white/10 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden transition-all hover:bg-white/10 ${!rule.active ? 'opacity-50 grayscale' : ''}`}>
                        <div className="flex justify-between items-start mb-10">
                            <div className="w-12 h-12 bg-[#0A1A2F] rounded-2xl flex items-center justify-center text-[#C9A34E] shadow-xl border border-white/10">
                                <i className="fas fa-bell"></i>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`w-3 h-3 rounded-full ${rule.active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`}></span>
                                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{rule.active ? 'Active' : 'Disabled'}</span>
                            </div>
                        </div>

                        <h3 className="text-xl font-black text-white italic tracking-tight uppercase mb-4">{rule.title}</h3>

                        <div className="space-y-4 mb-8">
                            <div>
                                <p className="text-[10px] font-black text-[#C9A34E] uppercase tracking-widest mb-1">Trigger Condition</p>
                                <p className="text-sm font-bold text-white/60">{rule.trigger}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-[#C9A34E] uppercase tracking-widest mb-1">Notification Path</p>
                                <div className="flex items-center gap-2 text-[#06C755] font-black text-xs">
                                    <i className="fab fa-line"></i>
                                    {rule.target}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button className="flex-1 py-3 bg-white/5 border border-white/5 rounded-xl text-white/40 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest">Edit</button>
                            <button className="w-12 h-12 bg-white/5 border border-white/5 rounded-xl text-white/40 hover:text-red-500 transition-all flex items-center justify-center">
                                <i className="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </div>
                ))}

                {/* New Rule Card */}
                <div className="border-4 border-dashed border-white/5 rounded-[2.5rem] flex flex-col items-center justify-center p-10 group cursor-pointer hover:border-[#C9A34E]/30 transition-all gap-4">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center text-white/20 group-hover:bg-[#C9A34E]/10 group-hover:text-[#C9A34E] transition-all text-2xl">
                        <i className="fas fa-plus"></i>
                    </div>
                    <p className="font-black text-[10px] uppercase tracking-[0.3em] text-white/20 group-hover:text-white transition-all">Define Automation</p>
                </div>
            </div>
        </div>
    );
}
