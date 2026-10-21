'use client';

import React from 'react';
import Link from 'next/link';
import { Clock, BookOpen, Users, Hammer, ArrowRight, Bookmark, CheckCircle2 } from 'lucide-react';
import { Course } from '@/types/academy';

interface CourseCardProps {
    course: Course;
    onToggleBookmark?: (slug: string, e: React.MouseEvent) => void;
}

const DIFFICULTY_STYLE: Record<string, { label: string; bg: string; text: string; border: string }> = {
    beginner: {
        label: 'Beginner',
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-400',
        border: 'border-emerald-500/30',
    },
    intermediate: {
        label: 'Intermediate',
        bg: 'bg-blue-500/10',
        text: 'text-blue-400',
        border: 'border-blue-500/30',
    },
    advanced: {
        label: 'Advanced',
        bg: 'bg-purple-500/10',
        text: 'text-purple-400',
        border: 'border-purple-500/30',
    },
    expert: {
        label: 'Expert',
        bg: 'bg-amber-500/10',
        text: 'text-amber-400',
        border: 'border-amber-500/30',
    },
};

export default function CourseCard({ course, onToggleBookmark }: CourseCardProps) {
    const diff = DIFFICULTY_STYLE[course.difficulty] || DIFFICULTY_STYLE.beginner;
    const isEnrolled = Boolean(course.is_enrolled);
    const progress = course.progress_percent || 0;
    const isCompleted = progress >= 100 || course.status === 'completed';

    return (
        <div className="group relative flex flex-col justify-between rounded-2xl border border-[#1b1e2c] bg-[#0c0d15] hover:border-[#2a2f45] hover:bg-[#0f111a] transition-all duration-200 overflow-hidden shadow-sm hover:shadow-md">
            {/* Top Media Banner */}
            <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#151824]">
                {course.thumbnail_url ? (
                    <img
                        src={course.thumbnail_url}
                        alt={course.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#121624] to-[#0a0c14] text-zinc-600">
                        <BookOpen className="w-12 h-12 stroke-[1.5]" />
                    </div>
                )}

                {/* Gradient vignette */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0c0d15] via-transparent to-black/40 pointer-events-none" />

                {/* Difficulty & Status Badges */}
                <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${diff.bg} ${diff.text} ${diff.border}`}>
                        {diff.label}
                    </span>
                    {course.is_featured && (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#1864ff]/20 text-[#60a5fa] border border-[#1864ff]/40">
                            Featured
                        </span>
                    )}
                </div>

                {/* Bookmark Toggle */}
                {onToggleBookmark && (
                    <button
                        onClick={(e) => onToggleBookmark(course.slug, e)}
                        className={`absolute top-3 right-3 p-2 rounded-lg backdrop-blur-md transition-all duration-150 ${
                            course.is_bookmarked
                                ? 'bg-[#1864ff] text-white shadow-md'
                                : 'bg-black/50 text-zinc-300 hover:text-white hover:bg-black/80'
                        }`}
                        title={course.is_bookmarked ? 'Remove bookmark' : 'Bookmark course'}
                    >
                        <Bookmark className="w-3.5 h-3.5" fill={course.is_bookmarked ? 'currentColor' : 'none'} />
                    </button>
                )}
            </div>

            {/* Content Body */}
            <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                    {/* Category Label */}
                    <div className="flex items-center gap-1.5 text-xs font-mono text-[#1864ff] uppercase tracking-wider mb-2">
                        <span>{course.category?.name || 'Engineering'}</span>
                    </div>

                    {/* Title */}
                    <Link href={`/courses/${course.slug}`}>
                        <h2 className="text-base font-bold text-white group-hover:text-[#60a5fa] transition-colors line-clamp-2 leading-snug mb-2">
                            {course.title}
                        </h2>
                    </Link>

                    {/* Short Description */}
                    <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed mb-4">
                        {course.short_description}
                    </p>

                    {/* Project Outcome Spotlight */}
                    {course.project_outcome_title && (
                        <div className="mb-4 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-start gap-2.5">
                            <Hammer className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                            <div className="min-w-0">
                                <div className="text-[10px] uppercase font-mono tracking-wider text-purple-400 font-semibold">
                                    Project Capstone
                                </div>
                                <div className="text-xs text-zinc-200 font-medium truncate">
                                    {course.project_outcome_title}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Skill Tags */}
                    {course.skills_gained && course.skills_gained.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                            {course.skills_gained.slice(0, 4).map((skill, idx) => (
                                <span
                                    key={idx}
                                    className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-white/[0.03] text-zinc-400 border border-white/[0.05]"
                                >
                                    {skill}
                                </span>
                            ))}
                            {course.skills_gained.length > 4 && (
                                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono text-zinc-500">
                                    +{course.skills_gained.length - 4}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Progress / Footer Row */}
                <div className="pt-4 border-t border-[#1b1e2c]">
                    {isEnrolled ? (
                        <div className="space-y-2.5">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-zinc-400 font-medium flex items-center gap-1.5">
                                    {isCompleted ? (
                                        <>
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                            <span className="text-emerald-400 font-semibold">Completed</span>
                                        </>
                                    ) : (
                                        <span>Progress</span>
                                    )}
                                </span>
                                <span className="font-mono text-xs font-semibold text-white">
                                    {progress}%
                                </span>
                            </div>

                            {/* Progress bar */}
                            <div className="h-1.5 w-full rounded-full bg-[#1e2335] overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-300 ${
                                        isCompleted ? 'bg-emerald-500' : 'bg-[#1864ff]'
                                    }`}
                                    style={{ width: `${progress}%` }}
                                />
                            </div>

                            <Link
                                href={`/courses/${course.slug}`}
                                className="w-full mt-2 inline-flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold bg-[#1864ff]/20 text-[#60a5fa] hover:bg-[#1864ff] hover:text-white transition-all duration-150 border border-[#1864ff]/30"
                            >
                                <span>{isCompleted ? 'Review Course' : 'Resume Lesson'}</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-xs text-zinc-400 font-medium">
                                <div className="flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5 text-zinc-500" />
                                    <span>{course.estimated_hours}h</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <BookOpen className="w-3.5 h-3.5 text-zinc-500" />
                                    <span>{course.lessons_count || 5} lessons</span>
                                </div>
                            </div>

                            <Link
                                href={`/courses/${course.slug}`}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-[#1864ff] hover:text-[#60a5fa] transition-colors"
                            >
                                <span>View Course</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
