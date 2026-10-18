"use client";

import { Sparkles, Users, Globe, GraduationCap, Lightbulb } from 'lucide-react';

interface FeedTabsProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
}

export default function FeedTabs({ activeTab, onTabChange }: FeedTabsProps) {
    const tabs = [
        { id: 'for_you', label: 'For You', icon: Sparkles },
        { id: 'following', label: 'Following', icon: Users },
        { id: 'public', label: 'Public', icon: Globe },
        { id: 'college', label: 'College', icon: GraduationCap },
        { id: 'openidea', label: 'Open Idea', icon: Lightbulb },
    ];

    return (
        <div className="p-1 rounded-xl bg-[#0b0d14] border border-[#1b2030] shadow-inner">
            <div className="flex gap-1 overflow-x-auto no-scrollbar">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={`flex items-center justify-center gap-1.5 flex-1 min-w-[95px] px-3 py-2 rounded-lg font-medium text-xs sm:text-sm transition-all duration-150 shrink-0 ${
                                isActive
                                    ? 'bg-[#1864ff] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_2px_6px_rgba(0,0,0,0.4)] font-semibold border border-[#488eff]/50'
                                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] border border-transparent'
                            }`}
                        >
                            <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
