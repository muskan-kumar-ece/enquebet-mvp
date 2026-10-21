'use client';

import React from 'react';
import { BookOpen, Users, Award, Hammer, Sparkles, Bookmark, Compass } from 'lucide-react';
import { AcademyStats } from '@/types/academy';

interface AcademyHeaderProps {
    stats: AcademyStats;
    activeTab: 'catalog' | 'my_learning';
    onTabChange: (tab: 'catalog' | 'my_learning') => void;
    enrolledCount: number;
}

export default function AcademyHeader({
    stats,
    activeTab,
    onTabChange,
    enrolledCount,
}: AcademyHeaderProps) {
    return (
        <section className="mb-8 rounded-2xl border border-[#1b1e2c] bg-[#0c0d15] p-6 lg:p-8 transition-colors">
            {/* Top Row: Eyebrow, Title & Description */}
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 pb-6 border-b border-[#1b1e2c]">
                <div className="max-w-2xl">
                    <div className="inline-flex items-center gap-2 mb-3">
                        <span className="font-mono text-[11px] font-semibold text-[#1864ff] tracking-wider uppercase px-2.5 py-1 rounded bg-[#1864ff]/10 border border-[#1864ff]/20">
                            Learn · Practice · Build · Prove · Grow
                        </span>
                        <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Project-First Academy
                        </span>
                    </div>

                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white mb-2.5">
                        ENQUEbet Academy
                    </h1>

                    <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
                        Production-grade engineering masterclasses built around verifiable deliverables. Learn systems,
                        complete capstones, and bridge directly into live collaborative project workspaces.
                    </p>
                </div>

                {/* Tab Switcher Pills */}
                <div className="flex items-center gap-2 bg-[#090a0f] p-1.5 rounded-xl border border-[#1e2335] self-start w-full sm:w-auto">
                    <button
                        onClick={() => onTabChange('catalog')}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${
                            activeTab === 'catalog'
                                ? 'bg-[#1864ff] text-white shadow-sm'
                                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                        }`}
                    >
                        <Compass className="w-3.5 h-3.5" />
                        <span>All Masterclasses</span>
                    </button>

                    <button
                        onClick={() => onTabChange('my_learning')}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-150 relative ${
                            activeTab === 'my_learning'
                                ? 'bg-[#1864ff] text-white shadow-sm'
                                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                        }`}
                    >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>My Learning</span>
                        {enrolledCount > 0 && (
                            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                {enrolledCount}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Architecture Telemetry Bar — 4 Stat Pillars */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 pt-6">
                <div className="flex items-center gap-3.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                        <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                        <div className="text-xl font-bold text-white tracking-tight">
                            {stats.total_courses}
                        </div>
                        <div className="text-xs text-zinc-400 font-medium">
                            Engineering Courses
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                        <Users className="w-4 h-4" />
                    </div>
                    <div>
                        <div className="text-xl font-bold text-white tracking-tight">
                            {stats.total_enrollments.toLocaleString()}
                        </div>
                        <div className="text-xs text-zinc-400 font-medium">
                            Active Learners
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                        <Hammer className="w-4 h-4" />
                    </div>
                    <div>
                        <div className="text-xl font-bold text-white tracking-tight">
                            {stats.total_assignments}
                        </div>
                        <div className="text-xs text-zinc-400 font-medium">
                            Build Capstones
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                        <Award className="w-4 h-4" />
                    </div>
                    <div>
                        <div className="text-xl font-bold text-white tracking-tight">
                            {stats.total_completions.toLocaleString()}
                        </div>
                        <div className="text-xs text-zinc-400 font-medium">
                            Verified Milestones
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
