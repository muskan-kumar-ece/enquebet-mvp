'use client';

import React from 'react';
import Link from 'next/link';
import {
    Cpu,
    Github,
    ExternalLink,
    Quote,
    Users,
    Eye,
    BookOpen
} from 'lucide-react';
import { ResearchPaper } from '@/lib/researchData';

interface ResearchCardProps {
    paper: ResearchPaper;
    onSelect: (paper: ResearchPaper) => void;
    onCite: (paper: ResearchPaper, e: React.MouseEvent) => void;
    onJoinLab: (paper: ResearchPaper, e: React.MouseEvent) => void;
    onApprove?: (paper: ResearchPaper) => void;
    onReject?: (paper: ResearchPaper) => void;
    isAdmin?: boolean;
}

export default function ResearchCard({
    paper,
    onSelect,
    onCite,
    onJoinLab,
    onApprove,
    onReject,
    isAdmin,
}: ResearchCardProps) {
    const isPending = paper.status === 'PENDING_APPROVAL';
    const isRejected = paper.status === 'REJECTED';
    const isReproduced = paper.status === 'REPRODUCED';
    const isPeerReviewed = paper.status === 'PEER_REVIEWED';
    const hasHardwareBOM = Array.isArray(paper.hardware_bom) && paper.hardware_bom.length > 0;
    const author = paper.primary_author;
    const authorProfileUrl = author?.id ? `/profile/${author.id}` : '#';
    const hasOpenRoles = Array.isArray(paper.open_collaborator_roles) && paper.open_collaborator_roles.length > 0;

    return (
        <div
            onClick={() => onSelect(paper)}
            className="group relative flex flex-col justify-between rounded-xl border border-[#1b1e2c] bg-[#0c0d15] hover:border-[#2a2f45] hover:bg-[#0f111a] p-5 sm:p-6 transition-all duration-150 cursor-pointer shadow-sm"
        >
            {/* Top Row: Paper Code, Discipline, Status */}
            <div>
                <div className="flex items-center justify-between gap-2 mb-3.5">
                    <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-medium px-2 py-0.5 rounded bg-white/[0.04] text-zinc-300 border border-white/[0.06]">
                            {paper.paper_code}
                        </span>
                        <span className="text-xs text-zinc-400 font-medium">
                            {paper.field_display || paper.field}
                        </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs">
                        {isPending ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                <span>Pending Approval</span>
                            </span>
                        ) : isRejected ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/10 text-rose-400 border border-rose-500/30">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                                <span>Rejected</span>
                            </span>
                        ) : isReproduced ? (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                <span>Reproduced</span>
                            </span>
                        ) : isPeerReviewed ? (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-blue-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                <span>Peer Reviewed</span>
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                                <span>Preprint</span>
                            </span>
                        )}
                    </div>
                </div>

                {/* Paper Title */}
                <h3 className="text-base font-semibold text-white group-hover:text-blue-400 transition-colors line-clamp-2 mb-2 leading-snug">
                    {paper.title}
                </h3>

                {/* Abstract Preview */}
                <p className="text-xs text-zinc-400 line-clamp-3 mb-4 leading-relaxed">
                    {paper.abstract}
                </p>

                {/* Author Info */}
                <div
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-2.5 pb-3.5 mb-3.5 border-b border-[#1b1e2c]"
                >
                    <Link
                        href={authorProfileUrl}
                        className="relative flex-shrink-0 group/author"
                    >
                        <img
                            src={author?.profile_image || `https://api.dicebear.com/7.x/identicon/svg?seed=${author?.username || 'researcher'}`}
                            alt={author?.full_name || author?.username}
                            className="w-7 h-7 rounded-full border border-white/10 object-cover group-hover/author:border-blue-400 transition"
                        />
                    </Link>
                    <div className="min-w-0 flex-1 text-xs">
                        <Link
                            href={authorProfileUrl}
                            className="font-medium text-zinc-200 hover:text-white transition truncate block"
                        >
                            {author?.full_name || author?.username}
                        </Link>
                        <div className="text-[11px] text-zinc-500 truncate flex items-center gap-1.5">
                            {author?.college && <span>{author.college}</span>}
                            {author?.campus_domain && (
                                <span className="font-mono text-[10px] text-zinc-400">
                                    @{author.campus_domain}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Living Artifact Badges — Refined Minimalist Tokens */}
                <div className="flex flex-wrap items-center gap-1.5 mb-4">
                    {hasHardwareBOM && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/[0.03] text-zinc-300 border border-[#1b1e2c] text-[11px] font-medium">
                            <Cpu className="w-3 h-3 text-blue-400" />
                            <span>VenopAI BOM ({paper.hardware_bom.length} parts)</span>
                        </span>
                    )}

                    {paper.code_repo_url && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/[0.03] text-zinc-300 border border-[#1b1e2c] text-[11px] font-medium">
                            <Github className="w-3 h-3 text-zinc-400" />
                            <span>Code</span>
                        </span>
                    )}

                    {paper.live_demo_url && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/[0.03] text-zinc-300 border border-[#1b1e2c] text-[11px] font-medium">
                            <ExternalLink className="w-3 h-3 text-zinc-400" />
                            <span>Demo</span>
                        </span>
                    )}

                    {paper.reproducibility_score > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/[0.03] text-zinc-300 border border-[#1b1e2c] text-[11px] font-mono">
                            <span>Score: {paper.reproducibility_score.toFixed(1)}/5.0</span>
                        </span>
                    )}
                </div>

                {/* Open Collaboration Positions if any */}
                {hasOpenRoles && (
                    <div className="p-2.5 rounded-lg bg-white/[0.02] border border-[#1b1e2c] mb-4">
                        <div className="flex items-center justify-between text-[11px] font-medium text-zinc-300 mb-1.5">
                            <span className="flex items-center gap-1.5">
                                <Users className="w-3 h-3 text-blue-400" />
                                <span>Seeking Lab Peers</span>
                            </span>
                            <span className="text-[10px] text-zinc-500">
                                {paper.open_collaborator_roles.length} roles open
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {paper.open_collaborator_roles.slice(0, 2).map((role, idx) => (
                                <span
                                    key={idx}
                                    className="px-2 py-0.5 rounded text-[10px] font-medium bg-white/[0.04] text-zinc-300 border border-white/[0.06]"
                                >
                                    {role}
                                </span>
                            ))}
                            {paper.open_collaborator_roles.length > 2 && (
                                <span className="text-[10px] text-zinc-500 self-center">
                                    +{paper.open_collaborator_roles.length - 2} more
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Actions Row */}
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#1b1e2c] text-xs">
                <div className="flex items-center gap-3 text-zinc-400 text-[11px]">
                    <span className="flex items-center gap-1" title="Views">
                        <Eye className="w-3.5 h-3.5 text-zinc-500" />
                        {paper.views_count}
                    </span>
                    <span className="flex items-center gap-1" title="Citations">
                        <Quote className="w-3.5 h-3.5 text-zinc-500" />
                        {paper.citations_count}
                    </span>
                </div>

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {isAdmin && isPending && onApprove && onReject && (
                        <>
                            <button
                                onClick={() => onApprove(paper)}
                                title="Approve & Publish Preprint"
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-black font-semibold text-xs transition"
                            >
                                Approve
                            </button>
                            <button
                                onClick={() => onReject(paper)}
                                title="Reject with Feedback"
                                className="px-2.5 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 hover:bg-rose-500 hover:text-white font-semibold text-xs transition"
                            >
                                Reject
                            </button>
                        </>
                    )}

                    <button
                        onClick={(e) => onCite(paper, e)}
                        className="p-1.5 rounded-lg border border-[#1b1e2c] bg-white/[0.02] hover:bg-white/[0.06] text-zinc-400 hover:text-white transition"
                        title="Copy BibTeX Citation"
                    >
                        <Quote className="w-3.5 h-3.5" />
                    </button>

                    {hasOpenRoles && (
                        <button
                            onClick={(e) => onJoinLab(paper, e)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#1b1e2c] bg-white/[0.03] hover:bg-white/[0.07] text-zinc-300 hover:text-white font-medium text-xs transition"
                        >
                            <Users className="w-3 h-3 text-blue-400" />
                            <span>Join Lab</span>
                        </button>
                    )}

                    <Link
                        href={`/research/${paper.slug || paper.paper_code}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1864ff] hover:bg-[#1554d6] text-white font-semibold text-xs transition"
                    >
                        <BookOpen className="w-3 h-3" />
                        <span>Read</span>
                    </Link>
                </div>
            </div>
        </div>
    );
}
