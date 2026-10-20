"use client";

import React, { useState } from 'react';
import { 
    X, AlertTriangle, 
    FileText, Send, GitPullRequest, ExternalLink, ShieldCheck,
    User, Calendar, Check
} from 'lucide-react';
import { PRIORITY_BADGES, TASK_STATUS_COLUMNS } from './KanbanBoard';

interface TaskDetailDrawerProps {
    task: any | null;
    isOpen: boolean;
    onClose: () => void;
    onUpdateStatus: (taskId: string, newStatus: string) => void;
    onSubmitDeliverable: (e: React.FormEvent) => void;
    deliverablePrUrl: string;
    setDeliverablePrUrl: (val: string) => void;
    deliverableFileUrl: string;
    setDeliverableFileUrl: (val: string) => void;
    deliverableDesc: string;
    setDeliverableDesc: (val: string) => void;
    submittingDeliverable: boolean;
    onReviewDeliverable: (deliverableId: string) => void;
    reviewVerdict: 'approved' | 'changes_requested' | 'rejected';
    setReviewVerdict: (val: 'approved' | 'changes_requested' | 'rejected') => void;
    reviewFeedback: string;
    setReviewFeedback: (val: string) => void;
    submittingReview: boolean;
    isLeadOrOwner: boolean;
    currentUserId?: string;
}

export function TaskDetailDrawer({
    task,
    isOpen,
    onClose,
    onUpdateStatus,
    onSubmitDeliverable,
    deliverablePrUrl,
    setDeliverablePrUrl,
    deliverableFileUrl,
    setDeliverableFileUrl,
    deliverableDesc,
    setDeliverableDesc,
    submittingDeliverable,
    onReviewDeliverable,
    reviewVerdict,
    setReviewVerdict,
    reviewFeedback,
    setReviewFeedback,
    submittingReview,
    isLeadOrOwner,
    currentUserId
}: TaskDetailDrawerProps) {
    const [activeDeliverableReviewId, setActiveDeliverableReviewId] = useState<string | null>(null);

    if (!isOpen || !task) return null;

    const priority = PRIORITY_BADGES[task.priority] || PRIORITY_BADGES.medium;
    const deliverables = task.deliverables || [];
    const isCompleted = task.status === 'completed';

    return (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
            <div 
                className="w-full max-w-2xl bg-[#0e0e17] border-l border-border h-full shadow-2xl flex flex-col transform transition-transform duration-300 ease-out overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-5 border-b border-border flex items-start justify-between gap-4 bg-[#12121f]">
                    <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className={`text-[10px] px-2.5 py-0.5 rounded font-medium border ${priority.className}`}>
                                {priority.label} Priority
                            </span>

                            {/* Status Selector */}
                            <select
                                value={task.status}
                                onChange={(e) => onUpdateStatus(task.id, e.target.value)}
                                className="text-xs font-semibold px-2.5 py-1 rounded-md bg-surface border border-border text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand cursor-pointer"
                            >
                                {TASK_STATUS_COLUMNS.map((col) => (
                                    <option key={col.key} value={col.key}>
                                        {col.label}
                                    </option>
                                ))}
                            </select>

                            {task.milestone && (
                                <span className="text-[10px] text-text-secondary bg-surface px-2 py-0.5 rounded border border-border">
                                    Milestone: {task.milestone.title}
                                </span>
                            )}
                        </div>

                        <h2 className="text-lg font-bold text-white leading-tight">
                            {task.title}
                        </h2>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg bg-surface hover:bg-surface-hover text-text-secondary hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body - Scrollable */}
                <div className="p-6 space-y-6 flex-1 overflow-y-auto scrollbar-thin">
                    {/* Meta Cards Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="p-3 rounded-lg bg-surface/50 border border-border/50">
                            <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider block mb-1">
                                Assignee
                            </span>
                            <div className="flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-brand" />
                                <span className="text-xs font-medium text-slate-200 truncate">
                                    {task.assignee ? `@${task.assignee.username}` : 'Unassigned'}
                                </span>
                            </div>
                        </div>

                        <div className="p-3 rounded-lg bg-surface/50 border border-border/50">
                            <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider block mb-1">
                                Assigned Reviewer
                            </span>
                            <div className="flex items-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                                <span className="text-xs font-medium text-slate-200 truncate">
                                    {task.reviewer ? `@${task.reviewer.username}` : 'Lead / Owner Review'}
                                </span>
                            </div>
                        </div>

                        <div className="p-3 rounded-lg bg-surface/50 border border-border/50 col-span-2 sm:col-span-1">
                            <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider block mb-1">
                                Due Date
                            </span>
                            <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                                <span className="text-xs font-medium text-slate-200">
                                    {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No deadline'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Task Description */}
                    <div>
                        <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                            Description & Requirements
                        </h3>
                        <div className="p-3.5 rounded-lg bg-[#141422] border border-border/60 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                            {task.description || 'No detailed description provided for this task.'}
                        </div>
                    </div>

                    {/* Deliverable Submission Box */}
                    {!isCompleted && (
                        <div className="p-4 rounded-xl bg-[#0f111a] border border-[#1e2335]">
                            <div className="flex items-center gap-2 mb-3">
                                <GitPullRequest className="w-4 h-4 text-brand" />
                                <h3 className="text-sm font-bold text-white">
                                    Submit Work Deliverable
                                </h3>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand/10 text-brand border border-brand/20 font-semibold font-mono">
                                    Triggers Review
                                </span>
                            </div>
                            <p className="text-xs text-text-secondary mb-4">
                                Attach your Pull Request, repository branch, or document file for lead/peer review.
                            </p>

                            <form onSubmit={onSubmitDeliverable} className="space-y-3">
                                <div>
                                    <label className="text-[11px] font-medium text-slate-300 block mb-1">
                                        Pull Request / Git URL (Required or File)
                                    </label>
                                    <input
                                        type="url"
                                        value={deliverablePrUrl}
                                        onChange={(e) => setDeliverablePrUrl(e.target.value)}
                                        placeholder="https://github.com/org/repo/pull/12"
                                        className="w-full text-xs px-3 py-2 rounded-lg bg-surface border border-border text-white placeholder-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-brand"
                                    />
                                </div>

                                <div>
                                    <label className="text-[11px] font-medium text-slate-300 block mb-1">
                                        Attachment / Demo URL (Optional)
                                    </label>
                                    <input
                                        type="url"
                                        value={deliverableFileUrl}
                                        onChange={(e) => setDeliverableFileUrl(e.target.value)}
                                        placeholder="https://preview.app.com or Cloudinary doc"
                                        className="w-full text-xs px-3 py-2 rounded-lg bg-surface border border-border text-white placeholder-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-brand"
                                    />
                                </div>

                                <div>
                                    <label className="text-[11px] font-medium text-slate-300 block mb-1">
                                        Submission Notes / Summary
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={deliverableDesc}
                                        onChange={(e) => setDeliverableDesc(e.target.value)}
                                        placeholder="Summary of changes implemented, test instructions, or notes for reviewer..."
                                        className="w-full text-xs px-3 py-2 rounded-lg bg-surface border border-border text-white placeholder-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-brand resize-none"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={submittingDeliverable}
                                    className="btn-brand w-full py-2 text-xs font-semibold rounded-lg disabled:opacity-50 text-white flex items-center justify-center gap-1.5 transition-all"
                                >
                                    <Send className="w-3.5 h-3.5" />
                                    <span>{submittingDeliverable ? 'Submitting...' : 'Submit Deliverable for Review'}</span>
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Deliverables History & Review Threads */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                                <GitPullRequest className="w-3.5 h-3.5 text-slate-400" />
                                Deliverables History ({deliverables.length})
                            </h3>
                        </div>

                        {deliverables.length === 0 ? (
                            <div className="p-4 rounded-lg bg-surface/30 border border-border/40 text-center text-xs text-text-secondary">
                                No deliverables submitted yet. Use the form above to submit your work when ready.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {deliverables.map((deliv: any) => {
                                    const reviews = deliv.reviews || [];
                                    const isAuthor = deliv.submitted_by?.id === currentUserId;
                                    const canReview = !isAuthor && (isLeadOrOwner || task.reviewer?.id === currentUserId);
                                    const isApproved = reviews.some((r: any) => r.verdict === 'approved');

                                    return (
                                        <div 
                                            key={deliv.id}
                                            className="p-4 rounded-xl bg-[#141422] border border-border/70 space-y-3"
                                        >
                                            {/* Deliverable Header */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-surface border border-border text-white">
                                                        v{deliv.version}
                                                    </span>
                                                    <span className="text-xs text-slate-300 font-medium">
                                                        {deliv.title}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] text-text-secondary">
                                                    by @{deliv.submitted_by?.username} · {new Date(deliv.created_at).toLocaleDateString()}
                                                </span>
                                            </div>

                                            {deliv.description && (
                                                <p className="text-xs text-text-secondary bg-surface/40 p-2.5 rounded border border-border/30">
                                                    {deliv.description}
                                                </p>
                                            )}

                                            {/* Links */}
                                            <div className="flex flex-wrap gap-2 text-xs">
                                                {deliv.pr_url && (
                                                    <a 
                                                        href={deliv.pr_url} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="px-2.5 py-1 rounded bg-surface hover:bg-surface-hover border border-border text-brand-light hover:underline flex items-center gap-1 transition-colors"
                                                    >
                                                        <GitPullRequest className="w-3 h-3" />
                                                        <span>View Pull Request</span>
                                                        <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                                                    </a>
                                                )}
                                                {deliv.file_url && (
                                                    <a 
                                                        href={deliv.file_url} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="px-2.5 py-1 rounded bg-surface hover:bg-surface-hover border border-border text-blue-400 hover:underline flex items-center gap-1 transition-colors"
                                                    >
                                                        <FileText className="w-3 h-3" />
                                                        <span>View Attachment</span>
                                                        <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                                                    </a>
                                                )}
                                            </div>

                                            {/* Review History */}
                                            {reviews.length > 0 && (
                                                <div className="pt-2 border-t border-border/40 space-y-2">
                                                    <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider block">
                                                        Review Verdicts ({reviews.length})
                                                    </span>
                                                    {reviews.map((rev: any) => (
                                                        <div key={rev.id} className="p-2.5 rounded-lg bg-surface/60 border border-border/40 text-xs space-y-1">
                                                            <div className="flex items-center justify-between">
                                                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                                                                    rev.verdict === 'approved' 
                                                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                                                        : rev.verdict === 'changes_requested'
                                                                        ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                                                                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                                                }`}>
                                                                    {rev.verdict.replace('_', ' ')}
                                                                </span>
                                                                <span className="text-[10px] text-text-secondary">
                                                                    by @{rev.reviewer?.username} · {new Date(rev.created_at).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                            {rev.feedback && (
                                                                <p className="text-slate-300 text-xs pt-1">
                                                                    {rev.feedback}
                                                                </p>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Anti-Self-Review Guard Notice */}
                                            {isAuthor && !isApproved && (
                                                <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20 text-[11px] text-amber-300 flex items-center gap-2">
                                                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                                                    <span>Anti-Self-Approval: As submitter, your deliverable awaits peer or lead review.</span>
                                                </div>
                                            )}

                                            {/* Interactive Review Action for Lead/Reviewer */}
                                            {canReview && (
                                                <div className="pt-3 border-t border-border/40">
                                                    {activeDeliverableReviewId === deliv.id ? (
                                                        <div className="p-3.5 rounded-lg bg-surface/80 border border-brand/30 space-y-3">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                                                                    <ShieldCheck className="w-3.5 h-3.5 text-brand" />
                                                                    Review Deliverable v{deliv.version}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setActiveDeliverableReviewId(null)}
                                                                    className="text-text-secondary hover:text-white text-xs"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>

                                                            <div className="grid grid-cols-3 gap-2">
                                                                {(['approved', 'changes_requested', 'rejected'] as const).map((v) => (
                                                                    <button
                                                                        key={v}
                                                                        type="button"
                                                                        onClick={() => setReviewVerdict(v)}
                                                                        className={`py-1.5 px-2 text-[11px] font-semibold rounded-md border text-center transition-all ${
                                                                            reviewVerdict === v
                                                                                ? v === 'approved' 
                                                                                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500 shadow-sm'
                                                                                    : v === 'changes_requested'
                                                                                    ? 'bg-orange-500/20 text-orange-400 border-orange-500 shadow-sm'
                                                                                    : 'bg-rose-500/20 text-rose-400 border-rose-500 shadow-sm'
                                                                                : 'bg-surface border-border text-text-secondary hover:text-white'
                                                                        }`}
                                                                    >
                                                                        {v === 'approved' ? 'Approve' : v === 'changes_requested' ? 'Changes Req' : 'Reject'}
                                                                    </button>
                                                                ))}
                                                            </div>

                                                            <div>
                                                                <textarea
                                                                    rows={2}
                                                                    value={reviewFeedback}
                                                                    onChange={(e) => setReviewFeedback(e.target.value)}
                                                                    placeholder="Provide constructive feedback or approval notes..."
                                                                    className="w-full text-xs px-3 py-2 rounded-lg bg-surface border border-border text-white placeholder-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand resize-none"
                                                                />
                                                            </div>

                                                            <button
                                                                type="button"
                                                                disabled={submittingReview}
                                                                onClick={() => {
                                                                    onReviewDeliverable(deliv.id);
                                                                    setActiveDeliverableReviewId(null);
                                                                }}
                                                                className="btn-brand w-full py-2 text-xs font-semibold rounded-lg disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all"
                                                            >
                                                                <Check className="w-3.5 h-3.5" />
                                                                <span>{submittingReview ? 'Submitting Verdict...' : `Submit Verdict (${reviewVerdict.replace('_', ' ')})`}</span>
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setActiveDeliverableReviewId(deliv.id);
                                                                setReviewVerdict('approved');
                                                            }}
                                                            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-brand/10 hover:bg-brand/20 text-brand-light border border-brand/20 flex items-center gap-1.5 transition-colors"
                                                        >
                                                            <ShieldCheck className="w-3.5 h-3.5" />
                                                            <span>Review this Deliverable</span>
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
