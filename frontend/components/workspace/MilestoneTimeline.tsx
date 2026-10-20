"use client";

import React from 'react';
import { 
    Clock, Plus, Calendar, Check, Flag
} from 'lucide-react';
import { PRIORITY_BADGES } from './KanbanBoard';

interface MilestoneTimelineProps {
    milestones: any[];
    tasks: any[];
    onOpenCreateMilestone: () => void;
    isLeadOrOwner: boolean;
    onSelectTask: (task: any) => void;
}

export function MilestoneTimeline({
    milestones,
    tasks,
    onOpenCreateMilestone,
    isLeadOrOwner,
    onSelectTask
}: MilestoneTimelineProps) {
    return (
        <div className="w-full max-w-5xl mx-auto space-y-6 pb-12">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                        <Flag className="w-4 h-4 text-brand" />
                        Project Milestones & Delivery Roadmap
                    </h2>
                    <p className="text-xs text-text-secondary mt-0.5">
                        Track progress against delivery deadlines and associated sprint deliverables.
                    </p>
                </div>

                {isLeadOrOwner && (
                    <button
                        onClick={onOpenCreateMilestone}
                        className="btn-brand px-3.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>New Milestone</span>
                    </button>
                )}
            </div>

            {milestones.length === 0 ? (
                <div className="p-12 text-center rounded-xl bg-[#0f111a] border border-[#1e2335] shadow-sm">
                    <Clock className="w-10 h-10 text-brand/40 mx-auto mb-3" />
                    <h3 className="text-sm font-bold text-white mb-1">No Milestones Defined</h3>
                    <p className="text-xs text-text-secondary max-w-sm mx-auto mb-4">
                        Break your project down into sequential delivery milestones with clear targets.
                    </p>
                    {isLeadOrOwner && (
                        <button
                            onClick={onOpenCreateMilestone}
                            className="btn-brand px-3 py-1.5 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Create First Milestone</span>
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {milestones.map((ms: any, index: number) => {
                        const msTasks = tasks.filter(t => t.milestone?.id === ms.id || t.milestone === ms.id);
                        const completedCount = msTasks.filter(t => t.status === 'completed').length;
                        const progressPct = msTasks.length > 0 ? Math.round((completedCount / msTasks.length) * 100) : 0;
                        const isOverdue = ms.due_date && new Date(ms.due_date) < new Date() && progressPct < 100;

                        return (
                            <div 
                                key={ms.id} 
                                className="p-5 rounded-xl bg-[#0f111a] border border-[#1e2335] hover:border-zinc-700 transition-all duration-150 shadow-sm"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-lg bg-brand/15 text-brand-light border border-brand/30 flex items-center justify-center font-bold text-xs">
                                            {index + 1}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                                {ms.title}
                                                {progressPct === 100 && (
                                                    <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold flex items-center gap-1">
                                                        <Check className="w-3 h-3" />
                                                        Completed
                                                    </span>
                                                )}
                                                {isOverdue && (
                                                    <span className="text-[10px] px-2 py-0.2 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-semibold">
                                                        Overdue
                                                    </span>
                                                )}
                                            </h3>
                                            {ms.description && (
                                                <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">
                                                    {ms.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {ms.due_date && (
                                        <div className="flex items-center gap-1.5 text-xs text-text-secondary bg-surface px-2.5 py-1 rounded-md border border-border/50 shrink-0">
                                            <Calendar className="w-3.5 h-3.5 text-amber-400" />
                                            <span>Target: {new Date(ms.due_date).toLocaleDateString()}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Progress */}
                                <div className="mb-4">
                                    <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
                                        <span>Delivery Progress</span>
                                        <span className="font-semibold text-white">
                                            {completedCount} / {msTasks.length} tasks ({progressPct}%)
                                        </span>
                                    </div>
                                    <div className="w-full bg-[#181826] rounded-full h-1.5 overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-300 ${
                                                progressPct === 100 ? 'bg-emerald-500' : 'bg-brand'
                                            }`}
                                            style={{ width: `${progressPct}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Attached Tasks List */}
                                {msTasks.length > 0 ? (
                                    <div className="space-y-1.5 pt-2 border-t border-border/40">
                                        <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider block mb-1">
                                            Milestone Tasks ({msTasks.length})
                                        </span>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {msTasks.map(task => {
                                                const prio = PRIORITY_BADGES[task.priority] || PRIORITY_BADGES.medium;
                                                return (
                                                    <div
                                                        key={task.id}
                                                        onClick={() => onSelectTask(task)}
                                                        className="p-2.5 rounded-lg bg-[#0b0d14] hover:bg-[#131726] border border-[#1e2335] hover:border-brand/40 cursor-pointer flex items-center justify-between gap-2 transition-colors"
                                                    >
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <div className={`w-2 h-2 rounded-full ${
                                                                task.status === 'completed' ? 'bg-emerald-400' : 'bg-slate-400'
                                                            }`} />
                                                            <span className="text-xs text-slate-200 truncate font-medium">
                                                                {task.title}
                                                            </span>
                                                        </div>
                                                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold border shrink-0 ${prio.className}`}>
                                                            {prio.label}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-[11px] text-text-secondary/60 italic pt-1">
                                        No tasks associated with this milestone yet. Assign tasks via the Kanban board.
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
