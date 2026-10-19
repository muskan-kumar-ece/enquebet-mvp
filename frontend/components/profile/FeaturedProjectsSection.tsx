"use client";

import React from 'react';
import Link from 'next/link';
import {
    FolderGit2,
    ExternalLink,
    Github,
    ShieldCheck,
    Plus,
    Users,
    Layers,
    ArrowUpRight
} from 'lucide-react';

export interface FeaturedProject {
    id: string;
    title: string;
    description: string;
    role?: string;
    tech_stack?: string[];
    project_type?: 'personal' | 'collaborative' | 'verified_pow' | string;
    live_url?: string;
    repo_url?: string;
    linked_pow_code?: string;
}

interface FeaturedProjectsSectionProps {
    projects: FeaturedProject[];
    isOwner?: boolean;
    onAddProject?: () => void;
}

const TYPE_CONFIG: Record<string, { label: string; badge: string; icon: any }> = {
    verified_pow: {
        label: 'Verified PoW',
        badge: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-mono',
        icon: ShieldCheck
    },
    collaborative: {
        label: 'Collaborative Venture',
        badge: 'bg-[#1864ff]/10 border-[#1864ff]/30 text-[#4f8fff]',
        icon: Users
    },
    personal: {
        label: 'Personal Project',
        badge: 'bg-zinc-800/80 border-zinc-700 text-zinc-300',
        icon: FolderGit2
    }
};

export default function FeaturedProjectsSection({
    projects = [],
    isOwner,
    onAddProject
}: FeaturedProjectsSectionProps) {
    if (!projects || projects.length === 0) {
        return (
            <div className="w-full rounded-2xl border border-[#1e2230] bg-[#0d1017] p-6 mb-6 text-center">
                <div className="w-10 h-10 rounded-xl bg-[#141824] border border-[#23283a] flex items-center justify-center text-[#1864ff] mx-auto mb-3">
                    <FolderGit2 className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white mb-1">Featured Projects & Ventures</h3>
                <p className="text-xs text-zinc-400 max-w-md mx-auto mb-4 leading-relaxed">
                    Highlight active software systems, open source repos, or collaborative ventures built on ENQUEbet.
                </p>
                {isOwner && onAddProject && (
                    <button
                        onClick={onAddProject}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1864ff] hover:bg-[#2563eb] text-white text-xs font-semibold transition-colors shadow-sm"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Featured Project</span>
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="w-full mb-6">
            <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-2">
                    <FolderGit2 className="w-4 h-4 text-[#1864ff]" />
                    <h2 className="text-base font-bold text-white tracking-tight">Featured Projects & Ventures</h2>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#161a26] border border-[#23283a] text-zinc-300 font-mono">
                        {projects.length}
                    </span>
                </div>
                {isOwner && onAddProject && (
                    <button
                        onClick={onAddProject}
                        className="inline-flex items-center gap-1 text-xs text-[#4f8fff] hover:text-[#3b82f6] font-medium transition-colors"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Project</span>
                    </button>
                )}
            </div>

            {/* Responsive Projects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projects.map((proj) => {
                    const typeKey = (proj.project_type || 'personal').toLowerCase();
                    const typeMeta = TYPE_CONFIG[typeKey] || TYPE_CONFIG.personal;
                    const IconComp = typeMeta.icon;

                    return (
                        <div
                            key={proj.id}
                            className="group rounded-2xl border border-[#1e2230] bg-[#0d1017] hover:border-[#2e364f] p-5 transition-all flex flex-col justify-between shadow-sm"
                        >
                            <div>
                                {/* Type Badge & Role Header */}
                                <div className="flex items-center justify-between gap-2 mb-2.5">
                                    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-semibold ${typeMeta.badge}`}>
                                        <IconComp className="w-3 h-3" />
                                        <span>{typeMeta.label}</span>
                                    </div>
                                    {proj.role && (
                                        <span className="text-[11px] text-zinc-400 font-medium">
                                            {proj.role}
                                        </span>
                                    )}
                                </div>

                                {/* Project Title */}
                                <h3 className="text-sm font-bold text-white group-hover:text-[#4f8fff] transition-colors mb-1.5">
                                    {proj.title}
                                </h3>

                                {/* Project Description */}
                                <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed mb-4">
                                    {proj.description}
                                </p>
                            </div>

                            {/* Tech Stack & Links Footer */}
                            <div className="pt-3 border-t border-[#1e2230] space-y-3">
                                {/* Tech Tags */}
                                {proj.tech_stack && proj.tech_stack.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {proj.tech_stack.map((tech, idx) => (
                                            <span
                                                key={idx}
                                                className="text-[10px] px-2 py-0.5 rounded bg-[#161a26] text-zinc-300 border border-[#23283a] font-mono"
                                            >
                                                {tech}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Links bar */}
                                <div className="flex items-center justify-between gap-3 text-xs">
                                    <div className="flex items-center gap-3">
                                        {proj.repo_url && (
                                            <a
                                                href={proj.repo_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1 text-zinc-400 hover:text-white transition-colors"
                                            >
                                                <Github className="w-3.5 h-3.5" />
                                                <span>Code</span>
                                            </a>
                                        )}
                                        {proj.live_url && (
                                            <a
                                                href={proj.live_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1 text-[#4f8fff] hover:text-[#3b82f6] transition-colors font-medium"
                                            >
                                                <span>Live Demo</span>
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                        )}
                                    </div>

                                    {proj.linked_pow_code && (
                                        <Link
                                            href={`/proof/${proj.linked_pow_code}`}
                                            className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 hover:text-emerald-300"
                                        >
                                            <ShieldCheck className="w-3 h-3" />
                                            <span>PoW: {proj.linked_pow_code}</span>
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
