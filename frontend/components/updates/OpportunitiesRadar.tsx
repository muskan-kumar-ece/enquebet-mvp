"use client";

import { useState } from 'react';
import { GraduationCap, Trophy, Calendar, DollarSign, Globe, ExternalLink, ArrowRight, Sparkles, Users } from 'lucide-react';
import Link from 'next/link';

interface OpportunitiesRadarProps {
    items: any[];
    loading: boolean;
    onOpenDetail: (update: any) => void;
}

export function OpportunitiesRadar({
    items,
    loading,
    onOpenDetail,
}: OpportunitiesRadarProps) {
    const [typeFilter, setTypeFilter] = useState<string>('all');

    const filteredItems = items.filter((item) => {
        if (typeFilter === 'all') return true;
        const t = item.opportunity_meta?.opportunity_type;
        return t === typeFilter;
    });

    return (
        <div className="space-y-6">
            {/* Header introduction */}
            <div className="bg-[#0d1017] border border-[#1e2335] rounded-2xl p-5 space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
                    <Trophy className="w-4 h-4 text-emerald-400" />
                    <span>CAREERS & OPPORTUNITIES RADAR</span>
                </div>
                <h2 className="text-xl font-bold text-white font-mono">
                    Internships, Hackathons, Fellowships & Grants
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-3xl">
                    High-leverage engineering opportunities verified by the ENQUEbet team. Never miss a critical deadline or global open-source fellowship.
                </p>

                {/* Filter buttons */}
                <div className="flex items-center gap-2 pt-3 flex-wrap">
                    {[
                        { id: 'all', label: 'All Opportunities' },
                        { id: 'fellowship', label: 'Fellowships' },
                        { id: 'internship', label: 'Internships' },
                        { id: 'hackathon', label: 'Hackathons' },
                        { id: 'grant', label: 'Builder Grants' },
                    ].map((f) => (
                        <button
                            key={f.id}
                            onClick={() => setTypeFilter(f.id)}
                            className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                                typeFilter === f.id
                                    ? 'bg-[#1864ff] text-white font-medium'
                                    : 'bg-[#141824] hover:bg-[#1b2233] text-zinc-400 border border-[#1e2335]'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content List */}
            {loading ? (
                <div className="p-12 text-center text-zinc-500 text-xs font-mono animate-pulse">
                    Scanning active opportunities radar...
                </div>
            ) : filteredItems.length === 0 ? (
                <div className="p-12 text-center bg-[#0d1017] border border-[#1e2335] rounded-2xl text-zinc-400 text-xs font-mono">
                    No active opportunities found for this filter.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredItems.map((item) => {
                        const meta = item.opportunity_meta || {};
                        return (
                            <div
                                key={item.id}
                                onClick={() => onOpenDetail(item)}
                                className="group bg-[#0d1017] hover:bg-[#10141f] border border-[#1e2335] hover:border-[#2b3552] rounded-2xl p-5 transition-all cursor-pointer flex flex-col justify-between"
                            >
                                <div className="space-y-3">
                                    {/* Type badge + Deadline */}
                                    <div className="flex items-center justify-between gap-2 text-xs font-mono">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-semibold uppercase text-[10px]">
                                            <GraduationCap className="w-3 h-3" />
                                            {meta.opportunity_type || 'Opportunity'}
                                        </span>
                                        {meta.deadline && (
                                            <span className="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded text-[11px] font-mono border border-amber-500/20">
                                                Closes: {meta.deadline}
                                            </span>
                                        )}
                                    </div>

                                    <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-[#60a5fa] transition-colors leading-snug">
                                        {item.title}
                                    </h3>

                                    <p className="text-xs text-zinc-300 line-clamp-3 leading-relaxed">
                                        {item.summary}
                                    </p>

                                    {/* Metadata Chips: Stipend / Eligibility / Location */}
                                    <div className="space-y-1.5 text-xs font-mono pt-2 text-zinc-400">
                                        {meta.stipend && (
                                            <div className="flex items-center gap-2 text-emerald-300">
                                                <DollarSign className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                                <span>{meta.stipend}</span>
                                            </div>
                                        )}
                                        {meta.eligibility && (
                                            <div className="flex items-center gap-2 text-zinc-400 text-[11px]">
                                                <Users className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                                                <span className="truncate">{meta.eligibility}</span>
                                            </div>
                                        )}
                                        {meta.location_type && (
                                            <div className="flex items-center gap-2 text-zinc-400 text-[11px]">
                                                <Globe className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                                                <span>{meta.location_type}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Footer actions */}
                                <div className="mt-5 pt-3 border-t border-[#1e2335] flex items-center justify-between gap-3 text-xs" onClick={(e) => e.stopPropagation()}>
                                    <Link
                                        href="/collaboration"
                                        className="text-[11px] font-mono text-[#4f8fff] hover:underline flex items-center gap-1"
                                    >
                                        <span>Find teammates</span>
                                        <ArrowRight className="w-2.5 h-2.5" />
                                    </Link>

                                    <div className="flex items-center gap-2">
                                        {meta.application_url && (
                                            <a
                                                href={meta.application_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#141824] hover:bg-[#1b2233] text-zinc-200 text-xs font-mono border border-[#1e2335] transition-colors"
                                            >
                                                <span>Apply</span>
                                                <ExternalLink className="w-3 h-3 text-[#4f8fff]" />
                                            </a>
                                        )}
                                        <button
                                            onClick={() => onOpenDetail(item)}
                                            className="px-3 py-1.5 rounded-xl bg-[#1864ff] hover:bg-[#1864ff]/90 text-white text-xs font-mono transition-colors"
                                        >
                                            Details
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
