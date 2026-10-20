"use client";

import { useState, useEffect } from 'react';
import { 
    X, 
    Loader2, 
    AlertCircle, 
    Sparkles
} from 'lucide-react';
import { api } from '@/lib/api';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import toast from 'react-hot-toast';

interface PostUpdateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: any | null;
}

interface AttachedDoc {
    name: string;
    url: string;
    file_format?: string;
    file_size_bytes?: number;
}

interface ExternalLinkItem {
    title: string;
    url: string;
}

const PULSE_CATEGORIES = [
    { value: 'AI_ML', label: 'AI & Machine Learning' },
    { value: 'SOFTWARE', label: 'Software Development' },
    { value: 'ELECTRONICS', label: 'Electronics & Hardware' },
    { value: 'CLOUD_DEVOPS', label: 'Cloud & Infrastructure' },
    { value: 'CYBERSECURITY', label: 'Cybersecurity' },
    { value: 'RESEARCH_SCIENCE', label: 'Research & Science' },
    { value: 'STARTUPS', label: 'Startups & Industry' },
    { value: 'CAREERS', label: 'Careers & Opportunities' },
    { value: 'LIFECYCLE', label: 'Technology Lifecycle' },
    // Legacy support
    { value: 'PRODUCT_RELEASE', label: 'Product Release (Legacy)' },
    { value: 'ENGINEERING_DISPATCH', label: 'Engineering Dispatch (Legacy)' },
];

export function PostUpdateModal({
    isOpen,
    onClose,
    onSuccess,
    initialData,
}: PostUpdateModalProps) {
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('SOFTWARE');
    const [updateType, setUpdateType] = useState('DAILY_BRIEF');
    const [importance, setImportance] = useState('MEDIUM');
    const [isTopStory, setIsTopStory] = useState(false);
    const [isPinned, setIsPinned] = useState(false);
    const [editorialStatus, setEditorialStatus] = useState('PUBLISHED');
    
    // Level 1 fields
    const [summary, setSummary] = useState('');
    const [whyItMatters, setWhyItMatters] = useState('');
    const [whoShouldCare, setWhoShouldCare] = useState('');
    const [whatToDoNext, setWhatToDoNext] = useState('');
    
    // Level 2 field
    const [content, setContent] = useState('');
    
    // Level 3 sources
    const [primarySourceName, setPrimarySourceName] = useState('');
    const [primarySourceUrl, setPrimarySourceUrl] = useState('');
    const [readingTime, setReadingTime] = useState(3);
    const [tagsInput, setTagsInput] = useState('');

    // Attachments
    const [coverImage, setCoverImage] = useState('');
    const [documents, setDocuments] = useState<AttachedDoc[]>([]);
    const [externalLinks, setExternalLinks] = useState<ExternalLinkItem[]>([]);

    // UI state
    const [contentTab, setContentTab] = useState<'write' | 'preview'>('write');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        if (initialData) {
            setTitle(initialData.title || '');
            setCategory(initialData.category || 'SOFTWARE');
            setUpdateType(initialData.update_type || 'DAILY_BRIEF');
            setImportance(initialData.importance || 'MEDIUM');
            setIsTopStory(Boolean(initialData.is_top_story));
            setIsPinned(Boolean(initialData.is_pinned));
            setEditorialStatus(initialData.editorial_status || 'PUBLISHED');
            setSummary(initialData.summary || '');
            setWhyItMatters(initialData.why_it_matters || '');
            setWhoShouldCare(initialData.who_should_care || '');
            setWhatToDoNext(initialData.what_to_do_next || '');
            setContent(initialData.content || '');
            setPrimarySourceName(initialData.primary_source_name || '');
            setPrimarySourceUrl(initialData.primary_source_url || '');
            setReadingTime(initialData.reading_time_minutes || 3);
            setTagsInput(Array.isArray(initialData.tags) ? initialData.tags.join(', ') : '');
            setCoverImage(initialData.cover_image || '');
            setDocuments(initialData.documents || []);
            setExternalLinks(initialData.external_links || []);
        } else {
            setTitle('');
            setCategory('SOFTWARE');
            setUpdateType('DAILY_BRIEF');
            setImportance('MEDIUM');
            setIsTopStory(false);
            setIsPinned(false);
            setEditorialStatus('PUBLISHED');
            setSummary('');
            setWhyItMatters('');
            setWhoShouldCare('');
            setWhatToDoNext('');
            setContent('');
            setPrimarySourceName('');
            setPrimarySourceUrl('');
            setReadingTime(3);
            setTagsInput('');
            setCoverImage('');
            setDocuments([]);
            setExternalLinks([]);
        }
        setErrorMessage(null);
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !summary.trim()) {
            setErrorMessage('Title and Summary (Level 1) are required.');
            return;
        }

        setIsSubmitting(true);
        setErrorMessage(null);

        const tagsArray = tagsInput
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean);

        const payload: any = {
            title: title.trim(),
            category,
            update_type: updateType,
            importance,
            is_top_story: isTopStory,
            is_pinned: isPinned,
            editorial_status: editorialStatus,
            summary: summary.trim(),
            why_it_matters: whyItMatters.trim(),
            who_should_care: whoShouldCare.trim(),
            what_to_do_next: whatToDoNext.trim(),
            content: content.trim() || summary.trim(),
            primary_source_name: primarySourceName.trim(),
            primary_source_url: primarySourceUrl.trim(),
            reading_time_minutes: readingTime,
            tags: tagsArray,
            cover_image: coverImage,
            documents,
            external_links: externalLinks,
        };

        try {
            if (initialData?.id || initialData?.slug) {
                await api.updatePlatformUpdate(initialData.slug || initialData.id, payload);
                toast.success('Update saved successfully');
            } else {
                await api.createPlatformUpdate(payload);
                toast.success('Pulse update published!');
            }
            onSuccess();
            onClose();
        } catch (err: any) {
            setErrorMessage(err.message || 'Failed to submit update');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-4xl bg-[#0d1017] border border-[#1e2335] rounded-3xl text-zinc-100 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-[#1e2335] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#1864ff]" />
                        <h3 className="text-base font-bold text-white font-mono">
                            {initialData ? 'Admin Studio: Edit Intelligence' : 'Admin Studio: Author Pulse Intelligence'}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-[#141824] transition-colors cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                    {errorMessage && (
                        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-center gap-2 font-mono">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{errorMessage}</span>
                        </div>
                    )}

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        {/* Domain Category */}
                        <div className="space-y-1">
                            <label className="text-[11px] font-mono text-zinc-400">Domain Category</label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full bg-[#090b11] border border-[#1e2335] rounded-xl px-3 py-1.5 text-xs text-zinc-200 font-mono focus:border-[#1864ff]"
                            >
                                {PULSE_CATEGORIES.map((c) => (
                                    <option key={c.value} value={c.value}>{c.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Update Type */}
                        <div className="space-y-1">
                            <label className="text-[11px] font-mono text-zinc-400">Update Type</label>
                            <select
                                value={updateType}
                                onChange={(e) => setUpdateType(e.target.value)}
                                className="w-full bg-[#090b11] border border-[#1e2335] rounded-xl px-3 py-1.5 text-xs text-zinc-200 font-mono focus:border-[#1864ff]"
                            >
                                <option value="DAILY_BRIEF">Daily Briefing</option>
                                <option value="RELEASE">Software Release</option>
                                <option value="DEPRECATION">Deprecation Notice</option>
                                <option value="SECURITY_ADVISORY">Security Advisory</option>
                                <option value="RESEARCH_PAPER">Research Paper</option>
                                <option value="OPPORTUNITY">Career Opportunity</option>
                                <option value="HARDWARE_ANNOUNCEMENT">Hardware Dispatch</option>
                            </select>
                        </div>

                        {/* Importance Level */}
                        <div className="space-y-1">
                            <label className="text-[11px] font-mono text-zinc-400">Importance</label>
                            <select
                                value={importance}
                                onChange={(e) => setImportance(e.target.value)}
                                className="w-full bg-[#090b11] border border-[#1e2335] rounded-xl px-3 py-1.5 text-xs text-zinc-200 font-mono focus:border-[#1864ff]"
                            >
                                <option value="ROUTINE">Routine</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High Priority</option>
                                <option value="CRITICAL">Critical Impact</option>
                            </select>
                        </div>

                        {/* Editorial Status */}
                        <div className="space-y-1">
                            <label className="text-[11px] font-mono text-zinc-400">Editorial Status</label>
                            <select
                                value={editorialStatus}
                                onChange={(e) => setEditorialStatus(e.target.value)}
                                className="w-full bg-[#090b11] border border-[#1e2335] rounded-xl px-3 py-1.5 text-xs text-zinc-200 font-mono focus:border-[#1864ff]"
                            >
                                <option value="PUBLISHED">Published (Live)</option>
                                <option value="DRAFT">Draft (Unpublished)</option>
                                <option value="IN_REVIEW">In Review</option>
                                <option value="SCHEDULED">Scheduled</option>
                            </select>
                        </div>
                    </div>

                    {/* Checkboxes: Lead Story + Pinned */}
                    <div className="flex items-center gap-6 text-xs font-mono">
                        <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                            <input
                                type="checkbox"
                                checked={isTopStory}
                                onChange={(e) => setIsTopStory(e.target.checked)}
                                className="rounded bg-[#090b11] border-[#1e2335] text-[#1864ff]"
                            />
                            <span className="text-[#60a5fa] font-bold">★ Featured Lead Story</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                            <input
                                type="checkbox"
                                checked={isPinned}
                                onChange={(e) => setIsPinned(e.target.checked)}
                                className="rounded bg-[#090b11] border-[#1e2335] text-[#1864ff]"
                            />
                            <span>Pin to Top of Feed</span>
                        </label>
                    </div>

                    {/* Title */}
                    <div className="space-y-1">
                        <label className="text-xs font-mono text-zinc-300">Headline *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Clear, searchable headline (e.g. Next.js 16 Runtime Turbo Engine Released)..."
                            className="w-full bg-[#090b11] border border-[#1e2335] rounded-xl px-3.5 py-2 text-sm text-white font-mono focus:border-[#1864ff]"
                            required
                        />
                    </div>

                    {/* Level 1: 30s Digest */}
                    <div className="space-y-1">
                        <label className="text-xs font-mono text-[#60a5fa] font-semibold">
                            Level 1: What Happened? (In 30 Seconds) *
                        </label>
                        <textarea
                            rows={2}
                            value={summary}
                            onChange={(e) => setSummary(e.target.value)}
                            placeholder="Concise 1-3 sentence summary explaining the development clearly..."
                            className="w-full bg-[#090b11] border border-[#1e2335] rounded-xl px-3.5 py-2 text-xs text-zinc-200 focus:border-[#1864ff]"
                            required
                        />
                    </div>

                    {/* Level 1: Why it matters */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-mono text-zinc-300">Why It Matters</label>
                            <textarea
                                rows={2}
                                value={whyItMatters}
                                onChange={(e) => setWhyItMatters(e.target.value)}
                                placeholder="Explain the practical effect for developers, teams, or students..."
                                className="w-full bg-[#090b11] border border-[#1e2335] rounded-xl px-3.5 py-2 text-xs text-zinc-200 focus:border-[#1864ff]"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-mono text-zinc-300">Target Audience (Who Should Care)</label>
                            <textarea
                                rows={2}
                                value={whoShouldCare}
                                onChange={(e) => setWhoShouldCare(e.target.value)}
                                placeholder="e.g. Frontend developers, embedded ECE teams, DevOps architects..."
                                className="w-full bg-[#090b11] border border-[#1e2335] rounded-xl px-3.5 py-2 text-xs text-zinc-200 focus:border-[#1864ff]"
                            />
                        </div>
                    </div>

                    {/* Level 2: Markdown Deep Dive */}
                    <div className="space-y-2 border-t border-[#1e2335] pt-4">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-mono text-zinc-300 font-semibold">
                                Level 2: Technical Deep Dive (Markdown)
                            </label>
                            <div className="flex items-center gap-1 bg-[#090b11] border border-[#1e2335] rounded-lg p-0.5">
                                <button
                                    type="button"
                                    onClick={() => setContentTab('write')}
                                    className={`px-2.5 py-1 rounded text-[11px] font-mono cursor-pointer ${
                                        contentTab === 'write' ? 'bg-[#1864ff] text-white' : 'text-zinc-400'
                                    }`}
                                >
                                    Write
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setContentTab('preview')}
                                    className={`px-2.5 py-1 rounded text-[11px] font-mono cursor-pointer ${
                                        contentTab === 'preview' ? 'bg-[#1864ff] text-white' : 'text-zinc-400'
                                    }`}
                                >
                                    Preview
                                </button>
                            </div>
                        </div>

                        {contentTab === 'write' ? (
                            <textarea
                                rows={6}
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Provide technical background, architecture changes, code blocks, limitations, schematics..."
                                className="w-full bg-[#090b11] border border-[#1e2335] rounded-xl px-3.5 py-2 text-xs text-zinc-200 font-mono focus:border-[#1864ff]"
                            />
                        ) : (
                            <div className="p-4 bg-[#090b11] border border-[#1e2335] rounded-xl min-h-[140px]">
                                <MarkdownRenderer content={content || '*No detailed content written yet.*'} />
                            </div>
                        )}
                    </div>

                    {/* Level 3: Sources & Tags */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-[#1e2335] pt-4">
                        <div className="space-y-1">
                            <label className="text-[11px] font-mono text-zinc-400">Primary Source Name</label>
                            <input
                                type="text"
                                value={primarySourceName}
                                onChange={(e) => setPrimarySourceName(e.target.value)}
                                placeholder="e.g. Vercel Engineering Blog"
                                className="w-full bg-[#090b11] border border-[#1e2335] rounded-xl px-3 py-1.5 text-xs text-zinc-200 font-mono"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[11px] font-mono text-zinc-400">Primary Source URL</label>
                            <input
                                type="url"
                                value={primarySourceUrl}
                                onChange={(e) => setPrimarySourceUrl(e.target.value)}
                                placeholder="https://..."
                                className="w-full bg-[#090b11] border border-[#1e2335] rounded-xl px-3 py-1.5 text-xs text-zinc-200 font-mono"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[11px] font-mono text-zinc-400">Topic Tags (comma-separated)</label>
                            <input
                                type="text"
                                value={tagsInput}
                                onChange={(e) => setTagsInput(e.target.value)}
                                placeholder="python, react, risc-v..."
                                className="w-full bg-[#090b11] border border-[#1e2335] rounded-xl px-3 py-1.5 text-xs text-zinc-200 font-mono"
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1e2335]">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-xs font-mono text-zinc-400 hover:text-white"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#1864ff] hover:bg-[#1864ff]/90 text-white text-xs font-mono font-medium disabled:opacity-50 cursor-pointer shadow-sm"
                        >
                            {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            <span>{initialData ? 'Save Changes' : 'Publish Intelligence'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Backward-compatible alias
export const PulseAdminStudioModal = PostUpdateModal;
