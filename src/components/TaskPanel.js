'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Plus, X, Loader2, Search, ChevronDown,
    AlertTriangle, Zap, TrendingUp, Clock,
    MinusCircle, Archive,
    User, Calendar, Tag, CheckCircle2, Circle, RotateCcw,
    Trash2, Pen, List, CalendarDays, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { can } from '@/lib/permissionMatrix';

// ─── Priority config ──────────────────────────────────────────────────────────
export const PRIORITY_CONFIG = {
    L0: {
        label: 'L0 · Critical',
        short: 'L0',
        desc: 'วิกฤต — หยุดงานอื่นทำทันที',
        icon: AlertTriangle,
        color: 'text-red-400',
        bg: 'bg-red-500/15',
        border: 'border-red-500/40',
        badge: 'bg-red-500 text-white',
        dot: 'bg-red-500',
        pulse: true,
    },
    L1: {
        label: 'L1 · Urgent',
        short: 'L1',
        desc: 'เร่งด่วน — ต้องทำวันนี้',
        icon: Zap,
        color: 'text-orange-400',
        bg: 'bg-orange-500/10',
        border: 'border-orange-500/30',
        badge: 'bg-orange-500 text-white',
        dot: 'bg-orange-400',
        pulse: false,
    },
    L2: {
        label: 'L2 · Important',
        short: 'L2',
        desc: 'สำคัญ — ทำต่อจาก L1',
        icon: TrendingUp,
        color: 'text-yellow-400',
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-500/25',
        badge: 'bg-yellow-500 text-[#0c1a2f]',
        dot: 'bg-yellow-400',
        pulse: false,
    },
    L3: {
        label: 'L3 · Routine',
        short: 'L3',
        desc: 'งานประจำ — ทำตามหน้าที่',
        icon: Clock,
        color: 'text-blue-400',
        bg: 'bg-blue-500/8',
        border: 'border-blue-500/20',
        badge: 'bg-blue-500/80 text-white',
        dot: 'bg-blue-400',
        pulse: false,
    },
    L4: {
        label: 'L4 · Deferrable',
        short: 'L4',
        desc: 'เลื่อนออกไปได้',
        icon: MinusCircle,
        color: 'text-white/40',
        bg: 'bg-white/4',
        border: 'border-white/10',
        badge: 'bg-white/15 text-white/60',
        dot: 'bg-white/30',
        pulse: false,
    },
    L5: {
        label: 'L5 · Optional',
        short: 'L5',
        desc: 'ทำเมื่อมีเวลาว่าง',
        icon: Archive,
        color: 'text-white/25',
        bg: 'bg-white/3',
        border: 'border-white/8',
        badge: 'bg-white/8 text-white/40',
        dot: 'bg-white/20',
        pulse: false,
    },
};

const PRIORITIES = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5'];

const STATUS_CONFIG = {
    PENDING:     { label: 'รอดำเนินการ', icon: Circle,       color: 'text-white/40' },
    IN_PROGRESS: { label: 'กำลังทำ',     icon: RotateCcw,    color: 'text-[#cc9d37]' },
    DONE:        { label: 'เสร็จแล้ว',   icon: CheckCircle2, color: 'text-emerald-400' },
    CANCELLED:   { label: 'ยกเลิก',      icon: X,            color: 'text-red-400/60' },
};

const TASK_TYPES = ['FOLLOW_UP', 'MEETING', 'CALL', 'EMAIL', 'PURCHASE', 'REVIEW', 'OTHER'];
const TYPE_LABEL = {
    FOLLOW_UP: 'Follow Up', MEETING: 'Meeting', CALL: 'Call',
    EMAIL: 'Email', PURCHASE: 'Purchase', REVIEW: 'Review', OTHER: 'Other',
};

// ─── Priority Badge ───────────────────────────────────────────────────────────
function PriorityBadge({ priority, size = 'md' }) {
    const cfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.L3;
    const Icon = cfg.icon;
    const sizeClass = size === 'sm' ? 'text-[9px] px-1.5 py-0.5 gap-1' : 'text-[10px] px-2 py-1 gap-1.5';
    return (
        <span className={`inline-flex items-center rounded-lg font-black uppercase tracking-widest ${cfg.badge} ${sizeClass}`}>
            {cfg.pulse && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse mr-0.5" />}
            <Icon size={size === 'sm' ? 9 : 10} />
            {cfg.short}
        </span>
    );
}

// ─── Priority Selector Dropdown ───────────────────────────────────────────────
function PrioritySelect({ value, onChange }) {
    const [open, setOpen] = useState(false);
    const cfg = PRIORITY_CONFIG[value] || PRIORITY_CONFIG.L3;
    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${cfg.bg} ${cfg.border} ${cfg.color} text-[10px] font-black uppercase tracking-widest transition-all hover:opacity-80`}
            >
                <PriorityBadge priority={value} size="sm" />
                <ChevronDown size={10} />
            </button>
            {open && (
                <div className="absolute top-full mt-1 left-0 z-50 bg-[#0c1a2f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden min-w-[220px]">
                    <div className="px-3 py-2 border-b border-white/5">
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/30">เลือกระดับความสำคัญ</span>
                    </div>
                    {PRIORITIES.map(p => {
                        const c = PRIORITY_CONFIG[p];
                        const Icon = c.icon;
                        return (
                            <button
                                key={p}
                                type="button"
                                onClick={() => { onChange(p); setOpen(false); }}
                                className={`w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/5 ${value === p ? `${c.bg}` : ''}`}
                            >
                                <PriorityBadge priority={p} size="sm" />
                                <div className="flex-1 min-w-0">
                                    <p className={`text-[10px] font-black ${c.color}`}>{c.label}</p>
                                    <p className="text-[9px] text-white/30">{c.desc}</p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ─── Task Card ────────────────────────────────────────────────────────────────
function TaskCard({ task, onUpdatePriority, onUpdateStatus, onEdit, onDelete, canManage }) {
    const cfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.L3;
    const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.PENDING;
    const StatusIcon = statusCfg.icon;
    const isDone = task.status === 'DONE';
    const isCancelled = task.status === 'CANCELLED';

    const isOverdue = task.dueDate && !isDone && !isCancelled
        && new Date(task.dueDate) < new Date();

    return (
        <div className={`rounded-2xl border p-4 transition-all ${cfg.bg} ${cfg.border} ${isDone || isCancelled ? 'opacity-50' : ''}`}>
            <div className="flex items-start gap-3">
                {/* Priority dot + status icon */}
                <div className="flex flex-col items-center gap-1 pt-0.5 flex-shrink-0">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot} ${cfg.pulse ? 'animate-pulse' : ''}`} />
                </div>

                <div className="flex-1 min-w-0">
                    {/* Title row */}
                    <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-bold leading-snug ${isDone ? 'line-through text-white/40' : 'text-white/90'}`}>
                            {task.title}
                        </p>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                            <PriorityBadge priority={task.priority} size="sm" />
                        </div>
                    </div>

                    {/* Description */}
                    {task.description && (
                        <p className="text-[10px] text-white/40 mt-1 leading-relaxed line-clamp-2">{task.description}</p>
                    )}

                    {/* Meta row */}
                    <div className="flex items-center gap-3 mt-2.5 flex-wrap">
                        {/* Status */}
                        {canManage ? (
                            <select
                                value={task.status}
                                onChange={e => onUpdateStatus(task, e.target.value)}
                                className={`bg-transparent text-[9px] font-black uppercase tracking-widest border-none outline-none cursor-pointer ${statusCfg.color}`}
                            >
                                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                                    <option key={k} value={k}>{v.label}</option>
                                ))}
                            </select>
                        ) : (
                            <span className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-widest ${statusCfg.color}`}>
                                <StatusIcon size={9} />{statusCfg.label}
                            </span>
                        )}

                        {/* Assignee */}
                        {task.assignee && (
                            <span className="flex items-center gap-1 text-[9px] text-white/30 font-bold">
                                <User size={9} />
                                {task.assignee.nickName || task.assignee.firstName}
                            </span>
                        )}

                        {/* Due date */}
                        {task.dueDate && (
                            <span className={`flex items-center gap-1 text-[9px] font-bold ${isOverdue ? 'text-red-400' : 'text-white/30'}`}>
                                <Calendar size={9} />
                                {new Date(task.dueDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                                {isOverdue && ' ⚠️'}
                            </span>
                        )}

                        {/* Type */}
                        <span className="flex items-center gap-1 text-[9px] text-white/20 font-bold">
                            <Tag size={9} />{TYPE_LABEL[task.type] || task.type}
                        </span>
                    </div>
                </div>

                {/* Action buttons */}
                {canManage && (
                    <div className="flex flex-col gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => onEdit(task)} className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 text-white/30 hover:text-white flex items-center justify-center transition-all" title="แก้ไข">
                            <Pen size={10} />
                        </button>
                        <button onClick={() => onDelete(task)} className="w-6 h-6 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400/50 hover:text-red-400 flex items-center justify-center transition-all" title="ยกเลิก">
                            <Trash2 size={10} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Create / Edit Modal ──────────────────────────────────────────────────────
function TaskModal({ task, employees = [], customers = [], onClose, onSaved }) {
    const isEdit = !!task;
    const [form, setForm] = useState(task
        ? { title: task.title, description: task.description || '', type: task.type, priority: task.priority, assigneeId: task.assigneeId || '', customerId: task.customerId || '', dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '' }
        : { title: '', description: '', type: 'FOLLOW_UP', priority: 'L3', assigneeId: '', customerId: '', dueDate: '' }
    );
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        if (!form.title.trim()) { setError('กรุณากรอกชื่องาน'); return; }
        setSaving(true); setError('');
        try {
            const url    = isEdit ? `/api/tasks/${task.id}` : '/api/tasks';
            const method = isEdit ? 'PATCH' : 'POST';
            const body   = { ...form, assigneeId: form.assigneeId || null, customerId: form.customerId || null, dueDate: form.dueDate || null };
            const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            const result = await res.json();
            if (result.success) { onSaved(); onClose(); }
            else setError(result.error || 'เกิดข้อผิดพลาด');
        } catch (err) {
            setError('Network error');
        } finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[#0c1a2f] border border-white/10 rounded-[2rem] w-full max-w-lg p-8 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-white font-black text-lg">{isEdit ? 'แก้ไขงาน' : 'สร้างงานใหม่'}</h3>
                    <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center">
                        <X size={14} />
                    </button>
                </div>
                {error && <p className="text-red-400 text-xs font-bold mb-4 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>}

                <div className="space-y-4">
                    {/* Title */}
                    <div>
                        <label className="text-[10px] text-white/40 font-black uppercase tracking-widest block mb-1.5">ชื่องาน *</label>
                        <input
                            type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                            placeholder="เช่น โทรติดตามลูกค้า คุณสมชาย"
                            className="w-full bg-white/5 border border-white/10 text-white px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#cc9d37]/40 transition-all"
                        />
                    </div>

                    {/* Priority */}
                    <div>
                        <label className="text-[10px] text-white/40 font-black uppercase tracking-widest block mb-1.5">ระดับความสำคัญ</label>
                        <PrioritySelect value={form.priority} onChange={v => setForm(f => ({ ...f, priority: v }))} />
                        <p className="text-[9px] text-white/25 mt-1.5 ml-1">{PRIORITY_CONFIG[form.priority]?.desc}</p>
                    </div>

                    {/* Type */}
                    <div>
                        <label className="text-[10px] text-white/40 font-black uppercase tracking-widest block mb-1.5">ประเภทงาน</label>
                        <select
                            value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                            className="w-full bg-[#0c1a2f] border border-white/10 text-white px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#cc9d37]/40 appearance-none"
                        >
                            {TASK_TYPES.map(t => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
                        </select>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="text-[10px] text-white/40 font-black uppercase tracking-widest block mb-1.5">รายละเอียด</label>
                        <textarea
                            value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            rows={3} placeholder="รายละเอียดเพิ่มเติม..."
                            className="w-full bg-white/5 border border-white/10 text-white px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#cc9d37]/40 transition-all resize-none"
                        />
                    </div>

                    {/* Assignee */}
                    <div>
                        <label className="text-[10px] text-white/40 font-black uppercase tracking-widest block mb-1.5">มอบหมายให้</label>
                        <select
                            value={form.assigneeId} onChange={e => setForm(f => ({ ...f, assigneeId: e.target.value }))}
                            className="w-full bg-[#0c1a2f] border border-white/10 text-white px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#cc9d37]/40 appearance-none"
                        >
                            <option value="">— ไม่ระบุ —</option>
                            {employees.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} {emp.nickName ? `(${emp.nickName})` : ''}</option>
                            ))}
                        </select>
                    </div>

                    {/* Due date */}
                    <div>
                        <label className="text-[10px] text-white/40 font-black uppercase tracking-widest block mb-1.5">กำหนดเสร็จ</label>
                        <input
                            type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                            className="w-full bg-white/5 border border-white/10 text-white px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#cc9d37]/40 transition-all"
                        />
                    </div>
                </div>

                <div className="flex gap-3 mt-6">
                    <button onClick={onClose}
                        className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 text-xs font-black uppercase hover:bg-white/10 transition-all">
                        Cancel
                    </button>
                    <button onClick={handleSubmit} disabled={saving}
                        className="flex-1 py-3 rounded-xl bg-[#cc9d37] hover:bg-amber-400 text-[#0c1a2f] text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-[#cc9d37]/20 disabled:opacity-50">
                        {saving ? <Loader2 className="animate-spin inline-block" size={14} /> : (isEdit ? 'บันทึก' : 'สร้างงาน')}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Helper: format date key YYYY-MM-DD ──────────────────────────────────────
function dateKey(d) {
    return d.toISOString().slice(0, 10);
}

// ─── Weekly View ─────────────────────────────────────────────────────────────
function WeeklyView({ tasks, onEdit, canManage }) {
    const [weekOffset, setWeekOffset] = useState(0);

    // Build Mon–Sun of target week
    const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        const dow = d.getDay() === 0 ? 6 : d.getDay() - 1; // Mon=0
        d.setDate(d.getDate() - dow + i + weekOffset * 7);
        d.setHours(0, 0, 0, 0);
        return d;
    });

    const DAY_TH = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'];
    const today = dateKey(new Date());

    // Group tasks by due date key; tasks with no dueDate go to 'none'
    const byDay = {};
    tasks.forEach(t => {
        const k = t.dueDate ? dateKey(new Date(t.dueDate)) : 'none';
        if (!byDay[k]) byDay[k] = [];
        byDay[k].push(t);
    });

    const weekLabel = `${days[0].toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} – ${days[6].toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}`;

    return (
        <div className="space-y-4">
            {/* Week nav */}
            <div className="flex items-center justify-between">
                <button onClick={() => setWeekOffset(o => o - 1)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all">
                    <ChevronLeft size={14} />
                </button>
                <div className="text-center">
                    <p className="text-xs font-black text-white/60 uppercase tracking-widest">{weekLabel}</p>
                    {weekOffset !== 0 && (
                        <button onClick={() => setWeekOffset(0)}
                            className="text-[9px] font-black text-[#cc9d37] hover:text-amber-300 uppercase tracking-widest mt-0.5">
                            กลับสัปดาห์นี้
                        </button>
                    )}
                </div>
                <button onClick={() => setWeekOffset(o => o + 1)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all">
                    <ChevronRight size={14} />
                </button>
            </div>

            {/* 7-day columns */}
            <div className="grid grid-cols-7 gap-2">
                {days.map((d, i) => {
                    const k = dateKey(d);
                    const isToday = k === today;
                    const dayTasks = byDay[k] || [];
                    return (
                        <div key={k} className={`rounded-2xl border p-2 min-h-[120px] flex flex-col gap-1.5 transition-all ${
                            isToday ? 'border-[#cc9d37]/50 bg-[#cc9d37]/5' : 'border-white/8 bg-white/3'
                        }`}>
                            {/* Day header */}
                            <div className={`text-center mb-1 ${isToday ? 'text-[#cc9d37]' : 'text-white/40'}`}>
                                <p className="text-[9px] font-black uppercase tracking-widest">{DAY_TH[i]}</p>
                                <p className={`text-base font-black leading-none ${isToday ? 'text-[#cc9d37]' : 'text-white/60'}`}>
                                    {d.getDate()}
                                </p>
                            </div>
                            {/* Tasks */}
                            {dayTasks.map(t => {
                                const cfg = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG.L3;
                                const isOverdue = t.dueDate && new Date(t.dueDate) < new Date() && k !== today;
                                return (
                                    <button key={t.id} onClick={() => canManage && onEdit(t)}
                                        className={`w-full text-left px-2 py-1.5 rounded-lg border text-[10px] font-bold leading-tight truncate transition-all hover:scale-[1.02] ${
                                            isOverdue ? 'border-red-500/40 bg-red-500/10 text-red-300' : `${cfg.border} bg-white/5 text-white/80`
                                        }`}>
                                        <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle ${cfg.dot}`} />
                                        {t.title}
                                    </button>
                                );
                            })}
                            {dayTasks.length === 0 && (
                                <p className="text-[9px] text-white/15 text-center mt-auto">—</p>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* No-date tasks */}
            {(byDay['none'] || []).length > 0 && (
                <div className="bg-white/3 border border-white/8 rounded-2xl p-4">
                    <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-2">ไม่มีกำหนด</p>
                    <div className="flex flex-wrap gap-2">
                        {byDay['none'].map(t => {
                            const cfg = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG.L3;
                            return (
                                <button key={t.id} onClick={() => canManage && onEdit(t)}
                                    className={`px-3 py-1.5 rounded-xl border text-[10px] font-bold ${cfg.border} bg-white/5 text-white/70 hover:text-white transition-all`}>
                                    <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle ${cfg.dot}`} />
                                    {t.title}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Calendar View ────────────────────────────────────────────────────────────
function CalendarView({ tasks, onEdit, canManage }) {
    const [monthOffset, setMonthOffset] = useState(0);
    const [selectedDay, setSelectedDay] = useState(null);

    const now = new Date();
    const year  = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1).getFullYear();
    const month = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1).getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay  = new Date(year, month + 1, 0);
    const startDow = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Mon=0
    const today    = dateKey(new Date());

    const DAY_HEADERS = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'];
    const MONTH_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

    // Group tasks by date key
    const byDay = {};
    tasks.forEach(t => {
        if (!t.dueDate) return;
        const k = dateKey(new Date(t.dueDate));
        if (!byDay[k]) byDay[k] = [];
        byDay[k].push(t);
    });

    // Build grid cells (nulls for padding)
    const cells = [
        ...Array(startDow).fill(null),
        ...Array.from({ length: lastDay.getDate() }, (_, i) => i + 1),
    ];
    // Pad to complete last row
    while (cells.length % 7 !== 0) cells.push(null);

    const selKey = selectedDay ? dateKey(new Date(year, month, selectedDay)) : null;
    const selTasks = selKey ? (byDay[selKey] || []) : [];

    return (
        <div className="space-y-4">
            {/* Month nav */}
            <div className="flex items-center justify-between">
                <button onClick={() => { setMonthOffset(o => o - 1); setSelectedDay(null); }}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all">
                    <ChevronLeft size={14} />
                </button>
                <div className="text-center">
                    <p className="text-sm font-black text-white uppercase tracking-widest">
                        {MONTH_TH[month]} {year}
                    </p>
                    {monthOffset !== 0 && (
                        <button onClick={() => { setMonthOffset(0); setSelectedDay(null); }}
                            className="text-[9px] font-black text-[#cc9d37] hover:text-amber-300 uppercase tracking-widest">
                            กลับเดือนนี้
                        </button>
                    )}
                </div>
                <button onClick={() => { setMonthOffset(o => o + 1); setSelectedDay(null); }}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all">
                    <ChevronRight size={14} />
                </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
                {DAY_HEADERS.map(d => (
                    <p key={d} className="text-center text-[9px] font-black text-white/25 uppercase tracking-widest py-1">{d}</p>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
                {cells.map((day, idx) => {
                    if (!day) return <div key={`pad-${idx}`} />;
                    const k = dateKey(new Date(year, month, day));
                    const dayTasks = byDay[k] || [];
                    const isToday   = k === today;
                    const isSel     = day === selectedDay;
                    const hasOverdue = dayTasks.some(t => t.dueDate && new Date(t.dueDate) < new Date() && !isToday);
                    return (
                        <button key={k} onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                            className={`relative rounded-xl p-1.5 min-h-[52px] flex flex-col items-center transition-all border text-left ${
                                isSel    ? 'border-[#cc9d37] bg-[#cc9d37]/10' :
                                isToday  ? 'border-[#cc9d37]/40 bg-[#cc9d37]/5' :
                                'border-white/5 bg-white/3 hover:bg-white/8 hover:border-white/15'
                            }`}>
                            <span className={`text-[11px] font-black mb-1 ${
                                isSel ? 'text-[#cc9d37]' : isToday ? 'text-[#cc9d37]' : 'text-white/60'
                            }`}>{day}</span>
                            {/* Task dots */}
                            <div className="flex flex-wrap gap-0.5 justify-center">
                                {dayTasks.slice(0, 4).map((t, i) => {
                                    const cfg = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG.L3;
                                    return <span key={i} className={`w-1.5 h-1.5 rounded-full ${hasOverdue && t.dueDate ? 'bg-red-500' : cfg.dot}`} />;
                                })}
                                {dayTasks.length > 4 && (
                                    <span className="text-[8px] font-black text-white/40">+{dayTasks.length - 4}</span>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Selected day task list */}
            {selectedDay && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-3">
                        {selectedDay} {MONTH_TH[month]} — {selTasks.length} งาน
                    </p>
                    {selTasks.length === 0 ? (
                        <p className="text-xs text-white/20 text-center py-4">ไม่มีงานวันนี้</p>
                    ) : selTasks.map(t => {
                        const cfg = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG.L3;
                        return (
                            <button key={t.id} onClick={() => canManage && onEdit(t)}
                                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all hover:bg-white/8 ${cfg.border} bg-white/3`}>
                                <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-white truncate">{t.title}</p>
                                    {t.assignee && (
                                        <p className="text-[9px] text-white/30 font-bold mt-0.5">
                                            → {t.assignee.nickName || t.assignee.firstName || '—'}
                                        </p>
                                    )}
                                </div>
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg shrink-0 ${cfg.badge}`}>{t.priority}</span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TaskPanel({ employees = [], customers = [], currentUser }) {
    const [tasks, setTasks]             = useState([]);
    const [loading, setLoading]         = useState(true);
    const [search, setSearch]           = useState('');
    const [filterPriority, setFilterPriority] = useState('ALL');
    const [filterStatus, setFilterStatus]     = useState('ACTIVE'); // ACTIVE = PENDING+IN_PROGRESS
    const [showModal, setShowModal]     = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [viewMode, setViewMode]       = useState('list'); // 'list' | 'weekly' | 'calendar'

    const canManage = can(currentUser?.role, 'sales', 'create')
        || can(currentUser?.role, 'system', 'view');

    const fetchTasks = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ limit: '200' });
            if (filterPriority !== 'ALL') params.set('priority', filterPriority);
            const res = await fetch(`/api/tasks?${params}`);
            const result = await res.json();
            if (result.success) setTasks(result.data || []);
        } catch (err) {
            console.error('[TaskPanel] fetch failed', err);
        } finally { setLoading(false); }
    }, [filterPriority]);

    useEffect(() => { fetchTasks(); }, [fetchTasks]);

    const handleUpdatePriority = async (task, newPriority) => {
        await fetch(`/api/tasks/${task.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ priority: newPriority }),
        });
        fetchTasks();
    };

    const handleUpdateStatus = async (task, newStatus) => {
        await fetch(`/api/tasks/${task.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus }),
        });
        fetchTasks();
    };

    const handleDelete = async (task) => {
        await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' });
        fetchTasks();
    };

    // Filter tasks
    const displayed = tasks.filter(t => {
        const matchSearch = !search || `${t.title} ${t.description || ''} ${t.assignee?.firstName || ''}`.toLowerCase().includes(search.toLowerCase());
        const matchStatus = filterStatus === 'ALL'
            ? true
            : filterStatus === 'ACTIVE'
                ? ['PENDING', 'IN_PROGRESS'].includes(t.status)
                : t.status === filterStatus;
        return matchSearch && matchStatus;
    });

    // Group by priority
    const grouped = PRIORITIES.reduce((acc, p) => {
        acc[p] = displayed.filter(t => t.priority === p);
        return acc;
    }, {});

    const urgentCount = tasks.filter(t => ['L0', 'L1'].includes(t.priority) && ['PENDING', 'IN_PROGRESS'].includes(t.status)).length;

    return (
        <div className="animate-fade-in space-y-6">
            {/* Header */}
            <div className="flex items-end justify-between gap-4 flex-wrap">
                <div>
                    <h2 className="text-3xl font-black text-[#f5f8fb] tracking-tight mb-1">Task Board</h2>
                    <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em]">
                        {displayed.length} งาน
                        {urgentCount > 0 && (
                            <span className="ml-2 text-red-400 animate-pulse">· {urgentCount} งานเร่งด่วน ⚠️</span>
                        )}
                    </p>
                </div>
                <div className="flex gap-2 flex-wrap items-center">
                    {/* View switcher */}
                    <div className="flex bg-white/5 border border-white/10 p-1 rounded-xl">
                        {[
                            { v: 'list',     icon: List,        label: 'List' },
                            { v: 'weekly',   icon: CalendarDays, label: 'Week' },
                            { v: 'calendar', icon: Calendar,    label: 'Month' },
                        ].map(({ v, icon: Icon, label }) => (
                            <button key={v} onClick={() => setViewMode(v)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                                    viewMode === v ? 'bg-[#cc9d37] text-[#0c1a2f]' : 'text-white/40 hover:text-white'
                                }`}>
                                <Icon size={11} />{label}
                            </button>
                        ))}
                    </div>
                    {/* Search — list mode only */}
                    {viewMode === 'list' && (
                        <div className="relative">
                            <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20" />
                            <input
                                type="text" placeholder="ค้นหา..." value={search} onChange={e => setSearch(e.target.value)}
                                className="bg-white/5 border border-white/10 text-white pl-9 pr-4 py-2 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#cc9d37]/40 w-40 transition-all"
                            />
                        </div>
                    )}
                    {canManage && (
                        <button
                            onClick={() => { setEditingTask(null); setShowModal(true); }}
                            className="bg-[#cc9d37] hover:bg-amber-400 text-[#0c1a2f] px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-[#cc9d37]/20 active:scale-95 flex items-center gap-2">
                            <Plus size={12} />สร้างงาน
                        </button>
                    )}
                </div>
            </div>

            {/* Filter bar — list mode only */}
            {viewMode === 'list' && (
            <div className="flex gap-2 flex-wrap">
                {/* Status filter */}
                <div className="flex gap-1 bg-white/5 border border-white/8 rounded-xl p-1">
                    {[
                        { v: 'ACTIVE', label: 'Active' },
                        { v: 'ALL', label: 'ทั้งหมด' },
                        { v: 'DONE', label: 'เสร็จแล้ว' },
                    ].map(({ v, label }) => (
                        <button key={v} onClick={() => setFilterStatus(v)}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${filterStatus === v ? 'bg-[#cc9d37] text-[#0c1a2f]' : 'text-white/40 hover:text-white'}`}>
                            {label}
                        </button>
                    ))}
                </div>

                {/* Priority filter */}
                <div className="flex gap-1 bg-white/5 border border-white/8 rounded-xl p-1">
                    <button onClick={() => setFilterPriority('ALL')}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${filterPriority === 'ALL' ? 'bg-white/15 text-white' : 'text-white/30 hover:text-white'}`}>
                        All
                    </button>
                    {PRIORITIES.map(p => {
                        const cfg = PRIORITY_CONFIG[p];
                        const count = tasks.filter(t => t.priority === p && ['PENDING', 'IN_PROGRESS'].includes(t.status)).length;
                        return (
                            <button key={p} onClick={() => setFilterPriority(p)}
                                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${filterPriority === p ? `${cfg.badge}` : `text-white/30 hover:${cfg.color}`}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                {p}
                                {count > 0 && <span className="ml-0.5 text-[8px]">({count})</span>}
                            </button>
                        );
                    })}
                </div>
            </div>
            )}

            {/* Weekly / Calendar views */}
            {viewMode === 'weekly' && !loading && (
                <WeeklyView tasks={tasks} onEdit={(t) => { setEditingTask(t); setShowModal(true); }} canManage={canManage} />
            )}
            {viewMode === 'calendar' && !loading && (
                <CalendarView tasks={tasks} onEdit={(t) => { setEditingTask(t); setShowModal(true); }} canManage={canManage} />
            )}

            {/* Task list — grouped by priority (list mode) */}
            {viewMode === 'list' && (loading ? (
                <div className="flex items-center justify-center h-48 text-white/20">
                    <Loader2 className="animate-spin" size={24} />
                </div>
            ) : displayed.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-white/20 gap-3">
                    <CheckCircle2 size={40} />
                    <p className="text-sm font-black uppercase tracking-widest">ไม่มีงาน</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {PRIORITIES.map(p => {
                        const group = grouped[p];
                        if (!group || group.length === 0) return null;
                        const cfg = PRIORITY_CONFIG[p];
                        const Icon = cfg.icon;
                        return (
                            <div key={p}>
                                {/* Group header */}
                                <div className={`flex items-center gap-3 mb-3 pb-2 border-b ${cfg.border}`}>
                                    <Icon size={14} className={cfg.color} />
                                    <span className={`text-xs font-black uppercase tracking-widest ${cfg.color}`}>{cfg.label}</span>
                                    <span className={`text-[9px] text-white/30`}>{cfg.desc}</span>
                                    <span className={`ml-auto text-[9px] font-black px-2 py-0.5 rounded-lg ${cfg.badge}`}>{group.length}</span>
                                </div>
                                {/* Task cards */}
                                <div className="space-y-2">
                                    {group.map(task => (
                                        <div key={task.id} className="group">
                                            <TaskCard
                                                task={task}
                                                onUpdatePriority={handleUpdatePriority}
                                                onUpdateStatus={handleUpdateStatus}
                                                onEdit={(t) => { setEditingTask(t); setShowModal(true); }}
                                                onDelete={handleDelete}
                                                canManage={canManage}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ))}

            {/* Create / Edit Modal */}
            {showModal && (
                <TaskModal
                    task={editingTask}
                    employees={employees}
                    customers={customers}
                    onClose={() => { setShowModal(false); setEditingTask(null); }}
                    onSaved={fetchTasks}
                />
            )}
        </div>
    );
}
