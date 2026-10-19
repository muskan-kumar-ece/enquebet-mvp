'use client';

import React from 'react';
import {
    Plus,
    ArrowUpRight,
    FileText,
    ShieldCheck,
    Cpu,
    Users
} from 'lucide-react';

interface ResearchHeaderProps {
    totalPapers: number;
    totalReproduced: number;
    hardwareBomPapers: number;
    openCallsCount: number;
    onOpenPublish: () => void;
}

export default function ResearchHeader({
    totalPapers,
    totalReproduced,
    hardwareBomPapers,
    openCallsCount,
    onOpenPublish,
}: ResearchHeaderProps) {
    return (
        <section className="mb-8 rounded-2xl border border-[#1b1e2c] bg-[#0c0d15] p-6 lg:p-8 transition-colors">
            {/* Top Row: Eyebrow, Title, Subtitle & Actions */}
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 pb-6 border-b border-[#1b1e2c]">
                <div className="max-w-2xl">
                    <div className="inline-flex items-center gap-2 mb-3">
                        <span className="font-mono text-[11px] font-semibold text-zinc-400 tracking-wider uppercase px-2.5 py-1 rounded bg-white/[0.04] border border-white/[0.06]">
                            Open Science · Living Preprints
                        </span>
                        <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Peer Audit Active
                        </span>
                    </div>

                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white mb-2.5">
                        Verifiable Research & Executable Preprints
                    </h1>

                    <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-xl">
                        Open-access papers paired with reproducible code repositories, verified
                        VenopAI hardware component lists, and collaborative lab workspaces.
                    </p>
                </div>

                {/* Primary & Secondary Actions */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full lg:w-auto self-start">
                    <button
                        onClick={onOpenPublish}
                        className="btn-brand flex-1 sm:flex-none inline-flex items-center justify-center gap-2 text-xs font-semibold px-4 py-2.5"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Publish Paper</span>
                    </button>
                    <a
                        href="https://venopai.in?ref=enquebet_research"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-outline inline-flex items-center justify-center gap-1.5 text-xs font-medium px-3.5 py-2.5"
                        title="Browse electronic components on VenopAI"
                    >
                        <span>VenopAI Hardware</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-zinc-400" />
                    </a>
                </div>
            </div>

            {/* Architecture Telemetry Bar — Unified, High-Rigor Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
                <div className="flex items-center gap-3.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <div className="p-2 rounded-lg bg-white/[0.04] text-zinc-300">
                        <FileText className="w-4 h-4 text-zinc-300" />
                    </div>
                    <div>
                        <div className="text-xl font-bold text-white tracking-tight">
                            {totalPapers}
                        </div>
                        <div className="text-xs text-zinc-400 font-medium">
                            Published Preprints
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                        <div className="text-xl font-bold text-white tracking-tight">
                            {totalReproduced}
                        </div>
                        <div className="text-xs text-zinc-400 font-medium">
                            Reproduced Papers
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <div className="p-2 rounded-lg bg-[#1864ff]/10 text-blue-400">
                        <Cpu className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                        <div className="text-xl font-bold text-white tracking-tight">
                            {hardwareBomPapers}
                        </div>
                        <div className="text-xs text-zinc-400 font-medium">
                            Hardware BOMs
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <div className="p-2 rounded-lg bg-white/[0.04] text-zinc-300">
                        <Users className="w-4 h-4 text-zinc-300" />
                    </div>
                    <div>
                        <div className="text-xl font-bold text-white tracking-tight">
                            {openCallsCount}
                        </div>
                        <div className="text-xs text-zinc-400 font-medium">
                            Open Lab Calls
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
