"use client";

import React from 'react';
import { CheckCircle2, Circle, ArrowRight, Sparkles, ShieldCheck } from 'lucide-react';

interface ProfileCompletionWidgetProps {
    user: any;
    onStartEdit?: () => void;
}

interface ChecklistItem {
    id: string;
    label: string;
    isCompleted: boolean;
    points: number;
}

export default function ProfileCompletionWidget({ user, onStartEdit }: ProfileCompletionWidgetProps) {
    if (!user) return null;

    const score = Number(user.completeness_score ?? 0);

    const checklist: ChecklistItem[] = [
        {
            id: 'name',
            label: 'Full Name',
            isCompleted: Boolean(user.full_name && user.full_name.trim().length > 0),
            points: 10
        },
        {
            id: 'headline',
            label: 'Professional Headline',
            isCompleted: Boolean(user.headline && user.headline.trim().length > 0),
            points: 15
        },
        {
            id: 'avatar',
            label: 'Profile Photo',
            isCompleted: Boolean(user.profile_image && user.profile_image.trim().length > 0),
            points: 15
        },
        {
            id: 'bio',
            label: 'Builder Bio',
            isCompleted: Boolean(user.bio && user.bio.trim().length > 0),
            points: 15
        },
        {
            id: 'skills',
            label: 'Core Skills (at least 1)',
            isCompleted: Boolean(
                (Array.isArray(user.skills) && user.skills.length > 0) ||
                (Array.isArray(user.skills_detailed) && user.skills_detailed.length > 0)
            ),
            points: 15
        },
        {
            id: 'location',
            label: 'Location or Campus',
            isCompleted: Boolean((user.location && user.location.trim()) || (user.college && user.college.trim())),
            points: 10
        },
        {
            id: 'socials',
            label: 'GitHub or Portfolio Link',
            isCompleted: Boolean(
                (user.github_url && user.github_url.trim()) ||
                (user.portfolio_url && user.portfolio_url.trim()) ||
                (user.linkedin_url && user.linkedin_url.trim())
            ),
            points: 10
        },
        {
            id: 'experience',
            label: 'Experience or Project',
            isCompleted: Boolean(
                (Array.isArray(user.experience) && user.experience.length > 0) ||
                (Array.isArray(user.education) && user.education.length > 0) ||
                (Array.isArray(user.projects) && user.projects.length > 0)
            ),
            points: 10
        }
    ];

    const missingItems = checklist.filter((item) => !item.isCompleted);
    const isComplete = score >= 100;

    return (
        <div className="rounded-2xl border border-[#1e2230] bg-[#0d1017] p-5 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#1864ff]" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                        Profile Health
                    </h3>
                </div>
                <span className="font-mono text-xs font-bold text-white px-2 py-0.5 rounded bg-[#161a26] border border-[#23283a]">
                    {score}%
                </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-[#161a26] h-2 rounded-full overflow-hidden mb-3.5 border border-[#23283a]">
                <div
                    className="h-full bg-gradient-to-r from-[#1864ff] to-[#3b82f6] rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, score)}%` }}
                />
            </div>

            {/* Status note */}
            {isComplete ? (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>Your builder dossier is fully completed and primed for discovery.</span>
                </div>
            ) : (
                <div className="space-y-2">
                    <p className="text-[11px] text-zinc-400">
                        Complete your dossier to boost verification rank in team matching.
                    </p>

                    {/* Missing checklist snippet (top 3) */}
                    <div className="space-y-1.5 pt-1">
                        {missingItems.slice(0, 3).map((item) => (
                            <div key={item.id} className="flex items-center justify-between text-xs text-zinc-300">
                                <div className="flex items-center gap-1.5 text-zinc-400">
                                    <Circle className="w-3 h-3 text-zinc-600" />
                                    <span>{item.label}</span>
                                </div>
                                <span className="text-[10px] font-mono text-[#1864ff] font-medium">
                                    +{item.points}%
                                </span>
                            </div>
                        ))}
                    </div>

                    {onStartEdit && (
                        <button
                            onClick={onStartEdit}
                            className="mt-3 w-full py-2 px-3 rounded-xl bg-[#141824] hover:bg-[#1a2030] text-zinc-200 border border-[#23283a] text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                        >
                            <span>Improve Profile</span>
                            <ArrowRight className="w-3.5 h-3.5 text-[#1864ff]" />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
