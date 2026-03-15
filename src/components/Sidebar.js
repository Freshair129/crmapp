'use client';

import {
    PieChart, Brain, ShoppingCart, Package, History,
    Users, MessageCircle, MessageSquare, Megaphone,
    Crosshair, TrendingUp, Bell, UserCircle, Settings2,
    Timer, SlidersHorizontal, Settings, LogOut,
    ChefHat, Monitor, CalendarDays
} from 'lucide-react';

const menuGroups = [
    {
        label: 'OVERVIEW',
        items: [
            { id: 'dashboard', icon: PieChart, label: 'Dashboard' },
            { id: 'executive-analytics', icon: Brain, label: 'BI Engine' }
        ]
    },
    {
        label: 'SALES',
        items: [
            { id: 'pos-system', icon: ShoppingCart, label: 'Premium POS' },
            { id: 'inventory-manager', icon: Package, label: 'Catalog Manager' },
            { id: 'audit-trail', icon: History, label: 'Audit Trail' }
        ]
    },
    {
        label: 'CRM',
        items: [
            { id: 'customers', icon: Users, label: 'Customers 360' },
            { id: 'facebook-chat', icon: MessageCircle, label: 'Unified Inbox' },
            { id: 'line-connect', icon: MessageSquare, label: 'LINE Connect' }
        ]
    },
    {
        label: 'MARKETING',
        items: [
            { id: 'facebook-ads', icon: Megaphone, label: 'Facebook Ads' },
            { id: 'campaign-tracking', icon: Crosshair, label: 'Campaign Tracking' },
            { id: 'analytics', icon: TrendingUp, label: 'Analytics' },
            { id: 'notification-rules', icon: Bell, label: 'Notification Center' }
        ]
    },
    {
        label: 'OPERATIONS',
        items: [
            { id: 'schedules', icon: CalendarDays, label: 'ตารางคลาส' },
            { id: 'kitchen-stock', icon: ChefHat, label: 'สต็อกครัว' },
            { id: 'assets', icon: Monitor, label: 'อุปกรณ์' }
        ]
    },
    {
        label: 'HR',
        items: [
            { id: 'employees', icon: UserCircle, label: 'Employees' },
            { id: 'team-kpi', icon: Settings2, label: 'Team KPI' },
            { id: 'admin-performance', icon: Timer, label: 'Admin Perf.' }
        ]
    },
    {
        label: 'SYSTEM',
        items: [
            { id: 'system-config', icon: SlidersHorizontal, label: 'System Config' },
            { id: 'settings', icon: Settings, label: 'Legacy Settings' }
        ]
    }
];

export default function Sidebar({ activeView, onViewChange, cartCount, pendingTaskCount, currentUser, onLogout }) {
    const userName = currentUser?.firstName || currentUser?.profile?.first_name || 'User';
    const userRole = currentUser?.role || currentUser?.profile?.role || 'Guest';

    return (
        <aside className="w-20 bg-[#0A1A2F] border-r border-white/5 flex flex-col h-screen shrink-0 sticky top-0 z-[100] items-center overflow-x-hidden">
            {/* Logo */}
            <div className="py-5 flex items-center justify-center w-full border-b border-white/5">
                <div className="w-9 h-9 rounded-xl bg-[#C9A34E] flex items-center justify-center text-[#0A1A2F] font-black text-lg shadow-lg shadow-[#C9A34E]/20 relative">
                    V
                    <span className="absolute -bottom-1 text-[6px] opacity-20">v0.14-NEW</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden w-full flex flex-col items-center gap-0 custom-scrollbar">
                {menuGroups.map((group, groupIndex) => (
                    <div key={groupIndex} className="w-full flex flex-col items-center">
                        {/* Group divider (except first) */}
                        {groupIndex > 0 && (
                            <div className="w-6 h-px bg-white/10 my-2" />
                        )}
                        {group.items.map((item) => {
                            const isActive = activeView === item.id;
                            const Icon = item.icon;
                            const canAccess = item.id === 'analytics'
                                ? (currentUser?.permissions?.can_access_analytics || currentUser?.permissions?.can_manage_analytics || currentUser?.permissions?.is_admin)
                                : true;

                            if (!canAccess) return null;

                            return (
                                <div key={item.id} className="relative group w-full flex justify-center">
                                    <button
                                        onClick={() => onViewChange(item.id)}
                                        className={`relative w-10 h-10 my-0.5 rounded-2xl flex items-center justify-center transition-all duration-200 ${isActive
                                            ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                                            : 'text-white/40 hover:text-white hover:bg-white/8'
                                            }`}
                                        title={item.label}
                                    >
                                        {/* Active left bar */}
                                        {isActive && (
                                            <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-5 bg-red-400 rounded-r-full" />
                                        )}

                                        <Icon size={18} />

                                        {/* Pending badge */}
                                        {item.id === 'dashboard' && pendingTaskCount > 0 && (
                                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[9px] font-black animate-pulse shadow-lg shadow-red-500/40">
                                                {pendingTaskCount}
                                            </span>
                                        )}

                                        {/* Cart badge */}
                                        {item.id === 'store' && cartCount > 0 && (
                                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[9px] font-black">
                                                {cartCount}
                                            </span>
                                        )}
                                    </button>

                                    {/* Tooltip */}
                                    <div className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 z-[200] opacity-0 group-hover:opacity-100 hidden group-hover:block transition-opacity duration-150">
                                        <div className="bg-[#0A1A2F] border border-white/10 text-white text-[11px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-xl whitespace-nowrap shadow-2xl">
                                            {item.label}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </nav>

            {/* User avatar + logout */}
            <div className="py-4 border-t border-white/5 w-full flex flex-col items-center gap-2">
                <div className="relative group">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#C9A34E] to-amber-600 flex items-center justify-center border border-white/10 shadow-xl cursor-default">
                        <span className="text-white font-black text-sm">{(userName || 'U').charAt(0)}</span>
                    </div>
                    {/* User tooltip */}
                    <div className="pointer-events-none absolute left-full ml-3 bottom-0 z-[200] opacity-0 group-hover:opacity-100 hidden group-hover:block transition-opacity duration-150">
                        <div className="bg-[#0A1A2F] border border-white/10 text-white text-[11px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-xl whitespace-nowrap shadow-2xl">
                            {userName} · {userRole}
                        </div>
                    </div>
                </div>
                <button
                    onClick={onLogout}
                    className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    title="Logout"
                >
                    <LogOut size={18} />
                </button>
            </div>
        </aside>
    );
}
