"use client";

import { useState, useRef, useEffect } from 'react';
import { 
    X, 
    Upload, 
    FileText, 
    ExternalLink, 
    Plus, 
    Trash2, 
    Pin, 
    Image as ImageIcon, 
    Loader2, 
    AlertCircle, 
    Eye, 
    Edit3 
} from 'lucide-react';
import { UPDATE_CATEGORIES } from './UpdateFilterBar';
import { api } from '@/lib/api';

interface PostUpdateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: any | null; // For editing existing update
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

export function PostUpdateModal({
    isOpen,
    onClose,
    onSuccess,
    initialData,
}: PostUpdateModalProps) {
    const [title, setTitle] = useState(initialData?.title || '');
    const [category, setCategory] = useState(initialData?.category || 'PRODUCT_RELEASE');
    const [summary, setSummary] = useState(initialData?.summary || '');
    const [content, setContent] = useState(initialData?.content || '');
    const [isPinned, setIsPinned] = useState(initialData?.is_pinned || false);
    
    // Media & Attachments
    const [coverImage, setCoverImage] = useState(initialData?.cover_image || '');
    const [documents, setDocuments] = useState<AttachedDoc[]>(initialData?.documents || []);
    const [externalLinks, setExternalLinks] = useState<ExternalLinkItem[]>(initialData?.external_links || []);
    
    // New link input state
    const [newLinkTitle, setNewLinkTitle] = useState('');
    const [newLinkUrl, setNewLinkUrl] = useState('');

    // Tab state for content editor
    const [contentTab, setContentTab] = useState<'write' | 'preview'>('write');

    // Upload & submission states
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [isUploadingDoc, setIsUploadingDoc] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const imageInputRef = useRef<HTMLInputElement>(null);
    const docInputRef = useRef<HTMLInputElement>(null);

    // Sync if initialData changes
    useEffect(() => {
        if (initialData) {
            setTitle(initialData.title || '');
            setCategory(initialData.category || 'PRODUCT_RELEASE');
            setSummary(initialData.summary || '');
            setContent(initialData.content || '');
            setIsPinned(initialData.is_pinned || false);
            setCoverImage(initialData.cover_image || '');
            setDocuments(initialData.documents || []);
            setExternalLinks(initialData.external_links || []);
        } else {
            setTitle('');
            setCategory('PRODUCT_RELEASE');
            setSummary('');
            setContent('');
            setIsPinned(false);
            setCoverImage('');
            setDocuments([]);
            setExternalLinks([]);
        }
        setErrorMessage(null);
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    // Handle Image upload
    const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingImage(true);
        setErrorMessage(null);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', 'enquebet/updates');

            const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1'}/uploads/image/`, {
                method: 'POST',
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                body: formData,
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to upload image');
            }

            const data = await res.json();
            setCoverImage(data.url);
        } catch (err: any) {
            setErrorMessage(err.message || 'Image upload failed');
        } finally {
            setIsUploadingImage(false);
            if (imageInputRef.current) imageInputRef.current.value = '';
        }
    };

    // Handle Document upload
    const handleDocFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingDoc(true);
        setErrorMessage(null);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1'}/uploads/document/`, {
                method: 'POST',
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                body: formData,
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to upload document');
            }

            const data = await res.json();
            const newDoc: AttachedDoc = {
                name: data.file_name || file.name,
                url: data.url,
                file_format: data.file_format || file.name.split('.').pop() || 'doc',
                file_size_bytes: data.file_size_bytes || file.size,
            };

            setDocuments((prev) => [...prev, newDoc]);
        } catch (err: any) {
            setErrorMessage(err.message || 'Document upload failed');
        } finally {
            setIsUploadingDoc(false);
            if (docInputRef.current) docInputRef.current.value = '';
        }
    };

    const handleAddLink = () => {
        if (!newLinkUrl.trim()) return;
        setExternalLinks((prev) => [
            ...prev,
            {
                title: newLinkTitle.trim() || newLinkUrl.trim(),
                url: newLinkUrl.trim().startsWith('http') ? newLinkUrl.trim() : `https://${newLinkUrl.trim()}`,
            },
        ]);
        setNewLinkTitle('');
        setNewLinkUrl('');
    };

    const handleRemoveDoc = (index: number) => {
        setDocuments((prev) => prev.filter((_, i) => i !== index));
    };

    const handleRemoveLink = (index: number) => {
        setExternalLinks((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !summary.trim() || !content.trim()) {
            setErrorMessage('Title, Short Digest (Summary), and Detailed Content are required.');
            return;
        }

        setIsSubmitting(true);
        setErrorMessage(null);

        try {
            const payload = {
                title: title.trim(),
                category,
                summary: summary.trim(),
                content: content.trim(),
                cover_image: coverImage.trim(),
                documents,
                external_links: externalLinks,
                is_pinned: isPinned,
                is_published: true,
            };

            if (initialData?.id || initialData?.slug) {
                await api.updatePlatformUpdate(initialData.slug || initialData.id, payload);
            } else {
                await api.createPlatformUpdate(payload);
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            setErrorMessage(err.message || 'Failed to submit update');
        } finally {
            setIsSubmitting(false);
        }
    };

    const categoryOptions = UPDATE_CATEGORIES.filter(c => c.value !== 'all');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            {/* Backdrop */}
            <div 
                onClick={onClose}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity" 
            />

            {/* Modal Dialog */}
            <div className="relative w-full max-w-2xl bg-surface-elevation-1 border border-border-default rounded-2xl shadow-2xl z-10 my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border-default/80 bg-surface-elevation-2/60">
                    <div>
                        <h2 className="text-lg font-bold text-text-primary">
                            {initialData ? 'Edit Platform Update' : 'Post Platform Update & Engineering Dispatch'}
                        </h2>
                        <p className="text-xs text-text-secondary">
                            Admin-only dispatch to community changelog and newsfeed
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-elevation-3 transition-colors cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
                    {errorMessage && (
                        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 flex items-center gap-2.5 text-xs text-red-400">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{errorMessage}</span>
                        </div>
                    )}

                    {/* Title & Category Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-2 space-y-1.5">
                            <label className="text-xs font-medium text-text-secondary">
                                Title / Headline <span className="text-brand-light">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. VenopAI Hardware Protocol 2.1 Released"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-3.5 py-2 rounded-lg bg-surface-elevation-2 border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-primary"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-text-secondary">
                                Category <span className="text-brand-light">*</span>
                            </label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-surface-elevation-2 border border-border-default text-sm text-text-primary focus:outline-none focus:border-brand-primary"
                            >
                                {categoryOptions.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Pinned Checkbox */}
                    <div className="flex items-center gap-2 pt-0.5">
                        <input
                            type="checkbox"
                            id="is_pinned"
                            checked={isPinned}
                            onChange={(e) => setIsPinned(e.target.checked)}
                            className="w-4 h-4 rounded border-border-default bg-surface-elevation-2 text-brand-primary focus:ring-brand-primary cursor-pointer"
                        />
                        <label htmlFor="is_pinned" className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer select-none">
                            <Pin className="w-3.5 h-3.5 text-amber-400" />
                            <span>Pin this update to top of changelog</span>
                        </label>
                    </div>

                    {/* Short Digest (TL;DR) */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-medium text-text-secondary">
                                Short Digest (TL;DR) <span className="text-brand-light">*</span>
                            </label>
                            <span className="text-[11px] font-mono text-text-muted">
                                1–3 concise sentences for scannable timeline
                            </span>
                        </div>
                        <textarea
                            required
                            rows={2}
                            placeholder="Briefly summarize what was released, fixed, or announced..."
                            value={summary}
                            onChange={(e) => setSummary(e.target.value)}
                            className="w-full px-3.5 py-2 rounded-lg bg-surface-elevation-2 border border-border-default text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-primary leading-relaxed"
                        />
                    </div>

                    {/* Detailed Content (Markdown) */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-medium text-text-secondary">
                                Detailed Specification & Release Notes <span className="text-brand-light">*</span>
                            </label>

                            {/* Write / Preview Tab */}
                            <div className="flex items-center rounded-md bg-surface-elevation-2 p-0.5 border border-border-default/60">
                                <button
                                    type="button"
                                    onClick={() => setContentTab('write')}
                                    className={`px-2.5 py-1 rounded text-[11px] font-medium flex items-center gap-1 ${
                                        contentTab === 'write' ? 'bg-surface-elevation-3 text-brand-light' : 'text-text-muted'
                                    }`}
                                >
                                    <Edit3 className="w-3 h-3" />
                                    <span>Write</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setContentTab('preview')}
                                    className={`px-2.5 py-1 rounded text-[11px] font-medium flex items-center gap-1 ${
                                        contentTab === 'preview' ? 'bg-surface-elevation-3 text-brand-light' : 'text-text-muted'
                                    }`}
                                >
                                    <Eye className="w-3 h-3" />
                                    <span>Preview</span>
                                </button>
                            </div>
                        </div>

                        {contentTab === 'write' ? (
                            <textarea
                                required
                                rows={6}
                                placeholder="Write detailed markdown content, changelog bullet points, architecture diagrams, technical notes..."
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-lg bg-surface-elevation-2 border border-border-default text-sm text-text-primary font-mono placeholder:font-sans placeholder:text-text-muted focus:outline-none focus:border-brand-primary leading-relaxed"
                            />
                        ) : (
                            <div className="min-h-[140px] p-4 rounded-lg bg-surface-elevation-2/60 border border-border-default/60 text-sm text-text-primary whitespace-pre-line leading-relaxed">
                                {content ? content : <span className="text-text-muted italic">Nothing to preview yet.</span>}
                            </div>
                        )}
                    </div>

                    {/* Cover Image Upload */}
                    <div className="space-y-2 pt-2 border-t border-border-default/60">
                        <label className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
                            <ImageIcon className="w-3.5 h-3.5 text-brand-light" />
                            <span>Cover Image (Optional)</span>
                        </label>

                        <div className="flex items-center gap-3">
                            <input
                                type="text"
                                placeholder="Paste image URL or upload file..."
                                value={coverImage}
                                onChange={(e) => setCoverImage(e.target.value)}
                                className="flex-1 px-3.5 py-2 rounded-lg bg-surface-elevation-2 border border-border-default text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-primary"
                            />

                            <input
                                type="file"
                                ref={imageInputRef}
                                onChange={handleImageFileChange}
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                className="hidden"
                            />

                            <button
                                type="button"
                                disabled={isUploadingImage}
                                onClick={() => imageInputRef.current?.click()}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-elevation-2 hover:bg-surface-elevation-3 text-xs text-text-secondary border border-border-default transition-colors cursor-pointer shrink-0"
                            >
                                {isUploadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                                <span>{isUploadingImage ? 'Uploading...' : 'Upload Image'}</span>
                            </button>
                        </div>

                        {coverImage && (
                            <div className="relative w-28 h-16 rounded-lg overflow-hidden border border-border-default">
                                <img src={coverImage} alt="Cover preview" className="w-full h-full object-cover" />
                                <button
                                    type="button"
                                    onClick={() => setCoverImage('')}
                                    className="absolute top-1 right-1 p-0.5 rounded-full bg-black/70 text-white hover:text-red-400"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Documents Upload Section */}
                    <div className="space-y-2 pt-2 border-t border-border-default/60">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 text-brand-light" />
                                <span>Technical Documents & Attachments (PDF, DOCX, ZIP, etc.)</span>
                            </label>

                            <input
                                type="file"
                                ref={docInputRef}
                                onChange={handleDocFileChange}
                                accept=".pdf,.docx,.doc,.txt,.md,.pptx,.zip,.epub"
                                className="hidden"
                            />

                            <button
                                type="button"
                                disabled={isUploadingDoc}
                                onClick={() => docInputRef.current?.click()}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-primary/10 hover:bg-brand-primary/20 text-xs text-brand-light border border-brand-primary/25 transition-colors cursor-pointer"
                            >
                                {isUploadingDoc ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                                <span>{isUploadingDoc ? 'Uploading...' : 'Attach Document'}</span>
                            </button>
                        </div>

                        {documents.length > 0 && (
                            <div className="space-y-1.5">
                                {documents.map((doc, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-elevation-2 border border-border-default text-xs"
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-brand-primary/15 text-brand-light">
                                                {doc.file_format || 'DOC'}
                                            </span>
                                            <span className="text-text-primary truncate">{doc.name}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveDoc(idx)}
                                            className="text-text-muted hover:text-red-400 p-1"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* External Resources Section */}
                    <div className="space-y-2 pt-2 border-t border-border-default/60">
                        <label className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
                            <ExternalLink className="w-3.5 h-3.5 text-brand-light" />
                            <span>External Links (GitHub PRs, Documentation, Live Demos)</span>
                        </label>

                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                placeholder="Link Label (e.g. GitHub Release)"
                                value={newLinkTitle}
                                onChange={(e) => setNewLinkTitle(e.target.value)}
                                className="flex-1 px-3 py-1.5 rounded-lg bg-surface-elevation-2 border border-border-default text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-primary"
                            />
                            <input
                                type="text"
                                placeholder="URL (e.g. https://...)"
                                value={newLinkUrl}
                                onChange={(e) => setNewLinkUrl(e.target.value)}
                                className="flex-1 px-3 py-1.5 rounded-lg bg-surface-elevation-2 border border-border-default text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-primary"
                            />
                            <button
                                type="button"
                                onClick={handleAddLink}
                                className="px-3 py-1.5 rounded-lg bg-surface-elevation-2 hover:bg-surface-elevation-3 text-xs text-brand-light border border-border-default transition-colors cursor-pointer"
                            >
                                <Plus className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {externalLinks.length > 0 && (
                            <div className="space-y-1.5">
                                {externalLinks.map((link, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-elevation-2 border border-border-default text-xs"
                                    >
                                        <div className="truncate">
                                            <span className="text-text-primary font-medium">{link.title}: </span>
                                            <span className="text-text-muted font-mono">{link.url}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveLink(idx)}
                                            className="text-text-muted hover:text-red-400 p-1"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-default/80">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-xs font-medium text-text-secondary hover:text-text-primary bg-surface-elevation-2 hover:bg-surface-elevation-3 border border-border-default transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-medium text-white bg-brand-primary hover:bg-brand-primary/90 transition-colors shadow-md shadow-brand-primary/20 disabled:opacity-50 cursor-pointer"
                        >
                            {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            <span>{initialData ? 'Save Changes' : 'Publish Update'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
