'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Menu,
    X,
    FileText,
    PlayCircle,
    Code,
    Hammer,
    ExternalLink,
    Lock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { LessonDetail, CourseModule } from '@/types/academy';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';

interface LessonPlayerProps {
    lesson: LessonDetail;
    modules: CourseModule[];
    courseSlug: string;
    courseTitle: string;
    onProgressUpdated?: (isCompleted: boolean, progressPercent: number) => void;
}

const CONTENT_TYPE_ICON: Record<string, React.ReactNode> = {
    video: <PlayCircle className="w-4 h-4 text-blue-400" />,
    article: <FileText className="w-4 h-4 text-emerald-400" />,
    walkthrough: <Code className="w-4 h-4 text-purple-400" />,
    assignment: <Hammer className="w-4 h-4 text-amber-400" />,
};

export default function LessonPlayer({
    lesson,
    modules,
    courseSlug,
    courseTitle,
    onProgressUpdated,
}: LessonPlayerProps) {
    const router = useRouter();
    const [isCompleted, setIsCompleted] = useState<boolean>(lesson.is_completed);
    const [updating, setUpdating] = useState<boolean>(false);
    const [drawerOpen, setDrawerOpen] = useState<boolean>(false);

    const handleToggleComplete = async () => {
        try {
            setUpdating(true);
            const newState = !isCompleted;
            const res = await api.toggleLessonComplete(lesson.id, newState);
            setIsCompleted(res.is_completed);
            toast.success(res.is_completed ? 'Lesson marked complete! 🎉' : 'Lesson marked incomplete.');

            if (onProgressUpdated) {
                onProgressUpdated(res.is_completed, res.progress_percent);
            }

            if (res.is_completed && res.progress_percent >= 100) {
                toast.success('Congratulations! Course 100% completed. Certificate issued! 🏆');
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to update progress');
        } finally {
            setUpdating(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-[#07070d]">
            {/* Top Distraction-Free Header */}
            <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#1b1e2c] bg-[#0c0d15]/95 backdrop-blur-md px-4 sm:px-6 py-3.5">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <Link
                        href={`/courses/${courseSlug}`}
                        className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors py-1 px-2 rounded-lg hover:bg-white/[0.04]"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="hidden sm:inline">Back to Overview</span>
                    </Link>

                    <div className="h-4 w-px bg-[#1b1e2c] hidden sm:block" />

                    <div className="min-w-0">
                        <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider truncate">
                            {courseTitle}
                        </div>
                        <h1 className="text-sm sm:text-base font-bold text-white truncate">
                            {lesson.title}
                        </h1>
                    </div>
                </div>

                {/* Right controls: Drawer toggle & Completion CTA */}
                <div className="flex items-center gap-2.5">
                    <button
                        onClick={handleToggleComplete}
                        disabled={updating}
                        className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                            isCompleted
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                                : 'bg-[#1864ff] text-white hover:bg-blue-600 shadow-sm'
                        }`}
                    >
                        <CheckCircle2 className={`w-4 h-4 ${isCompleted ? 'text-emerald-400' : 'text-white'}`} />
                        <span>{isCompleted ? 'Completed' : 'Mark Complete'}</span>
                    </button>

                    <button
                        onClick={() => setDrawerOpen(!drawerOpen)}
                        className="p-2 rounded-xl border border-[#1b1e2c] bg-white/[0.02] text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-colors"
                        title="Toggle curriculum"
                    >
                        <Menu className="w-4 h-4" />
                    </button>
                </div>
            </header>

            {/* Main Stage: Content Area + Collapsible Curriculum Drawer */}
            <div className="flex-1 flex relative">
                {/* Center Content Stream */}
                <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-8 py-8 w-full">
                    {/* Optional Video Embed */}
                    {lesson.video_url && (
                        <div className="mb-8 aspect-video w-full rounded-2xl overflow-hidden border border-[#1b1e2c] bg-black shadow-lg">
                            <iframe
                                src={lesson.video_url}
                                title={lesson.title}
                                className="w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                    )}

                    {/* Lesson Markdown Document */}
                    <div className="rounded-2xl border border-[#1b1e2c] bg-[#0c0d15] p-6 sm:p-10 shadow-sm">
                        <MarkdownRenderer content={lesson.article_markdown || '# Content coming soon.'} />
                    </div>

                    {/* Resource Attachments if present */}
                    {lesson.resources && lesson.resources.length > 0 && (
                        <div className="mt-8 rounded-2xl border border-[#1b1e2c] bg-[#0c0d15] p-6">
                            <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold mb-3">
                                Attached Engineering Resources
                            </h3>
                            <div className="space-y-2">
                                {lesson.resources.map((res, idx) => (
                                    <a
                                        key={idx}
                                        href={res.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-[#1864ff]/40 text-xs font-medium text-zinc-300 hover:text-white transition-colors"
                                    >
                                        <span>{res.title}</span>
                                        <ExternalLink className="w-3.5 h-3.5 text-zinc-500" />
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Bottom Navigation Dock */}
                    <div className="mt-10 pt-6 border-t border-[#1b1e2c] flex items-center justify-between gap-4">
                        {lesson.prev_lesson_id ? (
                            <Link
                                href={`/courses/${courseSlug}/lessons/${lesson.prev_lesson_id}`}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border border-[#1b1e2c] bg-[#0c0d15] text-zinc-300 hover:text-white hover:bg-white/[0.04] transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                <span>Previous Lesson</span>
                            </Link>
                        ) : (
                            <div />
                        )}

                        {lesson.next_lesson_id ? (
                            <Link
                                href={`/courses/${courseSlug}/lessons/${lesson.next_lesson_id}`}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[#1864ff] text-white hover:bg-blue-600 transition-colors shadow-sm"
                            >
                                <span>Next Lesson</span>
                                <ChevronRight className="w-4 h-4" />
                            </Link>
                        ) : (
                            <Link
                                href={`/courses/${courseSlug}`}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 transition-colors shadow-sm"
                            >
                                <span>Finish to Course Overview</span>
                                <ChevronRight className="w-4 h-4" />
                            </Link>
                        )}
                    </div>
                </main>

                {/* Collapsible Curriculum Drawer (Slide-out) */}
                {drawerOpen && (
                    <aside className="fixed inset-y-0 right-0 z-40 w-80 sm:w-96 bg-[#0c0d15] border-l border-[#1b1e2c] p-6 overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-200">
                        <div className="flex items-center justify-between pb-4 border-b border-[#1b1e2c] mb-6">
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                                Course Curriculum
                            </h3>
                            <button
                                onClick={() => setDrawerOpen(false)}
                                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.05]"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            {modules.map((mod, mIdx) => (
                                <div key={mod.id}>
                                    <div className="text-[11px] font-mono text-[#1864ff] uppercase tracking-wider mb-2 font-semibold">
                                        Module {mIdx + 1}: {mod.title}
                                    </div>
                                    <div className="space-y-1.5">
                                        {mod.lessons?.map((les) => {
                                            const isCurrent = les.id === lesson.id;
                                            return (
                                                <Link
                                                    key={les.id}
                                                    href={`/courses/${courseSlug}/lessons/${les.id}`}
                                                    onClick={() => setDrawerOpen(false)}
                                                    className={`flex items-center justify-between p-2.5 rounded-xl text-xs transition-colors ${
                                                        isCurrent
                                                            ? 'bg-[#1864ff]/20 text-[#60a5fa] font-semibold border border-[#1864ff]/40'
                                                            : 'text-zinc-400 hover:text-white hover:bg-white/[0.03]'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2.5 truncate pr-2">
                                                        {CONTENT_TYPE_ICON[les.content_type]}
                                                        <span className="truncate">{les.title}</span>
                                                    </div>
                                                    {les.is_completed && (
                                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                                    )}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </aside>
                )}
            </div>
        </div>
    );
}
