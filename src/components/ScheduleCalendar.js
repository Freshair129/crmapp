'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, CalendarDays, Clock, Users, Plus, ChevronLeft, ChevronRight, Grid, List, Loader2, CheckCircle2, X } from 'lucide-react';

// Monday-first
const DOW_TH = ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'];
const DOW_EN = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

// Color palette — assigned per course by hash
const COURSE_PALETTE = [
  'bg-emerald-600 text-white',
  'bg-blue-600 text-white',
  'bg-purple-600 text-white',
  'bg-pink-500 text-white',
  'bg-cyan-600 text-white',
  'bg-indigo-600 text-white',
  'bg-teal-600 text-white',
  'bg-orange-500 text-white',
  'bg-rose-600 text-white',
  'bg-lime-500 text-black',
  'bg-sky-600 text-white',
  'bg-violet-600 text-white',
  'bg-amber-500 text-black',
  'bg-fuchsia-600 text-white',
];

function hashColor(str) {
  let h = 0;
  for (let i = 0; i < (str || '').length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return COURSE_PALETTE[Math.abs(h) % COURSE_PALETTE.length];
}

// Normalise schedule row — works regardless of whether API returns flat or nested fields
function normItem(s) {
  const productName = s.product?.name || s.productName || '';
  const instructorName = s.instructor
    ? (s.instructor.nickName || `${s.instructor.firstName ?? ''} ${s.instructor.lastName ?? ''}`.trim())
    : (s.instructorName || '');
  const courseDays = s.product?.days ?? s.courseDays ?? 1;
  return { ...s, productName, instructorName, courseDays };
}

export default function ScheduleCalendar({ language = 'TH' }) {
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('LIST');
  const [schedules, setSchedules] = useState([]);
  const [calSchedules, setCalSchedules] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [products, setProducts] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [addForm, setAddForm] = useState({
    productId: '',
    scheduledDate: '',
    startTime: '09:00',
    endTime: '13:00',
    maxStudents: 10,
    instructorId: '',
    notes: ''
  });
  const [saving, setSaving] = useState(false);

  const t = {
    TH: {
      title: 'ตารางสอนและรอบเรียน',
      create: 'สร้างรอบใหม่',
      listView: 'รายการ',
      weekView: 'รายสัปดาห์',
      calView: 'ปฏิทิน',
      instructor: 'อาจารย์',
      students: 'นักเรียน',
      upcoming: 'รอบที่จะถึง',
      full: 'เต็มแล้ว',
      open: 'เปิดสอน',
      cancelled: 'ยกเลิก',
      completed: 'สอนเสร็จสิ้น',
      loading: 'กำลังเชื่อมต่อตาราง...',
      dow: DOW_TH,
      mon: 'จันทร์', tue: 'อังคาร', wed: 'พุธ', thu: 'พฤหัส', fri: 'ศุกร์', sat: 'เสาร์', sun: 'อาทิตย์',
      dayUnit: 'วัน'
    },
    EN: {
      title: 'COURSE SCHEDULES',
      create: 'NEW SESSION',
      listView: 'LIST',
      weekView: 'WEEK',
      calView: 'CALENDAR',
      instructor: 'INSTRUCTOR',
      students: 'STUDENTS',
      upcoming: 'UPCOMING',
      full: 'FULL',
      open: 'OPEN',
      cancelled: 'CANCELLED',
      completed: 'COMPLETED',
      loading: 'SYNCING SCHEDULE...',
      dow: DOW_EN,
      mon: 'MON', tue: 'TUE', wed: 'WED', thu: 'THU', fri: 'FRI', sat: 'SAT', sun: 'SUN',
      dayUnit: 'day'
    }
  }[language];

  const statusColors = {
    OPEN: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    FULL: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    CANCELLED: 'bg-red-500/10 text-red-400 border-red-500/20',
    COMPLETED: 'bg-white/5 text-white/40 border-white/10'
  };

  const fetchSchedules = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/schedules?upcoming=true&days=30');
      const data = await res.json();
      setSchedules((Array.isArray(data) ? data : []).map(normItem));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCalendarSchedules = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/schedules');
      const data = await res.json();
      setCalSchedules((Array.isArray(data) ? data : []).map(normItem));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

  useEffect(() => {
    if (view === 'CALENDAR') fetchCalendarSchedules();
  }, [view, currentMonth, fetchCalendarSchedules]);

  useEffect(() => {
    if (!showAddModal) return;
    // Fetch courses (has `days` field) instead of generic products
    fetch('/api/courses?isActive=true')
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : (data.data || []);
        setProducts(list);
      });
    fetch('/api/employees')
      .then(r => r.json())
      .then(data => {
        const list = data.data || data;
        setInstructors(Array.isArray(list) ? list : []);
      });
  }, [showAddModal]);

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...addForm,
          maxStudents: parseInt(addForm.maxStudents),
          instructorId: addForm.instructorId || undefined,
          notes: addForm.notes || undefined,
        })
      });
      if (res.ok) {
        await fetchSchedules();
        if (view === 'CALENDAR') await fetchCalendarSchedules();
        setShowAddModal(false);
        setAddForm({ productId: '', scheduledDate: '', startTime: '09:00', endTime: '13:00', maxStudents: 10, instructorId: '', notes: '' });
      }
    } catch (err) {
      alert('Error creating schedule');
    } finally {
      setSaving(false);
    }
  };

  // ──────────────────────────────────────────
  // Calendar helpers — Monday-first
  // ──────────────────────────────────────────
  const buildCalendarCells = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    // Convert Sun=0 → Mon=0 by shifting: (DOW + 6) % 7
    const firstDOW = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDOW; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  };

  // Expand multi-day courses across consecutive days
  const buildDayMap = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const map = {};
    calSchedules.forEach(s => {
      const startDate = new Date(s.scheduledDate);
      const totalDays = Math.ceil(s.courseDays || s.product?.days || 1);
      for (let offset = 0; offset < totalDays; offset++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + offset);
        if (date.getFullYear() === year && date.getMonth() === month) {
          const day = date.getDate();
          if (!map[day]) map[day] = [];
          map[day].push({ ...s, _offset: offset, _totalDays: totalDays });
        }
      }
    });
    return map;
  };

  const prevMonth = () => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1));

  const today = new Date();
  const isToday = (day) =>
    day &&
    today.getFullYear() === currentMonth.getFullYear() &&
    today.getMonth() === currentMonth.getMonth() &&
    today.getDate() === day;

  // ──────────────────────────────────────────
  // List grouping
  // ──────────────────────────────────────────
  const groupedSchedules = schedules.reduce((groups, schedule) => {
    const date = new Date(schedule.scheduledDate).toLocaleDateString('th-TH', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    if (!groups[date]) groups[date] = [];
    groups[date].push(schedule);
    return groups;
  }, {});

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 space-y-4">
      <Loader2 className="w-12 h-12 text-[#C9A34E] animate-spin" />
      <span className="text-[#C9A34E] font-black animate-pulse uppercase tracking-[0.3em]">{t.loading}</span>
    </div>
  );

  return (
    <div className="bg-[#0A1A2F]/30 backdrop-blur-md rounded-[2.5rem] border border-white/10 p-8">

      {/* ── Header ── */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12">
        <div className="flex items-center gap-6">
          <div className="bg-[#C9A34E] p-4 rounded-3xl shadow-xl shadow-amber-900/30">
            <Calendar size={32} className="text-[#0A1A2F]" />
          </div>
          <div>
            <h2 className="text-4xl font-black text-white uppercase tracking-tighter">{t.title}</h2>
            <span className="text-xs font-black text-[#C9A34E] uppercase tracking-widest">{t.upcoming} ({schedules.length})</span>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-white/5 p-1.5 rounded-2xl border border-white/10">
          {[
            { id: 'LIST', icon: <List size={15} />, label: t.listView },
            { id: 'WEEK', icon: <Grid size={15} />, label: t.weekView },
            { id: 'CALENDAR', icon: <CalendarDays size={15} />, label: t.calView },
          ].map(v => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                view === v.id ? 'bg-[#C9A34E] text-[#0A1A2F]' : 'text-white/40 hover:text-white'
              }`}
            >
              {v.icon} {v.label}
            </button>
          ))}
          <div className="w-px h-6 bg-white/10 mx-1" />
          <button
            onClick={() => setShowAddModal(true)}
            className="p-2.5 rounded-xl bg-emerald-500 text-[#0A1A2F] hover:bg-emerald-400 transition-all"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      {/* ── LIST VIEW ── */}
      {view === 'LIST' && (
        <div className="space-y-12">
          {Object.keys(groupedSchedules).length === 0 && (
            <p className="text-center text-white/30 font-black uppercase tracking-widest py-20">ไม่มีรอบเรียนในช่วงนี้</p>
          )}
          {Object.entries(groupedSchedules).map(([date, items]) => (
            <div key={date}>
              <h3 className="text-xs font-black text-white/20 uppercase tracking-[0.4em] mb-6 flex items-center gap-4">
                {date} <div className="h-px flex-1 bg-white/10" />
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {items.map(item => (
                  <div key={item.id} className="bg-white/5 rounded-[2rem] border border-white/10 p-6 hover:border-[#C9A34E]/40 transition-all group">
                    <div className="flex justify-between items-start mb-6">
                      <div className="space-y-1">
                        <h4 className="text-xl font-black text-white uppercase tracking-tight leading-none group-hover:text-[#C9A34E] transition-colors">{item.productName}</h4>
                        <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">{item.productId}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${statusColors[item.status]}`}>
                        {t[item.status?.toLowerCase()]}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="flex items-center gap-3 text-white/60">
                        <Clock size={16} className="text-[#C9A34E]" />
                        <span className="text-sm font-bold">{item.startTime} - {item.endTime}</span>
                      </div>
                      <div className="flex items-center gap-3 text-white/60">
                        <Users size={16} className="text-[#C9A34E]" />
                        <span className="text-sm font-bold">{item.confirmedStudents} / {item.maxStudents}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#C9A34E] flex items-center justify-center text-[#0A1A2F] text-[10px] font-black">
                          {item.instructorName?.[0] || 'I'}
                        </div>
                        <span className="text-xs font-black text-white/40 uppercase tracking-widest">{item.instructorName}</span>
                      </div>
                      {item.status === 'COMPLETED' && <CheckCircle2 size={18} className="text-emerald-500" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── WEEK VIEW ── */}
      {view === 'WEEK' && (
        <div className="grid grid-cols-7 gap-4 min-h-[500px]">
          {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((day, idx) => {
            // Monday=1 Tue=2 ... Sun=0
            const dowIndex = idx === 6 ? 0 : idx + 1;
            return (
              <div key={day} className="flex flex-col gap-4">
                <div className="text-center py-4 bg-white/5 rounded-2xl border border-white/10">
                  <span className="text-[10px] font-black text-[#C9A34E] uppercase tracking-[0.2em]">{t[day]}</span>
                </div>
                <div className="flex-1 space-y-3">
                  {schedules.filter(s => new Date(s.scheduledDate).getDay() === dowIndex).map(s => (
                    <div key={s.id} className={`p-3 rounded-xl border ${statusColors[s.status]} cursor-pointer hover:scale-105 transition-all shadow-lg`}>
                      <p className="text-[10px] font-black uppercase truncate mb-1">{s.productName}</p>
                      <div className="flex justify-between items-center text-[8px] font-black opacity-60">
                        <span>{s.startTime}</span>
                        <span>{s.confirmedStudents}/{s.maxStudents}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── CALENDAR VIEW ── */}
      {view === 'CALENDAR' && (() => {
        const cells = buildCalendarCells();
        const dayMap = buildDayMap();
        const weeks = [];
        for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
        // Sunday is column index 6 (Mon-first)
        const sunIdx = 6;

        return (
          <div>
            {/* Month nav */}
            <div className="flex items-center justify-between mb-6">
              <button onClick={prevMonth} className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:border-[#C9A34E]/40 transition-all">
                <ChevronLeft size={20} />
              </button>
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter">
                {currentMonth.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
              </h3>
              <button onClick={nextMonth} className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:border-[#C9A34E]/40 transition-all">
                <ChevronRight size={20} />
              </button>
            </div>

            {/* DOW headers */}
            <div className="grid grid-cols-7 border border-white/10 rounded-t-2xl overflow-hidden">
              {(language === 'TH' ? DOW_TH : DOW_EN).map((label, i) => (
                <div
                  key={label}
                  className={`text-center text-xs font-black uppercase tracking-widest py-3 border-r last:border-r-0 border-white/10 ${
                    i === sunIdx ? 'text-red-400 bg-red-500/5' : 'text-white/50 bg-white/[0.03]'
                  }`}
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="border-l border-b border-r border-white/10 rounded-b-2xl overflow-hidden">
              {weeks.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 border-t border-white/10">
                  {week.map((day, di) => {
                    const items = day ? (dayMap[day] || []) : [];
                    const isSun = di === sunIdx;

                    return (
                      <div
                        key={di}
                        className={`min-h-[160px] p-1.5 border-r last:border-r-0 border-white/10 align-top ${
                          !day ? 'bg-black/20' :
                          isToday(day) ? 'bg-[#C9A34E]/8' :
                          isSun ? 'bg-red-500/[0.03]' :
                          'bg-transparent'
                        }`}
                      >
                        {day && (
                          <>
                            {/* Day number */}
                            <div className={`text-xs font-black mb-1.5 w-6 h-6 flex items-center justify-center rounded-full ${
                              isToday(day)
                                ? 'bg-[#C9A34E] text-[#0A1A2F]'
                                : isSun
                                  ? 'text-red-400'
                                  : 'text-white/50'
                            }`}>
                              {day}
                            </div>

                            {/* Events */}
                            <div className="space-y-1">
                              {items.map((s, si) => {
                                const isCancelled = s.status === 'CANCELLED';
                                const isCompleted = s.status === 'COMPLETED';
                                const isFull = s.status === 'FULL';
                                const colorClass = isCancelled
                                  ? 'bg-red-900/50 text-red-300'
                                  : isCompleted
                                    ? 'bg-white/10 text-white/40'
                                    : hashColor(s.productId || s.productName || String(si));
                                const isFirstDay = s._offset === 0;

                                return (
                                  <div
                                    key={`${s.id}-${s._offset}`}
                                    className={`rounded-lg px-2 py-1.5 cursor-pointer hover:brightness-110 transition-all ${colorClass} ${isCancelled ? 'opacity-60' : ''}`}
                                    title={`${s.productName}\n${s.startTime}–${s.endTime}\nนักเรียน: ${s.confirmedStudents}/${s.maxStudents}\nสถานะ: ${s.status}`}
                                  >
                                    {/* Row 1: Course name (large) + DAY indicator */}
                                    <div className="flex items-start justify-between gap-1 mb-0.5">
                                      <p className={`text-[20px] font-black leading-tight break-words flex-1 ${isCancelled ? 'line-through' : ''}`}>
                                        {s.productName}
                                      </p>
                                      {s._totalDays > 1 && (
                                        <span className="text-[8px] font-black opacity-90 whitespace-nowrap shrink-0 mt-px">
                                          DAY {s._offset + 1}
                                        </span>
                                      )}
                                    </div>

                                    {/* Row 2: Time */}
                                    {isFirstDay && s.startTime && (
                                      <p className="text-[9px] opacity-80 font-bold leading-tight">
                                        {s.startTime}{s.endTime ? `–${s.endTime}` : ''}
                                      </p>
                                    )}

                                    {/* Row 3: Chef */}
                                    {isFirstDay && s.instructorName && (
                                      <p className="text-[9px] opacity-75 font-bold leading-tight">
                                        Chef: {s.instructorName}
                                      </p>
                                    )}

                                    {/* Row 4: Student count + status badges */}
                                    {isFirstDay && (
                                      <div className="flex items-center justify-between mt-0.5">
                                        <span className="text-[9px] opacity-80 font-bold">
                                          {s.confirmedStudents}/{s.maxStudents}
                                        </span>
                                        {isFull && (
                                          <span className="text-[7px] font-black bg-amber-400 text-amber-900 rounded px-1 leading-4">เต็ม</span>
                                        )}
                                        {isCancelled && (
                                          <span className="text-[7px] font-black bg-red-400/30 text-red-200 rounded px-1 leading-4">ยกเลิก</span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── Add Modal ── */}
      {showAddModal && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0A1A2F] border border-white/10 rounded-[2rem] w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">

            <div className="flex items-center justify-between px-8 pt-7 pb-5 border-b border-white/10 shrink-0">
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                <Calendar className="text-[#C9A34E]" size={24} /> สร้างรอบเรียนใหม่
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-colors">
                <X size={22} />
              </button>
            </div>

            <div className="overflow-y-auto px-8 py-6 flex-1 min-h-0">
              {(() => {
                const selectedCourse = products.find(p => p.id === addForm.productId);
                const courseDays = selectedCourse ? Math.ceil(selectedCourse.days || 1) : null;
                const endDate = (() => {
                  if (!addForm.scheduledDate || !courseDays) return null;
                  const d = new Date(addForm.scheduledDate);
                  d.setDate(d.getDate() + courseDays - 1);
                  return d.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                })();

                return (
              <form onSubmit={handleCreateSchedule} className="space-y-6">
                {/* Course selector */}
                <div>
                  <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">หลักสูตร / คอร์ส</label>
                  <select
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-[#C9A34E]/50"
                    value={addForm.productId}
                    onChange={e => setAddForm({ ...addForm, productId: e.target.value })}
                  >
                    <option value="">เลือกหลักสูตร...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}{p.days ? ` (${Math.ceil(p.days)} วัน)` : ''}
                      </option>
                    ))}
                  </select>

                  {/* Course info banner — shown after selection */}
                  {selectedCourse && (
                    <div className="mt-2 flex items-center gap-3 px-3 py-2 bg-[#C9A34E]/10 border border-[#C9A34E]/20 rounded-xl">
                      <span className="text-[#C9A34E] text-xs font-black uppercase tracking-widest">
                        {courseDays} วัน
                      </span>
                      <span className="w-px h-4 bg-[#C9A34E]/30" />
                      <span className="text-white/60 text-xs font-bold">
                        {selectedCourse.hours ? `${selectedCourse.hours} ชม.` : ''}
                        {selectedCourse.sessionType ? ` · ${selectedCourse.sessionType.replace(',', ' + ')}` : ''}
                      </span>
                    </div>
                  )}
                </div>

                {/* Date — start only, end auto-computed */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">วันที่เริ่มสอน</label>
                    <input
                      required type="date"
                      className="w-full bg-[#0d2340] border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-[#C9A34E]/50 [color-scheme:dark]"
                      value={addForm.scheduledDate}
                      onChange={e => setAddForm({ ...addForm, scheduledDate: e.target.value })}
                    />
                    {endDate && courseDays > 1 && (
                      <p className="mt-1.5 text-[10px] text-[#C9A34E] font-bold px-1">
                        จบ: {endDate}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">จำนวนนักเรียนสูงสุด</label>
                    <input
                      required type="number"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-[#C9A34E]/50"
                      value={addForm.maxStudents}
                      onChange={e => setAddForm({ ...addForm, maxStudents: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">เวลาเริ่ม</label>
                    <input
                      required type="time"
                      className="w-full bg-[#0d2340] border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-[#C9A34E]/50 [color-scheme:dark]"
                      value={addForm.startTime}
                      onChange={e => setAddForm({ ...addForm, startTime: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">เวลาสิ้นสุด</label>
                    <input
                      required type="time"
                      className="w-full bg-[#0d2340] border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-[#C9A34E]/50 [color-scheme:dark]"
                      value={addForm.endTime}
                      onChange={e => setAddForm({ ...addForm, endTime: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">อาจารย์ผู้สอน (ถ้ามี)</label>
                  <select
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-[#C9A34E]/50"
                    value={addForm.instructorId}
                    onChange={e => setAddForm({ ...addForm, instructorId: e.target.value })}
                  >
                    <option value="">ไม่ระบุ / ค่อยกำหนดภายหลัง</option>
                    {instructors.map(e => (
                      <option key={e.id} value={e.id}>{e.nickName || e.firstName} {e.lastName || ''}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">หมายเหตุ</label>
                  <textarea
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-[#C9A34E]/50 h-24 resize-none"
                    value={addForm.notes}
                    onChange={e => setAddForm({ ...addForm, notes: e.target.value })}
                    placeholder="เช่น ห้องเรียน A, เตรียมอุปกรณ์พิเศษ..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-[#C9A34E] text-[#0A1A2F] font-black rounded-2xl py-4 uppercase tracking-[0.2em] shadow-xl shadow-amber-900/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                >
                  {saving ? 'กำลังสร้าง...' : 'สร้างรอบเรียน'}
                </button>
              </form>
                );
              })()}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
