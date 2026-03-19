'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, Moon, Sun, Bell, LogOut, User, Shield, Clock, ChevronDown } from 'lucide-react';

const ROLE_LABEL = {
    DEVELOPER:  { th: 'Developer',   color: 'text-purple-400',  bg: 'bg-purple-500/10 border-purple-500/20' },
    ADMIN:      { th: 'Admin',        color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20' },
    MANAGER:    { th: 'Manager',      color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20' },
    SUPERVISOR: { th: 'Supervisor',   color: 'text-cyan-400',    bg: 'bg-cyan-500/10 border-cyan-500/20' },
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

function UserAvatar({ firstName, lastName, size = 'md' }) {
    const initials = `${(firstName || 'U')[0]}${(lastName || '')[0] || ''}`.toUpperCase();
    const sizeClass = size === 'sm' ? 'w-8 h-8 text-[10px]' : 'w-10 h-10 text-xs';
    return (
        <div className={`${sizeClass} rounded-xl bg-[#C9A34E]/10 border border-[#C9A34E]/30 flex items-center justify-center font-black text-[#C9A34E] select-none`}>
            {initials || <User size={14} />}
        </div>
    );
}

/**
 * TopBar Component — Global Navigation Header
 * Features: Global Search, Language Toggle, Theme Toggle, User Profile Dropdown
 */
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

    // Close dropdown on outside click
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
    const displayName = currentUser?.nickName || currentUser?.firstName || 'User';
    const fullName = [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(' ') || 'User';

    return (
        <header className="sticky top-0 z-[90] w-full bg-[#0A1A2F]/80 backdrop-blur-xl border-b border-white/5 py-4 px-8 flex items-center justify-between transition-all">
            {/* Left: Global Search */}
            <div className="flex-1 max-w-md relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-white/20 group-focus-within:text-[#C9A34E] transition-colors">
                    <Search size={14} />
                </div>
                <input
                    type="text"
                    placeholder={language === 'TH' ? 'ค้นหาข้อมูล...' : 'Search everything...'}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-2.5 pl-11 pr-4 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-[#C9A34E]/50 focus:bg-white/10 transition-all"
                />
            </div>

            {/* Right: Controls */}
            <div className="flex items-center gap-4">
                {/* Language Switcher */}
                <div className="flex bg-white/5 border border-white/10 p-1 rounded-xl">
                    <button
                        onClick={() => setLanguage('TH')}
                        className={`px-3 py-1 rounded-lg text-[10px] font-black tracking-widest transition-all ${
                            language === 'TH' ? 'bg-[#C9A34E] text-[#0A1A2F]' : 'text-white/40 hover:text-white'
                        }`}
                    >TH</button>
                    <button
                        onClick={() => setLanguage('EN')}
                        className={`px-3 py-1 rounded-lg text-[10px] font-black tracking-widest transition-all ${
                            language === 'EN' ? 'bg-[#C9A34E] text-[#0A1A2F]' : 'text-white/40 hover:text-white'
                        }`}
                    >EN</button>
                </div>

                {/* Theme Switcher */}
                <button
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-[#C9A34E] hover:bg-white/10 transition-all group"
                    title={theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
                >
                    {theme === 'dark'
                        ? <Moon size={16} className="group-hover:rotate-12 transition-transform" />
                        : <Sun  size={16} className="group-hover:rotate-12 transition-transform" />
                    }
                </button>

                {/* Notification Bell */}
                <button className="relative w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all">
                    <Bell size={16} />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[#0A1A2F]" />
                </button>

                {/* Divider */}
                <div className="h-6 w-px bg-white/10" />

                {/* ── User Profile Button + Dropdown ── */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setProfileOpen(v => !v)}
                        className="flex items-center gap-3 hover:bg-white/5 rounded-2xl px-2 py-1 transition-all group"
                    >
                        <UserAvatar firstName={currentUser?.firstName} lastName={currentUser?.lastName} />
                        <div className="hidden lg:flex flex-col items-start">
                            <span className="text-xs font-black text-white italic tracking-tight leading-none">{displayName}</span>
                            <span className={`text-[9px] font-black uppercase tracking-widest mt-0.5 ${roleInfo.color}`}>{roleInfo.th}</span>
                        </div>
                        <ChevronDown size={12} className={`text-white/30 transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown Panel */}
                    {profileOpen && (
                        <div className="absolute right-0 top-[calc(100%+10px)] w-72 bg-[#0A1A2F] border border-white/10 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden z-50 animate-fade-in">

                            {/* Header */}
                            <div className="p-5 border-b border-white/5 flex items-center gap-4">
                                <UserAvatar firstName={currentUser?.firstName} lastName={currentUser?.lastName} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-black text-white truncate">{fullName}</p>
                                    <p className="text-[10px] text-white/40 truncate">{currentUser?.email}</p>
                                </div>
                            </div>

                            {/* Info rows */}
                            <div className="p-4 space-y-3">
                                {/* Role badge */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-white/40">
                                        <Shield size={12} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Role</span>
                                    </div>
                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${roleInfo.bg} ${roleInfo.color}`}>
                                        {roleInfo.th}
                                    </span>
                                </div>

                                {/* Employee ID */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-white/40">
                                        <User size={12} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">ID</span>
                                    </div>
                                    <span className="text-[10px] font-mono text-white/60">{currentUser?.employeeId || '—'}</span>
                                </div>

                                {/* Last Login */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-white/40">
                                        <Clock size={12} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Login</span>
                                    </div>
                                    <span className="text-[10px] text-white/40 text-right max-w-[150px]">
                                        {formatLoginTime(currentUser?.lastLoginAt)}
                                    </span>
                                </div>
                            </div>

                            {/* Logout */}
                            <div className="p-3 border-t border-white/5">
                                <button
                                    onClick={() => { setProfileOpen(false); onLogout?.(); }}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
                                >
                                    <LogOut size={12} />
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
