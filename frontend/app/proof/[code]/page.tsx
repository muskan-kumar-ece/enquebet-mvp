"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
    ShieldCheck, Award, Users, CheckCircle2, Copy, 
    Check, ExternalLink, Calendar, Star, FileText, ArrowLeft 
} from 'lucide-react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

export default function PublicProofPage() {
    const params = useParams();
    const code = params.code as string;
    const [proof, setProof] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copiedHash, setCopiedHash] = useState(false);
    const [copiedUrl, setCopiedUrl] = useState(false);

    useEffect(() => {
        if (code) {
            fetchProof();
        }
    }, [code]);

    const fetchProof = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await api.getPublicProof(code);
            setProof(data);
        } catch (err: any) {
            setError(err.message || 'Proof credential not found or invalid.');
        } finally {
            setLoading(false);
        }
    };

    const handleCopyHash = () => {
        if (!proof?.content_hash) return;
        navigator.clipboard.writeText(proof.content_hash);
        setCopiedHash(true);
        toast.success('SHA-256 hash copied!');
        setTimeout(() => setCopiedHash(false), 2000);
    };

    const handleCopyShareUrl = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopiedUrl(true);
        toast.success('Certificate URL copied!');
        setTimeout(() => setCopiedUrl(false), 2000);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-text-secondary animate-pulse flex items-center gap-2">
                    <ShieldCheck className="w-6 h-6 text-green-400 animate-spin" />
                    <span>Verifying Proof of Work credential...</span>
                </div>
            </div>
        );
    }

    if (error || !proof) {
        return (
            <div className="min-h-screen p-6 flex items-center justify-center">
                <div className="card text-center py-12 max-w-md border-red-500/30">
                    <Award className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-30" />
                    <h2 className="text-xl font-bold text-text-primary mb-2">Credential Not Found</h2>
                    <p className="text-text-secondary text-sm mb-6">
                        {error || 'The requested Proof of Work credential could not be verified on the ENQUEbet ledger.'}
                    </p>
                    <Link href="/" className="btn-primary">
                        Return to Discovery
                    </Link>
                </div>
            </div>
        );
    }

    const team = proof.metadata_snapshot?.team || [];
    const completedTasksCount = proof.metadata_snapshot?.completed_tasks_count || 0;
    const projectTitle = proof.metadata_snapshot?.post_title || 'Builder Project';
    const peerReviews = proof.peer_reviews || [];

    // Calculate averages
    const avgExec = peerReviews.length > 0 
        ? (peerReviews.reduce((acc: number, r: any) => acc + (r.execution_score || 5), 0) / peerReviews.length).toFixed(1)
        : null;
    const avgCollab = peerReviews.length > 0
        ? (peerReviews.reduce((acc: number, r: any) => acc + (r.collaboration_score || 5), 0) / peerReviews.length).toFixed(1)
        : null;
    const avgRel = peerReviews.length > 0
        ? (peerReviews.reduce((acc: number, r: any) => acc + (r.reliability_score || 5), 0) / peerReviews.length).toFixed(1)
        : null;

    return (
        <div className="min-h-screen p-4 sm:p-6 pb-24">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Navigation */}
                <div className="flex items-center justify-between text-sm">
                    <Link 
                        href="/" 
                        className="flex items-center gap-1.5 text-text-muted hover:text-text-primary transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>ENQUEbet Verification Ledger</span>
                    </Link>

                    <button
                        onClick={handleCopyShareUrl}
                        className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3"
                    >
                        {copiedUrl ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedUrl ? 'Copied' : 'Share Certificate'}</span>
                    </button>
                </div>

                {/* Master Credential Card */}
                <div className="card border-green-500/40 bg-gradient-to-b from-green-500/10 via-bg-card to-bg-card p-6 sm:p-8 space-y-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/5 rounded-full blur-3xl pointer-events-none" />

                    {/* Header Badge */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-14 h-14 rounded-2xl bg-green-500/10 border border-green-500/30 flex items-center justify-center text-green-400 shadow-inner">
                                <ShieldCheck className="w-8 h-8" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold uppercase tracking-wider text-green-400">
                                        Cryptographically Verified
                                    </span>
                                    <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.2 rounded-full font-mono">
                                        SHA-256
                                    </span>
                                </div>
                                <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary mt-0.5">
                                    Proof of Work Credential
                                </h1>
                            </div>
                        </div>

                        <div className="text-right sm:self-center">
                            <span className="text-xs text-text-muted">Verification ID</span>
                            <p className="font-mono text-base font-bold text-purple-light">{proof.verification_code}</p>
                        </div>
                    </div>

                    {/* Project & Summary */}
                    <div className="space-y-2 pt-4 border-t border-border-default/60">
                        <span className="text-xs uppercase text-text-muted font-medium">Delivered Venture</span>
                        <h2 className="text-xl font-bold text-text-primary">{projectTitle}</h2>
                        {proof.summary && (
                            <p className="text-sm text-text-secondary leading-relaxed max-w-2xl">
                                {proof.summary}
                            </p>
                        )}
                    </div>

                    {/* Cryptographic Content Hash */}
                    <div className="p-3 bg-bg-card-elevated border border-border-default rounded-xl space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-text-muted">Immutable Content Hash (SHA-256):</span>
                            <button
                                onClick={handleCopyHash}
                                className="text-purple-light hover:text-purple text-[11px] flex items-center gap-1 font-mono transition-colors"
                            >
                                {copiedHash ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                                <span>{copiedHash ? 'Hash Copied' : 'Copy Hash'}</span>
                            </button>
                        </div>
                        <p className="font-mono text-xs text-text-primary break-all select-all">
                            {proof.content_hash}
                        </p>
                    </div>

                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-border-default/60 text-xs">
                        <div>
                            <span className="text-text-muted">Delivered Tasks</span>
                            <p className="text-base font-bold text-text-primary mt-0.5 flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4 text-green-400" />
                                <span>{completedTasksCount} Verified</span>
                            </p>
                        </div>

                        <div>
                            <span className="text-text-muted">Team Size</span>
                            <p className="text-base font-bold text-text-primary mt-0.5 flex items-center gap-1.5">
                                <Users className="w-4 h-4 text-purple" />
                                <span>{team.length} Builders</span>
                            </p>
                        </div>

                        <div>
                            <span className="text-text-muted">Minted Timestamp</span>
                            <p className="text-base font-bold text-text-primary mt-0.5 flex items-center gap-1.5">
                                <Calendar className="w-4 h-4 text-primary" />
                                <span className="text-xs">
                                    {new Date(proof.minted_at).toLocaleDateString()}
                                </span>
                            </p>
                        </div>

                        <div>
                            <span className="text-text-muted">Consensus State</span>
                            <p className="text-base font-bold text-green-400 mt-0.5">
                                100% Complete
                            </p>
                        </div>
                    </div>

                    {/* Cryptographic Scope & Integrity Note */}
                    <div className="p-3 bg-bg-card-elevated border border-border-default/80 rounded-xl text-xs space-y-1">
                        <div className="flex items-center gap-1.5 text-text-secondary font-semibold">
                            <ShieldCheck className="w-4 h-4 text-green-400" />
                            <span>Integrity Verification Scope</span>
                        </div>
                        <p className="text-[11px] text-text-muted leading-relaxed">
                            This cryptographic SHA-256 digest mathematically guarantees that the project execution snapshot (delivered tasks, contributing team roster, and completion timestamp recorded on ENQUEbet) has remained immutable and tamper-free since project completion. It validates the integrity of the platform record and does not independently attest to off-platform code.
                        </p>
                    </div>
                </div>

                {/* Verified Contributing Builders */}
                <div className="card space-y-4">
                    <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                        <Users className="w-4 h-4 text-purple" />
                        <span>Verified Contributing Builders ({team.length})</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {team.map((builder: any, idx: number) => (
                            <div key={idx} className="p-3 bg-bg-card-elevated border border-border-default rounded-xl flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-purple/10 border border-purple/30 flex items-center justify-center font-bold text-sm text-purple">
                                    {(builder.role_title || builder.role || 'B')[0].toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold text-text-primary capitalize">
                                        Role: {builder.role}
                                    </p>
                                    <p className="text-[11px] text-text-secondary truncate">
                                        {builder.role_title || 'Core Builder'}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Peer Reviews & Builder Reputation Feedback */}
                {peerReviews.length > 0 && (
                    <div className="card space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                                <Star className="w-4 h-4 text-yellow-400" />
                                <span>Reciprocal Peer Evaluations ({peerReviews.length})</span>
                            </h3>

                            <div className="flex items-center gap-3 text-xs">
                                {avgExec && <span className="text-text-muted">Exec: <strong className="text-yellow-400">{avgExec}/5</strong></span>}
                                {avgCollab && <span className="text-text-muted">Collab: <strong className="text-yellow-400">{avgCollab}/5</strong></span>}
                                {avgRel && <span className="text-text-muted">Rel: <strong className="text-yellow-400">{avgRel}/5</strong></span>}
                            </div>
                        </div>

                        <div className="space-y-3">
                            {peerReviews.map((rev: any) => (
                                <div key={rev.id} className="p-3 bg-bg-card-elevated border border-border-default rounded-xl space-y-2 text-xs">
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold text-text-primary">
                                            Evaluation for @{rev.reviewee?.username}
                                        </span>
                                        <div className="flex items-center gap-2 text-[11px] text-text-muted">
                                            <span>Exec: {rev.execution_score}★</span>
                                            <span>Collab: {rev.collaboration_score}★</span>
                                            <span>Rel: {rev.reliability_score}★</span>
                                        </div>
                                    </div>
                                    {rev.feedback && (
                                        <p className="text-text-secondary italic bg-bg-hover p-2.5 rounded-lg">
                                            "{rev.feedback}"
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
