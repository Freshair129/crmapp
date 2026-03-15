'use client';

import React, { useState, useEffect } from 'react';
import { BookOpen, Clock, Award, ChevronDown, ChevronUp, CheckCircle, Loader2 } from 'lucide-react';

export default function CourseEnrollmentPanel({ customerId, language = 'TH' }) {
  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [error, setError] = useState(null);

  const t = {
    TH: {
      title: 'การลงทะเบียนเรียน',
      totalCourses: 'คอร์สทั้งหมด',
      completed: 'จบแล้ว',
      totalHours: 'ชั่วโมงสะสม',
      empty: 'ยังไม่มีคอร์สที่ซื้อ',
      loading: 'กำลังโหลดข้อมูล...',
      cert1: 'ใบรับรองระดับ 1',
      cert2: 'Full Course 111h',
      cert3: 'Full Course 201h',
      status_ACTIVE: 'กำลังเรียน',
      status_COMPLETED: 'จบแล้ว',
      enrolledAt: 'วันที่เริ่ม',
      progress: 'ความคืบหน้า',
      hours: 'ชม.'
    },
    EN: {
      title: 'Course Enrollments',
      totalCourses: 'Total Courses',
      completed: 'Completed',
      totalHours: 'Total Hours',
      empty: 'No courses purchased yet',
      loading: 'LOADING...',
      cert1: 'Level 1 Certificate',
      cert2: 'Full Course 111h',
      cert3: 'Full Course 201h',
      status_ACTIVE: 'ACTIVE',
      status_COMPLETED: 'COMPLETED',
      enrolledAt: 'Enrolled Date',
      progress: 'Progress',
      hours: 'hrs'
    }
  }[language];

  useEffect(() => {
    if (!customerId) return;
    const fetchEnrollments = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/enrollments?customerId=${customerId}`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setEnrollments(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchEnrollments();
  }, [customerId]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 space-y-4">
      <Loader2 className="w-12 h-12 text-[#C9A34E] animate-spin" />
      <span className="text-[#C9A34E] font-black animate-pulse uppercase tracking-[0.3em]">{t.loading}</span>
    </div>
  );

  if (error) return <div className="p-8 text-red-500 font-black uppercase">{error}</div>;

  const totalCourses = enrollments.length;
  const completedCount = enrollments.filter(e => e.status === 'COMPLETED').length;
  const totalHours = enrollments.reduce((acc, curr) => acc + (curr.totalHours || 0), 0);

  const getCertBadge = (hours) => {
    if (hours >= 201) return { label: t.cert3, color: 'bg-slate-400 text-white' };
    if (hours >= 111) return { label: t.cert2, color: 'bg-zinc-300 text-zinc-800' };
    if (hours >= 30) return { label: t.cert1, color: 'bg-[#C9A34E] text-[#0A1A2F]' };
    return null;
  };

  const cert = getCertBadge(totalHours);

  return (
    <div className="bg-[#0A1A2F]/50 backdrop-blur-md rounded-[2.5rem] border border-white/10 p-8 shadow-2xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h2 className="text-3xl font-black text-[#F8F8F6] uppercase tracking-widest flex items-center gap-3">
            <BookOpen className="text-[#C9A34E]" /> {t.title}
          </h2>
          <div className="flex gap-4 mt-4">
            <div className="bg-white/5 px-4 py-2 rounded-xl border border-white/10">
              <span className="text-xs text-white/40 uppercase font-bold tracking-tighter block">{t.totalCourses}</span>
              <span className="text-xl font-black text-[#C9A34E]">{totalCourses}</span>
            </div>
            <div className="bg-white/5 px-4 py-2 rounded-xl border border-white/10">
              <span className="text-xs text-white/40 uppercase font-bold tracking-tighter block">{t.completed}</span>
              <span className="text-xl font-black text-[#C9A34E]">{completedCount}</span>
            </div>
            <div className="bg-white/5 px-4 py-2 rounded-xl border border-white/10">
              <span className="text-xs text-white/40 uppercase font-bold tracking-tighter block">{t.totalHours}</span>
              <span className="text-xl font-black text-[#C9A34E]">{totalHours} <small className="text-xs font-normal opacity-60">HRS</small></span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-3">
          {cert && (
            <div className={`${cert.color} px-4 py-2 rounded-full flex items-center gap-2 font-black text-xs uppercase tracking-wider animate-bounce shadow-lg shadow-amber-900/20`}>
              <Award size={16} /> {cert.label}
            </div>
          )}
          <div className="w-full md:w-64">
            <div className="flex justify-between text-[10px] text-white/40 uppercase font-black mb-1">
              <span>{t.progress}</span>
              <span>{Math.min(100, Math.round(totalHours / 201 * 100))}%</span>
            </div>
            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#C9A34E] transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(201,163,78,0.5)]"
                style={{ width: `${Math.min(100, (totalHours / 201) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {enrollments.length === 0 ? (
          <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
            <BookOpen size={48} className="mx-auto text-white/20 mb-4" />
            <p className="text-white/40 font-black uppercase tracking-widest">{t.empty}</p>
          </div>
        ) : (
          enrollments.map((enrollment) => (
            <div key={enrollment.id} className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden hover:border-[#C9A34E]/30 transition-all">
              <div
                className="p-6 cursor-pointer flex items-center justify-between"
                onClick={() => setExpandedId(expandedId === enrollment.id ? null : enrollment.id)}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${enrollment.status === 'COMPLETED' ? 'bg-zinc-800 text-zinc-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                    <CheckCircle size={20} />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-white leading-tight uppercase tracking-wide">{enrollment.productName || 'Course'}</h4>
                    <p className="text-xs text-white/40 font-bold uppercase tracking-widest mt-1">
                      {t.enrolledAt}: {new Date(enrollment.enrolledAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    enrollment.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/10 text-white/40'
                  }`}>
                    {t[`status_${enrollment.status}`]}
                  </span>
                  {expandedId === enrollment.id ? <ChevronUp className="text-white/40" /> : <ChevronDown className="text-white/40" />}
                </div>
              </div>

              {expandedId === enrollment.id && (
                <div className="px-6 pb-6 pt-2 border-t border-white/5 bg-black/20">
                  <div className="space-y-4 mt-4">
                    {(enrollment.items || []).map((item, idx) => (
                      <div key={idx} className="flex flex-col gap-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-white/80 font-bold">{item.courseName}</span>
                          <span className="text-xs font-black text-[#C9A34E]">{item.hoursCompleted} / {item.duration} {t.hours}</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#C9A34E]/60 transition-all duration-700"
                            style={{ width: `${Math.min(100, (item.hoursCompleted / (item.duration || 1)) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
