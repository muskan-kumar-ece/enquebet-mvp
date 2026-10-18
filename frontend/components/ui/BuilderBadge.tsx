"use client";

import { Shield, ShieldCheck, Award, Sparkles } from 'lucide-react';

interface VerificationBadgeProps {
    level?: number;
    showTooltip?: boolean;
}

export function VerificationBadge({ level = 0, showTooltip = true }: VerificationBadgeProps) {
    if (level === 1) {
        return (
            <div
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20"
                title={showTooltip ? "Verified Contributor: Earned through validated contributions." : undefined}
            >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Verified Contributor</span>
            </div>
        );
    }

    if (level === 2) {
        return (
            <div
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-primary/15 text-brand-light text-xs font-semibold border border-brand-primary/30"
                title={showTooltip ? "Verified Builder: Proven track record of completed projects and Proof of Work." : undefined}
            >
                <ShieldCheck className="w-3.5 h-3.5 text-brand-light" />
                <span>Verified Builder</span>
            </div>
        );
    }

    if (level >= 3) {
        return (
            <div
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 text-xs font-semibold border border-amber-500/30"
                title={showTooltip ? "Master Builder: Top-tier builder with multiple high-impact delivered workspaces." : undefined}
            >
                <Award className="w-3.5 h-3.5 text-amber-300" />
                <span>Master Builder</span>
            </div>
        );
    }

    // Level 0: Honest presentation
    return (
        <div
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-bg-hover text-text-muted text-xs font-medium border border-border-default"
            title={showTooltip ? "Unverified Builder: Verification is earned through verified Proof of Work from completed projects." : undefined}
        >
            <Shield className="w-3.5 h-3.5 text-text-muted opacity-70" />
            <span>Unverified Builder</span>
        </div>
    );
}

interface ReputationBadgeProps {
    score?: number;
}

export function ReputationBadge({ score = 0 }: ReputationBadgeProps) {
    return (
        <div
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-primary/10 text-brand-light text-xs font-semibold border border-brand-primary/20"
            title="Reputation points are awarded through peer reviews, delivered projects, and accepted Proof of Work."
        >
            <Sparkles className="w-3.5 h-3.5 text-brand-light" />
            <span>{score} Reputation</span>
        </div>
    );
}
