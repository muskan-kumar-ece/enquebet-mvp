'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Clock,
    BookOpen,
    Users,
    Hammer,
    CheckCircle2,
    ArrowRight,
    ArrowLeft,
    Github,
    ExternalLink,
    ShieldCheck,
    Bookmark,
    Sparkles,
    Lock,
    Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Course } from '@/types/academy';
import { CANONICAL_ACADEMY_COURSES } from '@/lib/academyData';
import SyllabusAccordion from '@/components/academy/SyllabusAccordion';
import { CourseCheckoutModal } from '@/components/academy/CourseCheckoutModal';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function CourseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
    const resolvedParams = use(params);
    const slug = resolvedParams.slug;
    const router = useRouter();
    const { user } = useAuth();
    const isAuthenticated = Boolean(user);

    const [course, setCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState(true);
    const [enrolling, setEnrolling] = useState(false);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

    useEffect(() => {
        async function loadCourse() {
            try {
                setLoading(true);
                const data = await api.getCourse(slug);
                setCourse(data);
            } catch (err) {
                console.warn('Falling back to canonical course dataset:', err);
                const fallback = CANONICAL_ACADEMY_COURSES.find((c) => c.slug === slug);
                setCourse(fallback || null);
            } finally {
                setLoading(false);
            }
        }
        loadCourse();
    }, [slug]);

    const handleEnroll = async () => {
        if (!isAuthenticated) {
            toast.error('Please sign in to enroll in this course.');
            router.push('/auth/login?next=/courses/' + slug);
            return;
        }

        try {
            setEnrolling(true);
            const res = await api.enrollCourse(slug);
            toast.success(res.detail || 'Successfully enrolled! 🎉');

            // Optimistically update local course state
            setCourse((prev) =>
                prev
                    ? {
                          ...prev,
                          is_enrolled: true,
                          progress_percent: prev.progress_percent || 0,
                          enrolled_count: (prev.enrolled_count || 0) + 1,
                      }
                    : null
            );

            // Navigate to first lesson if available
            if (course?.modules && course.modules.length > 0) {
                const firstLesson = course.modules[0].lessons?.[0];
                if (firstLesson) {
                    router.push(`/courses/${slug}/lessons/${firstLesson.id}`);
                }
            }
        } catch (err: any) {
            toast.error(err.message || 'Enrollment failed');
        } finally {
            setEnrolling(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#07070d] flex items-center justify-center">
                <div className="text-zinc-500 font-mono text-xs flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#1864ff] animate-ping" />
                    <span>Loading Masterclass Details...</span>
                </div>
            </div>
        );
    }

    if (!course) {
        return (
            <div className="min-h-screen bg-[#07070d] flex flex-col items-center justify-center p-6 text-center">
                <h2 className="text-xl font-bold text-white mb-2">Course Not Found</h2>
                <p className="text-xs text-zinc-400 mb-6">
                    The requested engineering course could not be located in our catalog.
                </p>
                <Link href="/courses" className="btn-brand text-xs px-4 py-2">
                    Back to Catalog
                </Link>
            </div>
        );
    }

    const isEnrolled = Boolean(course.is_enrolled || course.is_entitled);
    const isPremium = Boolean(course.access_tier === 'premium' || (course.price_inr && course.price_inr > 0));
    const previewLesson = course.modules?.[0]?.lessons?.find((l) => l.is_preview);
    const progress = course.progress_percent || 0;
    const firstLessonId = course.modules?.[0]?.lessons?.[0]?.id;
    const resumeLessonId = course.last_accessed_lesson_id || firstLessonId;

    return (
        <div className="min-h-screen bg-[#07070d] text-white">
            {/* Top Navigation Breadcrumb */}
            <div className="border-b border-[#1b1e2c] bg-[#0c0d15]/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                    <Link
                        href="/courses"
                        className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>All Masterclasses</span>
                    </Link>

                    <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
                        <span>{course.category?.name}</span>
                        <span>/</span>
                        <span className="text-zinc-300 font-semibold truncate max-w-[200px] sm:max-w-xs">
                            {course.title}
                        </span>
                    </div>
                </div>
            </div>

            {/* Main Stage: Two Columns */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-12 items-start">
                    {/* Left Column: Comprehensive Curriculum & Capstones (2 Cols) */}
                    <div className="lg:col-span-2 space-y-10">
                        {/* Course Header */}
                        <div>
                            <div className="flex flex-wrap items-center gap-2.5 mb-4">
                                <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold bg-[#1864ff]/10 text-[#60a5fa] border border-[#1864ff]/20 uppercase tracking-wider">
                                    {course.category?.name || 'Systems'}
                                </span>
                                <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-white/[0.04] text-zinc-300 border border-white/[0.06] capitalize">
                                    {course.difficulty} Level
                                </span>
                                <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                    Project-Based
                                </span>
                            </div>

                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white mb-4 leading-tight">
                                {course.title}
                            </h1>

                            <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
                                {course.full_description || course.short_description}
                            </p>
                        </div>

                        {/* Project Capstone Spotlight */}
                        {course.project_outcome_title && (
                            <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-950/20 via-[#0c0d15] to-[#07070d] p-6 sm:p-8">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 shrink-0">
                                        <Hammer className="w-6 h-6" />
                                    </div>
                                    <div className="space-y-2 min-w-0">
                                        <div className="text-[11px] font-mono uppercase tracking-wider text-purple-400 font-bold">
                                            The Capstone Deliverable
                                        </div>
                                        <h3 className="text-lg font-bold text-white">
                                            {course.project_outcome_title}
                                        </h3>
                                        <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                                            {course.project_outcome_description ||
                                                'You will implement a production deliverable and verify it against real acceptance criteria.'}
                                        </p>

                                        {course.starter_repo_url && (
                                            <div className="pt-2">
                                                <a
                                                    href={course.starter_repo_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#60a5fa] hover:text-white transition-colors"
                                                >
                                                    <Github className="w-3.5 h-3.5" />
                                                    <span>View Starter Repository</span>
                                                    <ExternalLink className="w-3 h-3" />
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Learning Outcomes */}
                        {course.learning_outcomes && course.learning_outcomes.length > 0 && (
                            <div className="rounded-2xl border border-[#1b1e2c] bg-[#0c0d15] p-6 sm:p-8">
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono mb-4">
                                    What You Will Master
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                    {course.learning_outcomes.map((outcome, idx) => (
                                        <div key={idx} className="flex items-start gap-2.5 text-xs text-zinc-300">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                            <span className="leading-relaxed">{outcome}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Prerequisites */}
                        {course.prerequisites && course.prerequisites.length > 0 && (
                            <div className="rounded-2xl border border-[#1b1e2c] bg-[#0c0d15] p-6 sm:p-8">
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono mb-3">
                                    Prerequisites
                                </h3>
                                <ul className="space-y-2 text-xs text-zinc-400 list-disc list-inside">
                                    {course.prerequisites.map((p, idx) => (
                                        <li key={idx}>{p}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Curriculum Syllabus Accordion */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-white">Curriculum Syllabus</h3>
                                <span className="text-xs font-mono text-zinc-500">
                                    {course.modules?.length || 0} modules · {course.estimated_hours}h total
                                </span>
                            </div>

                            {course.modules && course.modules.length > 0 ? (
                                <SyllabusAccordion
                                    modules={course.modules}
                                    courseSlug={course.slug}
                                    isEnrolled={isEnrolled}
                                />
                            ) : (
                                <div className="p-6 rounded-2xl bg-[#0c0d15] border border-[#1b1e2c] text-xs text-zinc-500 text-center">
                                    Curriculum details are being finalized.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Rail: Sticky Action Dock (1 Col) */}
                    <div className="sticky top-20 space-y-6">
                        <div className="rounded-2xl border border-[#1b1e2c] bg-[#0c0d15] p-6 overflow-hidden shadow-xl">
                            {/* Thumbnail Media */}
                            {course.thumbnail_url && (
                                <div className="aspect-video w-full rounded-xl overflow-hidden mb-6 bg-[#151824]">
                                    <img
                                        src={course.thumbnail_url}
                                        alt={course.title}
                                        className="h-full w-full object-cover"
                                    />
                                </div>
                            )}

                            {/* Pricing & Access Tier */}
                            <div className="flex items-center justify-between pb-6 border-b border-[#1b1e2c] mb-6">
                                <div>
                                    <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-500">
                                        Access Tier
                                    </div>
                                    <div className="text-2xl font-bold text-white">
                                        {isPremium ? `₹${course.price_inr?.toLocaleString('en-IN')}` : 'Free'}
                                    </div>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-mono font-semibold ${
                                    isPremium
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                                }`}>
                                    {isPremium ? 'Premium Track' : 'Open Foundation'}
                                </span>
                            </div>

                            {/* Action CTA */}
                            {isEnrolled ? (
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex items-center justify-between text-xs mb-1.5">
                                            <span className="text-zinc-400 font-medium">Your Progress</span>
                                            <span className="font-mono text-xs font-semibold text-white">
                                                {progress}%
                                            </span>
                                        </div>
                                        <div className="h-2 w-full rounded-full bg-[#1e2335] overflow-hidden">
                                            <div
                                                className="h-full bg-[#1864ff] transition-all duration-300"
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                    </div>

                                    {resumeLessonId ? (
                                        <Link
                                            href={`/courses/${course.slug}/lessons/${resumeLessonId}`}
                                            className="w-full btn-brand text-xs font-semibold py-3 flex items-center justify-center gap-2"
                                        >
                                            <span>Resume Lesson</span>
                                            <ArrowRight className="w-4 h-4" />
                                        </Link>
                                    ) : (
                                        <div className="text-xs text-center text-emerald-400 font-semibold py-2">
                                            Course Completed! 🏆
                                        </div>
                                    )}
                                </div>
                            ) : isPremium ? (
                                <div className="space-y-2.5">
                                    <button
                                        onClick={() => {
                                            if (!isAuthenticated) {
                                                toast.error('Please sign in to unlock this specialization.');
                                                router.push('/auth/login?next=/courses/' + slug);
                                                return;
                                            }
                                            setIsCheckoutOpen(true);
                                        }}
                                        className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                                    >
                                        <Zap className="w-4 h-4 fill-white" />
                                        <span>Unlock Course — ₹{course.price_inr?.toLocaleString('en-IN')}</span>
                                        <ArrowRight className="w-4 h-4 ml-1" />
                                    </button>

                                    {previewLesson && (
                                        <Link
                                            href={`/courses/${course.slug}/lessons/${previewLesson.id}`}
                                            className="w-full py-2.5 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-[#1b1e2c] text-zinc-300 hover:text-white text-xs font-medium flex items-center justify-center gap-2 transition-all"
                                        >
                                            <span>Preview Lesson 1 Free</span>
                                            <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
                                        </Link>
                                    )}
                                </div>
                            ) : (
                                <button
                                    onClick={handleEnroll}
                                    disabled={enrolling}
                                    className="w-full btn-brand text-xs font-semibold py-3.5 flex items-center justify-center gap-2"
                                >
                                    <span>{enrolling ? 'Enrolling...' : 'Enroll in Masterclass (Free)'}</span>
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            )}

                            {/* Meta Metrics */}
                            <div className="mt-6 pt-6 border-t border-[#1b1e2c] space-y-3 text-xs text-zinc-400">
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                        <Clock className="w-3.5 h-3.5 text-zinc-500" />
                                        <span>Estimated Duration</span>
                                    </span>
                                    <span className="font-mono text-white font-medium">
                                        {course.estimated_hours} Hours
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                        <BookOpen className="w-3.5 h-3.5 text-zinc-500" />
                                        <span>Curriculum Units</span>
                                    </span>
                                    <span className="font-mono text-white font-medium">
                                        {course.lessons_count || 5} Lessons
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                        <Users className="w-3.5 h-3.5 text-zinc-500" />
                                        <span>Active Builders</span>
                                    </span>
                                    <span className="font-mono text-white font-medium">
                                        {course.enrolled_count.toLocaleString()}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                        <ShieldCheck className="w-3.5 h-3.5 text-zinc-500" />
                                        <span>Credential</span>
                                    </span>
                                    <span className="font-mono text-emerald-400 font-medium">
                                        Verified Certificate
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Creator Builder Dossier */}
                        {course.creator && (
                            <div className="rounded-2xl border border-[#1b1e2c] bg-[#0c0d15] p-5">
                                <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 mb-3">
                                    Masterclass Instructor
                                </div>
                                <div className="flex items-center gap-3">
                                    {course.creator.profile_image ? (
                                        <img
                                            src={course.creator.profile_image}
                                            alt={course.creator.username}
                                            className="w-10 h-10 rounded-full object-cover border border-[#1b1e2c]"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-[#1864ff]/20 text-[#60a5fa] font-bold text-xs flex items-center justify-center border border-[#1864ff]/30">
                                            {course.creator.username.slice(0, 2).toUpperCase()}
                                        </div>
                                    )}

                                    <div className="min-w-0">
                                        <div className="text-xs font-bold text-white truncate">
                                            {course.creator.full_name || course.creator.username}
                                        </div>
                                        <div className="text-[11px] text-zinc-400 truncate">
                                            {course.creator.headline || 'Technical Builder'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Paid Course Checkout Modal */}
            {course && (
                <CourseCheckoutModal
                    course={course}
                    isOpen={isCheckoutOpen}
                    onClose={() => setIsCheckoutOpen(false)}
                    onSuccess={() => {
                        setIsCheckoutOpen(false);
                        setCourse((prev) =>
                            prev
                                ? {
                                      ...prev,
                                      is_enrolled: true,
                                      is_entitled: true,
                                      has_access: true,
                                      enrolled_count: (prev.enrolled_count || 0) + 1,
                                  }
                                : null
                        );
                        toast.success('Course unlocked! Enjoy your masterclass 🎉');
                        if (course.modules && course.modules.length > 0) {
                            const firstLesson = course.modules[0].lessons?.[0];
                            if (firstLesson) {
                                router.push(`/courses/${course.slug}/lessons/${firstLesson.id}`);
                            }
                        }
                    }}
                />
            )}
        </div>
    );
}
