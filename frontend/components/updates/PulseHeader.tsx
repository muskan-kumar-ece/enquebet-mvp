"use client";

import { Sparkles, Plus, Pin, Radio, Flame, BookOpen, Compass, Search, SlidersHorizontal, Activity } from 'lucide-react';

interface PulseHeaderProps {
    isAdmin: boolean;
    totalUpdates: number;
    pinnedCount: number;
    searchQuery: string;
    onSearchChange: (val: string) => void;
    onOpenPostModal: () => void;
    onOpenPreferencesModal: () => void;
}

export function PulseHeader({
    isAdmin,
    totalUpdates,
    pinnedCount,
    searchQuery,
    onSearchChange,
    onOpenPostModal,
    onOpenPreferencesModal,
}: PulseHeaderProps) {
    const todayFormatted = new Date().toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    });

    return (
        <header className="relative mb-6 pb-6 border-b border-[#1e2335]">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-2">
                    {/* Telemetry pill row */}
                    <div className="flex items-center gap-2.5 flex-wrap text-[11px] font-mono">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#1864ff]/10 border border-[#1864ff]/25 text-[#4f8fff] font-medium tracking-wide">
                            <Activity className="w-3 h-3 text-[#1864ff] animate-pulse" />
                            ENQUEbet PULSE
                        </span>
                        <span className="text-zinc-500 font-mono">·</span>
                        <span className="text-zinc-400">
                            {todayFormatted} Edition
                        </span>
                        <span className="text-zinc-500 font-mono">·</span>
                        <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            9 Domains Active
                        </span>
                        {pinnedCount > 0 && (
                            <span className="inline-flex items-center gap-1 text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                <Pin className="w-2.5 h-2.5" />
                                {pinnedCount} Pinned
                            </span>
                        )}
                    </div>

                    <div className="flex items-baseline gap-3 flex-wrap">
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-mono">
                            ENQUEbet Pulse
                        </h1>
                        <span className="text-xs sm:text-sm text-zinc-400 font-normal">
                            Discover What&apos;s Changing. Understand What Matters. Build What&apos;s Next.
                        </span>
                    </div>
                </div>

                {/* Right utility toolbar */}
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Search bar */}
                    <div className="relative min-w-[220px] sm:min-w-[260px]">
                        <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                            placeholder="Filter intelligence, CVEs, tools..."
                            className="w-full bg-[#0d1017] border border-[#1e2335] rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-[#1864ff] transition-colors font-mono"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => onSearchChange('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    {/* Preferences CTA */}
                    <button
                        onClick={onOpenPreferencesModal}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0d1017] hover:bg-[#141824] border border-[#1e2335] text-zinc-300 hover:text-white text-xs font-mono transition-colors cursor-pointer"
                        title="Customize Followed Technologies"
                    >
                        <SlidersHorizontal className="w-3.5 h-3.5 text-[#4f8fff]" />
                        <span>My Pulse</span>
                    </button>

                    {/* Admin Studio CTA button */}
                    {isAdmin && (
                        <button
                            onClick={onOpenPostModal}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1864ff] hover:bg-[#1864ff]/90 text-white text-xs font-medium transition-all shadow-sm active:scale-[0.98] cursor-pointer"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Admin Studio</span>
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
}

// Backward-compatible alias
export const UpdateHeader = PulseHeader;
