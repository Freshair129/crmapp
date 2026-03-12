'use client';

import React from 'react';
import { Search, Moon, Sun, Bell } from 'lucide-react';

/**
 * TopBar Component — Global Navigation Header
 * Features: Global Search, Language Toggle (TH/EN), Theme Toggle (Light/Dark)
 */
export default function TopBar({ 
    language = 'TH', 
    setLanguage, 
    theme = 'dark', 
    setTheme,
    userName = 'User'
}) {
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
            <div className="flex items-center gap-6">
                {/* Language Switcher */}
                <div className="flex bg-white/5 border border-white/10 p-1 rounded-xl">
                    <button 
                        onClick={() => setLanguage('TH')}
                        className={`px-3 py-1 rounded-lg text-[10px] font-black tracking-widest transition-all ${
                            language === 'TH' ? 'bg-[#C9A34E] text-[#0A1A2F]' : 'text-white/40 hover:text-white'
                        }`}
                    >
                        TH
                    </button>
                    <button 
                        onClick={() => setLanguage('EN')}
                        className={`px-3 py-1 rounded-lg text-[10px] font-black tracking-widest transition-all ${
                            language === 'EN' ? 'bg-[#C9A34E] text-[#0A1A2F]' : 'text-white/40 hover:text-white'
                        }`}
                    >
                        ENG
                    </button>
                </div>

                {/* Theme Switcher */}
                <button 
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-[#C9A34E] hover:bg-white/10 transition-all group"
                    title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                    {theme === 'dark'
                        ? <Moon size={16} className="group-hover:rotate-12 transition-transform" />
                        : <Sun  size={16} className="group-hover:rotate-12 transition-transform" />
                    }
                </button>

                {/* Notification Bell (Mini Indicator) */}
                <button className="relative w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all">
                    <Bell size={16} />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[#0A1A2F]" />
                </button>

                {/* Vertical Divider */}
                <div className="h-6 w-px bg-white/10" />

                {/* User Greeting (Optional short version) */}
                <div className="hidden lg:flex flex-col items-end">
                    <span className="text-[10px] font-black text-[#C9A34E] uppercase tracking-widest leading-none mb-1">Welcome back,</span>
                    <span className="text-xs font-black text-white italic tracking-tight">{userName}</span>
                </div>
            </div>
        </header>
    );
}
