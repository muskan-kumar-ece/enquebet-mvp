'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Hammer } from 'lucide-react';
import { api } from '@/lib/api';
import { Assignment, Course } from '@/types/academy';
import { CANONICAL_ACADEMY_COURSES } from '@/lib/academyData';
import AssignmentWorkbench from '@/components/academy/AssignmentWorkbench';

export default function AssignmentViewPage({
    params,
}: {
    params: Promise<{ slug: string; assignmentId: string }>;
}) {
    const resolvedParams = use(params);
    const { slug, assignmentId } = resolvedParams;

    const [assignment, setAssignment] = useState<Assignment | null>(null);
    const [course, setCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            try {
                setLoading(true);
                const [assignmentData, courseData] = await Promise.all([
                    api.getAssignment(assignmentId),
                    api.getCourse(slug),
                ]);
                setAssignment(assignmentData);
                setCourse(courseData);
            } catch (err) {
                console.warn('Failed to load assignment from API, checking fallback:', err);
                const fallbackCourse = CANONICAL_ACADEMY_COURSES.find((c) => c.slug === slug);
                if (fallbackCourse) {
                    setCourse(fallbackCourse);
                    setAssignment({
                        id: assignmentId,
                        course_id: fallbackCourse.id,
                        title: fallbackCourse.project_outcome_title,
                        instructions_markdown: (
                            `# ${fallbackCourse.project_outcome_title}\n\n` +
                            "In this capstone, you will implement the production specification for this course outcome.\n\n" +
                            "### Requirements\n\n" +
                            "- Fork the starter repo\n" +
                            "- Implement end-to-end functionality\n" +
                            "- Ensure all automated test suites pass\n"
                        ),
                        acceptance_criteria: [
                            'Production code compiles and passes tests',
                            'Real-time protocol or model verified',
                            'Documented architecture in README.md',
                        ],
                        starter_repo_url: fallbackCourse.starter_repo_url,
                        required_deliverable_type: 'repo_link',
                        user_submission: null,
                    });
                }
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, [slug, assignmentId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#07070d] flex items-center justify-center">
                <div className="text-zinc-500 font-mono text-xs flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#1864ff] animate-ping" />
                    <span>Loading Assignment Workbench...</span>
                </div>
            </div>
        );
    }

    if (!assignment || !course) {
        return (
            <div className="min-h-screen bg-[#07070d] flex flex-col items-center justify-center p-6 text-center">
                <h2 className="text-lg font-bold text-white mb-2">Assignment Not Found</h2>
                <p className="text-xs text-zinc-400 mb-6">
                    Could not find the requested assignment workbench.
                </p>
                <Link href={`/courses/${slug}`} className="btn-brand text-xs px-4 py-2">
                    Back to Course
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#07070d] text-white">
            {/* Header Breadcrumb */}
            <div className="border-b border-[#1b1e2c] bg-[#0c0d15]/50">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                    <Link
                        href={`/courses/${slug}`}
                        className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back to {course.title}</span>
                    </Link>

                    <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
                        <span>Assignment</span>
                        <span>/</span>
                        <span className="text-zinc-300 font-semibold truncate max-w-xs">
                            {assignment.title}
                        </span>
                    </div>
                </div>
            </div>

            {/* Main Stage */}
            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
                <AssignmentWorkbench
                    assignment={assignment}
                    courseSlug={slug}
                    courseTitle={course.title}
                    skillsGained={course.skills_gained}
                    onSubmissionSuccess={(sub) => {
                        setAssignment((prev) => (prev ? { ...prev, user_submission: sub } : null));
                    }}
                />
            </main>
        </div>
    );
}
