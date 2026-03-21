'use client';

import React, { useState, useEffect } from 'react';
import { can } from '@/lib/permissionMatrix';
import { Loader2, CheckCircle, X, AlertCircle } from 'lucide-react';

export default function AdsApprovalQueue({ currentUserRole }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [message, setMessage] = useState(null);

  const canApprove = can(currentUserRole, 'marketing', 'approve');

  useEffect(() => {
    if (!canApprove) {
      setLoading(false);
      return;
    }

    fetchRequests();
  }, [canApprove]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ads/optimize/requests?status=PENDING');
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      }
    } catch (e) {
      console.error('[AdsApprovalQueue] Fetch failed:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveReject = async (requestId, approved) => {
    setActionLoading(requestId);
    try {
      const res = await fetch(`/api/ads/optimize/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: approved ? 'APPROVED' : 'REJECTED',
        }),
      });

      if (res.ok) {
        setMessage({
          text: approved ? 'Request approved' : 'Request rejected',
          type: 'success',
        });
        fetchRequests();
        setTimeout(() => setMessage(null), 2000);
      } else {
        const err = await res.json();
        setMessage({
          text: err.error || 'Failed to update request',
          type: 'error',
        });
      }
    } catch (e) {
      console.error('[AdsApprovalQueue] Action failed:', e);
      setMessage({
        text: 'Error processing request',
        type: 'error',
      });
    } finally {
      setActionLoading(null);
    }
  };

  if (!canApprove) return null;

  const pendingCount = requests.filter(r => r.status === 'PENDING').length;
  if (pendingCount === 0) return null;

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl">
      <div className="mb-4">
        <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 mb-1">
          <span className="text-[#C9A34E]">📋</span> Pending Ad Requests ({pendingCount})
        </h3>
        <p className="text-[10px] text-white/40 font-bold">Manager approval queue</p>
      </div>

      {loading ? (
        <div className="py-4 flex items-center justify-center">
          <Loader2 size={14} className="animate-spin text-[#C9A34E]" />
        </div>
      ) : requests.length === 0 ? (
        <p className="text-[10px] text-white/40 font-bold py-4">No pending requests</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {requests.map((req) => (
            <div key={req.id} className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-[#C9A34E] uppercase tracking-widest truncate">{req.id}</p>
                  <p className="text-xs font-bold text-white mt-1 truncate">"{req.campaignName}"</p>
                  <p className="text-[10px] text-white/60 font-bold mt-1">
                    {req.requestType === 'lifetime_budget'
                      ? `Budget: ฿${req.currentBudget?.toLocaleString() || '?'}→฿${req.proposedBudget?.toLocaleString() || '?'}`
                      : req.requestType === 'daily_budget'
                      ? `Daily: ฿${req.proposedBudget?.toLocaleString() || '?'}/day`
                      : `Bid: ฿${req.proposedBudget?.toLocaleString() || '?'}`}
                  </p>
                  <p className="text-[9px] text-white/40 font-bold mt-1 line-clamp-2">{req.reason}</p>
                  <p className="text-[9px] text-white/40 font-bold mt-1">by {req.requestedBy || 'Marketing'}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => handleApproveReject(req.id, false)}
                  disabled={actionLoading === req.id}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-[9px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading === req.id ? <Loader2 size={10} className="animate-spin" /> : <X size={10} />}
                  Reject
                </button>
                <button
                  onClick={() => handleApproveReject(req.id, true)}
                  disabled={actionLoading === req.id}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading === req.id ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle size={10} />}
                  Approve
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Message Toast */}
      {message && (
        <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${message.type === 'error' ? 'bg-red-500/10 border border-red-500/30' : 'bg-emerald-500/10 border border-emerald-500/30'}`}>
          {message.type === 'error' ? (
            <AlertCircle size={12} className="text-red-500 flex-shrink-0" />
          ) : (
            <CheckCircle size={12} className="text-emerald-500 flex-shrink-0" />
          )}
          <p className={`text-[10px] font-bold ${message.type === 'error' ? 'text-red-500' : 'text-emerald-500'}`}>{message.text}</p>
        </div>
      )}
    </div>
  );
}
