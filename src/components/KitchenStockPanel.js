'use client';

import React, { useState, useEffect } from 'react';
import { Package, AlertTriangle, Edit3, Check, X, Search, Loader2, Plus } from 'lucide-react';

export default function KitchenStockPanel({ language = 'TH' }) {
  const [loading, setLoading] = useState(true);
  const [ingredients, setIngredients] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    ingredientId: '',
    name: '',
    unit: '',
    category: 'OTHER',
    currentStock: 0,
    minStock: 0,
    costPerUnit: ''
  });

  const t = {
    TH: {
      title: 'คลังวัตถุดิบห้องครัว',
      all: 'ทั้งหมด',
      lowStock: 'สต็อกต่ำ',
      search: 'ค้นหาวัตถุดิบ...',
      category: 'หมวดหมู่',
      name: 'ชื่อวัตถุดิบ',
      stock: 'คงเหลือ',
      min: 'ขั้นต่ำ',
      status: 'สถานะ',
      edit: 'แก้ไข',
      save: 'บันทึก',
      cancel: 'ยกเลิก',
      lowStockWarning: 'สต็อกต่ำกว่าเกณฑ์',
      normal: 'ปกติ',
      total: 'ทั้งหมด',
      lowCount: 'สต็อกต่ำ',
      cat_PROTEIN: 'โปรตีน',
      cat_VEGETABLE: 'ผัก/ผลไม้',
      cat_CONDIMENT: 'เครื่องปรุง',
      cat_DRY_GOODS: 'ของแห้ง',
      cat_OTHER: 'อื่นๆ'
    },
    EN: {
      title: 'KITCHEN INVENTORY',
      all: 'ALL',
      lowStock: 'LOW STOCK',
      search: 'Search ingredients...',
      category: 'Category',
      name: 'Ingredient Name',
      stock: 'Stock',
      min: 'Min',
      status: 'Status',
      edit: 'Edit',
      save: 'Save',
      cancel: 'Cancel',
      lowStockWarning: 'LOW STOCK',
      normal: 'OK',
      total: 'TOTAL',
      lowCount: 'LOW STOCK',
      cat_PROTEIN: 'PROTEIN',
      cat_VEGETABLE: 'VEG',
      cat_CONDIMENT: 'CONDIMENT',
      cat_DRY_GOODS: 'DRY GOODS',
      cat_OTHER: 'OTHER'
    }
  }[language];

  useEffect(() => {
    fetchIngredients();
  }, []);

  const fetchIngredients = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/kitchen/ingredients');
      const data = await res.json();
      setIngredients(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStock = async (id) => {
    try {
      setSaving(true);
      const res = await fetch(`/api/kitchen/ingredients/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentStock: parseFloat(editValue) })
      });
      if (res.ok) {
        setIngredients(ingredients.map(ing => ing.id === id ? { ...ing, currentStock: parseFloat(editValue) } : ing));
        setEditingId(null);
      }
    } catch (err) {
      alert('Error updating stock');
    } finally {
      setSaving(false);
    }
  };

  const handleAddIngredient = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch('/api/kitchen/ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...addForm,
          currentStock: parseFloat(addForm.currentStock) || 0,
          minStock: parseFloat(addForm.minStock) || 0,
          costPerUnit: addForm.costPerUnit ? parseFloat(addForm.costPerUnit) : undefined
        })
      });

      if (res.ok) {
        const created = await res.json();
        setIngredients(prev => [...prev, created]);
        setShowAddModal(false);
        setAddForm({
          ingredientId: '',
          name: '',
          unit: '',
          category: 'OTHER',
          currentStock: 0,
          minStock: 0,
          costPerUnit: ''
        });
      }
    } catch (err) {
      alert('Error creating ingredient');
    } finally {
      setSaving(false);
    }
  };

  const filtered = ingredients.filter(ing => {
    const matchesSearch = ing.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filter === 'ALL' || ing.category === filter;
    const matchesLow = !lowStockOnly || ing.currentStock <= ing.minStock;
    return matchesSearch && matchesCategory && matchesLow;
  });

  const lowCount = ingredients.filter(ing => ing.currentStock <= ing.minStock).length;

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 space-y-4">
      <Loader2 className="w-12 h-12 text-[#C9A34E] animate-spin" />
      <span className="text-[#C9A34E] font-black animate-pulse uppercase tracking-[0.3em]">LOADING INVENTORY...</span>
    </div>
  );

  return (
    <div className="bg-[#0A1A2F] rounded-[2.5rem] border border-white/10 p-8 shadow-2xl overflow-hidden">
      <div className="flex flex-col lg:flex-row justify-between gap-6 mb-8">
        <div>
          <h2 className="text-4xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
            <Package className="text-[#C9A34E]" size={36} /> {t.title}
            <button 
              onClick={() => setShowAddModal(true)}
              className="ml-4 bg-[#C9A34E] text-[#0A1A2F] p-2 rounded-2xl hover:scale-110 transition-all font-black"
            >
              <Plus size={24} />
            </button>
          </h2>
          <div className="flex gap-4 mt-4">
            <div className="bg-white/5 px-6 py-2 rounded-2xl border border-white/10 flex items-center gap-3">
              <span className="text-xs text-white/40 font-black uppercase tracking-widest">{t.total}</span>
              <span className="text-2xl font-black text-[#C9A34E]">{ingredients.length}</span>
            </div>
            {lowCount > 0 && (
              <div className="bg-red-500/10 px-6 py-2 rounded-2xl border border-red-500/30 flex items-center gap-3 animate-pulse">
                <span className="text-xs text-red-400 font-black uppercase tracking-widest">{t.lowCount}</span>
                <span className="text-2xl font-black text-red-500">{lowCount}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
            <input
              type="text"
              placeholder={t.search}
              className="bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-[#C9A34E]/50 w-full lg:w-80 font-bold"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {['ALL', 'PROTEIN', 'VEGETABLE', 'CONDIMENT', 'DRY_GOODS', 'OTHER'].map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                  filter === cat ? 'bg-[#C9A34E] text-[#0A1A2F]' : 'bg-white/5 text-white/40 hover:bg-white/10'
                }`}
              >
                {cat === 'ALL' ? t.all : t[`cat_${cat}`]}
              </button>
            ))}
            <button
              onClick={() => setLowStockOnly(!lowStockOnly)}
              className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                lowStockOnly ? 'bg-red-500 text-white' : 'bg-white/5 text-red-400 border border-red-500/20'
              }`}
            >
              <AlertTriangle size={12} /> {t.lowStock}
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/10">
              <th className="py-4 text-[10px] font-black text-white/40 uppercase tracking-widest px-4">{t.name}</th>
              <th className="py-4 text-[10px] font-black text-white/40 uppercase tracking-widest px-4">{t.category}</th>
              <th className="py-4 text-[10px] font-black text-white/40 uppercase tracking-widest px-4">{t.stock}</th>
              <th className="py-4 text-[10px] font-black text-white/40 uppercase tracking-widest px-4 text-center">{t.status}</th>
              <th className="py-4 text-[10px] font-black text-white/40 uppercase tracking-widest px-4 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map(ing => (
              <tr key={ing.id} className="hover:bg-white/[0.02] transition-colors group">
                <td className="py-4 px-4">
                  <span className="text-white font-black uppercase tracking-wide">{ing.name}</span>
                </td>
                <td className="py-4 px-4">
                  <span className="text-xs text-white/40 font-bold uppercase tracking-tighter">{t[`cat_${ing.category}`]}</span>
                </td>
                <td className="py-4 px-4">
                  {editingId === ing.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        type="number"
                        className="w-20 bg-black/50 border border-[#C9A34E]/50 rounded px-2 py-1 text-[#C9A34E] font-black"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleUpdateStock(ing.id)}
                      />
                      <button onClick={() => handleUpdateStock(ing.id)} disabled={saving} className="text-emerald-500"><Check size={18}/></button>
                      <button onClick={() => setEditingId(null)} className="text-red-500"><X size={18}/></button>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className={`text-xl font-black ${ing.currentStock <= ing.minStock ? 'text-red-500' : 'text-[#C9A34E]'}`}>
                        {ing.currentStock}
                      </span>
                      <span className="text-[10px] text-white/40 font-bold uppercase">{ing.unit}</span>
                      <span className="text-[10px] text-white/20 ml-2">({t.min}: {ing.minStock})</span>
                    </div>
                  )}
                </td>
                <td className="py-4 px-4 text-center">
                  {ing.currentStock <= ing.minStock ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-500 text-[10px] font-black uppercase border border-red-500/20">
                      <AlertTriangle size={10} /> {t.lowStockWarning}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase border border-emerald-500/20">
                      <Check size={10} /> {t.normal}
                    </span>
                  )}
                </td>
                <td className="py-4 px-4 text-right">
                  <button
                    onClick={() => { setEditingId(ing.id); setEditValue(ing.currentStock.toString()); }}
                    className="opacity-0 group-hover:opacity-100 p-2 text-white/20 hover:text-[#C9A34E] transition-all"
                  >
                    <Edit3 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0A1A2F] border border-white/10 rounded-[2rem] p-8 w-full max-w-xl max-h-[90vh] overflow-y-auto relative animate-scale-up">
            <button 
              onClick={() => setShowAddModal(false)}
              className="absolute top-6 right-6 text-white/40 hover:text-white"
            >
              <X size={24} />
            </button>

            <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-8 flex items-center gap-3">
              <Plus className="text-[#C9A34E]" size={28} /> เพิ่มวัตถุดิบใหม่
            </h3>

            <form onSubmit={handleAddIngredient} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-1">
                  <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">ID วัตถุดิบ (ING-XXX)</label>
                  <input
                    required
                    type="text"
                    placeholder="ING-001"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-[#C9A34E]/50 placeholder:text-white/20"
                    value={addForm.ingredientId}
                    onChange={e => setAddForm({...addForm, ingredientId: e.target.value.toUpperCase()})}
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">หมวดหมู่</label>
                  <select
                    className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-[#C9A34E]/50"
                    value={addForm.category}
                    onChange={e => setAddForm({...addForm, category: e.target.value})}
                  >
                    <option value="PROTEIN">PROTEIN</option>
                    <option value="VEGETABLE">VEG</option>
                    <option value="CONDIMENT">CONDIMENT</option>
                    <option value="DRY_GOODS">DRY GOODS</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">ชื่อวัตถุดิบ</label>
                <input
                  required
                  type="text"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-[#C9A34E]/50"
                  value={addForm.name}
                  onChange={e => setAddForm({...addForm, name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">หน่วย (เช่น kg)</label>
                  <input
                    required
                    type="text"
                    placeholder="kg"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-[#C9A34E]/50 placeholder:text-white/20"
                    value={addForm.unit}
                    onChange={e => setAddForm({...addForm, unit: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">สต็อกปัจจุบัน</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-[#C9A34E]/50"
                    value={addForm.currentStock}
                    onChange={e => setAddForm({...addForm, currentStock: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">สต็อกต่ำสุด</label>
                  <input
                    type="number"
                    step="1"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-[#C9A34E]/50"
                    value={addForm.minStock}
                    onChange={e => setAddForm({...addForm, minStock: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">ต้นทุนต่อหน่วย (ถ้ามี)</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-[#C9A34E]/50"
                  value={addForm.costPerUnit}
                  onChange={e => setAddForm({...addForm, costPerUnit: e.target.value})}
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-[#C9A34E] text-[#0A1A2F] font-black rounded-2xl py-4 uppercase tracking-[0.2em] shadow-xl shadow-amber-900/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
              >
                {saving ? 'กำลังสร้าง...' : 'สร้างวัตถุดิบใหม่'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
