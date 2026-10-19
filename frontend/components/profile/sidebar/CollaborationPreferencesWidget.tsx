"use client";

import React from 'react';
import Link from 'next/link';
import { Users2, ArrowUpRight, Sparkles, CheckCircle2 } from 'lucide-react';

interface CollaborationPreferencesWidgetProps {
    user: any;
    isOwner?: boolean;
    onEditPreferences?: () => void;
}

const AVAILABILITY_CONFIG: Record<string, { label: string; dotColor: string; description: string }> = {
    open_to_cofound: {
        label: 'Open for Co-founding',
        dotColor: 'bg-emerald-400',
        description: 'Actively seeking technical or domain co-founders.'
    },
    open_to_collaborate: {
        label: 'Open to Collaborate',
        dotColor: 'bg-sky-400',
        description: 'Available for collaborative ventures and hackathons.'
    },
    hiring: {
        label: 'Hiring Builders',
        dotColor: 'bg-blue-400',
        description: 'Recruiting contributors and project team members.'
    },
    open_to_work: {
        label: 'Open to Work',
        dotColor: 'bg-amber-400',
        description: 'Open to engineering roles and technical contracts.'
    },
    focused: {
        label: 'Deep Focus Mode',
        dotColor: 'bg-zinc-400',
        description: 'Focused on current milestone; limited bandwidth.'
    }
};

const DEFAULT_PREFERENCES = [
    'AI Systems & Models',
    'Open Source Ventures',
    'Full-Stack Architecture',
    'Campus Hackathons'
];

export default function CollaborationPreferencesWidget({
    user,
    isOwner,
    onEditPreferences
}: CollaborationPreferencesWidgetProps) {
    if (!user) return null;

    const availabilityKey = user.availability_status || 'open_to_collaborate';
    const config = AVAILABILITY_CONFIG[availabilityKey] || AVAILABILITY_CONFIG.open_to_collaborate;

    const preferences: string[] = Array.isArray(user.collaboration_preferences) && user.collaboration_preferences.length > 0
        ? user.collaboration_preferences
        : (isOwner ? [] : DEFAULT_PREFERENCES);

    return (
        <div className="rounded-2xl border border-[#1e2230] bg-[#0d1017] p-5 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                    <Users2 className="w-4 h-4 text-[#1864ff]" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                        Collaboration Stance
                    </h3>
                </div>
            </div>

            {/* Active Stance Card */}
            <div className="p-3 rounded-xl bg-[#141824] border border-[#23283a] mb-3.5">
                <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-full ${config.dotColor} animate-pulse`} />
                    <span className="text-xs font-bold text-white">{config.label}</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                    {config.description}
                </p>
            </div>

            {/* Preferred Engagement Areas */}
            <div className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 block">
                    Preferred Domains
                </span>

                {preferences.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                        {preferences.map((pref, idx) => (
                            <span
                                key={idx}
                                className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md bg-[#161b28] border border-[#262d40] text-zinc-300"
                            >
                                <span className="text-[#1864ff] text-[10px]">•</span>
                                {pref}
                            </span>
                        ))}
                    </div>
                ) : (
                    <p className="text-xs text-zinc-500 italic">No specific domains listed yet.</p>
                )}
            </div>

            {/* Action CTA */}
            <div className="mt-4 pt-3 border-t border-[#1e2230]">
                {isOwner ? (
                    onEditPreferences && (
                        <button
                            onClick={onEditPreferences}
                            className="w-full py-2 px-3 rounded-xl bg-[#141824] hover:bg-[#1a2030] text-zinc-200 border border-[#23283a] text-xs font-medium transition-colors text-center"
                        >
                            Edit Collaboration Preferences
                        </button>
                    )
                ) : (
                    <Link
                        href={`/collaboration?recipient=${user.id || user.username}`}
                        className="w-full py-2 px-3 rounded-xl bg-[#1864ff] hover:bg-[#2563eb] text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                    >
                        <span>Request Collaboration</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                )}
            </div>
        </div>
    );
}
