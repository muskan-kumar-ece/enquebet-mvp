/**
 * TypeScript Type Definitions for ENQUEbet Academy
 */

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type CourseFormat = 'project_based' | 'self_paced' | 'cohort';
export type CourseStatus = 'draft' | 'pending_review' | 'published' | 'archived';
export type AccessTier = 'free' | 'premium' | 'campus_only';
export type ContentType = 'video' | 'article' | 'walkthrough' | 'assignment';
export type EnrollmentStatus = 'active' | 'completed' | 'dropped';
export type DeliverableType = 'github_pr' | 'repo_link' | 'file_upload' | 'deployed_url';
export type SubmissionStatus = 'submitted' | 'reviewing' | 'approved' | 'changes_requested';

export interface CreatorProfile {
    id: string;
    username: string;
    full_name?: string;
    profile_image?: string;
    headline?: string;
    reputation_score?: number;
}

export interface CourseCategory {
    id: string;
    name: string;
    slug: string;
    icon: string;
    description: string;
    display_order: number;
    courses_count?: number;
}

export interface LessonSummary {
    id: string;
    title: string;
    slug: string;
    content_type: ContentType;
    duration_minutes: number;
    is_preview: boolean;
    order: number;
    is_completed?: boolean;
}

export interface CourseModule {
    id: string;
    title: string;
    description: string;
    order: number;
    lessons: LessonSummary[];
}

export interface LessonDetail {
    id: string;
    title: string;
    slug: string;
    content_type: ContentType;
    video_url?: string;
    article_markdown: string;
    duration_minutes: number;
    is_preview: boolean;
    order: number;
    resources: Array<{ title: string; url: string }>;
    module_id: string;
    course_slug: string;
    course_title: string;
    is_completed: boolean;
    last_position_seconds: number;
    next_lesson_id?: string | null;
    prev_lesson_id?: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface AssignmentSubmission {
    id: string;
    assignment_id?: string;
    assignment_title?: string;
    course_title?: string;
    course_slug?: string;
    learner: CreatorProfile;
    submission_text?: string;
    repository_url?: string;
    deliverable_url?: string;
    status: SubmissionStatus;
    feedback?: string;
    reviewer?: string | null;
    reviewed_at?: string | null;
    created_at: string;
    updated_at?: string;
}

export interface Assignment {
    id: string;
    course_id: string;
    lesson_id?: string | null;
    title: string;
    instructions_markdown: string;
    acceptance_criteria: string[];
    starter_repo_url?: string;
    required_deliverable_type: DeliverableType;
    user_submission?: AssignmentSubmission | null;
    created_at?: string;
}

export interface Course {
    id: string;
    slug: string;
    title: string;
    short_description: string;
    full_description?: string;
    category: CourseCategory;
    difficulty: DifficultyLevel;
    format: CourseFormat;
    estimated_hours: number;
    thumbnail_url: string;
    creator: CreatorProfile;
    status: CourseStatus;
    access_tier: AccessTier;
    price_inr: number;
    prerequisites?: string[];
    learning_outcomes?: string[];
    project_outcome_title: string;
    project_outcome_description?: string;
    starter_repo_url?: string;
    skills_gained: string[];
    is_featured: boolean;
    enrolled_count: number;
    modules_count?: number;
    lessons_count?: number;
    is_enrolled?: boolean;
    progress_percent?: number;
    enrollment_id?: string | null;
    last_accessed_lesson_id?: string | null;
    is_bookmarked?: boolean;
    certificate_code?: string | null;
    is_entitled?: boolean;
    has_access?: boolean;
    modules?: CourseModule[];
    assignments?: Assignment[];
    created_at: string;
    updated_at?: string;
}

export interface Enrollment {
    id: string;
    course: Course;
    status: EnrollmentStatus;
    enrolled_at: string;
    completed_at?: string | null;
    progress_percent: number;
    last_accessed_lesson?: string | null;
    certificate_code?: string | null;
}

export interface CourseCompletion {
    id: string;
    certificate_code: string;
    completed_at: string;
    grade_summary: Record<string, any>;
    course_title: string;
    course_slug: string;
    learner_name: string;
    learner_username: string;
    learner_avatar?: string;
}

export interface AcademyStats {
    total_courses: number;
    total_enrollments: number;
    total_completions: number;
    total_assignments: number;
}

export interface CourseOrder {
    id: string;
    order_number: string;
    course_title: string;
    course_slug: string;
    amount_inr: number;
    currency: string;
    status: 'pending' | 'paid' | 'failed' | 'refunded';
    payment_gateway: string;
    gateway_order_id?: string;
    billing_name?: string;
    billing_email?: string;
    created_at: string;
}

export interface CourseEntitlement {
    id: string;
    course_title: string;
    course_slug: string;
    is_active: boolean;
    granted_at: string;
}
