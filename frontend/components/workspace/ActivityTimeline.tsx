"use client";

import React from 'react';
import { 
    Clock, ShieldCheck, GitPullRequest, 
    UserMinus, LogOut, Award, Crown, Plus, RefreshCw,
    Activity, FileText
} from 'lucide-react';

interface ActivityTimelineProps {
    activities: any[];
}

const EVENT_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
    task_created: { icon: Plus, color: 'text-brand', bg: 'bg-brand/10 border-brand/20' },
    task_status_changed: { icon: Activity, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
    deliverable_submitted: { icon: GitPullRequest, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    deliverable_reviewed: { icon: ShieldCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    milestone_created: { icon: Clock, color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/20' },
    member_removed: { icon: UserMinus, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
    member_left: { icon: LogOut, color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20' },
    ownership_transferred: { icon: Crown, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    project_completed: { icon: Award, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    project_reopened: { icon: RefreshCw, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
    workspace_updated: { icon: FileText, color: 'text-brand', bg: 'bg-brand/10 border-brand/20' },
};

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
    return (
        <div className="w-full max-w-3xl mx-auto space-y-6 pb-12">
            <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-brand" />
                    Immutable Workspace Audit Log
                </h2>
                <p className="text-xs text-text-secondary mt-0.5">
                    Server-signed audit trail of all task state transitions, deliverables, reviews, and governance events.
                </p>
            </div>

            {activities.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-[#0b0d14] border border-[#1e2335] text-xs text-text-secondary">
                    No recorded activity yet. Actions taken on this workspace will appear here in real-time.
                </div>
            ) : (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#1e2335]">
                    {activities.map((act: any) => {
                        const config = EVENT_CONFIG[act.event_type] || {
                            icon: Activity,
                            color: 'text-slate-400',
                            bg: 'bg-surface border-border'
                        };
                        const Icon = config.icon;

                        return (
                            <div key={act.id} className="relative flex items-start gap-3 group">
                                {/* Dot Icon */}
                                <div className={`absolute -left-6 top-1 w-4 h-4 rounded-full ${config.bg} border flex items-center justify-center shrink-0`}>
                                    <Icon className={`w-2.5 h-2.5 ${config.color}`} />
                                </div>

                                <div className="flex-1 p-3.5 rounded-xl bg-[#0f111a] border border-[#1e2335] hover:border-slate-700 transition-colors">
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                        <span className="text-xs font-semibold text-slate-200">
                                            {act.description}
                                        </span>
                                        <span className="text-[10px] text-text-secondary whitespace-nowrap">
                                            {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(act.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>

                                    {act.actor && (
                                        <div className="text-[11px] text-text-secondary flex items-center gap-1">
                                            <span>Actor:</span>
                                            <span className="text-brand font-medium">@{act.actor.username}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
