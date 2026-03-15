'use client';

import React from 'react';
import { MessageCircle, Link, User, Fingerprint, ShieldCheck, Check } from 'lucide-react';

export default function LineConnect({ language = 'TH' }) {
    const labels = {
        EN: { title: 'LINE Connect', desc: 'Secure Integration for Customer Outreach', connect: 'Connect LINE OA', status: 'Identity Mapped' },
        TH: { title: 'ระบบเชื่อมต่อ LINE', desc: 'การจัดการช่องทางสื่อสารลูกค้าผ่าน LINE OA', connect: 'เชื่อมต่อ LINE OA', status: 'แสดงตัวตนสำเร็จ' }
    }[language];

    const mockChats = [
        { name: 'K. Somchai', msg: 'สนใจคอร์สอาหารญี่ปุ่นครับ', time: '10:30', unread: true },
        { name: 'K. Malinee', msg: 'สอบถามเรื่องราคาราคานักเรียนค่ะ', time: 'Yesterday', unread: false },
        { name: 'Marketing Group', msg: 'New Ad Report ready', time: '09:15', unread: false },
    ];

    return (
        <div className="p-10 max-w-6xl mx-auto animate-fade-in">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-16">
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-[#06C755] text-white rounded-[2rem] flex items-center justify-center shadow-2xl shadow-[#06C755]/20">
                        <MessageCircle size={36} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-[#F8F8F6] tracking-tight italic uppercase">{labels.title}</h1>
                        <p className="text-[#C9A34E] text-[10px] font-black uppercase tracking-[0.3em] mt-1">{labels.desc}</p>
                    </div>
                </div>
                <button className="bg-[#06C755] text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:scale-105 transition-all flex items-center gap-3">
                    <Link size={14} />
                    {labels.connect}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="bg-white/5 border border-white/10 rounded-[3rem] p-10 shadow-3xl">
                    <h3 className="text-xl font-black text-[#F8F8F6] uppercase tracking-tight italic mb-8">Recent Interactions</h3>
                    <div className="space-y-4">
                        {mockChats.map((chat, i) => (
                            <div key={i} className="bg-white/5 border border-white/5 p-6 rounded-3xl flex items-center justify-between hover:bg-white/10 transition-all cursor-pointer group">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center">
                                        <User size={20} className="text-white/20" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white text-md">{chat.name}</h4>
                                        <p className="text-white/30 text-[10px] font-medium mt-0.5">{chat.msg}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] font-black text-white/20 uppercase block mb-1">{chat.time}</span>
                                    {chat.unread && <span className="w-2 h-2 bg-[#06C755] rounded-full inline-block"></span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-[#C9A34E] text-[#0A1A2F] p-10 rounded-[3rem] shadow-2xl relative overflow-hidden group hover:scale-[1.01] transition-all">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-y-1/2"></div>
                        <Fingerprint size={60} className="opacity-10 absolute bottom-10 right-10" />
                        <h4 className="text-3xl font-black italic tracking-tighter uppercase mb-2">{labels.status}</h4>
                        <p className="text-sm font-bold opacity-60 uppercase tracking-widest leading-relaxed">Identity mapping synchronized with PSID & Vanity ID strategy.</p>
                    </div>

                    <div className="bg-white/10 border border-[#06C755]/30 p-10 rounded-[3rem] shadow-xl">
                        <h4 className="text-lg font-black text-white uppercase tracking-tight mb-6 flex items-center gap-3">
                            <ShieldCheck size={20} className="text-[#06C755]" />
                            Security Audit
                        </h4>
                        <ul className="space-y-4">
                            <li className="flex items-center gap-3 text-xs font-bold text-white/60">
                                <Check size={14} className="text-[#06C755]" /> Encrypted Payload
                            </li>
                            <li className="flex items-center gap-3 text-xs font-bold text-white/60">
                                <Check size={14} className="text-[#06C755]" /> Rate Limiting Active
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
