'use client';

import React, { useState } from 'react';
import { X, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

export default function AdsOptimizeRequestModal({ campaign, onClose, onSubmitted }) {
  if (!campaign) return null;

  const [requestType, setRequestType] = useState('lifetime_budget');
  const [proposedBudget, setProposedBudget] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const showMsg = (text, type = 'success') => {
    setMessage(text);
    setMessageType(type);
    if (type !== 'error') {
      setTimeout(() => {
        setMessage(null);
      }, 2000);
    }
  };

  const handleSubmit = async () => {
    if (!proposedBudget || !reason) {
      showMsg('Please fill in all fields', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/ads/optimize/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: campaign.id,
          campaignName: campaign.name,
          requestType,
          proposedBudget: parseFloat(proposedBudget),
          currentBudget: campaign.lifetimeBudget,
          reason,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSubmitted(true);
        showMsg('Request submitted successfully');
        setTimeout(() => {
          onSubmitted?.();
          onClose();
        }, 2000);
      } else {
        const err = await res.json();
        showMsg(err.error || 'Failed to submit request', 'error');
      }
    } catch (e) {
      console.error('[AdsOptimizeRequestModal] Submit failed:', e);
      showMsg('Error submitting request', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#0c1a2f] border border-white/10 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-start justify-between">
          <div>
            <h2 className="text-sm font-black text-white uppercase tracking-widest">Request Budget Change</h2>
            <p className="text-xs text-white/40 font-bold mt-2">{campaign.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-all">
            <X size={16} className="text-white/40" />
          </button>
        </div>

        {/* Success State */}
        {submitted ? (
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center">
              <CheckCircle size={24} className="text-emerald-500" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-widest mb-1">Request Submitted</h3>
              <p className="text-[10px] text-white/40 font-bold">Your request has been sent to managers for approval.</p>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-5">
            {/* Type Selection */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em]">Request Type</label>
              <select
                value={requestType}
                onChange={(e) => setRequestType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#cc9d37]/50"
              >
                <option value="lifetime_budget">Lifetime Budget</option>
                <option value="daily_budget">Daily Budget</option>
                <option value="bid_adjustment">Bid Adjustment</option>
              </select>
            </div>

            {/* Current Budget Display */}
            <div className="bg-white/5 p-4 rounded-xl border border-white/10">
              <p className="text-[10px] text-white/40 font-bold mb-1">Current lifetime budget:</p>
              <p className="text-lg font-black text-[#cc9d37]">฿{campaign.lifetimeBudget?.toLocaleString() || 'N/A'}</p>
            </div>

            {/* Proposed Budget */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em]">Proposed budget</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={proposedBudget}
                  onChange={(e) => setProposedBudget(e.target.value)}
                  placeholder="Enter new budget amount"
                  className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#cc9d37]/50"
                />
                <span className="flex items-center text-white/40 font-bold">฿</span>
              </div>
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em]">Reason for change</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why this change is needed..."
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#cc9d37]/50 resize-none h-24"
              />
            </div>

            {/* Warning */}
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex gap-2">
              <AlertCircle size={14} className="text-yellow-500 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-yellow-500 font-bold">This requires Manager approval before implementation.</p>
            </div>

            {/* Message Toast */}
            {message && (
              <div className={`p-3 rounded-lg flex items-center gap-2 ${messageType === 'error' ? 'bg-red-500/10 border border-red-500/30' : 'bg-emerald-500/10 border border-emerald-500/30'}`}>
                {messageType === 'error' ? (
                  <AlertCircle size={12} className="text-red-500 flex-shrink-0" />
                ) : (
                  <CheckCircle size={12} className="text-emerald-500 flex-shrink-0" />
                )}
                <p className={`text-[10px] font-bold ${messageType === 'error' ? 'text-red-500' : 'text-emerald-500'}`}>{message}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !proposedBudget || !reason}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-[#cc9d37]/10 border border-[#cc9d37]/30 text-[#cc9d37] text-[10px] font-black uppercase tracking-widest hover:bg-[#cc9d37]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 size={12} className="animate-spin" /> : 'Submit Request'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
