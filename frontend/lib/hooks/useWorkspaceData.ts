"use client";

import { useState, useEffect, useCallback, useRef } from 'react';

import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { useWorkspaceSocket } from '@/lib/hooks/useWorkspaceSocket';
import type {
    WorkspaceDetail,
    WorkspaceMember,
    WorkspaceRole,
    WorkspaceTask,
    ProjectMilestone,
    WorkspaceActivity,
    WorkspaceProof,
    WorkspaceErrorType,
    TaskStatus,
    ReviewVerdict
} from '@/types/workspace';

interface UseWorkspaceDataOptions {
    workspaceId: string;
    currentUser: { id: string; username?: string } | null;
    authLoading: boolean;
}

export function useWorkspaceData({
    workspaceId,
    currentUser,
    authLoading,
}: UseWorkspaceDataOptions) {
    const router = useRouter();

    // Data state
    const [workspace, setWorkspace] = useState<WorkspaceDetail | null>(null);
    const [members, setMembers] = useState<WorkspaceMember[]>([]);
    const [tasks, setTasks] = useState<WorkspaceTask[]>([]);
    const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
    const [activity, setActivity] = useState<WorkspaceActivity[]>([]);
    const [proof, setProof] = useState<WorkspaceProof | null>(null);

    // Status state
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<WorkspaceErrorType>(null);
    const [errorMessage, setErrorMessage] = useState('');

    // Selected task for drawer
    const [selectedTask, setSelectedTask] = useState<WorkspaceTask | null>(null);

    // Debounced activity log refresh timer
    const activityRefreshTimerRef = useRef<NodeJS.Timeout | null>(null);
    const triggerDebouncedActivityRefresh = useCallback(() => {
        if (activityRefreshTimerRef.current) clearTimeout(activityRefreshTimerRef.current);
        activityRefreshTimerRef.current = setTimeout(() => {
            api.getWorkspaceActivity(workspaceId)
                .then((act) => setActivity(act as WorkspaceActivity[]))
                .catch(() => {});
        }, 1500);
    }, [workspaceId]);

    useEffect(() => {
        return () => {
            if (activityRefreshTimerRef.current) {
                clearTimeout(activityRefreshTimerRef.current);
            }
        };
    }, []);

    // Fetch initial data concurrently in a single parallel round-trip
    const loadAllWorkspaceData = useCallback(async () => {
        if (!workspaceId) return;
        setLoading(true);
        setError(null);
        setErrorMessage('');

        try {
            const [wsData, mems, tks, mls, act] = await Promise.all([
                api.getWorkspace(workspaceId) as Promise<WorkspaceDetail>,
                api.getWorkspaceMembers(workspaceId) as Promise<WorkspaceMember[]>,
                api.getWorkspaceTasks(workspaceId) as Promise<WorkspaceTask[]>,
                api.getWorkspaceMilestones(workspaceId) as Promise<ProjectMilestone[]>,
                api.getWorkspaceActivity(workspaceId) as Promise<WorkspaceActivity[]>,
            ]);

            setWorkspace(wsData);
            setMembers(mems || []);
            setTasks(tks || []);
            setMilestones(mls || []);
            setActivity(act || []);


            if (wsData.status === 'completed') {
                try {
                    const proofData = (await api.getWorkspaceProof(workspaceId)) as WorkspaceProof;
                    setProof(proofData);
                } catch {
                    // Proof may not be generated yet
                }
            }
        } catch (err: any) {
            const msg = err?.message || '';
            const status = err?.status;
            if (status === 403 || msg.includes('403') || msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('not a member')) {
                setError('403');
                setErrorMessage('You are not an active member of this project or your access has been revoked.');
            } else if (status === 404 || msg.includes('404') || msg.toLowerCase().includes('not found')) {
                setError('404');
                setErrorMessage('This project workspace could not be found or has been deleted.');
            } else {
                setError('network');
                setErrorMessage(msg || 'Unable to establish connection to workspace servers. Please check your network and retry.');
            }
        } finally {
            setLoading(false);
        }
    }, [workspaceId]);

    useEffect(() => {
        if (!authLoading && currentUser && workspaceId) {
            loadAllWorkspaceData();
        }
    }, [authLoading, currentUser, workspaceId, loadAllWorkspaceData]);

    // Real-Time WebSocket event dispatch
    const handleWorkspaceSocketEvent = useCallback(
        (eventType: string, data: any, actorId?: string) => {
            const isFromOtherUser = actorId && currentUser && actorId !== currentUser.id;

            switch (eventType) {
                case 'task_created':
                    if (data?.task) {
                        setTasks((prev) => {
                            const exists = prev.some((t) => t.id === data.task.id);
                            return exists ? prev : [data.task, ...prev];
                        });
                        if (isFromOtherUser) toast.success(`New task added: "${data.task.title}"`);
                        triggerDebouncedActivityRefresh();
                    }
                    break;

                case 'task_updated':
                    if (data?.task) {
                        setTasks((prev) => prev.map((t) => (t.id === data.task.id ? data.task : t)));
                        setSelectedTask((prev) => (prev?.id === data.task.id ? data.task : prev));
                        triggerDebouncedActivityRefresh();
                    }
                    break;

                case 'deliverable_submitted':
                    if (data?.task_id) {
                        if (data.deliverable) {
                            setTasks((prev) =>
                                prev.map((t) => {
                                    if (t.id === data.task_id) {
                                        const prevDeliverables = t.deliverables || [];
                                        const exists = prevDeliverables.some((d) => d.id === data.deliverable.id);
                                        const updatedDeliverables = exists
                                            ? prevDeliverables.map((d) => (d.id === data.deliverable.id ? data.deliverable : d))
                                            : [...prevDeliverables, data.deliverable];
                                        return {
                                            ...t,
                                            status: 'review' as TaskStatus,
                                            deliverables: updatedDeliverables,
                                        };
                                    }
                                    return t;
                                })
                            );
                            setSelectedTask((prev) => {
                                if (!prev || prev.id !== data.task_id) return prev;
                                const prevDeliverables = prev.deliverables || [];
                                const exists = prevDeliverables.some((d) => d.id === data.deliverable.id);
                                const updatedDeliverables = exists
                                    ? prevDeliverables.map((d) => (d.id === data.deliverable.id ? data.deliverable : d))
                                    : [...prevDeliverables, data.deliverable];
                                return {
                                    ...prev,
                                    status: 'review' as TaskStatus,
                                    deliverables: updatedDeliverables,
                                };
                            });
                        } else {
                            api.getWorkspaceTasks(workspaceId).then((updated) => {
                                setTasks(updated as WorkspaceTask[]);
                                setSelectedTask((prev) =>
                                    prev?.id === data.task_id ? (updated as WorkspaceTask[]).find((t) => t.id === data.task_id) || prev : prev
                                );
                            });
                        }
                        if (isFromOtherUser) toast('New deliverable submitted for review', { icon: '📦' });
                        triggerDebouncedActivityRefresh();
                    }
                    break;

                case 'deliverable_reviewed':
                    if (data?.task_id) {
                        if (data.review) {
                            const rawStatus = data.task_status;
                            const nextStatus = rawStatus === 'in_review' ? 'review' : rawStatus;
                            setTasks((prev) =>
                                prev.map((t) => {
                                    if (t.id === data.task_id) {
                                        const updatedDeliverables = (t.deliverables || []).map((d) => {
                                            if (d.id === data.review.deliverable) {
                                                const prevReviews = d.reviews || [];
                                                const exists = prevReviews.some((r) => r.id === data.review.id);
                                                return {
                                                    ...d,
                                                    reviews: exists
                                                        ? prevReviews.map((r) => (r.id === data.review.id ? data.review : r))
                                                        : [...prevReviews, data.review],
                                                };
                                            }
                                            return d;
                                        });
                                        return {
                                            ...t,
                                            ...(nextStatus ? { status: nextStatus as TaskStatus } : {}),
                                            deliverables: updatedDeliverables,
                                        };
                                    }
                                    return t;
                                })
                            );
                            setSelectedTask((prev) => {
                                if (!prev || prev.id !== data.task_id) return prev;
                                const updatedDeliverables = (prev.deliverables || []).map((d) => {
                                    if (d.id === data.review.deliverable) {
                                        const prevReviews = d.reviews || [];
                                        const exists = prevReviews.some((r) => r.id === data.review.id);
                                        return {
                                            ...d,
                                            reviews: exists
                                                ? prevReviews.map((r) => (r.id === data.review.id ? data.review : r))
                                                : [...prevReviews, data.review],
                                        };
                                    }
                                    return d;
                                });
                                return {
                                    ...prev,
                                    ...(nextStatus ? { status: nextStatus as TaskStatus } : {}),
                                    deliverables: updatedDeliverables,
                                };
                            });
                        } else {
                            api.getWorkspaceTasks(workspaceId).then((updated) => {
                                setTasks(updated as WorkspaceTask[]);
                                setSelectedTask((prev) =>
                                    prev?.id === data.task_id ? (updated as WorkspaceTask[]).find((t) => t.id === data.task_id) || prev : prev
                                );
                            });
                        }
                        if (isFromOtherUser) {
                            toast(`Deliverable reviewed: ${data.review?.verdict?.replace('_', ' ')}`, { icon: '🛡️' });
                        }
                        triggerDebouncedActivityRefresh();
                    }
                    break;

                case 'milestone_created':
                    if (data?.milestone) {
                        setMilestones((prev) => {
                            const exists = prev.some((m) => m.id === data.milestone.id);
                            return exists ? prev : [...prev, data.milestone];
                        });
                        if (isFromOtherUser) toast.success(`Milestone created: "${data.milestone.title}"`);
                        triggerDebouncedActivityRefresh();
                    }
                    break;

                case 'member_updated':
                    if (data?.member_id && data?.role) {
                        setMembers((prev) =>
                            prev.map((m) => (m.id === data.member_id ? { ...m, role: data.role as WorkspaceRole } : m))
                        );
                    } else {
                        api.getWorkspaceMembers(workspaceId).then((mems) => setMembers(mems as WorkspaceMember[]));
                    }
                    triggerDebouncedActivityRefresh();
                    break;

                case 'member_left':
                case 'member_removed':
                    if (data?.user_id) {
                        setMembers((prev) => prev.filter((m) => m.user?.id !== data.user_id));
                        if (data.tasks_unassigned) {
                            setTasks((prev) =>
                                prev.map((t) =>
                                    t.assignee?.id === data.user_id
                                        ? { ...t, assignee: null, status: 'backlog' as TaskStatus }
                                        : t
                                )
                            );
                        }
                    } else {
                        api.getWorkspaceMembers(workspaceId).then((mems) => setMembers(mems as WorkspaceMember[]));
                    }
                    triggerDebouncedActivityRefresh();
                    break;

                case 'project_completed':
                    if (data?.proof_of_work) {
                        setProof(data.proof_of_work);
                        setWorkspace((prev) => (prev ? { ...prev, status: 'completed', progress_percentage: 100 } : prev));
                        toast.success('Project completed! Proof of Work minted 🎉');
                    }
                    break;

                case 'project_reopened':
                    setWorkspace((prev) => (prev ? { ...prev, status: 'active' } : prev));
                    toast('Project sprint reopened for further iteration', { icon: '🔄' });
                    break;

                case 'workspace_updated':
                    api.getWorkspace(workspaceId).then((ws) => setWorkspace(ws as WorkspaceDetail));
                    break;

                default:
                    break;
            }
        },
        [workspaceId, currentUser, triggerDebouncedActivityRefresh]
    );

    useWorkspaceSocket({
        workspaceId,
        onEvent: handleWorkspaceSocketEvent,
        enabled: !!currentUser && !loading,
    });

    // Actions
    const updateTaskStatus = useCallback(
        async (taskId: string, newStatus: TaskStatus | string) => {
            const previousTasks = [...tasks];
            setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus as TaskStatus } : t)));

            try {
                const updated = (await api.updateWorkspaceTask(workspaceId, taskId, { status: newStatus })) as WorkspaceTask;
                setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
                if (selectedTask?.id === taskId) setSelectedTask(updated);
                toast.success(`Task moved to ${newStatus.replace('_', ' ')}`);
                api.getWorkspace(workspaceId).then((ws) => setWorkspace(ws as WorkspaceDetail));
            } catch (err: any) {
                setTasks(previousTasks);
                toast.error(err.message || 'Failed to update task status');
            }
        },
        [workspaceId, tasks, selectedTask]
    );

    const createTask = useCallback(
        async (data: {
            title: string;
            description: string;
            priority: string;
            assignee_id?: string;
            milestone_id?: string;
        }) => {
            const task = (await api.createWorkspaceTask(workspaceId, data)) as WorkspaceTask;
            setTasks((prev) => [task, ...prev]);
            toast.success('Task created');
            triggerDebouncedActivityRefresh();
            return task;
        },
        [workspaceId, triggerDebouncedActivityRefresh]
    );

    const submitDeliverable = useCallback(
        async (taskId: string, data: { pr_url?: string; file_url?: string; description?: string }) => {
            await api.submitTaskDeliverable(workspaceId, taskId, data);
            toast.success('Deliverable submitted for review! Task moved to In Review.');
            const updatedTasks = (await api.getWorkspaceTasks(workspaceId)) as WorkspaceTask[];
            setTasks(updatedTasks);
            const fresh = updatedTasks.find((t) => t.id === taskId);
            if (fresh) setSelectedTask(fresh);
        },
        [workspaceId]
    );

    const reviewDeliverable = useCallback(
        async (taskId: string, deliverableId: string, data: { verdict: ReviewVerdict; feedback: string }) => {
            await api.reviewTaskDeliverable(workspaceId, taskId, deliverableId, data);
            toast.success(`Deliverable ${data.verdict.replace('_', ' ')}!`);
            const updatedTasks = (await api.getWorkspaceTasks(workspaceId)) as WorkspaceTask[];
            setTasks(updatedTasks);
            const fresh = updatedTasks.find((t) => t.id === taskId);
            if (fresh) setSelectedTask(fresh);
            api.getWorkspace(workspaceId).then((ws) => setWorkspace(ws as WorkspaceDetail));
        },
        [workspaceId]
    );

    const createMilestone = useCallback(
        async (data: { title: string; description?: string; due_date?: string }) => {
            const ms = (await api.createWorkspaceMilestone(workspaceId, data)) as ProjectMilestone;
            setMilestones((prev) => [...prev, ms]);
            toast.success('Milestone created');
            return ms;
        },
        [workspaceId]
    );

    const saveSettings = useCallback(
        async (data: { repo_url?: string; demo_url?: string; documentation_url?: string }) => {
            const updated = (await api.updateWorkspace(workspaceId, data)) as WorkspaceDetail;
            setWorkspace(updated);
            toast.success('Workspace links updated');
        },
        [workspaceId]
    );

    const completeProject = useCallback(async () => {
        const res = await api.completeWorkspace(workspaceId);
        toast.success('Project completed! Proof of Work minted 🎉');
        if (res.proof_of_work) {
            setProof(res.proof_of_work);
        }
        setWorkspace((prev) => (prev ? { ...prev, status: 'completed', progress_percentage: 100 } : prev));
    }, [workspaceId]);

    const reopenProject = useCallback(async () => {
        await api.reopenWorkspace(workspaceId);
        toast.success('Workspace reopened for iteration');
        setWorkspace((prev) => (prev ? { ...prev, status: 'active' } : prev));
    }, [workspaceId]);

    const leaveWorkspace = useCallback(async () => {
        await api.leaveWorkspace(workspaceId);
        toast.success('You have left the workspace.');
        router.push('/workspaces');
    }, [workspaceId, router]);

    const updateMemberRole = useCallback(
        async (memberId: string, role: string, roleTitle?: string) => {
            await api.updateWorkspaceMemberRole(workspaceId, memberId, { role, role_title: roleTitle });
            toast.success(`Role updated to ${role}`);
            const mems = (await api.getWorkspaceMembers(workspaceId)) as WorkspaceMember[];
            setMembers(mems);
        },
        [workspaceId]
    );

    const removeMember = useCallback(
        async (memberId: string, reason: string) => {
            await api.removeWorkspaceMember(workspaceId, memberId, reason);
            toast.success('Member removed from workspace');
            const mems = (await api.getWorkspaceMembers(workspaceId)) as WorkspaceMember[];
            setMembers(mems);
        },
        [workspaceId]
    );

    const submitPeerReview = useCallback(
        async (
            verificationCode: string,
            data: {
                reviewee_id: string;
                execution_score: number;
                collaboration_score: number;
                reliability_score: number;
                feedback: string;
            }
        ) => {
            await api.submitPeerReview(verificationCode, data);
            toast.success('Peer review recorded! Builder reputation updated.');
            const p = (await api.getPublicProof(verificationCode)) as WorkspaceProof;
            setProof(p);
        },
        []
    );

    return {
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
    };
}
