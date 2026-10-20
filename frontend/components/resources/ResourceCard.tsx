"use client";

import React, { useState } from 'react';
import {
    Download,
    ExternalLink,
    Clock,
    CheckCircle2,
    XCircle,
    Check,
    X,
    User as UserIcon,
    AlertTriangle,
} from 'lucide-react';
import { ResourceItem, getFileTypeBadgeStyle, formatBytes } from '@/lib/resourcesData';

interface ResourceCardProps {
    resource: ResourceItem;
    onDownload: (resource: ResourceItem) => void;
    onViewDetail: (resource: ResourceItem) => void;
    onApprove?: (resource: ResourceItem) => void;
    onReject?: (resource: ResourceItem) => void;
    isAdmin?: boolean;
    isModerationQueue?: boolean;
}

export function ResourceCard({
    resource,
    onDownload,
    onViewDetail,
    onApprove,
    onReject,
    isAdmin,
    isModerationQueue,
}: ResourceCardProps) {
    const [downloading, setDownloading] = useState(false);
    const badgeStyle = getFileTypeBadgeStyle(resource.file_type);

    const handleDownloadClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            setDownloading(true);
            await onDownload(resource);
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div
            onClick={() => onViewDetail(resource)}
            className="group relative flex flex-col justify-between rounded-xl border border-[#1b1e2c] bg-[#0c0d15] p-5 hover:border-[#2f3552] transition-all duration-150 cursor-pointer shadow-xs hover:shadow-md"
        >
            <div>
                {/* Header: File Type Badge, Category, File Size & Status */}
                <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}
                        >
                            {badgeStyle.label}
                        </span>

                        {resource.file_size_bytes ? (
                            <span className="text-[11px] font-mono text-zinc-500 bg-[#090a0f] px-2 py-0.5 rounded border border-[#1b1e2c]">
                                {formatBytes(resource.file_size_bytes)}
                            </span>
                        ) : null}

                        <span className="text-[11px] font-mono text-zinc-400 bg-[#090a0f] px-2 py-0.5 rounded border border-[#1b1e2c] hidden sm:inline-block">
                            {resource.category_display || resource.category}
                        </span>
                    </div>

                    {/* Status badge */}
                    {resource.status === 'PENDING_APPROVAL' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/25 shrink-0">
                            <Clock className="w-3 h-3" />
                            Pending Review
                        </span>
                    )}
                    {resource.status === 'APPROVED' && isModerationQueue && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 shrink-0">
                            <CheckCircle2 className="w-3 h-3" />
                            Approved
                        </span>
                    )}
                    {resource.status === 'REJECTED' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-rose-500/10 text-rose-400 border border-rose-500/25 shrink-0">
                            <XCircle className="w-3 h-3" />
                            Rejected
                        </span>
                    )}
                </div>

                {/* Title */}
                <h3 className="text-base font-semibold text-white group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
                    {resource.title}
                </h3>

                {/* Description Snippet */}
                <p className="mt-2 text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                    {resource.description}
                </p>

                {/* Rejection notice if present */}
                {resource.status === 'REJECTED' && resource.rejection_reason && (
                    <div className="mt-2.5 p-2 rounded bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-300 flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                        <div>
                            <span className="font-semibold text-rose-200">Moderator Feedback: </span>
                            {resource.rejection_reason}
                        </div>
                    </div>
                )}

                {/* Tags */}
                {resource.tags && resource.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                        {resource.tags.slice(0, 4).map((tag, idx) => (
                            <span
                                key={idx}
                                className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#13151f] text-zinc-400 border border-[#1b1e2c]"
                            >
                                #{tag}
                            </span>
                        ))}
                        {resource.tags.length > 4 && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#13151f] text-zinc-500">
                                +{resource.tags.length - 4}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Footer: Uploader info & action buttons */}
            <div className="mt-5 pt-3 border-t border-[#1b1e2c]/80 flex items-center justify-between gap-3">
                {/* Uploader Profile */}
                <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden flex items-center justify-center shrink-0">
                        {resource.uploader?.profile_image ? (
                            <img
                                src={resource.uploader.profile_image}
                                alt={resource.uploader.username}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <UserIcon className="w-3.5 h-3.5 text-zinc-400" />
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-medium text-zinc-300 truncate">
                            {resource.uploader?.full_name || resource.uploader?.username}
                        </p>
                        <p className="text-[10px] text-zinc-500 truncate font-mono">
                            {resource.uploader?.college || `@${resource.uploader?.username}`}
                        </p>
                    </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2 shrink-0">
                    {/* Moderation Controls (if in moderation queue or admin on pending item) */}
                    {isAdmin && resource.status === 'PENDING_APPROVAL' && onApprove && onReject && (
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <button
                                onClick={() => onApprove(resource)}
                                title="Approve & Publish to Catalog"
                                className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-black transition-colors"
                            >
                                <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => onReject(resource)}
                                title="Reject with Feedback"
                                className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500 hover:text-white transition-colors"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}

                    {/* Download or External Link Button */}
                    {resource.file_type === 'LINK' ? (
                        <button
                            onClick={handleDownloadClick}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#131622] hover:bg-[#1c2033] border border-[#23273c] text-zinc-200 transition-colors"
                        >
                            <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Open</span>
                        </button>
                    ) : (
                        <button
                            onClick={handleDownloadClick}
                            disabled={downloading}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 text-blue-300 transition-colors"
                        >
                            <Download className="w-3.5 h-3.5 text-blue-400" />
                            <span>{downloading ? 'Fetching...' : 'Download'}</span>
                            <span className="text-[10px] font-mono text-blue-400/70 border-l border-blue-500/20 pl-1.5 ml-0.5">
                                {resource.downloads_count || 0}
                            </span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
