"use client";

import React from 'react';
import Link from 'next/link';
import { Compass, Sparkles, ArrowRight, Layers, Users, BookOpen } from 'lucide-react';

interface DiscoveryRecommendationsWidgetProps {
    isOwner?: boolean;
    user?: any;
}

export default function DiscoveryRecommendationsWidget({
    isOwner,
    user
}: DiscoveryRecommendationsWidgetProps) {
    return (
        <div className="rounded-2xl border border-[#1e2230] bg-[#0d1017] p-5 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-[#1864ff]" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                        {isOwner ? 'Builder Ecosystem' : 'Discovery Shortcuts'}
                    </h3>
                </div>
            </div>

            {/* Content items */}
            <div className="space-y-2.5">
                <Link
                    href="/collaboration"
                    className="group block p-3 rounded-xl bg-[#141824] hover:bg-[#1a2030] border border-[#23283a] transition-all"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Layers className="w-3.5 h-3.5 text-[#1864ff]" />
                            <span className="text-xs font-semibold text-zinc-200 group-hover:text-white transition-colors">
                                Collaboration Hub
                            </span>
                        </div>
                        <ArrowRight className="w-3 h-3 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                        Find active project workspaces looking for engineers & designers.
                    </p>
                </Link>

                <Link
                    href="/research"
                    className="group block p-3 rounded-xl bg-[#141824] hover:bg-[#1a2030] border border-[#23283a] transition-all"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-xs font-semibold text-zinc-200 group-hover:text-white transition-colors">
                                Research & Preprints
                            </span>
                        </div>
                        <ArrowRight className="w-3 h-3 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                        Explore peer-reviewed algorithmic models and hardware studies.
                    </p>
                </Link>

                <Link
                    href="/resources"
                    className="group block p-3 rounded-xl bg-[#141824] hover:bg-[#1a2030] border border-[#23283a] transition-all"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                            <span className="text-xs font-semibold text-zinc-200 group-hover:text-white transition-colors">
                                Engineering Assets
                            </span>
                        </div>
                        <ArrowRight className="w-3 h-3 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                        Curated schematics, starter repos, datasets, and guides.
                    </p>
                </Link>
            </div>
        </div>
    );
}
