'use client';

import { useState, useEffect } from 'react';
import {
    PieChart, Brain, ShoppingCart, Package, History,
    Users, MessageCircle, MessageSquare, Megaphone,
    Crosshair, TrendingUp, Bell, UserCircle, Settings2,
    Timer, SlidersHorizontal, Settings, LogOut,
    ChefHat, Monitor, CalendarDays, BookOpen, Gift, BookMarked, Bot,
    PanelLeftOpen, PanelLeftClose, MousePointer2, ClipboardList, Warehouse, FileCheck,
} from 'lucide-react';
import { can } from '@/lib/permissionMatrix';

const menuGroups = [
    {
        label: 'OVERVIEW',
        items: [
            { id: 'dashboard',           icon: PieChart,          label: 'Dashboard' },
            { id: 'executive-analytics', icon: Brain,             label: 'BI Engine' },
        ],
    },
    {
        label: 'SALES',
        items: [
            { id: 'pos-system',          icon: ShoppingCart,      label: 'Premium POS' },
            { id: 'inventory-manager',   icon: Package,           label: 'Catalog Manager' },
            { id: 'audit-trail',         icon: History,           label: 'Audit Trail' },
        ],
    },
    {
        label: 'CRM',
        items: [
            { id: 'customers',           icon: Users,             label: 'Customers 360' },
            { id: 'facebook-chat',       icon: MessageCircle,     label: 'Unified Inbox' },
            { id: 'line-connect',        icon: MessageSquare,     label: 'LINE Connect' },
        ],
    },
    {
        label: 'MARKETING',
        items: [
            { id: 'facebook-ads',        icon: Megaphone,         label: 'Facebook Ads' },
            { id: 'campaign-tracking',   icon: Crosshair,         label: 'Campaign Tracking' },
            { id: 'analytics',           icon: TrendingUp,        label: 'Analytics' },
            { id: 'notification-rules',  icon: Bell,              label: 'Notification Center' },
        ],
    },
    {
        label: 'OPERATIONS',
        items: [
            { id: 'courses',             icon: BookMarked,        label: 'คอร์สเรียน' },
            { id: 'schedules',           icon: CalendarDays,      label: 'ตารางคลาส' },
            { id: 'recipes',             icon: BookOpen,          label: 'เมนูสูตร' },
            { id: 'packages',            icon: Gift,              label: 'แพ็กเกจ' },
            { id: 'kitchen-stock',       icon: ChefHat,           label: 'สต็อกครัว' },
            { id: 'inventory-control',   icon: Warehouse,         label: 'คลังสินค้า' },
            { id: 'procurement',         icon: FileCheck,         label: 'จัดซื้อ' },
            { id: 'assets',              icon: Monitor,           label: 'อุปกรณ์' },
        ],
    },
    {
        label: 'HR',
        items: [
            { id: 'employees',           icon: UserCircle,        label: 'Employees' },
            { id: 'tasks',               icon: ClipboardList,     label: 'Task Board' },
            { id: 'team-kpi',            icon: Settings2,         label: 'Team KPI' },
            { id: 'admin-performance',   icon: Timer,             label: 'Admin Perf.' },
        ],
    },
    {
        label: 'SYSTEM',
        items: [
            { id: 'ai-config',           icon: Bot,               label: 'AI Reply Config' },
            { id: 'system-config',       icon: SlidersHorizontal, label: 'System Config' },
            { id: 'settings',            icon: Settings,          label: 'Legacy Settings' },
        ],
    },
];

// ── Sidebar width config ──────────────────────────────────────────────────────
const SIDEBAR_COLLAPSED_W = 72;   // px — icon-only
const SIDEBAR_EXPANDED_W  = 220;  // px — icon + label

const MODE_META = {
    expanded: { icon: PanelLeftOpen,  label: 'Expanded',       title: 'Always expanded' },
    collapsed: { icon: PanelLeftClose, label: 'Collapsed',      title: 'Always collapsed' },
    hover:    { icon: MousePointer2,  label: 'Expand on hover', title: 'Expand on hover' },
};

export default function Sidebar({ activeView, onViewChange, cartCount, pendingTaskCount, currentUser, onLogout }) {
    const userName = currentUser?.firstName || currentUser?.profile?.first_name || 'User';
    const userRole = currentUser?.role || currentUser?.profile?.role || 'Guest';

    // ── Sidebar mode state — persisted to localStorage ─────────────────────
    const [sidebarMode, setSidebarMode] = useState('hover'); // expanded | collapsed | hover
    const [isHovered, setIsHovered]     = useState(false);
    const [modeMenuOpen, setModeMenuOpen] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('sidebarMode');
        if (saved && ['expanded', 'collapsed', 'hover'].includes(saved)) {
            setSidebarMode(saved);
        }
    }, []);

    const setMode = (mode) => {
        setSidebarMode(mode);
        localStorage.setItem('sidebarMode', mode);
        setModeMenuOpen(false);
        if (mode !== 'hover') setIsHovered(false);
    };

    // Effective "open" state
    const isOpen = sidebarMode === 'expanded'
        || (sidebarMode === 'hover' && isHovered);

    const sidebarW = isOpen ? SIDEBAR_EXPANDED_W : SIDEBAR_COLLAPSED_W;

    const handleMouseEnter = () => { if (sidebarMode === 'hover') setIsHovered(true); };
    const handleMouseLeave = () => { if (sidebarMode === 'hover') setIsHovered(false); setModeMenuOpen(false); };

    const ModeIcon = MODE_META[sidebarMode]?.icon || PanelLeftClose;

    return (
        <aside
            style={{
                width: sidebarW,
                minWidth: sidebarW,
                transition: 'width 180ms cubic-bezier(0.4, 0, 0.2, 1), min-width 180ms cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="bg-[#0c1a2f] border-r border-white/5 flex flex-col h-screen shrink-0 sticky top-0 z-[100] overflow-x-hidden overflow-y-hidden select-none"
        >
            {/* ── Client Identity ───────────────────────────────────────── */}
            <div className="h-10 flex items-center border-b border-white/5 shrink-0 px-4 gap-2">
                {/* Collapsed: show abbreviated client ID */}
                <span
                    className="text-[#cc9d37] font-black text-[10px] uppercase tracking-[0.18em] whitespace-nowrap shrink-0"
                    style={{
                        opacity: isOpen ? 0 : 1,
                        maxWidth: isOpen ? 0 : 40,
                        transition: 'opacity 120ms, max-width 180ms cubic-bezier(0.4,0,0.2,1)',
                        overflow: 'hidden',
                    }}
                >
                    TVS
                </span>
                {/* Expanded: full client name + ID */}
                <div
                    className="flex flex-col justify-center overflow-hidden"
                    style={{
                        opacity: isOpen ? 1 : 0,
                        maxWidth: isOpen ? 200 : 0,
                        transition: 'opacity 140ms, max-width 180ms cubic-bezier(0.4,0,0.2,1)',
                    }}
                >
                    <span className="text-[#cc9d37] font-black text-[11px] tracking-[0.1em] whitespace-nowrap leading-none">
                        The V School
                    </span>
                    <span className="text-white/25 font-mono text-[8px] tracking-widest whitespace-nowrap leading-none mt-0.5">
                        {process.env.NEXT_PUBLIC_CLIENT_ID || 'TVS-001'}
                    </span>
                </div>
            </div>

            {/* ── Navigation ────────────────────────────────────────────── */}
            <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden flex flex-col gap-0 custom-scrollbar">
                {menuGroups.map((group, groupIndex) => (
                    <div key={groupIndex} className="flex flex-col">
                        {/* Group label */}
                        {isOpen && (
                            <div
                                className="px-4 pt-3 pb-1"
                                style={{
                                    opacity: isOpen ? 0.4 : 0,
                                    transition: 'opacity 100ms',
                                }}
                            >
                                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/40">
                                    {group.label}
                                </span>
                            </div>
                        )}
                        {!isOpen && groupIndex > 0 && (
                            <div className="mx-auto w-5 h-px bg-white/10 my-1.5" />
                        )}

                        {group.items.map((item) => {
                            const isActive = activeView === item.id;
                            const Icon = item.icon;
                            const canAccess = item.id === 'analytics'
                                ? can(currentUser?.role || 'GUEST', 'business', 'view')
                                : true;

                            if (!canAccess) return null;

                            return (
                                <div key={item.id} className="relative group/item">
                                    <button
                                        onClick={() => onViewChange(item.id)}
                                        className={`relative flex items-center gap-3 h-9 my-px rounded-xl transition-all duration-150 ${
                                            isActive
                                                ? 'bg-[#cc9d37]/12 text-[#cc9d37]'
                                                : 'text-white/40 hover:text-white hover:bg-white/5'
                                        }`}
                                        style={{
                                            width: isOpen ? `calc(100% - 16px)` : 40,
                                            marginLeft: isOpen ? 8 : 'auto',
                                            marginRight: isOpen ? 8 : 'auto',
                                            paddingLeft: isOpen ? 10 : 0,
                                            paddingRight: isOpen ? 10 : 0,
                                            justifyContent: isOpen ? 'flex-start' : 'center',
                                            transition: 'width 180ms cubic-bezier(0.4,0,0.2,1), margin 180ms, padding 180ms',
                                        }}
                                        title={!isOpen ? item.label : undefined}
                                    >
                                        {/* Active indicator */}
                                        {isActive && (
                                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#cc9d37] rounded-r-full" />
                                        )}

                                        <Icon size={16} className="shrink-0" />

                                        {/* Label */}
                                        <span
                                            className="text-[11px] font-semibold whitespace-nowrap overflow-hidden"
                                            style={{
                                                opacity: isOpen ? 1 : 0,
                                                maxWidth: isOpen ? 160 : 0,
                                                transition: 'opacity 120ms, max-width 180ms',
                                            }}
                                        >
                                            {item.label}
                                        </span>

                                        {/* Badges */}
                                        {item.id === 'tasks' && pendingTaskCount > 0 && (
                                            <span className={`${isOpen ? 'ml-auto' : 'absolute -top-1 -right-1'} w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[8px] font-black shrink-0`}>
                                                {pendingTaskCount > 9 ? '9+' : pendingTaskCount}
                                            </span>
                                        )}
                                    </button>

                                    {/* Tooltip — collapsed only */}
                                    {!isOpen && (
                                        <div className="pointer-events-none absolute left-full ml-2 top-1/2 -translate-y-1/2 z-[200] opacity-0 group-hover/item:opacity-100 transition-opacity duration-100 whitespace-nowrap">
                                            <div className="bg-[#0c1a2f] border border-white/10 text-white text-[10px] font-bold uppercase tracking-widest px-2.5 py-1.5 rounded-lg shadow-xl">
                                                {item.label}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </nav>

            {/* ── Bottom: User + Mode control ───────────────────────────── */}
            <div className="border-t border-white/5 shrink-0 py-2 flex flex-col gap-1">

                {/* User row */}
                <div
                    className="flex items-center gap-3 px-3 py-1.5 group/user cursor-default relative"
                >
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#cc9d37] to-amber-600 flex items-center justify-center border border-white/10 shrink-0">
                        <span className="text-white font-black text-[11px]">{(userName || 'U').charAt(0)}</span>
                    </div>
                    <span
                        className="text-[11px] font-semibold text-white/60 whitespace-nowrap overflow-hidden flex-1"
                        style={{
                            opacity: isOpen ? 1 : 0,
                            maxWidth: isOpen ? 120 : 0,
                            transition: 'opacity 120ms, max-width 180ms',
                        }}
                    >
                        {userName}
                        <span className="text-[9px] text-white/30 ml-1">{userRole}</span>
                    </span>

                    {/* Tooltip when collapsed */}
                    {!isOpen && (
                        <div className="pointer-events-none absolute left-full ml-2 top-1/2 -translate-y-1/2 z-[200] opacity-0 group-hover/user:opacity-100 transition-opacity duration-100 whitespace-nowrap">
                            <div className="bg-[#0c1a2f] border border-white/10 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg shadow-xl">
                                {userName} · {userRole}
                            </div>
                        </div>
                    )}
                </div>

                {/* Logout */}
                <div className="relative group/logout">
                    <button
                        onClick={onLogout}
                        style={{
                            width: isOpen ? `calc(100% - 16px)` : 40,
                            marginLeft: isOpen ? 8 : 'auto',
                            marginRight: isOpen ? 8 : 'auto',
                            paddingLeft: isOpen ? 10 : 0,
                            paddingRight: isOpen ? 10 : 0,
                            justifyContent: isOpen ? 'flex-start' : 'center',
                            transition: 'width 180ms cubic-bezier(0.4,0,0.2,1), margin 180ms, padding 180ms',
                        }}
                        className="flex items-center gap-3 h-8 rounded-xl text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    >
                        <LogOut size={14} className="shrink-0" />
                        <span
                            className="text-[11px] font-semibold whitespace-nowrap overflow-hidden"
                            style={{
                                opacity: isOpen ? 1 : 0,
                                maxWidth: isOpen ? 120 : 0,
                                transition: 'opacity 120ms, max-width 180ms',
                            }}
                        >
                            ออกจากระบบ
                        </span>
                    </button>
                    {!isOpen && (
                        <div className="pointer-events-none absolute left-full ml-2 top-1/2 -translate-y-1/2 z-[200] opacity-0 group-hover/logout:opacity-100 transition-opacity duration-100 whitespace-nowrap">
                            <div className="bg-[#0c1a2f] border border-white/10 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg shadow-xl">
                                ออกจากระบบ
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar mode control */}
                <div className="relative mt-1 border-t border-white/5 pt-2">
                    <div className="relative group/mode">
                        <button
                            onClick={() => setModeMenuOpen(v => !v)}
                            style={{
                                width: isOpen ? `calc(100% - 16px)` : 40,
                                marginLeft: isOpen ? 8 : 'auto',
                                marginRight: isOpen ? 8 : 'auto',
                                paddingLeft: isOpen ? 10 : 0,
                                paddingRight: isOpen ? 10 : 0,
                                justifyContent: isOpen ? 'flex-start' : 'center',
                                transition: 'width 180ms cubic-bezier(0.4,0,0.2,1), margin 180ms, padding 180ms',
                            }}
                            className={`flex items-center gap-3 h-8 rounded-xl transition-all ${
                                modeMenuOpen ? 'bg-white/8 text-white/70' : 'text-white/20 hover:text-white/50 hover:bg-white/5'
                            }`}
                            title={MODE_META[sidebarMode]?.title}
                        >
                            <ModeIcon size={14} className="shrink-0" />
                            <span
                                className="text-[10px] font-semibold whitespace-nowrap overflow-hidden"
                                style={{
                                    opacity: isOpen ? 1 : 0,
                                    maxWidth: isOpen ? 120 : 0,
                                    transition: 'opacity 120ms, max-width 180ms',
                                }}
                            >
                                {MODE_META[sidebarMode]?.label}
                            </span>
                        </button>

                        {/* Mode popup menu */}
                        {modeMenuOpen && (
                            <div
                                className="absolute bottom-full mb-2 z-[300] bg-[#0c1a2f] border border-white/10 rounded-xl shadow-2xl overflow-hidden"
                                style={{ left: isOpen ? 8 : '50%', transform: isOpen ? 'none' : 'translateX(-50%)', minWidth: 180 }}
                            >
                                <div className="px-3 py-2 border-b border-white/5">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-white/30">Sidebar Layout</span>
                                </div>
                                {Object.entries(MODE_META).map(([key, meta]) => {
                                    const Icon = meta.icon;
                                    const isActive = sidebarMode === key;
                                    return (
                                        <button
                                            key={key}
                                            onClick={() => setMode(key)}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                                                isActive
                                                    ? 'bg-[#cc9d37]/12 text-[#cc9d37]'
                                                    : 'text-white/50 hover:text-white hover:bg-white/5'
                                            }`}
                                        >
                                            <Icon size={14} className="shrink-0" />
                                            <div className="flex-1">
                                                <div className="text-[11px] font-semibold">{meta.label}</div>
                                                <div className="text-[9px] text-white/30">{meta.title}</div>
                                            </div>
                                            {isActive && (
                                                <span className="w-1.5 h-1.5 rounded-full bg-[#cc9d37] shrink-0" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Tooltip when collapsed */}
                        {!isOpen && !modeMenuOpen && (
                            <div className="pointer-events-none absolute left-full ml-2 top-1/2 -translate-y-1/2 z-[200] opacity-0 group-hover/mode:opacity-100 transition-opacity duration-100 whitespace-nowrap">
                                <div className="bg-[#0c1a2f] border border-white/10 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg shadow-xl">
                                    {MODE_META[sidebarMode]?.title}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </aside>
    );
}
