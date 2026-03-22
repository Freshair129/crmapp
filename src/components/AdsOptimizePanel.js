'use client';

import React, { useState } from 'react';
import { X, Pause, Play, Copy, Loader2, AlertCircle, CheckCircle, Zap } from 'lucide-react';
import { can } from '@/lib/permissionMatrix';

export default function AdsOptimizePanel({ campaign, onClose, onSuccess, currentUserRole }) {
  if (!campaign) return null;

  const [newDailyBudget, setNewDailyBudget] = useState(campaign.dailyBudget?.toString() || '');
  const [newBidAmount, setNewBidAmount] = useState(campaign.bidAmount?.toString() || '');
  const [newDupeName, setNewDupeName] = useState(campaign.name + ' (Copy)');

  const [loadingAction, setLoadingAction] = useState(null);
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState(null);

  const canEdit = can(currentUserRole, 'marketing', 'edit');

  const showMsg = (text, type = 'success') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleStatusChange = async (newStatus) => {
    setLoadingAction('status');
    try {
      const res = await fetch(`/api/ads/campaigns/${campaign.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        showMsg(`Campaign ${newStatus === 'PAUSED' ? 'paused' : 'resumed'} successfully`);
        onSuccess?.();
      } else {
        const err = await res.json();
        showMsg(err.error || 'Failed to update status', 'error');
      }
    } catch (e) {
      console.error('[AdsOptimizePanel] Status change failed:', e);
      showMsg('Error updating status', 'error');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleUpdateBudget = async () => {
    setLoadingAction('budget');
    try {
      const res = await fetch(`/api/ads/campaigns/${campaign.id}/budget`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dailyBudget: parseFloat(newDailyBudget) }),
      });

      if (res.ok) {
        showMsg('Budget updated successfully');
        setNewDailyBudget('');
        onSuccess?.();
      } else {
        const err = await res.json();
        showMsg(err.error || 'Failed to update budget', 'error');
      }
    } catch (e) {
      console.error('[AdsOptimizePanel] Budget update failed:', e);
      showMsg('Error updating budget', 'error');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleUpdateBid = async () => {
    setLoadingAction('bid');
    try {
      const res = await fetch(`/api/ads/campaigns/${campaign.id}/bid`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bidAmount: parseFloat(newBidAmount) }),
      });

      if (res.ok) {
        showMsg('Bid amount updated successfully');
        setNewBidAmount('');
        onSuccess?.();
      } else {
        const err = await res.json();
        showMsg(err.error || 'Failed to update bid', 'error');
      }
    } catch (e) {
      console.error('[AdsOptimizePanel] Bid update failed:', e);
      showMsg('Error updating bid', 'error');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDuplicate = async () => {
    setLoadingAction('duplicate');
    try {
      const res = await fetch(`/api/ads/campaigns/${campaign.id}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newName: newDupeName }),
      });

      if (res.ok) {
        showMsg('Campaign duplicated successfully');
        setNewDupeName('');
        onSuccess?.();
      } else {
        const err = await res.json();
        showMsg(err.error || 'Failed to duplicate campaign', 'error');
      }
    } catch (e) {
      console.error('[AdsOptimizePanel] Duplicate failed:', e);
      showMsg('Error duplicating campaign', 'error');
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-[#0c1a2f] border-l border-white/10 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Zap size={14} className="text-[#cc9d37]" />
              <h2 className="text-sm font-black text-white uppercase tracking-widest">Optimize Campaign</h2>
            </div>
            <p className="text-xs text-white/40 font-bold">{campaign.name}</p>
            <div className="mt-2 flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${campaign.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-yellow-500'}`}></div>
              <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">
                {campaign.status === 'ACTIVE' ? '● ACTIVE' : '○ PAUSED'}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-all">
            <X size={16} className="text-white/40" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status Actions */}
          {canEdit && (
            <div className="space-y-3">
              <h3 className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em]">Actions</h3>
              <div className="flex gap-3">
                {campaign.status === 'ACTIVE' ? (
                  <button
                    onClick={() => handleStatusChange('PAUSED')}
                    disabled={loadingAction === 'status'}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 text-[10px] font-black uppercase tracking-widest hover:bg-yellow-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingAction === 'status' ? <Loader2 size={12} className="animate-spin" /> : <Pause size={12} />}
                    Pause Campaign
                  </button>
                ) : (
                  <button
                    onClick={() => handleStatusChange('ACTIVE')}
                    disabled={loadingAction === 'status'}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingAction === 'status' ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                    Resume Campaign
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Daily Budget */}
          {canEdit && (
            <div className="space-y-3">
              <h3 className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em]">Daily Budget</h3>
              <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-2">
                <p className="text-[10px] text-white/40 font-bold">Current: <span className="text-[#cc9d37]">฿{campaign.dailyBudget?.toLocaleString() || 'N/A'}/day</span></p>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    value={newDailyBudget}
                    onChange={(e) => setNewDailyBudget(e.target.value)}
                    placeholder="New amount"
                    className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#cc9d37]/50"
                  />
                  <span className="flex items-center text-white/40 font-bold">฿</span>
                </div>
                <button
                  onClick={handleUpdateBudget}
                  disabled={!newDailyBudget || loadingAction === 'budget'}
                  className="w-full px-3 py-2 rounded-lg bg-[#cc9d37]/10 border border-[#cc9d37]/30 text-[#cc9d37] text-[10px] font-black uppercase tracking-widest hover:bg-[#cc9d37]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loadingAction === 'budget' ? <Loader2 size={12} className="animate-spin" /> : 'Update Budget'}
                </button>
              </div>
            </div>
          )}

          {/* Bid Amount */}
          {canEdit && (
            <div className="space-y-3">
              <h3 className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em]">Bid Amount</h3>
              <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-2">
                <p className="text-[10px] text-white/40 font-bold">Current: <span className="text-[#cc9d37]">฿{campaign.bidAmount?.toLocaleString() || 'N/A'} per click</span></p>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    value={newBidAmount}
                    onChange={(e) => setNewBidAmount(e.target.value)}
                    placeholder="New bid"
                    className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#cc9d37]/50"
                  />
                  <span className="flex items-center text-white/40 font-bold">฿</span>
                </div>
                <button
                  onClick={handleUpdateBid}
                  disabled={!newBidAmount || loadingAction === 'bid'}
                  className="w-full px-3 py-2 rounded-lg bg-[#cc9d37]/10 border border-[#cc9d37]/30 text-[#cc9d37] text-[10px] font-black uppercase tracking-widest hover:bg-[#cc9d37]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loadingAction === 'bid' ? <Loader2 size={12} className="animate-spin" /> : 'Update Bid'}
                </button>
              </div>
            </div>
          )}

          {/* Duplicate */}
          {canEdit && (
            <div className="space-y-3">
              <h3 className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em]">Duplicate</h3>
              <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-2">
                <input
                  type="text"
                  value={newDupeName}
                  onChange={(e) => setNewDupeName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#cc9d37]/50"
                />
                <button
                  onClick={handleDuplicate}
                  disabled={!newDupeName || loadingAction === 'duplicate'}
                  className="w-full px-3 py-2 rounded-lg bg-[#cc9d37]/10 border border-[#cc9d37]/30 text-[#cc9d37] text-[10px] font-black uppercase tracking-widest hover:bg-[#cc9d37]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loadingAction === 'duplicate' ? <Loader2 size={12} className="animate-spin" /> : <Copy size={12} />}
                  Duplicate Campaign
                </button>
              </div>
            </div>
          )}

          {!canEdit && (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex gap-2">
              <AlertCircle size={14} className="text-yellow-500 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-yellow-500 font-bold">You do not have permission to edit campaigns.</p>
            </div>
          )}
        </div>

        {/* Message Toast */}
        {message && (
          <div className={`p-4 border-t ${messageType === 'error' ? 'bg-red-500/10 border-red-500/30' : 'bg-emerald-500/10 border-emerald-500/30'} flex items-center gap-2`}>
            {messageType === 'error' ? (
              <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
            ) : (
              <CheckCircle size={14} className="text-emerald-500 flex-shrink-0" />
            )}
            <p className={`text-[10px] font-bold ${messageType === 'error' ? 'text-red-500' : 'text-emerald-500'}`}>{message}</p>
          </div>
        )}
      </div>
    </div>
  );
}
