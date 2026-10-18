"use client";

import React from 'react';
import { 
    User, ShieldCheck, Clock, BarChart3, 
    Bookmark, ShieldAlert, Info, FileText, 
    AlertTriangle, ChevronRight 
} from 'lucide-react';

export type SettingsTab = 
    | 'account'
    | 'security'
    | 'time'
    | 'professional'
    | 'saved'
    | 'safety'
    | 'about'
    | 'legal'
    | 'danger';

interface SettingsNavProps {
    activeTab: SettingsTab;
    onSelectTab: (tab: SettingsTab) => void;
}

const NAV_ITEMS: { id: SettingsTab; label: string; icon: any; isDanger?: boolean; description: string }[] = [
    { 
        id: 'account', 
        label: 'Account & Identity', 
        icon: User, 
        description: 'Profile credentials and contact' 
    },
    { 
        id: 'security', 
        label: 'Password & Devices', 
        icon: ShieldCheck, 
        description: 'Active login sessions and password' 
    },
    { 
        id: 'time', 
        label: 'Time & Digital Wellbeing', 
        icon: Clock, 
        description: 'Building velocity and quiet hours' 
    },
    { 
        id: 'professional', 
        label: 'Professional Dashboard', 
        icon: BarChart3, 
        description: 'Builder reach, analytics, and PoW' 
    },
    { 
        id: 'saved', 
        label: 'Saved Things', 
        icon: Bookmark, 
        description: 'Bookmarked posts and projects' 
    },
    { 
        id: 'safety', 
        label: 'Safety & Blocked Accounts', 
        icon: ShieldAlert, 
        description: 'Blocked builders and privacy rules' 
    },
    { 
        id: 'about', 
        label: 'About ENQUEbet', 
        icon: Info, 
        description: 'Platform version and architecture' 
    },
    { 
        id: 'legal', 
        label: 'Legal & Compliance', 
        icon: FileText, 
        description: 'Terms, privacy, and code of conduct' 
    },
    { 
        id: 'danger', 
        label: 'Danger Zone', 
        icon: AlertTriangle, 
        isDanger: true, 
        description: 'Protected data and account deletion' 
    },
];

export function SettingsNav({ activeTab, onSelectTab }: SettingsNavProps) {
    return (
        <aside className="w-full lg:w-72 shrink-0 space-y-1">
            {/* Mobile Horizontal Scroll */}
            <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto pb-3 scrollbar-none">
                {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;

                    return (
                        <button
                            key={item.id}
                            onClick={() => onSelectTab(item.id)}
                            className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-2 border transition-all ${
                                isActive
                                    ? item.isDanger
                                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-sm'
                                        : 'bg-[#1864ff]/10 border-[#1864ff]/30 text-white shadow-sm'
                                    : 'bg-[#0b0d14] border-[#1e2335] text-slate-400 hover:text-white hover:border-slate-700'
                            }`}
                        >
                            <Icon className={`w-3.5 h-3.5 ${isActive ? (item.isDanger ? 'text-rose-400' : 'text-[#1864ff]') : 'text-slate-400'}`} />
                            <span>{item.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Desktop Vertical Nav */}
            <div className="hidden lg:block space-y-1.5 bg-[#08090E] border border-[#1e2335] p-2.5 rounded-2xl">
                <div className="px-3 py-2 border-b border-[#1e2335] mb-1.5">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                        Settings Categories
                    </span>
                </div>

                {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;

                    return (
                        <button
                            key={item.id}
                            onClick={() => onSelectTab(item.id)}
                            className={`w-full text-left p-3 rounded-xl flex items-center justify-between border transition-all group ${
                                isActive
                                    ? item.isDanger
                                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-300 shadow-sm'
                                        : 'bg-[#0F111A] border-[#1864ff]/40 text-white shadow-sm ring-1 ring-[#1864ff]/20'
                                    : item.isDanger
                                        ? 'border-transparent text-rose-400/80 hover:bg-rose-500/5 hover:border-rose-500/20'
                                        : 'border-transparent text-slate-400 hover:bg-[#0B0D14] hover:text-white hover:border-[#1e2335]'
                            }`}
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                                    isActive
                                        ? item.isDanger
                                            ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                                            : 'bg-[#1864ff]/15 border-[#1864ff]/30 text-[#1864ff]'
                                        : item.isDanger
                                            ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                                            : 'bg-surface border-border text-slate-400 group-hover:text-white'
                                }`}>
                                    <Icon className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-xs font-bold truncate">
                                        {item.label}
                                    </div>
                                    <div className="text-[10px] text-text-secondary truncate mt-0.5">
                                        {item.description}
                                    </div>
                                </div>
                            </div>

                            <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                                isActive ? 'text-[#1864ff] translate-x-0.5' : 'text-slate-600 group-hover:text-slate-400'
                            }`} />
                        </button>
                    );
                })}
            </div>
        </aside>
    );
}
