'use client';

import React, { useState, useRef, useEffect } from 'react';
import { QrCode, Camera, Search, CheckCircle, AlertCircle, Clock, User, BookOpen, X, Loader2 } from 'lucide-react';

export default function AttendanceScanner() {
    const [mode, setMode] = useState('manual'); // 'manual' | 'camera'
    const [qrToken, setQrToken] = useState('');
    const [hoursAttended, setHoursAttended] = useState('3');
    const [scheduleId, setScheduleId] = useState('');
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null); // success result
    const [error, setError] = useState('');

    // Enrollment lookup state
    const [enrollment, setEnrollment] = useState(null);
    const [lookupLoading, setLookupLoading] = useState(false);
    const [selectedProductId, setSelectedProductId] = useState('');

    // Look up enrollment when QR token is entered
    const lookupEnrollment = async (token) => {
        if (!token || token.length < 10) { setEnrollment(null); return; }
        setLookupLoading(true);
        setError('');
        try {
            const res = await fetch(`/api/packages/enrollments?qrToken=${encodeURIComponent(token)}`);
            if (!res.ok) { setEnrollment(null); setLookupLoading(false); return; }
            const data = await res.json();
            // Find matching enrollment from list by qrToken
            const match = Array.isArray(data) ? data.find(e => e.qrToken === token) : data;
            setEnrollment(match || null);
            if (match?.selectedCourses?.length === 1) {
                setSelectedProductId(match.selectedCourses[0].productId);
            }
        } catch {
            setEnrollment(null);
        }
        setLookupLoading(false);
    };

    const handleScan = async () => {
        if (!qrToken.trim()) { setError('กรุณาใส่ QR Token'); return; }
        if (!hoursAttended || Number(hoursAttended) <= 0) { setError('กรุณาระบุชั่วโมงเรียน'); return; }

        setLoading(true);
        setError('');
        setResult(null);

        try {
            const res = await fetch('/api/attendance/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    qrToken: qrToken.trim(),
                    productId: selectedProductId || undefined,
                    scheduleId: scheduleId || undefined,
                    hoursAttended: Number(hoursAttended),
                    note: note || undefined
                })
            });

            const data = await res.json();
            if (!res.ok) {
                setError(data.error || 'เกิดข้อผิดพลาด');
            } else {
                setResult(data);
            }
        } catch (err) {
            setError('ไม่สามารถเชื่อมต่อได้');
        }
        setLoading(false);
    };

    const resetForm = () => {
        setQrToken('');
        setHoursAttended('3');
        setScheduleId('');
        setNote('');
        setResult(null);
        setError('');
        setEnrollment(null);
        setSelectedProductId('');
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-[#cc9d37]/15 flex items-center justify-center">
                    <QrCode size={22} className="text-[#cc9d37]" />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-white">สแกนเช็คชื่อ</h1>
                    <p className="text-white/30 text-sm">สแกน QR หรือใส่โค้ดเพื่อบันทึกการเข้าเรียน</p>
                </div>
            </div>

            {/* Success Result */}
            {result && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 space-y-3">
                    <div className="flex items-center gap-2 text-emerald-400">
                        <CheckCircle size={20} />
                        <span className="font-black text-lg">เช็คชื่อสำเร็จ</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                            <p className="text-white/30 text-[10px] font-bold uppercase">นักเรียน</p>
                            <p className="text-white font-bold">{result.customer?.firstName} {result.customer?.lastName || ''}</p>
                        </div>
                        <div>
                            <p className="text-white/30 text-[10px] font-bold uppercase">แพ็กเกจ</p>
                            <p className="text-white font-bold">{result.packageName}</p>
                        </div>
                        <div>
                            <p className="text-white/30 text-[10px] font-bold uppercase">คอร์ส</p>
                            <p className="text-white font-bold">{result.courseName}</p>
                        </div>
                        <div>
                            <p className="text-white/30 text-[10px] font-bold uppercase">ชม. วันนี้</p>
                            <p className="text-[#cc9d37] font-black text-lg">+{result.hoursAttended}</p>
                        </div>
                        <div>
                            <p className="text-white/30 text-[10px] font-bold uppercase">ชม. สะสม</p>
                            <p className="text-white font-black text-lg">{result.totalHoursCompleted}</p>
                        </div>
                        {result.certLevel && (
                            <div>
                                <p className="text-white/30 text-[10px] font-bold uppercase">ระดับประกาศนียบัตร</p>
                                <p className="text-amber-400 font-black">Level {result.certLevel}</p>
                            </div>
                        )}
                    </div>
                    <button onClick={resetForm} className="w-full mt-3 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-black text-sm transition-all">
                        สแกนคนถัดไป
                    </button>
                </div>
            )}

            {/* Scan Form */}
            {!result && (
                <div className="space-y-4">
                    {/* QR Token Input */}
                    <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-5 space-y-4">
                        <label className="text-white/40 text-[10px] font-black uppercase tracking-wider">QR Token / Enrollment Code</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={qrToken}
                                onChange={e => { setQrToken(e.target.value); lookupEnrollment(e.target.value); }}
                                placeholder="วาง QR Token ที่นี่..."
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm outline-none focus:border-[#cc9d37]/40"
                            />
                            {lookupLoading && <Loader2 size={16} className="text-white/30 animate-spin self-center" />}
                        </div>

                        {/* Enrollment Preview */}
                        {enrollment && (
                            <div className="bg-[#cc9d37]/5 border border-[#cc9d37]/15 rounded-xl p-4 space-y-2">
                                <div className="flex items-center gap-2">
                                    <User size={14} className="text-[#cc9d37]" />
                                    <span className="text-white font-bold text-sm">
                                        {enrollment.customer?.firstName} {enrollment.customer?.lastName || ''}
                                        {enrollment.customer?.nickName ? ` (${enrollment.customer.nickName})` : ''}
                                    </span>
                                </div>
                                <p className="text-white/40 text-xs">{enrollment.package?.name || enrollment.enrollmentId}</p>

                                {/* Course selection if multiple */}
                                {enrollment.selectedCourses?.length > 1 && (
                                    <div className="space-y-1.5 mt-2">
                                        <p className="text-white/30 text-[10px] font-bold uppercase">เลือกคอร์สที่มาเรียน</p>
                                        {enrollment.selectedCourses.map(c => (
                                            <button
                                                key={c.productId}
                                                onClick={() => setSelectedProductId(c.productId)}
                                                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                                                    selectedProductId === c.productId
                                                        ? 'bg-[#cc9d37]/15 text-[#cc9d37] border border-[#cc9d37]/30'
                                                        : 'bg-white/5 text-white/50 hover:bg-white/8'
                                                }`}
                                            >
                                                {c.product?.name}
                                                {c.enrollmentItem && (
                                                    <span className="text-white/25 ml-2">({c.enrollmentItem.hoursCompleted || 0}/{c.product?.hours || '?'} ชม.)</span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Hours + Schedule */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-4">
                            <label className="text-white/40 text-[10px] font-black uppercase tracking-wider">ชั่วโมงเรียน</label>
                            <input
                                type="number"
                                value={hoursAttended}
                                onChange={e => setHoursAttended(e.target.value)}
                                min="0.5"
                                step="0.5"
                                className="w-full mt-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-black text-lg outline-none focus:border-[#cc9d37]/40 text-center"
                            />
                        </div>
                        <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-4">
                            <label className="text-white/40 text-[10px] font-black uppercase tracking-wider">Schedule ID (ไม่บังคับ)</label>
                            <input
                                type="text"
                                value={scheduleId}
                                onChange={e => setScheduleId(e.target.value)}
                                placeholder="SCH-..."
                                className="w-full mt-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#cc9d37]/40"
                            />
                        </div>
                    </div>

                    {/* Note */}
                    <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-4">
                        <label className="text-white/40 text-[10px] font-black uppercase tracking-wider">หมายเหตุ (ไม่บังคับ)</label>
                        <input
                            type="text"
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            placeholder="เช่น เรียนชดเชย, เข้าสาย..."
                            className="w-full mt-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#cc9d37]/40"
                        />
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                            <AlertCircle size={14} />
                            <span className="text-sm font-bold">{error}</span>
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        onClick={handleScan}
                        disabled={loading || !qrToken.trim()}
                        className="w-full py-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 disabled:bg-white/8 disabled:text-white/15 bg-[#cc9d37] hover:bg-amber-400 text-[#0c1a2f] shadow-lg shadow-[#cc9d37]/20 active:scale-95"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                        บันทึกการเข้าเรียน
                    </button>
                </div>
            )}
        </div>
    );
}
