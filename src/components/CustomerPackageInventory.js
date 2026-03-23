'use client';

import React, { useState, useEffect } from 'react';
import { Gift, BookOpen, Clock, CheckCircle, ChevronDown, ChevronUp, Loader2, QrCode, User, AlertCircle } from 'lucide-react';

export default function CustomerPackageInventory({ customerId, customerName }) {
    const [enrollments, setEnrollments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null);
    const [showQr, setShowQr] = useState(null); // enrollment id showing QR

    useEffect(() => {
        if (!customerId) return;
        setLoading(true);
        fetch(`/api/packages/enrollments?customerId=${customerId}`)
            .then(r => r.json())
            .then(data => {
                setEnrollments(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [customerId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 size={20} className="text-[#cc9d37] animate-spin" />
            </div>
        );
    }

    if (enrollments.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Gift size={36} className="text-white/10" />
                <p className="text-white/20 text-xs font-black uppercase tracking-[0.2em]">ยังไม่มีแพ็กเกจ</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
                <Gift size={18} className="text-[#cc9d37]" />
                <h3 className="text-white font-black text-lg">แพ็กเกจของ{customerName || 'ลูกค้า'}</h3>
                <span className="text-white/30 text-xs font-bold">({enrollments.length} แพ็กเกจ)</span>
            </div>

            {enrollments.map(enr => {
                const isExpanded = expandedId === enr.id;
                const courses = enr.selectedCourses || [];
                const totalHours = courses.reduce((sum, c) => sum + (c.product?.hours || 0), 0);
                const completedHours = courses.reduce((sum, c) => sum + (c.enrollmentItem?.hoursCompleted || 0), 0);
                const progressPct = totalHours > 0 ? Math.min(100, Math.round((completedHours / totalHours) * 100)) : 0;
                const statusColor = enr.status === 'COMPLETED' ? 'text-emerald-400' : enr.status === 'CANCELLED' ? 'text-red-400' : 'text-[#cc9d37]';
                const statusLabel = enr.status === 'COMPLETED' ? 'เรียนจบแล้ว' : enr.status === 'CANCELLED' ? 'ยกเลิก' : 'กำลังเรียน';

                return (
                    <div key={enr.id} className="bg-white/[0.03] border border-white/8 rounded-2xl overflow-hidden">
                        {/* Header */}
                        <button
                            onClick={() => setExpandedId(isExpanded ? null : enr.id)}
                            className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-[#cc9d37]/15 flex items-center justify-center flex-shrink-0">
                                    <Gift size={16} className="text-[#cc9d37]" />
                                </div>
                                <div className="text-left">
                                    <p className="text-white font-bold text-sm">{enr.package?.name || enr.enrollmentId}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className={`text-[10px] font-black ${statusColor}`}>{statusLabel}</span>
                                        <span className="text-white/20 text-[10px]">{new Date(enr.enrolledAt).toLocaleDateString('th-TH')}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                {/* Progress circle */}
                                <div className="text-right">
                                    <p className="text-[#cc9d37] font-black text-sm">{progressPct}%</p>
                                    <p className="text-white/20 text-[9px]">{completedHours}/{totalHours} ชม.</p>
                                </div>
                                {isExpanded ? <ChevronUp size={14} className="text-white/30" /> : <ChevronDown size={14} className="text-white/30" />}
                            </div>
                        </button>

                        {/* Progress bar */}
                        <div className="px-5 pb-1">
                            <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{ width: `${progressPct}%`, background: progressPct >= 100 ? '#10b981' : '#cc9d37' }}
                                />
                            </div>
                        </div>

                        {/* Expanded details */}
                        {isExpanded && (
                            <div className="px-5 pb-5 pt-3 space-y-3 border-t border-white/5 mt-2">
                                {/* QR Token */}
                                {enr.qrToken && (
                                    <div className="flex items-center justify-between bg-white/[0.03] rounded-xl px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <QrCode size={14} className="text-[#cc9d37]" />
                                            <span className="text-white/40 text-xs font-bold">QR Token</span>
                                        </div>
                                        <code className="text-[#cc9d37] text-[10px] font-mono bg-[#cc9d37]/10 px-2 py-1 rounded-lg select-all">{enr.qrToken}</code>
                                    </div>
                                )}

                                {/* Course list */}
                                <div className="space-y-2">
                                    <p className="text-white/30 text-[10px] font-black uppercase tracking-wider">คอร์สเรียน</p>
                                    {courses.map(c => {
                                        const hours = c.product?.hours || 0;
                                        const completed = c.enrollmentItem?.hoursCompleted || 0;
                                        const pct = hours > 0 ? Math.min(100, Math.round((completed / hours) * 100)) : 0;
                                        const isDone = c.enrollmentItem?.status === 'COMPLETED';

                                        return (
                                            <div key={c.productId} className="bg-white/[0.02] rounded-xl px-4 py-3 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        {isDone ? <CheckCircle size={12} className="text-emerald-400" /> : <BookOpen size={12} className="text-white/30" />}
                                                        <span className={`text-xs font-bold ${isDone ? 'text-emerald-400' : 'text-white/70'}`}>
                                                            {c.product?.name}
                                                            {c.wasSwapped && <span className="text-blue-400/50 text-[9px] ml-1">(swap)</span>}
                                                        </span>
                                                    </div>
                                                    <span className="text-white/30 text-[10px] font-bold">{completed}/{hours} ชม.</span>
                                                </div>
                                                <div className="h-1 bg-white/8 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full transition-all"
                                                        style={{ width: `${pct}%`, background: isDone ? '#10b981' : '#cc9d37' }}
                                                    />
                                                </div>
                                                {c.enrollmentItem?.certLevel && (
                                                    <span className="text-amber-400 text-[9px] font-black">Cert Level {c.enrollmentItem.certLevel}</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Gifts */}
                                {enr.package?.gifts?.length > 0 && (
                                    <div className="space-y-1.5">
                                        <p className="text-white/30 text-[10px] font-black uppercase tracking-wider">ของแถม</p>
                                        {enr.package.gifts.map((g, gi) => (
                                            <div key={gi} className="flex items-center gap-2 text-xs">
                                                <span className="text-emerald-400/60">🎁</span>
                                                <span className="text-white/50">{g.name} {g.qty > 1 ? `x${g.qty}` : ''}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Price */}
                                <div className="flex items-center justify-between text-xs pt-2 border-t border-white/5">
                                    <span className="text-white/30">ราคาแพ็กเกจ</span>
                                    <span className="text-[#cc9d37] font-black">฿{Number(enr.totalPrice).toLocaleString()}</span>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
