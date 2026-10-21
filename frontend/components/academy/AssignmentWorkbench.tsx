'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Hammer,
    CheckSquare,
    Square,
    Github,
    ExternalLink,
    Send,
    CheckCircle2,
    Clock,
    AlertCircle,
    ArrowRight,
    Users,
    Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Assignment, AssignmentSubmission, SubmissionStatus } from '@/types/academy';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';

interface AssignmentWorkbenchProps {
    assignment: Assignment;
    courseSlug: string;
    courseTitle: string;
    skillsGained?: string[];
    onSubmissionSuccess?: (submission: AssignmentSubmission) => void;
}

const STATUS_BADGE: Record<SubmissionStatus, { label: string; bg: string; text: string; border: string }> = {
    submitted: {
        label: 'Submitted · Awaiting Review',
        bg: 'bg-amber-500/10',
        text: 'text-amber-400',
        border: 'border-amber-500/30',
    },
    reviewing: {
        label: 'In Active Review',
        bg: 'bg-blue-500/10',
        text: 'text-blue-400',
        border: 'border-blue-500/30',
    },
    approved: {
        label: 'Approved ✓',
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-400',
        border: 'border-emerald-500/30',
    },
    changes_requested: {
        label: 'Changes Requested',
        bg: 'bg-rose-500/10',
        text: 'text-rose-400',
        border: 'border-rose-500/30',
    },
};

export default function AssignmentWorkbench({
    assignment,
    courseSlug,
    courseTitle,
    skillsGained = [],
    onSubmissionSuccess,
}: AssignmentWorkbenchProps) {
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);
    const [repoUrl, setRepoUrl] = useState(assignment.user_submission?.repository_url || '');
    const [deliverableUrl, setDeliverableUrl] = useState(assignment.user_submission?.deliverable_url || '');
    const [submissionText, setSubmissionText] = useState(assignment.user_submission?.submission_text || '');
    const [activeSubmission, setActiveSubmission] = useState<AssignmentSubmission | null>(
        assignment.user_submission || null
    );

    // Interactive criteria checklist state
    const [checkedCriteria, setCheckedCriteria] = useState<Record<number, boolean>>({});

    const toggleCriteria = (idx: number) => {
        setCheckedCriteria((prev) => ({ ...prev, [idx]: !prev[idx] }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!repoUrl.trim() && !deliverableUrl.trim() && !submissionText.trim()) {
            toast.error('Please provide a repository URL, deliverable URL, or write-up.');
            return;
        }

        try {
            setSubmitting(true);
            const res = await api.submitAssignment(assignment.id, {
                repository_url: repoUrl.trim(),
                deliverable_url: deliverableUrl.trim(),
                submission_text: submissionText.trim(),
            });

            toast.success('Deliverable submitted successfully! 🚀');
            setActiveSubmission(res.submission);
            if (onSubmissionSuccess) {
                onSubmissionSuccess(res.submission);
            }
        } catch (err: any) {
            toast.error(err.message || 'Submission failed');
        } finally {
            setSubmitting(false);
        }
    };

    // Construct deep link to Launch Build Project in Workspaces
    const bridgeParams = new URLSearchParams({
        title: assignment.title,
        tags: skillsGained.join(','),
        starter_repo: assignment.starter_repo_url || '',
        ref: 'academy_assignment',
    });
    const bridgeHref = `/collaboration?${bridgeParams.toString()}`;

    const statusBadge = activeSubmission ? STATUS_BADGE[activeSubmission.status] : null;

    return (
        <div className="space-y-8">
            {/* Top Overview & Status */}
            <div className="rounded-2xl border border-[#1b1e2c] bg-[#0c0d15] p-6 lg:p-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#1b1e2c]">
                    <div>
                        <div className="inline-flex items-center gap-2 text-xs font-mono text-purple-400 uppercase tracking-wider mb-2 font-semibold">
                            <Hammer className="w-3.5 h-3.5" />
                            <span>Practical Build Capstone</span>
                        </div>
                        <h1 className="text-xl sm:text-2xl font-bold text-white">
                            {assignment.title}
                        </h1>
                    </div>

                    {statusBadge && (
                        <div
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-2 ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}
                        >
                            <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                            <span>{statusBadge.label}</span>
                        </div>
                    )}
                </div>

                {/* Instructions Markdown */}
                <div className="pt-6">
                    <MarkdownRenderer content={assignment.instructions_markdown} />
                </div>

                {/* Starter Repository link */}
                {assignment.starter_repo_url && (
                    <div className="mt-6 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Github className="w-5 h-5 text-zinc-300" />
                            <div>
                                <div className="text-xs font-semibold text-white">Starter Code Repository</div>
                                <div className="text-[11px] font-mono text-zinc-400 truncate max-w-sm sm:max-w-md">
                                    {assignment.starter_repo_url}
                                </div>
                            </div>
                        </div>

                        <a
                            href={assignment.starter_repo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-outline text-xs px-3 py-1.5 inline-flex items-center gap-1.5"
                        >
                            <span>Fork Starter</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                    </div>
                )}
            </div>

            {/* Interactive Acceptance Criteria Checklist */}
            {assignment.acceptance_criteria && assignment.acceptance_criteria.length > 0 && (
                <div className="rounded-2xl border border-[#1b1e2c] bg-[#0c0d15] p-6 lg:p-8">
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono mb-4 flex items-center gap-2">
                        <CheckSquare className="w-4 h-4 text-emerald-400" />
                        <span>Acceptance Criteria Verification</span>
                    </h2>

                    <div className="space-y-3">
                        {assignment.acceptance_criteria.map((criteria, idx) => {
                            const isChecked = checkedCriteria[idx] ?? false;
                            return (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => toggleCriteria(idx)}
                                    className={`w-full flex items-start gap-3 p-3.5 rounded-xl text-left border transition-all ${
                                        isChecked
                                            ? 'bg-emerald-500/[0.05] border-emerald-500/30 text-zinc-200'
                                            : 'bg-white/[0.01] border-white/[0.04] text-zinc-400 hover:text-white hover:border-[#2a2f45]'
                                    }`}
                                >
                                    <div className="mt-0.5 shrink-0">
                                        {isChecked ? (
                                            <CheckSquare className="w-4 h-4 text-emerald-400" />
                                        ) : (
                                            <Square className="w-4 h-4 text-zinc-600" />
                                        )}
                                    </div>
                                    <span className="text-xs sm:text-sm font-medium leading-relaxed">
                                        {criteria}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Submission Terminal */}
            <div className="rounded-2xl border border-[#1b1e2c] bg-[#0c0d15] p-6 lg:p-8">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono mb-2">
                    Deliverable Submission Terminal
                </h2>
                <p className="text-xs text-zinc-400 mb-6">
                    Submit your completed repository link or pull request for instructor verification.
                </p>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                            Git Repository URL
                        </label>
                        <input
                            type="url"
                            value={repoUrl}
                            onChange={(e) => setRepoUrl(e.target.value)}
                            placeholder="https://github.com/your-username/workspace-project"
                            className="w-full px-4 py-2.5 rounded-xl bg-[#090a0f] border border-[#1b1e2c] text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#1864ff]"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                            Live Demo / Pull Request URL (Optional)
                        </label>
                        <input
                            type="url"
                            value={deliverableUrl}
                            onChange={(e) => setDeliverableUrl(e.target.value)}
                            placeholder="https://your-demo.vercel.app or PR link"
                            className="w-full px-4 py-2.5 rounded-xl bg-[#090a0f] border border-[#1b1e2c] text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#1864ff]"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                            Implementation Notes / Architecture Summary
                        </label>
                        <textarea
                            rows={4}
                            value={submissionText}
                            onChange={(e) => setSubmissionText(e.target.value)}
                            placeholder="Briefly describe key architecture choices, trade-offs, and how you verified your build..."
                            className="w-full px-4 py-2.5 rounded-xl bg-[#090a0f] border border-[#1b1e2c] text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#1864ff]"
                        />
                    </div>

                    {/* Instructor Feedback Display if changes requested or approved */}
                    {activeSubmission?.feedback && (
                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                            <div className="text-xs font-mono font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                                Instructor Feedback
                            </div>
                            <p className="text-xs text-zinc-200 leading-relaxed">
                                {activeSubmission.feedback}
                            </p>
                        </div>
                    )}

                    <div className="pt-2 flex items-center justify-between">
                        <span className="text-[11px] text-zinc-500 font-mono">
                            Submissions are audited against course acceptance criteria
                        </span>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="btn-brand text-xs font-semibold px-5 py-2.5 inline-flex items-center gap-2"
                        >
                            <Send className="w-3.5 h-3.5" />
                            <span>{submitting ? 'Submitting...' : activeSubmission ? 'Resubmit Deliverable' : 'Submit for Review'}</span>
                        </button>
                    </div>
                </form>
            </div>

            {/* THE GOLDEN BRIDGE: Turn Course Learning into Real Verified Reputation */}
            <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-950/20 via-[#0c0d15] to-[#07070d] p-6 lg:p-8">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="max-w-xl">
                        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-[10px] font-mono font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20 uppercase tracking-wider mb-3">
                            <Sparkles className="w-3 h-3 text-purple-400" />
                            <span>The Golden Bridge · Workspace Pipeline</span>
                        </div>

                        <h3 className="text-base sm:text-lg font-bold text-white mb-2">
                            Take this Capstone to Production with a Builder Squad
                        </h3>

                        <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                            Course completion certifies knowledge. Real Proof of Work is minted when you build and verify
                            deliverables in an active ENQUEbet Workspace with fellow builders.
                        </p>
                    </div>

                    <Link
                        href={bridgeHref}
                        className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-bold bg-purple-600 text-white hover:bg-purple-500 transition-all duration-150 shadow-lg shadow-purple-600/20 shrink-0 self-start lg:self-center"
                    >
                        <Users className="w-4 h-4" />
                        <span>Launch Build Project in Workspaces</span>
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        </div>
    );
}
