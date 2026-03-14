'use client';

import React, { useState, useEffect } from 'react';

export default function AuditHistory({ language = 'TH' }) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetch('/api/orders?limit=50')
            .then(r => r.json())
            .then(data => {
                const list = Array.isArray(data) ? data : data.data || [];
                setOrders(list);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const filteredOrders = orders.filter(o => 
        o.orderId.toLowerCase().includes(search.toLowerCase()) ||
        (o.customer?.firstName && o.customer.firstName.toLowerCase().includes(search.toLowerCase()))
    );

    const labels = {
        EN: { title: 'Transaction Logs', id: 'Order ID', date: 'Timestamp', total: 'Revenue', details: 'Audit', loading: 'Loading...' },
        TH: { title: 'ประวัติการทำรายการ', id: 'รหัสออร์เดอร์', date: 'วันเวลา', total: 'ยอดรวม', details: 'ตรวจสอบ', loading: 'กำลังโหลด...' }
    }[language];

    if (loading) {
        return (
            <div className="p-10 max-w-7xl mx-auto animate-pulse flex flex-col items-center justify-center min-h-[400px]">
                <div className="text-[#C9A34E] font-black uppercase tracking-[0.3em]">{labels.loading}</div>
            </div>
        );
    }

    return (
        <div className="p-10 max-w-7xl mx-auto animate-fade-in">
            <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between border-b border-white/5 pb-10">
                <div>
                    <h1 className="text-4xl font-black text-[#F8F8F6] tracking-tight italic uppercase">{labels.title}</h1>
                    <p className="text-[#C9A34E] text-[10px] font-black uppercase tracking-[0.3em] mt-2">Financial Integrity & Audit Trail</p>
                </div>
                <div className="relative w-80 mt-6 md:mt-0">
                    <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-white/20"></i>
                    <input
                        type="text"
                        placeholder="Search Order ID..."
                        className="w-full pl-14 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold placeholder:text-white/20 focus:bg-white/10 focus:border-[#C9A34E]/50 transition-all outline-none"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white/5 rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl backdrop-blur-sm">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-white/5 border-b border-white/5">
                            <th className="px-8 py-6 text-[10px] font-black text-white/20 uppercase tracking-widest">{labels.id}</th>
                            <th className="px-8 py-6 text-[10px] font-black text-white/20 uppercase tracking-widest">{labels.date}</th>
                            <th className="px-8 py-6 text-[10px] font-black text-white/20 uppercase tracking-widest">Quantity</th>
                            <th className="px-8 py-6 text-[10px] font-black text-white/20 uppercase tracking-widest">{labels.total}</th>
                            <th className="px-8 py-6 text-[10px] font-black text-white/20 uppercase tracking-widest text-right">{labels.details}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filteredOrders.map(order => (
                            <tr key={order.id} className="hover:bg-white/5 transition-all group">
                                <td className="px-8 py-6 flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 border border-orange-500/20 shadow-inner">
                                        <i className="fas fa-receipt"></i>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-[#F8F8F6] tracking-tight">{order.orderId}</span>
                                        <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider">
                                            {order.customer?.firstName} {order.customer?.lastName || ''}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <span className="text-white/40 text-xs font-bold leading-none">
                                        {new Date(order.date).toLocaleString('th-TH')}
                                    </span>
                                </td>
                                <td className="px-8 py-6">
                                    <span className="text-white/60 font-black text-[10px] uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full">
                                        {(Array.isArray(order.items) ? order.items.length : 0)} Units
                                    </span>
                                </td>
                                <td className="px-8 py-6">
                                    <span className="font-black text-white text-lg italic tracking-tighter">฿{order.totalAmount.toLocaleString()}</span>
                                </td>
                                <td className="px-8 py-6 text-right">
                                    <button className="w-10 h-10 bg-white/5 hover:bg-[#C9A34E] hover:text-[#0A1A2F] text-white/20 rounded-xl transition-all flex items-center justify-center group-hover:scale-110">
                                        <i className="fas fa-eye"></i>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredOrders.length === 0 && (
                    <div className="p-20 text-center text-white/20 font-bold uppercase tracking-widest">
                        No transactions found
                    </div>
                )}
            </div>

            <div className="mt-12 flex justify-center gap-4">
                <button className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-[#C9A34E] font-black shadow-lg">1</button>
            </div>
        </div>
    );
}

