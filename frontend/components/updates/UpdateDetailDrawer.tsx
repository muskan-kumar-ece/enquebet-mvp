"use client";

import { useEffect, useState } from 'react';
import { 
    X, 
    Pin, 
    Calendar, 
    FileText, 
    ExternalLink, 
    Download, 
    Share2, 
    Check, 
    Edit2, 
    Trash2,
    Layers,
    Cpu,
    ShieldAlert,
    Users,
    Radio,
    Clock
} from 'lucide-react';

interface UpdateDetailDrawerProps {
    update: any | null;
    isOpen: boolean;
    isAdmin: boolean;
    onClose: () => void;
    onEdit?: (update: any) => void;
    onDelete?: (update: any) => void;
}

export function UpdateDetailDrawer({
    update,
    isOpen,
    isAdmin,
    onClose,
    onEdit,
    onDelete,
}: UpdateDetailDrawerProps) {
    const [copied, setCopied] = useState(false);

    // Escape key listener & body scroll lock
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        }
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            window.addEventListener('keydown', handleKeyDown);
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen || !update) return null;

    const getCategoryConfig = (category: string) => {
        switch (category) {
            case 'PRODUCT_RELEASE':
                return { label: 'Product Release', color: 'text-blue-400 bg-blue-500/10 border-blue-500/25', icon: Layers };
            case 'ENGINEERING_DISPATCH':
                return { label: 'Engineering & Hardware', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25', icon: Cpu };
            case 'PROTOCOL_NETWORK':
                return { label: 'Protocol & Network', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/25', icon: Radio };
            case 'SECURITY_MAINTENANCE':
                return { label: 'Security & Maintenance', color: 'text-amber-400 bg-amber-500/10 border-amber-500/25', icon: ShieldAlert };
            case 'COMMUNITY_NEWS':
                return { label: 'Community & Milestones', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/25', icon: Users };
            default:
                return { label: 'Announcement', color: 'text-zinc-300 bg-zinc-500/10 border-zinc-500/25', icon: Radio };
        }
    };

    const categoryConfig = getCategoryConfig(update.category);
    const CategoryIcon = categoryConfig.icon;

    const formattedDate = new Date(update.published_at || update.created_at).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });

    const formatBytes = (bytes?: number) => {
        if (!bytes) return '';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const handleShare = () => {
        const url = `${window.location.origin}/updates?selected=${update.slug || update.id}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div 
                onClick={onClose}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
            />

            {/* Slide-over Container */}
            <div className="relative w-full max-w-2xl bg-surface-elevation-1 border-l border-border-default/80 shadow-2xl h-full flex flex-col z-10 overflow-hidden animate-in slide-in-from-right duration-200">
                {/* Header Bar */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border-default/80 bg-surface-elevation-2/60 backdrop-blur">
                    <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${categoryConfig.color}`}>
                            <CategoryIcon className="w-3.5 h-3.5" />
                            {categoryConfig.label}
                        </span>

                        {update.is_pinned && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20">
                                <Pin className="w-3 h-3 rotate-45" />
                                Pinned
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleShare}
                            title="Copy link to dispatch"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-text-secondary bg-surface-elevation-2 hover:bg-surface-elevation-3 hover:text-text-primary border border-border-default transition-colors cursor-pointer"
                        >
                            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                            <span>{copied ? 'Copied' : 'Share'}</span>
                        </button>

                        {isAdmin && (
                            <>
                                {onEdit && (
                                    <button
                                        type="button"
                                        onClick={() => onEdit(update)}
                                        title="Edit this update"
                                        className="p-1.5 rounded-lg text-text-muted hover:text-brand-light hover:bg-surface-elevation-3 border border-border-default transition-colors cursor-pointer"
                                    >
                                        <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                                {onDelete && (
                                    <button
                                        type="button"
                                        onClick={() => onDelete(update)}
                                        title="Delete this update"
                                        className="p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-surface-elevation-3 border border-border-default transition-colors cursor-pointer"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </>
                        )}

                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-elevation-3 border border-border-default transition-colors ml-1 cursor-pointer"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
                    {/* Title */}
                    <div className="space-y-3">
                        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-text-primary leading-tight">
                            {update.title}
                        </h1>

                        {/* Author & Timestamp */}
                        <div className="flex items-center gap-3 pt-1 text-xs text-text-muted">
                            {update.author?.profile_image ? (
                                <img
                                    src={update.author.profile_image}
                                    alt={update.author.full_name || update.author.username}
                                    className="w-7 h-7 rounded-full object-cover border border-border-default"
                                />
                            ) : (
                                <div className="w-7 h-7 rounded-full bg-brand-primary/20 border border-brand-primary/30 flex items-center justify-center text-xs text-brand-light font-bold">
                                    {(update.author?.username || 'A')[0].toUpperCase()}
                                </div>
                            )}

                            <div>
                                <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-text-primary">
                                        {update.author?.full_name || update.author?.username || 'Core Engineering'}
                                    </span>
                                    {update.author?.is_staff && (
                                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-brand-primary/10 text-brand-light border border-brand-primary/25">
                                            Staff Dispatch
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 text-text-muted font-mono text-[11px] mt-0.5">
                                    <Calendar className="w-3 h-3" />
                                    <span>{formattedDate}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Short Digest / TL;DR Callout */}
                    {update.summary && (
                        <div className="p-4 rounded-xl bg-surface-elevation-2 border border-border-default/80 space-y-1.5">
                            <div className="text-[11px] font-mono uppercase tracking-wider text-brand-light font-semibold">
                                Short Digest (TL;DR)
                            </div>
                            <p className="text-sm text-text-primary leading-relaxed">
                                {update.summary}
                            </p>
                        </div>
                    )}

                    {/* Cover Image */}
                    {update.cover_image && (
                        <div className="rounded-xl overflow-hidden border border-border-default bg-surface-elevation-2">
                            <img
                                src={update.cover_image}
                                alt={update.title}
                                className="w-full h-auto max-h-96 object-cover"
                            />
                        </div>
                    )}

                    {/* Full Detailed Content (Markdown) */}
                    <div className="space-y-4 pt-2">
                        <div className="text-[11px] font-mono uppercase tracking-wider text-text-muted">
                            Detailed Specification & Release Notes
                        </div>
                        <div className="prose prose-invert max-w-none text-sm text-text-secondary leading-relaxed whitespace-pre-line font-sans bg-surface-elevation-2/40 p-5 rounded-xl border border-border-default/60">
                            {update.content}
                        </div>
                    </div>

                    {/* Attached Documents */}
                    {Array.isArray(update.documents) && update.documents.length > 0 && (
                        <div className="space-y-3 pt-4 border-t border-border-default/60">
                            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-text-muted">
                                <FileText className="w-3.5 h-3.5 text-brand-light" />
                                <span>Attached Technical Documents ({update.documents.length})</span>
                            </div>

                            <div className="grid grid-cols-1 gap-2.5">
                                {update.documents.map((doc: any, idx: number) => (
                                    <div
                                        key={idx}
                                        className="flex items-center justify-between p-3 rounded-xl bg-surface-elevation-2 border border-border-default hover:border-brand-primary/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3 truncate">
                                            <div className="w-8 h-8 rounded-lg bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center font-mono text-[11px] font-bold text-brand-light shrink-0">
                                                {(doc.file_format || 'DOC').toUpperCase().slice(0, 4)}
                                            </div>
                                            <div className="truncate">
                                                <div className="text-sm font-medium text-text-primary truncate">
                                                    {doc.name || 'Document Attachment'}
                                                </div>
                                                {doc.file_size_bytes && (
                                                    <div className="text-[11px] font-mono text-text-muted">
                                                        {formatBytes(doc.file_size_bytes)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <a
                                            href={doc.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-light border border-brand-primary/25 text-xs font-medium transition-colors shrink-0 ml-3"
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                            <span>Download</span>
                                        </a>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* External Resources & Links */}
                    {Array.isArray(update.external_links) && update.external_links.length > 0 && (
                        <div className="space-y-3 pt-4 border-t border-border-default/60">
                            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-text-muted">
                                <ExternalLink className="w-3.5 h-3.5 text-brand-light" />
                                <span>External Resources & Citations ({update.external_links.length})</span>
                            </div>

                            <div className="grid grid-cols-1 gap-2">
                                {update.external_links.map((link: any, idx: number) => (
                                    <a
                                        key={idx}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-between p-3 rounded-xl bg-surface-elevation-2 border border-border-default hover:border-brand-primary/40 text-xs transition-colors group/link"
                                    >
                                        <div className="space-y-0.5 truncate">
                                            <div className="text-sm font-medium text-text-primary group-hover/link:text-brand-light truncate transition-colors">
                                                {link.title || link.url}
                                            </div>
                                            <div className="text-[11px] font-mono text-text-muted truncate">
                                                {link.url}
                                            </div>
                                        </div>
                                        <ExternalLink className="w-4 h-4 text-text-muted group-hover/link:text-brand-light shrink-0 ml-3" />
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
