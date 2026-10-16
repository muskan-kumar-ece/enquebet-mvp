"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
    Kanban, Users, CheckCircle2, Clock, GitBranch, 
    ExternalLink, ArrowLeft, Plus, Check, X, AlertCircle, 
    ShieldCheck, Star, FileText, Send, Settings, UserMinus, 
    LogOut, MessageSquare, ChevronRight, Hash, Copy, Award,
    AlertTriangle, RefreshCw
} from 'lucide-react';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

const TASK_STATUS_COLUMNS = [
    { key: 'backlog', label: 'Backlog', color: 'border-slate-500/30' },
    { key: 'in_progress', label: 'In Progress', color: 'border-blue-500/30' },
    { key: 'in_review', label: 'In Review', color: 'border-yellow-500/30' },
    { key: 'changes_requested', label: 'Changes Requested', color: 'border-orange-500/30' },
    { key: 'completed', label: 'Completed', color: 'border-green-500/30' },
    { key: 'blocked', label: 'Blocked', color: 'border-red-500/30' },
];

const PRIORITY_BADGES: Record<string, { label: string; className: string }> = {
    low: { label: 'Low', className: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
    medium: { label: 'Medium', className: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    high: { label: 'High', className: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
    urgent: { label: 'Urgent', className: 'bg-red-500/10 text-red-400 border-red-500/20' },
};

export default function WorkspacePage() {
    const params = useParams();
    const router = useRouter();
    const workspaceId = params.id as string;
    const { user, loading: authLoading } = useRequireAuth();

    // Data States
    const [workspace, setWorkspace] = useState<any>(null);
    const [members, setMembers] = useState<any[]>([]);
    const [tasks, setTasks] = useState<any[]>([]);
    const [milestones, setMilestones] = useState<any[]>([]);
    const [activity, setActivity] = useState<any[]>([]);
    const [proof, setProof] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Active Tab: 'tasks' | 'milestones' | 'team' | 'activity' | 'proof'
    const [activeTab, setActiveTab] = useState<'tasks' | 'milestones' | 'team' | 'activity' | 'proof'>('tasks');

    // Modals
    const [showCreateTask, setShowCreateTask] = useState(false);
    const [showCreateMilestone, setShowCreateMilestone] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [selectedTask, setSelectedTask] = useState<any>(null);
    const [showLeaveModal, setShowLeaveModal] = useState(false);
    const [showRemoveMemberModal, setShowRemoveMemberModal] = useState<any>(null);
    const [removeReason, setRemoveReason] = useState('');

    // Forms
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskDesc, setNewTaskDesc] = useState('');
    const [newTaskPriority, setNewTaskPriority] = useState('medium');
    const [newTaskAssignee, setNewTaskAssignee] = useState('');
    const [newTaskMilestone, setNewTaskMilestone] = useState('');
    const [submittingTask, setSubmittingTask] = useState(false);

    // Deliverable submission form inside selected task
    const [deliverablePrUrl, setDeliverablePrUrl] = useState('');
    const [deliverableFileUrl, setDeliverableFileUrl] = useState('');
    const [deliverableDesc, setDeliverableDesc] = useState('');
    const [submittingDeliverable, setSubmittingDeliverable] = useState(false);

    // Review form inside selected task
    const [reviewVerdict, setReviewVerdict] = useState<'approved' | 'changes_requested' | 'rejected'>('approved');
    const [reviewFeedback, setReviewFeedback] = useState('');
    const [submittingReview, setSubmittingReview] = useState(false);

    // Milestone form
    const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
    const [newMilestoneDesc, setNewMilestoneDesc] = useState('');
    const [newMilestoneDueDate, setNewMilestoneDueDate] = useState('');

    // Peer review form
    const [peerRevieweeId, setPeerRevieweeId] = useState('');
    const [peerExecScore, setPeerExecScore] = useState(5);
    const [peerCollabScore, setPeerCollabScore] = useState(5);
    const [peerRelScore, setPeerRelScore] = useState(5);
    const [peerFeedback, setPeerFeedback] = useState('');
    const [submittingPeerReview, setSubmittingPeerReview] = useState(false);

    // Settings form
    const [repoUrl, setRepoUrl] = useState('');
    const [demoUrl, setDemoUrl] = useState('');
    const [docUrl, setDocUrl] = useState('');

    useEffect(() => {
        if (!authLoading && user && workspaceId) {
            loadAllWorkspaceData();
        }
    }, [authLoading, user, workspaceId]);

    const loadAllWorkspaceData = async () => {
        setLoading(true);
        try {
            const wsData = await api.getWorkspace(workspaceId);
            setWorkspace(wsData);
            setRepoUrl(wsData.repo_url || '');
            setDemoUrl(wsData.demo_url || '');
            setDocUrl(wsData.documentation_url || '');

            const [mems, tks, mls, act] = await Promise.all([
                api.getWorkspaceMembers(workspaceId),
                api.getWorkspaceTasks(workspaceId),
                api.getWorkspaceMilestones(workspaceId),
                api.getWorkspaceActivity(workspaceId),
            ]);

            setMembers(mems);
            setTasks(tks);
            setMilestones(mls);
            setActivity(act);

            if (wsData.status === 'completed') {
                // Load proof if completed
                try {
                    const proofData = await api.getWorkspaceProof(workspaceId);
                    setProof(proofData);
                } catch (e) {
                    // Not a critical error if proof not yet minted
                }
            }
        } catch (err: any) {
            console.error('Workspace load error:', err);
            toast.error(err.message || 'Access denied or workspace not found');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;
        setSubmittingTask(true);
        try {
            const task = await api.createWorkspaceTask(workspaceId, {
                title: newTaskTitle.trim(),
                description: newTaskDesc.trim(),
                priority: newTaskPriority,
                assignee_id: newTaskAssignee || undefined,
                milestone_id: newTaskMilestone || undefined,
            });
            setTasks(prev => [task, ...prev]);
            setShowCreateTask(false);
            setNewTaskTitle('');
            setNewTaskDesc('');
            toast.success('Task created');
            // Refresh activity
            api.getWorkspaceActivity(workspaceId).then(setActivity);
        } catch (err: any) {
            toast.error(err.message || 'Failed to create task');
        } finally {
            setSubmittingTask(false);
        }
    };

    const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
        try {
            const updated = await api.updateWorkspaceTask(workspaceId, taskId, { status: newStatus });
            setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
            if (selectedTask?.id === taskId) setSelectedTask(updated);
            toast.success(`Task status: ${newStatus.replace('_', ' ')}`);
            loadAllWorkspaceData();
        } catch (err: any) {
            toast.error(err.message || 'Failed to update task status');
        }
    };

    const handleSubmitDeliverable = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTask) return;
        if (!deliverablePrUrl.trim() && !deliverableFileUrl.trim()) {
            toast.error('Please provide a Pull Request / repository URL or attachment link');
            return;
        }

        setSubmittingDeliverable(true);
        try {
            const deliverable = await api.submitTaskDeliverable(workspaceId, selectedTask.id, {
                pr_url: deliverablePrUrl.trim(),
                file_url: deliverableFileUrl.trim(),
                description: deliverableDesc.trim(),
            });

            toast.success('Deliverable submitted for review! Task moved to In Review.');
            setDeliverablePrUrl('');
            setDeliverableFileUrl('');
            setDeliverableDesc('');

            // Reload task details
            const updatedTasks = await api.getWorkspaceTasks(workspaceId);
            setTasks(updatedTasks);
            const fresh = updatedTasks.find((t: any) => t.id === selectedTask.id);
            if (fresh) setSelectedTask(fresh);
        } catch (err: any) {
            toast.error(err.message || 'Failed to submit deliverable');
        } finally {
            setSubmittingDeliverable(false);
        }
    };

    const handleReviewDeliverable = async (deliverableId: string) => {
        if (!selectedTask) return;
        setSubmittingReview(true);
        try {
            await api.reviewTaskDeliverable(workspaceId, selectedTask.id, deliverableId, {
                verdict: reviewVerdict,
                feedback: reviewFeedback.trim(),
            });

            toast.success(`Deliverable ${reviewVerdict.replace('_', ' ')}!`);
            setReviewFeedback('');

            // Reload tasks
            const updatedTasks = await api.getWorkspaceTasks(workspaceId);
            setTasks(updatedTasks);
            const fresh = updatedTasks.find((t: any) => t.id === selectedTask.id);
            if (fresh) setSelectedTask(fresh);
            loadAllWorkspaceData();
        } catch (err: any) {
            toast.error(err.message || 'Review failed');
        } finally {
            setSubmittingReview(false);
        }
    };

    const handleCreateMilestone = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMilestoneTitle.trim()) return;
        try {
            const ms = await api.createWorkspaceMilestone(workspaceId, {
                title: newMilestoneTitle.trim(),
                description: newMilestoneDesc.trim(),
                due_date: newMilestoneDueDate || undefined,
            });
            setMilestones(prev => [...prev, ms]);
            setShowCreateMilestone(false);
            setNewMilestoneTitle('');
            setNewMilestoneDesc('');
            toast.success('Milestone created');
        } catch (err: any) {
            toast.error(err.message || 'Failed to create milestone');
        }
    };

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const updated = await api.updateWorkspace(workspaceId, {
                repo_url: repoUrl.trim(),
                demo_url: demoUrl.trim(),
                documentation_url: docUrl.trim(),
            });
            setWorkspace(updated);
            setShowSettings(false);
            toast.success('Workspace links updated');
        } catch (err: any) {
            toast.error(err.message || 'Failed to update workspace');
        }
    };

    const handleCompleteProject = async () => {
        if (!confirm('Are you sure you want to complete this project? This will verify all deliverables and mint an immutable Proof of Work.')) {
            return;
        }

        try {
            const res = await api.completeWorkspace(workspaceId);
            toast.success('Project completed! Proof of Work minted 🎉');
            setProof(res.proof_of_work);
            setActiveTab('proof');
            loadAllWorkspaceData();
        } catch (err: any) {
            toast.error(err.message || 'Failed to complete project');
        }
    };

    const handleLeaveWorkspace = async () => {
        try {
            await api.leaveWorkspace(workspaceId);
            toast.success('You have left the workspace.');
            router.push('/workspaces');
        } catch (err: any) {
            toast.error(err.message || 'Failed to leave workspace');
        }
    };

    const handleRemoveMember = async () => {
        if (!showRemoveMemberModal) return;
        if (!removeReason.trim()) {
            toast.error('A recorded removal reason is required.');
            return;
        }
        try {
            await api.removeWorkspaceMember(workspaceId, showRemoveMemberModal.id, removeReason.trim());
            toast.success(`Removed ${showRemoveMemberModal.user?.username || 'member'}`);
            setShowRemoveMemberModal(null);
            setRemoveReason('');
            const mems = await api.getWorkspaceMembers(workspaceId);
            setMembers(mems);
        } catch (err: any) {
            toast.error(err.message || 'Failed to remove member');
        }
    };

    const handleSubmitPeerReview = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!proof?.verification_code) {
            toast.error('Proof of Work code missing');
            return;
        }
        if (!peerRevieweeId) {
            toast.error('Please select a teammate to evaluate');
            return;
        }

        setSubmittingPeerReview(true);
        try {
            await api.submitPeerReview(proof.verification_code, {
                reviewee_id: peerRevieweeId,
                execution_score: peerExecScore,
                collaboration_score: peerCollabScore,
                reliability_score: peerRelScore,
                feedback: peerFeedback.trim(),
            });
            toast.success('Peer review recorded! Builder reputation updated.');
            setPeerFeedback('');
            // Reload proof
            const p = await api.getPublicProof(proof.verification_code);
            setProof(p);
        } catch (err: any) {
            toast.error(err.message || 'Failed to submit peer review');
        } finally {
            setSubmittingPeerReview(false);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-text-secondary animate-pulse flex items-center gap-2">
                    <Kanban className="w-5 h-5 animate-spin text-purple" />
                    <span>Loading project workspace...</span>
                </div>
            </div>
        );
    }

    if (!workspace) {
        return (
            <div className="min-h-screen p-6 flex items-center justify-center">
                <div className="card text-center py-12 max-w-md">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                    <h2 className="text-xl font-bold mb-2">Workspace Access Denied</h2>
                    <p className="text-text-secondary text-sm mb-6">
                        You are not an active member of this project or the workspace does not exist.
                    </p>
                    <Link href="/workspaces" className="btn-primary">
                        Return to My Workspaces
                    </Link>
                </div>
            </div>
        );
    }

    const isOwner = workspace.current_user_role === 'owner';
    const isLeadOrOwner = workspace.current_user_role === 'owner' || workspace.current_user_role === 'lead';
    const isCompleted = workspace.status === 'completed';

    return (
        <div className="min-h-screen p-4 sm:p-6 pb-24">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Top Navigation Row */}
                <div className="flex items-center justify-between text-sm">
                    <Link 
                        href="/workspaces" 
                        className="flex items-center gap-1.5 text-text-muted hover:text-text-primary transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>All Workspaces</span>
                    </Link>

                    <div className="flex items-center gap-3">
                        <Link 
                            href={`/posts/${workspace.post?.id}`}
                            className="text-text-muted hover:text-purple text-xs flex items-center gap-1 transition-colors"
                        >
                            <span>View Public Post</span>
                            <ExternalLink className="w-3 h-3" />
                        </Link>
                        {isLeadOrOwner && (
                            <button
                                onClick={() => setShowSettings(true)}
                                className="p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-bg-hover transition-colors"
                                title="Workspace Settings"
                            >
                                <Settings className="w-4 h-4" />
                            </button>
                        )}
                        {!isOwner && (
                            <button
                                onClick={() => setShowLeaveModal(true)}
                                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 px-2.5 py-1 rounded-lg border border-red-500/20 hover:bg-red-500/10 transition-colors"
                            >
                                <LogOut className="w-3.5 h-3.5" />
                                <span>Leave</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Workspace Header Card */}
                <div className="card space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                                    isCompleted 
                                        ? 'bg-green-500/10 text-green-400 border-green-500/30' 
                                        : 'bg-purple/10 text-purple-light border-purple/30'
                                }`}>
                                    {isCompleted ? '✓ Completed' : 'Active Execution'}
                                </span>
                                <span className="text-xs font-mono uppercase bg-bg-hover text-text-secondary px-2 py-0.5 rounded border border-border-default">
                                    Role: {workspace.current_user_role || 'Contributor'}
                                </span>
                                {workspace.post?.category && (
                                    <span className="text-xs text-text-muted uppercase">
                                        • {workspace.post.category}
                                    </span>
                                )}
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
                                {workspace.post?.title || 'Project Workspace'}
                            </h1>
                            <p className="text-sm text-text-secondary line-clamp-2 max-w-3xl">
                                {workspace.post?.description}
                            </p>
                        </div>

                        {/* Complete Project CTA */}
                        {isOwner && !isCompleted && (
                            <button
                                onClick={handleCompleteProject}
                                className="btn-primary self-start md:self-auto flex items-center gap-2 text-sm px-4 py-2 bg-gradient-to-r from-purple to-green-600 hover:from-purple-dark hover:to-green-700 shadow-lg"
                            >
                                <Award className="w-4 h-4" />
                                <span>Complete & Mint Proof</span>
                            </button>
                        )}

                        {isCompleted && (
                            <Link
                                href={`/proof/${proof?.verification_code || ''}`}
                                className="btn-secondary self-start md:self-auto flex items-center gap-2 text-sm border-green-500/40 text-green-400 hover:bg-green-500/10"
                            >
                                <ShieldCheck className="w-4 h-4 text-green-400" />
                                <span>Verify Proof of Work</span>
                            </Link>
                        )}
                    </div>

                    {/* Progress Bar & Quick Links */}
                    <div className="pt-4 border-t border-border-default/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                        {/* Progress */}
                        <div className="flex-1 max-w-md space-y-1">
                            <div className="flex items-center justify-between text-text-muted">
                                <span>Execution Progress</span>
                                <span className="font-mono text-purple-light font-medium">{workspace.progress_percentage || 0}%</span>
                            </div>
                            <div className="w-full h-2 bg-bg-hover rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-purple to-primary transition-all duration-300"
                                    style={{ width: `${workspace.progress_percentage || 0}%` }}
                                />
                            </div>
                        </div>

                        {/* Project Resource Links */}
                        <div className="flex items-center gap-2 flex-wrap">
                            {workspace.repo_url ? (
                                <a 
                                    href={workspace.repo_url} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="px-2.5 py-1 rounded bg-bg-hover hover:bg-bg-hover-light border border-border-default text-text-secondary hover:text-text-primary flex items-center gap-1.5 transition-colors"
                                >
                                    <GitBranch className="w-3.5 h-3.5 text-purple" />
                                    <span>Repository</span>
                                </a>
                            ) : null}

                            {workspace.demo_url ? (
                                <a 
                                    href={workspace.demo_url} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="px-2.5 py-1 rounded bg-bg-hover hover:bg-bg-hover-light border border-border-default text-text-secondary hover:text-text-primary flex items-center gap-1.5 transition-colors"
                                >
                                    <ExternalLink className="w-3.5 h-3.5 text-primary" />
                                    <span>Live Demo</span>
                                </a>
                            ) : null}

                            {workspace.documentation_url ? (
                                <a 
                                    href={workspace.documentation_url} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="px-2.5 py-1 rounded bg-bg-hover hover:bg-bg-hover-light border border-border-default text-text-secondary hover:text-text-primary flex items-center gap-1.5 transition-colors"
                                >
                                    <FileText className="w-3.5 h-3.5 text-yellow-400" />
                                    <span>Docs</span>
                                </a>
                            ) : null}
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex items-center gap-1 border-b border-border-default overflow-x-auto pb-px">
                    <button
                        onClick={() => setActiveTab('tasks')}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all shrink-0 ${
                            activeTab === 'tasks'
                                ? 'border-purple text-purple-light'
                                : 'border-transparent text-text-secondary hover:text-text-primary'
                        }`}
                    >
                        <Kanban className="w-4 h-4" />
                        <span>Tasks Board ({tasks.length})</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('milestones')}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all shrink-0 ${
                            activeTab === 'milestones'
                                ? 'border-purple text-purple-light'
                                : 'border-transparent text-text-secondary hover:text-text-primary'
                        }`}
                    >
                        <Award className="w-4 h-4" />
                        <span>Milestones ({milestones.length})</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('team')}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all shrink-0 ${
                            activeTab === 'team'
                                ? 'border-purple text-purple-light'
                                : 'border-transparent text-text-secondary hover:text-text-primary'
                        }`}
                    >
                        <Users className="w-4 h-4" />
                        <span>Team Roster ({members.length})</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('activity')}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all shrink-0 ${
                            activeTab === 'activity'
                                ? 'border-purple text-purple-light'
                                : 'border-transparent text-text-secondary hover:text-text-primary'
                        }`}
                    >
                        <Clock className="w-4 h-4" />
                        <span>Activity Audit</span>
                    </button>

                    {isCompleted && (
                        <button
                            onClick={() => setActiveTab('proof')}
                            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all shrink-0 ${
                                activeTab === 'proof'
                                    ? 'border-green-500 text-green-400'
                                    : 'border-transparent text-text-secondary hover:text-text-primary'
                            }`}
                        >
                            <ShieldCheck className="w-4 h-4 text-green-400" />
                            <span>Proof of Work & Reviews</span>
                        </button>
                    )}
                </div>

                {/* TAB CONTENT: 1. TASKS BOARD */}
                {activeTab === 'tasks' && (
                    <div className="space-y-4">
                        {/* Board Controls */}
                        <div className="flex items-center justify-between gap-4">
                            <span className="text-xs text-text-muted">
                                Drag or click task cards to inspect deliverables, submit code, or request reviews.
                            </span>
                            <button
                                onClick={() => setShowCreateTask(true)}
                                className="btn-primary text-xs flex items-center gap-1.5 py-1.5 px-3"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>New Task</span>
                            </button>
                        </div>

                        {/* Kanban Columns */}
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
                            {TASK_STATUS_COLUMNS.map((col) => {
                                const colTasks = tasks.filter(t => t.status === col.key);
                                return (
                                    <div 
                                        key={col.key} 
                                        className="bg-bg-card/60 border border-border-default/80 rounded-xl p-3 flex flex-col min-h-[420px]"
                                    >
                                        {/* Column Header */}
                                        <div className={`flex items-center justify-between pb-2.5 mb-2.5 border-b ${col.color}`}>
                                            <span className="text-xs font-semibold text-text-primary">{col.label}</span>
                                            <span className="text-xs font-mono text-text-muted bg-bg-hover px-1.5 py-0.5 rounded">
                                                {colTasks.length}
                                            </span>
                                        </div>

                                        {/* Task List */}
                                        <div className="space-y-2.5 flex-1 overflow-y-auto">
                                            {colTasks.length === 0 ? (
                                                <div className="text-center py-8 text-xs text-text-muted opacity-40">
                                                    No tasks
                                                </div>
                                            ) : (
                                                colTasks.map((t) => {
                                                    const prio = PRIORITY_BADGES[t.priority] || PRIORITY_BADGES.medium;
                                                    return (
                                                        <div
                                                            key={t.id}
                                                            onClick={() => setSelectedTask(t)}
                                                            className="p-3 bg-bg-card-elevated hover:bg-bg-hover border border-border-default rounded-lg cursor-pointer transition-all duration-150 space-y-2 group shadow-sm"
                                                        >
                                                            <div className="flex items-center justify-between gap-1">
                                                                <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${prio.className}`}>
                                                                    {prio.label}
                                                                </span>
                                                                {t.deliverables && t.deliverables.length > 0 && (
                                                                    <span className="text-[10px] text-purple-light flex items-center gap-0.5 bg-purple/10 px-1.5 py-0.2 rounded font-mono">
                                                                        <GitBranch className="w-2.5 h-2.5" />
                                                                        v{t.deliverables.length}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <h4 className="text-xs font-medium text-text-primary group-hover:text-purple transition-colors line-clamp-2">
                                                                {t.title}
                                                            </h4>

                                                            <div className="flex items-center justify-between pt-1 border-t border-border-default/40 text-[11px] text-text-muted">
                                                                <span>{t.assignee?.username || 'Unassigned'}</span>
                                                                {t.due_date && (
                                                                    <span className="font-mono text-[10px]">
                                                                        {new Date(t.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* TAB CONTENT: 2. MILESTONES */}
                {activeTab === 'milestones' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-text-secondary">Project Milestones</h3>
                            {isLeadOrOwner && (
                                <button
                                    onClick={() => setShowCreateMilestone(true)}
                                    className="btn-primary text-xs flex items-center gap-1.5 py-1.5 px-3"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Add Milestone</span>
                                </button>
                            )}
                        </div>

                        {milestones.length === 0 ? (
                            <div className="card text-center py-12 border-dashed">
                                <Award className="w-10 h-10 text-text-muted mx-auto mb-2 opacity-40" />
                                <p className="text-sm text-text-secondary mb-3">No milestones defined yet.</p>
                                {isLeadOrOwner && (
                                    <button
                                        onClick={() => setShowCreateMilestone(true)}
                                        className="btn-secondary text-xs"
                                    >
                                        Create First Milestone
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {milestones.map((ms, index) => {
                                    const linkedTasks = tasks.filter(t => t.milestone === ms.id);
                                    const completedLinked = linkedTasks.filter(t => t.status === 'completed');
                                    const msProgress = linkedTasks.length > 0 ? Math.round((completedLinked.length / linkedTasks.length) * 100) : 0;

                                    return (
                                        <div key={ms.id} className="card space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-6 h-6 rounded-full bg-purple/10 border border-purple/30 text-purple text-xs flex items-center justify-center font-bold">
                                                        {index + 1}
                                                    </span>
                                                    <h4 className="font-semibold text-text-primary text-sm">{ms.title}</h4>
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-text-muted">
                                                    {ms.due_date && (
                                                        <span>Due: {new Date(ms.due_date).toLocaleDateString()}</span>
                                                    )}
                                                    <span className="font-mono text-purple">{msProgress}%</span>
                                                </div>
                                            </div>

                                            {ms.description && (
                                                <p className="text-xs text-text-secondary">{ms.description}</p>
                                            )}

                                            <div className="w-full h-1.5 bg-bg-hover rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-purple transition-all duration-300"
                                                    style={{ width: `${msProgress}%` }}
                                                />
                                            </div>

                                            <div className="text-[11px] text-text-muted flex items-center gap-2">
                                                <span>{completedLinked.length} of {linkedTasks.length} tasks completed</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB CONTENT: 3. TEAM ROSTER */}
                {activeTab === 'team' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-text-muted">
                                Active contributing builders in this execution workspace.
                            </span>
                            <span className="text-xs font-mono text-purple bg-purple/10 px-2 py-0.5 rounded">
                                Capacity: {members.length} / {workspace.max_members || 10}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {members.map((mem) => {
                                const isMemberOwner = mem.role === 'owner';
                                const isSelf = mem.user?.id === user?.id;

                                return (
                                    <div key={mem.id} className="card flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-purple/20 border border-purple/40 flex items-center justify-center font-bold text-sm text-purple-light">
                                                {(mem.user?.full_name || mem.user?.username || 'U')[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-semibold text-text-primary">
                                                        {mem.user?.full_name || mem.user?.username}
                                                    </span>
                                                    {isSelf && (
                                                        <span className="text-[10px] bg-bg-hover px-1.5 py-0.2 rounded text-text-muted">You</span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-text-muted">
                                                    @{mem.user?.username} • Joined {new Date(mem.joined_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium border capitalize ${
                                                isMemberOwner 
                                                    ? 'bg-purple/10 text-purple-light border-purple/30' 
                                                    : mem.role === 'lead'
                                                    ? 'bg-primary/10 text-primary border-primary/30'
                                                    : 'bg-bg-hover text-text-secondary border-border-default'
                                            }`}>
                                                {mem.role}
                                            </span>

                                            {isOwner && !isMemberOwner && !isSelf && (
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => setShowRemoveMemberModal(mem)}
                                                        className="p-1 text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                                        title="Remove Member with Reason"
                                                    >
                                                        <UserMinus className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* TAB CONTENT: 4. ACTIVITY AUDIT LOG */}
                {activeTab === 'activity' && (
                    <div className="card space-y-4">
                        <h3 className="text-sm font-semibold text-text-primary">Audit Log Timeline</h3>
                        <div className="space-y-3 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-border-default">
                            {activity.length === 0 ? (
                                <p className="text-xs text-text-muted pl-6">No recorded activity yet.</p>
                            ) : (
                                activity.map((act) => (
                                    <div key={act.id} className="relative flex items-start gap-3 pl-6">
                                        <div className="absolute left-2 top-1.5 w-2 h-2 rounded-full bg-purple border-2 border-bg-card" />
                                        <div className="flex-1 text-xs">
                                            <p className="text-text-primary">{act.description}</p>
                                            <span className="text-[10px] text-text-muted">
                                                {new Date(act.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* TAB CONTENT: 5. PROOF OF WORK & PEER REVIEWS */}
                {activeTab === 'proof' && (
                    <div className="space-y-6">
                        {/* Proof Credential Card */}
                        <div className="card border-green-500/30 bg-gradient-to-b from-green-500/5 to-transparent space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center justify-center text-green-400">
                                        <ShieldCheck className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <span className="text-xs font-semibold uppercase text-green-400 tracking-wider">
                                            Cryptographically Verified Credential
                                        </span>
                                        <h3 className="text-xl font-bold text-text-primary">
                                            Proof of Work: {workspace.post?.title}
                                        </h3>
                                    </div>
                                </div>

                                <Link
                                    href={`/proof/${proof?.verification_code || ''}`}
                                    className="btn-primary text-xs flex items-center gap-1.5 bg-green-600 hover:bg-green-700 self-start sm:self-auto"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    <span>Public Certificate URL</span>
                                </Link>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-border-default/60 text-xs">
                                <div>
                                    <span className="text-text-muted">Verification Code:</span>
                                    <p className="font-mono text-purple-light font-semibold mt-0.5">
                                        {proof?.verification_code || 'ENQ-MINTED'}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-text-muted">SHA-256 Content Hash:</span>
                                    <p className="font-mono text-text-secondary truncate mt-0.5" title={proof?.content_hash}>
                                        {proof?.content_hash || 'SHA-256 Digest Pending'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Reciprocal Peer Review Form */}
                        <div className="card space-y-4">
                            <div className="flex items-center gap-2">
                                <Star className="w-4 h-4 text-yellow-400" />
                                <h3 className="font-semibold text-text-primary text-sm">Reciprocal Builder Peer Review</h3>
                            </div>
                            <p className="text-xs text-text-secondary">
                                Rate the builders you executed this project with. Honest, execution-backed evaluations are the foundation of authentic builder reputation. Self-rating is strictly forbidden.
                            </p>

                            <form onSubmit={handleSubmitPeerReview} className="space-y-4 pt-2">
                                <div>
                                    <label className="block text-xs font-medium text-text-secondary mb-1">
                                        Select Teammate to Review:
                                    </label>
                                    <select
                                        value={peerRevieweeId}
                                        onChange={(e) => setPeerRevieweeId(e.target.value)}
                                        className="w-full bg-bg-hover border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-purple"
                                        required
                                    >
                                        <option value="">-- Choose contributing teammate --</option>
                                        {members
                                            .filter(m => m.user?.id !== user?.id)
                                            .map(m => (
                                                <option key={m.user?.id} value={m.user?.id}>
                                                    {m.user?.full_name || m.user?.username} (@{m.user?.username} - {m.role})
                                                </option>
                                            ))
                                        }
                                    </select>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-text-secondary mb-1">
                                            Execution (1-5):
                                        </label>
                                        <input 
                                            type="number" 
                                            min="1" 
                                            max="5"
                                            value={peerExecScore}
                                            onChange={(e) => setPeerExecScore(Number(e.target.value))}
                                            className="w-full bg-bg-hover border border-border-default rounded-lg px-3 py-1.5 text-xs text-text-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-text-secondary mb-1">
                                            Collaboration (1-5):
                                        </label>
                                        <input 
                                            type="number" 
                                            min="1" 
                                            max="5"
                                            value={peerCollabScore}
                                            onChange={(e) => setPeerCollabScore(Number(e.target.value))}
                                            className="w-full bg-bg-hover border border-border-default rounded-lg px-3 py-1.5 text-xs text-text-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-text-secondary mb-1">
                                            Reliability (1-5):
                                        </label>
                                        <input 
                                            type="number" 
                                            min="1" 
                                            max="5"
                                            value={peerRelScore}
                                            onChange={(e) => setPeerRelScore(Number(e.target.value))}
                                            className="w-full bg-bg-hover border border-border-default rounded-lg px-3 py-1.5 text-xs text-text-primary"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-text-secondary mb-1">
                                        Constructive Feedback (Public on Builder Reputation):
                                    </label>
                                    <textarea
                                        value={peerFeedback}
                                        onChange={(e) => setPeerFeedback(e.target.value)}
                                        placeholder="Specific examples of their technical execution, code quality, and responsiveness..."
                                        rows={3}
                                        className="w-full bg-bg-hover border border-border-default rounded-lg p-2.5 text-xs text-text-primary focus:outline-none focus:border-purple"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={submittingPeerReview || !peerRevieweeId}
                                    className="btn-primary text-xs py-2 px-4"
                                >
                                    {submittingPeerReview ? 'Recording...' : 'Submit Peer Evaluation'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL: CREATE TASK */}
            {showCreateTask && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="card w-full max-w-lg space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-border-default">
                            <h3 className="text-base font-bold text-text-primary">Create Kanban Task</h3>
                            <button onClick={() => setShowCreateTask(false)} className="text-text-muted hover:text-text-primary">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateTask} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-text-secondary mb-1">Task Title *</label>
                                <input
                                    type="text"
                                    value={newTaskTitle}
                                    onChange={(e) => setNewTaskTitle(e.target.value)}
                                    placeholder="e.g. Implement WebSocket live updates"
                                    className="w-full bg-bg-hover border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-purple"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-text-secondary mb-1">Description / Spec</label>
                                <textarea
                                    value={newTaskDesc}
                                    onChange={(e) => setNewTaskDesc(e.target.value)}
                                    placeholder="Requirements, acceptance criteria, or relevant file pointers..."
                                    rows={3}
                                    className="w-full bg-bg-hover border border-border-default rounded-lg p-2.5 text-xs text-text-primary focus:outline-none focus:border-purple"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-text-secondary mb-1">Priority</label>
                                    <select
                                        value={newTaskPriority}
                                        onChange={(e) => setNewTaskPriority(e.target.value)}
                                        className="w-full bg-bg-hover border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary"
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                        <option value="urgent">Urgent</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-text-secondary mb-1">Assignee</label>
                                    <select
                                        value={newTaskAssignee}
                                        onChange={(e) => setNewTaskAssignee(e.target.value)}
                                        className="w-full bg-bg-hover border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary"
                                    >
                                        <option value="">Unassigned</option>
                                        {members.map(m => (
                                            <option key={m.user?.id} value={m.user?.id}>
                                                {m.user?.username} ({m.role})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-default">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateTask(false)}
                                    className="btn-secondary text-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingTask || !newTaskTitle.trim()}
                                    className="btn-primary text-xs"
                                >
                                    {submittingTask ? 'Creating...' : 'Create Task'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: TASK DETAIL & DELIVERABLE REVIEW DRAWER */}
            {selectedTask && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-border-default">
                            <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${PRIORITY_BADGES[selectedTask.priority]?.className}`}>
                                    {PRIORITY_BADGES[selectedTask.priority]?.label}
                                </span>
                                <h3 className="text-base font-bold text-text-primary">{selectedTask.title}</h3>
                            </div>
                            <button onClick={() => setSelectedTask(null)} className="text-text-muted hover:text-text-primary">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Status Changer */}
                        <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-bg-hover">
                            <span className="text-xs text-text-secondary font-medium">Status Transition:</span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                                {TASK_STATUS_COLUMNS.map((st) => (
                                    <button
                                        key={st.key}
                                        onClick={() => handleUpdateTaskStatus(selectedTask.id, st.key)}
                                        className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                                            selectedTask.status === st.key
                                                ? 'bg-purple text-white font-medium'
                                                : 'text-text-muted hover:text-text-primary hover:bg-bg-card'
                                        }`}
                                    >
                                        {st.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {selectedTask.description && (
                            <p className="text-xs text-text-secondary bg-bg-card-elevated p-3 rounded-lg">
                                {selectedTask.description}
                            </p>
                        )}

                        {/* Deliverables Section */}
                        <div className="space-y-3 pt-3 border-t border-border-default">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                                    <GitBranch className="w-3.5 h-3.5 text-purple" />
                                    <span>Code Deliverables ({selectedTask.deliverables?.length || 0})</span>
                                </h4>
                            </div>

                            {selectedTask.deliverables && selectedTask.deliverables.length > 0 ? (
                                <div className="space-y-3">
                                    {selectedTask.deliverables.map((deliv: any) => {
                                        const isSubmitter = deliv.submitted_by?.id === user?.id;
                                        const canReview = isLeadOrOwner || selectedTask.reviewer?.id === user?.id;

                                        return (
                                            <div key={deliv.id} className="p-3 bg-bg-card-elevated border border-border-default rounded-lg space-y-2 text-xs">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-semibold text-purple-light font-mono">
                                                        Version {deliv.version}
                                                    </span>
                                                    <span className="text-[10px] text-text-muted">
                                                        by {deliv.submitted_by?.username} • {new Date(deliv.created_at).toLocaleString()}
                                                    </span>
                                                </div>

                                                {deliv.pr_url && (
                                                    <a 
                                                        href={deliv.pr_url} 
                                                        target="_blank" 
                                                        rel="noreferrer" 
                                                        className="text-primary hover:underline flex items-center gap-1"
                                                    >
                                                        <span>PR: {deliv.pr_url}</span>
                                                        <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                )}

                                                {deliv.description && (
                                                    <p className="text-text-secondary">{deliv.description}</p>
                                                )}

                                                {/* Reviews List */}
                                                {deliv.reviews && deliv.reviews.length > 0 && (
                                                    <div className="mt-2 pt-2 border-t border-border-default/40 space-y-1">
                                                        {deliv.reviews.map((rev: any) => (
                                                            <div key={rev.id} className="text-[11px] flex items-center justify-between">
                                                                <span className="text-text-secondary">
                                                                    Review by {rev.reviewer?.username}: <strong className="text-purple-light">{rev.verdict.replace('_', ' ')}</strong>
                                                                </span>
                                                                {rev.feedback && <span className="text-text-muted italic">"{rev.feedback}"</span>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Anti-Self-Approval Review Guard */}
                                                {isSubmitter && canReview && (
                                                    <div className="p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-[11px] text-yellow-400">
                                                        Anti-Self-Approval Active: You cannot approve your own deliverable. Another team lead or reviewer must review your submission.
                                                    </div>
                                                )}

                                                {!isSubmitter && canReview && selectedTask.status !== 'completed' && (
                                                    <div className="pt-2 mt-2 border-t border-border-default/40 space-y-2">
                                                        <div className="flex items-center gap-2">
                                                            <select
                                                                value={reviewVerdict}
                                                                onChange={(e: any) => setReviewVerdict(e.target.value)}
                                                                className="bg-bg-hover border border-border-default rounded px-2 py-1 text-xs"
                                                            >
                                                                <option value="approved">Approve Deliverable</option>
                                                                <option value="changes_requested">Request Changes</option>
                                                                <option value="rejected">Reject</option>
                                                            </select>
                                                            <input
                                                                type="text"
                                                                value={reviewFeedback}
                                                                onChange={(e) => setReviewFeedback(e.target.value)}
                                                                placeholder="Review feedback..."
                                                                className="flex-1 bg-bg-hover border border-border-default rounded px-2 py-1 text-xs"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => handleReviewDeliverable(deliv.id)}
                                                                disabled={submittingReview}
                                                                className="btn-primary text-xs py-1 px-3"
                                                            >
                                                                {submittingReview ? 'Recording...' : 'Submit Review'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-xs text-text-muted">No deliverables submitted for this task yet.</p>
                            )}

                            {/* Submit Deliverable Form */}
                            {selectedTask.status !== 'completed' && (
                                <form onSubmit={handleSubmitDeliverable} className="p-3 bg-bg-hover rounded-lg space-y-3 pt-3">
                                    <h5 className="text-xs font-semibold text-text-primary">Submit New Deliverable</h5>
                                    <div>
                                        <input
                                            type="url"
                                            value={deliverablePrUrl}
                                            onChange={(e) => setDeliverablePrUrl(e.target.value)}
                                            placeholder="GitHub / GitLab Pull Request URL"
                                            className="w-full bg-bg-card border border-border-default rounded px-3 py-1.5 text-xs text-text-primary"
                                        />
                                    </div>
                                    <div>
                                        <input
                                            type="text"
                                            value={deliverableDesc}
                                            onChange={(e) => setDeliverableDesc(e.target.value)}
                                            placeholder="Summary of changes & test coverage..."
                                            className="w-full bg-bg-card border border-border-default rounded px-3 py-1.5 text-xs text-text-primary"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={submittingDeliverable || !deliverablePrUrl.trim()}
                                        className="btn-primary text-xs py-1.5 px-3"
                                    >
                                        {submittingDeliverable ? 'Submitting...' : 'Submit for Review'}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: WORKSPACE SETTINGS */}
            {showSettings && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="card w-full max-w-md space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-border-default">
                            <h3 className="text-base font-bold text-text-primary">Workspace Links & Settings</h3>
                            <button onClick={() => setShowSettings(false)} className="text-text-muted hover:text-text-primary">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveSettings} className="space-y-3 text-xs">
                            <div>
                                <label className="block text-text-secondary mb-1">GitHub / Code Repository URL</label>
                                <input
                                    type="url"
                                    value={repoUrl}
                                    onChange={(e) => setRepoUrl(e.target.value)}
                                    placeholder="https://github.com/..."
                                    className="w-full bg-bg-hover border border-border-default rounded-lg px-3 py-2 text-text-primary"
                                />
                            </div>

                            <div>
                                <label className="block text-text-secondary mb-1">Live Demo / Staging URL</label>
                                <input
                                    type="url"
                                    value={demoUrl}
                                    onChange={(e) => setDemoUrl(e.target.value)}
                                    placeholder="https://demo.myapp.com"
                                    className="w-full bg-bg-hover border border-border-default rounded-lg px-3 py-2 text-text-primary"
                                />
                            </div>

                            <div>
                                <label className="block text-text-secondary mb-1">Documentation URL</label>
                                <input
                                    type="url"
                                    value={docUrl}
                                    onChange={(e) => setDocUrl(e.target.value)}
                                    placeholder="https://docs.myapp.com"
                                    className="w-full bg-bg-hover border border-border-default rounded-lg px-3 py-2 text-text-primary"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-default">
                                <button type="button" onClick={() => setShowSettings(false)} className="btn-secondary text-xs">
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary text-xs">
                                    Save Links
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: REMOVE MEMBER WITH REASON */}
            {showRemoveMemberModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="card w-full max-w-md space-y-4">
                        <div className="flex items-center gap-2 text-red-400">
                            <AlertTriangle className="w-5 h-5" />
                            <h3 className="font-bold text-sm">Remove Team Member</h3>
                        </div>
                        <p className="text-xs text-text-secondary">
                            Removing <strong>{showRemoveMemberModal.user?.username}</strong> will revoke workspace access, evict them from the team chat, and unassign active tasks. A recorded reason is mandatory for governance transparency.
                        </p>
                        <div>
                            <label className="block text-xs font-medium text-text-secondary mb-1">Justification / Reason *</label>
                            <input
                                type="text"
                                value={removeReason}
                                onChange={(e) => setRemoveReason(e.target.value)}
                                placeholder="e.g. Inactive, unresponsive to milestones..."
                                className="w-full bg-bg-hover border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-red-500"
                                required
                            />
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-default">
                            <button onClick={() => setShowRemoveMemberModal(null)} className="btn-secondary text-xs">
                                Cancel
                            </button>
                            <button onClick={handleRemoveMember} className="btn-primary text-xs bg-red-600 hover:bg-red-700">
                                Confirm Removal
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: LEAVE WORKSPACE */}
            {showLeaveModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="card w-full max-w-sm space-y-4">
                        <h3 className="text-sm font-bold text-text-primary">Leave Workspace</h3>
                        <p className="text-xs text-text-secondary">
                            Are you sure you want to leave this project workspace? Your completed contributions will remain preserved in the activity history.
                        </p>
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-default">
                            <button onClick={() => setShowLeaveModal(false)} className="btn-secondary text-xs">
                                Cancel
                            </button>
                            <button onClick={handleLeaveWorkspace} className="btn-primary text-xs bg-red-600 hover:bg-red-700">
                                Confirm Leave
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: CREATE MILESTONE */}
            {showCreateMilestone && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="card w-full max-w-md space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-border-default">
                            <h3 className="text-base font-bold text-text-primary">Add Project Milestone</h3>
                            <button onClick={() => setShowCreateMilestone(false)} className="text-text-muted hover:text-text-primary">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateMilestone} className="space-y-3 text-xs">
                            <div>
                                <label className="block text-text-secondary mb-1">Milestone Title *</label>
                                <input
                                    type="text"
                                    value={newMilestoneTitle}
                                    onChange={(e) => setNewMilestoneTitle(e.target.value)}
                                    placeholder="e.g. Alpha Testing & Performance Benchmark"
                                    className="w-full bg-bg-hover border border-border-default rounded-lg px-3 py-2 text-text-primary"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-text-secondary mb-1">Description</label>
                                <textarea
                                    value={newMilestoneDesc}
                                    onChange={(e) => setNewMilestoneDesc(e.target.value)}
                                    placeholder="Key deliverables and scope..."
                                    rows={2}
                                    className="w-full bg-bg-hover border border-border-default rounded-lg p-2 text-text-primary"
                                />
                            </div>

                            <div>
                                <label className="block text-text-secondary mb-1">Target Due Date</label>
                                <input
                                    type="date"
                                    value={newMilestoneDueDate}
                                    onChange={(e) => setNewMilestoneDueDate(e.target.value)}
                                    className="w-full bg-bg-hover border border-border-default rounded-lg px-3 py-1.5 text-text-primary"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-default">
                                <button type="button" onClick={() => setShowCreateMilestone(false)} className="btn-secondary text-xs">
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary text-xs">
                                    Save Milestone
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
