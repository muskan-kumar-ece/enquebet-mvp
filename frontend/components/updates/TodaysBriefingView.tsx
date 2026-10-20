"use client";

import { Flame, ArrowRight, Bookmark, Clock, Wrench } from 'lucide-react';
import { PulseCard } from './PulseCard';
import { useState } from 'react';

interface TodaysBriefingViewProps {
    topStory: any | null;
    dailyDevelopments: any[];
    dateStr: string;
    totalRecent: number;
    isAdmin: boolean;
    onOpenDetail: (update: any) => void;
    onToggleSave: (id: string) => Promise<void>;
    onOpenBuildModal: (update: any) => void;
}

export function TodaysBriefingView({
    topStory,
    dailyDevelopments,
    dateStr,
    totalRecent,
    isAdmin,
    onOpenDetail,
    onToggleSave,
    onOpenBuildModal,
}: TodaysBriefingViewProps) {
    const [topSaved, setTopSaved] = useState<boolean>(Boolean(topStory?.is_saved));
    const [savingTop, setSavingTop] = useState(false);

    const handleSaveTop = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!topStory || savingTop) return;
        setSavingTop(true);
        const next = !topSaved;
        setTopSaved(next);
        try {
            await onToggleSave(topStory.slug || topStory.id);
        } catch {
            setTopSaved(!next);
        } finally {
            setSavingTop(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Top Story Hero Card */}
            {topStory && (
                <div 
                    onClick={() => onOpenDetail(topStory)}
                    className="relative bg-[#0d1017] border border-[#1e2335] hover:border-[#2b3552] rounded-3xl p-6 sm:p-8 transition-all cursor-pointer group shadow-sm overflow-hidden"
                >
                    {/* Subtle blueprint accent line */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#1864ff] via-[#4f8fff] to-transparent" />

                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                        <div className="space-y-4 max-w-3xl">
                            {/* Lead Badge & Telemetry */}
                            <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#1864ff]/15 border border-[#1864ff]/30 text-[#60a5fa] font-bold tracking-wider uppercase">
                                    <Flame className="w-3.5 h-3.5 text-[#60a5fa]" />
                                    Lead Story of the Day
                                </span>
                                <span className="text-zinc-500 font-mono">·</span>
                                <span className="text-zinc-400">{topStory.category_display || topStory.category}</span>
                                <span className="text-zinc-500 font-mono">·</span>
                                <span className="text-zinc-400 flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> {topStory.reading_time_minutes || 3} min read
                                </span>
                            </div>

                            {/* Headline */}
                            <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white group-hover:text-[#60a5fa] transition-colors leading-tight">
                                {topStory.title}
                            </h2>

                            {/* Level 1: 30s Digest */}
                            <div className="space-y-2 text-sm text-zinc-300 leading-relaxed">
                                <p className="text-zinc-200">
                                    <strong className="text-white font-mono text-xs uppercase tracking-wider text-[#4f8fff]">In 30 Seconds: </strong>
                                    {topStory.summary}
                                </p>

                                {topStory.why_it_matters && (
                                    <div className="bg-[#090b11] border-l-2 border-[#1864ff] p-3 rounded-r-xl text-xs sm:text-sm text-zinc-400">
                                        <strong className="text-zinc-200 font-mono">Why it matters: </strong>
                                        {topStory.why_it_matters}
                                    </div>
                                )}
                            </div>

                            {/* Target Profiles & Next Steps */}
                            <div className="flex items-center gap-4 text-xs font-mono text-zinc-400 pt-1 flex-wrap">
                                {topStory.who_should_care && (
                                    <div>
                                        <span className="text-zinc-500">Audience: </span>
                                        <span className="text-zinc-300 font-medium">{topStory.who_should_care}</span>
                                    </div>
                                )}
                                {topStory.primary_source_name && (
                                    <div>
                                        <span className="text-zinc-500">Source: </span>
                                        <span className="text-zinc-300">{topStory.primary_source_name}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Quick Action Column */}
                        <div className="flex flex-col gap-2 shrink-0 self-stretch sm:self-auto justify-between border-t md:border-t-0 md:border-l border-[#1e2335] pt-4 md:pt-0 md:pl-6" onClick={(e) => e.stopPropagation()}>
                            <button
                                onClick={() => onOpenDetail(topStory)}
                                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1864ff] hover:bg-[#1864ff]/90 text-white text-xs font-mono font-medium transition-all cursor-pointer shadow-sm"
                            >
                                <span>Read 3-Level Brief</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                            </button>

                            <button
                                onClick={handleSaveTop}
                                className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-mono border transition-colors cursor-pointer ${
                                    topSaved
                                        ? 'bg-[#1864ff]/20 text-[#60a5fa] border-[#1864ff]/40'
                                        : 'bg-[#141824] hover:bg-[#1a2030] text-zinc-300 border-[#1e2335]'
                                }`}
                            >
                                <Bookmark className="w-3.5 h-3.5" fill={topSaved ? 'currentColor' : 'none'} />
                                <span>{topSaved ? 'Saved in Pulse' : 'Save Update'}</span>
                            </button>

                            {topStory.build_this_idea?.title && (
                                <button
                                    onClick={() => onOpenBuildModal(topStory)}
                                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#090b11] hover:bg-[#121622] text-[#4f8fff] text-xs font-mono border border-[#1e2335] transition-colors cursor-pointer"
                                    title="Seed into Workspace Task"
                                >
                                    <Wrench className="w-3.5 h-3.5" />
                                    <span>Build This Idea</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Daily Developments Section Header */}
            <div className="flex items-center justify-between pt-2">
                <div>
                    <h3 className="text-base sm:text-lg font-bold text-white font-mono flex items-center gap-2">
                        <span>Crucial Daily Developments</span>
                        <span className="text-xs font-normal text-zinc-400">
                            ({dailyDevelopments.length} curated {dateStr ? `· ${dateStr}` : ''})
                        </span>
                    </h3>
                    <p className="text-xs text-zinc-400">
                        High-impact releases, security advisories, and engineering dispatches from the last 24 hours ({totalRecent} monitored).
                    </p>
                </div>
            </div>

            {/* 4-6 Developments Card Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dailyDevelopments.map((dev) => (
                    <PulseCard
                        key={dev.id}
                        update={dev}
                        isAdmin={isAdmin}
                        onOpenDetail={onOpenDetail}
                        onToggleSave={onToggleSave}
                    />
                ))}
            </div>
        </div>
    );
}
