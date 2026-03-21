'use client';
import { useState, useEffect } from 'react';

const ROLES = ['DEVELOPER', 'ADMIN', 'MANAGER', 'MARKETING', 'HEAD_CHEF', 'EMPLOYEE', 'AGENT', 'GUEST'];
const DEPARTMENTS = ['marketing', 'sales', 'admin', 'manager', 'developer', 'support'];

const ROLE_BADGE = {
    DEVELOPER: 'bg-gray-100 text-gray-700',
    ADMIN: 'bg-red-100 text-red-700',
    MANAGER: 'bg-indigo-100 text-indigo-700',
    MARKETING: 'bg-pink-100 text-pink-700',
    HEAD_CHEF: 'bg-orange-100 text-orange-700',
    EMPLOYEE: 'bg-emerald-100 text-emerald-700',
    AGENT: 'bg-blue-100 text-blue-700',
    GUEST: 'bg-yellow-100 text-yellow-700',
};

const emptyForm = {
    firstName: '',
    lastName: '',
    nickName: '',
    facebookName: '',
    email: '',
    phone: '',
    department: 'sales',
    role: 'AGENT',
    password: '',
};

export default function EmployeesPage() {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editTarget, setEditTarget] = useState(null); // { id, ...fields }
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => { fetchEmployees(); }, []);

    async function fetchEmployees() {
        setLoading(true);
        const res = await fetch('/api/employees');
        const json = await res.json();
        setEmployees(json.data || []);
        setLoading(false);
    }

    function openAdd() {
        setEditTarget(null);
        setForm(emptyForm);
        setError('');
        setShowForm(true);
    }

    function openEdit(emp) {
        setEditTarget(emp);
        setForm({
            firstName: emp.firstName,
            lastName: emp.lastName,
            nickName: emp.nickName || '',
            facebookName: emp.identities?.facebook?.name || '',
            email: emp.email,
            phone: emp.phone || '',
            department: emp.department || 'sales',
            role: emp.role,
            password: '',
        });
        setError('');
        setShowForm(true);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            const url = editTarget ? `/api/employees/${editTarget.id}` : '/api/employees';
            const method = editTarget ? 'PATCH' : 'POST';
            const body = { ...form };
            if (editTarget && !body.password) delete body.password;

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const json = await res.json();
            if (!res.ok) { setError(json.error || 'Error'); return; }
            setShowForm(false);
            fetchEmployees();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    async function handleDeactivate(id) {
        if (!confirm('ปิดการใช้งานพนักงานคนนี้?')) return;
        await fetch(`/api/employees/${id}`, { method: 'DELETE' });
        fetchEmployees();
    }

    async function handleReactivate(id) {
        await fetch(`/api/employees/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'ACTIVE' }),
        });
        fetchEmployees();
    }

    const active = employees.filter(e => e.status === 'ACTIVE');
    const inactive = employees.filter(e => e.status === 'INACTIVE');

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">จัดการพนักงาน</h1>
                        <p className="text-sm text-gray-500 mt-1">{active.length} คน (Active)</p>
                    </div>
                    <button
                        onClick={openAdd}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
                    >
                        <i className="fa fa-plus" /> เพิ่มพนักงาน
                    </button>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="text-center text-gray-400 py-20">กำลังโหลด...</div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="text-left px-4 py-3 text-gray-600 font-medium">รหัส</th>
                                    <th className="text-left px-4 py-3 text-gray-600 font-medium">ชื่อ</th>
                                    <th className="text-left px-4 py-3 text-gray-600 font-medium">อีเมล</th>
                                    <th className="text-left px-4 py-3 text-gray-600 font-medium">แผนก</th>
                                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Role</th>
                                    <th className="text-left px-4 py-3 text-gray-600 font-medium">สถานะ</th>
                                    <th className="px-4 py-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {[...active, ...inactive].map(emp => (
                                    <tr key={emp.id} className={emp.status === 'INACTIVE' ? 'opacity-50' : ''}>
                                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{emp.employeeId}</td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-gray-900">
                                                {emp.firstName} {emp.lastName}
                                            </div>
                                            {emp.nickName && (
                                                <div className="text-xs text-gray-400">"{emp.nickName}"</div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">{emp.email}</td>
                                        <td className="px-4 py-3 text-gray-600 capitalize">{emp.department || '—'}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${ROLE_BADGE[emp.role] || 'bg-gray-100 text-gray-600'}`}>
                                                {emp.role}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs font-medium ${emp.status === 'ACTIVE' ? 'text-green-600' : 'text-gray-400'}`}>
                                                {emp.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => openEdit(emp)}
                                                className="text-blue-600 hover:text-blue-800 mr-3 text-xs"
                                            >แก้ไข</button>
                                            {emp.status === 'ACTIVE' ? (
                                                <button
                                                    onClick={() => handleDeactivate(emp.id)}
                                                    className="text-red-500 hover:text-red-700 text-xs"
                                                >ปิดใช้งาน</button>
                                            ) : (
                                                <button
                                                    onClick={() => handleReactivate(emp.id)}
                                                    className="text-green-600 hover:text-green-800 text-xs"
                                                >เปิดใช้งาน</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {employees.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="text-center text-gray-400 py-12">
                                            ยังไม่มีพนักงาน — กด "เพิ่มพนักงาน" เพื่อเริ่ม
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100">
                            <h2 className="text-lg font-semibold text-gray-900">
                                {editTarget ? 'แก้ไขพนักงาน' : 'เพิ่มพนักงานใหม่'}
                            </h2>
                            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                                <i className="fa fa-times" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">ชื่อ *</label>
                                    <input
                                        required
                                        value={form.firstName}
                                        onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                                        placeholder="ชื่อจริง"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">นามสกุล *</label>
                                    <input
                                        required
                                        value={form.lastName}
                                        onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                                        placeholder="นามสกุล"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">ชื่อเล่น</label>
                                    <input
                                        value={form.nickName}
                                        onChange={e => setForm(f => ({ ...f, nickName: e.target.value }))}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                                        placeholder="ชื่อเล่น"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">
                                        ชื่อบน Facebook
                                        <span className="ml-1 text-blue-500 font-normal">(ส่งโดย...)</span>
                                    </label>
                                    <input
                                        value={form.facebookName}
                                        onChange={e => setForm(f => ({ ...f, facebookName: e.target.value }))}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                                        placeholder="ชื่อที่แสดงใน Business Suite"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">อีเมล *</label>
                                <input
                                    required
                                    type="email"
                                    value={form.email}
                                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                    disabled={!!editTarget}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 disabled:bg-gray-50 disabled:text-gray-400"
                                    placeholder="email@vschool.th"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">เบอร์โทร</label>
                                <input
                                    value={form.phone}
                                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                                    placeholder="0812345678"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">แผนก</label>
                                    <select
                                        value={form.department}
                                        onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                                    >
                                        {DEPARTMENTS.map(d => (
                                            <option key={d} value={d}>{d}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                                    <select
                                        value={form.role}
                                        onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                                    >
                                        {ROLES.map(r => (
                                            <option key={r} value={r}>{r}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                    รหัสผ่าน {editTarget && <span className="text-gray-400">(เว้นว่างถ้าไม่เปลี่ยน)</span>}
                                    {!editTarget && ' *'}
                                </label>
                                <input
                                    type="password"
                                    required={!editTarget}
                                    value={form.password}
                                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                                    placeholder="อย่างน้อย 8 ตัวอักษร"
                                    minLength={editTarget ? 0 : 8}
                                />
                            </div>

                            {error && (
                                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
                            )}

                            <div className="flex gap-3 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-2 text-sm hover:bg-gray-50"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {saving ? 'กำลังบันทึก...' : editTarget ? 'บันทึก' : 'เพิ่มพนักงาน'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
