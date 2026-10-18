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
            <div className="w-full rounded-3xl border border-white/[0.08] bg-[#0c0c14]/90 backdrop-blur-xl p-8 mb-8 text-center shadow-xl">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 mx-auto mb-4">
                    <Star className="w-7 h-7 fill-amber-400/20" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">No Peer Endorsements Yet</h3>
                <p className="text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
                    Peer reviews on ENQUEbet cannot be faked or click-traded. They are unlocked strictly by teammates upon completing real workspace deliverables.
                </p>
            </div>
        );
    }

    return (
        <div className="w-full mb-8">
            <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-2.5">
                    <Star className="w-5 h-5 text-amber-400 fill-amber-400/20" />
                    <h2 className="text-lg font-bold text-white tracking-tight">Verified Teammate Endorsements</h2>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono font-medium">
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
                            className="rounded-2xl border border-white/[0.08] bg-[#0f0f18]/90 backdrop-blur-xl p-5 hover:border-white/20 transition-all flex flex-col justify-between"
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
