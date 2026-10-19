"use client";

import { useEffect, useState } from 'react';
import { 
    X, 
    Share2, 
    ExternalLink, 
    Download, 
    Bookmark, 
    Calendar, 
    Clock, 
    Sparkles, 
    Check, 
    BookOpen, 
    Wrench, 
    Layers, 
    ShieldCheck, 
    AlertCircle, 
    FileText,
    ArrowUpRight,
    User
} from 'lucide-react';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';

interface PulseDetailDrawerProps {
    update: any | null;
    isOpen: boolean;
    onClose: () => void;
    onToggleSave: (id: string) => Promise<void>;
    onOpenBuildModal: (update: any) => void;
}

export function PulseDetailDrawer({
    update,
    isOpen,
    onClose,
    onToggleSave,
    onOpenBuildModal,
}: PulseDetailDrawerProps) {
    const [copied, setCopied] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (update) {
            setSaved(Boolean(update.is_saved));
        }
    }, [update]);

    // Handle escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen || !update) return null;

    const handleShare = () => {
        const url = `${window.location.origin}/updates?selected=${update.slug || update.id}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSave = async () => {
        const next = !saved;
        setSaved(next);
        try {
            await onToggleSave(update.slug || update.id);
        } catch {
            setSaved(!next);
        }
    };

    const formattedDate = new Date(update.published_at || update.created_at).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });

    const eventDate = update.event_date ? new Date(update.event_date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }) : null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm animate-fade-in">
            {/* Click backdrop to close */}
            <div className="absolute inset-0" onClick={onClose} />

            {/* Slide-over Drawer Container */}
            <div className="relative w-full max-w-3xl bg-[#090b11] border-l border-[#1e2335] text-zinc-100 h-full overflow-y-auto flex flex-col shadow-2xl z-10">
                {/* Sticky Header Bar */}
                <div className="sticky top-0 z-20 bg-[#090b11]/95 backdrop-blur-md border-b border-[#1e2335] px-6 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                        <span className="w-2 h-2 rounded-full bg-[#1864ff] animate-pulse" />
                        <span>PULSE DISPATCH · LEVEL 1-3 INTELLIGENCE</span>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Bookmark */}
                        <button
                            onClick={handleSave}
                            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                                saved
                                    ? 'bg-[#1864ff]/20 text-[#60a5fa] border-[#1864ff]/40'
                                    : 'text-zinc-400 hover:text-white border-[#1e2335] hover:bg-[#141824]'
                            }`}
                            title={saved ? 'Saved in My Pulse' : 'Save Update'}
                        >
                            <Bookmark className="w-4 h-4" fill={saved ? 'currentColor' : 'none'} />
                        </button>

                        {/* Share */}
                        <button
                            onClick={handleShare}
                            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-[#141824] border border-[#1e2335] transition-colors cursor-pointer"
                            title="Copy Permalink"
                        >
                            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                        </button>

                        {/* Close button */}
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-[#141824] border border-[#1e2335] transition-colors cursor-pointer"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Main Scrollable Content */}
                <div className="p-6 sm:p-8 space-y-8 flex-1">
                    {/* Header Metadata */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs font-mono flex-wrap">
                            <span className="px-2.5 py-0.5 rounded-lg bg-[#1864ff]/10 border border-[#1864ff]/25 text-[#4f8fff] font-semibold">
                                {update.category_display || update.category}
                            </span>
                            {update.update_type_display && (
                                <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300">
                                    {update.update_type_display}
                                </span>
                            )}
                            <span className="text-zinc-500">·</span>
                            <span className="text-zinc-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {update.reading_time_minutes || 3} min read
                            </span>
                        </div>

                        <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                            {update.title}
                        </h1>

                        <div className="flex items-center gap-4 text-xs font-mono text-zinc-400 flex-wrap pt-1 border-b border-[#1e2335] pb-4">
                            {update.author && (
                                <div className="flex items-center gap-1.5 text-zinc-300">
                                    <User className="w-3.5 h-3.5 text-zinc-500" />
                                    <span>Curated by {update.author.full_name || update.author.username}</span>
                                </div>
                            )}
                            <div>
                                <span className="text-zinc-500">Published: </span>
                                <span>{formattedDate}</span>
                            </div>
                            {eventDate && (
                                <div>
                                    <span className="text-zinc-500">Event Date: </span>
                                    <span>{eventDate}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* LEVEL 1: 30-SECOND QUICK BRIEF */}
                    <section className="bg-[#0d1017] border border-[#1e2335] rounded-2xl p-5 space-y-4">
                        <div className="flex items-center justify-between border-b border-[#1e2335] pb-2">
                            <span className="text-xs font-mono font-bold text-[#60a5fa] tracking-wider uppercase flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5" />
                                Level 1: 30-Second Quick Brief
                            </span>
                            <span className="text-[11px] font-mono text-zinc-500">Executive Summary</span>
                        </div>

                        {/* What happened */}
                        <div className="space-y-1">
                            <h4 className="text-xs font-mono uppercase text-zinc-400 font-semibold">1. What Happened?</h4>
                            <p className="text-sm text-zinc-200 leading-relaxed font-normal">
                                {update.summary}
                            </p>
                        </div>

                        {/* Why it matters */}
                        {update.why_it_matters && (
                            <div className="space-y-1 bg-[#090b11] border-l-2 border-[#1864ff] p-3 rounded-r-xl">
                                <h4 className="text-xs font-mono uppercase text-[#4f8fff] font-semibold">2. Why It Matters</h4>
                                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                                    {update.why_it_matters}
                                </p>
                            </div>
                        )}

                        {/* Who should care */}
                        {update.who_should_care && (
                            <div className="space-y-1">
                                <h4 className="text-xs font-mono uppercase text-zinc-400 font-semibold">3. Who Should Care?</h4>
                                <p className="text-xs sm:text-sm text-zinc-300">
                                    {update.who_should_care}
                                </p>
                            </div>
                        )}

                        {/* What to do next */}
                        {update.what_to_do_next && (
                            <div className="space-y-1 pt-1">
                                <h4 className="text-xs font-mono uppercase text-emerald-400 font-semibold">4. Immediate Action Recommendation</h4>
                                <p className="text-xs text-zinc-300">
                                    {update.what_to_do_next}
                                </p>
                            </div>
                        )}
                    </section>

                    {/* LEVEL 2: TECHNICAL DEEP DIVE */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between border-b border-[#1e2335] pb-2">
                            <span className="text-xs font-mono font-bold text-zinc-300 tracking-wider uppercase flex items-center gap-1.5">
                                <BookOpen className="w-3.5 h-3.5 text-[#1864ff]" />
                                Level 2: Technical Deep Dive & Context
                            </span>
                            <span className="text-[11px] font-mono text-zinc-500">2-5 min read</span>
                        </div>

                        {/* Markdown body */}
                        <div className="max-w-none text-sm text-zinc-300 leading-relaxed">
                            <MarkdownRenderer content={update.content || update.summary} />
                        </div>

                        {/* Attached documents if any */}
                        {Array.isArray(update.documents) && update.documents.length > 0 && (
                            <div className="pt-4 border-t border-[#1e2335] space-y-2">
                                <h4 className="text-xs font-mono uppercase text-zinc-400 font-semibold">Attached Technical Specifications & Whitepapers</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {update.documents.map((doc: any, idx: number) => (
                                        <a
                                            key={idx}
                                            href={doc.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-between p-3 rounded-xl bg-[#0d1017] hover:bg-[#141824] border border-[#1e2335] text-xs font-mono text-zinc-200 transition-colors"
                                        >
                                            <div className="flex items-center gap-2 truncate">
                                                <FileText className="w-4 h-4 text-[#4f8fff] shrink-0" />
                                                <span className="truncate">{doc.name || 'Document'}</span>
                                            </div>
                                            <Download className="w-3.5 h-3.5 text-zinc-400 shrink-0 ml-2" />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </section>

                    {/* LEVEL 3: PRIMARY SOURCES & ACTION HOOKS */}
                    <section className="bg-[#0d1017] border border-[#1e2335] rounded-2xl p-5 space-y-5">
                        <div className="flex items-center justify-between border-b border-[#1e2335] pb-2">
                            <span className="text-xs font-mono font-bold text-emerald-400 tracking-wider uppercase flex items-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                Level 3: Verified Sources & Builder Action Hooks
                            </span>
                            <span className="text-[11px] font-mono text-zinc-500">Evidence & Next Steps</span>
                        </div>

                        {/* Primary Sources links */}
                        <div className="space-y-2">
                            <h4 className="text-xs font-mono uppercase text-zinc-400 font-semibold">Supporting Primary Sources</h4>
                            <div className="flex flex-wrap gap-2">
                                {update.primary_source_url && (
                                    <a
                                        href={update.primary_source_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141824] hover:bg-[#1b2233] text-xs font-mono text-zinc-200 border border-[#1e2335] transition-colors"
                                    >
                                        <span>{update.primary_source_name || 'Primary Source'}</span>
                                        <ArrowUpRight className="w-3 h-3 text-[#4f8fff]" />
                                    </a>
                                )}

                                {Array.isArray(update.sources) && update.sources.map((src: any, i: number) => (
                                    <a
                                        key={i}
                                        href={src.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141824] hover:bg-[#1b2233] text-xs font-mono text-zinc-300 border border-[#1e2335] transition-colors"
                                    >
                                        <span>{src.name || 'Source Link'}</span>
                                        <ExternalLink className="w-3 h-3 text-zinc-400" />
                                    </a>
                                ))}
                            </div>
                        </div>

                        {/* Learn This Next */}
                        {Array.isArray(update.learn_this_next) && update.learn_this_next.length > 0 && (
                            <div className="space-y-2 pt-2 border-t border-[#1e2335]/80">
                                <h4 className="text-xs font-mono uppercase text-[#4f8fff] font-semibold flex items-center gap-1.5">
                                    <BookOpen className="w-3.5 h-3.5" />
                                    Learn This Next
                                </h4>
                                <div className="space-y-1.5">
                                    {update.learn_this_next.map((learn: any, i: number) => (
                                        <a
                                            key={i}
                                            href={learn.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-between p-2.5 rounded-xl bg-[#090b11] hover:bg-[#141824] border border-[#1e2335] text-xs text-zinc-300 transition-colors"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-[#1864ff]" />
                                                <span className="font-medium text-white">{learn.title}</span>
                                                {learn.provider && <span className="text-zinc-500 font-mono text-[11px]">({learn.provider})</span>}
                                            </div>
                                            {learn.level && (
                                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                                                    {learn.level}
                                                </span>
                                            )}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Build This Idea Card */}
                        {update.build_this_idea?.title && (
                            <div className="p-4 rounded-xl bg-gradient-to-br from-[#0e1424] to-[#090b11] border border-[#1864ff]/30 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-mono font-bold text-[#60a5fa] uppercase tracking-wider flex items-center gap-1.5">
                                        <Wrench className="w-3.5 h-3.5" />
                                        Build This Project Idea
                                    </span>
                                    {update.build_this_idea.difficulty && (
                                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1864ff]/20 text-[#60a5fa] font-semibold border border-[#1864ff]/30">
                                            {update.build_this_idea.difficulty} · ~{update.build_this_idea.estimated_hours || 4}h
                                        </span>
                                    )}
                                </div>

                                <h5 className="text-sm font-bold text-white">
                                    {update.build_this_idea.title}
                                </h5>

                                <p className="text-xs text-zinc-300 leading-relaxed">
                                    {update.build_this_idea.description}
                                </p>

                                {update.build_this_idea.stack && (
                                    <div className="text-[11px] font-mono text-zinc-400">
                                        <span className="text-zinc-500">Recommended Stack: </span>
                                        <span className="text-zinc-200">{update.build_this_idea.stack}</span>
                                    </div>
                                )}

                                <div className="pt-2 flex items-center justify-end">
                                    <button
                                        onClick={() => onOpenBuildModal(update)}
                                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1864ff] hover:bg-[#1864ff]/90 text-white text-xs font-mono font-medium transition-colors cursor-pointer shadow-sm"
                                    >
                                        <Wrench className="w-3.5 h-3.5" />
                                        <span>Create Workspace Task</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}

// Backward-compatible alias
export const UpdateDetailDrawer = PulseDetailDrawer;
