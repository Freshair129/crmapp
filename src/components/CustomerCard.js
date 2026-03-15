'use client';

import React, { useState } from 'react';
import { 
  Award, 
  Medal, 
  Crown, 
  Gem, 
  Flame, 
  Search, 
  Check, 
  ShoppingCart, 
  HelpCircle, 
  AlertTriangle, 
  MessageSquare, 
  UserRound, 
  Save, 
  Loader2, 
  MessageCircle, 
  Mail, 
  Phone,
  UserRoundPen
} from 'lucide-react';
import IntelligencePanel from './IntelligencePanel';
import InventoryPanel from './InventoryPanel';
import Timeline from './Timeline';

export default function CustomerCard({ customer, customers, onSelectCustomer, currentUser, onUpdateInventory, onGoToChat }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
    const [editAgent, setEditAgent] = useState(customer?.profile?.agent || '');
    const [editStatus, setEditStatus] = useState(customer?.status || 'New Lead');
    const [isSaving, setIsSaving] = useState(false);

    if (!customer) return null;

    const profile = customer.profile || {};
    const intel = customer.intelligence || {};
    const inventory = customer.inventory || {};
    const wallet = customer.wallet || { balance: 0, points: 0, currency: 'THB' };
    const contact = customer.contact_info || profile.contact_info || {};
    const timeline = customer.timeline || [];

    const tierConfig = {
        L1: { label: 'General Member (L1)', color: 'bg-slate-400', nextTier: 'L2', threshold: 15000, hourThreshold: 0, icon: Award, textColor: 'text-slate-100' },
        L2: { label: 'Silver (L2)', color: 'bg-zinc-300', nextTier: 'L3', threshold: 50000, hourThreshold: 0, icon: Medal, textColor: 'text-zinc-800' },
        L3: { label: 'Gold (L3)', color: 'bg-amber-400', nextTier: 'L4', threshold: 125000, hourThreshold: 30, icon: Crown, textColor: 'text-amber-950' },
        L4: { label: 'Platinum (L4)', color: 'bg-cyan-400', nextTier: 'L5', threshold: 250000, hourThreshold: 100, icon: Gem, textColor: 'text-cyan-950' },
        L5: { label: 'Elite (L5)', color: 'bg-rose-500', nextTier: null, threshold: Infinity, hourThreshold: Infinity, icon: Flame, textColor: 'text-white' }
    };

    const totalSpend = intel.metrics?.total_spend || 0;
    const learningHours = intel.metrics?.total_learning_hours || 0;
    const internshipFlag = intel.metrics?.internship_completed || false;

    // T14 Fix: Validate internship recency via inventory if available
    let internship = internshipFlag;
    if (internshipFlag) {
        const courses = customer?.inventory?.learning_courses || [];
        const internshipCourse = courses.find(course =>
            (course.name || '').toLowerCase().match(/internship|ฝึกงาน/)
        );
        if (internshipCourse?.enrolled_at) {
            const daysSince = (Date.now() - new Date(internshipCourse.enrolled_at).getTime()) / (1000 * 60 * 60 * 24);
            internship = daysSince <= 730;
        }
    }

    // Detect Current Tier based on spending AND hours
    let currentTierKey = 'L1';
    if (totalSpend >= 250000 && learningHours >= 100 && internship) currentTierKey = 'L5';
    else if (totalSpend >= 125000 && learningHours >= 30) currentTierKey = 'L4';
    else if (totalSpend >= 50000) currentTierKey = 'L3';
    else if (totalSpend >= 15000) currentTierKey = 'L2';

    const currentTier = tierConfig[currentTierKey];
    const nextTierKey = currentTier.nextTier;
    const nextTier = nextTierKey ? tierConfig[nextTierKey] : null;

    // Progress calculation (Dominant by Spending, but checking both)
    const spendProgress = nextTier ? Math.min(100, (totalSpend / nextTier.threshold) * 100) : 100;
    const hourProgress = nextTier && nextTier.hourThreshold > 0 ? Math.min(100, (learningHours / nextTier.hourThreshold) * 100) : 100;

    const handleSaveProfile = async () => {
        setIsSaving(true);
        try {
            const updatedCustomer = {
                ...customer,
                profile: { ...profile, agent: editAgent },
                status: editStatus,
                timeline: [
                    {
                        date: new Date().toISOString(),
                        type: 'STATUS_CHANGE',
                        icon: 'UserRoundPen',
                        title: 'Profile Updated',
                        details: `Assigned Agent: ${editAgent}, Status: ${editStatus}`
                    },
                    ...timeline
                ]
            };
            await onUpdateInventory(updatedCustomer);

            const res = await fetch(`/api/customers/${customer.customer_id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedCustomer)
            });

            if (res.ok) {
                alert('Profile updated successfully!');
            }
        } catch (err) {
            console.error('Failed to save profile:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleInventoryUpdate = async (newInventory) => {
        const updatedCustomer = {
            ...customer,
            inventory: newInventory
        };

        // Update local state immediately
        onUpdateInventory(updatedCustomer);

        // Persist to API
        try {
            await fetch(`/api/customers/${customer.customer_id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedCustomer)
            });
        } catch (err) {
            console.error('Failed to save inventory:', err);
            alert('Failed to save inventory changes.');
        }
    };

    return (
        <div className="animate-fade-in pb-12 overflow-hidden">
            {/* Top Toolbar - Compact */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5 bg-[#162A47]/80 p-4 lg:p-5 rounded-[1.5rem] shadow-lg relative overflow-hidden ring-1 ring-white/10 backdrop-blur-md">
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl pointer-events-none"></div>
                <div className="relative z-10">
                    <h2 className="text-xl font-black text-white tracking-tight">Customer Engagement</h2>
                    <p className="text-slate-400 text-[10px] font-bold">360° Insight & Experience Management</p>
                </div>

                {/* Search Bar - Compact */}
                <div className="flex-1 max-w-xs mx-auto hidden lg:block">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="w-3 h-3 text-slate-400 group-focus-within:text-[#0A1A2F] transition-colors" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search Inventory..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-8 pr-8 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 placeholder:text-slate-300 focus:outline-none transition-all shadow-sm"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-white p-1.5 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex items-center gap-1.5 pl-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Active</span>
                    </div>
                    <select
                        value={customer.customer_id}
                        onChange={(e) => {
                            const selected = customers.find(c => c.customer_id === e.target.value);
                            if (selected) onSelectCustomer(selected);
                        }}
                        className="pl-3 pr-8 py-1.5 bg-slate-50 border-none rounded-lg text-xs font-bold text-slate-700 appearance-none cursor-pointer outline-none"
                        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%23fb923c\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M8 9l4-4 4 4m0 6l-4 4-4-4\' /%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '12px' }}
                    >
                        {customers.map((c) => (
                            <option key={c.id || c.customer_id} value={c.customer_id}>
                                {c.profile?.member_id ? `[${c.profile.member_id}]` : `[${c.customer_id}]`} {c.profile?.first_name ? `${c.profile.first_name} ${c.profile.last_name || ''}` : ''}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                <div className="lg:col-span-3 space-y-5">
                    <div className="bg-[#162A47]/80 rounded-[1.5rem] shadow-lg border border-white/10 overflow-hidden relative group backdrop-blur-md">
                        <div className="p-[15px] pb-20 bg-gradient-to-br from-[#162A47]/80 to-[#1F3A5F]/80 relative">
                            <div className="flex flex-col items-center text-center">
                                <div className="relative mb-4">
                                    <div className="w-[140px] h-[140px] rounded-full bg-[#162A47] p-0.5 ring-2 ring-[#C9A34E]/20 shadow-xl overflow-hidden">
                                        <img
                                            src={profile.profile_picture || profile.avatar_url || `https://ui-avatars.com/api/?name=${profile.first_name || 'C'}&background=0A1A2F&color=C9A34E`}
                                            alt="Avatar"
                                            className="w-full h-full object-cover rounded-full"
                                            onError={(e) => { e.target.src = 'https://ui-avatars.com/api/?name=' + (profile.first_name || 'C') + '&background=0A1A2F&color=C9A34E'; }}
                                        />
                                    </div>
                                    <div className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 border-2 border-[#162A47] rounded-full flex items-center justify-center shadow-md">
                                        <Check className="text-white w-2.5 h-2.5" />
                                    </div>
                                </div>

                                <h3 className="text-lg font-black text-[#F8F8F6] mb-0.5 tracking-tight leading-tight">{profile.first_name} {profile.last_name}</h3>
                                <p className="text-white/40 font-bold text-[8px] tracking-[0.2em] uppercase mb-4">
                                    {profile.nick_name ? `"${profile.nick_name}"` : 'Premium Member'}
                                </p>

                                {/* Membership Badge */}
                                <div className={`flex items-center gap-2 px-4 py-1.5 ${currentTier.color} rounded-full mb-6 shadow-lg shadow-black/20 border border-white/20 transition-all hover:scale-105 cursor-default`}>
                                    <currentTier.icon className={`${currentTier.textColor} w-3 h-3`} />
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${currentTier.textColor}`}>
                                        {currentTier.label}
                                    </span>
                                </div>

                                {/* AI Intelligence Badges - Phase 5 🧠 */}
                                {intel.score !== undefined && (
                                    <div className="flex flex-col items-center gap-2 mb-6 animate-bounce-slow">
                                        <div className="flex items-center gap-3">
                                            {/* Lead Score Circle */}
                                            <div className="relative w-12 h-12 flex items-center justify-center">
                                                <svg className="w-full h-full -rotate-90">
                                                    <circle cx="24" cy="24" r="20" fill="transparent" stroke="rgba(255,255,2
