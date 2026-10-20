"use client";

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
    Kanban, 
    AlertCircle, 
    ShieldAlert, 
    WifiOff, 
    RotateCcw, 
    ArrowLeft 
} from 'lucide-react';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { useWorkspaceData } from '@/lib/hooks/useWorkspaceData';
import type { WorkspaceMember, ReviewVerdict } from '@/types/workspace';
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
    const workspaceId = params.id as string;
    const { user, loading: authLoading } = useRequireAuth();

    const {
        workspace,
        members,
        tasks,
        milestones,
        activity,
        proof,
        loading,
        error,
        errorMessage,
        selectedTask,
        setSelectedTask,
        loadAllWorkspaceData,
        updateTaskStatus,
        createTask,
        submitDeliverable,
        reviewDeliverable,
        createMilestone,
        saveSettings,
        completeProject,
        reopenProject,
        leaveWorkspace,
        updateMemberRole,
        removeMember,
        submitPeerReview,
    } = useWorkspaceData({
        workspaceId,
        currentUser: user,
        authLoading,
    });

    // Active Tab Navigation
    const [activeTab, setActiveTab] = useState<'tasks' | 'milestones' | 'team' | 'activity' | 'proof'>('tasks');

    // Modals Visibility
    const [showCreateTask, setShowCreateTask] = useState(false);
    const [showCreateMilestone, setShowCreateMilestone] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showRemoveMemberModal, setShowRemoveMemberModal] = useState<WorkspaceMember | null>(null);
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
    const [reviewVerdict, setReviewVerdict] = useState<ReviewVerdict>('approved');
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
    const [repoUrl, setRepoUrl] = useState(workspace?.repo_url || '');
    const [demoUrl, setDemoUrl] = useState(workspace?.demo_url || '');
    const [docUrl, setDocUrl] = useState(workspace?.documentation_url || '');

    // Task Actions
    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;
        setSubmittingTask(true);
        try {
            await createTask({
                title: newTaskTitle.trim(),
                description: newTaskDesc.trim(),
                priority: newTaskPriority,
                assignee_id: newTaskAssignee || undefined,
                milestone_id: newTaskMilestone || undefined,
            });
            setShowCreateTask(false);
            setNewTaskTitle('');
            setNewTaskDesc('');
        } catch (err: any) {
            toast.error(err.message || 'Failed to create task');
        } finally {
            setSubmittingTask(false);
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
            await submitDeliverable(selectedTask.id, {
                pr_url: deliverablePrUrl.trim(),
                file_url: deliverableFileUrl.trim(),
                description: deliverableDesc.trim(),
            });
            setDeliverablePrUrl('');
            setDeliverableFileUrl('');
            setDeliverableDesc('');
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
            await reviewDeliverable(selectedTask.id, deliverableId, {
                verdict: reviewVerdict,
                feedback: reviewFeedback.trim(),
            });
            setReviewFeedback('');
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
            await createMilestone({
                title: newMilestoneTitle.trim(),
                description: newMilestoneDesc.trim(),
                due_date: newMilestoneDueDate || undefined,
            });
            setShowCreateMilestone(false);
            setNewMilestoneTitle('');
            setNewMilestoneDesc('');
            setNewMilestoneDueDate('');
        } catch (err: any) {
            toast.error(err.message || 'Failed to create milestone');
        } finally {
            setSubmittingMilestone(false);
        }
    };

    // Settings
    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await saveSettings({
                repo_url: repoUrl.trim(),
                demo_url: demoUrl.trim(),
                documentation_url: docUrl.trim(),
            });
            setShowSettings(false);
        } catch (err: any) {
            toast.error(err.message || 'Failed to update workspace');
        }
    };

    // Project Lifecycle
    const handleCompleteProject = async () => {
        if (!confirm('Are you sure you want to complete this project? This will verify all deliverables and mint an immutable Proof of Work.')) {
            return;
        }
        try {
            await completeProject();
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
            await reopenProject();
        } catch (err: any) {
            toast.error(err.message || 'Failed to reopen project');
        }
    };

    const handleLeaveWorkspace = async () => {
        if (!confirm('Are you sure you want to leave this project team? Any open assigned tasks will be returned to the backlog.')) {
            return;
        }
        try {
            await leaveWorkspace();
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
            await removeMember(showRemoveMemberModal.id, removeReason.trim());
            setShowRemoveMemberModal(null);
            setRemoveReason('');
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
            await submitPeerReview(proof.verification_code, {
                reviewee_id: peerRevieweeId,
                execution_score: peerExecScore,
                collaboration_score: peerCollabScore,
                reliability_score: peerRelScore,
                feedback: peerFeedback.trim(),
            });
            setPeerFeedback('');
        } catch (err: any) {
            toast.error(err.message || 'Failed to submit peer review');
        } finally {
            setSubmittingPeerReview(false);
        }
    };

    // Loading State
    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-[80vh]">
                <div className="text-zinc-400 animate-pulse flex items-center gap-2.5">
                    <Kanban className="w-5 h-5 animate-spin text-[#1864ff]" />
                    <span className="text-sm font-medium font-mono">Initializing workspace session...</span>
                </div>
            </div>
        );
    }

    // Explicit Error States (403, 404, Network)
    if (error || !workspace) {
        return (
            <div className="min-h-[80vh] p-6 flex items-center justify-center">
                <div className="card text-center py-10 px-8 max-w-md bg-[#0e0e17] border border-[#1e2335] rounded-2xl shadow-xl">
                    {error === '403' ? (
                        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" />
                    ) : error === '404' ? (
                        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                    ) : (
                        <WifiOff className="w-12 h-12 text-rose-400 mx-auto mb-3" />
                    )}

                    <h2 className="text-lg font-bold text-white mb-2 font-mono">
                        {error === '403' ? 'Access Denied' : error === '404' ? 'Workspace Not Found' : 'Connection Error'}
                    </h2>

                    <p className="text-zinc-400 text-xs mb-6 leading-relaxed">
                        {errorMessage || 'You are not an active member of this project or the workspace does not exist.'}
                    </p>

                    <div className="flex items-center justify-center gap-3">
                        {error === 'network' && (
                            <button
                                onClick={() => loadAllWorkspaceData()}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1864ff] hover:bg-[#1864ff]/90 text-white text-xs font-mono font-medium transition-colors"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Retry Connection</span>
                            </button>
                        )}
                        <Link 
                            href="/workspaces" 
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono font-medium transition-colors"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>Return to Workspaces</span>
                        </Link>
                    </div>
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
                onOpenSettings={() => {
                    setRepoUrl(workspace.repo_url || '');
                    setDemoUrl(workspace.demo_url || '');
                    setDocUrl(workspace.documentation_url || '');
                    setShowSettings(true);
                }}
                onLeave={handleLeaveWorkspace}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                tasksCount={tasks.length}
                milestonesCount={milestones.length}
                membersCount={members.filter((m) => m.status === 'active').length}
                activityCount={activity.length}
                hasProof={!!proof}
            />

            {/* Main Content Area */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
                {activeTab === 'tasks' && (
                    <KanbanBoard
                        tasks={tasks}
                        onSelectTask={setSelectedTask}
                        onUpdateTaskStatus={updateTaskStatus}
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
                        onUpdateRole={updateMemberRole}
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
                onUpdateStatus={updateTaskStatus}
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
