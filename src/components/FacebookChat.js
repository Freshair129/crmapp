
'use client';
import React, { useState, useEffect, useRef } from 'react';

export default function FacebookChat({ onViewCustomer, initialCustomerId, currentUser }) {
    const [conversations, setConversations] = useState([]);
    const [messages, setMessages] = useState([]);
    const [selectedConv, setSelectedConv] = useState(null);
    const [pageId, setPageId] = useState(null);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [isTokenExpired, setIsTokenExpired] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [isSyncing, setIsSyncing] = useState(false);
    const [catalog, setCatalog] = useState({ packages: [], products: [] });
    const [employees, setEmployees] = useState([]);
    const [filterAgent, setFilterAgent] = useState('');
    const [filterStatus, setFilterStatus] = useState('');          // '' | 'open' | 'pending' | 'closed'
    const [filterUnreadOnly, setFilterUnreadOnly] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [discoveredProducts, setDiscoveredProducts] = useState([]);
    const [activeAd, setActiveAd] = useState(null);
    const [loadingAd, setLoadingAd] = useState(false);
    const [readMode, setReadMode] = useState('stealth'); // 'stealth' | 'normal'
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const initialSelectionRef = useRef(false);

    // Persistent Real-time SSE Connection
    const selectedConvRef = useRef(selectedConv);
    useEffect(() => { selectedConvRef.current = selectedConv; }, [selectedConv]);

    useEffect(() => {
        let eventSource;
        let retryCount = 0;
        let reconnectTimeout;

        const connect = () => {
            console.log('[Chat] Establishing Real-time connection...');
            eventSource = new EventSource('/api/events/stream');

            eventSource.onmessage = (event) => {
                try {
                    const payload = JSON.parse(event.data);
                    if (payload.type === 'connected') {
                        console.log('[Chat] SSE Connected:', payload.timestamp);
                        retryCount = 0; // Reset retry count on successful connection
                        return;
                    }

                    console.log('[Chat] Real-time event received:', payload);
                    if (payload.channel === 'chat-updates') {
                        fetchConversations();
                        const current = selectedConvRef.current;
                        if (current && (current.id === payload.data.conversationId || current.id === `t_${payload.data.conversationId}`)) {
                            console.log('[Chat] Refreshing active messages...');
                            fetchMessages(current.id);
                        }
                    }
                } catch (e) { /* Heartbeats or malformed data */ }
            };

            eventSource.onerror = (err) => {
                console.warn('[Chat] SSE Connection lost. Retrying...');
                eventSource.close();

                // Exponential backoff: 1s, 2s, 4s, 8s, up to 30s
                const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
                retryCount++;
                reconnectTimeout = setTimeout(connect, delay);
            };
        };

        connect();

        return () => {
            console.log('[Chat] Terminating Real-time connection');
            if (eventSource) eventSource.close();
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
        };
    }, []); // Only once on mount

    // Initial load: catalog & employees
    useEffect(() => {
        const loadCatalog = async () => {
            try {
                const res = await fetch('/api/catalog');
                const data = await res.json();
                setCatalog(data);
            } catch (err) {
                console.error('Failed to load catalog:', err);
            }
        };
        loadCatalog();

        const loadEmployees = async () => {
            try {
                const res = await fetch('/api/employees');
                const data = await res.json();
                setEmployees(data || []);
            } catch (err) { console.error('Failed to load employees:', err); }
        };
        loadEmployees();
    }, []);

    // Polling setup: Fetch conversations every 60s (was 15s)
    useEffect(() => {
        fetchConversations();
        const interval = setInterval(fetchConversations, 60000);
        return () => clearInterval(interval);
    }, []);

    // Polling active chat: Fetch messages every 30s (was 5s) if active
    useEffect(() => {
        let interval;
        if (selectedConv) {
            fetchMessages(selectedConv.id);
            interval = setInterval(() => fetchMessages(selectedConv.id), 30000);
        }
        return () => clearInterval(interval);
    }, [selectedConv]);

    // Auto-select conversation based on initialCustomerId
    useEffect(() => {
        if (initialCustomerId && conversations.length > 0 && !initialSelectionRef.current) {
            console.log(`[Chat] Attempting auto-selection for ID: ${initialCustomerId}`);
            const target = conversations.find(c => {
                const fbId = c.customer?.contact_info?.facebook_id || c.customer?.facebook_id;
                return c.id === initialCustomerId || fbId === initialCustomerId;
            });

            if (target) {
                console.log(`[Chat] Target found: ${target.id}`);
                setSelectedConv(target);
                initialSelectionRef.current = true;
            }
        }
    }, [initialCustomerId, conversations]);

    // Fetch Ad details when conversation changes
    useEffect(() => {
        const fetchAdDetails = async () => {
            if (!selectedConv) {
                setActiveAd(null);
                return;
            }

            // 1. Try to find ad_id from labels
            const labels = selectedConv.labels?.data?.map(l => l.name) || [];
            const adLabel = labels.find(l => l.includes('ad_id.'));
            let adId = adLabel ? adLabel.split('ad_id.')[1] : null;

            // 2. Fallback to customer intelligence
            if (!adId && selectedConv.customer?.intelligence?.source_ad_id) {
                adId = selectedConv.customer.intelligence.source_ad_id;
            }

            if (!adId) {
                setActiveAd(null);
                return;
            }

            setLoadingAd(true);
            try {
                const res = await fetch(`/api/marketing/ads?id=${adId}`);
                const result = await res.json();
                if (result.success) {
                    setActiveAd(result.data);
                } else {
                    setActiveAd(null);
                }
            } catch (err) {
                console.error('Failed to fetch ad details:', err);
                setActiveAd(null);
            } finally {
                setLoadingAd(false);
            }
        };

        fetchAdDetails();
    }, [selectedConv]);

    // Auto-Sync Background: Trigger full Facebook lead import every 5 minutes
    useEffect(() => {
        if (isTokenExpired) return;

        const autoSync = async () => {
            console.log('[Chat] Background Auto-Sync Triggered');
            try {
                await fetch('/api/customers?sync=true');
                await fetchConversations();
            } catch (err) {
                console.error('Auto-sync error:', err);
            }
        };

        const interval = setInterval(autoSync, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [isTokenExpired]);

    // Scroll Logic: Only scroll if new messages arrived AND user is already near bottom
    const prevMsgCount = useRef(0);
    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container) return;

        const isNewMessage = messages.length > prevMsgCount.current;
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;

        if (isNewMessage && (isNearBottom || prevMsgCount.current === 0)) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
        prevMsgCount.current = messages.length;
    }, [messages]);

    const fetchConversations = async () => {
        try {
            const res = await fetch('/api/marketing/chat/conversations');
            const data = await res.json();
            if (data.success) {
                setConversations(Array.isArray(data.data) ? data.data : []);
                setPageId(data.pageId);
                setLoading(false);
                setIsTokenExpired(false);
                setLastUpdated(new Date());
            } else if (data.errorType === 'TOKEN_EXPIRED') {
                setIsTokenExpired(true);
            }
        } catch (err) {
            console.error('Fetch conversations error:', err);
        }
    };

    const handleManualSync = async () => {
        setIsSyncing(true);
        try {
            await fetch('/api/customers');
            await fetchConversations();
            alert('Synchronized successfully!');
        } catch (err) {
            console.error('Sync error:', err);
            alert('Sync failed. Check connection.');
        } finally {
            setIsSyncing(false);
        }
    };

    const fetchMessages = async (convId) => {
        try {
            const res = await fetch(`/api/marketing/chat/messages?conversation_id=${convId}`);
            const data = await res.json();
            if (data.success) {
                setMessages(Array.isArray(data.data) ? data.data : []);
            }
        } catch (err) {
            console.error('Fetch messages error:', err);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!inputText.trim() || !selectedConv) return;

        const text = inputText;
        setInputText('');
        setSending(true);

        try {
            const participants = selectedConv.participants?.data || [];
            const recipient = participants.find(p => p.id !== pageId);
            if (!recipient) throw new Error('Cannot identify recipient');

            const res = await fetch('/api/marketing/chat/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipientId: recipient.id,
                    message: text,
                    ownerName: currentUser?.identities?.facebook?.name || currentUser?.facebookName || currentUser?.nickName || currentUser?.firstName || 'Agent',
                    usePersona: true // Enable personas for better tracking
                })
            });
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    // [NEW] Add optimistic message immediately with agent name
                    const newMsg = {
                        id: data.data.message_id,
                        message: text,
                        from: { name: currentUser?.identities?.facebook?.name || currentUser?.facebookName || currentUser?.nickName || currentUser?.firstName || 'Me', id: pageId },
                        created_time: new Date().toISOString(),
                        metadata: { agent_name: currentUser?.identities?.facebook?.name || currentUser?.facebookName || currentUser?.nickName || currentUser?.firstName || 'Agent' },
                        isOptimistic: true
                    };
                    setMessages(prev => [...prev, newMsg]);
                    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                } else {
                    alert('Failed to send: ' + (data.error || 'Unknown error'));
                    setInputText(text);
                }
            } else {
                const data = await res.json();
                alert('Failed to send: ' + (data.error || 'Unknown error'));
                setInputText(text);
            }
        } catch (err) {
            console.error(err);
            alert('Error sending message');
            setInputText(text);
        } finally {
            setSending(false);
        }
    };

    const handleAssignAgent = async (agentName) => {
        if (!selectedConv) return;
        try {
            const res = await fetch('/api/marketing/chat/assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conversationId: selectedConv.id, agentName })
            });
            const data = await res.json();
            if (data.success) {
                setSelectedConv(prev => ({ ...prev, agent: agentName }));
                setConversations(prev => prev.map(c => c.id === selectedConv.id ? { ...c, agent: agentName } : c));
            } else {
                alert('Assignment failed: ' + data.error);
            }
        } catch (err) { console.error(err); alert('Error assigning agent'); }
    };

    const handleToggleStar = async (convId, currentStatus, e) => {
        if (e) e.stopPropagation();

        const newStatus = !currentStatus;
        setConversations(prev => prev.map(c => c.id === convId ? { ...c, isStarred: newStatus } : c));
        if (selectedConv && selectedConv.id === convId) {
            setSelectedConv(prev => ({ ...prev, isStarred: newStatus }));
        }

        try {
            const res = await fetch('/api/marketing/chat/star', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conversationId: convId, isStarred: newStatus })
            });
            const data = await res.json();
            if (!data.success) {
                // Revert on error
                setConversations(prev => prev.map(c => c.id === convId ? { ...c, isStarred: currentStatus } : c));
                if (selectedConv && selectedConv.id === convId) {
                    setSelectedConv(prev => ({ ...prev, isStarred: currentStatus }));
                }
                alert('Failed to update star status: ' + data.error);
            }
        } catch (err) {
            console.error('Star toggle error:', err);
            setConversations(prev => prev.map(c => c.id === convId ? { ...c, isStarred: currentStatus } : c));
            if (selectedConv && selectedConv.id === convId) {
                setSelectedConv(prev => ({ ...prev, isStarred: currentStatus }));
            }
            alert('Error updating star status');
        }
    };

    const handleDiscoverProducts = async () => {
        if (!selectedConv) return;
        setIsAnalyzing(true);
        setDiscoveredProducts([]);
        try {
            const res = await fetch(`/api/ai/discover-products?customerId=${selectedConv.id}`);
            const data = await res.json();
            if (data.success) {
                setDiscoveredProducts(data.data || []);

                // AI Agent Assignment Suggestion
                if (data.suggested_agent && data.suggested_agent !== selectedConv.agent) {
                    if (window.confirm(`AI detects a possible assignment. Assign to "${data.suggested_agent}"?\n\nJustification: ${data.justification}`)) {
                        handleAssignAgent(data.suggested_agent);
                    }
                }
            } else {
                alert('Discovery failed: ' + data.error);
            }
        } catch (err) {
            console.error(err);
            alert('Discovery error. Check connection.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleAddToStore = async (product) => {
        if (!window.confirm(`Add "${product.product_name}" to store for ${product.price} THB?`)) return;

        try {
            const res = await fetch('/api/ai/discover-products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    product_name: product.product_name,
                    price: product.price,
                    category: product.category
                })
            });
            const data = await res.json();
            if (data.success) {
                alert('Product added to store!');
                setDiscoveredProducts(prev => prev.map(p => p.product_name === product.product_name ? { ...p, exists: true } : p));
                // Reload catalog
                const catRes = await fetch('/api/catalog');
                const catData = await catRes.json();
                setCatalog(catData);
            } else {
                alert('Failed to add product: ' + data.error);
            }
        } catch (err) {
            console.error(err);
            alert('Error adding to store');
        }
    };

    const getCustomerTags = (conv) => {
        if (!conv) return [];
        const customer = conv.customer || conversations.find(c => c.id === conv.id)?.customer;
        const tags = customer?.intelligence?.tags || [];
        const labels = conv.labels?.data?.map(l => l.name) || [];
        return [...new Set([...tags, ...labels])];
    };

    const getParticipantName = (conv) => {
        const FB_PAGE_ID = process.env.NEXT_PUBLIC_FB_PAGE_ID || '170707786504';
        console.log('[Chat] Initialization - FB_PAGE_ID:', FB_PAGE_ID);
        const parts = conv.participants?.data || [];
        const other = parts.find(p => p.id !== FB_PAGE_ID);
        return other?.name || 'User';
    };

    const filteredConversations = React.useMemo(() => {
        let result = conversations;

        if (filterAgent) {
            const agentLower = filterAgent.toLowerCase();
            result = result.filter(c => {
                const priAgent = (c.agent || c.customer?.agent || '').toLowerCase();
                const senders = (c.intelligence?.senders || c.customer?.intelligence?.senders || []).map(s => s.toLowerCase());
                return priAgent === agentLower || priAgent.includes(agentLower) || senders.some(s => s.includes(agentLower));
            });
        }

        if (filterStatus) {
            result = result.filter(c => (c.status || 'open') === filterStatus);
        }

        if (filterUnreadOnly) {
            result = result.filter(c => (c.unread_count || 0) > 0);
        }

        // Sort: Starred items first, then by updated_time
        return result.sort((a, b) => {
            if (a.isStarred && !b.isStarred) return -1;
            if (!a.isStarred && b.isStarred) return 1;
            return new Date(b.updated_time || 0) - new Date(a.updated_time || 0);
        });
    }, [conversations, filterAgent, filterStatus, filterUnreadOnly]);

    // Update conversation status (open / pending / closed)
    const handleStatusChange = async (convId, newStatus, e) => {
        e.stopPropagation();
        try {
            await fetch(`/api/marketing/chat/conversations/${convId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            setConversations(prev =>
                prev.map(c => c.conversation_id === convId ? { ...c, status: newStatus } : c)
            );
        } catch (err) {
            console.error('[StatusChange] failed', err);
        }
    };

    if (loading && conversations.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-white/50">
                <div className="text-center">
                    <i className="fas fa-circle-notch animate-spin text-3xl mb-4 text-blue-500"></i>
                    <p className="text-xs font-bold uppercase tracking-widest">Loading Chats...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full bg-[#0A1A2F] text-white rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl">
            {/* Left Sidebar: Conversations */}
            <div className="w-80 border-r border-white/5 flex flex-col bg-[#0A1A2F]">
                <div className="p-6 border-b border-white/5 space-y-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="font-black text-xl tracking-tight text-white">Inbox</h2>
                            <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em] mt-1">{conversations.length} Active Chats</p>
                        </div>
                        {/* Read Mode Toggle */}
                        <button
                            onClick={() => setReadMode(m => m === 'stealth' ? 'normal' : 'stealth')}
                            title={readMode === 'stealth' ? 'Stealth Mode: ลูกค้าไม่รู้ว่าอ่านแล้ว' : 'Normal Mode: ส่ง read receipt ไป Facebook'}
                            className={`p-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                                readMode === 'stealth'
                                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}
                        >
                            <i className={`fas ${readMode === 'stealth' ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                            <span className="text-[9px] uppercase tracking-widest">{readMode}</span>
                        </button>
                        <button
                            onClick={handleManualSync}
                            disabled={isSyncing}
                            className={`p-2 rounded-xl transition-all ${isSyncing ? 'bg-blue-500/20 text-blue-400 rotate-180' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'}`}
                            title="Force Sync from Facebook"
                        >
                            <i className={`fas fa-sync-alt text-xs ${isSyncing ? 'animate-spin' : ''}`}></i>
                        </button>
                    </div>

                    {isTokenExpired && (
                        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-3 animate-pulse">
                            <i className="fas fa-key text-rose-500 text-xs"></i>
                            <div>
                                <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Token Expired</p>
                                <p className="text-[8px] text-rose-500/70 font-bold leading-tight">Sync restricted to local cache.</p>
                            </div>
                        </div>
                    )}

                    {!isTokenExpired && (
                        <div className="flex items-center gap-2 text-[8px] font-bold text-white/20 uppercase tracking-widest">
                            <i className="fas fa-clock"></i>
                            Last Updated: {lastUpdated.toLocaleTimeString()}
                        </div>
                    )}

                    {/* Inbox Filters */}
                    <div className="space-y-2 pt-2 border-t border-white/5">
                        {/* Status tabs: All / Open / Pending / Closed */}
                        <div className="flex gap-1">
                            {[
                                { v: '',        l: 'All',     dot: 'bg-white/30' },
                                { v: 'open',    l: 'Open',    dot: 'bg-emerald-500' },
                                { v: 'pending', l: 'Pending', dot: 'bg-amber-500' },
                                { v: 'closed',  l: 'Closed',  dot: 'bg-red-500/70' },
                            ].map(({ v, l, dot }) => (
                                <button
                                    key={v}
                                    onClick={() => setFilterStatus(v)}
                                    className={`flex-1 py-1.5 flex items-center justify-center gap-1 text-[8px] font-black uppercase tracking-wider rounded-lg transition-all ${
                                        filterStatus === v
                                            ? 'bg-blue-600/30 text-blue-400 border border-blue-500/40'
                                            : 'bg-white/5 text-white/30 hover:bg-white/10'
                                    }`}
                                >
                                    <span className={`w-1.5 h-1.5 rounded-full ${dot}`}></span>
                                    {l}
                                </button>
                            ))}
                        </div>

                        {/* Agent filter + Unread-only toggle */}
                        <div className="flex items-center gap-2">
                            <select
                                value={filterAgent}
                                onChange={(e) => setFilterAgent(e.target.value)}
                                className="flex-1 bg-white/5 border border-white/10 text-white/70 text-[10px] font-bold px-3 py-2.5 rounded-xl outline-none focus:border-[#C9A34E]/50 transition-colors uppercase tracking-widest appearance-none cursor-pointer"
                            >
                                <option value="" className="bg-[#0A1A2F] text-white">All Agents</option>
                                <option value="Unassigned" className="bg-[#0A1A2F] text-white">Unassigned</option>
                                {employees.map(emp => (
                                    <option key={emp.employeeCode || emp.id} value={emp.nickName || emp.firstName} className="bg-[#0A1A2F] text-white">
                                        {emp.nickName || emp.firstName}
                                    </option>
                                ))}
                            </select>
                            <button
                                onClick={() => setFilterUnreadOnly(v => !v)}
                                title={filterUnreadOnly ? 'Show all chats' : 'Show unread only'}
                                className={`p-2.5 rounded-xl text-xs transition-all border flex-shrink-0 ${
                                    filterUnreadOnly
                                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                                        : 'bg-white/5 text-white/30 border-white/10 hover:bg-white/10'
                                }`}
                            >
                                <i className="fas fa-envelope text-xs"></i>
                            </button>
                        </div>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {filteredConversations.length === 0 ? (
                        <div className="p-8 text-center text-white/30 text-xs font-bold uppercase tracking-widest">
                            No conversations match filters
                        </div>
                    ) : (
                        filteredConversations.map(conv => (
                            <button
                                key={conv.id}
                                onClick={() => {
                                    setSelectedConv(conv);
                                    // Mark as read — reset unreadCount; stealth = ไม่ส่ง read receipt ไป FB
                                    if (conv.unread_count > 0) {
                                        fetch('/api/marketing/chat/read', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                conversationId: conv.id,
                                                recipientId: conv.participant_id || conv.participantId,
                                                mode: readMode,
                                            }),
                                        }).then(() => {
                                            // อัพเดท UI ทันทีโดยไม่ต้อง refetch
                                            setConversations(prev =>
                                                prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c)
                                            );
                                        }).catch(err => console.error('[ChatRead] failed', err));
                                    }
                                }}
                                className={`w-full p-5 text-left border-b border-white/5 hover:bg-white/5 transition-all group relative ${selectedConv?.id === conv.id ? 'bg-blue-600/10' : ''}`}
                            >
                                {selectedConv?.id === conv.id && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                                )}
                                <div className="flex justify-between items-start mb-1.5">
                                    <h3 className={`font-black text-sm truncate pr-2 flex items-center gap-1.5 ${selectedConv?.id === conv.id ? 'text-blue-400' : 'text-white'}`}>
                                        <button
                                            onClick={(e) => handleToggleStar(conv.id, conv.isStarred, e)}
                                            className={`transition-colors ${conv.isStarred ? 'text-[#C9A34E] hover:text-[#e0b961]' : 'text-white/20 hover:text-white/50'}`}
                                            title={conv.isStarred ? "Unstar" : "Star"}
                                        >
                                            <i className="fas fa-star text-[10px]"></i>
                                        </button>
                                        {getParticipantName(conv)}
                                    </h3>
                                    <span className="text-[9px] text-white/30 whitespace-nowrap font-bold">
                                        {new Date(conv.updated_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </span>
                                </div>
                                <p className="text-xs text-white/50 truncate font-medium pr-6 leading-relaxed">
                                    {conv.snippet}
                                </p>
                                <div className="flex items-center justify-between mt-1">
                                    <p className="text-[9px] text-white/30 truncate font-bold flex items-center gap-1.5">
                                        {/* Status dot — click to cycle: open → pending → closed → open */}
                                        {(() => {
                                            const s = conv.status || 'open';
                                            const next = { open: 'pending', pending: 'closed', closed: 'open' }[s];
                                            const color = { open: 'bg-emerald-500', pending: 'bg-amber-500', closed: 'bg-red-500/60' }[s];
                                            return (
                                                <button
                                                    onClick={(e) => handleStatusChange(conv.conversation_id, next, e)}
                                                    title={`Status: ${s} — click to set ${next}`}
                                                    className={`w-2 h-2 rounded-full flex-shrink-0 ${color} hover:ring-2 ring-white/30 transition-all`}
                                                />
                                            );
                                        })()}
                                        <i className="fas fa-headset text-blue-500/50"></i> {conv.agent || 'Unassigned'}
                                    </p>
                                    {conv.unread_count > 0 && (
                                        <span className="px-1.5 py-0.5 bg-rose-500 text-white text-[8px] font-black rounded-md">
                                            {conv.unread_count}
                                        </span>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {getCustomerTags(conv).map((tag, idx) => {
                                        const isPaid = tag.toLowerCase().includes('paid') || tag.includes('ชำระ') || tag.includes('โอน');
                                        return (
                                            <span key={idx} className={`text-[7px] px-1.5 py-0.5 rounded-md font-black uppercase tracking-wider border ${isPaid
                                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                                : 'bg-white/5 text-white/30 border-white/10'}`}>
                                                {tag}
                                            </span>
                                        );
                                    })}
                                </div>
                                {!conv.has_history && (
                                    <span className="absolute right-4 bottom-4 text-[8px] text-white/20 font-black uppercase tracking-tighter">
                                        Lead / Legacy
                                    </span>
                                )}
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Right Side: Chat Window */}
            {selectedConv ? (
                <div className="flex-1 flex flex-col bg-[#0f2440]/50 backdrop-blur-sm">
                    {/* Header */}
                    <div className="p-6 border-b border-white/5 flex items-center justify-between bg-[#0A1A2F]/80 backdrop-blur-md">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-black text-sm">
                                {getParticipantName(selectedConv).charAt(0)}
                            </div>
                            <div>
                                <h2 className="font-black text-lg text-white leading-none flex items-center gap-2">
                                    {getParticipantName(selectedConv)}
                                    <button
                                        onClick={() => handleToggleStar(selectedConv.id, selectedConv.isStarred)}
                                        className={`transition-colors flex items-center justify-center w-6 h-6 rounded-md hover:bg-white/10 ${selectedConv.isStarred ? 'text-[#C9A34E]' : 'text-white/20 hover:text-white/50'}`}
                                        title={selectedConv.isStarred ? "Unstar Chat" : "Star Chat"}
                                    >
                                        <i className="fas fa-star text-[14px]"></i>
                                    </button>
                                </h2>
                                <div className="flex items-center gap-3 mt-1.5">
                                    <p className="text-[9px] text-emerald-400 font-black uppercase tracking-[0.15em] flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                                        Messenger Active
                                    </p>
                                    <span className="text-[9px] text-white/20 font-bold border-l border-white/10 pl-3">
                                        {selectedConv.id}
                                    </span>
                                    <span className="text-[9px] text-blue-300/80 font-black uppercase tracking-wider border-l border-white/10 pl-3 flex items-center gap-1.5">
                                        <i className="fas fa-user-shield"></i>
                                        Agent: {selectedConv.agent || 'Unassigned'}
                                    </span>

                                    {/* Expose Extracted Senders explicitly to eliminate guesswork */}
                                    {(selectedConv.intelligence?.senders?.length > 0 || selectedConv.customer?.intelligence?.senders?.length > 0) && (
                                        <span className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-md flex items-center gap-1.5 shadow-sm">
                                            <i className="fas fa-users-cog text-[8px]"></i>
                                            {(selectedConv.intelligence?.senders || selectedConv.customer?.intelligence?.senders).join(', ')}
                                        </span>
                                    )}

                                    {(!selectedConv.agent || selectedConv.agent === 'Unassigned') && (
                                        <button
                                            onClick={() => handleAssignAgent(currentUser?.identities?.facebook?.name || currentUser?.facebookName || currentUser?.nickName || currentUser?.firstName || 'Me')}
                                            className="ml-4 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500/40 transition-all flex items-center gap-1.5"
                                        >
                                            <i className="fas fa-hand-paper"></i> Claim Chat
                                        </button>
                                    )}

                                    {/* Direct Facebook Business Suite Deep Link */}
                                    <a
                                        href={`https://business.facebook.com/latest/inbox/all?asset_id=113042456073167&selected_item_id=${(selectedConv.id || '').replace('t_', '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="ml-auto px-4 py-1.5 bg-[#1877F2]/10 text-[#1877F2] border border-[#1877F2]/30 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-[#1877F2]/20 hover:shadow-[0_0_10px_rgba(24,119,242,0.2)] transition-all flex items-center gap-2"
                                    >
                                        <i className="fab fa-facebook text-[11px]"></i> Open in Meta Suite
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Messages */}
                    <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                        {messages.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-white/20 px-12 text-center">
                                <div>
                                    <i className="fas fa-history text-4xl mb-4 opacity-20"></i>
                                    <p className="text-xs font-black uppercase tracking-[0.2em] mb-2">
                                        {selectedConv?.has_history ? 'Loading History...' : 'No Local History'}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            messages.map((msg, i) => {
                                const isMe = msg.from?.id && String(msg.from.id) === String(pageId);
                                const metadataAgent = msg.metadata?.agent_name;
                                const fromName = msg.from?.name;

                                let displayAgentName = isMe ? 'Admin' : (fromName || 'Customer');
                                if (isMe) {
                                    if (metadataAgent && !['The V School', 'Agent', 'Me', ''].includes(metadataAgent)) {
                                        displayAgentName = metadataAgent;
                                    } else if (fromName && !['The V School', 'Agent', 'Me', ''].includes(fromName)) {
                                        displayAgentName = fromName;
                                    } else if (selectedConv?.assignedAgent && !['Unassigned', 'The V School'].includes(selectedConv.assignedAgent)) {
                                        displayAgentName = selectedConv.assignedAgent;
                                    }
                                }

                                return (
                                    <div key={msg.id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[70%] p-3.5 rounded-2xl text-xs leading-relaxed font-medium shadow-xl backdrop-blur-sm ${isMe
                                            ? 'bg-blue-600/90 text-white rounded-tr-sm border border-blue-500/50'
                                            : 'bg-[#1e3a5f]/80 text-[#e2e8f0] rounded-tl-sm border border-white/10'
                                            }`}>
                                            {msg.message}
                                            {msg.attachments?.data?.map(att => (
                                                <div key={att.id} className="mt-2 rounded-lg overflow-hidden border border-white/10">
                                                    {(att.mime_type?.startsWith('image/') || att.image_data) ? (
                                                        <img src={att.local_path || att.image_data?.url || att.url} className="w-full h-48 object-cover" />
                                                    ) : (
                                                        <a href={att.file_url || att.url} target="_blank" className="p-2 bg-white/5 block text-[10px] text-blue-400">Download Attachment</a>
                                                    )}
                                                </div>
                                            ))}
                                            <div className={`flex items-center gap-1.5 mt-1.5 font-bold uppercase tracking-wider ${isMe ? 'text-blue-100' : 'text-slate-400'}`}>
                                                <span className="text-[10px] font-black">
                                                    {isMe ? displayAgentName : (msg.from?.name || 'Customer')}
                                                </span>
                                                <span className="text-[7px] opacity-40">•</span>
                                                <span className="text-[8px]">
                                                    {new Date(msg.created_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSend} className="p-6 bg-[#0A1A2F] border-t border-white/5 flex gap-4">
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Type a message..."
                            className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all font-medium"
                        />
                        <button type="submit" disabled={sending || !inputText.trim()} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest disabled:opacity-50">
                            {sending ? <i className="fas fa-circle-notch animate-spin"></i> : <i className="fas fa-paper-plane"></i>}
                        </button>
                    </form>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-white/30 bg-[#0f2440]/50">
                    <i className="fas fa-comments text-4xl mb-6"></i>
                    <h3 className="text-2xl font-black mb-2 text-white/80">Welcome to Inbox</h3>
                    <p className="text-xs">Select a conversation to start chatting</p>
                </div>
            )}

            {/* Right Sidebar: Customer Card */}
            {selectedConv && (
                <div className="w-72 border-l border-white/5 bg-[#060f1e] flex flex-col overflow-y-auto custom-scrollbar shrink-0">

                    {/* ── Profile Header ── */}
                    <div className="px-5 pt-6 pb-5 border-b border-white/5 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-500/20 text-2xl font-black text-white select-none">
                            {getParticipantName(selectedConv).charAt(0)}
                        </div>
                        <h3 className="font-black text-white text-sm leading-tight">{getParticipantName(selectedConv)}</h3>
                        <p className="text-[9px] text-white/25 font-mono mt-1 truncate px-2">
                            {selectedConv.customer?.customer_id || selectedConv.participant_id || '—'}
                        </p>
                        <div className="flex justify-center gap-1.5 mt-3 flex-wrap">
                            {selectedConv.customer?.profile?.membership_tier && (
                                <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${
                                    selectedConv.customer.profile.membership_tier === 'GOLD'
                                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                        : selectedConv.customer.profile.membership_tier === 'SILVER'
                                        ? 'bg-slate-400/20 text-slate-300 border-slate-400/30'
                                        : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                }`}>{selectedConv.customer.profile.membership_tier}</span>
                            )}
                            {selectedConv.customer?.profile?.lifecycle_stage && (
                                <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${
                                    selectedConv.customer.profile.lifecycle_stage === 'Customer'
                                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                        : selectedConv.customer.profile.lifecycle_stage === 'Lead'
                                        ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                                        : 'bg-white/5 text-white/40 border-white/10'
                                }`}>{selectedConv.customer.profile.lifecycle_stage}</span>
                            )}
                            {!selectedConv.customer && (
                                <span className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border bg-orange-500/20 text-orange-400 border-orange-500/30">New Lead</span>
                            )}
                        </div>
                    </div>

                    {/* ── Contact Info ── */}
                    <div className="px-5 py-4 border-b border-white/5 space-y-2">
                        <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] mb-2">Contact</p>
                        {selectedConv.customer?.contact_info?.phone && (
                            <div className="flex items-center gap-2.5">
                                <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                                    <i className="fas fa-phone text-[9px] text-white/40"></i>
                                </div>
                                <span className="text-[11px] text-white/70 font-bold">{selectedConv.customer.contact_info.phone}</span>
                            </div>
                        )}
                        {selectedConv.customer?.contact_info?.email && (
                            <div className="flex items-center gap-2.5">
                                <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                                    <i className="fas fa-envelope text-[9px] text-white/40"></i>
                                </div>
                                <span className="text-[11px] text-white/60 truncate">{selectedConv.customer.contact_info.email}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2.5">
                            <div className="w-6 h-6 rounded-lg bg-[#1877F2]/10 flex items-center justify-center shrink-0">
                                <i className="fab fa-facebook text-[9px] text-[#1877F2]"></i>
                            </div>
                            <span className="text-[10px] text-white/35 font-mono truncate">
                                {selectedConv.customer?.contact_info?.facebook_id || selectedConv.participant_id || '—'}
                            </span>
                        </div>
                        {(selectedConv.intelligence?.senders?.length > 0 || selectedConv.customer?.intelligence?.senders?.length > 0) && (
                            <div className="flex items-start gap-2.5 mt-1">
                                <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
                                    <i className="fas fa-users-cog text-[8px] text-blue-400"></i>
                                </div>
                                <span className="text-[9px] text-blue-400 font-black leading-tight">
                                    {(selectedConv.intelligence?.senders || selectedConv.customer?.intelligence?.senders).join(', ')}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* ── Labels / Tags ── */}
                    {getCustomerTags(selectedConv).length > 0 && (
                        <div className="px-5 py-4 border-b border-white/5">
                            <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] mb-2.5 flex items-center gap-1.5">
                                <i className="fas fa-tags text-blue-500 text-[9px]"></i> Labels
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {getCustomerTags(selectedConv).map((tag, idx) => {
                                    const isPaid = tag.toLowerCase().includes('paid') || tag.includes('ชำระ') || tag.includes('โอน');
                                    return (
                                        <span key={idx} className={`px-2 py-0.5 rounded-md text-[8px] font-black border uppercase tracking-wider flex items-center gap-1 ${isPaid ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-white/5 text-white/35 border-white/10'}`}>
                                            {isPaid && <i className="fas fa-check-circle text-[7px]"></i>}{tag}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ── Ad Attribution ── */}
                    {(loadingAd || activeAd) && (
                        <div className="px-5 py-4 border-b border-white/5">
                            <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] mb-2.5 flex items-center gap-1.5">
                                <i className="fas fa-ad text-indigo-400 text-[9px]"></i> Ad Attribution
                            </p>
                            {loadingAd ? (
                                <div className="h-14 bg-white/5 rounded-xl flex items-center justify-center">
                                    <i className="fas fa-circle-notch animate-spin text-indigo-500/50"></i>
                                </div>
                            ) : (
                                <div className="bg-[#0d1e36] rounded-xl border border-indigo-500/20 overflow-hidden">
                                    {activeAd.thumbnail && (
                                        <img src={activeAd.thumbnail} alt={activeAd.name} className="w-full h-20 object-cover" />
                                    )}
                                    <div className="p-3 space-y-1">
                                        <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Campaign</p>
                                        <p className="text-[10px] font-black text-white line-clamp-2 leading-tight">{activeAd.campaign_name || 'Direct Message'}</p>
                                        <p className="text-[9px] text-slate-400 truncate">{activeAd.name}</p>
                                        <span className={`inline-block mt-1 text-[7px] font-black px-1.5 py-0.5 rounded border uppercase tracking-widest ${activeAd.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-white/5 text-white/30 border-white/10'}`}>
                                            {activeAd.status}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Courses Owned ── */}
                    {selectedConv.customer?.inventory?.learning_courses?.length > 0 && (
                        <div className="px-5 py-4 border-b border-white/5">
                            <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] mb-2.5 flex items-center gap-1.5">
                                <i className="fas fa-graduation-cap text-amber-500 text-[9px]"></i> Courses Owned
                            </p>
                            <div className="space-y-1.5">
                                {selectedConv.customer.inventory.learning_courses.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between px-3 py-2 bg-white/5 rounded-xl border border-white/10">
                                        <p className="text-[10px] font-black text-white flex-1 mr-2 truncate">{item.name}</p>
                                        <span className="text-[7px] font-black px-1.5 py-0.5 rounded border bg-blue-500/20 text-blue-400 border-blue-500/30 shrink-0 uppercase">{item.status || 'Active'}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── AI Product Detect ── */}
                    <div className="px-5 py-4 border-b border-white/5">
                        <div className="flex justify-between items-center mb-2.5">
                            <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] flex items-center gap-1.5">
                                <i className="fas fa-search-dollar text-purple-400 text-[9px]"></i> AI Detect
                            </p>
                            <button onClick={handleDiscoverProducts} disabled={isAnalyzing}
                                className="text-[8px] font-black text-purple-400 uppercase tracking-widest hover:text-purple-300 transition-all flex items-center gap-1 disabled:opacity-50">
                                {isAnalyzing ? <i className="fas fa-circle-notch animate-spin"></i> : <i className="fas fa-magic"></i>}
                                {isAnalyzing ? 'Scanning...' : 'Scan'}
                            </button>
                        </div>
                        <div className="space-y-2">
                            {discoveredProducts.length === 0 && !isAnalyzing && (
                                <p className="text-[9px] text-white/15 italic text-center py-3 border border-dashed border-white/5 rounded-xl">Scan to detect interests</p>
                            )}
                            {discoveredProducts.map((p, i) => (
                                <div key={i} className="p-2.5 bg-purple-500/5 rounded-xl border border-purple-500/15">
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                        <p className="text-[10px] font-black text-white leading-tight flex-1">{p.product_name}</p>
                                        {p.exists
                                            ? <span className="text-[7px] font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 shrink-0">In Store</span>
                                            : <button onClick={() => handleAddToStore(p)} className="text-[7px] font-black text-purple-400 border border-purple-500/30 px-1.5 py-0.5 rounded hover:bg-purple-500/20 shrink-0">+ Add</button>
                                        }
                                    </div>
                                    <p className="text-[9px] text-purple-400 font-bold">{Number(p.price).toLocaleString()} THB</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── Actions ── */}
                    <div className="px-5 py-4 space-y-2 mt-auto">
                        <button
                            onClick={() => {
                                if (onViewCustomer) {
                                    if (selectedConv.customer) {
                                        onViewCustomer(selectedConv.customer);
                                    } else {
                                        const fbData = selectedConv.participants?.data?.[0] || {};
                                        onViewCustomer({ customer_id: 'NEW_LEAD_' + (fbData.id || Date.now()), profile: { first_name: fbData.name || 'Unknown', last_name: '', status: 'Lead', membership_tier: 'GUEST', lifecycle_stage: 'Lead' }, contact_info: { facebook_id: fbData.id }, isTemporary: true });
                                    }
                                }
                            }}
                            className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                        >
                            <i className="fas fa-id-card"></i> View Full Profile
                        </button>
                        <a
                            href={`https://business.facebook.com/latest/inbox/all?selected_item_id=${(selectedConv.id || '').replace('t_', '')}`}
                            target="_blank" rel="noopener noreferrer"
                            className="w-full py-2.5 bg-[#1877F2]/10 hover:bg-[#1877F2]/20 text-[#1877F2] border border-[#1877F2]/20 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                        >
                            <i className="fab fa-facebook"></i> Open in Meta Suite
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
}
