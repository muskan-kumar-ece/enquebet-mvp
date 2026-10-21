'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
    ChevronDown,
    ChevronUp,
    PlayCircle,
    FileText,
    Code,
    Hammer,
    CheckCircle2,
    Lock,
    ExternalLink,
} from 'lucide-react';
import { CourseModule, ContentType, LessonSummary } from '@/types/academy';

interface SyllabusAccordionProps {
    modules: CourseModule[];
    courseSlug: string;
    isEnrolled: boolean;
}

const CONTENT_TYPE_ICON: Record<ContentType, React.ReactNode> = {
    video: <PlayCircle className="w-4 h-4 text-blue-400" />,
    article: <FileText className="w-4 h-4 text-emerald-400" />,
    walkthrough: <Code className="w-4 h-4 text-purple-400" />,
    assignment: <Hammer className="w-4 h-4 text-amber-400" />,
};

export default function SyllabusAccordion({
    modules,
    courseSlug,
    isEnrolled,
}: SyllabusAccordionProps) {
    // Open all modules by default for frictionless exploration
    const [openModules, setOpenModules] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {};
        modules.forEach((m, idx) => {
            initial[m.id] = true;
        });
        return initial;
    });

    const toggleModule = (id: string) => {
        setOpenModules((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    return (
        <div className="space-y-4">
            {modules.map((mod, modIdx) => {
                const isOpen = openModules[mod.id] ?? true;
                const lessonsCount = mod.lessons?.length || 0;
                const totalMinutes = mod.lessons?.reduce((acc, l) => acc + (l.duration_minutes || 0), 0) || 0;

                return (
                    <div
                        key={mod.id}
                        className="rounded-2xl border border-[#1b1e2c] bg-[#0c0d15] overflow-hidden transition-colors"
                    >
                        {/* Module Header Bar */}
                        <button
                            onClick={() => toggleModule(mod.id)}
                            className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-white/[0.02] transition-colors"
                        >
                            <div className="flex items-start gap-3.5 pr-4">
                                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-xs font-mono font-semibold text-zinc-300 border border-white/[0.06]">
                                    {modIdx + 1}
                                </div>
                                <div>
                                    <h3 className="text-sm sm:text-base font-bold text-white leading-snug">
                                        {mod.title}
                                    </h3>
                                    {mod.description && (
                                        <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                                            {mod.description}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                                <span className="text-xs text-zinc-500 font-medium hidden sm:inline-block">
                                    {lessonsCount} lessons · {totalMinutes}m
                                </span>
                                {isOpen ? (
                                    <ChevronUp className="w-4 h-4 text-zinc-400" />
                                ) : (
                                    <ChevronDown className="w-4 h-4 text-zinc-400" />
                                )}
                            </div>
                        </button>

                        {/* Module Lessons List */}
                        {isOpen && (
                            <div className="border-t border-[#1b1e2c] divide-y divide-[#1b1e2c]/50 bg-[#090a0f]">
                                {mod.lessons?.map((lesson: LessonSummary, lessonIdx: number) => {
                                    const canAccess = isEnrolled || lesson.is_preview;
                                    const lessonHref = `/courses/${courseSlug}/lessons/${lesson.id}`;

                                    return (
                                        <div
                                            key={lesson.id}
                                            className="flex items-center justify-between p-3.5 sm:px-5 hover:bg-white/[0.02] transition-colors group"
                                        >
                                            <div className="flex items-center gap-3 min-w-0 pr-3">
                                                <div className="shrink-0">
                                                    {CONTENT_TYPE_ICON[lesson.content_type] || (
                                                        <FileText className="w-4 h-4 text-zinc-400" />
                                                    )}
                                                </div>

                                                <div className="min-w-0">
                                                    {canAccess ? (
                                                        <Link
                                                            href={lessonHref}
                                                            className="text-xs sm:text-sm font-medium text-zinc-200 group-hover:text-[#60a5fa] transition-colors truncate block"
                                                        >
                                                            {lesson.title}
                                                        </Link>
                                                    ) : (
                                                        <span className="text-xs sm:text-sm font-medium text-zinc-500 truncate block">
                                                            {lesson.title}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2.5 shrink-0">
                                                <span className="text-[11px] font-mono text-zinc-500">
                                                    {lesson.duration_minutes}m
                                                </span>

                                                {lesson.is_preview && !isEnrolled && (
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                                        Preview
                                                    </span>
                                                )}

                                                {lesson.is_completed ? (
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                                ) : !canAccess ? (
                                                    <Lock className="w-3.5 h-3.5 text-zinc-600" />
                                                ) : (
                                                    <Link
                                                        href={lessonHref}
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-white"
                                                    >
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
