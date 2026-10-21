'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { BookOpen, Sparkles, AlertCircle, RotateCcw, Compass, ArrowRight, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Course, CourseCategory, AcademyStats } from '@/types/academy';
import {
    CANONICAL_ACADEMY_COURSES,
    CANONICAL_ACADEMY_CATEGORIES,
    CANONICAL_ACADEMY_STATS,
} from '@/lib/academyData';
import AcademyHeader from '@/components/academy/AcademyHeader';
import AcademyFilterTabs from '@/components/academy/AcademyFilterTabs';
import CourseCard from '@/components/academy/CourseCard';
import { useAuth } from '@/lib/contexts/AuthContext';

function AcademyCatalogContent() {
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const isAuthenticated = Boolean(user);

    // Primary State
    const [courses, setCourses] = useState<Course[]>(CANONICAL_ACADEMY_COURSES);
    const [categories, setCategories] = useState<CourseCategory[]>(CANONICAL_ACADEMY_CATEGORIES);
    const [stats, setStats] = useState<AcademyStats>(CANONICAL_ACADEMY_STATS);
    const [loading, setLoading] = useState(true);

    // Filter & Search State
    const [activeTab, setActiveTab] = useState<'catalog' | 'my_learning'>('catalog');
    const [activeCategory, setActiveCategory] = useState<string>('ALL');
    const [activeDifficulty, setActiveDifficulty] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState<string>('');

    // Fetch Academy Data
    const fetchCourses = useCallback(async () => {
        try {
            setLoading(true);
            const params: Record<string, string> = {};

            if (activeTab === 'my_learning') {
                params.tab = 'my_learning';
            }
            if (activeCategory !== 'ALL') {
                params.category = activeCategory;
            }
            if (activeDifficulty !== 'ALL') {
                params.difficulty = activeDifficulty;
            }
            if (searchQuery.trim()) {
                params.search = searchQuery.trim();
            }

            const [coursesRes, catsRes, statsRes] = await Promise.allSettled([
                api.getCourses(params),
                api.getCourseCategories(),
                api.getAcademyStats(),
            ]);

            // Handle Courses Response
            if (coursesRes.status === 'fulfilled' && coursesRes.value) {
                const results = coursesRes.value.results || coursesRes.value;
                if (Array.isArray(results) && results.length > 0) {
                    setCourses(results);
                } else if (activeTab === 'catalog') {
                    // Fallback to canonical dataset with local filtering
                    let filtered = [...CANONICAL_ACADEMY_COURSES];
                    if (activeCategory !== 'ALL') {
                        filtered = filtered.filter((c) => c.category?.slug === activeCategory);
                    }
                    if (activeDifficulty !== 'ALL') {
                        filtered = filtered.filter((c) => c.difficulty === activeDifficulty);
                    }
                    if (searchQuery.trim()) {
                        const q = searchQuery.toLowerCase();
                        filtered = filtered.filter(
                            (c) =>
                                c.title.toLowerCase().includes(q) ||
                                c.short_description.toLowerCase().includes(q) ||
                                c.skills_gained.some((s) => s.toLowerCase().includes(q))
                        );
                    }
                    setCourses(filtered);
                } else {
                    setCourses([]);
                }
            } else if (activeTab === 'catalog') {
                setCourses(CANONICAL_ACADEMY_COURSES);
            } else {
                setCourses([]);
            }

            // Handle Categories Response
            if (catsRes.status === 'fulfilled' && Array.isArray(catsRes.value) && catsRes.value.length > 0) {
                setCategories(catsRes.value);
            }

            // Handle Stats Response
            if (statsRes.status === 'fulfilled' && statsRes.value) {
                setStats({
                    total_courses: statsRes.value.total_courses || CANONICAL_ACADEMY_STATS.total_courses,
                    total_enrollments: statsRes.value.total_enrollments || CANONICAL_ACADEMY_STATS.total_enrollments,
                    total_completions: statsRes.value.total_completions || CANONICAL_ACADEMY_STATS.total_completions,
                    total_assignments: statsRes.value.total_assignments || CANONICAL_ACADEMY_STATS.total_assignments,
                });
            }
        } catch (err) {
            console.warn('Using canonical academy dataset fallback:', err);
            if (activeTab === 'catalog') {
                setCourses(CANONICAL_ACADEMY_COURSES);
            }
        } finally {
            setLoading(false);
        }
    }, [activeTab, activeCategory, activeDifficulty, searchQuery]);

    useEffect(() => {
        fetchCourses();
    }, [fetchCourses]);

    // Handle Bookmark Toggle
    const handleToggleBookmark = async (slug: string, e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        if (!isAuthenticated) {
            toast.error('Please sign in to bookmark courses.');
            return;
        }

        // Optimistic toggle
        setCourses((prev) =>
            prev.map((c) => (c.slug === slug ? { ...c, is_bookmarked: !c.is_bookmarked } : c))
        );

        try {
            const res = await api.toggleCourseBookmark(slug);
            toast.success(res.detail || (res.bookmarked ? 'Course bookmarked' : 'Bookmark removed'));
        } catch (err: any) {
            toast.error(err.message || 'Failed to update bookmark');
            // Revert on error
            setCourses((prev) =>
                prev.map((c) => (c.slug === slug ? { ...c, is_bookmarked: !c.is_bookmarked } : c))
            );
        }
    };

    const enrolledCount = useMemo(() => {
        return courses.filter((c) => c.is_enrolled).length;
    }, [courses]);

    return (
        <div className="min-h-screen bg-[#07070d] text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
                {/* Academy Header & Telemetry */}
                <AcademyHeader
                    stats={stats}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    enrolledCount={enrolledCount}
                />

                {/* Filters, Categories & Search */}
                <AcademyFilterTabs
                    categories={categories}
                    activeCategory={activeCategory}
                    onCategoryChange={setActiveCategory}
                    activeDifficulty={activeDifficulty}
                    onDifficultyChange={setActiveDifficulty}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    resultsCount={courses.length}
                />

                {/* Course Grid Stream */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map((idx) => (
                            <div
                                key={idx}
                                className="h-96 rounded-2xl bg-[#0c0d15] border border-[#1b1e2c] p-6 animate-pulse flex flex-col justify-between"
                            >
                                <div className="space-y-4">
                                    <div className="h-44 rounded-xl bg-white/[0.04]" />
                                    <div className="h-4 w-1/3 rounded bg-white/[0.06]" />
                                    <div className="h-6 w-3/4 rounded bg-white/[0.08]" />
                                </div>
                                <div className="h-10 rounded-xl bg-white/[0.04]" />
                            </div>
                        ))}
                    </div>
                ) : courses.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {courses.map((course) => (
                            <CourseCard
                                key={course.id}
                                course={course}
                                onToggleBookmark={handleToggleBookmark}
                            />
                        ))}
                    </div>
                ) : (
                    /* Empty State */
                    <div className="rounded-2xl border border-[#1b1e2c] bg-[#0c0d15] p-12 text-center max-w-lg mx-auto">
                        <div className="inline-flex p-3 rounded-2xl bg-white/[0.04] text-zinc-400 mb-4">
                            <BookOpen className="w-8 h-8" />
                        </div>

                        <h3 className="text-base font-bold text-white mb-2">
                            {activeTab === 'my_learning'
                                ? 'No Enrolled Courses Yet'
                                : 'No Masterclasses Found'}
                        </h3>

                        <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
                            {activeTab === 'my_learning'
                                ? 'Explore our catalog of production engineering courses and start building real-world projects.'
                                : 'Try clearing your search filters or selecting another discipline to explore available curriculum.'}
                        </p>

                        {activeTab === 'my_learning' ? (
                            <button
                                onClick={() => setActiveTab('catalog')}
                                className="btn-brand text-xs font-semibold px-4 py-2.5 inline-flex items-center gap-2"
                            >
                                <Compass className="w-4 h-4" />
                                <span>Browse Masterclasses</span>
                            </button>
                        ) : (
                            <button
                                onClick={() => {
                                    setActiveCategory('ALL');
                                    setActiveDifficulty('ALL');
                                    setSearchQuery('');
                                }}
                                className="btn-outline text-xs px-4 py-2 inline-flex items-center gap-2"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Reset All Filters</span>
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function CoursesPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-[#07070d] flex items-center justify-center">
                    <div className="text-zinc-500 font-mono text-xs flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#1864ff] animate-ping" />
                        <span>Loading ENQUEbet Academy...</span>
                    </div>
                </div>
            }
        >
            <AcademyCatalogContent />
        </Suspense>
    );
}
