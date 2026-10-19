"use client";

import { useState } from 'react';
import { 
    Pin, 
    Calendar, 
    FileText, 
    ExternalLink, 
    ArrowRight, 
    Edit2, 
    Trash2, 
    Share2, 
    Download,
    Check,
    Layers,
    Cpu,
    ShieldAlert,
    Users,
    Radio
} from 'lucide-react';
import { ViewMode } from './UpdateFilterBar';

interface UpdateCardProps {
    update: any;
    viewMode: ViewMode;
    isAdmin: boolean;
    onOpenDetail: (update: any) => void;
    onEdit?: (update: any) => void;
    onDelete?: (update: any) => void;
}

export function UpdateCard({
    update,
    viewMode,
    isAdmin,
    onOpenDetail,
    onEdit,
    onDelete,
}: UpdateCardProps) {
    const [copied, setCopied] = useState(false);

    const getCategoryConfig = (category: string) => {
        switch (category) {
            case 'PRODUCT_RELEASE':
                return {
                    label: 'Product Release',
                    color: 'text-blue-400 bg-blue-500/10 border-blue-500/25',
                    icon: Layers,
                };
            case 'ENGINEERING_DISPATCH':
                return {
                    label: 'Engineering & Hardware',
                    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
                    icon: Cpu,
                };
            case 'PROTOCOL_NETWORK':
                return {
                    label: 'Protocol & Network',
                    color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/25',
                    icon: Radio,
                };
            case 'SECURITY_MAINTENANCE':
                return {
                    label: 'Security & Maintenance',
                    color: 'text-amber-400 bg-amber-500/10 border-amber-500/25',
                    icon: ShieldAlert,
                };
            case 'COMMUNITY_NEWS':
                return {
                    label: 'Community & Milestones',
                    color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/25',
                    icon: Users,
                };
            default:
                return {
                    label: 'Announcement',
                    color: 'text-zinc-300 bg-zinc-500/10 border-zinc-500/25',
                    icon: Radio,
                };
        }
    };

    const categoryConfig = getCategoryConfig(update.category);
    const CategoryIcon = categoryConfig.icon;

    const formattedDate = new Date(update.published_at || update.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });

    const handleShare = (e: React.MouseEvent) => {
        e.stopPropagation();
        const url = `${window.location.origin}/updates?selected=${update.slug || update.id}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <article
            onClick={() => onOpenDetail(update)}
            className={`group relative rounded-xl bg-surface-elevation-1 border transition-all duration-200 hover:border-brand-primary/40 hover:bg-surface-elevation-2 cursor-pointer ${
                update.is_pinned
                    ? 'border-brand-primary/40 shadow-lg shadow-brand-primary/5 ring-1 ring-brand-primary/20'
                    : 'border-border-default/80 shadow-sm'
            }`}
        >
            {/* Pinned Accent Ribbon */}
            {update.is_pinned && (
                <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-t-xl bg-brand-primary/10 border-b border-brand-primary/20 text-xs font-mono font-medium text-brand-light">
                    <Pin className="w-3 h-3 text-brand-light rotate-45" />
                    <span>Pinned Announcement</span>
                </div>
            )}

            <div className="p-5 md:p-6 space-y-4">
                {/* Meta Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${categoryConfig.color}`}>
                            <CategoryIcon className="w-3 h-3" />
                            {categoryConfig.label}
                        </span>

                        <span className="flex items-center gap-1 text-xs text-text-muted font-mono">
                            <Calendar className="w-3 h-3" />
                            {formattedDate}
                        </span>
                    </div>

                    {/* Quick actions (Share + Admin Edit/Delete) */}
                    <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                            type="button"
                            onClick={handleShare}
                            title="Copy link to dispatch"
                            className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-elevation-3 transition-colors cursor-pointer"
                        >
                            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                        </button>

                        {isAdmin && (
                            <>
                                {onEdit && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEdit(update);
                                        }}
                                        title="Edit update"
                                        className="p-1.5 rounded-md text-text-muted hover:text-brand-light hover:bg-surface-elevation-3 transition-colors cursor-pointer"
                                    >
                                        <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                                {onDelete && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDelete(update);
                                        }}
                                        title="Delete update"
                                        className="p-1.5 rounded-md text-text-muted hover:text-red-400 hover:bg-surface-elevation-3 transition-colors cursor-pointer"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Cover Image in Detailed View */}
                {viewMode === 'detailed' && update.cover_image && (
                    <div className="relative aspect-video max-h-72 w-full rounded-lg overflow-hidden border border-border-default/80 bg-surface-elevation-2">
                        <img
                            src={update.cover_image}
                            alt={update.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                        />
                    </div>
                )}

                {/* Title & Summary */}
                <div className="space-y-2">
                    <h2 className="text-lg md:text-xl font-bold tracking-tight text-text-primary group-hover:text-brand-light transition-colors">
                        {update.title}
                    </h2>

                    <p className="text-sm text-text-secondary leading-relaxed line-clamp-3">
                        {update.summary}
                    </p>
                </div>

                {/* Detailed View Inline Content & Attachments */}
                {viewMode === 'detailed' && (
                    <div className="space-y-4 pt-2 border-t border-border-default/60">
                        {/* Markdown / Full Content preview */}
                        {update.content && (
                            <div className="text-sm text-text-secondary whitespace-pre-line leading-relaxed font-sans bg-surface-elevation-2/50 p-4 rounded-lg border border-border-default/40">
                                {update.content}
                            </div>
                        )}

                        {/* Documents Section */}
                        {Array.isArray(update.documents) && update.documents.length > 0 && (
                            <div className="space-y-2">
                                <div className="text-[11px] font-mono uppercase tracking-wider text-text-muted">
                                    Attached Documents ({update.documents.length})
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {update.documents.map((doc: any, idx: number) => (
                                        <a
                                            key={idx}
                                            href={doc.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="flex items-center justify-between p-2.5 rounded-lg bg-surface-elevation-2 border border-border-default hover:border-brand-primary/40 text-xs transition-colors group/doc"
                                        >
                                            <div className="flex items-center gap-2 truncate">
                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-brand-primary/10 text-brand-light border border-brand-primary/20">
                                                    {doc.file_format || 'DOC'}
                                                </span>
                                                <span className="text-text-primary truncate font-medium">
                                                    {doc.name || 'Document Attachment'}
                                                </span>
                                            </div>
                                            <Download className="w-3.5 h-3.5 text-text-muted group-hover/doc:text-brand-light shrink-0 ml-2" />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* External Links Section */}
                        {Array.isArray(update.external_links) && update.external_links.length > 0 && (
                            <div className="space-y-2">
                                <div className="text-[11px] font-mono uppercase tracking-wider text-text-muted">
                                    External Resources ({update.external_links.length})
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {update.external_links.map((link: any, idx: number) => (
                                        <a
                                            key={idx}
                                            href={link.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-elevation-2 border border-border-default hover:border-brand-primary/40 text-xs text-brand-light hover:text-white transition-colors"
                                        >
                                            <span>{link.title || link.url}</span>
                                            <ExternalLink className="w-3 h-3 text-text-muted" />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Bottom Strip */}
                <div className="flex items-center justify-between pt-3 border-t border-border-default/60 text-xs text-text-muted">
                    {/* Author & telemetry */}
                    <div className="flex items-center gap-2">
                        {update.author?.profile_image ? (
                            <img
                                src={update.author.profile_image}
                                alt={update.author.full_name || update.author.username}
                                className="w-5 h-5 rounded-full object-cover border border-border-default"
                            />
                        ) : (
                            <div className="w-5 h-5 rounded-full bg-brand-primary/20 border border-brand-primary/30 flex items-center justify-center text-[10px] text-brand-light font-bold">
                                {(update.author?.username || 'A')[0].toUpperCase()}
                            </div>
                        )}
                        <span className="text-text-secondary font-medium">
                            {update.author?.full_name || update.author?.username || 'Core Team'}
                        </span>
                        {update.author?.is_staff && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-surface-elevation-3 text-brand-light border border-border-default">
                                Staff
                            </span>
                        )}
                    </div>

                    {/* Short mode quick stats & Read Details CTA */}
                    <div className="flex items-center gap-3">
                        {viewMode === 'short' && (
                            <>
                                {(update.documents_count > 0 || (Array.isArray(update.documents) && update.documents.length > 0)) && (
                                    <span className="inline-flex items-center gap-1 text-[11px] text-text-muted font-mono">
                                        <FileText className="w-3 h-3 text-text-muted" />
                                        {update.documents_count || update.documents.length}
                                    </span>
                                )}

                                {(update.links_count > 0 || (Array.isArray(update.external_links) && update.external_links.length > 0)) && (
                                    <span className="inline-flex items-center gap-1 text-[11px] text-text-muted font-mono">
                                        <ExternalLink className="w-3 h-3 text-text-muted" />
                                        {update.links_count || update.external_links.length}
                                    </span>
                                )}
                            </>
                        )}

                        <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-light group-hover:translate-x-0.5 transition-transform">
                            <span>Read dispatch</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                    </div>
                </div>
            </div>
        </article>
    );
}
