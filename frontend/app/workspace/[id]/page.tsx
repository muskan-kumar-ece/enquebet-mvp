"use client";

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Kanban, AlertCircle } from 'lucide-react';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { useWorkspaceSocket } from '@/lib/hooks/useWorkspaceSocket';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

import { WorkspaceHeader } from '@/components/workspace/WorkspaceHeader';
import { KanbanBoard } from '@/components/workspace/KanbanBoard';
import { TaskDetailDrawer } from '@/components/workspace/TaskDetailDrawer';
import { MilestoneTimeline } from '@/components/workspace/MilestoneTimeline';
import { TeamRoster } from '@/components/workspace/TeamRoster';
import { ActivityTimeline } from '@/components/workspace/ActivityTimeline';
import { ProofOfWorkView } from '@/components/workspace/ProofOfWorkView';
import { 
    CreateTaskModal, 
    CreateMilestoneModal, 
    WorkspaceSettingsModal, 
    RemoveMemberModal 
} from '@/components/workspace/WorkspaceModals';

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

    // Active Tab
    const [activeTab, setActiveTab] = useState<'tasks' | 'milestones' | 'team' | 'activity' | 'proof'>('tasks');

    // Drawer & Modals
    const [selectedTask, setSelectedTask] = useState<any>(null);
    const [showCreateTask, setShowCreateTask] = useState(false);
    const [showCreateMilestone, setShowCreateMilestone] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showRemoveMemberModal, setShowRemoveMemberModal] = useState<any>(null);
    const [removeReason, setRemoveReason] = useState('');

    // Task Form State
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskDesc, setNewTaskDesc] = useState('');
    const [newTaskPriority, setNewTaskPriority] = useState('medium');
    const [newTaskAssignee, setNewTaskAssignee] = useState('');
    const [newTaskMilestone, setNewTaskMilestone] = useState('');
    const [submittingTask, setSubmittingTask] = useState(false);

    // Deliverable Form State
    const [deliverablePrUrl, setDeliverablePrUrl] = useState('');
    const [deliverableFileUrl, setDeliverableFileUrl] = useState('');
    const [deliverableDesc, setDeliverableDesc] = useState('');
    const [submittingDeliverable, setSubmittingDeliverable] = useState(false);

    // Review Form State
    const [reviewVerdict, setReviewVerdict] = useState<'approved' | 'changes_requested' | 'rejected'>('approved');
    const [reviewFeedback, setReviewFeedback] = useState('');
    const [submittingReview, setSubmittingReview] = useState(false);

    // Milestone Form State
    const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
    const [newMilestoneDesc, setNewMilestoneDesc] = useState('');
    const [newMilestoneDueDate, setNewMilestoneDueDate] = useState('');
    const [submittingMilestone, setSubmittingMilestone] = useState(false);

    // Peer Review Form State
    const [peerRevieweeId, setPeerRevieweeId] = useState('');
    const [peerExecScore, setPeerExecScore] = useState(5);
    const [peerCollabScore, setPeerCollabScore] = useState(5);
    const [peerRelScore, setPeerRelScore] = useState(5);
    const [peerFeedback, setPeerFeedback] = useState('');
    const [submittingPeerReview, setSubmittingPeerReview] = useState(false);

    // Settings Form State
    const [repoUrl, setRepoUrl] = useState('');
    const [demoUrl, setDemoUrl] = useState('');
    const [docUrl, setDocUrl] = useState('');

    // Load initial data
    const loadAllWorkspaceData = useCallback(async () => {
        if (!workspaceId) return;
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
                try {
                    const proofData = await api.getWorkspaceProof(workspaceId);
                    setProof(proofData);
                } catch {
                    // Proof not minted yet
                }
            }
        } catch (err: any) {
            console.error('Workspace load error:', err);
            toast.error(err.message || 'Access denied or workspace not found');
        } finally {
            setLoading(false);
        }
    }, [workspaceId]);

    useEffect(() => {
        if (!authLoading && user && workspaceId) {
            loadAllWorkspaceData();
        }
    }, [authLoading, user, workspaceId, loadAllWorkspaceData]);

    // Real-Time WebSocket Event Handling
    const handleWorkspaceSocketEvent = useCallback((eventType: string, data: any, actorId?: string) => {
        // If event was triggered by another user, toast a subtle notification
        const isFromOtherUser = actorId && user && actorId !== user.id;

        switch (eventType) {
            case 'task_created':
                if (data?.task) {
                    setTasks(prev => {
                        const exists = prev.some(t => t.id === data.task.id);
                        return exists ? prev : [data.task, ...prev];
                    });
                    if (isFromOtherUser) toast.success(`New task added: "${data.task.title}"`);
                    api.getWorkspaceActivity(workspaceId).then(setActivity);
                }
                break;

            case 'task_updated':
                if (data?.task) {
                    setTasks(prev => prev.map(t => t.id === data.task.id ? data.task : t));
                    setSelectedTask((prev: any) => prev?.id === data.task.id ? data.task : prev);
                    api.getWorkspace(workspaceId).then(setWorkspace);
                    api.getWorkspaceActivity(workspaceId).then(setActivity);
                }
                break;

            case 'deliverable_submitted':
                if (data?.task_id) {
                    api.getWorkspaceTasks(workspaceId).then(updated => {
                        setTasks(updated);
                        setSelectedTask((prev: any) => prev?.id === data.task_id ? updated.find((t: any) => t.id === data.task_id) || prev : prev);
                    });
                    if (isFromOtherUser) toast('New deliverable submitted for review', { icon: '📦' });
                    api.getWorkspaceActivity(workspaceId).then(setActivity);
                }
                break;

            case 'deliverable_reviewed':
                if (data?.task_id) {
                    api.getWorkspaceTasks(workspaceId).then(updated => {
                        setTasks(updated);
                        setSelectedTask((prev: any) => prev?.id === data.task_id ? updated.find((t: any) => t.id === data.task_id) || prev : prev);
                    });
                    api.getWorkspace(workspaceId).then(setWorkspace);
                    api.getWorkspaceActivity(workspaceId).then(setActivity);
                    if (isFromOtherUser) toast(`Deliverable reviewed: ${data.review?.verdict?.replace('_', ' ')}`, { icon: '🛡️' });
                }
                break;

            case 'milestone_created':
                if (data?.milestone) {
                    setMilestones(prev => {
                        const exists = prev.some(m => m.id === data.milestone.id);
                        return exists ? prev : [...prev, data.milestone];
                    });
                    if (isFromOtherUser) toast.success(`Milestone created: "${data.milestone.title}"`);
                    api.getWorkspaceActivity(workspaceId).then(setActivity);
                }
                break;

            case 'member_updated':
            case 'member_left':
            case 'member_removed':
                api.getWorkspaceMembers(workspaceId).then(setMembers);
                api.getWorkspaceActivity(workspaceId).then(setActivity);
                break;

            case 'project_completed':
                if (data?.proof_of_work) {
                    setProof(data.proof_of_work);
                    setWorkspace((prev: any) => prev ? { ...prev, status: 'completed', progress_percentage: 100 } : prev);
                    toast.success('Project completed! Proof of Work minted 🎉');
                }
                break;

            case 'project_reopened':
                setWorkspace((prev: any) => prev ? { ...prev, status: 'active' } : prev);
                toast('Project sprint reopened for further iteration', { icon: '🔄' });
                break;

            case 'workspace_updated':
                api.getWorkspace(workspaceId).then(setWorkspace);
                break;

            default:
                break;
        }
    }, [workspaceId, user]);

    useWorkspaceSocket({
        workspaceId,
        onEvent: handleWorkspaceSocketEvent,
        enabled: !!user && !loading
    });

    // Task Actions
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
            api.getWorkspaceActivity(workspaceId).then(setActivity);
        } catch (err: any) {
            toast.error(err.message || 'Failed to create task');
        } finally {
            setSubmittingTask(false);
        }
    };

    const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
        // Optimistic UI update
        const previousTasks = [...tasks];
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

        try {
            const updated = await api.updateWorkspaceTask(workspaceId, taskId, { status: newStatus });
            setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
            if (selectedTask?.id === taskId) setSelectedTask(updated);
            toast.success(`Task moved to ${newStatus.replace('_', ' ')}`);
            api.getWorkspace(workspaceId).then(setWorkspace);
        } catch (err: any) {
            // Revert optimistic update
            setTasks(previousTasks);
            toast.error(err.message || 'Failed to update task status');
        }
    };

    // Deliverable Actions
    const handleSubmitDeliverable = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTask) return;
        if (!deliverablePrUrl.trim() && !deliverableFileUrl.trim()) {
            toast.error('Please provide a Pull Request / repository URL or attachment link');
            return;
        }

        setSubmittingDeliverable(true);
        try {
            await api.submitTaskDeliverable(workspaceId, selectedTask.id, {
                pr_url: deliverablePrUrl.trim(),
                file_url: deliverableFileUrl.trim(),
                description: deliverableDesc.trim(),
            });

            toast.success('Deliverable submitted for review! Task moved to In Review.');
            setDeliverablePrUrl('');
            setDeliverableFileUrl('');
            setDeliverableDesc('');

            // Reload fresh task details
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

            const updatedTasks = await api.getWorkspaceTasks(workspaceId);
            setTasks(updatedTasks);
            const fresh = updatedTasks.find((t: any) => t.id === selectedTask.id);
            if (fresh) setSelectedTask(fresh);
            api.getWorkspace(workspaceId).then(setWorkspace);
        } catch (err: any) {
            toast.error(err.message || 'Review failed');
        } finally {
            setSubmittingReview(false);
        }
    };

    // Milestone Actions
    const handleCreateMilestone = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMilestoneTitle.trim()) return;
        setSubmittingMilestone(true);
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
            setNewMilestoneDueDate('');
            toast.success('Milestone created');
        } catch (err: any) {
            toast.error(err.message || 'Failed to create milestone');
        } finally {
            setSubmittingMilestone(false);
        }
    };

    // Governance Actions
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
            setWorkspace((prev: any) => ({ ...prev, status: 'completed', progress_percentage: 100 }));
            setActiveTab('proof');
        } catch (err: any) {
            toast.error(err.message || 'Failed to complete project');
        }
    };

    const handleReopenProject = async () => {
        if (!confirm('Reopen this completed project for further iteration?')) {
            return;
        }

        try {
            await api.reopenWorkspace(workspaceId);
            toast.success('Workspace reopened for iteration');
            setWorkspace((prev: any) => ({ ...prev, status: 'active' }));
        } catch (err: any) {
            toast.error(err.message || 'Failed to reopen project');
        }
    };

    const handleLeaveWorkspace = async () => {
        if (!confirm('Are you sure you want to leave this project team? Any open assigned tasks will be returned to the backlog.')) {
            return;
        }

        try {
            await api.leaveWorkspace(workspaceId);
            toast.success('You have left the workspace.');
            router.push('/workspaces');
        } catch (err: any) {
            toast.error(err.message || 'Failed to leave workspace');
        }
    };

    const handleUpdateMemberRole = async (memberId: string, role: string, roleTitle?: string) => {
        try {
            await api.updateWorkspaceMemberRole(workspaceId, memberId, { role, role_title: roleTitle });
            toast.success(`Role updated to ${role}`);
            const mems = await api.getWorkspaceMembers(workspaceId);
            setMembers(mems);
        } catch (err: any) {
            toast.error(err.message || 'Failed to update member role');
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
            toast.success(`Removed @${showRemoveMemberModal.user?.username || 'member'}`);
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
            <div className="flex items-center justify-center min-h-[80vh]">
                <div className="text-text-secondary animate-pulse flex items-center gap-2.5">
                    <Kanban className="w-5 h-5 animate-spin text-brand-light" />
                    <span className="text-sm font-medium">Initializing workspace session...</span>
                </div>
            </div>
        );
    }

    if (!workspace) {
        return (
            <div className="min-h-[80vh] p-6 flex items-center justify-center">
                <div className="card text-center py-12 max-w-md bg-[#0e0e17] border border-border">
                    <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
                    <h2 className="text-lg font-bold text-white mb-2">Workspace Access Denied</h2>
                    <p className="text-text-secondary text-xs mb-6">
                        You are not an active member of this project or the workspace does not exist.
                    </p>
                    <Link href="/workspaces" className="btn-primary text-xs">
                        Return to My Workspaces
                    </Link>
                </div>
            </div>
        );
    }

    const isOwner = workspace.current_user_role === 'owner';
    const isLeadOrOwner = workspace.current_user_role === 'owner' || workspace.current_user_role === 'lead';

    return (
        <div className="min-h-screen bg-[#07070d] text-white flex flex-col">
            {/* Header with Navigation & Action Dock */}
            <WorkspaceHeader
                workspace={workspace}
                onComplete={handleCompleteProject}
                onReopen={handleReopenProject}
                onOpenSettings={() => setShowSettings(true)}
                onLeave={handleLeaveWorkspace}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                tasksCount={tasks.length}
                milestonesCount={milestones.length}
                membersCount={members.filter(m => m.status === 'active').length}
                activityCount={activity.length}
                hasProof={!!proof}
            />

            {/* Main Content Area */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
                {activeTab === 'tasks' && (
                    <KanbanBoard
                        tasks={tasks}
                        onSelectTask={setSelectedTask}
                        onUpdateTaskStatus={handleUpdateTaskStatus}
                        onOpenCreateTask={() => setShowCreateTask(true)}
                        isLeadOrOwner={isLeadOrOwner}
                    />
                )}

                {activeTab === 'milestones' && (
                    <MilestoneTimeline
                        milestones={milestones}
                        tasks={tasks}
                        onOpenCreateMilestone={() => setShowCreateMilestone(true)}
                        isLeadOrOwner={isLeadOrOwner}
                        onSelectTask={(task) => {
                            setSelectedTask(task);
                            setActiveTab('tasks');
                        }}
                    />
                )}

                {activeTab === 'team' && (
                    <TeamRoster
                        members={members}
                        isOwner={isOwner}
                        onUpdateRole={handleUpdateMemberRole}
                        onOpenRemoveModal={setShowRemoveMemberModal}
                        currentUserId={user?.id}
                    />
                )}

                {activeTab === 'activity' && (
                    <ActivityTimeline activities={activity} />
                )}

                {activeTab === 'proof' && (
                    <ProofOfWorkView
                        proof={proof}
                        workspace={workspace}
                        members={members}
                        onSubmitPeerReview={handleSubmitPeerReview}
                        peerRevieweeId={peerRevieweeId}
                        setPeerRevieweeId={setPeerRevieweeId}
                        peerExecScore={peerExecScore}
                        setPeerExecScore={setPeerExecScore}
                        peerCollabScore={peerCollabScore}
                        setPeerCollabScore={setPeerCollabScore}
                        peerRelScore={peerRelScore}
                        setPeerRelScore={setPeerRelScore}
                        peerFeedback={peerFeedback}
                        setPeerFeedback={setPeerFeedback}
                        submittingPeerReview={submittingPeerReview}
                        currentUserId={user?.id}
                    />
                )}
            </main>

            {/* Task Detail Drawer */}
            <TaskDetailDrawer
                task={selectedTask}
                isOpen={!!selectedTask}
                onClose={() => setSelectedTask(null)}
                onUpdateStatus={handleUpdateTaskStatus}
                onSubmitDeliverable={handleSubmitDeliverable}
                deliverablePrUrl={deliverablePrUrl}
                setDeliverablePrUrl={setDeliverablePrUrl}
                deliverableFileUrl={deliverableFileUrl}
                setDeliverableFileUrl={setDeliverableFileUrl}
                deliverableDesc={deliverableDesc}
                setDeliverableDesc={setDeliverableDesc}
                submittingDeliverable={submittingDeliverable}
                onReviewDeliverable={handleReviewDeliverable}
                reviewVerdict={reviewVerdict}
                setReviewVerdict={setReviewVerdict}
                reviewFeedback={reviewFeedback}
                setReviewFeedback={setReviewFeedback}
                submittingReview={submittingReview}
                isLeadOrOwner={isLeadOrOwner}
                currentUserId={user?.id}
            />

            {/* Modals */}
            <CreateTaskModal
                isOpen={showCreateTask}
                onClose={() => setShowCreateTask(false)}
                onSubmit={handleCreateTask}
                title={newTaskTitle}
                setTitle={setNewTaskTitle}
                description={newTaskDesc}
                setDescription={setNewTaskDesc}
                priority={newTaskPriority}
                setPriority={setNewTaskPriority}
                assignee={newTaskAssignee}
                setAssignee={setNewTaskAssignee}
                milestone={newTaskMilestone}
                setMilestone={setNewTaskMilestone}
                members={members}
                milestones={milestones}
                loading={submittingTask}
            />

            <CreateMilestoneModal
                isOpen={showCreateMilestone}
                onClose={() => setShowCreateMilestone(false)}
                onSubmit={handleCreateMilestone}
                title={newMilestoneTitle}
                setTitle={setNewMilestoneTitle}
                description={newMilestoneDesc}
                setDescription={setNewMilestoneDesc}
                dueDate={newMilestoneDueDate}
                setDueDate={setNewMilestoneDueDate}
                loading={submittingMilestone}
            />

            <WorkspaceSettingsModal
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                onSubmit={handleSaveSettings}
                repoUrl={repoUrl}
                setRepoUrl={setRepoUrl}
                demoUrl={demoUrl}
                setDemoUrl={setDemoUrl}
                docUrl={docUrl}
                setDocUrl={setDocUrl}
            />

            <RemoveMemberModal
                member={showRemoveMemberModal}
                onClose={() => setShowRemoveMemberModal(null)}
                onConfirm={handleRemoveMember}
                reason={removeReason}
                setReason={setRemoveReason}
            />
        </div>
    );
}
