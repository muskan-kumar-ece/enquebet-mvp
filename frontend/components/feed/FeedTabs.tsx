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
        <div className="card !py-1.5 !px-1.5">
            <div className="flex gap-1 overflow-x-auto no-scrollbar">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={`flex items-center justify-center gap-1.5 flex-1 min-w-[95px] px-3 py-2 rounded-lg font-medium text-xs sm:text-sm transition-all shrink-0 ${
                                isActive
                                    ? 'bg-purple/15 text-purple-light shadow-sm font-semibold'
                                    : 'text-text-muted hover:text-text-secondary hover:bg-bg-hover'
                            }`}
                        >
                            <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-purple-light' : 'text-text-muted'}`} />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
