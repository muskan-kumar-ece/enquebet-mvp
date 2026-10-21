"use client";

import React from 'react';
import { 
    X, Plus, Settings, UserMinus, Flag, Loader2
} from 'lucide-react';

interface CreateTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
    title: string;
    setTitle: (val: string) => void;
    description: string;
    setDescription: (val: string) => void;
    priority: string;
    setPriority: (val: string) => void;
    assignee: string;
    setAssignee: (val: string) => void;
    milestone: string;
    setMilestone: (val: string) => void;
    members: any[];
    milestones: any[];
    loading: boolean;
}

export function CreateTaskModal({
    isOpen,
    onClose,
    onSubmit,
    title,
    setTitle,
    description,
    setDescription,
    priority,
    setPriority,
    assignee,
    setAssignee,
    milestone,
    setMilestone,
    members,
    milestones,
    loading
}: CreateTaskModalProps) {
    if (!isOpen) return null;

    const activeMembers = members.filter(m => m.status === 'active');

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-[#0b0d14] border border-[#1e2335] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="p-5 border-b border-[#1e2335] flex items-center justify-between bg-[#0f111a]">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Plus className="w-4 h-4 text-brand" />
                        Create New Task
                    </h3>
                    <button 
                        type="button"
                        onClick={onClose} 
                        aria-label="Close modal"
                        className="p-1.5 rounded-lg text-text-secondary hover:text-white hover:bg-surface active:scale-90 transition-all touch-manipulation focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={onSubmit} className="p-5 space-y-4">
                    <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1">
                            Task Title *
                        </label>
                        <input
                            type="text"
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Implement WebSockets for real-time collaboration"
                            className="w-full text-xs px-3 py-2 rounded-lg bg-[#0f111a] border border-[#1e2335] text-white placeholder-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1">
                            Description & Acceptance Criteria
                        </label>
                        <textarea
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What does success look like? Detail requirements..."
                            className="w-full text-xs px-3 py-2 rounded-lg bg-[#0f111a] border border-[#1e2335] text-white placeholder-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand resize-none"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-slate-300 block mb-1">
                                Priority Level
                            </label>
                            <select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value)}
                                className="w-full text-xs px-3 py-2 rounded-lg bg-[#0f111a] border border-[#1e2335] text-white focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand cursor-pointer"
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="urgent">Urgent</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-300 block mb-1">
                                Assignee
                            </label>
                            <select
                                value={assignee}
                                onChange={(e) => setAssignee(e.target.value)}
                                className="w-full text-xs px-3 py-2 rounded-lg bg-[#0f111a] border border-[#1e2335] text-white focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand cursor-pointer"
                            >
                                <option value="">Unassigned (Backlog)</option>
                                {activeMembers.map((m: any) => (
                                    <option key={m.user?.id} value={m.user?.id}>
                                        @{m.user?.username} ({m.role_title || m.role})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1">
                            Associated Roadmap Milestone
                        </label>
                        <select
                            value={milestone}
                            onChange={(e) => setMilestone(e.target.value)}
                            className="w-full text-xs px-3 py-2 rounded-lg bg-[#0f111a] border border-[#1e2335] text-white focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand cursor-pointer"
                        >
                            <option value="">No Milestone</option>
                            {milestones.map((ms: any) => (
                                <option key={ms.id} value={ms.id}>
                                    {ms.title}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-medium rounded-lg text-text-secondary hover:text-white hover:bg-surface active:scale-95 transition-all touch-manipulation"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            aria-busy={loading}
                            className="btn-brand px-4 py-2 text-xs font-semibold rounded-lg disabled:opacity-50 active:scale-95 transition-all touch-manipulation focus-visible:ring-2 focus-visible:ring-brand flex items-center gap-1.5"
                        >
                            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                            <span>{loading ? 'Creating Task...' : 'Create Task'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

interface CreateMilestoneModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
    title: string;
    setTitle: (val: string) => void;
    description: string;
    setDescription: (val: string) => void;
    dueDate: string;
    setDueDate: (val: string) => void;
    loading: boolean;
}

export function CreateMilestoneModal({
    isOpen,
    onClose,
    onSubmit,
    title,
    setTitle,
    description,
    setDescription,
    dueDate,
    setDueDate,
    loading
}: CreateMilestoneModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#0b0d14] border border-[#1e2335] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="p-5 border-b border-[#1e2335] flex items-center justify-between bg-[#0f111a]">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Flag className="w-4 h-4 text-brand" />
                        Create Roadmap Milestone
                    </h3>
                    <button 
                        type="button"
                        onClick={onClose} 
                        aria-label="Close modal"
                        className="p-1.5 rounded-lg text-text-secondary hover:text-white hover:bg-surface active:scale-90 transition-all touch-manipulation focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={onSubmit} className="p-5 space-y-4">
                    <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1">
                            Milestone Title *
                        </label>
                        <input
                            type="text"
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. M1: Core Architecture & Auth MVP"
                            className="w-full text-xs px-3 py-2 rounded-lg bg-[#0f111a] border border-[#1e2335] text-white placeholder-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1">
                            Target Due Date (Optional)
                        </label>
                        <input
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="w-full text-xs px-3 py-2 rounded-lg bg-[#0f111a] border border-[#1e2335] text-white focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand cursor-pointer"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1">
                            Description
                        </label>
                        <textarea
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Milestone goals, deliverables, and scope..."
                            className="w-full text-xs px-3 py-2 rounded-lg bg-[#0f111a] border border-[#1e2335] text-white placeholder-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand resize-none"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-medium rounded-lg text-text-secondary hover:text-white hover:bg-surface active:scale-95 transition-all touch-manipulation"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            aria-busy={loading}
                            className="btn-brand px-4 py-2 text-xs font-semibold rounded-lg disabled:opacity-50 active:scale-95 transition-all touch-manipulation focus-visible:ring-2 focus-visible:ring-brand flex items-center gap-1.5"
                        >
                            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                            <span>{loading ? 'Creating Milestone...' : 'Create Milestone'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

interface WorkspaceSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
    repoUrl: string;
    setRepoUrl: (val: string) => void;
    demoUrl: string;
    setDemoUrl: (val: string) => void;
    docUrl: string;
    setDocUrl: (val: string) => void;
}

export function WorkspaceSettingsModal({
    isOpen,
    onClose,
    onSubmit,
    repoUrl,
    setRepoUrl,
    demoUrl,
    setDemoUrl,
    docUrl,
    setDocUrl
}: WorkspaceSettingsModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#0b0d14] border border-[#1e2335] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="p-5 border-b border-[#1e2335] flex items-center justify-between bg-[#0f111a]">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Settings className="w-4 h-4 text-brand" />
                        Workspace Links & Settings
                    </h3>
                    <button 
                        type="button"
                        onClick={onClose} 
                        aria-label="Close modal"
                        className="p-1.5 rounded-lg text-text-secondary hover:text-white hover:bg-surface active:scale-90 transition-all touch-manipulation focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={onSubmit} className="p-5 space-y-4">
                    <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1">
                            GitHub / Repository URL
                        </label>
                        <input
                            type="url"
                            value={repoUrl}
                            onChange={(e) => setRepoUrl(e.target.value)}
                            placeholder="https://github.com/organization/repo"
                            className="w-full text-xs px-3 py-2 rounded-lg bg-[#0f111a] border border-[#1e2335] text-white placeholder-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1">
                            Live Demo URL
                        </label>
                        <input
                            type="url"
                            value={demoUrl}
                            onChange={(e) => setDemoUrl(e.target.value)}
                            placeholder="https://myapp.vercel.app"
                            className="w-full text-xs px-3 py-2 rounded-lg bg-[#0f111a] border border-[#1e2335] text-white placeholder-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1">
                            Documentation / Architecture URL
                        </label>
                        <input
                            type="url"
                            value={docUrl}
                            onChange={(e) => setDocUrl(e.target.value)}
                            placeholder="https://docs.myapp.com or Notion doc"
                            className="w-full text-xs px-3 py-2 rounded-lg bg-[#0f111a] border border-[#1e2335] text-white placeholder-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-medium rounded-lg text-text-secondary hover:text-white hover:bg-surface active:scale-95 transition-all touch-manipulation"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn-brand px-4 py-2 text-xs font-semibold rounded-lg active:scale-95 transition-all touch-manipulation focus-visible:ring-2 focus-visible:ring-brand"
                        >
                            Save Settings
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

interface RemoveMemberModalProps {
    member: any | null;
    onClose: () => void;
    onConfirm: () => void;
    reason: string;
    setReason: (val: string) => void;
}

export function RemoveMemberModal({
    member,
    onClose,
    onConfirm,
    reason,
    setReason
}: RemoveMemberModalProps) {
    if (!member) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#0e0e17] border border-rose-500/30 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="p-5 border-b border-border flex items-center justify-between bg-rose-500/10">
                    <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2">
                        <UserMinus className="w-4 h-4 text-rose-400" />
                        Remove Team Member
                    </h3>
                    <button 
                        type="button"
                        onClick={onClose} 
                        aria-label="Close modal"
                        className="p-1.5 rounded-lg text-text-secondary hover:text-white hover:bg-rose-500/10 active:scale-90 transition-all touch-manipulation focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    <div className="p-3 rounded-lg bg-surface/60 border border-border/50 text-xs text-text-secondary">
                        Removing <strong className="text-white">@{member.user?.username}</strong> will unassign their open tasks and revoke access to the team workspace.
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1">
                            Recorded Justification / Reason *
                        </label>
                        <textarea
                            rows={3}
                            required
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Mandatory reason for project governance and audit records..."
                            className="w-full text-xs px-3 py-2 rounded-lg bg-surface border border-border text-white placeholder-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-rose-500 resize-none"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-medium rounded-lg text-text-secondary hover:text-white hover:bg-surface active:scale-95 transition-all touch-manipulation"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={onConfirm}
                            disabled={!reason.trim()}
                            className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white shadow-md shadow-rose-500/20 active:scale-95 transition-all touch-manipulation focus-visible:ring-2 focus-visible:ring-rose-500"
                        >
                            Confirm Removal
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
