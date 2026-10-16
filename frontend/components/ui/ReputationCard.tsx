'use client';

import React, { useState, useEffect } from 'react';
import {
    Award,
    CheckCircle2,
    FolderCheck,
    Star,
    Layers,
    TrendingUp,
    RefreshCw,
    ShieldCheck,
    Info,
} from 'lucide-react';
import { api } from '@/lib/api';

interface ReputationCardProps {
    userId: string;
    isOwner?: boolean;
    initialScore?: number;
}

export function ReputationCard({ userId, isOwner = false, initialScore = 0 }: ReputationCardProps) {
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [recalculating, setRecalculating] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const fetchSummary = async () => {
        try {
            setLoading(true);
            const data = await api.getUserReputation(userId);
            setSummary(data);
        } catch {
            // Silently fallback if endpoint is unavailable
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (userId) {
            fetchSummary();
        }
    }, [userId]);

    const handleRecalculate = async () => {
        if (recalculating) return;
        setRecalculating(true);
        setMessage(null);
        try {
            const resp = await api.recalculateReputation(userId);
            setSummary(resp.summary);
            setMessage('Reputation recalculated from ground-truth contributions.');
            setTimeout(() => setMessage(null), 4000);
        } catch (err: any) {
            setMessage(err.message || 'Failed to recalculate reputation.');
            setTimeout(() => setMessage(null), 4000);
        } finally {
            setRecalculating(false);
        }
    };

    if (loading && !summary) {
        return (
            <div className="card p-6 border border-border-default/60 bg-bg-card animate-pulse rounded-2xl mb-6">
                <div className="h-5 w-48 bg-bg-hover rounded mb-4" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="h-16 bg-bg-hover rounded-xl" />
                    <div className="h-16 bg-bg-hover rounded-xl" />
                    <div className="h-16 bg-bg-hover rounded-xl" />
                    <div className="h-16 bg-bg-hover rounded-xl" />
                </div>
            </div>
        );
    }

    const score = summary?.score ?? initialScore;
    const level = summary?.level || 'Active Builder';
    const stats = summary?.verified_stats || {};
    const breakdown = summary?.score_breakdown || {};
    const events = summary?.recent_events || [];

    return (
        <div className="card p-6 border border-border-default bg-bg-card rounded-2xl mb-6 shadow-sm">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-border-default/60">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple/10 border border-purple/20 flex items-center justify-center text-purple-light shadow-inner">
                        <Award className="w-5 h-5 text-purple" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-base font-bold text-text-primary">Verified Builder Reputation</h2>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple/10 text-purple-light border border-purple/20">
                                {level}
                            </span>
                        </div>
                        <p className="text-xs text-text-muted mt-0.5">
                            Earned strictly through peer-reviewed deliverables, completed tasks, and Proof of Work credentials.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <div className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-light to-primary">
                            {score}
                        </div>
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-text-muted">
                            Reputation Points
                        </span>
                    </div>

                    {isOwner && (
                        <button
                            onClick={handleRecalculate}
                            disabled={recalculating}
                            title="Recalculate reputation from database ground-truth"
                            className="p-2 rounded-lg bg-bg-hover hover:bg-bg-card-elevated border border-border-default text-text-muted hover:text-text-primary transition-colors disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${recalculating ? 'animate-spin text-purple' : ''}`} />
                        </button>
                    )}
                </div>
            </div>

            {/* Recalculate Feedback Notification */}
            {message && (
                <div className="my-3 p-2.5 rounded-lg bg-purple/10 border border-purple/30 text-xs text-purple-light flex items-center gap-2 animate-fadeIn">
                    <Info className="w-4 h-4 shrink-0" />
                    <span>{message}</span>
                </div>
            )}

            {/* Key Verified Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5">
                <div className="p-3 rounded-xl bg-bg-card-elevated border border-border-default/60 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-text-muted mb-1">
                        <span className="text-[11px] font-medium uppercase tracking-wider">Deliverables</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    <div className="text-xl font-bold text-text-primary">
                        {stats.approved_deliverables_count ?? 0}
                    </div>
                    <span className="text-[10px] text-text-muted">Approved Artifacts</span>
                </div>

                <div className="p-3 rounded-xl bg-bg-card-elevated border border-border-default/60 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-text-muted mb-1">
                        <span className="text-[11px] font-medium uppercase tracking-wider">Tasks</span>
                        <Layers className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div className="text-xl font-bold text-text-primary">
                        {stats.completed_tasks_count ?? 0}
                    </div>
                    <span className="text-[10px] text-text-muted">Completed & Reviewed</span>
                </div>

                <div className="p-3 rounded-xl bg-bg-card-elevated border border-border-default/60 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-text-muted mb-1">
                        <span className="text-[11px] font-medium uppercase tracking-wider">Projects</span>
                        <FolderCheck className="w-3.5 h-3.5 text-purple-light" />
                    </div>
                    <div className="text-xl font-bold text-text-primary">
                        {stats.completed_projects_count ?? 0}
                    </div>
                    <span className="text-[10px] text-text-muted">Minted Proof of Work</span>
                </div>

                <div className="p-3 rounded-xl bg-bg-card-elevated border border-border-default/60 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-text-muted mb-1">
                        <span className="text-[11px] font-medium uppercase tracking-wider">Peer Rating</span>
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
                    </div>
                    <div className="text-xl font-bold text-text-primary flex items-center gap-1">
                        <span>{stats.average_peer_rating ? stats.average_peer_rating.toFixed(1) : '—'}</span>
                        {stats.average_peer_rating > 0 && <span className="text-amber-400 text-xs">★</span>}
                    </div>
                    <span className="text-[10px] text-text-muted">
                        {stats.peer_reviews_count ? `${stats.peer_reviews_count} Reviews` : 'No reviews yet'}
                    </span>
                </div>
            </div>

            {/* Score Breakdown Pills */}
            <div className="pt-4 border-t border-border-default/60">
                <div className="text-[11px] uppercase tracking-wider font-semibold text-text-muted mb-2.5 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-purple-light" />
                    <span>Point Allocation Breakdown</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-bg-hover border border-border-default text-text-secondary">
                        <span className="w-2 h-2 rounded-full bg-blue-400" />
                        Deliverables: <strong className="text-text-primary">+{breakdown.deliverables_points ?? 0}</strong>
                    </span>

                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-bg-hover border border-border-default text-text-secondary">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        Tasks: <strong className="text-text-primary">+{breakdown.tasks_points ?? 0}</strong>
                    </span>

                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-bg-hover border border-border-default text-text-secondary">
                        <span className="w-2 h-2 rounded-full bg-purple" />
                        Proof of Work: <strong className="text-text-primary">+{breakdown.projects_points ?? 0}</strong>
                    </span>

                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-bg-hover border border-border-default text-text-secondary">
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        Teammate Feedback: <strong className="text-text-primary">+{breakdown.peer_reviews_points ?? 0}</strong>
                    </span>
                </div>
            </div>

            {/* Recent Verified Activities */}
            {events.length > 0 && (
                <div className="mt-5 pt-4 border-t border-border-default/60">
                    <div className="text-[11px] uppercase tracking-wider font-semibold text-text-muted mb-2.5 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Verified Contribution Ledger</span>
                    </div>

                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {events.map((ev: any) => (
                            <div
                                key={ev.id}
                                className="p-2 rounded-lg bg-bg-hover/60 border border-border-default/40 flex items-center justify-between text-xs"
                            >
                                <span className="text-text-secondary truncate pr-2">
                                    {ev.description}
                                </span>
                                <span className="font-semibold text-purple-light shrink-0">
                                    +{ev.points} pts
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
