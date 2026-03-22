'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList, Calculator, Users, Banknote, Truck,
  Plus, Search, Loader2, ChevronDown, ChevronUp,
  Check, X, AlertTriangle, Send, Eye, Package,
  FileText, Calendar, Phone, Mail, MapPin, Hash,
  ArrowRight, Clock, CircleDot, CheckCircle2,
  Edit2, ExternalLink, RefreshCw, Building2
} from 'lucide-react';

// ─── Helpers ───────────────────────────────────────────────────
function formatPrice(n) {
  return n?.toLocaleString('th-TH', { minimumFractionDigits: 0 }) ?? '—';
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' });
}

function formatDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('th-TH', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ─── Constants ─────────────────────────────────────────────────
const TABS = [
  { key: 'po-list', label: 'รายการ PO', icon: ClipboardList },
  { key: 'bom', label: 'คำนวณ BOM', icon: Calculator },
  { key: 'suppliers', label: 'ซัพพลายเออร์', icon: Building2 },
  { key: 'advances', label: 'เงินทดรอง', icon: Banknote },
  { key: 'tracking', label: 'ติดตามสินค้า', icon: Truck },
];

const PO_STATUSES = [
  'ALL', 'DRAFT', 'REQUEST_REVIEW', 'APPROVED', 'REJECTED',
  'ORDERING', 'ORDERED', 'RECEIVING', 'RECEIVED', 'PARTIAL', 'CLOSED', 'ISSUE'
];

const STATUS_COLORS = {
  DRAFT: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  REQUEST_REVIEW: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  APPROVED: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  REJECTED: 'bg-red-500/20 text-red-300 border-red-500/30',
  ORDERING: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  ORDERED: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  RECEIVING: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  RECEIVED: 'bg-green-500/20 text-green-300 border-green-500/30',
  PARTIAL: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  CLOSED: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  ISSUE: 'bg-red-500/20 text-red-300 border-red-500/30',
};

const STATUS_LABELS = {
  ALL: 'ทั้งหมด', DRAFT: 'แบบร่าง', REQUEST_REVIEW: 'รอรีวิว',
  APPROVED: 'อนุมัติ', REJECTED: 'ตีกลับ', ORDERING: 'กำลังสั่ง',
  ORDERED: 'สั่งแล้ว', RECEIVING: 'รับของ', RECEIVED: 'รับแล้ว',
  PARTIAL: 'รับบางส่วน', CLOSED: 'ปิด', ISSUE: 'มีปัญหา',
};

const ADVANCE_STATUS_COLORS = {
  PENDING: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  APPROVED: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  REIMBURSED: 'bg-green-500/20 text-green-300 border-green-500/30',
  REJECTED: 'bg-red-500/20 text-red-300 border-red-500/30',
};

const TRACKING_STEPS = ['PREPARING', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED'];
const TRACKING_LABELS = { PREPARING: 'เตรียมของ', SHIPPED: 'ส่งแล้ว', IN_TRANSIT: 'กำลังจัดส่ง', DELIVERED: 'ส่งถึงแล้ว' };

// ─── Shared UI ─────────────────────────────────────────────────
function StatusBadge({ status, colorMap = STATUS_COLORS, labelMap = STATUS_LABELS }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${colorMap[status] || 'bg-white/10 text-white/50 border-white/10'}`}>
      {labelMap[status] || status}
    </span>
  );
}

function GoldButton({ onClick, children, disabled, small, className = '' }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`bg-[#cc9d37] hover:bg-amber-400 text-[#0c1a2f] font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed ${small ? 'px-3 py-1.5 text-[10px]' : 'px-5 py-2.5 text-xs'} ${className}`}
    >
      {children}
    </button>
  );
}

function DangerButton({ onClick, children, disabled, small }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 font-bold uppercase tracking-widest rounded-xl transition-all disabled:opacity-40 ${small ? 'px-3 py-1.5 text-[10px]' : 'px-5 py-2.5 text-xs'}`}
    >
      {children}
    </button>
  );
}

function InputField({ label, value, onChange, type = 'text', placeholder, required }) {
  return (
    <div className="space-y-1">
      {label && <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">{label}</label>}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full bg-white/5 border border-white/10 text-white px-4 py-2.5 rounded-xl text-sm focus:border-[#cc9d37]/50 focus:outline-none transition-colors placeholder:text-white/20"
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options, placeholder }) {
  return (
    <div className="space-y-1">
      {label && <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">{label}</label>}
      <select
        value={value}
        onChange={onChange}
        className="w-full bg-white/5 border border-white/10 text-white px-4 py-2.5 rounded-xl text-sm focus:border-[#cc9d37]/50 focus:outline-none transition-colors appearance-none"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => (
          <option key={o.value} value={o.value} className="bg-[#0c1a2f] text-white">{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`relative bg-[#0F2440] border border-white/10 rounded-2xl shadow-2xl max-h-[85vh] overflow-y-auto ${wide ? 'w-full max-w-2xl' : 'w-full max-w-lg'}`}
      >
        <div className="flex items-center justify-between p-5 border-b border-white/8">
          <h3 className="text-white font-bold text-sm">{title}</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </motion.div>
    </div>
  );
}

function EmptyState({ text = 'ไม่มีข้อมูล' }) {
  return <p className="text-white/30 text-xs text-center py-8">{text}</p>;
}

// ═══════════════════════════════════════════════════════════════
// TAB 1: PO LIST
// ═══════════════════════════════════════════════════════════════
function POListTab() {
  const [pos, setPOs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [classFilter, setClassFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [reason, setReason] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [grnItems, setGrnItems] = useState({});
  const [orderDates, setOrderDates] = useState({ orderDate: '', expectedDeliveryDate: '' });

  const [createForm, setCreateForm] = useState({
    classId: '', supplierId: '',
    items: [{ description: '', qty: 1, unit: 'ชิ้น', unitPrice: 0 }],
  });

  const fetchPOs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (classFilter) params.set('classId', classFilter);
      const res = await fetch(`/api/procurement/po?${params}`);
      const data = await res.json();
      setPOs(data.success ? data.data : []);
    } catch (err) {
      console.error('[ProcurementPanel] fetchPOs error', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, classFilter]);

  const fetchMeta = useCallback(async () => {
    try {
      const [supRes, schRes] = await Promise.all([
        fetch('/api/procurement/suppliers'),
        fetch('/api/schedules?classIds=true'),
      ]);
      const supData = await supRes.json();
      const schData = await schRes.json();
      setSuppliers(supData.success ? supData.data : []);
      setSchedules(schData.success ? schData.data : []);
    } catch (err) {
      console.error('[ProcurementPanel] fetchMeta error', err);
    }
  }, []);

  useEffect(() => { fetchPOs(); }, [fetchPOs]);
  useEffect(() => { fetchMeta(); }, [fetchMeta]);

  const handleAction = async (poId, action, body = {}) => {
    try {
      setActionLoading(`${poId}-${action}`);
      const res = await fetch(`/api/procurement/po/${poId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setReason('');
        setGrnItems({});
        setOrderDates({ orderDate: '', expectedDeliveryDate: '' });
        fetchPOs();
      } else {
        console.error('[ProcurementPanel] action failed', data.error);
      }
    } catch (err) {
      console.error('[ProcurementPanel] handleAction error', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreatePO = async (e) => {
    e.preventDefault();
    try {
      setActionLoading('create');
      const res = await fetch('/api/procurement/po', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        setCreateForm({ classId: '', supplierId: '', items: [{ description: '', qty: 1, unit: 'ชิ้น', unitPrice: 0 }] });
        fetchPOs();
      }
    } catch (err) {
      console.error('[ProcurementPanel] createPO error', err);
    } finally {
      setActionLoading(null);
    }
  };

  const addItem = () => {
    setCreateForm(f => ({ ...f, items: [...f.items, { description: '', qty: 1, unit: 'ชิ้น', unitPrice: 0 }] }));
  };

  const updateItem = (idx, field, val) => {
    setCreateForm(f => {
      const items = [...f.items];
      items[idx] = { ...items[idx], [field]: val };
      return { ...f, items };
    });
  };

  const removeItem = (idx) => {
    setCreateForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  };

  const filtered = pos.filter(po => {
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      if (!po.poId?.toLowerCase().includes(s) && !po.supplier?.name?.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="ค้นหา PO ID, ซัพพลายเออร์..."
            className="w-full bg-white/5 border border-white/10 text-white pl-9 pr-4 py-2.5 rounded-xl text-sm placeholder:text-white/20 focus:border-[#cc9d37]/50 focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="bg-white/5 border border-white/10 text-white px-4 py-2.5 rounded-xl text-sm appearance-none focus:border-[#cc9d37]/50 focus:outline-none"
        >
          {PO_STATUSES.map(s => (
            <option key={s} value={s} className="bg-[#0c1a2f]">{STATUS_LABELS[s] || s}</option>
          ))}
        </select>
        <input
          type="text"
          value={classFilter}
          onChange={e => setClassFilter(e.target.value)}
          placeholder="Class ID..."
          className="bg-white/5 border border-white/10 text-white px-4 py-2.5 rounded-xl text-sm w-40 placeholder:text-white/20 focus:border-[#cc9d37]/50 focus:outline-none"
        />
        <GoldButton onClick={() => setShowCreateModal(true)}>
          <span className="flex items-center gap-1.5"><Plus size={14} /> สร้าง PO</span>
        </GoldButton>
      </div>

      {/* PO Cards */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#cc9d37]" size={28} /></div>
      ) : filtered.length === 0 ? (
        <EmptyState text="ไม่พบรายการ PO" />
      ) : (
        <div className="space-y-3">
          {filtered.map(po => {
            const isExpanded = expandedId === po.id;
            const totalAmount = po.items?.reduce((sum, it) => sum + (it.qty * it.unitPrice), 0) || po.totalAmount || 0;
            return (
              <div key={po.id} className="bg-white/5 border border-white/8 rounded-2xl overflow-hidden">
                {/* Card header */}
                <div
                  className="flex items-center justify-between p-5 cursor-pointer hover:bg-white/[0.02] transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : po.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#cc9d37]/10 flex items-center justify-center">
                      <FileText size={18} className="text-[#cc9d37]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold text-sm">{po.poId || po.id?.slice(0, 8)}</span>
                        <StatusBadge status={po.status} />
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        {po.classId && <span className="text-[10px] text-white/40 font-mono">{po.classId}</span>}
                        {po.supplier?.name && <span className="text-[10px] text-white/40">{po.supplier.name}</span>}
                        <span className="text-[10px] text-white/30">{formatDate(po.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-white font-bold text-sm">฿{formatPrice(totalAmount)}</div>
                      <div className="text-[10px] text-white/30">{po.items?.length || 0} รายการ</div>
                    </div>
                    {isExpanded ? <ChevronUp size={16} className="text-white/30" /> : <ChevronDown size={16} className="text-white/30" />}
                  </div>
                </div>

                {/* Expanded detail */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 border-t border-white/5 pt-4 space-y-4">
                        {/* Items table */}
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-2">รายการสินค้า</p>
                          <div className="bg-white/[0.02] rounded-xl overflow-hidden">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-white/5">
                                  <th className="text-left px-3 py-2 text-white/30 font-medium">รายการ</th>
                                  <th className="text-right px-3 py-2 text-white/30 font-medium">จำนวน</th>
                                  <th className="text-center px-3 py-2 text-white/30 font-medium">หน่วย</th>
                                  <th className="text-right px-3 py-2 text-white/30 font-medium">ราคา/หน่วย</th>
                                  <th className="text-right px-3 py-2 text-white/30 font-medium">รวม</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(po.items || []).map((item, idx) => (
                                  <tr key={idx} className="border-b border-white/[0.03]">
                                    <td className="px-3 py-2 text-white/80">{item.description || item.name}</td>
                                    <td className="px-3 py-2 text-white/60 text-right">{item.qty}</td>
                                    <td className="px-3 py-2 text-white/40 text-center">{item.unit}</td>
                                    <td className="px-3 py-2 text-white/60 text-right">฿{formatPrice(item.unitPrice)}</td>
                                    <td className="px-3 py-2 text-white font-medium text-right">฿{formatPrice(item.qty * item.unitPrice)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Approval history */}
                        {po.approvalHistory?.length > 0 && (
                          <div>
                            <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-2">ประวัติการอนุมัติ</p>
                            <div className="space-y-2">
                              {po.approvalHistory.map((entry, idx) => (
                                <div key={idx} className="flex items-center gap-3 text-xs">
                                  <span className="text-white/30 w-28 shrink-0">{formatDateTime(entry.at)}</span>
                                  <span className="text-white/60">{entry.by}</span>
                                  <StatusBadge status={entry.action} />
                                  {entry.reason && <span className="text-white/40 italic">"{entry.reason}"</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex flex-wrap items-end gap-3 pt-2">
                          {po.status === 'DRAFT' && (
                            <GoldButton
                              small
                              onClick={() => handleAction(po.id, 'submit')}
                              disabled={actionLoading === `${po.id}-submit`}
                            >
                              {actionLoading === `${po.id}-submit` ? <Loader2 size={12} className="animate-spin" /> : <span className="flex items-center gap-1"><Send size={12} /> ส่งเชฟรีวิว</span>}
                            </GoldButton>
                          )}

                          {po.status === 'REQUEST_REVIEW' && (
                            <>
                              <div className="flex-1 min-w-[200px]">
                                <InputField
                                  label="เหตุผล"
                                  value={reason}
                                  onChange={e => setReason(e.target.value)}
                                  placeholder="เหตุผลการอนุมัติ/ตีกลับ..."
                                />
                              </div>
                              <GoldButton
                                small
                                onClick={() => handleAction(po.id, 'approve', { approved: true, reason })}
                                disabled={actionLoading === `${po.id}-approve`}
                              >
                                <span className="flex items-center gap-1"><Check size={12} /> อนุมัติ</span>
                              </GoldButton>
                              <DangerButton
                                small
                                onClick={() => handleAction(po.id, 'approve', { approved: false, reason })}
                                disabled={actionLoading === `${po.id}-approve`}
                              >
                                <span className="flex items-center gap-1"><X size={12} /> ตีกลับ</span>
                              </DangerButton>
                            </>
                          )}

                          {po.status === 'APPROVED' && (
                            <>
                              <InputField label="วันสั่งซื้อ" type="date" value={orderDates.orderDate} onChange={e => setOrderDates(d => ({ ...d, orderDate: e.target.value }))} />
                              <InputField label="วันรับของ (คาด)" type="date" value={orderDates.expectedDeliveryDate} onChange={e => setOrderDates(d => ({ ...d, expectedDeliveryDate: e.target.value }))} />
                              <GoldButton
                                small
                                onClick={() => handleAction(po.id, 'accept', orderDates)}
                                disabled={actionLoading === `${po.id}-accept`}
                              >
                                <span className="flex items-center gap-1"><Check size={12} /> รับ PO</span>
                              </GoldButton>
                            </>
                          )}

                          {po.status === 'ORDERING' && (
                            <GoldButton
                              small
                              onClick={() => handleAction(po.id, 'order')}
                              disabled={actionLoading === `${po.id}-order`}
                            >
                              <span className="flex items-center gap-1"><Package size={12} /> สั่งซื้อแล้ว</span>
                            </GoldButton>
                          )}

                          {po.status === 'ORDERED' && (
                            <div className="w-full space-y-3">
                              <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">รับของ (GRN)</p>
                              {(po.items || []).map((item, idx) => (
                                <div key={idx} className="flex items-center gap-3 text-xs">
                                  <span className="text-white/60 flex-1">{item.description || item.name}</span>
                                  <span className="text-white/30">สั่ง: {item.qty}</span>
                                  <input
                                    type="number"
                                    min="0"
                                    max={item.qty}
                                    value={grnItems[idx] ?? ''}
                                    onChange={e => setGrnItems(g => ({ ...g, [idx]: e.target.value }))}
                                    placeholder="รับจริง"
                                    className="w-24 bg-white/5 border border-white/10 text-white px-3 py-1.5 rounded-lg text-xs focus:border-[#cc9d37]/50 focus:outline-none"
                                  />
                                </div>
                              ))}
                              <GoldButton
                                small
                                onClick={() => {
                                  const items = (po.items || []).map((item, idx) => ({
                                    itemId: item.id,
                                    receivedQty: Number(grnItems[idx] || 0),
                                  }));
                                  handleAction(po.id, 'grn', { items });
                                }}
                                disabled={actionLoading === `${po.id}-grn`}
                              >
                                <span className="flex items-center gap-1"><Check size={12} /> ยืนยันรับของ</span>
                              </GoldButton>
                            </div>
                          )}

                          {/* Report issue — available for all statuses */}
                          <DangerButton
                            small
                            onClick={() => {
                              const issue = prompt('รายงานปัญหา:');
                              if (issue) handleAction(po.id, 'issue', { description: issue });
                            }}
                          >
                            <span className="flex items-center gap-1"><AlertTriangle size={12} /> รายงานปัญหา</span>
                          </DangerButton>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      {/* Create PO Modal */}
      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="สร้าง PO ใหม่" wide>
        <form onSubmit={handleCreatePO} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <SelectField
              label="Class ID"
              value={createForm.classId}
              onChange={e => setCreateForm(f => ({ ...f, classId: e.target.value }))}
              options={schedules.map(s => ({ value: s.classId || s.id, label: s.classId || s.id }))}
              placeholder="เลือก class..."
            />
            <SelectField
              label="ซัพพลายเออร์"
              value={createForm.supplierId}
              onChange={e => setCreateForm(f => ({ ...f, supplierId: e.target.value }))}
              options={suppliers.map(s => ({ value: s.id, label: s.name }))}
              placeholder="เลือกซัพพลายเออร์..."
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">รายการสินค้า</p>
              <button type="button" onClick={addItem} className="text-[#cc9d37] hover:text-amber-400 text-xs flex items-center gap-1">
                <Plus size={12} /> เพิ่มรายการ
              </button>
            </div>
            <div className="space-y-2">
              {createForm.items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={item.description}
                    onChange={e => updateItem(idx, 'description', e.target.value)}
                    placeholder="รายละเอียด"
                    required
                    className="flex-1 bg-white/5 border border-white/10 text-white px-3 py-2 rounded-xl text-sm placeholder:text-white/20 focus:border-[#cc9d37]/50 focus:outline-none"
                  />
                  <input
                    type="number"
                    min="1"
                    value={item.qty}
                    onChange={e => updateItem(idx, 'qty', Number(e.target.value))}
                    className="w-20 bg-white/5 border border-white/10 text-white px-3 py-2 rounded-xl text-sm focus:border-[#cc9d37]/50 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={item.unit}
                    onChange={e => updateItem(idx, 'unit', e.target.value)}
                    className="w-20 bg-white/5 border border-white/10 text-white px-3 py-2 rounded-xl text-sm focus:border-[#cc9d37]/50 focus:outline-none"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={e => updateItem(idx, 'unitPrice', Number(e.target.value))}
                    placeholder="ราคา"
                    className="w-28 bg-white/5 border border-white/10 text-white px-3 py-2 rounded-xl text-sm placeholder:text-white/20 focus:border-[#cc9d37]/50 focus:outline-none"
                  />
                  {createForm.items.length > 1 && (
                    <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-300">
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/5">
            <span className="text-white/40 text-xs">
              รวม: ฿{formatPrice(createForm.items.reduce((sum, it) => sum + (it.qty * it.unitPrice), 0))}
            </span>
            <GoldButton disabled={actionLoading === 'create'}>
              {actionLoading === 'create' ? <Loader2 size={14} className="animate-spin" /> : 'สร้าง PO'}
            </GoldButton>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 2: BOM CALCULATOR
// ═══════════════════════════════════════════════════════════════
function BOMTab() {
  const [schedules, setSchedules] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [bomData, setBomData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [schedulesLoading, setSchedulesLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/schedules?classIds=true');
        const data = await res.json();
        setSchedules(data.success ? data.data : []);
      } catch (err) {
        console.error('[ProcurementPanel] fetchSchedules error', err);
      } finally {
        setSchedulesLoading(false);
      }
    })();
  }, []);

  const calculateBOM = async () => {
    if (!selectedClassId) return;
    try {
      setLoading(true);
      setBomData(null);
      const res = await fetch(`/api/procurement/bom/${selectedClassId}`);
      const data = await res.json();
      if (data.success) setBomData(data.data);
    } catch (err) {
      console.error('[ProcurementPanel] calculateBOM error', err);
    } finally {
      setLoading(false);
    }
  };

  const createPOFromBOM = async () => {
    if (!selectedClassId) return;
    try {
      setCreating(true);
      const res = await fetch(`/api/procurement/bom/${selectedClassId}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setBomData(null);
        setSelectedClassId('');
      }
    } catch (err) {
      console.error('[ProcurementPanel] createPOFromBOM error', err);
    } finally {
      setCreating(false);
    }
  };

  const hasShortfall = bomData?.some(b => b.shortfall > 0);

  return (
    <div className="space-y-5">
      {/* Class selector */}
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <SelectField
            label="เลือก Class"
            value={selectedClassId}
            onChange={e => setSelectedClassId(e.target.value)}
            options={schedules.map(s => ({ value: s.classId || s.id, label: `${s.classId || s.id}${s.courseName ? ' — ' + s.courseName : ''}` }))}
            placeholder={schedulesLoading ? 'กำลังโหลด...' : 'เลือก class...'}
          />
        </div>
        <GoldButton onClick={calculateBOM} disabled={!selectedClassId || loading}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <span className="flex items-center gap-1.5"><Calculator size={14} /> คำนวณ BOM</span>}
        </GoldButton>
      </div>

      {/* BOM Results */}
      {loading && (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#cc9d37]" size={28} /></div>
      )}

      {bomData && !loading && (
        <div className="space-y-4">
          <div className="bg-white/[0.02] rounded-2xl border border-white/8 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8">
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-white/40 font-bold">วัตถุดิบ</th>
                  <th className="text-right px-4 py-3 text-[10px] uppercase tracking-widest text-white/40 font-bold">ต้องใช้ทั้งหมด</th>
                  <th className="text-right px-4 py-3 text-[10px] uppercase tracking-widest text-white/40 font-bold">มีในสต็อก</th>
                  <th className="text-right px-4 py-3 text-[10px] uppercase tracking-widest text-white/40 font-bold">ต้องซื้อเพิ่ม</th>
                </tr>
              </thead>
              <tbody>
                {bomData.map((row, idx) => (
                  <tr key={idx} className="border-b border-white/[0.03]">
                    <td className="px-4 py-3 text-white/80">{row.ingredientName}</td>
                    <td className={`px-4 py-3 text-right ${row.totalNeeded > 0 ? 'text-amber-300 font-medium' : 'text-white/40'}`}>
                      {row.totalNeeded} {row.unit}
                    </td>
                    <td className={`px-4 py-3 text-right ${row.currentStock >= row.totalNeeded ? 'text-emerald-400' : 'text-red-400'}`}>
                      {row.currentStock} {row.unit}
                    </td>
                    <td className={`px-4 py-3 text-right font-bold ${row.shortfall > 0 ? 'text-red-400' : 'text-white/30'}`}>
                      {row.shortfall > 0 ? row.shortfall : '—'} {row.shortfall > 0 ? row.unit : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {hasShortfall && (
            <div className="flex justify-end">
              <GoldButton onClick={createPOFromBOM} disabled={creating}>
                {creating ? <Loader2 size={14} className="animate-spin" /> : <span className="flex items-center gap-1.5"><Plus size={14} /> สร้าง PO จาก BOM</span>}
              </GoldButton>
            </div>
          )}

          {!hasShortfall && bomData.length > 0 && (
            <div className="flex items-center gap-2 justify-center py-3 text-emerald-400 text-xs">
              <CheckCircle2 size={16} />
              <span>สต็อกเพียงพอทุกรายการ ไม่ต้องสั่งซื้อเพิ่ม</span>
            </div>
          )}
        </div>
      )}

      {!bomData && !loading && (
        <EmptyState text="เลือก Class แล้วกด 'คำนวณ BOM' เพื่อดูรายการวัตถุดิบที่ต้องใช้" />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 3: SUPPLIERS
// ═══════════════════════════════════════════════════════════════
function SuppliersTab() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', contactName: '', phone: '', email: '',
    address: '', taxId: '', bankAccount: '', notes: '',
  });

  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/procurement/suppliers');
      const data = await res.json();
      setSuppliers(data.success ? data.data : []);
    } catch (err) {
      console.error('[ProcurementPanel] fetchSuppliers error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  const openEdit = (supplier) => {
    setEditingSupplier(supplier);
    setForm({
      name: supplier.name || '',
      contactName: supplier.contactName || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      taxId: supplier.taxId || '',
      bankAccount: supplier.bankAccount || '',
      notes: supplier.notes || '',
    });
    setShowModal(true);
  };

  const openCreate = () => {
    setEditingSupplier(null);
    setForm({ name: '', contactName: '', phone: '', email: '', address: '', taxId: '', bankAccount: '', notes: '' });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const url = editingSupplier ? `/api/procurement/suppliers/${editingSupplier.id}` : '/api/procurement/suppliers';
      const method = editingSupplier ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        fetchSuppliers();
      }
    } catch (err) {
      console.error('[ProcurementPanel] saveSupplier error', err);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (supplier) => {
    try {
      await fetch(`/api/procurement/suppliers/${supplier.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !supplier.isActive }),
      });
      fetchSuppliers();
    } catch (err) {
      console.error('[ProcurementPanel] toggleActive error', err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <GoldButton onClick={openCreate}>
          <span className="flex items-center gap-1.5"><Plus size={14} /> เพิ่มซัพพลายเออร์</span>
        </GoldButton>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#cc9d37]" size={28} /></div>
      ) : suppliers.length === 0 ? (
        <EmptyState text="ยังไม่มีซัพพลายเออร์" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {suppliers.map(sup => (
            <div
              key={sup.id}
              className="bg-white/5 border border-white/8 rounded-2xl p-5 hover:border-[#cc9d37]/20 transition-colors cursor-pointer group"
              onClick={() => openEdit(sup)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#cc9d37]/10 flex items-center justify-center">
                    <Building2 size={18} className="text-[#cc9d37]" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-sm">{sup.name}</h4>
                    {sup.contactName && <p className="text-white/40 text-xs">{sup.contactName}</p>}
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleActive(sup); }}
                  className={`w-10 h-5 rounded-full transition-colors relative ${sup.isActive !== false ? 'bg-emerald-500' : 'bg-white/10'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${sup.isActive !== false ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>
              <div className="space-y-1.5">
                {sup.phone && (
                  <div className="flex items-center gap-2 text-xs text-white/40">
                    <Phone size={11} /> {sup.phone}
                  </div>
                )}
                {sup.email && (
                  <div className="flex items-center gap-2 text-xs text-white/40">
                    <Mail size={11} /> {sup.email}
                  </div>
                )}
                {sup.address && (
                  <div className="flex items-center gap-2 text-xs text-white/40">
                    <MapPin size={11} /> <span className="line-clamp-1">{sup.address}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Supplier Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editingSupplier ? 'แก้ไขซัพพลายเออร์' : 'เพิ่มซัพพลายเออร์'}>
        <form onSubmit={handleSave} className="space-y-4">
          <InputField label="ชื่อบริษัท *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          <div className="grid grid-cols-2 gap-4">
            <InputField label="ผู้ติดต่อ" value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))} />
            <InputField label="โทรศัพท์" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
          <InputField label="อีเมล" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          <InputField label="ที่อยู่" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <InputField label="เลขประจำตัวผู้เสียภาษี" value={form.taxId} onChange={e => setForm(f => ({ ...f, taxId: e.target.value }))} />
            <InputField label="บัญชีธนาคาร" value={form.bankAccount} onChange={e => setForm(f => ({ ...f, bankAccount: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">หมายเหตุ</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={3}
              className="w-full bg-white/5 border border-white/10 text-white px-4 py-2.5 rounded-xl text-sm focus:border-[#cc9d37]/50 focus:outline-none resize-none placeholder:text-white/20"
            />
          </div>
          <div className="flex justify-end pt-2">
            <GoldButton disabled={saving || !form.name}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : (editingSupplier ? 'บันทึก' : 'เพิ่ม')}
            </GoldButton>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 4: ADVANCES
// ═══════════════════════════════════════════════════════════════
function AdvancesTab() {
  const [advances, setAdvances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [form, setForm] = useState({
    poId: '', amount: '', description: '', receiptUrl: '',
  });

  const fetchAdvances = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/procurement/advances');
      const data = await res.json();
      setAdvances(data.success ? data.data : []);
    } catch (err) {
      console.error('[ProcurementPanel] fetchAdvances error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAdvances(); }, [fetchAdvances]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch('/api/procurement/advances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amount: Number(form.amount) }),
      });
      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        setForm({ poId: '', amount: '', description: '', receiptUrl: '' });
        fetchAdvances();
      }
    } catch (err) {
      console.error('[ProcurementPanel] createAdvance error', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAction = async (id, action) => {
    try {
      setActionLoading(`${id}-${action}`);
      const res = await fetch(`/api/procurement/advances/${id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) fetchAdvances();
    } catch (err) {
      console.error('[ProcurementPanel] advanceAction error', err);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <GoldButton onClick={() => setShowModal(true)}>
          <span className="flex items-center gap-1.5"><Plus size={14} /> เพิ่มเงินทดรอง</span>
        </GoldButton>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#cc9d37]" size={28} /></div>
      ) : advances.length === 0 ? (
        <EmptyState text="ไม่มีรายการเงินทดรอง" />
      ) : (
        <div className="space-y-3">
          {advances.map(adv => (
            <div key={adv.id} className="bg-white/5 border border-white/8 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <Banknote size={18} className="text-amber-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold text-sm">{adv.advanceId || adv.id?.slice(0, 8)}</span>
                      <StatusBadge status={adv.status} colorMap={ADVANCE_STATUS_COLORS} labelMap={{ PENDING: 'รออนุมัติ', APPROVED: 'อนุมัติแล้ว', REIMBURSED: 'เบิกคืนแล้ว', REJECTED: 'ไม่อนุมัติ' }} />
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {adv.poId && <span className="text-[10px] text-[#cc9d37]/60 font-mono">{adv.poId}</span>}
                      {adv.paidBy && <span className="text-[10px] text-white/40">{adv.paidBy}</span>}
                      <span className="text-[10px] text-white/30">{formatDate(adv.createdAt)}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white font-bold text-lg">฿{formatPrice(adv.amount)}</div>
                </div>
              </div>

              {adv.description && (
                <p className="text-white/50 text-xs mb-3 pl-[52px]">{adv.description}</p>
              )}

              {adv.receiptUrl && (
                <div className="pl-[52px] mb-3">
                  <a href={adv.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-[#cc9d37] text-xs flex items-center gap-1 hover:text-amber-400">
                    <ExternalLink size={12} /> ดูใบเสร็จ
                  </a>
                </div>
              )}

              <div className="flex gap-2 pl-[52px]">
                {adv.status === 'PENDING' && (
                  <>
                    <GoldButton small onClick={() => handleAction(adv.id, 'approve')} disabled={actionLoading === `${adv.id}-approve`}>
                      {actionLoading === `${adv.id}-approve` ? <Loader2 size={12} className="animate-spin" /> : <span className="flex items-center gap-1"><Check size={12} /> อนุมัติ</span>}
                    </GoldButton>
                    <DangerButton small onClick={() => handleAction(adv.id, 'reject')} disabled={actionLoading === `${adv.id}-reject`}>
                      <span className="flex items-center gap-1"><X size={12} /> ไม่อนุมัติ</span>
                    </DangerButton>
                  </>
                )}
                {adv.status === 'APPROVED' && (
                  <GoldButton small onClick={() => handleAction(adv.id, 'reimburse')} disabled={actionLoading === `${adv.id}-reimburse`}>
                    {actionLoading === `${adv.id}-reimburse` ? <Loader2 size={12} className="animate-spin" /> : <span className="flex items-center gap-1"><Check size={12} /> เบิกคืนแล้ว</span>}
                  </GoldButton>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Advance Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="เพิ่มเงินทดรอง">
        <form onSubmit={handleCreate} className="space-y-4">
          <InputField label="PO ID (ถ้ามี)" value={form.poId} onChange={e => setForm(f => ({ ...f, poId: e.target.value }))} placeholder="PO-XXXXXXXX-XXX" />
          <InputField label="จำนวนเงิน *" type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required placeholder="0.00" />
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold">รายละเอียด</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
              placeholder="รายละเอียดการเบิก..."
              className="w-full bg-white/5 border border-white/10 text-white px-4 py-2.5 rounded-xl text-sm focus:border-[#cc9d37]/50 focus:outline-none resize-none placeholder:text-white/20"
            />
          </div>
          <InputField label="ลิงก์ใบเสร็จ" value={form.receiptUrl} onChange={e => setForm(f => ({ ...f, receiptUrl: e.target.value }))} placeholder="https://..." />
          <div className="flex justify-end pt-2">
            <GoldButton disabled={saving || !form.amount}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : 'บันทึก'}
            </GoldButton>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 5: TRACKING
// ═══════════════════════════════════════════════════════════════
function TrackingTab() {
  const [trackingPOs, setTrackingPOs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [addingTracking, setAddingTracking] = useState(null);
  const [trackForm, setTrackForm] = useState({ carrier: '', trackingNumber: '', estimatedDate: '' });
  const [saving, setSaving] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(null);

  const fetchTracking = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/procurement/po?status=ORDERED,RECEIVING');
      const data = await res.json();
      setTrackingPOs(data.success ? data.data : []);
    } catch (err) {
      console.error('[ProcurementPanel] fetchTracking error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTracking(); }, [fetchTracking]);

  const addTracking = async (poId) => {
    try {
      setSaving(true);
      const res = await fetch(`/api/procurement/po/${poId}/tracking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trackForm),
      });
      const data = await res.json();
      if (data.success) {
        setAddingTracking(null);
        setTrackForm({ carrier: '', trackingNumber: '', estimatedDate: '' });
        fetchTracking();
      }
    } catch (err) {
      console.error('[ProcurementPanel] addTracking error', err);
    } finally {
      setSaving(false);
    }
  };

  const updateTrackingStatus = async (poId, trackingId, newStatus) => {
    try {
      setUpdatingStatus(`${trackingId}-${newStatus}`);
      const res = await fetch(`/api/procurement/po/${poId}/tracking/${trackingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) fetchTracking();
    } catch (err) {
      console.error('[ProcurementPanel] updateTrackingStatus error', err);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const getStepIndex = (status) => TRACKING_STEPS.indexOf(status);

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#cc9d37]" size={28} /></div>
      ) : trackingPOs.length === 0 ? (
        <EmptyState text="ไม่มี PO ที่ต้องติดตาม" />
      ) : (
        <div className="space-y-3">
          {trackingPOs.map(po => {
            const isExpanded = expandedId === po.id;
            return (
              <div key={po.id} className="bg-white/5 border border-white/8 rounded-2xl overflow-hidden">
                <div
                  className="flex items-center justify-between p-5 cursor-pointer hover:bg-white/[0.02] transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : po.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                      <Truck size={18} className="text-indigo-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold text-sm">{po.poId || po.id?.slice(0, 8)}</span>
                        <StatusBadge status={po.status} />
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {po.supplier?.name && <span className="text-[10px] text-white/40">{po.supplier.name}</span>}
                        <span className="text-[10px] text-white/30">{po.trackings?.length || 0} tracking(s)</span>
                      </div>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp size={16} className="text-white/30" /> : <ChevronDown size={16} className="text-white/30" />}
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 border-t border-white/5 pt-4 space-y-4">
                        {/* Existing trackings */}
                        {(po.trackings || []).map(track => {
                          const currentStep = getStepIndex(track.status);
                          return (
                            <div key={track.id} className="bg-white/[0.03] rounded-xl p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="text-xs text-white/60">
                                  <span className="font-medium text-white">{track.carrier}</span>
                                  <span className="text-white/30 mx-2">|</span>
                                  <span className="font-mono">{track.trackingNumber}</span>
                                </div>
                                {track.estimatedDate && (
                                  <span className="text-[10px] text-white/30 flex items-center gap-1">
                                    <Calendar size={10} /> คาด {formatDate(track.estimatedDate)}
                                  </span>
                                )}
                              </div>

                              {/* Step indicator */}
                              <div className="flex items-center gap-1">
                                {TRACKING_STEPS.map((step, idx) => {
                                  const isCompleted = idx <= currentStep;
                                  const isCurrent = idx === currentStep;
                                  return (
                                    <React.Fragment key={step}>
                                      <button
                                        onClick={() => {
                                          if (idx > currentStep) {
                                            updateTrackingStatus(po.id, track.id, step);
                                          }
                                        }}
                                        disabled={idx <= currentStep || updatingStatus === `${track.id}-${step}`}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                                          isCurrent
                                            ? 'bg-[#cc9d37]/20 text-[#cc9d37] border border-[#cc9d37]/30'
                                            : isCompleted
                                              ? 'bg-emerald-500/10 text-emerald-400'
                                              : 'bg-white/5 text-white/20 hover:bg-white/10 hover:text-white/40'
                                        } disabled:cursor-default`}
                                      >
                                        {updatingStatus === `${track.id}-${step}` ? (
                                          <Loader2 size={10} className="animate-spin" />
                                        ) : isCompleted ? (
                                          <CheckCircle2 size={10} />
                                        ) : (
                                          <CircleDot size={10} />
                                        )}
                                        {TRACKING_LABELS[step]}
                                      </button>
                                      {idx < TRACKING_STEPS.length - 1 && (
                                        <ArrowRight size={12} className={isCompleted && idx < currentStep ? 'text-emerald-400/40' : 'text-white/10'} />
                                      )}
                                    </React.Fragment>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}

                        {/* Add tracking form */}
                        {addingTracking === po.id ? (
                          <div className="bg-white/[0.03] rounded-xl p-4 space-y-3">
                            <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">เพิ่ม Tracking</p>
                            <div className="grid grid-cols-3 gap-3">
                              <InputField
                                label="ขนส่ง"
                                value={trackForm.carrier}
                                onChange={e => setTrackForm(f => ({ ...f, carrier: e.target.value }))}
                                placeholder="Kerry, Flash..."
                              />
                              <InputField
                                label="เลข Tracking"
                                value={trackForm.trackingNumber}
                                onChange={e => setTrackForm(f => ({ ...f, trackingNumber: e.target.value }))}
                                placeholder="TH123456789"
                              />
                              <InputField
                                label="วันที่คาดว่าจะถึง"
                                type="date"
                                value={trackForm.estimatedDate}
                                onChange={e => setTrackForm(f => ({ ...f, estimatedDate: e.target.value }))}
                              />
                            </div>
                            <div className="flex gap-2">
                              <GoldButton small onClick={() => addTracking(po.id)} disabled={saving || !trackForm.carrier || !trackForm.trackingNumber}>
                                {saving ? <Loader2 size={12} className="animate-spin" /> : <span className="flex items-center gap-1"><Check size={12} /> บันทึก</span>}
                              </GoldButton>
                              <button onClick={() => setAddingTracking(null)} className="text-white/30 hover:text-white/50 text-xs px-3">
                                ยกเลิก
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setAddingTracking(po.id)}
                            className="w-full border border-dashed border-white/10 rounded-xl py-3 text-white/30 hover:text-white/50 hover:border-white/20 text-xs flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <Plus size={14} /> เพิ่ม Tracking
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function ProcurementPanel() {
  const [activeTab, setActiveTab] = useState('po-list');

  return (
    <div className="min-h-screen bg-[#0c1a2f] text-white">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <h1 className="text-xl font-black tracking-tight">จัดซื้อ — Procurement</h1>
        <p className="text-white/30 text-xs mt-1">Purchase Order Lifecycle Management</p>
      </div>

      {/* Tab bar */}
      <div className="px-6 mb-6">
        <div className="flex gap-1 bg-white/[0.03] rounded-2xl p-1 border border-white/5">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                  isActive
                    ? 'bg-[#cc9d37] text-[#0c1a2f]'
                    : 'text-white/30 hover:text-white/50 hover:bg-white/5'
                }`}
              >
                <Icon size={14} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="px-6 pb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === 'po-list' && <POListTab />}
            {activeTab === 'bom' && <BOMTab />}
            {activeTab === 'suppliers' && <SuppliersTab />}
            {activeTab === 'advances' && <AdvancesTab />}
            {activeTab === 'tracking' && <TrackingTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
