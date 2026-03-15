'use client';
import { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';

const ROLES = ['AGENT', 'SUPERVISOR', 'MANAGER', 'ADMIN', 'DEVELOPER', 'GUEST'];
const DEPARTMENTS = ['marketing', 'sales', 'admin', 'manager', 'developer', 'support'];

const ROLE_BADGE = {
    AGENT: 'bg-blue-100 text-blue-700',
    SUPERVISOR: 'bg-purple-100 text-purple-700',
    MANAGER: 'bg-indigo-100 text-indigo-700',
    ADMIN: 'bg-red-100 text-red-700',
    DEVELOPER: 'bg-gray-100 text-gray-700',
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
                        <Plus size={16} /> เพิ่มพนักงาน
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
                                                    onClick={() => handleDeactivate(emp.
