'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Users, Plus, ChevronLeft, ChevronRight, Grid, List, Loader2, MapPin, CheckCircle2 } from 'lucide-react';

export default function ScheduleCalendar({ language = 'TH' }) {
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('LIST');
  const [schedules, setSchedules] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);

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
    </div>
  );
}
