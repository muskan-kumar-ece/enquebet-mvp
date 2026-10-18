"use client";

import React from 'react';
import Link from 'next/link';
import { 
    Kanban, Users, CheckCircle2, Clock, GitBranch, 
    ExternalLink, ArrowLeft, ShieldCheck, Settings, 
    LogOut, MessageSquare, Award, RefreshCw, Sparkles
} from 'lucide-react';
import { BrandMarkSvg } from '@/components/ui/BrandLogo';

interface WorkspaceHeaderProps {
    workspace: any;
    onComplete: () => void;
    onReopen: () => void;
    onOpenSettings: () => void;
    onLeave: () => void;
    activeTab: 'tasks' | 'milestones' | 'team' | 'activity' | 'proof';
    setActiveTab: (tab: 'tasks' | 'milestones' | 'team' | 'activity' | 'proof') => void;
    tasksCount: number;
    milestonesCount: number;
    membersCount: number;
    activityCount: number;
    hasProof: boolean;
}

export function WorkspaceHeader({
    workspace,
    onComplete,
    onReopen,
    onOpenSettings,
    onLeave,
    activeTab,
    setActiveTab,
    tasksCount,
    milestonesCount,
    membersCount,
    activityCount,
    hasProof
}: WorkspaceHeaderProps) {
    const isOwner = workspace?.current_user_role === 'owner';
    const isLeadOrOwner = workspace?.current_user_role === 'owner' || workspace?.current_user_role === 'lead';
    const isCompleted = workspace?.status === 'completed';

    const tabs = [
        { key: 'tasks', label: 'Kanban Tasks', icon: Kanban, count: tasksCount },
        { key: 'milestones', label: 'Roadmap & Milestones', icon: Clock, count: milestonesCount },
        { key: 'team', label: 'Team Roster', icon: Users, count: membersCount },
        { key: 'activity', label: 'Audit Timeline', icon: ShieldCheck, count: activityCount },
        ...(isCompleted || hasProof ? [{ key: 'proof', label: 'Proof of Work', icon: Award, count: null }] : []),
    ] as const;

    return (
        <div className="border-b border-border bg-[#0b0d14]/90 backdrop-blur-md sticky top-0 z-30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 pb-3">
                {/* Top Action Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                        <Link 
                            href="/workspaces" 
                            className="p-2 rounded-lg bg-surface hover:bg-surface-hover border border-border text-text-secondary hover:text-text transition-colors"
                            title="Back to all workspaces"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <BrandMarkSvg size={18} />
                                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                                    {workspace?.post?.title || 'Project Workspace'}
                                </h1>
                                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border flex items-center gap-1.5 ${
                                    isCompleted 
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                                        : 'bg-brand/10 text-brand-light border-brand/30'
                                }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${isCompleted ? 'bg-emerald-400 animate-pulse' : 'bg-brand animate-pulse'}`} />
                                    {isCompleted ? 'Completed' : 'Active Sprint'}
                                </span>
                            </div>
                            <p className="text-xs text-text-secondary line-clamp-1 mt-0.5">
                                {workspace?.post?.summary || 'Collaborative workspace execution environment'}
                            </p>
                        </div>
                    </div>

                    {/* Action Dock */}
                    <div className="flex flex-wrap items-center gap-2">
                        {workspace?.repo_url && (
                            <a 
                                href={workspace.repo_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 text-xs rounded-lg bg-surface hover:bg-surface-hover border border-border text-text-secondary hover:text-text flex items-center gap-1.5 transition-colors"
                            >
                                <GitBranch className="w-3.5 h-3.5" />
                                <span>Codebase</span>
                                <ExternalLink className="w-3 h-3 opacity-60" />
                            </a>
                        )}

                        {workspace?.demo_url && (
                            <a 
                                href={workspace.demo_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 text-xs rounded-lg bg-surface hover:bg-surface-hover border border-border text-text-secondary hover:text-text flex items-center gap-1.5 transition-colors"
                            >
                                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                <span>Live Demo</span>
                                <ExternalLink className="w-3 h-3 opacity-60" />
                            </a>
                        )}

                        {workspace?.post?.id && (
                            <Link 
                                href={`/messages?project=${workspace.post.id}`}
                                className="px-3 py-1.5 text-xs rounded-lg bg-surface hover:bg-surface-hover border border-border text-text-secondary hover:text-text flex items-center gap-1.5 transition-colors"
                            >
                                <MessageSquare className="w-3.5 h-3.5 text-brand" />
                                <span>Team Chat</span>
                            </Link>
                        )}

                        {isLeadOrOwner && (
                            <button
                                onClick={onOpenSettings}
                                className="p-2 rounded-lg bg-surface hover:bg-surface-hover border border-border text-text-secondary hover:text-text transition-colors"
                                title="Workspace Settings"
                            >
                                <Settings className="w-4 h-4" />
                            </button>
                        )}

                        {!isOwner && (
                            <button
                                onClick={onLeave}
                                className="px-3 py-1.5 text-xs rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 flex items-center gap-1.5 transition-colors"
                            >
                                <LogOut className="w-3.5 h-3.5" />
                                <span>Leave Team</span>
                            </button>
                        )}

                        {isOwner && !isCompleted && (
                            <button
                                onClick={onComplete}
                                className="btn-primary px-3.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5"
                            >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Complete & Mint PoW</span>
                            </button>
                        )}

                        {isOwner && isCompleted && (
                            <button
                                onClick={onReopen}
                                className="px-3 py-1.5 text-xs rounded-lg bg-surface hover:bg-surface-hover border border-border text-text-secondary hover:text-text flex items-center gap-1.5 transition-colors"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Reopen Sprint</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                    <div className="flex items-center justify-between text-xs text-text-secondary mb-1.5 font-medium">
                        <span className="flex items-center gap-1.5">
                            Sprint Progress
                            <span className="text-white font-bold">{workspace?.progress_percentage || 0}%</span>
                        </span>
                        <span>
                            {workspace?.completed_tasks_count || 0} of {workspace?.tasks_count || 0} tasks completed
                        </span>
                    </div>
                    <div className="w-full bg-[#181826] rounded-full h-1.5 overflow-hidden">
                        <div 
                            className={`h-full transition-all duration-500 rounded-full ${
                                isCompleted 
                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400' 
                                    : 'bg-brand'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, workspace?.progress_percentage || 0))}%` }}
                        />
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pt-1">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key as any)}
                                className={`px-3.5 py-2 text-xs font-medium rounded-lg flex items-center gap-2 transition-all whitespace-nowrap ${
                                    isActive 
                                        ? 'bg-brand/15 text-brand-light border border-brand/30 shadow-sm font-semibold' 
                                        : 'text-text-secondary hover:text-text hover:bg-surface border border-transparent'
                                }`}
                            >
                                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-brand' : 'text-text-secondary'}`} />
                                <span>{tab.label}</span>
                                {tab.count !== null && (
                                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                                        isActive ? 'bg-brand/20 text-brand-light' : 'bg-surface text-text-secondary'
                                    }`}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
