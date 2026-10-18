"use client";

import React from 'react';
import { 
    Info, Cpu, Server, Database, 
    ShieldCheck, Github, ExternalLink, Activity, 
    Sparkles, Terminal, Code2 
} from 'lucide-react';
import { BrandLogo, BrandMarkSvg } from '@/components/ui/BrandLogo';

export function AboutSection() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="border-b border-[#1e2335] pb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Info className="w-5 h-5 text-[#1864ff]" />
                    About ENQUEbet
                </h2>
                <p className="text-xs text-text-secondary mt-0.5">
                    Platform mission, technical architecture, cryptographic verification protocol, and system release information.
                </p>
            </div>

            {/* Brand Banner Card */}
            <div className="relative p-6 rounded-2xl bg-[#08090E] border border-[#1e2335] overflow-hidden">
                <div className="absolute inset-0 bg-blueprint-grid opacity-20 pointer-events-none" />

                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[#1864ff]/10 border border-[#1864ff]/25 flex items-center justify-center shrink-0">
                            <BrandMarkSvg size={28} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold text-white tracking-tight">ENQUEbet</h3>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1864ff]/15 text-[#1864ff] border border-[#1864ff]/30 font-mono font-bold">
                                    v1.2.0-beta
                                </span>
                            </div>
                            <p className="text-xs text-text-secondary mt-0.5">
                                Decentralized & Meritocratic Network for Verified Builders
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono font-semibold flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Production Nodes Operational
                        </span>
                    </div>
                </div>
            </div>

            {/* Mission Statement */}
            <div className="p-6 rounded-2xl bg-[#0b0d14] border border-[#1e2335] space-y-3">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                    Our Mission
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                    ENQUEbet replaces superficial résumé bullet points with authentic, cryptographic <strong>Proof of Work</strong>. Every delivered sprint, reviewed pull request, and teammate peer evaluation is cryptographically signed and publicly verifiable, empowering student engineers and founding teams to showcase authentic execution.
                </p>
            </div>

            {/* Technical Architecture Stack */}
            <div className="p-6 rounded-2xl bg-[#0b0d14] border border-[#1e2335] space-y-4">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                    Engineered Stack Architecture
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl bg-[#08090E] border border-[#1e2335] flex items-start gap-3">
                        <Code2 className="w-5 h-5 text-[#1864ff] shrink-0 mt-0.5" />
                        <div>
                            <span className="text-xs font-bold text-white block">Next.js 16 App Router</span>
                            <span className="text-[11px] text-text-secondary">
                                React 19, TypeScript, Tailwind CSS, Turbopack bundling
                            </span>
                        </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#08090E] border border-[#1e2335] flex items-start gap-3">
                        <Server className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                        <div>
                            <span className="text-xs font-bold text-white block">Django REST & Daphne ASGI</span>
                            <span className="text-[11px] text-text-secondary">
                                High-concurrency Python backend & real-time WebSockets
                            </span>
                        </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#08090E] border border-[#1e2335] flex items-start gap-3">
                        <Database className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                            <span className="text-xs font-bold text-white block">Neon Serverless PostgreSQL</span>
                            <span className="text-[11px] text-text-secondary">
                                Scalable relational database with transactional integrity
                            </span>
                        </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#08090E] border border-[#1e2335] flex items-start gap-3">
                        <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                            <span className="text-xs font-bold text-white block">SHA-256 Proof of Work Engine</span>
                            <span className="text-[11px] text-text-secondary">
                                Cryptographic project deliverable hashing & immutable audit log
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Open Source & Community Links */}
            <div className="p-6 rounded-2xl bg-[#0b0d14] border border-[#1e2335] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-sm font-bold text-white">Developer Resources & Community</h3>
                    <p className="text-xs text-text-secondary mt-0.5">
                        Explore our API contracts, contribute to open protocols, or join the builder community.
                    </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <a
                        href="https://github.com"
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-surface hover:bg-surface-hover border border-[#1e2335] text-white flex items-center gap-2 transition-all"
                    >
                        <Github className="w-3.5 h-3.5" />
                        <span>GitHub</span>
                        <ExternalLink className="w-3 h-3 text-text-secondary" />
                    </a>
                </div>
            </div>
        </div>
    );
}
