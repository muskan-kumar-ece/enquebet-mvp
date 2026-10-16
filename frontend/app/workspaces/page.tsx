"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
    Kanban, Users, CheckCircle2, Clock, GitBranch, 
    ExternalLink, ArrowRight, ShieldCheck, Plus, Sparkles 
} from 'lucide-react';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

export default function WorkspacesListPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useRequireAuth();
    const [workspaces, setWorkspaces] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && user) {
            fetchWorkspaces();
        }
    }, [authLoading, user]);

    const fetchWorkspaces = async () => {
        setLoading(true);
        try {
            const data = await api.getMyWorkspaces();
            setWorkspaces(data);
        } catch (err: any) {
            toast.error(err.message || 'Failed to load workspaces');
        } finally {
            setLoading(false);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-text-secondary animate-pulse flex items-center gap-2">
                    <Kanban className="w-5 h-5 animate-spin text-purple" />
                    <span>Loading your workspaces...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-default pb-6">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple/10 border border-purple/30 flex items-center justify-center text-purple">
                                <Kanban className="w-5 h-5" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight text-text-primary">Project Workspaces</h1>
                                <p className="text-sm text-text-secondary">
                                    Collaborative execution boards, tasks, milestones, and verifiable Proof of Work.
                                </p>
                            </div>
                        </div>
                    </div>
                    <Link
                        href="/create"
                        className="btn-primary text-sm flex items-center gap-2 self-start sm:self-auto"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Launch Project</span>
                    </Link>
                </div>

                {/* Workspace Grid */}
                {workspaces.length === 0 ? (
                    <div className="card text-center py-16 border-dashed">
                        <Kanban className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-40" />
                        <h3 className="font-semibold text-lg text-text-primary mb-1">No Active Workspaces Yet</h3>
                        <p className="text-sm text-text-secondary max-w-md mx-auto mb-6">
                            Workspaces are automatically provisioned when you collaborate on a project or someone accepts your collaboration request.
                        </p>
                        <div className="flex items-center justify-center gap-4">
                            <Link href="/collaboration" className="btn-primary text-sm">
                                View Collaboration Requests
                            </Link>
                            <Link href="/" className="btn-secondary text-sm">
                                Explore Projects
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {workspaces.map((ws) => {
                            const isOwner = ws.current_user_role === 'owner';
                            const isCompleted = ws.status === 'completed';

                            return (
                                <Link
                                    key={ws.id}
                                    href={`/workspace/${ws.id}`}
                                    className="card group hover:border-purple/50 transition-all duration-200 flex flex-col justify-between"
                                >
                                    <div>
                                        {/* Status & Role Pill */}
                                        <div className="flex items-center justify-between gap-2 mb-3">
                                            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${
                                                isCompleted 
                                                    ? 'bg-green-500/10 text-green-400 border-green-500/30' 
                                                    : 'bg-purple/10 text-purple-light border-purple/30'
                                            }`}>
                                                {isCompleted ? '✓ Completed' : 'Active Execution'}
                                            </span>
                                            <span className="text-xs text-text-muted font-mono uppercase bg-bg-hover px-2 py-0.5 rounded">
                                                Role: {ws.current_user_role || 'Member'}
                                            </span>
                                        </div>

                                        {/* Title */}
                                        <h3 className="text-lg font-semibold text-text-primary group-hover:text-purple transition-colors mb-2 line-clamp-1">
                                            {ws.post?.title || 'Untitled Project'}
                                        </h3>
                                        <p className="text-sm text-text-secondary line-clamp-2 mb-4">
                                            {ws.post?.description || 'No description provided.'}
                                        </p>

                                        {/* Progress Bar */}
                                        <div className="space-y-1.5 mb-4">
                                            <div className="flex items-center justify-between text-xs text-text-muted">
                                                <span>Task Completion</span>
                                                <span className="font-mono">{ws.progress_percentage || 0}%</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-bg-hover rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-gradient-to-r from-purple to-primary transition-all duration-300"
                                                    style={{ width: `${ws.progress_percentage || 0}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Footer stats */}
                                    <div className="pt-4 border-t border-border-default/60 flex items-center justify-between text-xs text-text-muted">
                                        <div className="flex items-center gap-3">
                                            <span className="flex items-center gap-1">
                                                <Users className="w-3.5 h-3.5" />
                                                <span>{ws.active_members_count || 1} builders</span>
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                                                <span>{ws.completed_tasks_count || 0}/{ws.tasks_count || 0} tasks</span>
                                            </span>
                                        </div>
                                        <span className="flex items-center gap-1 text-purple group-hover:translate-x-0.5 transition-transform font-medium">
                                            Open Board <ArrowRight className="w-3 h-3" />
                                        </span>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
