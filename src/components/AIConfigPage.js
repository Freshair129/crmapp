'use client';
import React, { useState, useEffect, useRef } from 'react';
import {
    Save, Upload, RefreshCw, Bot, BookOpen, MessageSquare,
    CheckCircle, AlertCircle, FileText, Image, Trash2,
    ToggleLeft, ToggleRight, File, Plus, Eye, EyeOff,
    Sparkles, User, ChevronDown, Minus, SlidersHorizontal, List,
} from 'lucide-react';

const TONE_KEYS = [
    { key: 'tone_friendly', label: 'Friendly 😊', color: 'emerald' },
    { key: 'tone_formal',   label: 'Formal 📋',   color: 'blue'    },
    { key: 'tone_sales',    label: 'Sales 🎯',    color: 'orange'  },
];

const FILE_ACCEPT = '.docx,.xlsx,.xls,.txt,.jpg,.jpeg,.png,.webp,.gif';

const FILE_ICONS = {
    docx:  { icon: FileText, color: 'text-blue-400',    bg: 'bg-blue-500/10'   },
    xlsx:  { icon: FileText, color: 'text-emerald-400', bg: 'bg-emerald-500/10'},
    txt:   { icon: File,     color: 'text-white/50',    bg: 'bg-white/5'       },
    image: { icon: Image,    color: 'text-pink-400',    bg: 'bg-pink-500/10'   },
};

function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(iso) {
    return new Date(iso).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' });
}

export default function AIConfigPage() {
    const [config,    setConfig]    = useState({ persona: '', knowledge: '', introduction: '', reply_length: 'medium', admin_style_profile: '', admin_style_name: '', tone_friendly: '', tone_formal: '', tone_sales: '' });
    const [files,     setFiles]     = useState([]);
    const [loading,   setLoading]   = useState(true);
    const [saving,    setSaving]    = useState(false);
    const [uploading, setUploading] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [toast,     setToast]     = useState(null);
    const fileRef = useRef(null);

    // ── Admin Style state ──────────────────────────────────────────────────
    const [employees,       setEmployees]       = useState([]);
    const [selectedEmpId,   setSelectedEmpId]   = useState('');
    const [analyzing,       setAnalyzing]       = useState(false);
    const [analyzeResult,   setAnalyzeResult]   = useState(null); // { profile, adminName, messageCount }
    const [savingStyle,     setSavingStyle]     = useState(false);

    // ── Load config + files + employees ───────────────────────────────────
    useEffect(() => {
        Promise.allSettled([
            fetch('/api/ai-config').then(r => r.json()),
            fetch('/api/ai-config/knowledge-files').then(r => r.json()),
            fetch('/api/ai-config/analyze-style').then(r => r.json()),
        ]).then(([cfg, kf, emp]) => {
            if (cfg.status === 'fulfilled' && cfg.value?.success)  setConfig(prev => ({ ...prev, ...cfg.value.config }));
            if (kf.status  === 'fulfilled' && kf.value?.success)   setFiles(kf.value.files);
            if (emp.status === 'fulfilled' && emp.value?.success)  setEmployees(emp.value.employees);
        }).finally(() => setLoading(false));
    }, []);

    const showToast = (type, msg) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 3500);
    };

    // ── Save persona / knowledge / tones ──────────────────────────────────
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

    // ── Analyze admin style ────────────────────────────────────────────────
    const handleAnalyzeStyle = async () => {
        if (!selectedEmpId) return;
        setAnalyzing(true);
        setAnalyzeResult(null);
        try {
            const res  = await fetch('/api/ai-config/analyze-style', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ employeeId: selectedEmpId }),
            });
            const data = await res.json();
            if (data.success) setAnalyzeResult(data);
            else showToast('err', data.error || 'วิเคราะห์ไม่สำเร็จ');
        } catch { showToast('err', 'Network error'); }
        finally { setAnalyzing(false); }
    };

    const handleSaveStyle = async () => {
        if (!analyzeResult) return;
        setSavingStyle(true);
        try {
            const res = await fetch('/api/ai-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    admin_style_profile: analyzeResult.profile,
                    admin_style_name:    analyzeResult.adminName,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setConfig(prev => ({ ...prev, admin_style_profile: analyzeResult.profile, admin_style_name: analyzeResult.adminName }));
                showToast('ok', `บันทึกสไตล์ของ ${analyzeResult.adminName} แล้ว ✓`);
            } else showToast('err', data.error || 'บันทึกไม่สำเร็จ');
        } catch { showToast('err', 'Network error'); }
        finally { setSavingStyle(false); }
    };

    const handleClearStyle = async () => {
        try {
            await fetch('/api/ai-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ admin_style_profile: '', admin_style_name: '' }),
            });
            setConfig(prev => ({ ...prev, admin_style_profile: '', admin_style_name: '' }));
            setAnalyzeResult(null);
            showToast('ok', 'ล้างสไตล์แล้ว');
        } catch { showToast('err', 'Network error'); }
    };

    // ── File upload ────────────────────────────────────────────────────────
    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res  = await fetch('/api/ai-config/knowledge-files', { method: 'POST', body: fd });
            const data = await res.json();
            if (data.success) {
                setFiles(prev => [...prev, data.file]);
                showToast('ok', `อัปโหลด "${data.file.filename}" สำเร็จ${data.chars ? ` (${data.chars.toLocaleString()} chars)` : ''}`);
            } else {
                showToast('err', data.error || 'อัปโหลดไม่สำเร็จ');
            }
        } catch { showToast('err', 'Network error'); }
        finally { setUploading(false); }
    };

    // ── Toggle active ──────────────────────────────────────────────────────
    const handleToggle = async (file) => {
        const newActive = !file.isActive;
        setFiles(prev => prev.map(f => f.id === file.id ? { ...f, isActive: newActive } : f));
        try {
            const res  = await fetch(`/api/ai-config/knowledge-files/${file.id}`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: newActive }),
            });
            const data = await res.json();
            if (!data.success) {
                setFiles(prev => prev.map(f => f.id === file.id ? { ...f, isActive: !newActive } : f));
                showToast('err', 'อัปเดตไม่สำเร็จ');
            }
        } catch {
            setFiles(prev => prev.map(f => f.id === file.id ? { ...f, isActive: !newActive } : f));
            showToast('err', 'Network error');
        }
    };

    // ── Delete file ────────────────────────────────────────────────────────
    const handleDelete = async (id) => {
        setDeletingId(id);
        try {
            const res  = await fetch(`/api/ai-config/knowledge-files/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                setFiles(prev => prev.filter(f => f.id !== id));
                showToast('ok', 'ลบไฟล์แล้ว');
            } else {
                showToast('err', data.error || 'ลบไม่สำเร็จ');
            }
        } catch { showToast('err', 'Network error'); }
        finally { setDeletingId(null); }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <RefreshCw className="animate-spin text-white/20" size={28} />
        </div>
    );

    const activeCount   = files.filter(f => f.isActive).length;
    const inactiveCount = files.length - activeCount;

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
                        <p className="text-[11px] text-white/40 uppercase tracking-widest font-bold">Persona · Introduction · Length · Admin Style · Tone</p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
                >
                    {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                    {saving ? 'กำลังบันทึก...' : 'บันทึก Persona & Tones'}
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
            <input ref={fileRef} type="file" accept={FILE_ACCEPT} className="hidden" onChange={handleFileChange} />

            {/* ── Section 1: Persona ── */}
            <div className="bg-[#0d1829] border border-white/8 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2">
                    <Bot size={15} className="text-violet-400" />
                    <span className="text-sm font-black text-white uppercase tracking-widest">Persona</span>
                    <span className="ml-auto text-[10px] text-white/30 font-bold">{(config.persona?.length ?? 0).toLocaleString()} chars</span>
                </div>
                <p className="text-[11px] text-white/40">กำหนดตัวตนของ AI — เธอเป็นใคร มีบุคลิกแบบไหน ใช้ภาษาสไตล์อะไร และต้องทำอะไรก่อนตอบ</p>
                <textarea
                    value={config.persona}
                    onChange={e => setConfig(prev => ({ ...prev, persona: e.target.value }))}
                    rows={7}
                    placeholder="เช่น: คุณคือผู้ช่วยแอดมินของ V School ที่อบอุ่นและเป็นมืออาชีพ ก่อนตอบทุกครั้งให้อ่านไฟล์ความรู้ก่อน..."
                    className="w-full bg-[#060f1e] border border-white/8 rounded-xl px-4 py-3 text-sm text-white/80 placeholder-white/20 resize-none focus:outline-none focus:border-violet-500/50 font-mono leading-relaxed"
                />
            </div>

            {/* ── Section 2: Knowledge Base (quick notes) ── */}
            <div className="bg-[#0d1829] border border-white/8 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2">
                    <BookOpen size={15} className="text-blue-400" />
                    <span className="text-sm font-black text-white uppercase tracking-widest">Quick Notes</span>
                    <span className="text-[10px] text-white/25 ml-1">(ข้อมูลพื้นฐานที่ไม่ต้องการไฟล์)</span>
                    <span className="ml-auto text-[10px] text-white/30 font-bold">{(config.knowledge?.length ?? 0).toLocaleString()} chars</span>
                </div>
                <p className="text-[11px] text-white/40">ข้อมูลย่อที่จะถูก inject ทุก request — ชื่อโรงเรียน ที่อยู่ เวลาทำการ ช่องทางติดต่อ</p>
                <textarea
                    value={config.knowledge}
                    onChange={e => setConfig(prev => ({ ...prev, knowledge: e.target.value }))}
                    rows={4}
                    placeholder="เช่น: V School เปิด Mon–Sat 9:00–18:00 ที่ กรุงเทพฯ ติดต่อ LINE: @vschool"
                    className="w-full bg-[#060f1e] border border-white/8 rounded-xl px-4 py-3 text-sm text-white/80 placeholder-white/20 resize-none focus:outline-none focus:border-blue-500/50 font-mono leading-relaxed"
                />
            </div>

            {/* ── Section 2.5: Introduction Prompt ── */}
            <div className="bg-[#0d1829] border border-white/8 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2">
                    <MessageSquare size={15} className="text-amber-400" />
                    <span className="text-sm font-black text-white uppercase tracking-widest">Introduction (แนวทางการตอบ)</span>
                    <span className="ml-auto text-[10px] text-white/30 font-bold">{(config.introduction?.length ?? 0).toLocaleString()} chars</span>
                </div>
                <p className="text-[11px] text-white/40">
                    แนวทางที่ AI จะใช้เป็นทิศทางในการสร้างคำตอบ — เช่น สไตล์การตอบ สิ่งที่ต้องเน้น หรือข้อความ CTA ที่ต้องการ
                    แอดมินสามารถ override ได้จากหน้า Inbox ถ้าต้องการปรับแต่งเฉพาะแชทนั้น
                </p>
                <textarea
                    value={config.introduction}
                    onChange={e => setConfig(prev => ({ ...prev, introduction: e.target.value }))}
                    rows={4}
                    placeholder="เช่น: เน้นความเป็นกันเอง ตอบสั้นกระชับ ถ้ามีโอกาสให้แนะนำหลักสูตรเบื้องต้นก่อนเสมอ และชวนให้ทดลองเรียน trial class"
                    className="w-full bg-[#060f1e] border border-white/8 rounded-xl px-4 py-3 text-sm text-white/80 placeholder-white/20 resize-none focus:outline-none focus:border-amber-500/50 font-mono leading-relaxed"
                />
            </div>

            {/* ── Section 3: Knowledge Files ── */}
            <div className="bg-[#0d1829] border border-white/8 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Upload size={15} className="text-pink-400" />
                        <span className="text-sm font-black text-white uppercase tracking-widest">Knowledge Files</span>
                        {files.length > 0 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/8 text-white/40">
                                {activeCount} active{inactiveCount > 0 ? ` · ${inactiveCount} hidden` : ''}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                        className="flex items-center gap-2 bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/20 text-pink-400 hover:text-pink-300 px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                    >
                        {uploading
                            ? <><RefreshCw size={12} className="animate-spin" /> กำลังอัปโหลด...</>
                            : <><Plus size={12} /> เพิ่มไฟล์</>
                        }
                    </button>
                </div>

                <p className="text-[11px] text-white/35 leading-relaxed">
                    AI จะอ่านไฟล์เหล่านี้เป็น context ก่อนสร้างคำตอบทุกครั้ง — รองรับ .docx, .xlsx, .txt (ดึง text) และ .jpg, .png, .webp (ส่งเป็นรูปให้ Gemini Vision)
                </p>

                {/* File list */}
                {files.length === 0 ? (
                    <div
                        onClick={() => fileRef.current?.click()}
                        className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-white/8 hover:border-pink-500/30 rounded-xl py-10 cursor-pointer transition-all group"
                    >
                        <Upload size={28} className="text-white/15 group-hover:text-pink-400/50 transition-colors" />
                        <p className="text-sm text-white/25 group-hover:text-white/40 transition-colors">คลิกเพื่ออัปโหลดไฟล์แรก</p>
                        <p className="text-[10px] text-white/15">.docx · .xlsx · .txt · .jpg · .png · .webp</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {files.map((file, idx) => {
                            const meta    = FILE_ICONS[file.fileType] ?? FILE_ICONS.txt;
                            const Icon    = meta.icon;
                            const deleting = deletingId === file.id;

                            return (
                                <div
                                    key={file.id}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                                        file.isActive
                                            ? 'bg-white/3 border-white/8'
                                            : 'bg-white/1 border-white/4 opacity-50'
                                    }`}
                                >
                                    {/* Index */}
                                    <span className="text-[10px] text-white/20 font-black w-4 text-right shrink-0">{idx + 1}</span>

                                    {/* File type icon */}
                                    <div className={`w-8 h-8 rounded-lg ${meta.bg} flex items-center justify-center shrink-0`}>
                                        <Icon size={14} className={meta.color} />
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-bold truncate ${file.isActive ? 'text-white/85' : 'text-white/35'}`}>
                                            {file.filename}
                                        </p>
                                        <p className="text-[10px] text-white/25 font-mono">
                                            {file.fileType.toUpperCase()} · {formatBytes(file.sizeBytes)} · {formatDate(file.createdAt)}
                                        </p>
                                    </div>

                                    {/* Active badge */}
                                    {file.isActive
                                        ? <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400/70 bg-emerald-500/10 px-2 py-0.5 rounded-full shrink-0">Active</span>
                                        : <span className="text-[9px] font-black uppercase tracking-widest text-white/20 bg-white/4 px-2 py-0.5 rounded-full shrink-0">Hidden</span>
                                    }

                                    {/* Toggle */}
                                    <button
                                        onClick={() => handleToggle(file)}
                                        className="text-white/30 hover:text-white/60 transition-colors shrink-0"
                                        title={file.isActive ? 'ซ่อนไฟล์นี้จาก AI' : 'เปิดใช้ไฟล์นี้'}
                                    >
                                        {file.isActive ? <Eye size={15} /> : <EyeOff size={15} />}
                                    </button>

                                    {/* Delete */}
                                    <button
                                        onClick={() => handleDelete(file.id)}
                                        disabled={deleting}
                                        className="text-white/20 hover:text-red-400 transition-colors shrink-0 disabled:opacity-50"
                                        title="ลบไฟล์"
                                    >
                                        {deleting ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Section 4: Reply Length ── */}
            <div className="bg-[#0d1829] border border-white/8 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                    <SlidersHorizontal size={15} className="text-cyan-400" />
                    <span className="text-sm font-black text-white uppercase tracking-widest">ความยาวของการตอบ</span>
                </div>
                <p className="text-[11px] text-white/40">ควบคุมความยาวเริ่มต้นของคำตอบที่ AI สร้าง</p>
                <div className="grid grid-cols-3 gap-3">
                    <button
                        onClick={() => setConfig(prev => ({ ...prev, reply_length: 'short' }))}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                            config.reply_length === 'short'
                                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                                : 'bg-white/3 border-white/8 text-white/30 hover:text-white/50 hover:border-white/15'
                        }`}
                    >
                        <Minus size={20} />
                        <span className="text-sm font-black">สั้น</span>
                        <span className="text-[10px] opacity-70">1–2 ประโยค</span>
                    </button>
                    <button
                        onClick={() => setConfig(prev => ({ ...prev, reply_length: 'medium' }))}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                            config.reply_length === 'medium'
                                ? 'bg-blue-500/15 border-blue-500/40 text-blue-400'
                                : 'bg-white/3 border-white/8 text-white/30 hover:text-white/50 hover:border-white/15'
                        }`}
                    >
                        <List size={20} />
                        <span className="text-sm font-black">กลาง</span>
                        <span className="text-[10px] opacity-70">2–4 ประโยค</span>
                    </button>
                    <button
                        onClick={() => setConfig(prev => ({ ...prev, reply_length: 'long' }))}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                            config.reply_length === 'long'
                                ? 'bg-violet-500/15 border-violet-500/40 text-violet-400'
                                : 'bg-white/3 border-white/8 text-white/30 hover:text-white/50 hover:border-white/15'
                        }`}
                    >
                        <BookOpen size={20} />
                        <span className="text-sm font-black">ยาว</span>
                        <span className="text-[10px] opacity-70">หลายย่อหน้า</span>
                    </button>
                </div>
            </div>

            {/* ── Section 5: Admin Style Mode ── */}
            <div className="bg-[#0d1829] border border-white/8 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                    <User size={15} className="text-rose-400" />
                    <span className="text-sm font-black text-white uppercase tracking-widest">Admin Style Mode</span>
                    {config.admin_style_name && (
                        <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/20">
                            Active: {config.admin_style_name}
                        </span>
                    )}
                </div>
                <p className="text-[11px] text-white/40 leading-relaxed">
                    AI จะวิเคราะห์ข้อความที่แอดมินคนนั้นเคยส่ง แล้วเลียนแบบสไตล์การตอบ — คำติดปาก ความยาว ภาษา สเต็บการตอบ และวิธีแก้ปัญหา
                </p>

                {/* Employee selector + analyze button */}
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <select
                            value={selectedEmpId}
                            onChange={e => setSelectedEmpId(e.target.value)}
                            className="w-full appearance-none bg-[#060f1e] border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white/80 focus:outline-none focus:border-rose-500/40 pr-8"
                        >
                            <option value="">เลือกแอดมิน...</option>
                            {employees.map(emp => (
                                <option key={emp.id} value={emp.id}>
                                    {emp.name} ({emp.employeeId}) — {emp.messageCount} ข้อความ
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                    </div>
                    <button
                        onClick={handleAnalyzeStyle}
                        disabled={!selectedEmpId || analyzing}
                        className="flex items-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 px-4 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                        {analyzing
                            ? <><RefreshCw size={12} className="animate-spin" /> วิเคราะห์...</>
                            : <><Sparkles size={12} /> วิเคราะห์สไตล์</>
                        }
                    </button>
                    {config.admin_style_name && (
                        <button
                            onClick={handleClearStyle}
                            className="flex items-center gap-1 text-white/25 hover:text-white/50 text-xs px-3 py-2.5 rounded-xl border border-white/8 hover:border-white/20 transition-all"
                            title="ล้าง style ที่บันทึกอยู่"
                        >
                            <Trash2 size={12} />
                        </button>
                    )}
                </div>

                {/* Analysis result */}
                {analyzeResult && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-[11px] text-rose-400 font-bold">
                                ผลวิเคราะห์สไตล์ของ {analyzeResult.adminName} ({analyzeResult.messageCount} ข้อความ)
                            </p>
                            <button
                                onClick={handleSaveStyle}
                                disabled={savingStyle}
                                className="flex items-center gap-1.5 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/25 text-rose-400 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                            >
                                {savingStyle ? <RefreshCw size={11} className="animate-spin" /> : <Save size={11} />}
                                {savingStyle ? 'กำลังบันทึก...' : 'ใช้สไตล์นี้'}
                            </button>
                        </div>
                        <textarea
                            value={analyzeResult.profile}
                            onChange={e => setAnalyzeResult(prev => ({ ...prev, profile: e.target.value }))}
                            rows={8}
                            className="w-full bg-[#060f1e] border border-rose-500/15 rounded-xl px-4 py-3 text-[11px] text-white/70 resize-none focus:outline-none focus:border-rose-500/30 font-mono leading-relaxed"
                        />
                    </div>
                )}

                {/* Currently active style */}
                {!analyzeResult && config.admin_style_profile && (
                    <div className="bg-rose-500/5 border border-rose-500/15 rounded-xl p-3">
                        <p className="text-[10px] text-rose-400/70 uppercase tracking-widest font-bold mb-1">Style ที่ใช้อยู่ — {config.admin_style_name}</p>
                        <p className="text-[11px] text-white/50 leading-relaxed line-clamp-4 whitespace-pre-wrap">{config.admin_style_profile}</p>
                    </div>
                )}
            </div>

            {/* ── Section 6: Tone Presets ── */}
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
                                onChange={e => setConfig(prev => ({ ...prev, [key]: e.target.value }))}
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
                    ไฟล์ที่ Active จะถูกโหลดทุกครั้งที่กด Generate — ไฟล์เอกสารดึง text เข้า system prompt, ไฟล์รูปส่งเป็น vision input ให้ Gemini อ่านโดยตรง (ไม่ใส่ทั้งก้อน)
                </p>
            </div>

        </div>
    );
}
