'use client';

import React, { useState, useEffect } from 'react';
import { Monitor, ChefHat, Briefcase, Box, Plus, Edit3, MapPin, User, Calendar, X, Loader2, Info, Search } from 'lucide-react';

export default function AssetPanel({ language = 'TH' }) {
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', category: 'GENERAL', status: 'ACTIVE',
    location: '', vendor: '', serialNumber: '',
    purchasePrice: '', purchaseDate: '', warrantyExpiry: '', notes: ''
  });

  const t = {
    TH: {
      title: 'ทะเบียนคุมสินทรัพย์',
      add: 'เพิ่มอุปกรณ์',
      all: 'ทั้งหมด',
      marketing: 'การตลาด',
      kitchen: 'ห้องครัว',
      office: 'สำนักงาน',
      general: 'ทั่วไป',
      active: 'ใช้งานปกติ',
      repair: 'ส่งซ่อม',
      broken: 'ชำรุด',
      disposed: 'จำหน่ายออก',
      search: 'ค้นหารหัสหรือชื่ออุปกรณ์...',
      total: 'ทั้งหมด',
      needsAttention: 'ต้องดูแล',
      id: 'รหัสอุปกรณ์',
      location: 'สถานที่ติดตั้ง',
      assigned: 'ผู้รับผิดชอบ',
      save: 'บันทึกข้อมูล',
      create: 'ลงทะเบียนใหม่',
      modalTitle: 'ลงทะเบียนอุปกรณ์ใหม่',
      name: 'ชื่ออุปกรณ์ *',
      category: 'หมวดหมู่ *',
      status: 'สถานะ *',
      vendor: 'ผู้จำหน่าย',
      serial: 'Serial Number',
      price: 'ราคาที่ซื้อ (บาท)',
      purchaseDate: 'วันที่ซื้อ',
      warrantyExpiry: 'วันหมดประกัน',
      notes: 'หมายเหตุ',
      cancel: 'ยกเลิก',
      required: 'กรุณากรอกชื่ออุปกรณ์และสถานที่',
    },
    EN: {
      title: 'ASSET MANAGEMENT',
      add: 'Add Asset',
      all: 'ALL',
      marketing: 'MARKETING',
      kitchen: 'KITCHEN',
      office: 'OFFICE',
      general: 'GENERAL',
      active: 'ACTIVE',
      repair: 'IN REPAIR',
      broken: 'BROKEN',
      disposed: 'DISPOSED',
      search: 'Search ID or name...',
      total: 'TOTAL',
      needsAttention: 'ATTENTION',
      id: 'ASSET ID',
      location: 'LOCATION',
      assigned: 'ASSIGNED TO',
      save: 'SAVE ASSET',
      create: 'REGISTER NEW',
      modalTitle: 'REGISTER NEW ASSET',
      name: 'Asset Name *',
      category: 'Category *',
      status: 'Status *',
      vendor: 'Vendor',
      serial: 'Serial Number',
      price: 'Purchase Price (THB)',
      purchaseDate: 'Purchase Date',
      warrantyExpiry: 'Warranty Expiry',
      notes: 'Notes',
      cancel: 'Cancel',
      required: 'Please fill in name and location',
    }
  }[language];

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/assets');
      const data = await res.json();
      setAssets(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.location) return alert(t.required);
    try {
      setSaving(true);
      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          purchasePrice: form.purchasePrice ? Number(form.purchasePrice) : undefined,
          purchaseDate: form.purchaseDate || undefined,
          warrantyExpiry: form.warrantyExpiry || undefined,
        })
      });
      if (!res.ok) throw new Error('Failed');
      const created = await res.json();
      setAssets(prev => [created, ...prev]);
      setShowAddModal(false);
      setForm({ name: '', category: 'GENERAL', status: 'ACTIVE', location: '', vendor: '', serialNumber: '', purchasePrice: '', purchaseDate: '', warrantyExpiry: '', notes: '' });
    } catch (err) {
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setSaving(false);
    }
  };

  const filtered = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) || asset.assetId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filter === 'ALL' || asset.category === filter;
    const matchesStatus = statusFilter === 'ALL' || asset.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const activeCount = assets.filter(a => a.status === 'ACTIVE').length;
  const attentionCount = assets.filter(a => ['IN_REPAIR', 'BROKEN'].includes(a.status)).length;

  const CategoryIcon = ({ cat, size = 20 }) => {
    switch (cat) {
      case 'MARKETING': return <Monitor size={size} />;
      case 'KITCHEN': return <ChefHat size={size} />;
      case 'OFFICE': return <Briefcase size={size} />;
      default: return <Box size={size} />;
    }
  };

  const statusColors = {
    ACTIVE: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    IN_REPAIR: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    BROKEN: 'bg-red-500/10 text-red-500 border-red-500/20',
    DISPOSED: 'bg-white/5 text-white/40 border-white/10'
  };

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-[#C9A34E]/50 placeholder-white/20";
  const labelClass = "block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2";

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 space-y-4">
      <Loader2 className="w-12 h-12 text-[#C9A34E] animate-spin" />
      <span className="text-[#C9A34E] font-black animate-pulse uppercase tracking-[0.3em]">SYNCHRONIZING ASSETS...</span>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="bg-[#0A1A2F]/50 backdrop-blur-xl rounded-[2.5rem] border border-white/10 p-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-black text-[#F8F8F6] uppercase tracking-tighter mb-4">{t.title}</h1>
            <div className="flex gap-4">
              <div className="bg-white/5 px-6 py-2 rounded-2xl border border-white/10">
                <p className="text-[10px] text-white/40 font-black uppercase tracking-widest">{t.total}</p>
                <p className="text-2xl font-black text-[#C9A34E]">{assets.length}</p>
              </div>
              <div className="bg-emerald-500/5 px-6 py-2 rounded-2xl border border-emerald-500/20">
                <p className="text-[10px] text-emerald-500/40 font-black uppercase tracking-widest">{t.active}</p>
                <p className="text-2xl font-black text-emerald-500">{activeCount}</p>
              </div>
              <div className="bg-red-500/5 px-6 py-2 rounded-2xl border border-red-500/20">
                <p className="text-[10px] text-red-500/40 font-black uppercase tracking-widest">{t.needsAttention}</p>
                <p className="text-2xl font-black text-red-500">{attentionCount}</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="bg-[#C9A34E] text-[#0A1A2F] font-black rounded-2xl px-8 py-4 flex items-center gap-3 hover:bg-amber-400 transition-all shadow-xl shadow-amber-900/20 uppercase tracking-widest text-sm"
          >
            <Plus size={20} /> {t.add}
          </button>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap gap-2 pb-4 border-b border-white/5">
            {['ALL', 'MARKETING', 'KITCHEN', 'OFFICE', 'GENERAL'].map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all ${
                  filter === cat ? 'bg-[#C9A34E] text-[#0A1A2F]' : 'bg-white/5 text-white/40 border border-white/10'
                }`}
              >
                <CategoryIcon cat={cat} size={14} />
                {cat === 'ALL' ? t.all : t[cat.toLowerCase()]}
              </button>
            ))}
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
              <input
                type="text"
                placeholder={t.search}
                className="bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-[#C9A34E]/50 w-full font-bold"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-black uppercase tracking-widest text-xs focus:outline-none"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">{t.all} STATUS</option>
              <option value="ACTIVE">{t.active}</option>
              <option value="IN_REPAIR">{t.repair}</option>
              <option value="BROKEN">{t.broken}</option>
              <option value="DISPOSED">{t.disposed}</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filtered.map(asset => (
          <div
            key={asset.id}
            onClick={() => setSelectedAsset(asset)}
            className="bg-white/5 rounded-3xl border border-white/10 p-6 cursor-pointer hover:border-[#C9A34E]/50 hover:bg-white/[0.07] transition-all group"
          >
            <div className="flex justify-between items-start mb-6">
              <div className={`p-4 rounded-2xl ${asset.status === 'ACTIVE' ? 'bg-[#C9A34E]/10 text-[#C9A34E]' : 'bg-white/5 text-white/40'}`}>
                <CategoryIcon cat={asset.category} size={28} />
              </div>
              <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${statusColors[asset.status]}`}>
                {t[asset.status.toLowerCase().split('_').pop()]}
              </span>
            </div>

            <h3 className="text-xl font-black text-white uppercase mb-1 truncate">{asset.name}</h3>
            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-6">{asset.assetId}</p>

            <div className="space-y-3 pt-4 border-t border-white/5">
              <div className="flex items-center gap-3 text-white/40">
                <MapPin size={14} className="text-[#C9A34E]/50" />
                <span className="text-xs font-bold uppercase tracking-tighter truncate">{asset.location}</span>
              </div>
              <div className="flex items-center gap-3 text-white/40">
                <User size={14} className="text-[#C9A34E]/50" />
                <span className="text-xs font-bold uppercase tracking-tighter truncate">{asset.assignedTo?.nickName || asset.assignedTo?.firstName || '-'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Asset Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0A1A2F] border border-white/10 rounded-[2rem] p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter">{t.modalTitle}</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 text-white/40 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className={labelClass}>{t.name}</label>
                  <input type="text" required className={inputClass} placeholder="เช่น กล้อง Sony ZV-E10"
                    value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>

                <div>
                  <label className={labelClass}>{t.category}</label>
                  <select className={inputClass} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    <option value="MARKETING">การตลาด</option>
                    <option value="KITCHEN">ห้องครัว</option>
                    <option value="OFFICE">สำนักงาน</option>
                    <option value="GENERAL">ทั่วไป</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>{t.status}</label>
                  <select className={inputClass} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="ACTIVE">ใช้งานปกติ</option>
                    <option value="IN_REPAIR">ส่งซ่อม</option>
                    <option value="BROKEN">ชำรุด</option>
                    <option value="DISPOSED">จำหน่ายออก</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className={labelClass}>{t.location} *</label>
                  <input type="text" required className={inputClass} placeholder="เช่น ห้องครัว ชั้น 2"
                    value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
                </div>

                <div>
                  <label className={labelClass}>{t.vendor}</label>
                  <input type="text" className={inputClass} placeholder="เช่น Power Buy"
                    value={form.vendor} onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))} />
                </div>

                <div>
                  <label className={labelClass}>{t.serial}</label>
                  <input type="text" className={inputClass} placeholder="SN-XXXXXXXX"
                    value={form.serialNumber} onChange={e => setForm(f => ({ ...f, serialNumber: e.target.value }))} />
                </div>

                <div>
                  <label className={labelClass}>{t.price}</label>
                  <input type="number" min="0" className={inputClass} placeholder="0"
                    value={form.purchasePrice} onChange={e => setForm(f => ({ ...f, purchasePrice: e.target.value }))} />
                </div>

                <div>
                  <label className={labelClass}>{t.purchaseDate}</label>
                  <input type="date" className={inputClass}
                    value={form.purchaseDate} onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))} />
                </div>

                <div className="md:col-span-2">
                  <label className={labelClass}>{t.warrantyExpiry}</label>
                  <input type="date" className={inputClass}
                    value={form.warrantyExpiry} onChange={e => setForm(f => ({ ...f, warrantyExpiry: e.target.value }))} />
                </div>

                <div className="md:col-span-2">
                  <label className={labelClass}>{t.notes}</label>
                  <textarea rows={3} className={inputClass} placeholder="หมายเหตุเพิ่มเติม..."
                    value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-white/10">
                <button type="button" onClick={() => setShowAddModal(false)}
                  className="flex-1 py-4 rounded-2xl border border-white/10 text-white/60 font-black uppercase tracking-widest text-sm hover:bg-white/5 transition-all">
                  {t.cancel}
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-4 rounded-2xl bg-[#C9A34E] text-[#0A1A2F] font-black uppercase tracking-widest text-sm hover:bg-amber-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
