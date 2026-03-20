'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Save, Upload, RefreshCw, Bot, BookOpen, MessageSquare, CheckCircle, AlertCircle, FileText } from 'lucide-react';

const TONE_KEYS = [
    { key: 'tone_friendly', label: 'Friendly 😊', color: 'emerald' },
    { key: 'tone_formal',   label: 'Formal 📋',   color: 'blue'    },
    { key: 'tone_sales',    label: 'Sales 🎯',    color: 'orange'  },
];

export default function AIConfigPage() {
    const [config, setConfig]       = useState({ persona: '', knowledge: '', tone_friendly: '', tone_formal: '', tone_sales: '' });
    const [loading, setLoading]     = useState(true);
    const [saving, setSaving]       = useState(false);
    const [uploading, setUploading] = useState(null); // 'knowledge' | null
    const [toast, setToast]         = useState(null); // { type: 'ok'|'err', msg }
    const [charCount, setCharCount] = useState({ persona: 0, knowledge: 0 });
    const fileRef = useRef(null);
    const uploadTarget = useRef('knowledge');

    // ── Load ──────────────────────────────────────────────────────────────────
    useEffect(() => {
        fetch('/api/ai-config')
            .then(r => r.json())
            .then(d => {
                if (d.success) {
                    setConfig(d.config);
                    setCharCount({ persona: d.config.persona?.length ?? 0, knowledge: d.config.knowledge?.length ?? 0 });
                }
            })
            .finally(() => setLoading(false));
    }, []);

    const showToast = (type, msg) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 3500);
    };

    // ── Save ──────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        setSaving(true);
        try {
            const res  = await fetch('/api/ai-config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config) });
            const data = await res.json();
            if (data.success) showToast('ok', 'บันทึกสำเร็จ ✓');
            else showToast('err', data.error || 'บันทึกไม่สำเร็จ');
        } catch { showToast('err', 'Network error'); }
        finally { setSaving(false); }
    };

    // ── File Upload ───────────────────────────────────────────────────────────
    const triggerUpload = (target) => {
        uploadTarget.current = target;
        fileRef.current?.click();
    };

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';
        const target = uploadTarget.current;
        setUploading(target);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res  = await fetch('/api/ai-config/upload', { method: 'POST', body: fd });
            const data = await res.json();
            if (data.success) {
                setConfig(prev => ({ ...prev, [target]: data.text }));
                setCharCount(prev => ({ ...prev, [target]: data.chars }));
                showToast('ok', `แยกข้อความสำเร็จ ${data.chars.toLocaleString()} ตัวอักษร`);
            } else {
                showToast('err', data.error || 'อ่านไฟล์ไม่สำเร็จ');
            }
        } catch { showToast('err', 'Network error'); }
        finally { setUploading(null); }
    };

    const handleChange = (key, val) => {
        setConfig(prev => ({ ...prev, [key]: val }));
        if (key === 'persona' || key === 'knowledge') {
            setCharCount(prev => ({ ...prev, [key]: val.length }));
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <RefreshCw className="animate-spin text-white/20" size={28} />
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto space-y-8">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                        <Bot size={20} className="text-violet-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-white">AI Reply Assistant — Config</h1>
                        <p className="text-[11px] text-white/40 uppercase tracking-widest font-bold">Persona · Knowledge · Tone Presets</p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
                >
                    {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                    {saving ? 'กำลังบันทึก...' : 'บันทึกทั้งหมด'}
                </button>
            </div>

            {/* Toast */}
            {toast && (
                <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold ${toast.type === 'ok' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/15 text-red-400 border border-red-500/20'}`}>
                    {toast.type === 'ok' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
                    {toast.msg}
                </div>
            )}

            {/* Hidden file input */}
            <input ref={fileRef} type="file" accept=".docx,.xlsx,.xls" className="hidden" onChange={handleFileChange} />

            {/* ── Row 1: Persona + Knowledge ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Persona */}
                <div className="bg-[#0d1829] border border-white/8 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center gap-2">
                        <Bot size={15} className="text-violet-400" />
                        <span className="text-sm font-black text-white uppercase tracking-widest">Persona</span>
                        <span className="ml-auto text-[10px] text-white/30 font-bold">{charCount.persona.toLocaleString()} chars</span>
                    </div>
                    <p className="text-[11px] text-white/40">กำหนดตัวตนของ AI — เธอเป็นใคร มีบุคลิกแบบไหน ใช้ภาษาสไตล์อะไร</p>
                    <textarea
                        value={config.persona}
                        onChange={e => handleChange('persona', e.target.value)}
                        rows={8}
                        placeholder="เช่น: คุณคือผู้ช่วยแอดมินของ V School ที่อบอุ่นและเป็นมืออาชีพ..."
                        className="w-full bg-[#060f1e] border border-white/8 rounded-xl px-4 py-3 text-sm text-white/80 placeholder-white/20 resize-none focus:outline-none focus:border-violet-500/50 font-mono leading-relaxed"
                    />
                </div>

                {/* Knowledge */}
                <div className="bg-[#0d1829] border border-white/8 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center gap-2">
                        <BookOpen size={15} className="text-blue-400" />
                        <span className="text-sm font-black text-white uppercase tracking-widest">Knowledge Base</span>
                        <span className="ml-auto text-[10px] text-white/30 font-bold">{charCount.knowledge.toLocaleString()} / 8,000</span>
                    </div>
                    <p className="text-[11px] text-white/40">ข้อมูลโรงเรียน หลักสูตร ราคา คำถามที่พบบ่อย — AI จะนำไปใช้ทุก conversation</p>
                    <textarea
                        value={config.knowledge}
                        onChange={e => handleChange('knowledge', e.target.value)}
                        rows={6}
                        placeholder="เช่น: V School เปิด Sushi Course ราคา 3,500 บาท, Ramen Course ราคา 2,800 บาท..."
                        className="w-full bg-[#060f1e] border border-white/8 rounded-xl px-4 py-3 text-sm text-white/80 placeholder-white/20 resize-none focus:outline-none focus:border-blue-500/50 font-mono leading-relaxed"
                    />
                    {/* Upload button */}
                    <button
                        onClick={() => triggerUpload('knowledge')}
                        disabled={uploading === 'knowledge'}
                        className="flex items-center gap-2 w-full justify-center bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 hover:text-blue-300 px-4 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                    >
                        {uploading === 'knowledge'
                            ? <><RefreshCw size={12} className="animate-spin" /> กำลังอ่านไฟล์...</>
                            : <><Upload size={12} /> อัปโหลด .docx หรือ .xlsx</>
                        }
                    </button>
                    <p className="text-[10px] text-white/20 text-center">ข้อความในไฟล์จะถูกดึงมาแทนที่ text area ด้านบน (สูงสุด 8,000 ตัวอักษร)</p>
                </div>
            </div>

            {/* ── Row 2: Tone Presets ── */}
            <div className="bg-[#0d1829] border border-white/8 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                    <MessageSquare size={15} className="text-amber-400" />
                    <span className="text-sm font-black text-white uppercase tracking-widest">Tone Presets</span>
                    <span className="ml-2 text-[10px] text-white/30">คำอธิบาย tone ที่ใช้ใน prompt ของ AI แต่ละแบบ</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {TONE_KEYS.map(({ key, label, color }) => (
                        <div key={key} className="space-y-2">
                            <label className={`text-xs font-black text-${color}-400 uppercase tracking-widest`}>{label}</label>
                            <textarea
                                value={config[key] ?? ''}
                                onChange={e => handleChange(key, e.target.value)}
                                rows={4}
                                className="w-full bg-[#060f1e] border border-white/8 rounded-xl px-3 py-2.5 text-xs text-white/70 placeholder-white/20 resize-none focus:outline-none focus:border-white/20 font-mono leading-relaxed"
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Info banner */}
            <div className="flex items-start gap-3 bg-white/3 border border-white/6 rounded-xl px-4 py-3">
                <FileText size={14} className="text-white/30 mt-0.5 shrink-0" />
                <p className="text-[11px] text-white/30 leading-relaxed">
                    ค่าที่บันทึกไว้จะถูกโหลดทุกครั้งที่กด Generate ใน AI Reply Assistant — Persona + Knowledge จะอยู่ใน system prompt, Tone จะถูกเลือกตาม dropdown ที่ผู้ใช้เลือก
                </p>
            </div>

        </div>
    );
}
