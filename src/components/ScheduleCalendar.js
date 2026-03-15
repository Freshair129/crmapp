'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Clock, Users, Plus, ChevronLeft, ChevronRight, Grid, List, Loader2, MapPin, CheckCircle2, X } from 'lucide-react';

export default function ScheduleCalendar({ language = 'TH' }) {
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('LIST');
  const [schedules, setSchedules] = useState([]);
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
      gridView: 'รายสัปดาห์',
      instructor: 'อาจารย์',
      students: 'นักเรียน',
      upcoming: 'รอบที่จะถึง',
      full: 'เต็มแล้ว',
      open: 'เปิดรับสมัคร',
      cancelled: 'ยกเลิก',
      completed: 'สอนเสร็จสิ้น',
      loading: 'กำลังเชื่อมต่อตาราง...',
      mon: 'จันทร์', tue: 'อังคาร', wed: 'พุธ', thu: 'พฤหัส', fri: 'ศุกร์', sat: 'เสาร์', sun: 'อาทิตย์'
    },
    EN: {
      title: 'COURSE SCHEDULES',
      create: 'NEW SESSION',
      listView: 'LIST',
      gridView: 'WEEK',
      instructor: 'INSTRUCTOR',
      students: 'STUDENTS',
      upcoming: 'UPCOMING',
      full: 'FULL',
      open: 'OPEN',
      cancelled: 'CANCELLED',
      completed: 'COMPLETED',
      loading: 'SYNCING SCHEDULE...',
      mon: 'MON', tue: 'TUE', wed: 'WED', thu: 'THU', fri: 'FRI', sat: 'SAT', sun: 'SUN'
    }
  }[language];

  useEffect(() => {
    fetchSchedules();
  }, []);

  useEffect(() => {
    if (showAddModal) {
      // Fetch Products
      fetch('/api/products')
        .then(r => r.json())
        .then(data => {
          const list = data.data || data;
          setProducts(Array.isArray(list) ? list.filter(p => p.isActive !== false) : []);
        });
      
      // Fetch Instructors
      fetch('/api/employees')
        .then(r => r.json())
        .then(data => {
          const list = data.data || data;
          setInstructors(Array.isArray(list) ? list : []);
        });
    }
  }, [showAddModal]);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/schedules?upcoming=true&days=30');
      const data = await res.json();
      setSchedules(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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
        setShowAddModal(false);
        setAddForm({
          productId: '',
          scheduledDate: '',
          startTime: '09:00',
          endTime: '13:00',
          maxStudents: 10,
          instructorId: '',
          notes: ''
        });
      }
    } catch (err) {
      alert('Error creating schedule');
    } finally {
      setSaving(false);
    }
  };

  const statusColors = {
    OPEN: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    FULL: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    CANCELLED: 'bg-red-500/10 text-red-500 border-red-500/20',
    COMPLETED: 'bg-white/5 text-white/40 border-white/10'
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 space-y-4">
      <Loader2 className="w-12 h-12 text-[#C9A34E] animate-spin" />
      <span className="text-[#C9A34E] font-black animate-pulse uppercase tracking-[0.3em]">{t.loading}</span>
    </div>
  );

  // Grouping by date for list view
  const groupedSchedules = schedules.reduce((groups, schedule) => {
    const date = new Date(schedule.scheduledDate).toLocaleDateString('th-TH', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    if (!groups[date]) groups[date] = [];
    groups[date].push(schedule);
    return groups;
  }, {});

  return (
    <div className="bg-[#0A1A2F]/30 backdrop-blur-md rounded-[2.5rem] border border-white/10 p-8">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12">
        <div className="flex items-center gap-6">
          <div className="bg-[#C9A34E] p-4 rounded-3xl shadow-xl shadow-amber-900/30">
            <Calendar size={32} className="text-[#0A1A2F]" />
          </div>
          <div>
            <h2 className="text-4xl font-black text-white uppercase tracking-tighter">{t.title}</h2>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-xs font-black text-[#C9A34E] uppercase tracking-widest">{t.upcoming} ({schedules.length})</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-white/5 p-1.5 rounded-2xl border border-white/10">
          <button
            onClick={() => setView('LIST')}
            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
              view === 'LIST' ? 'bg-[#C9A34E] text-[#0A1A2F]' : 'text-white/40 hover:text-white'
            }`}
          >
            <List size={16} /> {t.listView}
          </button>
          <button
            onClick={() => setView('WEEK')}
            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
              view === 'WEEK' ? 'bg-[#C9A34E] text-[#0A1A2F]' : 'text-white/40 hover:text-white'
            }`}
          >
            <Grid size={16} /> {t.gridView}
          </button>
          <div className="w-px h-6 bg-white/10 mx-2" />
          <button
            onClick={() => setShowAddModal(true)}
            className="p-2.5 rounded-xl bg-emerald-500 text-[#0A1A2F] hover:bg-emerald-400 transition-all"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      {view === 'LIST' ? (
        <div className="space-y-12">
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
                        {t[item.status.toLowerCase()]}
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
      ) : (
        <div className="grid grid-cols-7 gap-4 min-h-[500px]">
          {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((day, idx) => (
            <div key={day} className="flex flex-col gap-4">
              <div className="text-center py-4 bg-white/5 rounded-2xl border border-white/10">
                <span className="text-[10px] font-black text-[#C9A34E] uppercase tracking-[0.2em]">{t[day]}</span>
              </div>
              <div className="flex-1 space-y-3">
                {schedules.filter(s => new Date(s.scheduledDate).getDay() === (idx + 1) % 7).map(s => (
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
          ))}
        </div>
      )}

      {showAddModal && typeof window !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0A1A2F] border border-white/10 rounded-[2rem] w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">

            {/* Header — ติดด้านบนเสมอ ไม่ scroll ตาม body */}
            <div className="flex items-center justify-between px-8 pt-7 pb-5 border-b border-white/10 shrink-0">
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                <Calendar className="text-[#C9A34E]" size={24} /> สร้างรอบเรียนใหม่
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={22} />
              </button>
            </div>

            {/* Body — scroll ได้อิสระ */}
            <div className="overflow-y-auto px-8 py-6 flex-1 min-h-0">
            <form onSubmit={handleCreateSchedule} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">หลักสูตร / คอร์ส</label>
                <select
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-[#C9A34E]/50"
                  value={addForm.productId}
                  onChange={e => setAddForm({...addForm, productId: e.target.value})}
                >
                  <option value="">เลือกหลักสูตร...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">วันที่สอน</label>
                  <input
                    required
                    type="date"
                    className="w-full bg-[#0d2340] border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-[#C9A34E]/50 [color-scheme:dark]"
                    value={addForm.scheduledDate}
                    onChange={e => setAddForm({...addForm, scheduledDate: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">จำนวนนักเรียนสูงสุด</label>
                  <input
                    required
                    type="number"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-[#C9A34E]/50"
                    value={addForm.maxStudents}
                    onChange={e => setAddForm({...addForm, maxStudents: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">เวลาเริ่ม</label>
                  <input
                    required
                    type="time"
                    className="w-full bg-[#0d2340] border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-[#C9A34E]/50 [color-scheme:dark]"
                    value={addForm.startTime}
                    onChange={e => setAddForm({...addForm, startTime: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">เวลาสิ้นสุด</label>
                  <input
                    required
                    type="time"
                    className="w-full bg-[#0d2340] border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-[#C9A34E]/50 [color-scheme:dark]"
                    value={addForm.endTime}
                    onChange={e => setAddForm({...addForm, endTime: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">อาจารย์ผู้สอน (ถ้ามี)</label>
                <select
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-[#C9A34E]/50"
                  value={addForm.instructorId}
                  onChange={e => setAddForm({...addForm, instructorId: e.target.value})}
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
                  onChange={e => setAddForm({...addForm, notes: e.target.value})}
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
            </div>{/* end scrollable body */}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
