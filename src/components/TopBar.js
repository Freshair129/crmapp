'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, Moon, Sun, Bell, LogOut, User, Shield, Clock, ChevronDown } from 'lucide-react';

const ROLE_LABEL = {
    DEVELOPER:  { th: 'Developer',   color: 'text-purple-400',  bg: 'bg-purple-500/10 border-purple-500/20' },
    ADMIN:      { th: 'Admin',        color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20' },
    MANAGER:    { th: 'Manager',      color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20' },
    MARKETING:  { th: 'Marketing',    color: 'text-pink-400',    bg: 'bg-pink-500/10 border-pink-500/20' },
    HEAD_CHEF:  { th: 'Head Chef',    color: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/20' },
    EMPLOYEE:   { th: 'Employee',     color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    AGENT:      { th: 'Agent',        color: 'text-green-400',   bg: 'bg-green-500/10 border-green-500/20' },
    GUEST:      { th: 'Demo / Guest', color: 'text-yellow-400',  bg: 'bg-yellow-500/10 border-yellow-500/20' },
};

function formatLoginTime(iso) {
    if (!iso) return '—';
    try {
        return new Intl.DateTimeFormat('th-TH', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        }).format(new Date(iso));
    } catch {
        return iso;
    }
}

function UserAvatar({ firstName, lastName, size = 'sm' }) {
    const initials = `${(firstName || 'U')[0]}${(lastName || '')[0] || ''}`.toUpperCase();
    const sizeClass = size === 'sm' ? 'w-7 h-7 text-[9px]' : 'w-9 h-9 text-[10px]';
    return (
        <div className={`${sizeClass} rounded-lg bg-[#C9A34E]/10 border border-[#C9A34E]/30 flex items-center justify-center font-black text-[#C9A34E] select-none shrink-0`}>
            {initials || <User size={12} />}
        </div>
    );
}

export default function TopBar({
    language = 'TH',
    setLanguage,
    theme = 'dark',
    setTheme,
    currentUser = null,
    onLogout,
}) {
    const [profileOpen, setProfileOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        function handleClick(e) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setProfileOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const role = currentUser?.role || 'GUEST';
    const roleInfo = ROLE_LABEL[role] || ROLE_LABEL.GUEST;
    const displayName = currentUser?.nickName
        || currentUser?.firstName
        || currentUser?.name?.split(' ')[0]
        || 'User';
    const fullName = (currentUser?.firstName && currentUser?.lastName)
        ? `${currentUser.firstName} ${currentUser.lastName}`
        : currentUser?.name || 'User';

    return (
        <header className="sticky top-0 z-[90] w-full bg-[#0A1A2F]/90 backdrop-blur-xl border-b border-white/[0.06] flex items-center justify-between px-4 h-10 shrink-0 transition-all">

            {/* ── Left: Logo breadcrumb ─────────────────────────────── */}
            <div className="flex items-center gap-2 shrink-0">
                {/* V logo badge */}
                <div className="w-6 h-6 rounded-md bg-[#C9A34E] flex items-center justify-center text-[#0A1A2F] font-black text-xs shadow-sm shadow-[#C9A34E]/30 shrink-0">
                    V
                </div>
                <span className="text-white/70 text-[11px] font-semibold hidden sm:block">V School CRM</span>
                <span className="text-white/20 text-[10px] hidden sm:block">/</span>
                <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md border ${roleInfo.bg} ${roleInfo.color} hidden sm:block`}>
                    {roleInfo.th}
                </span>
            </div>

            {/* ── Center: Search ────────────────────────────────────── */}
            <div className="flex-1 max-w-xs mx-4 relative group">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-white/20 group-focus-within:text-[#C9A34E] transition-colors">
                    <Search size={12} />
                </div>
                <input
                    type="text"
                    placeholder={language === 'TH' ? 'ค้นหา...' : 'Search...'}
                    className="w-full bg-white/5 border border-white/8 rounded-lg py-1 pl-8 pr-3 text-[11px] text-white placeholder:text-white/20 focus:outline-none focus:border-[#C9A34E]/40 focus:bg-white/8 transition-all"
                />
            </div>

            {/* ── Right: Controls ──────────────────────────────────── */}
            <div className="flex items-center gap-1 shrink-0">

                {/* Language Switcher */}
                <div className="flex bg-white/5 border border-white/8 p-0.5 rounded-lg mr-1">
                    <button
                        onClick={() => setLanguage('TH')}
                        className={`px-2 py-0.5 rounded-md text-[9px] font-black tracking-widest transition-all ${
                            language === 'TH' ? 'bg-[#C9A34E] text-[#0A1A2F]' : 'text-white/30 hover:text-white'
                        }`}
                    >TH</button>
                    <button
                        onClick={() => setLanguage('EN')}
                        className={`px-2 py-0.5 rounded-md text-[9px] font-black tracking-widest transition-all ${
                            language === 'EN' ? 'bg-[#C9A34E] text-[#0A1A2F]' : 'text-white/30 hover:text-white'
                        }`}
                    >EN</button>
                </div>

                {/* Theme toggle */}
                <button
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="w-7 h-7 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center text-white/30 hover:text-[#C9A34E] hover:bg-white/10 transition-all"
                    title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
                >
                    {theme === 'dark' ? <Moon size={12} /> : <Sun size={12} />}
                </button>

                {/* Bell */}
                <button className="relative w-7 h-7 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center text-white/30 hover:text-white transition-all">
                    <Bell size={12} />
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full border border-[#0A1A2F]" />
                </button>

                {/* Divider */}
                <div className="h-4 w-px bg-white/10 mx-1" />

                {/* User profile */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setProfileOpen(v => !v)}
                        className="flex items-center gap-2 hover:bg-white/5 rounded-lg px-1.5 py-1 transition-all"
                    >
                        <UserAvatar firstName={currentUser?.firstName} lastName={currentUser?.lastName} size="sm" />
                        <div className="hidden md:flex flex-col items-start leading-none">
                            <span className="text-[11px] font-bold text-white">{displayName}</span>
                        </div>
                        <ChevronDown size={10} className={`text-white/30 transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown */}
                    {profileOpen && (
                        <div className="absolute right-0 top-[calc(100%+6px)] w-64 bg-[#0A1A2F] border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden z-50">
                            {/* Header */}
                            <div className="p-4 border-b border-white/5 flex items-center gap-3">
                                <UserAvatar firstName={currentUser?.firstName} lastName={currentUser?.lastName} size="md" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-black text-white truncate">{fullName}</p>
                                    <p className="text-[10px] text-white/40 truncate">{currentUser?.email}</p>
                                </div>
                            </div>
                            {/* Info rows */}
                            <div className="p-3 space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-white/40">
                                        <Shield size={11} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Role</span>
                                    </div>
                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border ${roleInfo.bg} ${roleInfo.color}`}>
                                        {roleInfo.th}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-white/40">
                                        <User size={11} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">ID</span>
                                    </div>
                                    <span className="text-[10px] font-mono text-white/60">{currentUser?.employeeId || '—'}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-white/40">
                                        <Clock size={11} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Login</span>
                                    </div>
                                    <span className="text-[10px] text-white/40 text-right max-w-[140px]">
                                        {formatLoginTime(currentUser?.lastLoginAt)}
                                    </span>
                                </div>
                            </div>
                            {/* Logout */}
                            <div className="p-2.5 border-t border-white/5">
                                <button
                                    onClick={() => { setProfileOpen(false); onLogout?.(); }}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
                                >
                                    <LogOut size={11} />
                                    ออกจากระบบ
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
