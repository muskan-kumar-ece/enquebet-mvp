"use client";

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, ExternalLink, GitBranch, Layers, CheckCircle2, Users, ArrowUpRight } from 'lucide-react';

interface PinnedProof {
    id: string;
    verification_code: string;
    summary: string;
    content_hash: string;
    minted_at: string;
    workspace_id: string;
    project_title: string;
    project_caption?: string;
    contributors?: Array<{
        user_id?: string;
        username?: string;
        name?: string;
        role?: string;
        deliverables_approved?: number;
    }>;
    deliverables_count?: number;
    tasks_count?: number;
}

interface PinnedProofSectionProps {
    proofs: PinnedProof[];
    isOwner?: boolean;
    onManagePins?: () => void;
}

export default function PinnedProofSection({ proofs = [], isOwner, onManagePins }: PinnedProofSectionProps) {
    if (!proofs || proofs.length === 0) {
        return (
            <div className="w-full rounded-3xl border border-white/[0.08] bg-[#0c0c14]/90 backdrop-blur-xl p-8 mb-8 text-center shadow-xl">
                <div className="w-14 h-14 rounded-2xl bg-[#1864ff]/10 border border-[#1864ff]/25 flex items-center justify-center text-[#4f8fff] mx-auto mb-4">
                    <ShieldCheck className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">No Pinned Proofs of Work Yet</h3>
                <p className="text-sm text-zinc-400 max-w-md mx-auto mb-5 leading-relaxed">
                    Cryptographic Proof of Work tokens (<span className="text-[#4f8fff] font-mono">ENQ-2026-XXXX</span>) are minted automatically upon verified workspace completion.
                </p>
                {isOwner && (
                    <button
                        onClick={onManagePins}
                        className="btn-brand inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold"
                    >
                        <span>Select Pinned Proofs</span>
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="w-full mb-8">
            <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    <h2 className="text-lg font-bold text-white tracking-tight">Pinned Proofs of Work</h2>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono font-medium">
                        Cryptographically Verified
                    </span>
                </div>
                {isOwner && onManagePins && (
                    <button
                        onClick={onManagePins}
                        className="text-xs text-[#4f8fff] hover:text-[#3b82f6] transition-colors font-medium"
                    >
                        Customize Pins
                    </button>
                )}
            </div>

            {/* Bento Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {proofs.map((proof) => {
                    const shortHash = proof.content_hash
                        ? `${proof.content_hash.slice(0, 8)}...${proof.content_hash.slice(-6)}`
                        : 'SHA-256 Validated';
                    const mintedDate = new Date(proof.minted_at).toLocaleDateString(undefined, {
                        month: 'short',
                        year: 'numeric'
                    });

                    return (
                        <div
                            key={proof.id}
                            className="group relative rounded-2xl border border-white/[0.08] bg-[#0f0f18]/90 hover:border-[#1864ff]/40 backdrop-blur-xl p-5 transition-all duration-200 hover:shadow-xl flex flex-col justify-between"
                        >
                            {/* Top Badge & Hash Bar */}
                            <div>
                                <div className="flex items-center justify-between gap-2 mb-3">
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-mono text-xs font-semibold">
                                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                        <span>{proof.verification_code}</span>
                                    </div>
                                    <span className="text-[11px] font-mono text-zinc-500">{mintedDate}</span>
                                </div>

                                {/* Project Title */}
                                <h3 className="text-base font-bold text-white group-hover:text-[#4f8fff] transition-colors line-clamp-1 mb-1.5">
                                    {proof.project_title}
                                </h3>

                                {/* Summary */}
                                <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed mb-4">
                                    {proof.summary || proof.project_caption || 'Verified collaborative venture milestone delivered on ENQUEbet.'}
                                </p>
                            </div>

                            {/* Metrics & Teammates Footer */}
                            <div className="pt-3 border-t border-white/[0.06] space-y-3">
                                <div className="flex items-center justify-between text-xs text-zinc-400">
                                    <div className="flex items-center gap-3">
                                        {proof.deliverables_count !== undefined && (
                                            <span className="inline-flex items-center gap-1 text-zinc-300">
                                                <Layers className="w-3.5 h-3.5 text-sky-400" />
                                                <span>{proof.deliverables_count} Deliverables</span>
                                            </span>
                                        )}
                                        {proof.tasks_count !== undefined && (
                                            <span className="inline-flex items-center gap-1 text-zinc-300">
                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                                <span>{proof.tasks_count} Tasks</span>
                                            </span>
                                        )}
                                    </div>

                                    {/* Hash Fingerprint */}
                                    <span className="font-mono text-[10px] text-zinc-400 hidden sm:inline" title={proof.content_hash}>
                                        {shortHash}
                                    </span>
                                </div>

                                {/* Collaborator Facepile & CTA */}
                                <div className="flex items-center justify-between gap-2">
                                    {proof.contributors && proof.contributors.length > 0 ? (
                                        <div className="flex items-center gap-1.5">
                                            <div className="flex -space-x-1.5 overflow-hidden">
                                                {proof.contributors.slice(0, 4).map((c, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="w-6 h-6 rounded-full border-2 border-[#0f0f18] bg-[#1864ff]/20 flex items-center justify-center text-[10px] font-bold text-[#4f8fff]"
                                                        title={`${c.name || c.username} (${c.role || 'Contributor'})`}
                                                    >
                                                        {(c.name || c.username || 'C')[0].toUpperCase()}
                                                    </div>
                                                ))}
                                            </div>
                                            <span className="text-[11px] text-zinc-400">
                                                {proof.contributors.length} builder{proof.contributors.length > 1 ? 's' : ''}
                                            </span>
                                        </div>
                                    ) : (
                                        <div />
                                    )}

                                    <Link
                                        href={`/proof/${proof.verification_code}`}
                                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#4f8fff] hover:text-[#3b82f6] transition-colors"
                                    >
                                        <span>Verify Proof</span>
                                        <ArrowUpRight className="w-3.5 h-3.5" />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
