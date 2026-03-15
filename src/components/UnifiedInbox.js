'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Search, MessageCircle, Send, Facebook, MessageSquare, Phone, Mail, Tag, BookOpen, Megaphone, ExternalLink } from 'lucide-react';

export default function UnifiedInbox({ language = 'TH' }) {
    const [conversations, setConversations] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [channel, setChannel] = useState('ALL');
    const [status, setStatus] = useState('open');
    const [search, setSearch] = useState('');
    const [replyText, setReplyText] = useState('');
    const [loading, setLoading] = useState(true);
    const [msgLoading, setMsgLoading] = useState(false);
    const [sending, setSending] = useState(false);
    
    const messagesEndRef = useRef(null);

    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [msgPage, setMsgPage] = useState(1);
    const [msgHasMore, setMsgHasMore] = useState(true);

    const filterRef = useRef({ channel, status, search });
    const selectedIdRef = useRef(selectedId);
    const conversationsRef = useRef(conversations);

    useEffect(() => { filterRef.current = { channel, status, search }; }, [channel, status, search]);
    useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);
    useEffect(() => { conversationsRef.current = conversations; }, [conversations]);

    // Real-time SSE Connection + Polling Fallback
    useEffect(() => {
        let eventSource;
        let retryCount = 0;
        let reconnectTimeout;
        let sseActive = false;
        // Polling fallback: refresh every 30s when SSE not receiving real events
        // (e.g. local dev where FB cannot reach localhost webhook)
        const pollingInterval = setInterval(() => {
            if (!sseActive) {
                fetchConversations(1, true);
            }
        }, 30000);

        const connect = () => {
            console.log('[UnifiedInbox] Establishing Real-time connection...');
            eventSource = new EventSource('/api/events/stream');

            eventSource.onmessage = (event) => {
                try {
                    const payload = JSON.parse(event.data);
                    if (payload.type === 'connected') {
                        console.log('[UnifiedInbox] SSE Connected:', payload.timestamp);
                        retryCount = 0;
                        return;
                    }

                    if (payload.channel === 'chat-updates') {
                        console.log('[UnifiedInbox] Real-time event received:', payload.data);
                        sseActive = true; // SSE is delivering real events — polling not needed
                        fetchConversations(1, true);

                        const currentId = selectedIdRef.current;
                        if (currentId) {
                            const currentConv = conversationsRef.current.find(c => c.id === currentId);
                            if (currentConv && currentConv.conversationId === payload.data.conversationId) {
                                console.log('[UnifiedInbox] Refreshing active messages for:', currentId);
                                fetchMessages(currentId, 1, true);
                            }
                        }
                    }
                } catch (e) { /* Heartbeats or malformed data */ }
            };

            eventSource.onerror = (err) => {
                console.warn('[UnifiedInbox] SSE Connection lost. Retrying...');
                sseActive = false;
                eventSource.close();
                const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
                retryCount++;
                reconnectTimeout = setTimeout(connect, delay);
            };
        };

        connect();

        return () => {
            console.log('[UnifiedInbox] Terminating Real-time connection');
            if (eventSource) eventSource.close();
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
            clearInterval(pollingInterval);
        };
    }, []);

    useEffect(() => {
        setPage(1);
        setHasMore(true);
        fetchConversations(1, true);
    }, [channel, status, search]);

    useEffect(() => {
        if (selectedId) {
            setMsgPage(1);
            setMsgHasMore(true);
            fetchMessages(selectedId, 1, true);
        } else {
            setMessages([]);
        }
    }, [selectedId]);

    useEffect(() => {
        if (msgPage === 1) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const fetchConversations = async (pageNum = 1, reset = false) => {
        setLoading(pageNum === 1);
        try {
            const { channel: fChannel, status: fStatus, search: fSearch } = filterRef.current;
            const start = Date.now();
            const res = await fetch(`/api/inbox/conversations?channel=${fChannel}&status=${fStatus}&search=${fSearch}&page=${pageNum}&limit=10`);
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.details || errData.error || `HTTP ${res.status}`);
            }
            const data = await res.json();
            console.log(`[UnifiedInbox] Fetched ${data.length} conversations`);
            
            // Artificial delay to stabilize UI if returned too fast
            const elapsed = Date.now() - start;
            if (elapsed < 600) await new Promise(r => setTimeout(r, 600 - elapsed));

            if (Array.isArray(data)) {
                if (reset) {
                    setConversations(data);
                } else {
                    setConversations(prev => [...prev, ...data]);
                }
                setHasMore(data.length === 10);
            }
        } catch (err) {
            console.error('Failed to fetch conversations:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchConversations(nextPage);
    };

    const fetchMessages = async (id, pageNum = 1, reset = false) => {
        setMsgLoading(pageNum === 1);
        try {
            const start = Date.now();
            const res = await fetch(`/api/inbox/conversations/${id}/messages?page=${pageNum}&limit=10`);
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.details || errData.error || `HTTP ${res.status}`);
            }
            const data = await res.json();
            
            // Artificial delay for visual stability
            const elapsed = Date.now() - start;
            if (elapsed < 500) await new Promise(r => setTimeout(r, 500 - elapsed));

            if (Array.isArray(data)) {
                if (reset) {
                    setMessages(data);
                } else {
                    // Prepend older messages
                    setMessages(prev => [...data, ...prev]);
                }
                setMsgHasMore(data.length === 10);
            }
        } catch (err) {
            console.error('Failed to fetch messages:', err);
        } finally {
            setMsgLoading(false);
        }
    };

    const loadMoreMessages = () => {
        const nextPage = msgPage + 1;
        setMsgPage(nextPage);
        fetchMessages(selectedId, nextPage);
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!replyText.trim() || !selectedId || sending) return;

        setSending(true);
        const text = replyText;
        setReplyText('');

        try {
            const res = await fetch(`/api/inbox/conversations/${selectedId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });
            if (res.ok) {
                const newMessage = await res.json();
                setMessages(prev => [...prev, newMessage]);
                // Re-fetch conversations to refresh last message
                fetchConversations(1, true);
                setPage(1);
            }
        } catch (err) {
            console.error('Failed to send message:', err);
            setReplyText(text);
        } finally {
            setSending(false);
        }
    };

    const formatTime = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = Math.floor((now - date) / 1000);

        if (diff < 60) return language === 'TH' ? 'เมื่อครู่' : 'just now';
        if (diff < 3600) return language === 'TH' ? `${Math.floor(diff / 60)} นาทีที่แล้ว` : `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return language === 'TH' ? `${Math.floor(diff / 3600)} ชั่วโมงที่แล้ว` : `${Math.floor(diff / 3600)}h ago`;
        return date.toLocaleDateString(language === 'TH' ? 'th-TH' : 'en-US', { day: 'numeric', month: 'short' });
    };

    const selectedConv = conversations.find(c => c.id === selectedId);

    return (
        <div className="flex w-full flex-1 min-h-0 bg-[#0A1A2F] text-white rounded-[2rem] overflow-hidden border border-white/5 shadow-2xl relative">
            {/* Conversation List */}
            <div className="w-80 border-r border-white/5 flex flex-col bg-[#0A1A2F] overflow-hidden relative z-10 shrink-0">
                <div className="flex-shrink-0 p-6 space-y-4 border-b border-white/5 bg-[#0A1A2F]/95 backdrop-blur-md sticky top-0 z-30">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                           <h2 className="text-xl font-black tracking-tight">{language === 'TH' ? 'กล่องข้อความ' : 'Inbox'}</h2>
                           <span className="text-[10px] text-[#C9A34E] font-black uppercase tracking-[0.2em] opacity-80">{conversations.length} {language === 'TH' ? 'บทสนทนา' : 'Active Chats'}</span>
                        </div>
                        <MessageCircle size={20} className="text-[#C9A34E]" />
                    </div>
                    
                    <div className="relative group">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-[#C9A34E] transition-colors" />
                        <input 
                            type="text" 
                            placeholder={language === 'TH' ? 'ค้นหาลูกค้า...' : 'Search customers...'}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs focus:outline-none focus:border-[#C9A34E]/50 transition-all font-black uppercase tracking-widest"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-white/10">
                            {['ALL', 'FACEBOOK', 'LINE'].map((ch) => (
                                <button
                                    key={ch}
                                    onClick={() => setChannel(ch)}
                                    className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                                        channel === ch ? 'bg-[#C9A34E] text-white shadow-lg shadow-[#C9A34E]/20' : 'text-white/40 hover:bg-white/5 hover:text-white'
                                    }`}
                                >
                                    {ch === 'ALL' ? (language === 'TH' ? 'ทั้งหมด' : 'All') : ch}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-white/10">
                            {['open', 'pending', 'closed'].map((st) => (
                                <button
                                    key={st}
                                    onClick={() => setStatus(st)}
                                    className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                                        status === st ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30' : 'text-white/40 hover:bg-white/5'
                                    }`}
                                >
                                    {st}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#0A1A2F] min-h-0">
                    {loading && page === 1 ? (
                        <div className="flex flex-col items-center justify-center p-20 space-y-4 opacity-50">
                            <div className="w-8 h-8 border-2 border-[#C9A34E] border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Syncing...</p>
                        </div>
                    ) : conversations.length === 0 ? (
                        <div className="p-12 text-center text-white/20 text-xs font-bold uppercase tracking-widest">
                            {language === 'TH' ? 'ไม่พบการสนทนา' : 'No conversations'}
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {conversations.map((conv) => (
                                <button
                                    key={conv.id}
                                    onClick={() => setSelectedId(conv.id)}
                                    className={`w-full p-5 text-left border-b border-white/5 hover:bg-white/5 transition-all relative group ${
                                        selectedId === conv.id ? 'bg-white/5' : ''
                                    }`}
                                >
                                    {selectedId === conv.id && (
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#C9A34E] shadow-[0_0_15px_rgba(201,163,78,0.5)]"></div>
                                    )}
                                    
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${conv.channel === 'FACEBOOK' ? 'bg-[#1877F2]' : 'bg-[#06C755]'}`}></div>
                                            <h3 className="font-bold text-sm truncate max-w-[140px]">
                                                {conv.customer?.firstName || 'Unknown'} {conv.customer?.lastName || ''}
                                            </h3>
                                        </div>
                                        <span className="text-[10px] text-white/30 font-medium">{formatTime(conv.updatedAt)}</span>
                                    </div>
                                    
                                    <p className="text-xs text-white/40 truncate leading-relaxed">
                                        {conv.lastMessage?.text || (language === 'TH' ? 'ไม่มีข้อความ' : 'No message')}
                                    </p>
                                    
                                    <div className="mt-2 flex items-center justify-between">
                                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${
                                            conv.channel === 'FACEBOOK' 
                                                ? 'bg-[#1877F2]/10 text-[#1877F2] border-[#1877F2]/20' 
                                                : 'bg-[#06C755]/10 text-[#06C755] border-[#06C755]/20'
                                        }`}>
                                            {conv.channel}
                                        </span>
                                        {conv.status === 'open' && (
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                        )}
                                    </div>
                                </button>
                            ))}
                            {hasMore && (
                                <div className="p-8 text-center">
                                    <button 
                                        onClick={loadMore}
                                        className="py-2 px-6 rounded-xl border border-white/5 text-[9px] font-black uppercase tracking-widest text-[#C9A34E] hover:bg-white/5 hover:scale-105 transition-all"
                                    >
                                        {language === 'TH' ? 'โหลดเพิ่ม...' : 'Load more...'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Message Thread */}
            <div className="flex-1 flex flex-col bg-[#0D2040] overflow-hidden relative min-w-0">
                {/* Fixed background to prevent stretching */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#0D2040] to-[#051020] z-0 pointer-events-none"></div>
                
                {selectedId ? (
                    <div className="flex-1 flex flex-col min-h-0 relative z-10">
                        <div className="flex-shrink-0 p-6 border-b border-white/5 flex items-center justify-between bg-[#0A1A2F]/95 backdrop-blur-xl relative z-30">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-xl shadow-black/20 shrink-0 ${
                                    selectedConv?.channel === 'FACEBOOK' ? 'bg-gradient-to-br from-[#1877F2] to-[#0062E0]' : 'bg-gradient-to-br from-[#06C755] to-[#05b34b]'
                                }`}>
                                    {selectedConv?.customer.firstName?.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-3">
                                        <h2 className="font-black text-lg tracking-tight truncate">
                                            {selectedConv?.customer?.firstName || 'Unknown'} {selectedConv?.customer?.lastName || ''}
                                        </h2>
                                        <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border shrink-0 ${
                                            selectedConv?.channel === 'FACEBOOK' 
                                                ? 'bg-[#1877F2]/20 text-white border-[#1877F2]/30' 
                                                : 'bg-[#06C755]/20 text-white border-[#06C755]/30'
                                        }`}>
                                            {selectedConv?.channel}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1 flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${selectedConv?.status === 'open' ? 'bg-emerald-500' : 'bg-white/20'}`}></span>
                                        {selectedConv?.status}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3 shrink-0">
                                {selectedConv?.channel === 'FACEBOOK' ? <Facebook size={18} className="text-white/40" /> : <MessageSquare size={18} className="text-white/40" />}
                            </div>
                        </div>

                        <div className="flex-1 min-h-0 overflow-y-auto p-8 space-y-6 custom-scrollbar relative z-10 flex flex-col bg-transparent">
                            {msgHasMore && (
                                <button 
                                    onClick={loadMoreMessages}
                                    className="self-center py-2 px-4 rounded-full bg-white/5 text-[9px] font-black uppercase tracking-widest text-[#C9A34E] hover:bg-white/10 hover:text-white transition-all mb-4 shrink-0 border border-white/5"
                                >
                                    {msgLoading && msgPage > 1 ? (
                                        <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        language === 'TH' ? 'ดูข้อความก่อนหน้า' : 'View previous messages'
                                    )}
                                </button>
                            )}

                            {msgLoading && messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center flex-1 space-y-4 opacity-50">
                                    <div className="w-10 h-10 border-3 border-[#C9A34E] border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Loading Threads...</p>
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center space-y-4 opacity-10">
                                    <MessageCircle size={48} />
                                    <p className="text-xs font-black uppercase tracking-widest">{language === 'TH' ? 'ไม่มีประวัติข้อความ' : 'No message history'}</p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-6">
                                    {messages.map((msg, idx) => (
                                        <div key={msg.id || idx} className={`flex ${msg.senderType === 'AGENT' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[70%] space-y-1.5`}>
                                                <div className={`px-5 py-3.5 rounded-3xl text-sm font-medium leading-relaxed shadow-lg ${
                                                    msg.senderType === 'AGENT' 
                                                        ? 'bg-[#C9A34E]/20 text-[#C9A34E] border border-[#C9A34E]/20 rounded-tr-none' 
                                                        : 'bg-white/10 text-white border border-white/5 rounded-tl-none'
                                                }`}>
                                                    {msg.text}
                                                </div>
                                                <p className={`text-[9px] font-bold text-white/20 uppercase tracking-widest px-2 ${msg.senderType === 'AGENT' ? 'text-right' : 'text-left'}`}>
                                                    {new Date(msg.createdAt).toLocaleTimeString(language === 'TH' ? 'th-TH' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={messagesEndRef} className="h-4 w-full shrink-0" />
                                </div>
                            )}
                        </div>

                        <div className="flex-shrink-0 p-6 bg-[#0A1A2F]/95 backdrop-blur-xl border-t border-white/5 z-40 relative">
                            <form onSubmit={handleSend} className="relative group">
                                <textarea
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder={language === 'TH' ? 'พิมพ์ข้อความเพื่อตอบกลับ...' : 'Type a message to reply...'}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-5 pr-16 text-sm font-medium focus:outline-none focus:border-[#C9A34E]/50 transition-all resize-none min-h-[60px] max-h-[150px] custom-scrollbar text-white placeholder:text-white/20"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSend(e);
                                        }
                                    }}
                                />
                                <button
                                    type="submit"
                                    disabled={!replyText.trim() || sending}
                                    className={`absolute right-3 bottom-3 p-3 rounded-xl transition-all ${
                                        replyText.trim() && !sending ? 'bg-[#C9A34E] text-white shadow-lg shadow-[#C9A34E]/30 hover:scale-105 active:scale-95' : 'bg-white/5 text-white/30'
                                    }`}
                                >
                                    <Send size={18} className={sending ? 'animate-pulse' : ''} />
                                </button>
                            </form>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center space-y-4 text-white/5 select-none relative z-10">
                        <div className="w-24 h-24 rounded-full border-4 border-white/5 flex items-center justify-center">
                            <MessageSquare size={40} />
                        </div>
                        <p className="font-black text-xs uppercase tracking-[0.3em]">{language === 'TH' ? 'กรุณาเลือกการสนทนา' : 'Select a conversation'}</p>
                    </div>
                )}
            </div>

            {/* ── Right Panel: Customer Card ── */}
            {selectedConv ? (
                <div className="w-64 shrink-0 border-l border-white/5 bg-[#060f1e] flex flex-col overflow-y-auto custom-scrollbar">

                    {/* Profile Header */}
                    <div className="px-5 pt-6 pb-5 border-b border-white/5 text-center">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg text-2xl font-black text-white select-none ${
                            selectedConv.channel === 'FACEBOOK' ? 'bg-gradient-to-br from-[#1877F2] to-[#0062E0]' : 'bg-gradient-to-br from-[#06C755] to-[#05b34b]'
                        }`}>
                            {(selectedConv.customer.firstName || '?').charAt(0)}
                        </div>
                        <h3 className="font-black text-white text-sm leading-tight">
                            {selectedConv.customer?.firstName || 'Unknown'} {selectedConv.customer?.lastName || ''}
                        </h3>
                        <p className="text-[9px] text-white/25 font-mono mt-1 truncate px-2">
                            {selectedConv.customer.customerId || '—'}
                        </p>
                        <div className="flex justify-center gap-1.5 mt-3 flex-wrap">
                            {selectedConv.customer.membershipTier && (
                                <span className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border bg-[#C9A34E]/20 text-[#C9A34E] border-[#C9A34E]/30">
                                    {selectedConv.customer.membershipTier}
                                </span>
                            )}
                            {selectedConv.customer.lifecycleStage && (
                                <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${
                                    selectedConv.customer.lifecycleStage === 'Customer'
                                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                        : 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                                }`}>
                                    {selectedConv.customer.lifecycleStage}
                                </span>
                            )}
                            {!selectedConv.customer.customerId && (
                                <span className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border bg-orange-500/20 text-orange-400 border-orange-500/30">New Lead</span>
                            )}
                        </div>
                    </div>

                    {/* Contact Info */}
                    <div className="px-5 py-4 border-b border-white/5 space-y-2.5">
                        <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em]">Contact</p>
                        {selectedConv.customer.phonePrimary && (
                            <div className="flex items-center gap-2.5">
                                <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                                    <Phone size={9} className="text-white/40" />
                                </div>
                                <span className="text-[11px] text-white/70 font-bold">{selectedConv.customer.phonePrimary}</span>
                            </div>
                        )}
                        {selectedConv.customer.facebookId && (
                            <div className="flex items-center gap-2.5">
                                <div className="w-6 h-6 rounded-lg bg-[#1877F2]/10 flex items-center justify-center shrink-0">
                                    <Facebook size={9} className="text-[#1877F2]" />
                                </div>
                                <span className="text-[10px] text-white/35 font-mono truncate">{selectedConv.customer.facebookId}</span>
                            </div>
                        )}
                        {!selectedConv.customer.phonePrimary && !selectedConv.customer.facebookId && (
                            <p className="text-[10px] text-white/20 font-bold">—</p>
                        )}
                    </div>

                    {/* Ad Attribution (originId = source ad_id for ROAS — ADR-025) */}
                    {selectedConv.customer.originId && (
                        <div className="px-5 py-4 border-b border-white/5">
                            <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] mb-2.5 flex items-center gap-1.5">
                                <Megaphone size={9} className="text-indigo-400" /> Ad Attribution
                            </p>
                            <div className="bg-[#0d1e36] rounded-xl border border-indigo-500/20 p-3 space-y-1.5">
                                <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Source Ad</p>
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[9px] font-mono text-indigo-300/60 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 truncate flex-1" title="Ad ID (originId)">
                                        {selectedConv.customer.originId}
                                    </span>
                                    <ExternalLink size={10} className="text-indigo-400/50 shrink-0" />
                                </div>
                                {selectedConv.customer.intelligence?.source_campaign && (
                                    <p className="text-[10px] font-black text-white/60 line-clamp-2 leading-tight">
                                        {selectedConv.customer.intelligence.source_campaign}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Intelligence Summary */}
                    {selectedConv.customer.intelligence && (
                        (() => {
                            const intel = selectedConv.customer.intelligence;
                            const totalSpend = intel.metrics?.total_spend || intel.total_spend;
                            const courses = intel.courses_owned || intel.learning_courses || [];
                            if (!totalSpend && courses.length === 0) return null;
                            return (
                                <div className="px-5 py-4 border-b border-white/5 space-y-3">
                                    {totalSpend > 0 && (
                                        <div>
                                            <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] mb-1.5 flex items-center gap-1.5">
                                                <Tag size={9} className="text-[#C9A34E]" /> Total Spend
                                            </p>
                                            <p className="text-base font-black text-[#C9A34E] italic">฿{Number(totalSpend).toLocaleString()}</p>
                                        </div>
                                    )}
                                    {courses.length > 0 && (
                                        <div>
                                            <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] mb-1.5 flex items-center gap-1.5">
                                                <BookOpen size={9} className="text-amber-400" /> Courses ({courses.length})
                                            </p>
                                            <div className="space-y-1">
                                                {courses.slice(0, 3).map((c, i) => (
                                                    <div key={i} className="flex items-center justify-between px-2 py-1.5 bg-white/5 rounded-lg border border-white/5">
                                                        <p className="text-[9px] font-black text-white/70 truncate mr-2">{c.name || c}</p>
                                                        <span className="text-[7px] font-black px-1 py-0.5 rounded bg-blue-500/20 text-blue-400 shrink-0">{c.status || 'Active'}</span>
                                                    </div>
                                                ))}
                                                {courses.length > 3 && (
                                                    <p className="text-[8px] text-white/20 font-bold text-center">+{courses.length - 3} more</p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })()
                    )}

                    {/* Conversation Meta */}
                    <div className="px-5 py-4 mt-auto">
                        <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] mb-2">Conversation</p>
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <span className="text-[9px] text-white/30 font-bold uppercase tracking-widest">Status</span>
                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md border uppercase tracking-widest ${
                                    selectedConv.status === 'open'
                                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                        : selectedConv.status === 'pending'
                                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                        : 'bg-white/5 text-white/30 border-white/10'
                                }`}>{selectedConv.status}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[9px] text-white/30 font-bold uppercase tracking-widest">Channel</span>
                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md border uppercase tracking-widest ${
                                    selectedConv.channel === 'FACEBOOK'
                                        ? 'bg-[#1877F2]/10 text-[#1877F2] border-[#1877F2]/20'
                                        : 'bg-[#06C755]/10 text-[#06C755] border-[#06C755]/20'
                                }`}>{selectedConv.channel}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[9px] text-white/30 font-bold uppercase tracking-widest">Conv ID</span>
                                <span className="text-[8px] font-mono text-white/20 truncate max-w-[100px]">{selectedConv.conversationId}</span>
                            </div>
                        </div>
                    </div>

                </div>
            ) : (
                <div className="w-64 shrink-0 border-l border-white/5 bg-[#060f1e] flex items-center justify-center">
                    <p className="text-[9px] font-black text-white/5 uppercase tracking-widest rotate-90 whitespace-nowrap">Customer Details</p>
                </div>
            )}

        </div>
    );
}
