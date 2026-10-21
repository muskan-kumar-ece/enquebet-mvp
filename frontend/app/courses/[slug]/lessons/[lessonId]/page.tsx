'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Lock, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { LessonDetail, Course } from '@/types/academy';
import { CANONICAL_ACADEMY_COURSES } from '@/lib/academyData';
import LessonPlayer from '@/components/academy/LessonPlayer';
import { CourseCheckoutModal } from '@/components/academy/CourseCheckoutModal';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function LessonViewPage({
    params,
}: {
    params: Promise<{ slug: string; lessonId: string }>;
}) {
    const resolvedParams = use(params);
    const { slug, lessonId } = resolvedParams;
    const router = useRouter();
    const { user } = useAuth();

    const [lesson, setLesson] = useState<LessonDetail | null>(null);
    const [course, setCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState(true);
    const [accessDenied, setAccessDenied] = useState(false);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

    useEffect(() => {
        async function loadLessonAndCourse() {
            try {
                setLoading(true);
                setAccessDenied(false);

                // Fetch lesson detail
                const [lessonData, courseData] = await Promise.all([
                    api.getLesson(lessonId),
                    api.getCourse(slug),
                ]);

                setLesson(lessonData);
                setCourse(courseData);
            } catch (err: any) {
                console.warn('Failed to load lesson from API, evaluating fallback:', err);

                // If 403 Forbidden
                if (err.status === 403 || err.message?.includes('403')) {
                    setAccessDenied(true);
                    setLoading(false);
                    return;
                }

                // Check canonical fallback
                const fallbackCourse = CANONICAL_ACADEMY_COURSES.find((c) => c.slug === slug);
                if (fallbackCourse && fallbackCourse.modules) {
                    setCourse(fallbackCourse);
                    for (const mod of fallbackCourse.modules) {
                        const match = mod.lessons?.find((l) => l.id === lessonId);
                        if (match) {
                            setLesson({
                                id: match.id,
                                title: match.title,
                                slug: match.slug,
                                content_type: match.content_type,
                                article_markdown: (
                                    `# ${match.title}\n\n` +
                                    "Welcome to this interactive walkthrough. In this lesson, we break down core architectural decisions and implement reproducible solutions.\n\n" +
                                    "## Key Objectives\n\n" +
                                    "- Understand domain constraints\n" +
                                    "- Implement production code\n" +
                                    "- Verify outputs against unit test suites\n"
                                ),
                                duration_minutes: match.duration_minutes,
                                is_preview: match.is_preview,
                                order: match.order,
                                resources: [],
                                module_id: mod.id,
                                course_slug: slug,
                                course_title: fallbackCourse.title,
                                is_completed: false,
                                last_position_seconds: 0,
                            });
                            break;
                        }
                    }
                }
            } finally {
                setLoading(false);
            }
        }

        loadLessonAndCourse();
    }, [slug, lessonId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#07070d] flex items-center justify-center">
                <div className="text-zinc-500 font-mono text-xs flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#1864ff] animate-ping" />
                    <span>Loading Lesson Environment...</span>
                </div>
            </div>
        );
    }

    if (accessDenied) {
        const isPremiumCourse = Boolean(course?.access_tier === 'premium' || (course?.price_inr && course.price_inr > 0));

        return (
            <div className="min-h-screen bg-[#07070d] flex flex-col items-center justify-center p-6 text-center">
                <div className={`p-4 rounded-2xl mb-4 ${
                    isPremiumCourse
                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                        : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                }`}>
                    <Lock className="w-8 h-8" />
                </div>
                <h2 className="text-lg font-bold text-white mb-2">
                    {isPremiumCourse ? 'Premium Specialization Lesson' : 'Enrollment Required'}
                </h2>
                <p className="text-xs text-zinc-400 max-w-md mb-6 leading-relaxed">
                    {isPremiumCourse
                        ? `This lesson is part of the premium specialization "${course?.title || 'Masterclass'}". Unlock lifetime access to all lessons, source code, and capstone code reviews.`
                        : 'This lesson is reserved for enrolled builders. Enroll in the masterclass for free to unlock full curriculum access, progress tracking, and capstones.'}
                </p>
                <div className="flex items-center gap-3">
                    <Link href={`/courses/${slug}`} className="btn-outline text-xs px-4 py-2.5">
                        Back to Overview
                    </Link>
                    {isPremiumCourse ? (
                        <button
                            onClick={() => {
                                if (!user) {
                                    toast.error('Please sign in to unlock this specialization.');
                                    router.push(`/auth/login?next=/courses/${slug}/lessons/${lessonId}`);
                                    return;
                                }
                                setIsCheckoutOpen(true);
                            }}
                            className="py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                        >
                            <Zap className="w-3.5 h-3.5 fill-white" />
                            <span>Unlock Course — ₹{course?.price_inr?.toLocaleString('en-IN')}</span>
                        </button>
                    ) : (
                        <button
                            onClick={async () => {
                                try {
                                    await api.enrollCourse(slug);
                                    toast.success('Enrolled! Reloading lesson...');
                                    window.location.reload();
                                } catch (e: any) {
                                    toast.error(e.message || 'Enrollment failed');
                                }
                            }}
                            className="btn-brand text-xs px-4 py-2.5"
                        >
                            Enroll for Free
                        </button>
                    )}
                </div>

                {course && (
                    <CourseCheckoutModal
                        course={course}
                        isOpen={isCheckoutOpen}
                        onClose={() => setIsCheckoutOpen(false)}
                        onSuccess={() => {
                            setIsCheckoutOpen(false);
                            toast.success('Payment verified! Unlocking lesson...');
                            window.location.reload();
                        }}
                    />
                )}
            </div>
        );
    }

    if (!lesson || !course) {
        return (
            <div className="min-h-screen bg-[#07070d] flex flex-col items-center justify-center p-6 text-center">
                <h2 className="text-lg font-bold text-white mb-2">Lesson Not Found</h2>
                <p className="text-xs text-zinc-400 mb-6">
                    Could not locate the requested lesson module.
                </p>
                <Link href={`/courses/${slug}`} className="btn-brand text-xs px-4 py-2">
                    Back to Course
                </Link>
            </div>
        );
    }

    return (
        <LessonPlayer
            lesson={lesson}
            modules={course.modules || []}
            courseSlug={slug}
            courseTitle={course.title}
            onProgressUpdated={(isDone, percent) => {
                setLesson((prev) => (prev ? { ...prev, is_completed: isDone } : null));
            }}
        />
    );
}
