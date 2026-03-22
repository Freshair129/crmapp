'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Package, ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, ClipboardCheck,
  Warehouse, Search, Loader2, Plus, X, Filter, ScanBarcode, ChevronDown,
  ChevronRight, AlertTriangle, CheckCircle2, XCircle, RefreshCw,
  MapPin, Hash, FileText, Truck, Calendar, Eye, ToggleLeft, ToggleRight
} from 'lucide-react';

const TABS = [
  { key: 'overview', label: 'ภาพรวมสต็อก', icon: Package },
  { key: 'movements', label: 'รับเข้า / จ่ายออก', icon: ArrowDownToLine },
  { key: 'transfer', label: 'โอนย้าย', icon: ArrowLeftRight },
  { key: 'count', label: 'นับสต็อก', icon: ClipboardCheck },
  { key: 'warehouses', label: 'คลังสินค้า', icon: Warehouse },
];

const MOVEMENT_REASONS = [
  { value: 'SALE', label: 'ขาย' },
  { value: 'DAMAGE', label: 'เสียหาย' },
  { value: 'EXPIRED', label: 'หมดอายุ' },
  { value: 'GIFT', label: 'ของแถม' },
  { value: 'CLASS_USE', label: 'ใช้ในคลาส' },
];

function StatusBadge({ status }) {
  const map = {
    OK: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'OK' },
    LOW: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'LOW' },
    OUT: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'OUT' },
  };
  const s = map[status] || map.OK;
  return (
    <span className={`${s.bg} ${s.text} px-2 py-0.5 rounded-full text-[9px] font-black uppercase`}>
      {s.label}
    </span>
  );
}

function CountStatusBadge({ status }) {
  const map = {
    OPEN: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'กำลังนับ' },
    COMPLETED: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'เสร็จสิ้น' },
    CANCELLED: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'ยกเลิก' },
  };
  const s = map[status] || map.OPEN;
  return (
    <span className={`${s.bg} ${s.text} px-2 py-0.5 rounded-full text-[9px] font-black uppercase`}>
      {s.label}
    </span>
  );
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function formatQty(n) {
  if (n == null) return '—';
  return n.toLocaleString('th-TH');
}

// ─── STOCK OVERVIEW TAB ────────────────────────────────────────────
function StockOverviewTab({ warehouses }) {
  const [loading, setLoading] = useState(true);
  const [stock, setStock] = useState([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [movements, setMovements] = useState([]);
  const [movementsLoading, setMovementsLoading] = useState(false);

  const fetchStock = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (warehouseId) params.set('warehouseId', warehouseId);
      if (lowStockOnly) params.set('lowStockOnly', 'true');
      if (barcodeInput.trim()) params.set('search', barcodeInput.trim());
      const res = await fetch(`/api/inventory/stock?${params}`);
      const data = await res.json();
      setStock(data.success ? data.data : []);
    } catch (err) {
      console.error('[InventoryControlPanel] fetchStock error', err);
    } finally {
      setLoading(false);
    }
  }, [warehouseId, lowStockOnly, barcodeInput]);

  useEffect(() => { fetchStock(); }, [fetchStock]);

  const fetchMovements = async (productId) => {
    try {
      setMovementsLoading(true);
      const res = await fetch(`/api/inventory/movements?productId=${productId}&limit=20`);
      const data = await res.json();
      setMovements(data.success ? data.data : []);
    } catch (err) {
      console.error('[InventoryControlPanel] fetchMovements error', err);
    } finally {
      setMovementsLoading(false);
    }
  };

  const handleRowClick = (item) => {
    if (selectedProduct?.id === item.id) {
      setSelectedProduct(null);
      setMovements([]);
    } else {
      setSelectedProduct(item);
      fetchMovements(item.productId || item.id);
    }
  };

  const getStatus = (qty, minStock) => {
    if (qty <= 0) return 'OUT';
    if (qty <= minStock) return 'LOW';
    return 'OK';
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={warehouseId}
          onChange={(e) => setWarehouseId(e.target.value)}
          className="bg-[#0c1a2f] border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm appearance-none min-w-[180px]"
        >
          <option value="">คลังทั้งหมด</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
          ))}
        </select>

        <button
          onClick={() => setLowStockOnly(!lowStockOnly)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
            lowStockOnly
              ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
              : 'bg-white/5 border-white/10 text-white/50 hover:text-white/80'
          }`}
        >
          {lowStockOnly ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
          Low Stock Only
        </button>

        <div className="relative flex-1 min-w-[200px]">
          <ScanBarcode size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            placeholder="Barcode / ค้นหาสินค้า..."
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchStock()}
            className="bg-white/5 border border-white/10 text-white px-4 py-2.5 pl-9 rounded-xl text-sm w-full placeholder:text-white/20"
          />
        </div>

        <button onClick={fetchStock} className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-white/50 hover:text-white transition-colors">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-white/30" size={24} />
        </div>
      ) : stock.length === 0 ? (
        <p className="text-white/30 text-xs text-center py-8">ไม่มีข้อมูล</p>
      ) : (
        <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-white/40 font-medium">สินค้า</th>
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-white/40 font-medium">หมวด</th>
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-white/40 font-medium">คลัง</th>
                  <th className="text-right px-4 py-3 text-[10px] uppercase tracking-widest text-white/40 font-medium">จำนวน</th>
                  <th className="text-right px-4 py-3 text-[10px] uppercase tracking-widest text-white/40 font-medium">ขั้นต่ำ</th>
                  <th className="text-center px-4 py-3 text-[10px] uppercase tracking-widest text-white/40 font-medium">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {stock.map((item) => {
                  const status = getStatus(item.quantity, item.minStock);
                  const isSelected = selectedProduct?.id === item.id;
                  return (
                    <React.Fragment key={item.id}>
                      <tr
                        onClick={() => handleRowClick(item)}
                        className={`border-b border-white/5 cursor-pointer transition-colors ${
                          isSelected ? 'bg-[#cc9d37]/10' : 'hover:bg-white/[0.03]'
                        }`}
                      >
                        <td className="px-4 py-3 text-white font-medium flex items-center gap-2">
                          {isSelected ? <ChevronDown size={12} className="text-[#cc9d37] shrink-0" /> : <ChevronRight size={12} className="text-white/20 shrink-0" />}
                          {item.name}
                        </td>
                        <td className="px-4 py-3 text-white/50">{item.category || '—'}</td>
                        <td className="px-4 py-3 text-white/50">{item.warehouseName || '—'}</td>
                        <td className="px-4 py-3 text-right text-white font-mono">{formatQty(item.quantity)}</td>
                        <td className="px-4 py-3 text-right text-white/40 font-mono">{formatQty(item.minStock)}</td>
                        <td className="px-4 py-3 text-center"><StatusBadge status={status} /></td>
                      </tr>
                      {isSelected && (
                        <tr>
                          <td colSpan={6} className="bg-white/[0.02] px-6 py-4">
                            <p className="text-[10px] uppercase tracking-widest text-white/40 mb-3">ประวัติเคลื่อนไหว</p>
                            {movementsLoading ? (
                              <div className="flex justify-center py-4"><Loader2 className="animate-spin text-white/20" size={16} /></div>
                            ) : movements.length === 0 ? (
                              <p className="text-white/20 text-xs text-center py-4">ยังไม่มีรายการเคลื่อนไหว</p>
                            ) : (
                              <div className="space-y-1.5">
                                {movements.map((m) => (
                                  <div key={m.id} className="flex items-center justify-between text-xs bg-white/[0.03] rounded-lg px-3 py-2">
                                    <div className="flex items-center gap-2">
                                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                                        m.type === 'RECEIVE' ? 'bg-emerald-500/20 text-emerald-400'
                                          : m.type === 'ISSUE' ? 'bg-red-500/20 text-red-400'
                                          : 'bg-blue-500/20 text-blue-400'
                                      }`}>{m.type}</span>
                                      <span className="text-white/60">{m.reason || m.notes || '—'}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                      <span className={`font-mono ${m.type === 'RECEIVE' ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {m.type === 'RECEIVE' ? '+' : '-'}{formatQty(m.quantity)}
                                      </span>
                                      <span className="text-white/30">{formatDate(m.createdAt)}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MOVEMENTS TAB (RECEIVE / ISSUE) ──────────────────────────────
function MovementsTab({ warehouses }) {
  const [subMode, setSubMode] = useState('RECEIVE');
  const [submitting, setSubmitting] = useState(false);
  const [recentMovements, setRecentMovements] = useState([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const emptyForm = { productId: '', productName: '', warehouseId: '', quantity: '', unitCost: '', reason: 'SALE', notes: '' };
  const [form, setForm] = useState(emptyForm);

  const fetchRecent = useCallback(async () => {
    try {
      setRecentLoading(true);
      const res = await fetch('/api/inventory/movements?limit=20');
      const data = await res.json();
      setRecentMovements(data.success ? data.data : []);
    } catch (err) {
      console.error('[InventoryControlPanel] fetchRecent error', err);
    } finally {
      setRecentLoading(false);
    }
  }, []);

  useEffect(() => { fetchRecent(); }, [fetchRecent]);

  const searchProducts = useCallback(async (term) => {
    if (!term || term.length < 2) { setProductResults([]); return; }
    try {
      setSearchLoading(true);
      const res = await fetch(`/api/inventory/stock?search=${encodeURIComponent(term)}`);
      const data = await res.json();
      setProductResults(data.success ? data.data : []);
    } catch (err) {
      console.error('[InventoryControlPanel] searchProducts error', err);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchProducts(productSearch), 300);
    return () => clearTimeout(timer);
  }, [productSearch, searchProducts]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.productId || !form.warehouseId || !form.quantity) return;
    try {
      setSubmitting(true);
      const body = {
        type: subMode,
        productId: form.productId,
        warehouseId: form.warehouseId,
        quantity: parseFloat(form.quantity),
        reason: form.reason,
        notes: form.notes || undefined,
      };
      if (subMode === 'RECEIVE' && form.unitCost) {
        body.unitCost = parseFloat(form.unitCost);
      }
      const res = await fetch('/api/inventory/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setForm(emptyForm);
        setProductSearch('');
        fetchRecent();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create movement');
      }
    } catch (err) {
      console.error('[InventoryControlPanel] handleSubmit error', err);
      alert('Error creating movement');
    } finally {
      setSubmitting(false);
    }
  };

  const selectProduct = (item) => {
    setForm((f) => ({ ...f, productId: item.productId || item.id, productName: item.name }));
    setProductSearch(item.name);
    setProductResults([]);
  };

  return (
    <div className="space-y-6">
      {/* Sub-mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setSubMode('RECEIVE')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold uppercase tracking-widest transition-colors ${
            subMode === 'RECEIVE'
              ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
              : 'bg-white/5 border border-white/10 text-white/40 hover:text-white/70'
          }`}
        >
          <ArrowDownToLine size={14} /> รับเข้า (Receive)
        </button>
        <button
          onClick={() => setSubMode('ISSUE')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold uppercase tracking-widest transition-colors ${
            subMode === 'ISSUE'
              ? 'bg-red-500/20 border border-red-500/40 text-red-400'
              : 'bg-white/5 border border-white/10 text-white/40 hover:text-white/70'
          }`}
        >
          <ArrowUpFromLine size={14} /> จ่ายออก (Issue)
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Product search */}
          <div className="relative">
            <label className="text-[10px] uppercase tracking-widest text-white/40 mb-1.5 block">สินค้า *</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                placeholder="ค้นหาสินค้า..."
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  if (!e.target.value) setForm((f) => ({ ...f, productId: '', productName: '' }));
                }}
                className="bg-white/5 border border-white/10 text-white px-4 py-2.5 pl-9 rounded-xl text-sm w-full placeholder:text-white/20"
              />
            </div>
            {productResults.length > 0 && (
              <div className="absolute z-20 top-full mt-1 w-full bg-[#0D2240] border border-white/10 rounded-xl overflow-hidden shadow-xl max-h-48 overflow-y-auto">
                {productResults.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectProduct(item)}
                    className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-white/5 transition-colors flex items-center justify-between"
                  >
                    <span>{item.name}</span>
                    <span className="text-white/30 text-xs">{item.category || ''}</span>
                  </button>
                ))}
              </div>
            )}
            {searchLoading && (
              <div className="absolute right-3 top-[38px]"><Loader2 className="animate-spin text-white/20" size={14} /></div>
            )}
          </div>

          {/* Warehouse */}
          <div>
            <label className="text-[10px] uppercase tracking-widest text-white/40 mb-1.5 block">คลังสินค้า *</label>
            <select
              value={form.warehouseId}
              onChange={(e) => setForm((f) => ({ ...f, warehouseId: e.target.value }))}
              className="bg-[#0c1a2f] border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm w-full appearance-none"
              required
            >
              <option value="">เลือกคลัง</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
              ))}
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label className="text-[10px] uppercase tracking-widest text-white/40 mb-1.5 block">จำนวน *</label>
            <input
              type="number"
              min="1"
              step="1"
              value={form.quantity}
              onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
              placeholder="0"
              className="bg-white/5 border border-white/10 text-white px-4 py-2.5 rounded-xl text-sm w-full placeholder:text-white/20"
              required
            />
          </div>

          {/* Unit cost (receive only) */}
          {subMode === 'RECEIVE' && (
            <div>
              <label className="text-[10px] uppercase tracking-widest text-white/40 mb-1.5 block">ต้นทุนต่อหน่วย (บาท)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.unitCost}
                onChange={(e) => setForm((f) => ({ ...f, unitCost: e.target.value }))}
                placeholder="0.00"
                className="bg-white/5 border border-white/10 text-white px-4 py-2.5 rounded-xl text-sm w-full placeholder:text-white/20"
              />
            </div>
          )}

          {/* Reason (issue only) */}
          {subMode === 'ISSUE' && (
            <div>
              <label className="text-[10px] uppercase tracking-widest text-white/40 mb-1.5 block">เหตุผล</label>
              <select
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                className="bg-[#0c1a2f] border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm w-full appearance-none"
              >
                {MOVEMENT_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="text-[10px] uppercase tracking-widest text-white/40 mb-1.5 block">หมายเหตุ</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            rows={2}
            placeholder="รายละเอียดเพิ่มเติม..."
            className="bg-white/5 border border-white/10 text-white px-4 py-2.5 rounded-xl text-sm w-full placeholder:text-white/20 resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={submitting || !form.productId || !form.warehouseId || !form.quantity}
          className="bg-[#cc9d37] hover:bg-amber-400 text-[#0c1a2f] font-black uppercase tracking-widest px-6 py-2.5 rounded-xl text-sm disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {submitting ? <Loader2 className="animate-spin" size={14} /> : subMode === 'RECEIVE' ? <ArrowDownToLine size={14} /> : <ArrowUpFromLine size={14} />}
          {subMode === 'RECEIVE' ? 'บันทึกรับเข้า' : 'บันทึกจ่ายออก'}
        </button>
      </form>

      {/* Recent movements */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-white/40 mb-3">รายการล่าสุด</p>
        {recentLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-white/20" size={20} /></div>
        ) : recentMovements.length === 0 ? (
          <p className="text-white/30 text-xs text-center py-8">ไม่มีข้อมูล</p>
        ) : (
          <div className="space-y-1.5">
            {recentMovements.map((m) => (
              <div key={m.id} className="flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 text-sm">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                    m.type === 'RECEIVE' ? 'bg-emerald-500/20 text-emerald-400'
                      : m.type === 'ISSUE' ? 'bg-red-500/20 text-red-400'
                      : 'bg-blue-500/20 text-blue-400'
                  }`}>{m.type}</span>
                  <span className="text-white font-medium">{m.productName || m.productId}</span>
                  <span className="text-white/30 text-xs">{m.warehouseName || ''}</span>
                </div>
                <div className="flex items-center gap-4">
                  {m.reason && <span className="text-white/30 text-xs">{m.reason}</span>}
                  <span className={`font-mono font-bold ${m.type === 'RECEIVE' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {m.type === 'RECEIVE' ? '+' : '-'}{formatQty(m.quantity)}
                  </span>
                  <span className="text-white/20 text-xs">{formatDate(m.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TRANSFER TAB ──────────────────────────────────────────────────
function TransferTab({ warehouses }) {
  const [submitting, setSubmitting] = useState(false);
  const [recentTransfers, setRecentTransfers] = useState([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const emptyForm = { productId: '', productName: '', fromWarehouseId: '', toWarehouseId: '', quantity: '', notes: '' };
  const [form, setForm] = useState(emptyForm);

  const fetchRecent = useCallback(async () => {
    try {
      setRecentLoading(true);
      const res = await fetch('/api/inventory/movements?type=TRANSFER&limit=20');
      const data = await res.json();
      setRecentTransfers(data.success ? data.data : []);
    } catch (err) {
      console.error('[InventoryControlPanel] fetchRecentTransfers error', err);
    } finally {
      setRecentLoading(false);
    }
  }, []);

  useEffect(() => { fetchRecent(); }, [fetchRecent]);

  const searchProducts = useCallback(async (term) => {
    if (!term || term.length < 2) { setProductResults([]); return; }
    try {
      setSearchLoading(true);
      const res = await fetch(`/api/inventory/stock?search=${encodeURIComponent(term)}`);
      const data = await res.json();
      setProductResults(data.success ? data.data : []);
    } catch (err) {
      console.error('[InventoryControlPanel] searchProducts error', err);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchProducts(productSearch), 300);
    return () => clearTimeout(timer);
  }, [productSearch, searchProducts]);

  const selectProduct = (item) => {
    setForm((f) => ({ ...f, productId: item.productId || item.id, productName: item.name }));
    setProductSearch(item.name);
    setProductResults([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.productId || !form.fromWarehouseId || !form.toWarehouseId || !form.quantity) return;
    if (form.fromWarehouseId === form.toWarehouseId) {
      alert('คลังต้นทางและปลายทางต้องไม่เหมือนกัน');
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch('/api/inventory/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'TRANSFER',
          productId: form.productId,
          fromWarehouseId: form.fromWarehouseId,
          toWarehouseId: form.toWarehouseId,
          quantity: parseFloat(form.quantity),
          notes: form.notes || undefined,
        }),
      });
      if (res.ok) {
        setForm(emptyForm);
        setProductSearch('');
        fetchRecent();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create transfer');
      }
    } catch (err) {
      console.error('[InventoryControlPanel] transfer error', err);
      alert('Error creating transfer');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* From warehouse */}
          <div>
            <label className="text-[10px] uppercase tracking-widest text-white/40 mb-1.5 block">คลังต้นทาง *</label>
            <select
              value={form.fromWarehouseId}
              onChange={(e) => setForm((f) => ({ ...f, fromWarehouseId: e.target.value }))}
              className="bg-[#0c1a2f] border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm w-full appearance-none"
              required
            >
              <option value="">เลือกคลังต้นทาง</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
              ))}
            </select>
          </div>

          {/* To warehouse */}
          <div>
            <label className="text-[10px] uppercase tracking-widest text-white/40 mb-1.5 block">คลังปลายทาง *</label>
            <select
              value={form.toWarehouseId}
              onChange={(e) => setForm((f) => ({ ...f, toWarehouseId: e.target.value }))}
              className="bg-[#0c1a2f] border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm w-full appearance-none"
              required
            >
              <option value="">เลือกคลังปลายทาง</option>
              {warehouses.filter((w) => w.id !== form.fromWarehouseId).map((w) => (
                <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
              ))}
            </select>
          </div>

          {/* Product search */}
          <div className="relative">
            <label className="text-[10px] uppercase tracking-widest text-white/40 mb-1.5 block">สินค้า *</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                placeholder="ค้นหาสินค้า..."
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  if (!e.target.value) setForm((f) => ({ ...f, productId: '', productName: '' }));
                }}
                className="bg-white/5 border border-white/10 text-white px-4 py-2.5 pl-9 rounded-xl text-sm w-full placeholder:text-white/20"
              />
            </div>
            {productResults.length > 0 && (
              <div className="absolute z-20 top-full mt-1 w-full bg-[#0D2240] border border-white/10 rounded-xl overflow-hidden shadow-xl max-h-48 overflow-y-auto">
                {productResults.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectProduct(item)}
                    className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-white/5 transition-colors"
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            )}
            {searchLoading && (
              <div className="absolute right-3 top-[38px]"><Loader2 className="animate-spin text-white/20" size={14} /></div>
            )}
          </div>

          {/* Quantity */}
          <div>
            <label className="text-[10px] uppercase tracking-widest text-white/40 mb-1.5 block">จำนวน *</label>
            <input
              type="number"
              min="1"
              step="1"
              value={form.quantity}
              onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
              placeholder="0"
              className="bg-white/5 border border-white/10 text-white px-4 py-2.5 rounded-xl text-sm w-full placeholder:text-white/20"
              required
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-[10px] uppercase tracking-widest text-white/40 mb-1.5 block">หมายเหตุ</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            rows={2}
            placeholder="รายละเอียดการโอนย้าย..."
            className="bg-white/5 border border-white/10 text-white px-4 py-2.5 rounded-xl text-sm w-full placeholder:text-white/20 resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={submitting || !form.productId || !form.fromWarehouseId || !form.toWarehouseId || !form.quantity}
          className="bg-[#cc9d37] hover:bg-amber-400 text-[#0c1a2f] font-black uppercase tracking-widest px-6 py-2.5 rounded-xl text-sm disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {submitting ? <Loader2 className="animate-spin" size={14} /> : <ArrowLeftRight size={14} />}
          บันทึกการโอนย้าย
        </button>
      </form>

      {/* Recent transfers */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-white/40 mb-3">การโอนย้ายล่าสุด</p>
        {recentLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-white/20" size={20} /></div>
        ) : recentTransfers.length === 0 ? (
          <p className="text-white/30 text-xs text-center py-8">ไม่มีข้อมูล</p>
        ) : (
          <div className="space-y-1.5">
            {recentTransfers.map((m) => (
              <div key={m.id} className="flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 text-sm">
                <div className="flex items-center gap-3">
                  <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full text-[9px] font-black uppercase">TRANSFER</span>
                  <span className="text-white font-medium">{m.productName || m.productId}</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-white/40">{m.fromWarehouseName || '?'}</span>
                  <ArrowLeftRight size={12} className="text-white/20" />
                  <span className="text-white/40">{m.toWarehouseName || '?'}</span>
                  <span className="font-mono text-blue-400">{formatQty(m.quantity)}</span>
                  <span className="text-white/20">{formatDate(m.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── STOCK COUNT TAB ───────────────────────────────────────────────
function StockCountTab({ warehouses }) {
  const [activeCount, setActiveCount] = useState(null);
  const [countItems, setCountItems] = useState([]);
  const [countLoading, setCountLoading] = useState(false);
  const [startingCount, setStartingCount] = useState(false);
  const [completingCount, setCompletingCount] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [countHistory, setCountHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const res = await fetch('/api/inventory/counts?limit=20');
      const data = await res.json();
      setCountHistory(data.success ? data.data : []);
      // Check for active count
      const active = (data.success ? data.data : []).find((c) => c.status === 'OPEN');
      if (active) {
        setActiveCount(active);
        setCountItems(
          (active.items || []).map((item) => ({
            ...item,
            physicalQty: item.physicalQty ?? '',
          }))
        );
      }
    } catch (err) {
      console.error('[InventoryControlPanel] fetchHistory error', err);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const startCount = async () => {
    if (!selectedWarehouse) {
      alert('กรุณาเลือกคลังสินค้า');
      return;
    }
    try {
      setStartingCount(true);
      const res = await fetch('/api/inventory/counts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ warehouseId: selectedWarehouse }),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveCount(data.data);
        setCountItems(
          (data.data.items || []).map((item) => ({
            ...item,
            physicalQty: '',
          }))
        );
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to start count');
      }
    } catch (err) {
      console.error('[InventoryControlPanel] startCount error', err);
      alert('Error starting count');
    } finally {
      setStartingCount(false);
    }
  };

  const completeCount = async () => {
    if (!activeCount) return;
    const itemsPayload = countItems
      .filter((item) => item.physicalQty !== '' && item.physicalQty != null)
      .map((item) => ({
        productId: item.productId,
        physicalQty: parseFloat(item.physicalQty),
      }));

    if (itemsPayload.length === 0) {
      alert('กรุณากรอกจำนวนนับจริงอย่างน้อย 1 รายการ');
      return;
    }

    try {
      setCompletingCount(true);
      const res = await fetch(`/api/inventory/counts/${activeCount.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsPayload }),
      });
      if (res.ok) {
        setActiveCount(null);
        setCountItems([]);
        fetchHistory();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to complete count');
      }
    } catch (err) {
      console.error('[InventoryControlPanel] completeCount error', err);
      alert('Error completing count');
    } finally {
      setCompletingCount(false);
    }
  };

  const updatePhysicalQty = (index, value) => {
    setCountItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], physicalQty: value };
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Start new count or active count */}
      {!activeCount ? (
        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5">
          <p className="text-[10px] uppercase tracking-widest text-white/40 mb-4">เริ่มนับสต็อกใหม่</p>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-[10px] uppercase tracking-widest text-white/40 mb-1.5 block">เลือกคลัง *</label>
              <select
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
                className="bg-[#0c1a2f] border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm w-full appearance-none"
              >
                <option value="">เลือกคลังสินค้า</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                ))}
              </select>
            </div>
            <button
              onClick={startCount}
              disabled={startingCount || !selectedWarehouse}
              className="bg-[#cc9d37] hover:bg-amber-400 text-[#0c1a2f] font-black uppercase tracking-widest px-6 py-2.5 rounded-xl text-sm disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              {startingCount ? <Loader2 className="animate-spin" size={14} /> : <ClipboardCheck size={14} />}
              เริ่มนับสต็อก
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white/[0.02] border border-[#cc9d37]/30 rounded-2xl overflow-hidden">
          <div className="bg-[#cc9d37]/10 px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ClipboardCheck size={16} className="text-[#cc9d37]" />
              <span className="text-sm font-bold text-[#cc9d37] uppercase tracking-widest">กำลังนับสต็อก</span>
              <span className="text-white/40 text-xs">{activeCount.warehouseName || ''}</span>
            </div>
            <button
              onClick={completeCount}
              disabled={completingCount}
              className="bg-[#cc9d37] hover:bg-amber-400 text-[#0c1a2f] font-black uppercase tracking-widest px-5 py-2 rounded-xl text-xs disabled:opacity-30 transition-colors flex items-center gap-2"
            >
              {completingCount ? <Loader2 className="animate-spin" size={12} /> : <CheckCircle2 size={12} />}
              เสร็จสิ้นการนับ
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-white/40 font-medium">สินค้า</th>
                  <th className="text-right px-4 py-3 text-[10px] uppercase tracking-widest text-white/40 font-medium">ในระบบ</th>
                  <th className="text-right px-4 py-3 text-[10px] uppercase tracking-widest text-white/40 font-medium">นับจริง</th>
                  <th className="text-right px-4 py-3 text-[10px] uppercase tracking-widest text-white/40 font-medium">ผลต่าง</th>
                </tr>
              </thead>
              <tbody>
                {countItems.map((item, idx) => {
                  const variance = item.physicalQty !== '' ? parseFloat(item.physicalQty) - (item.systemQty || 0) : null;
                  return (
                    <tr key={item.productId || idx} className="border-b border-white/5">
                      <td className="px-4 py-3 text-white font-medium">{item.productName || item.productId}</td>
                      <td className="px-4 py-3 text-right text-white/40 font-mono">{formatQty(item.systemQty)}</td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={item.physicalQty}
                          onChange={(e) => updatePhysicalQty(idx, e.target.value)}
                          placeholder="—"
                          className="bg-white/5 border border-white/10 text-white px-3 py-1.5 rounded-lg text-sm w-24 text-right font-mono placeholder:text-white/15"
                        />
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {variance !== null ? (
                          <span className={`font-bold ${variance < 0 ? 'text-red-400' : variance > 0 ? 'text-emerald-400' : 'text-white/40'}`}>
                            {variance > 0 ? '+' : ''}{variance}
                          </span>
                        ) : (
                          <span className="text-white/15">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {countItems.length === 0 && (
            <p className="text-white/30 text-xs text-center py-8">ไม่มีสินค้าในคลังนี้</p>
          )}
        </div>
      )}

      {/* Count history */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-white/40 mb-3">ประวัติการนับสต็อก</p>
        {historyLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-white/20" size={20} /></div>
        ) : countHistory.length === 0 ? (
          <p className="text-white/30 text-xs text-center py-8">ไม่มีข้อมูล</p>
        ) : (
          <div className="space-y-1.5">
            {countHistory.map((c) => (
              <div key={c.id} className="flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 text-sm">
                <div className="flex items-center gap-3">
                  <CountStatusBadge status={c.status} />
                  <span className="text-white font-medium">{c.warehouseName || c.warehouseId}</span>
                  <span className="text-white/30 text-xs">{c.itemCount || 0} รายการ</span>
                </div>
                <div className="flex items-center gap-3">
                  {c.varianceCount != null && c.varianceCount !== 0 && (
                    <span className="text-red-400 text-xs flex items-center gap-1">
                      <AlertTriangle size={11} /> {c.varianceCount} ผลต่าง
                    </span>
                  )}
                  <span className="text-white/20 text-xs">{formatDate(c.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── WAREHOUSES TAB ────────────────────────────────────────────────
function WarehousesTab({ warehouses, onRefresh }) {
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(null);

  const emptyForm = { name: '', code: '', address: '' };
  const [form, setForm] = useState(emptyForm);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name || !form.code) return;
    if (form.code.length < 2 || form.code.length > 6) {
      alert('รหัสคลังต้องมี 2-6 ตัวอักษร');
      return;
    }
    try {
      setSaving(true);
      const res = await fetch('/api/inventory/warehouses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          code: form.code.toUpperCase(),
          address: form.address || undefined,
        }),
      });
      if (res.ok) {
        setShowModal(false);
        setForm(emptyForm);
        onRefresh();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create warehouse');
      }
    } catch (err) {
      console.error('[InventoryControlPanel] handleCreate error', err);
      alert('Error creating warehouse');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (warehouse) => {
    try {
      setToggling(warehouse.id);
      const res = await fetch(`/api/inventory/warehouses/${warehouse.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !warehouse.isActive }),
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error('[InventoryControlPanel] toggleActive error', err);
    } finally {
      setToggling(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowModal(true)}
          className="bg-[#cc9d37] hover:bg-amber-400 text-[#0c1a2f] font-black uppercase tracking-widest px-5 py-2.5 rounded-xl text-sm transition-colors flex items-center gap-2"
        >
          <Plus size={14} /> เพิ่มคลัง
        </button>
      </div>

      {/* Warehouse grid */}
      {warehouses.length === 0 ? (
        <p className="text-white/30 text-xs text-center py-8">ไม่มีข้อมูล</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {warehouses.map((w) => (
            <div
              key={w.id}
              className={`bg-white/[0.02] border rounded-2xl p-5 transition-colors ${
                w.isActive !== false ? 'border-white/10' : 'border-white/5 opacity-50'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-white font-bold text-sm">{w.name}</h3>
                  <span className="text-[10px] uppercase tracking-widest text-[#cc9d37] font-bold">WH-{w.code}</span>
                </div>
                <button
                  onClick={() => toggleActive(w)}
                  disabled={toggling === w.id}
                  className="text-white/30 hover:text-white/60 transition-colors"
                >
                  {toggling === w.id ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : w.isActive !== false ? (
                    <ToggleRight size={20} className="text-emerald-400" />
                  ) : (
                    <ToggleLeft size={20} />
                  )}
                </button>
              </div>

              {w.address && (
                <div className="flex items-start gap-1.5 mb-3">
                  <MapPin size={12} className="text-white/20 mt-0.5 shrink-0" />
                  <span className="text-white/40 text-xs">{w.address}</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <span className="bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg text-xs text-white/60 flex items-center gap-1.5">
                  <Package size={11} /> {w.itemCount ?? 0} รายการ
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                  w.isActive !== false ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/30'
                }`}>
                  {w.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add warehouse modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0D1B2A] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-5"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-white font-bold text-sm uppercase tracking-widest">เพิ่มคลังสินค้า</h3>
                <button onClick={() => setShowModal(false)} className="text-white/30 hover:text-white/60">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-white/40 mb-1.5 block">ชื่อคลัง *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="คลังสินค้าหลัก"
                    className="bg-white/5 border border-white/10 text-white px-4 py-2.5 rounded-xl text-sm w-full placeholder:text-white/20"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-widest text-white/40 mb-1.5 block">รหัสคลัง * (2-6 ตัวอักษร, ตัวพิมพ์ใหญ่)</label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) }))}
                    placeholder="MAIN"
                    maxLength={6}
                    className="bg-white/5 border border-white/10 text-white px-4 py-2.5 rounded-xl text-sm w-full placeholder:text-white/20 uppercase font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-widest text-white/40 mb-1.5 block">ที่อยู่</label>
                  <textarea
                    value={form.address}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    rows={2}
                    placeholder="ที่อยู่คลังสินค้า..."
                    className="bg-white/5 border border-white/10 text-white px-4 py-2.5 rounded-xl text-sm w-full placeholder:text-white/20 resize-none"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-5 py-2.5 rounded-xl text-sm text-white/50 hover:text-white/80 border border-white/10 transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !form.name || !form.code || form.code.length < 2}
                    className="bg-[#cc9d37] hover:bg-amber-400 text-[#0c1a2f] font-black uppercase tracking-widest px-6 py-2.5 rounded-xl text-sm disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {saving ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />}
                    สร้างคลัง
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────
export default function InventoryControlPanel() {
  const [activeTab, setActiveTab] = useState('overview');
  const [warehouses, setWarehouses] = useState([]);
  const [warehousesLoading, setWarehousesLoading] = useState(true);

  const fetchWarehouses = useCallback(async () => {
    try {
      setWarehousesLoading(true);
      const res = await fetch('/api/inventory/warehouses');
      const data = await res.json();
      setWarehouses(data.success ? data.data : []);
    } catch (err) {
      console.error('[InventoryControlPanel] fetchWarehouses error', err);
    } finally {
      setWarehousesLoading(false);
    }
  }, []);

  useEffect(() => { fetchWarehouses(); }, [fetchWarehouses]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#cc9d37]/20 flex items-center justify-center">
            <Package size={18} className="text-[#cc9d37]" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg">Inventory Control</h1>
            <p className="text-[10px] uppercase tracking-widest text-white/30">ระบบควบคุมสต็อกสินค้า</p>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1.5 bg-white/[0.02] border border-white/10 rounded-2xl p-1.5 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-colors ${
                isActive
                  ? 'text-[#0c1a2f]'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="inventoryTabBg"
                  className="absolute inset-0 bg-[#cc9d37] rounded-xl"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <Icon size={14} />
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {warehousesLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-white/30" size={24} />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'overview' && <StockOverviewTab warehouses={warehouses} />}
            {activeTab === 'movements' && <MovementsTab warehouses={warehouses} />}
            {activeTab === 'transfer' && <TransferTab warehouses={warehouses} />}
            {activeTab === 'count' && <StockCountTab warehouses={warehouses} />}
            {activeTab === 'warehouses' && <WarehousesTab warehouses={warehouses} onRefresh={fetchWarehouses} />}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
