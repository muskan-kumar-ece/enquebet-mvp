/**
 * ENQUEbet Workspace & Team Execution Type Definitions
 * Strictly typed interfaces matching Django models in backend/apps/collaboration/
 */

export type WorkspaceRole = 'owner' | 'lead' | 'contributor';
export type WorkspaceStatus = 'active' | 'review' | 'completed';
export type TaskStatus = 'backlog' | 'assigned' | 'in_progress' | 'review' | 'approved' | 'blocked';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ReviewVerdict = 'approved' | 'changes_requested' | 'rejected';

export interface WorkspaceUserSummary {
    id: string;
    username: string;
    full_name: string;
    profile_image?: string;
    avatar_url?: string;
    headline?: string;
    reputation_score?: number;
}

export interface WorkspaceMember {
    id: string;
    user: WorkspaceUserSummary;
    role: WorkspaceRole;
    role_title?: string;
    status: 'active' | 'left' | 'removed';
    joined_at: string;
    left_at?: string;
    removal_reason?: string;
    active_tasks_count?: number;
    completed_tasks_count?: number;
}

export interface TaskReview {
    id: string;
    deliverable: string;
    reviewer: WorkspaceUserSummary;
    verdict: ReviewVerdict;
    feedback: string;
    reviewed_at: string;
}

export interface TaskDeliverable {
    id: string;
    task: string;
    submitted_by: WorkspaceUserSummary;
    title?: string;
    description?: string;
    pr_url?: string;
    file_url?: string;
    file_type?: string;
    submitted_at: string;
    reviews?: TaskReview[];
}

export interface WorkspaceTask {
    id: string;
    workspace: string;
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    creator: WorkspaceUserSummary;
    assignee?: WorkspaceUserSummary | null;
    reviewer?: WorkspaceUserSummary | null;
    milestone?: string | null;
    milestone_title?: string;
    due_date?: string | null;
    created_at: string;
    updated_at: string;
    deliverables?: TaskDeliverable[];
}

export interface ProjectMilestone {
    id: string;
    workspace: string;
    title: string;
    description: string;
    due_date?: string | null;
    order: number;
    status: 'open' | 'completed';
    completed_at?: string | null;
    total_tasks?: number;
    completed_tasks?: number;
    progress_percentage?: number;
}

export interface WorkspaceActivity {
    id: string;
    workspace: string;
    actor: WorkspaceUserSummary;
    event_type: string;
    description: string;
    created_at: string;
}

export interface PeerReviewDetail {
    id: string;
    reviewer: WorkspaceUserSummary;
    reviewee: WorkspaceUserSummary;
    execution_score: number;
    collaboration_score: number;
    reliability_score: number;
    feedback: string;
    created_at: string;
}

export interface WorkspaceProof {
    id: string;
    verification_code: string;
    project_title: string;
    project_description: string;
    repo_url?: string;
    demo_url?: string;
    documentation_url?: string;
    completed_at: string;
    members?: Array<{
        user: WorkspaceUserSummary;
        role: WorkspaceRole;
        role_title?: string;
        active_tasks_count?: number;
        completed_tasks_count?: number;
    }>;
    peer_reviews?: PeerReviewDetail[];
}

export interface WorkspaceDetail {
    id: string;
    title: string;
    description: string;
    post_id: string;
    status: WorkspaceStatus;
    current_user_role: WorkspaceRole;
    repo_url?: string;
    demo_url?: string;
    documentation_url?: string;
    max_members: number;
    active_members_count: number;
    total_tasks_count: number;
    completed_tasks_count: number;
    progress_percentage: number;
    created_at: string;
    updated_at: string;
}

export type WorkspaceErrorType = '403' | '404' | 'network' | null;
