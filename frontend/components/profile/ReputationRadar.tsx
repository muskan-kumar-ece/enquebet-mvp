"use client";

import React, { useState } from 'react';
import { ShieldCheck, Award, Star, RefreshCw, Layers, CheckCircle2, TrendingUp } from 'lucide-react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface ReputationRadarProps {
    userId: string;
    reputation: any;
    isOwner?: boolean;
    onRecalculated?: (newRep: any) => void;
}

export default function ReputationRadar({
    userId,
    reputation,
    isOwner,
    onRecalculated
}: ReputationRadarProps) {
    const [recalculating, setRecalculating] = useState(false);

    const breakdown = reputation?.score_breakdown || {
        deliverables_points: 0,
        tasks_points: 0,
        projects_points: 0,
        peer_reviews_points: 0
    };
    const totalScore = reputation?.score ?? 0;
    const tier = reputation?.level?.title || 'Novice Builder';
    const stats = reputation?.verified_stats || {};

    const handleRecalculate = async () => {
        if (!userId) return;
        setRecalculating(true);
        try {
            const res = await api.recalculateReputation(userId);
            toast.success('Reputation score verified & updated!');
            if (onRecalculated && res.summary) {
                onRecalculated(res.summary);
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to recalculate reputation');
        } finally {
            setRecalculating(false);
        }
    };

    // Calculate percentages for progress bars
    const safeTotal = Math.max(1, totalScore);
    const delivPct = Math.min(100, Math.round((breakdown.deliverables_points / safeTotal) * 100));
    const taskPct = Math.min(100, Math.round((breakdown.tasks_points / safeTotal) * 100));
    const projPct = Math.min(100, Math.round((breakdown.projects_points / safeTotal) * 100));
    const reviewPct = Math.min(100, Math.round((breakdown.peer_reviews_points / safeTotal) * 100));

    return (
        <div className="w-full rounded-3xl border border-white/[0.08] bg-[#0c0c14]/90 backdrop-blur-xl p-6 sm:p-7 shadow-xl mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-[#4f8fff]" />
                        <h2 className="text-lg font-bold text-white tracking-tight">Explainable Reputation Engine</h2>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">
                        Mathematical, non-gameable proof score based on approved work and teammate reviews.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <div className="text-xl font-extrabold text-white font-mono">{totalScore} PTS</div>
                        <div className="text-xs text-[#4f8fff] font-medium">{tier}</div>
                    </div>
                    {isOwner && (
                        <button
                            onClick={handleRecalculate}
                            disabled={recalculating}
                            className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 border border-white/[0.08] transition-all disabled:opacity-50"
                            title="Recalculate and audit score against contribution ledger"
                        >
                            <RefreshCw className={`w-4 h-4 ${recalculating ? 'animate-spin text-[#4f8fff]' : ''}`} />
                        </button>
                    )}
                </div>
            </div>

            {/* Score Breakdown Progress Bars */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Deliverables Approved */}
                <div className="p-4 rounded-2xl bg-[#12121e]/80 border border-white/[0.05]">
                    <div className="flex items-center justify-between text-xs mb-2">
                        <span className="text-zinc-400 font-medium">Deliverables Shipped</span>
                        <span className="font-mono text-sky-400 font-bold">+{breakdown.deliverables_points} pts</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden mb-2">
                        <div
                            className="h-full bg-gradient-to-r from-sky-500 to-cyan-400 transition-all duration-500 rounded-full"
                            style={{ width: `${delivPct}%` }}
                        />
                    </div>
                    <div className="text-[11px] text-zinc-400">
                        {stats.approved_deliverables_count || 0} approved by leads
                    </div>
                </div>

                {/* Tasks Completed */}
                <div className="p-4 rounded-2xl bg-[#12121e]/80 border border-white/[0.05]">
                    <div className="flex items-center justify-between text-xs mb-2">
                        <span className="text-zinc-400 font-medium">Tasks Executed</span>
                        <span className="font-mono text-[#4f8fff] font-bold">+{breakdown.tasks_points} pts</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden mb-2">
                        <div
                            className="h-full bg-gradient-to-r from-[#1864ff] to-[#4f8fff] transition-all duration-500 rounded-full"
                            style={{ width: `${taskPct}%` }}
                        />
                    </div>
                    <div className="text-[11px] text-zinc-400">
                        {stats.completed_tasks_count || 0} milestone tasks
                    </div>
                </div>

                {/* Projects Minted */}
                <div className="p-4 rounded-2xl bg-[#12121e]/80 border border-white/[0.05]">
                    <div className="flex items-center justify-between text-xs mb-2">
                        <span className="text-zinc-400 font-medium">PoWs Minted</span>
                        <span className="font-mono text-emerald-400 font-bold">+{breakdown.projects_points} pts</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden mb-2">
                        <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 rounded-full"
                            style={{ width: `${projPct}%` }}
                        />
                    </div>
                    <div className="text-[11px] text-zinc-400">
                        {stats.completed_projects_count || 0} verified projects
                    </div>
                </div>

                {/* Peer Reviews */}
                <div className="p-4 rounded-2xl bg-[#12121e]/80 border border-white/[0.05]">
                    <div className="flex items-center justify-between text-xs mb-2">
                        <span className="text-zinc-400 font-medium">Teammate Vouches</span>
                        <span className="font-mono text-amber-400 font-bold">+{breakdown.peer_reviews_points} pts</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden mb-2">
                        <div
                            className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500 rounded-full"
                            style={{ width: `${reviewPct}%` }}
                        />
                    </div>
                    <div className="text-[11px] text-zinc-400">
                        {stats.peer_reviews_count || 0} reviews (★ {stats.average_peer_rating || 0})
                    </div>
                </div>
            </div>
        </div>
    );
}
