"use client";

import React from 'react';
import Link from 'next/link';
import { Star, MessageSquareQuote, ShieldCheck, ArrowUpRight } from 'lucide-react';

interface PeerEndorsement {
    id: string;
    reviewer_id: string;
    reviewer_name: string;
    reviewer_username: string;
    reviewer_avatar?: string;
    reviewer_tier?: string;
    project_title: string;
    proof_code: string;
    execution_score: number;
    collaboration_score: number;
    reliability_score: number;
    average_score: number;
    feedback: string;
    created_at: string;
}

interface PeerEndorsementWallProps {
    endorsements: PeerEndorsement[];
    averageRating?: number;
    totalCount?: number;
}

export default function PeerEndorsementWall({
    endorsements = [],
    averageRating = 0,
    totalCount = 0
}: PeerEndorsementWallProps) {
    if (!endorsements || endorsements.length === 0) {
        return (
            <div className="w-full rounded-2xl border border-[#1e2230] bg-[#0d1017] p-5 mb-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start sm:items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#141824] border border-[#23283a] flex items-center justify-center text-amber-400 shrink-0">
                            <Star className="w-5 h-5 fill-amber-400/20" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white">No Peer Endorsements Yet</h3>
                            <p className="text-xs text-zinc-400 mt-0.5">
                                Teammate reviews on ENQUEbet are unlocked strictly by verified collaborators upon completing workspace deliverables.
                            </p>
                        </div>
                    </div>
                    <div className="self-start sm:self-center shrink-0">
                        <Link
                            href="/collaboration"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141824] hover:bg-[#1a2030] text-zinc-200 border border-[#23283a] text-xs font-semibold transition-colors"
                        >
                            <span>Browse Workspaces</span>
                            <ArrowUpRight className="w-3.5 h-3.5 text-[#1864ff]" />
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full mb-6">
            <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400/20" />
                    <h2 className="text-base font-bold text-white tracking-tight">Verified Teammate Endorsements</h2>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 font-mono font-medium">
                        {totalCount || endorsements.length} Workspace Vouches
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {endorsements.map((review) => {
                    const reviewDate = new Date(review.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        year: 'numeric'
                    });

                    return (
                        <div
                            key={review.id}
                            className="rounded-2xl border border-[#1e2230] bg-[#0d1017] hover:border-[#2e364f] p-5 transition-all flex flex-col justify-between shadow-sm"
                        >
                            {/* Reviewer Header */}
                            <div>
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <div className="flex items-center gap-3">
                                        <Link href={`/profile/${review.reviewer_id}`} className="shrink-0">
                                            <div className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br from-[#1864ff] to-[#0f4bcc] border border-white/10 flex items-center justify-center text-sm font-bold text-white">
                                                {review.reviewer_avatar ? (
                                                    <img
                                                        src={review.reviewer_avatar}
                                                        alt={review.reviewer_name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    (review.reviewer_name || 'R')[0].toUpperCase()
                                                )}
                                            </div>
                                        </Link>
                                        <div>
                                            <Link
                                                href={`/profile/${review.reviewer_id}`}
                                                className="text-sm font-bold text-white hover:text-[#4f8fff] transition-colors line-clamp-1"
                                            >
                                                {review.reviewer_name}
                                            </Link>
                                            <div className="flex items-center gap-2 text-xs text-zinc-500">
                                                <span>@{review.reviewer_username}</span>
                                                {review.reviewer_tier && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="text-[#4f8fff] font-medium">
                                                            {review.reviewer_tier}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Score Pill */}
                                    <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-bold shrink-0">
                                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                        <span>{review.average_score.toFixed(1)}</span>
                                    </div>
                                </div>

                                {/* Project Context Pill */}
                                <div className="mb-3">
                                    <div className="inline-flex items-center gap-1.5 text-[11px] text-zinc-400 bg-white/[0.03] border border-white/[0.06] px-2.5 py-1 rounded-lg">
                                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                        <span>Delivered together on</span>
                                        <span className="font-semibold text-zinc-200 truncate max-w-[150px]">
                                            {review.project_title}
                                        </span>
                                    </div>
                                </div>

                                {/* Testimonial Quote */}
                                <p className="text-xs text-zinc-300 leading-relaxed italic mb-4">
                                    "{review.feedback || 'Outstanding builder. Consistently shipped high-integrity deliverables on time with exceptional communication.'}"
                                </p>
                            </div>

                            {/* 3D Attribute Meters & Proof Link */}
                            <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px]">
                                <div className="flex items-center gap-3 text-zinc-400">
                                    <div>
                                        <span className="text-zinc-500">Exec: </span>
                                        <span className="text-zinc-200 font-bold">{review.execution_score}★</span>
                                    </div>
                                    <div>
                                        <span className="text-zinc-500">Collab: </span>
                                        <span className="text-zinc-200 font-bold">{review.collaboration_score}★</span>
                                    </div>
                                    <div>
                                        <span className="text-zinc-500">Rel: </span>
                                        <span className="text-zinc-200 font-bold">{review.reliability_score}★</span>
                                    </div>
                                </div>

                                <Link
                                    href={`/proof/${review.proof_code}`}
                                    className="inline-flex items-center gap-1 text-xs text-[#4f8fff] hover:text-[#3b82f6] transition-colors font-medium"
                                >
                                    <span>PoW</span>
                                    <ArrowUpRight className="w-3 h-3" />
                                </Link>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
