'use client';
import { useState } from 'react';

const INTERESTS = [
    { value: 'pro',      label: '👨‍🍳 เชฟมืออาชีพ',         desc: 'ต้องการประกอบอาชีพเชฟ / เปิดร้านอาหาร' },
    { value: 'business', label: '🏪 เปิดธุรกิจอาหาร',       desc: 'ต้องการนำความรู้ไปทำธุรกิจ' },
    { value: 'hobby',    label: '🍱 ทำอาหารงานอดิเรก',      desc: 'ทำเองกินเอง / ทำให้ครอบครัว' },
];

export default function RegisterPage() {
    const [form, setForm] = useState({
        firstName: '',
        lastName: '',
        nickName: '',
        phone: '',
        email: '',
        lineId: '',
        interest: 'hobby',
    });
    const [step, setStep] = useState('form'); // form | success | error
    const [result, setResult] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [loading, setLoading] = useState(false);

    function set(key, val) { setForm(f => ({ ...f, [key]: val })); }

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');
        try {
            const res = await fetch('/api/members/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, source: 'web_register' }),
            });
            const json = await res.json();
            if (!res.ok) {
                setErrorMsg(json.error || 'เกิดข้อผิดพลาด');
                setStep('error');
            } else {
                setResult(json.data);
                setStep('success');
            }
        } catch {
            setErrorMsg('ไม่สามารถเชื่อมต่อได้ กรุณาลองใหม่');
            setStep('error');
        } finally {
            setLoading(false);
        }
    }

    if (step === 'success') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center">
                    <div className="text-6xl mb-4">🎉</div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">ลงทะเบียนสำเร็จ!</h1>
                    <p className="text-gray-500 mb-6">ยินดีต้อนรับสู่ครอบครัว V School</p>

                    <div className="bg-orange-50 rounded-2xl p-5 mb-6 text-left space-y-3">
                        <div className="flex justify-between">
                            <span className="text-sm text-gray-500">ชื่อ</span>
                            <span className="font-medium">{result.firstName} {result.lastName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-gray-500">รหัสสมาชิก</span>
                            <span className="font-mono font-bold text-orange-600">{result.memberId}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-gray-500">ระดับสมาชิก</span>
                            <span className="font-medium">{result.membershipTier}</span>
                        </div>
                    </div>

                    <p className="text-sm text-gray-400">
                        ทีมงานจะติดต่อกลับเพื่อแนะนำหลักสูตรที่เหมาะกับคุณ
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-red-500 to-orange-500 px-8 py-6 text-white">
                    <h1 className="text-2xl font-bold">สมัครสมาชิก</h1>
                    <p className="text-red-100 text-sm mt-1">The V School — โรงเรียนสอนอาหารญี่ปุ่น</p>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-5">
                    {/* Name */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">ชื่อ *</label>
                            <input
                                required
                                value={form.firstName}
                                onChange={e => set('firstName', e.target.value)}
                                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400"
                                placeholder="ชื่อจริง"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">นามสกุล</label>
                            <input
                                value={form.lastName}
                                onChange={e => set('lastName', e.target.value)}
                                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400"
                                placeholder="นามสกุล"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">ชื่อเล่น</label>
                        <input
                            value={form.nickName}
                            onChange={e => set('nickName', e.target.value)}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400"
                            placeholder="ชื่อเล่น"
                        />
                    </div>

                    {/* Phone */}
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">เบอร์โทร *</label>
                        <input
                            required
                            type="tel"
                            value={form.phone}
                            onChange={e => set('phone', e.target.value)}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400"
                            placeholder="0812345678"
                        />
                    </div>

                    {/* Email + LINE */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">อีเมล</label>
                            <input
                                type="email"
                                value={form.email}
                                onChange={e => set('email', e.target.value)}
                                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400"
                                placeholder="email@example.com"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">LINE ID</label>
                            <input
                                value={form.lineId}
                                onChange={e => set('lineId', e.target.value)}
                                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400"
                                placeholder="@yourline"
                            />
                        </div>
                    </div>

                    {/* Interest */}
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-2">สนใจเรียนเพื่อ *</label>
                        <div className="space-y-2">
                            {INTERESTS.map(opt => (
                                <label
                                    key={opt.value}
                                    className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                                        form.interest === opt.value
                                            ? 'border-orange-400 bg-orange-50'
                                            : 'border-gray-100 hover:border-gray-200'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="interest"
                                        value={opt.value}
                                        checked={form.interest === opt.value}
                                        onChange={() => set('interest', opt.value)}
                                        className="mt-0.5 accent-orange-500"
                                    />
                                    <div>
                                        <div className="text-sm font-medium text-gray-900">{opt.label}</div>
                                        <div className="text-xs text-gray-400">{opt.desc}</div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {step === 'error' && (
                        <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{errorMsg}</p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl py-3 font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                        {loading ? 'กำลังลงทะเบียน...' : 'สมัครสมาชิก'}
                    </button>

                    <p className="text-center text-xs text-gray-400">
                        ข้อมูลของคุณปลอดภัย ไม่มีการเปิดเผยต่อบุคคลที่สาม
                    </p>
                </form>
            </div>
        </div>
    );
}
