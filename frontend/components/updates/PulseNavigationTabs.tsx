"use client";

import { Flame, Compass, RefreshCw, Bookmark, Sparkles, Layers, ShieldAlert, Cpu, Radio, Code2, Rocket, GraduationCap } from 'lucide-react';

export type PulseTab = 'briefing' | 'explore' | 'lifecycle' | 'opportunities' | 'my_pulse';

interface PulseNavigationTabsProps {
    activeTab: PulseTab;
    onTabChange: (tab: PulseTab) => void;
    activeCategory: string;
    onCategoryChange: (category: string) => void;
    totalOpportunities?: number;
    totalLifecycle?: number;
    savedCount?: number;
}

export const PULSE_DOMAINS = [
    { value: 'all', label: 'All Intelligence', icon: Layers },
    { value: 'AI_ML', label: 'AI & Machine Learning', icon: Sparkles },
    { value: 'SOFTWARE', label: 'Software Dev', icon: Code2 },
    { value: 'ELECTRONICS', label: 'Electronics & Hardware', icon: Cpu },
    { value: 'CLOUD_DEVOPS', label: 'Cloud & Infra', icon: Radio },
    { value: 'CYBERSECURITY', label: 'Cybersecurity', icon: ShieldAlert },
    { value: 'RESEARCH_SCIENCE', label: 'Research & Science', icon: Compass },
    { value: 'STARTUPS', label: 'Startups & Industry', icon: Rocket },
    { value: 'CAREERS', label: 'Careers & Opportunities', icon: GraduationCap },
    { value: 'LIFECYCLE', label: 'Tech Lifecycle', icon: RefreshCw },
];

export function PulseNavigationTabs({
    activeTab,
    onTabChange,
    activeCategory,
    onCategoryChange,
    totalOpportunities = 0,
    totalLifecycle = 0,
    savedCount = 0,
}: PulseNavigationTabsProps) {
    const mainTabs = [
        { id: 'briefing' as PulseTab, label: "Today's Briefing", icon: Flame, badge: 'Live' },
        { id: 'explore' as PulseTab, label: 'Explore Updates', icon: Layers },
        { id: 'lifecycle' as PulseTab, label: 'Learn & Adapt', icon: RefreshCw, badge: totalLifecycle > 0 ? totalLifecycle : null },
        { id: 'opportunities' as PulseTab, label: 'Opportunities', icon: GraduationCap, badge: totalOpportunities > 0 ? totalOpportunities : null },
        { id: 'my_pulse' as PulseTab, label: 'My Pulse', icon: Bookmark, badge: savedCount > 0 ? savedCount : null },
    ];

    return (
        <div className="space-y-3 mb-6">
            {/* Primary Experience Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-[#1e2335] pb-2">
                {mainTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-medium transition-all whitespace-nowrap cursor-pointer ${
                                isActive
                                    ? 'bg-[#1864ff] text-white shadow-sm'
                                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#141824]'
                            }`}
                        >
                            <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
                            <span>{tab.label}</span>
                            {tab.badge && (
                                <span
                                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                                        isActive
                                            ? 'bg-white/20 text-white'
                                            : tab.badge === 'Live'
                                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                            : 'bg-zinc-800 text-zinc-300'
                                    }`}
                                >
                                    {tab.badge}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Sub-Category Domain Filter Pills (Shown in Explore mode or Briefing mode) */}
            {activeTab === 'explore' && (
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                    {PULSE_DOMAINS.map((domain) => {
                        const Icon = domain.icon;
                        const isSelected = activeCategory === domain.value;
                        return (
                            <button
                                key={domain.value}
                                onClick={() => onCategoryChange(domain.value)}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono transition-colors whitespace-nowrap cursor-pointer ${
                                    isSelected
                                        ? 'bg-[#1e273d] text-[#60a5fa] border border-[#2e3e60] font-semibold'
                                        : 'bg-[#0d1017] text-zinc-400 hover:text-zinc-200 hover:bg-[#141824] border border-[#1e2335]'
                                }`}
                            >
                                <Icon className="w-3 h-3 shrink-0" />
                                <span>{domain.label}</span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
