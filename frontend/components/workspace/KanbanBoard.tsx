"use client";

import React, { useState } from 'react';
import { 
    Plus, Clock, CheckCircle2, GitPullRequest
} from 'lucide-react';

export const TASK_STATUS_COLUMNS = [
    { key: 'backlog', label: 'Backlog', accent: 'border-slate-500/20 text-slate-400 bg-slate-500/5' },
    { key: 'in_progress', label: 'In Progress', accent: 'border-blue-500/20 text-blue-400 bg-blue-500/5' },
    { key: 'in_review', label: 'In Review', accent: 'border-amber-500/20 text-amber-400 bg-amber-500/5' },
    { key: 'changes_requested', label: 'Changes Requested', accent: 'border-orange-500/20 text-orange-400 bg-orange-500/5' },
    { key: 'completed', label: 'Completed', accent: 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5' },
    { key: 'blocked', label: 'Blocked', accent: 'border-rose-500/20 text-rose-400 bg-rose-500/5' },
] as const;

export const PRIORITY_BADGES: Record<string, { label: string; className: string }> = {
    low: { label: 'Low', className: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
    medium: { label: 'Medium', className: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    high: { label: 'High', className: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
    urgent: { label: 'Urgent', className: 'bg-red-500/10 text-red-400 border-red-500/20' },
};

interface KanbanBoardProps {
    tasks: any[];
    onSelectTask: (task: any) => void;
    onUpdateTaskStatus: (taskId: string, newStatus: string) => void;
    onOpenCreateTask: () => void;
    isLeadOrOwner?: boolean;
}

export function KanbanBoard({
    tasks,
    onSelectTask,
    onUpdateTaskStatus,
    onOpenCreateTask,
    isLeadOrOwner = false
}: KanbanBoardProps) {
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
    const [dragOverCol, setDragOverCol] = useState<string | null>(null);

    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        setDraggedTaskId(taskId);
        e.dataTransfer.setData('text/plain', taskId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, colKey: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragOverCol !== colKey) {
            setDragOverCol(colKey);
        }
    };

    const handleDragLeave = (e: React.DragEvent, colKey: string) => {
        e.preventDefault();
        if (dragOverCol === colKey) {
            setDragOverCol(null);
        }
    };

    const handleDrop = (e: React.DragEvent, targetStatus: string) => {
        e.preventDefault();
        setDragOverCol(null);
        const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
        if (!taskId) return;

        const task = tasks.find(t => t.id === taskId);
        if (task && task.status !== targetStatus) {
            onUpdateTaskStatus(taskId, targetStatus);
        }
        setDraggedTaskId(null);
    };

    return (
        <div className="w-full">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <span className="text-xs text-text-secondary">
                        Showing <strong className="text-white">{tasks.length}</strong> tasks across 6 lifecycle columns
                    </span>
                    {isLeadOrOwner && (
                        <span className="text-[10px] text-brand-light font-mono bg-brand/10 px-2 py-0.5 rounded border border-brand/20">
                            Manager View
                        </span>
                    )}
                    <span className="text-[11px] text-text-secondary/70 hidden sm:inline">
                        (Drag cards between columns to transition statuses)
                    </span>
                </div>
                <button
                    onClick={onOpenCreateTask}
                    className="btn-brand px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm"
                >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Task</span>
                </button>
            </div>

            {/* Kanban Columns Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 pb-8">
                {TASK_STATUS_COLUMNS.map((col) => {
                    const colTasks = tasks.filter(t => t.status === col.key);
                    const isDragOver = dragOverCol === col.key;

                    return (
                        <div
                            key={col.key}
                            onDragOver={(e) => handleDragOver(e, col.key)}
                            onDragLeave={(e) => handleDragLeave(e, col.key)}
                            onDrop={(e) => handleDrop(e, col.key)}
                            className={`flex flex-col rounded-xl bg-[#0b0d14] border transition-all duration-150 min-h-[480px] ${
                                isDragOver 
                                    ? 'border-brand bg-brand/[0.04] ring-2 ring-brand/20' 
                                    : 'border-[#1e2335] hover:border-zinc-700'
                            }`}
                        >
                            {/* Column Header */}
                            <div className="p-3 border-b border-border/40 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-slate-200">
                                        {col.label}
                                    </span>
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${col.accent}`}>
                                        {colTasks.length}
                                    </span>
                                </div>
                                {col.key === 'backlog' && (
                                    <button
                                        onClick={onOpenCreateTask}
                                        className="text-text-secondary hover:text-text p-1 hover:bg-surface rounded transition-colors"
                                        title="Add task to Backlog"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>

                            {/* Column Task Cards */}
                            <div className="p-2 space-y-2.5 flex-1 overflow-y-auto max-h-[calc(100vh-280px)] scrollbar-none">
                                {colTasks.map((task) => {
                                    const priority = PRIORITY_BADGES[task.priority] || PRIORITY_BADGES.medium;
                                    const hasDeliverable = task.deliverables && task.deliverables.length > 0;
                                    const latestDeliverable = hasDeliverable ? task.deliverables[task.deliverables.length - 1] : null;
                                    const isBeingDragged = draggedTaskId === task.id;

                                    return (
                                        <div
                                            key={task.id}
                                            draggable={true}
                                            onDragStart={(e) => handleDragStart(e, task.id)}
                                            onDragEnd={() => setDraggedTaskId(null)}
                                            onClick={() => onSelectTask(task)}
                                            className={`group p-3 rounded-lg bg-[#0f111a] hover:bg-[#131726] border border-[#1e2335] hover:border-brand/40 cursor-grab active:cursor-grabbing transition-all duration-150 shadow-sm hover:shadow-md ${
                                                isBeingDragged ? 'opacity-40 scale-95 border-dashed border-brand' : ''
                                            }`}
                                        >
                                            {/* Priority & Milestone Tag */}
                                            <div className="flex items-center justify-between gap-1.5 mb-2">
                                                <span className={`text-[10px] px-2 py-0.5 rounded font-medium border ${priority.className}`}>
                                                    {priority.label}
                                                </span>
                                                {task.milestone && (
                                                    <span className="text-[10px] text-text-secondary line-clamp-1 max-w-[100px] truncate bg-surface px-1.5 py-0.5 rounded border border-border/40">
                                                        {task.milestone.title}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Task Title */}
                                            <h4 className="text-xs font-semibold text-slate-100 group-hover:text-brand-light transition-colors line-clamp-2 mb-1.5 leading-snug">
                                                {task.title}
                                            </h4>

                                            {/* Description preview */}
                                            {task.description && (
                                                <p className="text-[11px] text-text-secondary/80 line-clamp-2 mb-2 leading-relaxed">
                                                    {task.description}
                                                </p>
                                            )}

                                            {/* Footer: Assignee & Deliverable Badge */}
                                            <div className="pt-2 border-t border-border/30 flex items-center justify-between text-[11px] text-text-secondary">
                                                {/* Assignee */}
                                                <div className="flex items-center gap-1.5">
                                                    {task.assignee ? (
                                                        <div className="flex items-center gap-1">
                                                            <div className="w-4 h-4 rounded-full bg-brand/20 text-brand-light text-[9px] font-bold flex items-center justify-center border border-brand/30">
                                                                {task.assignee.username?.charAt(0).toUpperCase() || 'U'}
                                                            </div>
                                                            <span className="text-[10px] text-slate-300 font-medium truncate max-w-[70px]">
                                                                @{task.assignee.username}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] text-text-secondary/50 italic">
                                                            Unassigned
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Deliverable indicator */}
                                                {hasDeliverable && (
                                                    <div className="flex items-center gap-1 text-[10px]">
                                                        {task.status === 'completed' ? (
                                                            <span className="text-emerald-400 flex items-center gap-0.5 font-medium" title="Deliverable Approved">
                                                                <CheckCircle2 className="w-3 h-3" />
                                                                <span>v{latestDeliverable.version}</span>
                                                            </span>
                                                        ) : (
                                                            <span className="text-amber-400 flex items-center gap-0.5 font-medium" title="Deliverable Submitted">
                                                                <GitPullRequest className="w-3 h-3" />
                                                                <span>v{latestDeliverable.version}</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Due Date Indicator */}
                                                {task.due_date && !hasDeliverable && (
                                                    <span className="text-[10px] text-text-secondary/70 flex items-center gap-1">
                                                        <Clock className="w-2.5 h-2.5" />
                                                        {new Date(task.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}

                                {colTasks.length === 0 && (
                                    <div className="py-10 text-center text-text-secondary/40 text-xs">
                                        No tasks
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
