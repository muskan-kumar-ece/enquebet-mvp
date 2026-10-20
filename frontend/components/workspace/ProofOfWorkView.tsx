"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { 
    CheckCircle2, Copy, 
    Check, ExternalLink, Star, Users, 
    Share2, Send
} from 'lucide-react';
import toast from 'react-hot-toast';
import { BrandMarkSvg } from '@/components/ui/BrandLogo';

interface ProofOfWorkViewProps {
    proof: any;
    workspace: any;
    members: any[];
    onSubmitPeerReview: (e: React.FormEvent) => void;
    peerRevieweeId: string;
    setPeerRevieweeId: (val: string) => void;
    peerExecScore: number;
    setPeerExecScore: (val: number) => void;
    peerCollabScore: number;
    setPeerCollabScore: (val: number) => void;
    peerRelScore: number;
    setPeerRelScore: (val: number) => void;
    peerFeedback: string;
    setPeerFeedback: (val: string) => void;
    submittingPeerReview: boolean;
    currentUserId?: string;
}

export function ProofOfWorkView({
    proof,
    workspace,
    members,
    onSubmitPeerReview,
    peerRevieweeId,
    setPeerRevieweeId,
    peerExecScore,
    setPeerExecScore,
    peerCollabScore,
    setPeerCollabScore,
    peerRelScore,
    setPeerRelScore,
    peerFeedback,
    setPeerFeedback,
    submittingPeerReview,
    currentUserId
}: ProofOfWorkViewProps) {
    const [copiedHash, setCopiedHash] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);

    if (!proof) {
        return (
            <div className="p-12 text-center rounded-2xl bg-[#0b0d14] border border-[#1e2335] max-w-xl mx-auto">
                <div className="w-12 h-12 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center mx-auto mb-3">
                    <BrandMarkSvg size={24} />
                </div>
                <h3 className="text-base font-bold text-white mb-2">Proof of Work Pending</h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                    Once the sprint tasks are fully delivered and reviewed, the project owner can complete the sprint to mint an immutable Proof of Work cryptographic certificate.
                </p>
            </div>
        );
    }

    const handleCopyHash = () => {
        if (proof.content_hash) {
            navigator.clipboard.writeText(proof.content_hash);
            setCopiedHash(true);
            toast.success('SHA-256 hash copied to clipboard');
            setTimeout(() => setCopiedHash(false), 2000);
        }
    };

    const handleCopyShareLink = () => {
        const url = `${window.location.origin}/proof/${proof.verification_code}`;
        navigator.clipboard.writeText(url);
        setCopiedLink(true);
        toast.success('Public verification link copied!');
        setTimeout(() => setCopiedLink(false), 2000);
    };

    const eligiblePeerReviewees = members.filter(m => m.user?.id !== currentUserId && m.status === 'active');
    const existingPeerReviews = proof.peer_reviews || [];

    return (
        <div className="w-full max-w-4xl mx-auto space-y-8 pb-16">
            {/* Holographic Certificate Card */}
            <div className="relative p-8 rounded-2xl bg-[#08090E] border border-emerald-500/30 overflow-hidden shadow-xl">
                {/* Tactical grid background */}
                <div className="absolute inset-0 bg-blueprint-grid opacity-25 pointer-events-none" />

                {/* Certificate Content */}
                <div className="relative z-10 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1e2335] pb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                                <BrandMarkSvg size={24} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400">
                                        Cryptographic Proof of Work
                                    </span>
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
                                        SHA-256
                                    </span>
                                </div>
                                <h2 className="text-xl font-bold text-white tracking-tight">
                                    {workspace?.post?.title || 'Delivered Project'}
                                </h2>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleCopyShareLink}
                                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-surface hover:bg-surface-hover border border-border text-white flex items-center gap-1.5 transition-all shadow-sm"
                            >
                                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                                <span>{copiedLink ? 'Copied Link!' : 'Share Proof'}</span>
                            </button>

                            <Link
                                href={`/proof/${proof.verification_code}`}
                                target="_blank"
                                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5 transition-all"
                            >
                                <span>Public Certificate</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                    </div>

                    {/* Verification Code & Metadata */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-surface/50 border border-border/50">
                            <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider block mb-1">
                                Verification Certificate ID
                            </span>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-mono font-bold text-emerald-400">
                                    {proof.verification_code}
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold flex items-center gap-1">
                                    <CheckCircle2 className="w-2.5 h-2.5" />
                                    Verified
                                </span>
                            </div>
                        </div>

                        <div className="p-4 rounded-xl bg-surface/50 border border-border/50">
                            <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider block mb-1">
                                Cryptographic Content Hash (SHA-256)
                            </span>
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-mono text-slate-300 truncate max-w-[200px]">
                                    {proof.content_hash || 'SHA-256 Hash Generated'}
                                </span>
                                <button
                                    onClick={handleCopyHash}
                                    className="p-1 rounded hover:bg-surface text-text-secondary hover:text-white transition-colors"
                                    title="Copy SHA-256 Hash"
                                >
                                    {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Summary */}
                    {proof.summary && (
                        <div className="p-4 rounded-xl bg-surface/40 border border-border/40 text-xs text-slate-300 leading-relaxed">
                            {proof.summary}
                        </div>
                    )}

                    {/* Team Snapshot */}
                    <div>
                        <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5" />
                            Verified Team Builders
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {members.filter(m => m.status === 'active').map((m: any) => (
                                <div key={m.id} className="p-2.5 rounded-lg bg-[#0f111a] border border-[#1e2335] flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full bg-brand/10 text-brand font-bold text-xs flex items-center justify-center border border-brand/20">
                                        {m.user?.username?.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <span className="text-xs font-semibold text-white truncate block">
                                            @{m.user?.username}
                                        </span>
                                        <span className="text-[10px] text-text-secondary capitalize">
                                            {m.role}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Peer Review Evaluation Section */}
            <div className="p-6 rounded-2xl bg-[#0b0d14] border border-[#1e2335] space-y-6">
                <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-amber-400" />
                    <div>
                        <h3 className="text-sm font-bold text-white">
                            Teammate Peer Evaluations
                        </h3>
                        <p className="text-xs text-text-secondary">
                            Evaluate team builders across Execution, Collaboration, and Reliability to power authentic reputation.
                        </p>
                    </div>
                </div>

                {eligiblePeerReviewees.length > 0 && (
                    <form onSubmit={onSubmitPeerReview} className="p-5 rounded-xl bg-[#0f111a] border border-[#1e2335] space-y-4">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                            Record Builder Evaluation
                        </h4>

                        <div>
                            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                                Select Teammate to Review
                            </label>
                            <select
                                value={peerRevieweeId}
                                onChange={(e) => setPeerRevieweeId(e.target.value)}
                                className="w-full text-xs px-3 py-2 rounded-lg bg-surface border border-border text-white focus:outline-none focus:ring-1 focus:ring-brand cursor-pointer"
                            >
                                <option value="">Choose a teammate...</option>
                                {eligiblePeerReviewees.map((m: any) => (
                                    <option key={m.user?.id} value={m.user?.id}>
                                        @{m.user?.username} ({m.role_title || m.role})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* 3 Rating Sliders */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                            <div>
                                <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1">
                                    <span>Execution</span>
                                    <span className="text-brand font-bold">{peerExecScore} / 10</span>
                                </div>
                                <input
                                    type="range"
                                    min="1"
                                    max="10"
                                    value={peerExecScore}
                                    onChange={(e) => setPeerExecScore(Number(e.target.value))}
                                    className="w-full accent-brand cursor-pointer"
                                />
                            </div>

                            <div>
                                <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1">
                                    <span>Collaboration</span>
                                    <span className="text-sky-400 font-bold">{peerCollabScore} / 10</span>
                                </div>
                                <input
                                    type="range"
                                    min="1"
                                    max="10"
                                    value={peerCollabScore}
                                    onChange={(e) => setPeerCollabScore(Number(e.target.value))}
                                    className="w-full accent-sky-500 cursor-pointer"
                                />
                            </div>

                            <div>
                                <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1">
                                    <span>Reliability</span>
                                    <span className="text-emerald-400 font-bold">{peerRelScore} / 10</span>
                                </div>
                                <input
                                    type="range"
                                    min="1"
                                    max="10"
                                    value={peerRelScore}
                                    onChange={(e) => setPeerRelScore(Number(e.target.value))}
                                    className="w-full accent-emerald-500 cursor-pointer"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                                Qualitative Feedback Note
                            </label>
                            <textarea
                                rows={2}
                                value={peerFeedback}
                                onChange={(e) => setPeerFeedback(e.target.value)}
                                placeholder="Constructive assessment of contributions, code quality, and teamwork..."
                                className="w-full text-xs px-3 py-2 rounded-lg bg-surface border border-border text-white placeholder-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-brand resize-none"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={submittingPeerReview || !peerRevieweeId}
                            className="btn-brand py-2 px-4 text-xs font-semibold rounded-lg disabled:opacity-50 text-white flex items-center justify-center gap-1.5 transition-all"
                        >
                            <Send className="w-3.5 h-3.5" />
                            <span>{submittingPeerReview ? 'Recording...' : 'Submit Teammate Evaluation'}</span>
                        </button>
                    </form>
                )}

                {/* Existing Peer Reviews Display */}
                {existingPeerReviews.length > 0 && (
                    <div className="space-y-3 pt-2">
                        <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                            Recorded Peer Reviews ({existingPeerReviews.length})
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {existingPeerReviews.map((pr: any) => (
                                <div key={pr.id} className="p-3.5 rounded-xl bg-[#0f111a] border border-[#1e2335] space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-bold text-white">
                                            @{pr.reviewer?.username} → @{pr.reviewee?.username}
                                        </span>
                                        <span className="text-[10px] text-text-secondary">
                                            {new Date(pr.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-[11px] text-text-secondary font-medium">
                                        <span>Exec: <strong className="text-brand">{pr.execution_score}</strong>/10</span>
                                        <span>Collab: <strong className="text-sky-400">{pr.collaboration_score}</strong>/10</span>
                                        <span>Reliab: <strong className="text-emerald-400">{pr.reliability_score}</strong>/10</span>
                                    </div>
                                    {pr.feedback && (
                                        <p className="text-xs text-slate-300 italic pt-1 border-t border-border/30">
                                            "{pr.feedback}"
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
