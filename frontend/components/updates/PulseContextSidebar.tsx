"use client";

import { useState } from 'react';
import { Bookmark, SlidersHorizontal, Plus, X, RefreshCw, Trophy, Flame, ArrowRight, Check } from 'lucide-react';
import toast from 'react-hot-toast';

interface PulseContextSidebarProps {
    followedTechnologies: string[];
    onUpdatePreferences: (techs: string[]) => Promise<void>;
    opportunities: any[];
    lifecycleItems: any[];
    onSelectUpdate: (update: any) => void;
    activeTab: string;
    onTabChange: (tab: any) => void;
}

export function PulseContextSidebar({
    followedTechnologies,
    onUpdatePreferences,
    opportunities,
    lifecycleItems,
    onSelectUpdate,
    activeTab,
    onTabChange,
}: PulseContextSidebarProps) {
    const [newTag, setNewTag] = useState('');
    const [saving, setSaving] = useState(false);
    const [digestCopied, setDigestCopied] = useState(false);

    const handleAddTag = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = newTag.trim();
        if (!trimmed) return;
        if (followedTechnologies.includes(trimmed)) {
            toast.error('Already in your watchlist');
            return;
        }
        const updated = [...followedTechnologies, trimmed];
        setSaving(true);
        try {
            await onUpdatePreferences(updated);
            setNewTag('');
            toast.success(`Following ${trimmed}`);
        } catch {
            toast.error('Failed to update watchlist');
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveTag = async (tech: string) => {
        const updated = followedTechnologies.filter((t) => t !== tech);
        try {
            await onUpdatePreferences(updated);
            toast.success(`Removed ${tech}`);
        } catch {
            toast.error('Failed to update watchlist');
        }
    };

    const handleCopyWeeklyDigest = () => {
        const text = `ENQUEbet Pulse — Weekly Tech Intelligence Digest\n` +
            `• 9 Engineering Domains Monitored\n` +
            `• Discover What's Changing. Understand What Matters. Build What's Next.\n` +
            `Read full dispatches at: ${window.location.origin}/updates`;
        navigator.clipboard.writeText(text);
        setDigestCopied(true);
        toast.success('Weekly digest summary copied');
        setTimeout(() => setDigestCopied(false), 2000);
    };

    const topOpportunities = opportunities.slice(0, 2);
    const topLifecycle = lifecycleItems.slice(0, 2);

    return (
        <aside className="space-y-5">
            {/* 1. Your Pulse Watchlist Card */}
            <div className="bg-[#0d1017] border border-[#1e2335] rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-[#1864ff]" />
                        Your Pulse Watchlist
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">
                        {followedTechnologies.length} topics
                    </span>
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed">
                    Personalize your feed by following specific frameworks, hardware families, and languages.
                </p>

                {/* Tag Pills */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                    {followedTechnologies.length === 0 ? (
                        <div className="text-xs text-zinc-500 font-mono italic">
                            No followed topics yet. Add your favorite tools below.
                        </div>
                    ) : (
                        followedTechnologies.map((tech) => (
                            <span
                                key={tech}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#141824] border border-[#1e2335] text-xs font-mono text-zinc-200"
                            >
                                <span>{tech}</span>
                                <button
                                    onClick={() => handleRemoveTag(tech)}
                                    className="text-zinc-500 hover:text-rose-400 p-0.5 rounded cursor-pointer"
                                    title="Unfollow"
                                >
                                    <X className="w-2.5 h-2.5" />
                                </button>
                            </span>
                        ))
                    )}
                </div>

                {/* Add Tag Form */}
                <form onSubmit={handleAddTag} className="flex items-center gap-1.5 pt-2">
                    <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        placeholder="Add technology (e.g. Rust, PyTorch)..."
                        className="flex-1 bg-[#090b11] border border-[#1e2335] rounded-xl px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-[#1864ff] font-mono"
                    />
                    <button
                        type="submit"
                        disabled={saving || !newTag.trim()}
                        className="px-3 py-1.5 rounded-xl bg-[#141824] hover:bg-[#1b2233] text-zinc-200 hover:text-white border border-[#1e2335] text-xs font-mono transition-colors disabled:opacity-40 cursor-pointer"
                    >
                        <Plus className="w-3.5 h-3.5" />
                    </button>
                </form>
            </div>

            {/* 2. Urgent Opportunities Radar */}
            {topOpportunities.length > 0 && (
                <div className="bg-[#0d1017] border border-[#1e2335] rounded-2xl p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Trophy className="w-3.5 h-3.5" />
                            Closing Soon
                        </span>
                        <button
                            onClick={() => onTabChange('opportunities')}
                            className="text-[11px] font-mono text-[#4f8fff] hover:underline flex items-center gap-0.5 cursor-pointer"
                        >
                            <span>View all</span>
                            <ArrowRight className="w-2.5 h-2.5" />
                        </button>
                    </div>

                    <div className="space-y-2.5">
                        {topOpportunities.map((opp) => (
                            <div
                                key={opp.id}
                                onClick={() => onSelectUpdate(opp)}
                                className="p-3 rounded-xl bg-[#090b11] hover:bg-[#121622] border border-[#1e2335] transition-colors cursor-pointer space-y-1.5"
                            >
                                <div className="flex items-center justify-between text-[11px] font-mono">
                                    <span className="text-emerald-400">{opp.opportunity_meta?.stipend || 'Verified Grant'}</span>
                                    {opp.opportunity_meta?.deadline && (
                                        <span className="text-amber-400">{opp.opportunity_meta.deadline}</span>
                                    )}
                                </div>
                                <h5 className="text-xs font-bold text-white line-clamp-1">
                                    {opp.title}
                                </h5>
                                <p className="text-[11px] text-zinc-400 line-clamp-1">
                                    {opp.summary}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 3. Tech Lifecycle Advisories */}
            {topLifecycle.length > 0 && (
                <div className="bg-[#0d1017] border border-[#1e2335] rounded-2xl p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
                            <RefreshCw className="w-3.5 h-3.5" />
                            Lifecycle Alerts
                        </span>
                        <button
                            onClick={() => onTabChange('lifecycle')}
                            className="text-[11px] font-mono text-[#4f8fff] hover:underline flex items-center gap-0.5 cursor-pointer"
                        >
                            <span>Radar</span>
                            <ArrowRight className="w-2.5 h-2.5" />
                        </button>
                    </div>

                    <div className="space-y-2.5">
                        {topLifecycle.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => onSelectUpdate(item)}
                                className="p-3 rounded-xl bg-[#090b11] hover:bg-[#121622] border border-[#1e2335] transition-colors cursor-pointer space-y-1"
                            >
                                <div className="text-[10px] font-mono text-orange-400 uppercase">
                                    {item.lifecycle_meta?.status?.replace('_', ' ') || 'Lifecycle Event'}
                                </div>
                                <h5 className="text-xs font-bold text-white line-clamp-1">
                                    {item.title}
                                </h5>
                                {item.lifecycle_meta?.affected_version && (
                                    <div className="text-[10px] font-mono text-zinc-400">
                                        Affected: <span className="text-rose-300">{item.lifecycle_meta.affected_version}</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 4. Weekly Intelligence Briefing Banner */}
            <div className="bg-gradient-to-br from-[#0e1424] to-[#090b11] border border-[#1e2335] rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-[#4f8fff]">
                    <Flame className="w-3.5 h-3.5 text-[#1864ff]" />
                    <span>Weekly Intelligence Briefing</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                    A curated digest of the top 5 developments, releases, and deadlines delivered every Monday at 9:00 AM.
                </p>
                <button
                    onClick={handleCopyWeeklyDigest}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#141824] hover:bg-[#1c2233] text-zinc-200 text-xs font-mono border border-[#1e2335] transition-colors cursor-pointer"
                >
                    {digestCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Bookmark className="w-3.5 h-3.5" />}
                    <span>{digestCopied ? 'Digest Summary Copied' : 'Share Weekly Briefing'}</span>
                </button>
            </div>
        </aside>
    );
}
