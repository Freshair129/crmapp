'use client';

/**
 * DragScheduleBuilder — Drag-and-drop schedule creation
 *
 * Layout:
 *   Left (65%): Month calendar — drag targets, preview spans
 *   Right (35%): Course cards panel — draggable
 *
 * Flow on drop:
 *   1. Drop course on day → check conflicts across all rooms
 *   2. If any conflict exists → ConflictModal (list what's booked)
 *   3. Click OK → RoomPickerModal (floor-plan top-view, available vs busy)
 *   4. Select room + instructor → POST /api/schedules → task + push
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    ArrowLeft, ChevronLeft, ChevronRight, Clock, Calendar,
    Users, Check, X, AlertTriangle, Loader2, BookMarked,
    GripVertical, Info
} from 'lucide-react';

// ── Constants ────────────────────────────────────────────────────────────────

const DOW = ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'];

const ROOMS = [
    {
        id: 'SHOWROOM',
        label: 'ห้อง 1',
        sublabel: 'Showroom',
        icon: '🪟',
        desc: 'กระจกใสขนาดใหญ่ — สังเกตการสอนได้จากภายนอก',
        color: 'border-sky-500/60 bg-sky-500/10',
        busyColor: 'border-sky-500/20 bg-sky-500/5',
        activeColor: 'border-sky-400 bg-sky-400/20 ring-2 ring-sky-400/40',
    },
    {
        id: 'LECTURE',
        label: 'ห้อง 2',
        sublabel: 'ห้องกลาง',
        icon: '📺',
        desc: 'เน้น Lecture — มีจอแสดงผล',
        color: 'border-violet-500/60 bg-violet-500/10',
        busyColor: 'border-violet-500/20 bg-violet-500/5',
        activeColor: 'border-violet-400 bg-violet-400/20 ring-2 ring-violet-400/40',
    },
    {
        id: 'MAIN_KITCHEN',
        label: 'ห้อง 3',
        sublabel: 'ครัวหลัก',
        icon: '🔪',
        desc: 'ครัวจริง — ใช้งานเต็มรูปแบบ',
        color: 'border-amber-500/60 bg-amber-500/10',
        busyColor: 'border-amber-500/20 bg-amber-500/5',
        activeColor: 'border-amber-400 bg-amber-400/20 ring-2 ring-amber-400/40',
    },
];

const COURSE_PALETTE = [
    '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#84cc16',
];

function courseColor(id) {
    let h = 0;
    for (let i = 0; i < (id || '').length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
    return COURSE_PALETTE[Math.abs(h) % COURSE_PALETTE.length];
}

function fmt(date) {
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Date helpers ─────────────────────────────────────────────────────────────

/**
 * Parse scheduledDate string to LOCAL midnight (no UTC offset shift).
 * "2026-03-23T17:00:00.000Z" in UTC+7 = Mar 24 00:00 local → wrong.
 * By splitting at 'T' and using Date(y,m,d) we always get local midnight.
 */
function parseLocalDate(dateVal) {
    if (!dateVal) return new Date();
    const str = typeof dateVal === 'string' ? dateVal : dateVal.toISOString();
    const [datePart] = str.split('T');
    const [y, m, d] = datePart.split('-').map(Number);
    return new Date(y, m - 1, d);
}

// ── Conflict helpers ─────────────────────────────────────────────────────────

function scheduleDateRange(s) {
    const start = parseLocalDate(s.scheduledDate);
    const end = new Date(start);
    end.setDate(end.getDate() + Math.max(1, Math.ceil(s.product?.days ?? s.courseDays ?? 1)) - 1);
    end.setHours(23, 59, 59, 0);
    return { start, end };
}

function rangesOverlap(a1, a2, b1, b2) {
    return a1 <= b2 && a2 >= b1;
}

function conflictsForRoom(roomId, start, end, schedules) {
    return schedules.filter(s => {
        if (!s.classroom || s.classroom !== roomId) return false;
        const { start: ss, end: se } = scheduleDateRange(s);
        return rangesOverlap(start, end, ss, se);
    });
}

function allConflicts(start, end, schedules) {
    return schedules.filter(s => {
        const { start: ss, end: se } = scheduleDateRange(s);
        return rangesOverlap(start, end, ss, se);
    });
}

// ── Sub-components ───────────────────────────────────────────────────────────

function CourseDragCard({ course, isDragging, onDragStart, onDragEnd }) {
    const color = courseColor(course.id);
    return (
        <div
            draggable
            onDragStart={e => {
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('courseId', course.id);
                if (onDragStart) onDragStart();
            }}
            onDragEnd={() => { if (onDragEnd) onDragEnd(); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all cursor-grab active:cursor-grabbing select-none
                ${isDragging ? 'opacity-40 scale-95' : 'hover:scale-[1.02] hover:shadow-lg'}`}
            style={{ borderColor: color + '50', background: color + '15' }}
        >
            <GripVertical size={14} className="text-white/20 shrink-0" />
            <div
                className="w-2 h-10 rounded-full shrink-0"
                style={{ background: color }}
            />
            <div className="flex-1 min-w-0">
                <p className="text-white font-black text-xs uppercase tracking-wide truncate">{course.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                    {course.days && (
                        <span className="text-[10px] font-bold text-white/40">{course.days === 0.5 ? '½ วัน' : `${course.days} วัน`}</span>
                    )}
                    {course.hours && (
                        <span className="text-[10px] font-bold text-white/30 flex items-center gap-0.5">
                            <Clock size={9} />{course.hours}h
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

function ConflictModal({ conflicts, dateRange, onClose }) {
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
            <div className="bg-[#0c1a2f] border border-amber-500/40 rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden">
                <div className="px-6 pt-6 pb-4 border-b border-white/10 flex items-center gap-3">
                    <AlertTriangle className="text-amber-400 shrink-0" size={22} />
                    <div>
                        <h3 className="font-black text-white uppercase tracking-tight">ช่วงเวลานี้มีการใช้งานอยู่</h3>
                        <p className="text-white/40 text-xs mt-0.5">{fmt(dateRange.start)} – {fmt(dateRange.end)}</p>
                    </div>
                </div>
                <div className="px-6 py-4 space-y-2 max-h-56 overflow-y-auto">
                    {conflicts.map(s => (
                        <div key={s.id} className="flex items-center gap-3 bg-white/5 rounded-xl px-3 py-2.5">
                            <div className="w-2 h-8 rounded-full shrink-0" style={{ background: courseColor(s.productId) }} />
                            <div>
                                <p className="text-white text-sm font-bold">{s.product?.name || s.productName}</p>
                                <p className="text-white/40 text-[10px]">
                                    {s.instructor ? `เชฟ ${s.instructor.nickName || s.instructor.firstName}` : 'ไม่ระบุเชฟ'}
                                    {s.classroom ? ` · ${ROOMS.find(r => r.id === s.classroom)?.label ?? s.classroom}` : ''}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="px-6 py-4 border-t border-white/10">
                    <p className="text-white/40 text-xs mb-3">กด <strong className="text-white">ดำเนินการต่อ</strong> เพื่อเลือกห้องที่ว่างอยู่</p>
                    <button
                        onClick={onClose}
                        className="w-full bg-amber-500 text-[#0c1a2f] font-black rounded-2xl py-3 uppercase tracking-widest hover:bg-amber-400 transition-all"
                    >
                        ดำเนินการต่อ — เลือกห้อง
                    </button>
                </div>
            </div>
        </div>
    );
}

function RoomPickerModal({ course, dateRange, schedules, employees, onConfirm, onClose }) {
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [selectedInstructor, setSelectedInstructor] = useState('');
    const [maxStudents, setMaxStudents] = useState(10);
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('13:00');
    const [saving, setSaving] = useState(false);

    const roomStatus = ROOMS.map(room => {
        const conflicts = conflictsForRoom(room.id, dateRange.start, dateRange.end, schedules);
        return { ...room, conflicts, available: conflicts.length === 0 };
    });

    const inputCls = 'w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm font-bold focus:outline-none focus:border-[#cc9d37]/50';

    async function handleConfirm() {
        if (!selectedRoom) return;
        setSaving(true);
        await onConfirm({
            productId: course.id,
            scheduledDate: dateRange.start.toISOString().split('T')[0],
            classroom: selectedRoom,
            instructorId: selectedInstructor || undefined,
            maxStudents: parseInt(maxStudents),
            startTime,
            endTime,
        });
        setSaving(false);
    }

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
            <div className="bg-[#0c1a2f] border border-white/10 rounded-[2rem] w-full max-w-lg shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
                {/* Header */}
                <div className="px-6 pt-6 pb-4 border-b border-white/10 shrink-0">
                    <h3 className="font-black text-white uppercase tracking-tight text-lg flex items-center gap-2">
                        <span>🏫</span> เลือกห้องเรียน
                    </h3>
                    <p className="text-white/40 text-xs mt-1">
                        {course.name} · {fmt(dateRange.start)}{dateRange.start.toDateString() !== dateRange.end.toDateString() ? ` – ${fmt(dateRange.end)}` : ''}
                    </p>
                </div>

                <div className="overflow-y-auto px-6 py-5 flex-1 min-h-0 space-y-5">
                    {/* Floor plan */}
                    <div>
                        <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] mb-3">แปลนห้องเรียน (top view)</p>
                        <div className="space-y-2">
                            {/* Row 1: Room 1 + Room 2 */}
                            <div className="grid grid-cols-2 gap-2">
                                {roomStatus.slice(0, 2).map(room => (
                                    <RoomCard
                                        key={room.id}
                                        room={room}
                                        selected={selectedRoom === room.id}
                                        onSelect={() => room.available && setSelectedRoom(room.id)}
                                    />
                                ))}
                            </div>
                            {/* Row 2: Room 3 (full width) */}
                            {roomStatus.slice(2).map(room => (
                                <RoomCard
                                    key={room.id}
                                    room={room}
                                    selected={selectedRoom === room.id}
                                    onSelect={() => room.available && setSelectedRoom(room.id)}
                                    wide
                                />
                            ))}
                        </div>
                    </div>

                    {/* Instructor + Time */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">เชฟ/อาจารย์</label>
                            <select className={inputCls} value={selectedInstructor} onChange={e => setSelectedInstructor(e.target.value)}>
                                <option value="">ยังไม่ระบุ</option>
                                {employees.map(e => (
                                    <option key={e.id} value={e.id}>{e.nickName || e.firstName} {e.lastName || ''}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">นักเรียนสูงสุด</label>
                            <input type="number" min="1" className={inputCls} value={maxStudents} onChange={e => setMaxStudents(e.target.value)} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">เวลาเริ่ม</label>
                            <input type="time" className={`${inputCls} [color-scheme:dark]`} value={startTime} onChange={e => setStartTime(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">เวลาสิ้นสุด</label>
                            <input type="time" className={`${inputCls} [color-scheme:dark]`} value={endTime} onChange={e => setEndTime(e.target.value)} />
                        </div>
                    </div>
                </div>

                <div className="px-6 pb-6 pt-4 border-t border-white/10 flex gap-3 shrink-0">
                    <button onClick={onClose} className="px-4 py-3 rounded-2xl border border-white/10 text-white/40 hover:text-white text-sm font-black uppercase tracking-widest transition-all">
                        ยกเลิก
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!selectedRoom || saving}
                        className="flex-1 bg-[#cc9d37] text-[#0c1a2f] font-black rounded-2xl py-3 uppercase tracking-[0.15em] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                        {saving ? <><Loader2 size={16} className="animate-spin" /> กำลังสร้าง...</> : <><Check size={16} /> ยืนยันสร้างรอบเรียน</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

function RoomCard({ room, selected, onSelect, wide = false }) {
    const { available, conflicts } = room;

    let cls = `rounded-2xl border p-3 transition-all relative overflow-hidden ${wide ? 'min-h-[80px]' : 'min-h-[100px]'}`;
    if (!available) {
        cls += ` cursor-not-allowed opacity-70 ${room.busyColor}`;
    } else if (selected) {
        cls += ` cursor-pointer ${room.activeColor}`;
    } else {
        cls += ` cursor-pointer ${room.color} hover:scale-[1.02]`;
    }

    return (
        <div className={cls} onClick={onSelect}>
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-sm">{room.icon}</span>
                        <span className="text-white font-black text-xs uppercase tracking-wide">{room.label}</span>
                        <span className="text-white/40 text-[10px]">— {room.sublabel}</span>
                    </div>
                    <p className="text-white/30 text-[10px]">{room.desc}</p>
                </div>
                {selected && available && (
                    <div className="w-5 h-5 rounded-full bg-[#cc9d37] flex items-center justify-center shrink-0">
                        <Check size={11} className="text-[#0c1a2f]" />
                    </div>
                )}
                {!available && (
                    <div className="shrink-0 bg-red-500/20 border border-red-500/30 rounded-lg px-1.5 py-0.5">
                        <span className="text-red-400 text-[9px] font-black uppercase">ไม่ว่าง</span>
                    </div>
                )}
            </div>
            {!available && conflicts.length > 0 && (
                <div className="mt-2 space-y-1">
                    {conflicts.slice(0, 2).map(s => (
                        <div key={s.id} className="text-[10px] text-white/40 flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: courseColor(s.productId) }} />
                            <span className="truncate">{s.product?.name || s.productName}</span>
                            {s.instructor && <span className="text-white/25">· {s.instructor.nickName || s.instructor.firstName}</span>}
                        </div>
                    ))}
                </div>
            )}
            {available && !selected && (
                <p className="text-[10px] text-emerald-400 font-bold mt-1.5">✓ ว่าง — กดเพื่อเลือก</p>
            )}
        </div>
    );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function DragScheduleBuilder({ onBack, onCreated }) {
    const [currentMonth, setCurrentMonth] = useState(() => {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), 1);
    });
    const [courses, setCourses] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [schedules, setSchedules] = useState([]);
    const [loadingData, setLoadingData] = useState(true);

    // Drag state
    const [draggingId, setDraggingId] = useState(null);
    const [hoverDay, setHoverDay] = useState(null);

    // Hover tooltip state
    const [hoveredSchedule, setHoveredSchedule] = useState(null); // { schedule, rect }

    // Action menu state
    const [actionMenu, setActionMenu] = useState(null); // { schedule, rect }
    const [actionLoading, setActionLoading] = useState(false);

    // Modal state
    const [conflictModal, setConflictModal] = useState(null); // { conflicts, dateRange, course }
    const [roomModal, setRoomModal] = useState(null);         // { course, dateRange }

    const [successMsg, setSuccessMsg] = useState('');

    // Load data on mount
    useEffect(() => {
        Promise.all([
            fetch('/api/courses?isActive=true').then(r => r.json()),
            fetch('/api/employees').then(r => r.json()),
            fetch('/api/schedules').then(r => r.json()),
        ]).then(([cData, eData, sData]) => {
            const cList = Array.isArray(cData) ? cData : (cData.data ?? []);
            setCourses(cList); // /api/courses already filters by COURSE_CATEGORIES

            const eList = eData.data ?? eData;
            setEmployees(Array.isArray(eList) ? eList : []);

            const sList = Array.isArray(sData) ? sData : [];
            setSchedules(sList.map(s => ({
                ...s,
                productName: s.product?.name ?? s.productName ?? '',
                instructorName: s.instructor
                    ? (s.instructor.nickName || `${s.instructor.firstName ?? ''} ${s.instructor.lastName ?? ''}`.trim())
                    : '',
                courseDays: s.product?.days ?? s.courseDays ?? 1,
            })));
            setLoadingData(false);
        }).catch(() => setLoadingData(false));
    }, []);

    // Calendar helpers
    const buildCells = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDOW = (new Date(year, month, 1).getDay() + 6) % 7;
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const cells = [];
        for (let i = 0; i < firstDOW; i++) cells.push(null);
        for (let d = 1; d <= daysInMonth; d++) cells.push(d);
        while (cells.length % 7 !== 0) cells.push(null);
        return cells;
    };

    const buildDayMap = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const map = {};
        schedules.forEach(s => {
            // Use parseLocalDate to avoid UTC→local timezone shift (e.g. UTC+7 midnight stored as prev-day UTC)
            const startDate = parseLocalDate(s.scheduledDate);
            const totalDays = Math.max(1, Math.ceil(s.courseDays || 1));
            for (let offset = 0; offset < totalDays; offset++) {
                const d = new Date(startDate);
                d.setDate(d.getDate() + offset);   // use d's own getDate(), not startDate
                if (d.getFullYear() === year && d.getMonth() === month) {
                    const day = d.getDate();
                    if (!map[day]) map[day] = [];
                    map[day].push({ ...s, _offset: offset, _total: totalDays });
                }
            }
        });
        return map;
    };

    // Compute which days are in the preview range
    const getPreviewDays = () => {
        if (!hoverDay || !draggingId) return new Set();
        const course = courses.find(c => c.id === draggingId);
        if (!course) return new Set();
        const totalDays = Math.max(1, Math.ceil(course.days ?? 1));
        const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
        const result = new Set();
        for (let i = 0; i < totalDays; i++) {
            const d = hoverDay + i;
            if (d <= daysInMonth) result.add(d);
        }
        return result;
    };

    // Drop handler — accepts explicit courseId to avoid stale-closure race
    const handleDrop = (day, courseId) => {
        const cid = courseId || draggingId;
        if (!day || !cid) return;
        const course = courses.find(c => c.id === cid);
        if (!course) return;

        const totalDays = Math.max(1, Math.ceil(course.days ?? 1));
        const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + totalDays - 1);
        end.setHours(23, 59, 59, 0);

        const conflicts = allConflicts(start, end, schedules);
        const dateRange = { start, end };

        setHoverDay(null);
        setDraggingId(null);

        if (conflicts.length > 0) {
            setConflictModal({ conflicts, dateRange, course });
        } else {
            setRoomModal({ course, dateRange });
        }
    };

    // Confirm schedule creation
    const handleConfirmSchedule = async (formData) => {
        const res = await fetch('/api/schedules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
        });
        if (!res.ok) throw new Error('Failed to create schedule');
        const newSchedule = await res.json();

        // Create task for instructor (if assigned)
        if (formData.instructorId) {
            const dateStr = formData.scheduledDate;
            const course = courses.find(c => c.id === formData.productId);
            await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: `สอนคอร์ส: ${course?.name ?? 'คอร์ส'} — ${dateStr}`,
                    description: `รอบเรียน ${newSchedule.scheduleId} · ${ROOMS.find(r => r.id === formData.classroom)?.label ?? formData.classroom}`,
                    type: 'GENERAL',
                    taskType: 'SINGLE',
                    priority: 'L2',
                    assigneeId: formData.instructorId,
                    dueDate: dateStr,
                    timeStart: formData.startTime,
                    timeEnd: formData.endTime,
                }),
            }).catch(() => {}); // ไม่ block ถ้า task fail

            // Push notification (best-effort)
            fetch('/api/workers/notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'SCHEDULE_ASSIGNED',
                    title: '📅 รอบเรียนใหม่ถูกสร้าง',
                    body: `คุณได้รับมอบหมายให้สอน "${course?.name}" วันที่ ${dateStr}`,
                    employeeId: formData.instructorId,
                }),
            }).catch(() => {});
        }

        // Refresh schedule list
        const updatedRes = await fetch('/api/schedules');
        const updatedData = await updatedRes.json();
        setSchedules((Array.isArray(updatedData) ? updatedData : []).map(s => ({
            ...s,
            productName: s.product?.name ?? s.productName ?? '',
            instructorName: s.instructor
                ? (s.instructor.nickName || `${s.instructor.firstName ?? ''} ${s.instructor.lastName ?? ''}`.trim())
                : '',
            courseDays: s.product?.days ?? s.courseDays ?? 1,
        })));

        setRoomModal(null);
        setConflictModal(null);

        const courseName = courses.find(c => c.id === formData.productId)?.name ?? 'คอร์ส';
        setSuccessMsg(`✅ สร้างรอบ "${courseName}" เรียบร้อยแล้ว`);
        setTimeout(() => setSuccessMsg(''), 4000);

        if (onCreated) onCreated(newSchedule);
    };

    // ── Schedule action handlers ──────────────────────────────────────────────

    const handleStatusChange = async (scheduleId, status) => {
        setActionLoading(true);
        try {
            const res = await fetch(`/api/schedules/${scheduleId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
            if (!res.ok) throw new Error('Failed');
            // Update local state — keep schedule in list but change status
            setSchedules(prev => prev.map(s =>
                s.id === scheduleId ? { ...s, status } : s
            ));
            setActionMenu(null);
            setSuccessMsg(status === 'CANCELLED' ? '❌ ยกเลิกคลาสเรียบร้อย' : '📅 เลื่อนคลาสเรียบร้อย');
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (e) {
            alert('เกิดข้อผิดพลาด กรุณาลองใหม่');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteSchedule = async (scheduleId) => {
        if (!confirm('ยืนยันลบรอบเรียนนี้? ไม่สามารถกู้คืนได้')) return;
        setActionLoading(true);
        try {
            const res = await fetch(`/api/schedules/${scheduleId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed');
            setSchedules(prev => prev.filter(s => s.id !== scheduleId));
            setActionMenu(null);
            setSuccessMsg('🗑 ลบรอบเรียนเรียบร้อย');
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (e) {
            alert('เกิดข้อผิดพลาด กรุณาลองใหม่');
        } finally {
            setActionLoading(false);
        }
    };

    const cells = buildCells();
    const dayMap = buildDayMap();
    const previewDays = getPreviewDays();
    const today = new Date();

    const monthLabel = currentMonth.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });

    if (loadingData) return (
        <div className="flex flex-col items-center justify-center p-20 gap-4">
            <Loader2 size={36} className="text-[#cc9d37] animate-spin" />
            <span className="text-[#cc9d37] font-black uppercase tracking-[0.3em] animate-pulse">กำลังโหลดข้อมูล...</span>
        </div>
    );

    return (
        <div className="bg-[#0c1a2f]/30 backdrop-blur-md rounded-[2.5rem] border border-white/10 p-6 flex flex-col gap-6">

            {/* ── Top bar ── */}
            <div className="flex items-center justify-between">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-white/40 hover:text-white text-xs font-black uppercase tracking-widest transition-colors"
                >
                    <ArrowLeft size={16} /> กลับ
                </button>
                <div className="text-center">
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight">สร้างรอบเรียนใหม่</h2>
                    <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest">ลากคอร์สวางในปฏิทินเพื่อสร้างรอบเรียน</p>
                </div>
                <div className="w-24" />
            </div>

            {/* Success toast */}
            {successMsg && (
                <div className="bg-emerald-500/20 border border-emerald-500/40 rounded-2xl px-4 py-3 text-emerald-400 text-sm font-bold text-center">
                    {successMsg}
                </div>
            )}

            {/* ── Main layout: Calendar + Course Panel ── */}
            <div className="flex gap-5">

                {/* ── LEFT: Calendar ── */}
                <div className="flex-1 min-w-0">
                    {/* Month nav */}
                    <div className="flex items-center justify-between mb-4">
                        <button
                            onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                            className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <h3 className="text-white font-black uppercase tracking-widest text-sm">{monthLabel}</h3>
                        <button
                            onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                            className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>

                    {/* DOW headers */}
                    <div className="grid grid-cols-7 mb-1">
                        {DOW.map(d => (
                            <div key={d} className="text-center text-[10px] font-black text-white/20 uppercase tracking-widest py-2">
                                {d}
                            </div>
                        ))}
                    </div>

                    {/* Cells */}
                    <div className="grid grid-cols-7 gap-1">
                        {cells.map((day, idx) => {
                            const isToday2 = day &&
                                today.getFullYear() === currentMonth.getFullYear() &&
                                today.getMonth() === currentMonth.getMonth() &&
                                today.getDate() === day;
                            const isPreview = previewDays.has(day);
                            const isHoverStart = day === hoverDay && draggingId;
                            const items = day ? (dayMap[day] || []) : [];

                            return (
                                <div
                                    key={idx}
                                    onDragOver={e => {
                                        if (!day) return;
                                        e.preventDefault();
                                        e.dataTransfer.dropEffect = 'copy';
                                        setHoverDay(day);
                                    }}
                                    onDragLeave={e => {
                                        // Only clear if leaving the cell entirely
                                        if (!e.currentTarget.contains(e.relatedTarget)) {
                                            setHoverDay(null);
                                        }
                                    }}
                                    onDrop={e => {
                                        e.preventDefault();
                                        const id = e.dataTransfer.getData('courseId');
                                        setHoverDay(null);
                                        setDraggingId(null);
                                        if (id && day) handleDrop(day, id);
                                    }}
                                    className={`min-h-[72px] rounded-xl border transition-all relative overflow-hidden
                                        ${!day ? 'border-transparent' : ''}
                                        ${day && !isPreview ? 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04]' : ''}
                                        ${isPreview ? 'border-[#cc9d37]/50 bg-[#cc9d37]/15 scale-[1.02]' : ''}
                                        ${isHoverStart ? 'ring-2 ring-[#cc9d37]/60' : ''}
                                    `}
                                >
                                    {day && (
                                        <>
                                            {/* Day number */}
                                            <div className={`text-[11px] font-black p-1.5 leading-none ${
                                                isToday2 ? 'text-[#cc9d37]' :
                                                isPreview ? 'text-[#cc9d37]' : 'text-white/30'
                                            }`}>
                                                {isToday2 ? (
                                                    <span className="w-5 h-5 rounded-full bg-[#cc9d37] text-[#0c1a2f] flex items-center justify-center text-[10px]">
                                                        {day}
                                                    </span>
                                                ) : day}
                                            </div>

                                            {/* Preview label */}
                                            {isHoverStart && draggingId && (
                                                <div className="absolute inset-x-1 top-6 flex items-center justify-center">
                                                    <span className="text-[9px] font-black text-[#cc9d37] uppercase tracking-widest bg-[#cc9d37]/20 px-1.5 py-0.5 rounded-full">
                                                        {courses.find(c => c.id === draggingId)?.days ?? 1}d
                                                    </span>
                                                </div>
                                            )}

                                            {/* Existing schedules */}
                                            <div className="px-0.5 pb-1 space-y-0.5 mt-1">
                                                {items.slice(0, 3).map((s, si) => {
                                                    const isStart = s._offset === 0;
                                                    const isEnd = s._offset === s._total - 1;
                                                    const isCancelled = s.status === 'CANCELLED';
                                                    const isPostponed = s.status === 'POSTPONED';
                                                    const isInactive = isCancelled || isPostponed;
                                                    const barColor = isInactive ? '#6b7280' : courseColor(s.productId);
                                                    // Label: "ชื่อคอร์ส Day N" on every cell
                                                    const dayLabel = s._total > 1 ? ` D${s._offset + 1}` : '';
                                                    const statusBadge = isCancelled ? ' ❌' : isPostponed ? ' 📅' : '';
                                                    const label = isStart
                                                        ? `${s.productName}${dayLabel}${statusBadge}`
                                                        : `${s.productName}${dayLabel}${statusBadge}`;
                                                    return (
                                                        <div
                                                            key={`${s.id}-${si}`}
                                                            onMouseEnter={e => {
                                                                setHoveredSchedule({ schedule: s, rect: e.currentTarget.getBoundingClientRect() });
                                                            }}
                                                            onMouseLeave={() => setHoveredSchedule(null)}
                                                            onClick={e => {
                                                                e.stopPropagation();
                                                                setHoveredSchedule(null);
                                                                setActionMenu(prev =>
                                                                    prev?.schedule?.id === s.id && prev?._offset === s._offset
                                                                        ? null
                                                                        : { schedule: s, rect: e.currentTarget.getBoundingClientRect() }
                                                                );
                                                            }}
                                                            className="h-4 flex items-center text-[8px] font-black text-white cursor-pointer select-none overflow-hidden"
                                                            style={{
                                                                background: barColor + (isInactive ? '80' : 'cc'),
                                                                paddingLeft: isStart ? '5px' : '2px',
                                                                paddingRight: isEnd ? '5px' : '2px',
                                                                borderRadius: `${isStart ? '3px' : '0'} ${isEnd ? '3px' : '0'} ${isEnd ? '3px' : '0'} ${isStart ? '3px' : '0'}`,
                                                                marginLeft: isStart ? '0' : '-1px',
                                                                marginRight: isEnd ? '0' : '-1px',
                                                                opacity: isInactive ? 0.7 : 1,
                                                            }}
                                                        >
                                                            <span className="truncate">{label}</span>
                                                        </div>
                                                    );
                                                })}
                                                {items.length > 3 && (
                                                    <div className="text-[9px] text-white/30 font-bold px-1">+{items.length - 3}</div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Legend */}
                    <div className="mt-4 flex items-center gap-4 text-[10px] text-white/20 font-bold">
                        <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-sm bg-[#cc9d37]/30" /> ช่วงที่จะสร้าง
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-sm bg-emerald-500/50" /> มีคลาสแล้ว
                        </span>
                        <span className="flex items-center gap-1">
                            <Info size={10} /> ลากคอร์สจากด้านขวามาวางที่วันที่ต้องการ
                        </span>
                    </div>
                </div>

                {/* ── RIGHT: Course Panel ── */}
                <div className="w-72 shrink-0 flex flex-col gap-3">
                    <div>
                        <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <GripVertical size={12} /> คอร์สเรียน ({courses.length})
                        </p>
                        <p className="text-[9px] text-white/20 font-bold mb-3">ลากคอร์สมาวางที่วันในปฏิทิน</p>
                    </div>
                    <div
                        className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[600px]"
                        style={{ scrollbarWidth: 'thin' }}
                    >
                        {courses.length === 0 && (
                            <p className="text-white/20 text-xs italic text-center py-8">ไม่มีคอร์สเรียน</p>
                        )}
                        {courses.map(c => (
                            <CourseDragCard
                                key={c.id}
                                course={c}
                                isDragging={draggingId === c.id}
                                onDragStart={() => setDraggingId(c.id)}
                                onDragEnd={() => setDraggingId(null)}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Modals ── */}
            {conflictModal && (
                <ConflictModal
                    conflicts={conflictModal.conflicts}
                    dateRange={conflictModal.dateRange}
                    onClose={() => {
                        setRoomModal({ course: conflictModal.course, dateRange: conflictModal.dateRange });
                        setConflictModal(null);
                    }}
                />
            )}

            {roomModal && (
                <RoomPickerModal
                    course={roomModal.course}
                    dateRange={roomModal.dateRange}
                    schedules={schedules}
                    employees={employees}
                    onConfirm={handleConfirmSchedule}
                    onClose={() => setRoomModal(null)}
                />
            )}

            {/* ── Action Menu ── */}
            {actionMenu && (() => {
                const { schedule: s, rect } = actionMenu;
                const isCancelled = s.status === 'CANCELLED';
                const isPostponed = s.status === 'POSTPONED';
                const isActive = !isCancelled && !isPostponed;
                const menuLeft = Math.min(rect.left, window.innerWidth - 200);
                const menuTop = rect.bottom + 4;
                return (
                    <>
                        {/* Click-outside overlay */}
                        <div
                            className="fixed inset-0 z-[140]"
                            onClick={() => setActionMenu(null)}
                        />
                        <div
                            className="fixed z-[150] bg-[#0c1a2f] border border-white/20 rounded-xl shadow-2xl overflow-hidden w-44"
                            style={{ left: menuLeft, top: menuTop }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="px-3 py-2 border-b border-white/10">
                                <p className="text-white font-black text-[10px] truncate" style={{ color: courseColor(s.productId) }}>
                                    {s.productName}
                                </p>
                                <p className="text-white/30 text-[9px] font-bold mt-0.5">
                                    {s.status === 'CANCELLED' ? '❌ ยกเลิกแล้ว' : s.status === 'POSTPONED' ? '📅 เลื่อนแล้ว' : `📌 ${s.status}`}
                                </p>
                            </div>
                            <div className="py-1">
                                {isActive && (
                                    <button
                                        disabled={actionLoading}
                                        onClick={() => handleStatusChange(s.id, 'CANCELLED')}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-black text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                                    >
                                        <X size={11} /> ยกเลิกคลาส
                                    </button>
                                )}
                                {isActive && (
                                    <button
                                        disabled={actionLoading}
                                        onClick={() => handleStatusChange(s.id, 'POSTPONED')}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-black text-amber-400 hover:bg-amber-500/10 transition-colors disabled:opacity-40"
                                    >
                                        <Calendar size={11} /> เลื่อนคลาส
                                    </button>
                                )}
                                {(isCancelled || isPostponed) && (
                                    <button
                                        disabled={actionLoading}
                                        onClick={() => handleStatusChange(s.id, 'OPEN')}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-black text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-40"
                                    >
                                        <Check size={11} /> คืนสถานะ OPEN
                                    </button>
                                )}
                                <div className="border-t border-white/10 my-1" />
                                <button
                                    disabled={actionLoading}
                                    onClick={() => handleDeleteSchedule(s.id)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-black text-white/40 hover:bg-red-500/10 hover:text-red-400 transition-colors disabled:opacity-40"
                                >
                                    {actionLoading ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
                                    ลบรอบเรียน
                                </button>
                            </div>
                        </div>
                    </>
                );
            })()}

            {/* ── Hover Tooltip ── */}
            {hoveredSchedule && !actionMenu && (() => {
                const { schedule: s, rect } = hoveredSchedule;
                const startLocal = parseLocalDate(s.scheduledDate);
                const endLocal = new Date(startLocal);
                endLocal.setDate(endLocal.getDate() + Math.max(1, s._total ?? 1) - 1);
                const fmtDate = (d) => d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
                const roomLabel = ROOMS.find(r => r.id === s.classroom)?.label ?? s.classroom ?? '—';
                return (
                    <div
                        className="fixed z-[200] pointer-events-none"
                        style={{
                            left: Math.min(rect.left + rect.width / 2, window.innerWidth - 220),
                            top: rect.bottom + 6,
                        }}
                    >
                        <div className="bg-[#0c1a2f] border border-white/20 rounded-xl shadow-2xl p-3 w-52 text-xs">
                            <p className="text-white font-black truncate mb-1.5" style={{ color: courseColor(s.productId) }}>
                                {s.productName}
                            </p>
                            <div className="space-y-1 text-white/50 font-bold">
                                <div className="flex items-center gap-2">
                                    <Calendar size={10} className="shrink-0" />
                                    {s._total > 1
                                        ? `${fmtDate(startLocal)} — ${fmtDate(endLocal)}`
                                        : fmtDate(startLocal)
                                    }
                                </div>
                                {s.startTime && (
                                    <div className="flex items-center gap-2">
                                        <Clock size={10} className="shrink-0" />
                                        {s.startTime}{s.endTime ? ` — ${s.endTime}` : ''}
                                    </div>
                                )}
                                {s.instructorName && (
                                    <div className="flex items-center gap-2">
                                        <Users size={10} className="shrink-0" />
                                        {s.instructorName}
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <BookMarked size={10} className="shrink-0" />
                                    {roomLabel}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Users size={10} className="shrink-0" />
                                    {s.enrollmentCount ?? 0} / {s.maxStudents ?? '—'} คน
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
