'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ShieldCheck, 
    ShieldAlert, 
    ShieldX, 
    CheckCircle2, 
    AlertCircle, 
    XCircle, 
    Sparkles, 
    Target, 
    AlertTriangle, 
    FileText, 
    RefreshCcw 
} from 'lucide-react';

export default function AdReviewPanel({ adId, language = 'TH' }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const labels = {
        EN: {
            title: 'AI Ad Audit',
            score: 'Ad Health Score',
            risk: 'Risk Level',
            checks: 'Rule Integrity',
            aiSummary: 'V-Insight AI Analysis',
            refresh: 'Run Audit',
            loading: 'Analyzing Ad...',
            audience: 'Audience Fit',
            suggestions: 'Rewrite Suggestions',
            issues: 'Structural Issues'
        },
        TH: {
            title: 'ระบบตรวจสอบ AI',
            score: 'คะแนนสุขภาพโฆษณา',
            risk: 'ระดับความเสี่ยง',
            checks: 'การตรวจสอบตามกฎ',
            aiSummary: 'วิเคราะห์โดย V-Insight AI',
            refresh: 'ตรวจสอบอีกครั้ง',
            loading: 'กำลังวิเคราะห์โฆษณา...',
            audience: 'ความเหมาะสมของกลุ่มเป้าหมาย',
            suggestions: 'คำแนะนำการแก้ไข (Rewrite)',
            issues: 'ปัญหาที่พบ'
        }
    }[language];

    useEffect(() => {
        if (adId) fetchReview();
    }, [adId]);

    const fetchReview = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/marketing/ai-review/${adId}`);
            const json = await res.json();
            if (json.error) throw new Error(json.error);
            setData(json);
        } catch (err) {
            console.error('[AdReviewPanel] fetch failed:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const getRiskConfig = (level) => {
        switch (level) {
            case 'LOW': return { color: 'text-emerald-400', bg: 'bg-emerald-400/10', icon: <ShieldCheck size={18} /> };
            case 'MEDIUM': return { color: 'text-yellow-400', bg: 'bg-yellow-400/10', icon: <ShieldAlert size={18} /> };
            case 'HIGH': return { color: 'text-orange-500', bg: 'bg-orange-500/10', icon: <AlertTriangle size={18} /> };
            case 'CRITICAL': return { color: 'text-rose-500', bg: 'bg-rose-500/10', icon: <ShieldX size={18} /> };
            default: return { color: 'text-gray-400', bg: 'bg-gray-400/10', icon: <ShieldCheck size={18} /> };
        }
    };

    if (loading) {
        return (
            <div className="bg-[#0c1a2f] border border-white/5 rounded-[2rem] p-8 flex flex-col items-center justify-center min-h-[300px]">
                <div className="relative w-16 h-16">
                    <div className="absolute inset-0 border-4 border-[#cc9d37]/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-t-[#cc9d37] rounded-full animate-spin"></div>
                </div>
                <p className="text-[#cc9d37] text-[10px] font-black uppercase tracking-[0.3em] mt-6 animate-pulse">{labels.loading}</p>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="bg-[#0c1a2f] border border-rose-500/20 rounded-[2rem] p-8 text-center">
                <p className="text-rose-500 text-xs font-bold">{error || 'Failed to load audit data'}</p>
                <button onClick={fetchReview} className="mt-4 text-[#cc9d37] text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 mx-auto">
                    <RefreshCcw size={12} /> {labels.refresh}
                </button>
            </div>
        );
    }

    const config = getRiskConfig(data.riskLevel);

    return (
        <div className="bg-[#0c1a2f] border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-8 border-b border-white/5 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${config.bg} rounded-xl flex items-center justify-center ${config.color}`}>
                        <Sparkles size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-white uppercase tracking-tight italic leading-tight">{labels.title}</h3>
                        <p className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 mt-1 ${config.color}`}>
                            {config.icon} {labels.risk}: {data.riskLevel}
                        </p>
                    </div>
                </div>
                <button onClick={fetchReview} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-white/40 hover:text-[#cc9d37] hover:bg-white/10 transition-all">
                    <RefreshCcw size={16} />
                </button>
            </div>

            <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Score & Checks */}
                <div className="space-y-8">
                    <div className="flex flex-col items-center justify-center bg-white/5 p-8 rounded-[2rem] relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#cc9d37]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                        
                        <div className="relative w-32 h-32 mb-4">
                            <svg className="w-full h-full rotate-[-90deg]">
                                <circle cx="64" cy="64" r="58" fill="transparent" stroke="rgba(201, 163, 78, 0.1)" strokeWidth="8" />
                                <motion.circle 
                                    cx="64" cy="64" r="58" fill="transparent" stroke="#cc9d37" strokeWidth="8" 
                                    strokeDasharray="364.4" 
                                    initial={{ strokeDashoffset: 364.4 }}
                                    animate={{ strokeDashoffset: 364.4 - (364.4 * data.overallScore / 100) }}
                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                    strokeLinecap="round" 
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-3xl font-black italic text-white leading-none">{data.overallScore}</span>
                                <span className="text-[8px] font-black text-white/40 uppercase tracking-widest mt-1">/ 100</span>
                            </div>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#cc9d37]">{labels.score}</p>
                    </div>

                    <div className="bg-white/5 rounded-[2rem] p-6">
                        <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                            <CheckCircle2 size={12} /> {labels.checks}
                        </h4>
                        <div className="space-y-4">
                            {data.checks.map((check, idx) => (
                                <div key={idx} className="flex items-start justify-between gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all group">
                                    <div className="flex flex-col gap-1">
                                        <span className={`text-[10px] font-black uppercase tracking-widest leading-none ${check.passed ? 'text-white/40' : 'text-rose-400'}`}>
                                            {check.name}
                                        </span>
                                        <span className="text-[10px] text-white/60 font-medium">
                                            {check.detail}
                                        </span>
                                    </div>
                                    <div className={`mt-0.5 ${check.passed ? 'text-emerald-400' : 'text-rose-500'} group-hover:scale-110 transition-transform`}>
                                        {check.passed ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* AI Analysis (Phase B) */}
                <div className="flex flex-col">
                    <AnimatePresence mode="wait">
                        {data.phaseB ? (
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }} 
                                animate={{ opacity: 1, y: 0 }}
                                className="h-full flex flex-col gap-6"
                            >
                                <div className="bg-[#cc9d37] text-[#0c1a2f] p-8 rounded-[2.5rem] relative overflow-hidden flex-1 shadow-xl">
                                    <div className="absolute top-0 right-0 p-6 opacity-20">
                                        <Sparkles size={48} />
                                    </div>
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] mb-4 opacity-60 flex items-center gap-2">
                                        <Sparkles size={14} /> {labels.aiSummary}
                                    </h4>
                                    <p className="text-lg font-black italic tracking-tight leading-snug mb-8">
                                        “{data.phaseB.summary}”
                                    </p>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-black/10 p-4 rounded-2xl">
                                            <p className="text-[8px] font-black uppercase tracking-widest opacity-60 mb-2">{labels.audience}</p>
                                            <div className="flex items-center gap-2">
                                                <Target size={14} />
                                                <span className="text-xs font-black uppercase tracking-tight">{data.phaseB.audienceFit}</span>
                                            </div>
                                        </div>
                                        <div className="bg-black/10 p-4 rounded-2xl">
                                            <p className="text-[8px] font-black uppercase tracking-widest opacity-60 mb-2">Policy Rating</p>
                                            <div className="flex items-center gap-2">
                                                <ShieldCheck size={14} />
                                                <span className="text-xs font-black uppercase tracking-tight">{data.phaseB.policyRisk}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white/5 rounded-[2.5rem] p-8 space-y-6">
                                    <div>
                                        <h5 className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <XCircle size={12} /> {labels.issues} ({data.phaseB.issues?.length || 0})
                                        </h5>
                                        <div className="space-y-3">
                                            {data.phaseB.issues?.map((issue, idx) => (
                                                <div key={idx} className="bg-rose-500/5 p-3 rounded-xl border border-rose-500/10">
                                                    <p className="text-[10px] text-rose-300">
                                                        <span className="font-black uppercase mr-2 tracking-tighter decoration-rose-500/30 underline">{issue.type}:</span>
                                                        {issue.detail}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {data.phaseB.rewriteSuggestion && (
                                        <div className="pt-6 border-t border-white/5">
                                            <h5 className="text-[10px] font-black text-[#cc9d37] uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <RefreshCcw size={12} /> {labels.suggestions}
                                            </h5>
                                            <div className="bg-[#cc9d37]/5 p-4 rounded-2xl relative border border-[#cc9d37]/20">
                                                <div className="absolute -top-3 left-6 px-3 bg-[#0c1a2f] text-[#cc9d37] text-[8px] font-black uppercase tracking-widest border border-white/5 rounded-full">Pro Recommendation</div>
                                                <p className="text-xs text-white/80 leading-relaxed font-medium italic">
                                                    {data.phaseB.rewriteSuggestion}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ) : (
                            <div className="bg-white/5 rounded-[2.5rem] p-8 h-full flex flex-col items-center justify-center text-center group">
                                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center text-white/10 mb-6 group-hover:scale-110 group-hover:bg-[#cc9d37]/10 group-hover:text-[#cc9d37] transition-all">
                                    <Sparkles size={32} />
                                </div>
                                <h4 className="text-white/40 text-xs font-black uppercase tracking-widest mb-2">V-Insight Intelligence</h4>
                                <p className="text-[10px] text-white/20 max-w-[200px] leading-relaxed">
                                    Deep AI analysis is reserved for ads with potential performance issues or baseline health below 60%.
                                </p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
