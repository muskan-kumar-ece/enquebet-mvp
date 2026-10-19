"use client";

import { Sparkles, Plus, Pin, Radio } from 'lucide-react';

interface UpdateHeaderProps {
    isAdmin: boolean;
    totalUpdates: number;
    pinnedCount: number;
    onOpenPostModal: () => void;
}

export function UpdateHeader({
    isAdmin,
    totalUpdates,
    pinnedCount,
    onOpenPostModal,
}: UpdateHeaderProps) {
    return (
        <header className="relative mb-8 pb-6 border-b border-border-default/60">
            {/* Ambient subtle glow background */}
            <div className="absolute top-0 left-0 w-96 h-28 bg-brand-primary/5 blur-3xl pointer-events-none -z-10" />

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-2.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono tracking-wide uppercase bg-brand-primary/10 border border-brand-primary/25 text-brand-light">
                            <Radio className="w-3 h-3 text-brand-light animate-pulse" />
                            Live Dispatches
                        </span>
                        {pinnedCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono tracking-wide text-amber-400 bg-amber-500/10 border border-amber-500/20">
                                <Pin className="w-2.5 h-2.5" />
                                {pinnedCount} Pinned
                            </span>
                        )}
                    </div>

                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-text-primary">
                        Platform Updates & Engineering Dispatch
                    </h1>

                    <p className="text-sm md:text-base text-text-secondary max-w-3xl leading-relaxed">
                        Official system changelog, hardware protocol announcements, engineering dispatches, and technical releases from the core team.
                    </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    {/* Live Counter Pill */}
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-elevation-1 border border-border-default text-xs text-text-secondary font-mono">
                        <Sparkles className="w-3.5 h-3.5 text-brand-light" />
                        <span>{totalUpdates} Dispatches</span>
                    </div>

                    {/* Admin CTA button */}
                    {isAdmin && (
                        <button
                            onClick={onOpenPostModal}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-primary hover:bg-brand-primary/90 text-white text-sm font-medium shadow-md shadow-brand-primary/20 transition-all duration-150 active:scale-[0.98] cursor-pointer"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Post Update</span>
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
}
