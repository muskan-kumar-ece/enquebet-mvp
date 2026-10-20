"use client";

import React, { useState } from 'react';
import {
    X,
    Download,
    ExternalLink,
    Clock,
    CheckCircle2,
    XCircle,
    Copy,
    Check,
    User,
    AlertTriangle,
} from 'lucide-react';
import { ResourceItem, getFileTypeBadgeStyle, formatBytes } from '@/lib/resourcesData';

interface ResourceDetailDrawerProps {
    resource: ResourceItem | null;
    isOpen: boolean;
    onClose: () => void;
    onDownload: (resource: ResourceItem) => void;
    onApprove?: (resource: ResourceItem) => void;
    onReject?: (resource: ResourceItem) => void;
    isAdmin?: boolean;
}

export function ResourceDetailDrawer({
    resource,
    isOpen,
    onClose,
    onDownload,
    onApprove,
    onReject,
    isAdmin,
}: ResourceDetailDrawerProps) {
    const [copied, setCopied] = useState(false);
    const [downloading, setDownloading] = useState(false);

    if (!isOpen || !resource) return null;

    const badgeStyle = getFileTypeBadgeStyle(resource.file_type);

    const handleCopy = () => {
        const url = typeof window !== 'undefined' ? `${window.location.origin}/resources?slug=${resource.slug}` : '';
        if (url) {
            navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleDownload = async () => {
        try {
            setDownloading(true);
            await onDownload(resource);
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="relative w-full max-w-xl h-full bg-[#0c0d15] border-l border-[#1b1e2c] shadow-2xl flex flex-col justify-between overflow-y-auto">
                {/* Header */}
                <div className="p-6 border-b border-[#1b1e2c]">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-mono font-semibold border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}
                            >
                                {badgeStyle.label}
                            </span>
                            <span className="text-xs font-mono text-zinc-400 bg-[#090a0f] px-2.5 py-0.5 rounded border border-[#1b1e2c]">
                                {resource.category_display || resource.category}
                            </span>
                            {resource.file_size_bytes ? (
                                <span className="text-xs font-mono text-zinc-400 bg-[#090a0f] px-2.5 py-0.5 rounded border border-[#1b1e2c]">
                                    {formatBytes(resource.file_size_bytes)}
                                </span>
                            ) : null}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleCopy}
                                title="Copy Resource Link"
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#1b1e2c] transition-colors"
                            >
                                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                            </button>
                            <button
                                onClick={onClose}
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#1b1e2c] transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Status Pill */}
                    <div className="mt-3">
                        {resource.status === 'PENDING_APPROVAL' && (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                <Clock className="w-3.5 h-3.5" />
                                Pending Admin Verification
                            </div>
                        )}
                        {resource.status === 'APPROVED' && (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Verified & Live in Public Catalog
                            </div>
                        )}
                        {resource.status === 'REJECTED' && (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono bg-rose-500/10 text-rose-400 border border-rose-500/30">
                                <XCircle className="w-3.5 h-3.5" />
                                Revision Requested
                            </div>
                        )}
                    </div>

                    {/* Title */}
                    <h2 className="mt-3 text-xl font-bold text-white tracking-tight leading-snug">
                        {resource.title}
                    </h2>
                </div>

                {/* Content Body */}
                <div className="p-6 space-y-6 flex-1">
                    {/* Rejection Alert */}
                    {resource.status === 'REJECTED' && resource.rejection_reason && (
                        <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/25 text-xs text-rose-300">
                            <div className="flex items-center gap-2 font-semibold text-rose-200 mb-1">
                                <AlertTriangle className="w-4 h-4 text-rose-400" />
                                Moderator Revision Notes:
                            </div>
                            <p className="leading-relaxed pl-6">{resource.rejection_reason}</p>
                        </div>
                    )}

                    {/* Technical Description */}
                    <div>
                        <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-2">
                            Technical Scope & Description
                        </h4>
                        <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line bg-[#090a0f] p-4 rounded-lg border border-[#1b1e2c]">
                            {resource.description}
                        </div>
                    </div>

                    {/* Metadata Grid */}
                    <div>
                        <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-2">
                            Asset Metadata
                        </h4>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="p-3 rounded-lg bg-[#090a0f] border border-[#1b1e2c]">
                                <span className="text-zinc-500 block mb-0.5">Original File</span>
                                <span className="font-mono text-zinc-200 truncate block">
                                    {resource.original_filename || resource.file_type}
                                </span>
                            </div>
                            <div className="p-3 rounded-lg bg-[#090a0f] border border-[#1b1e2c]">
                                <span className="text-zinc-500 block mb-0.5">Downloads / Views</span>
                                <span className="font-mono text-zinc-200 block">
                                    {resource.downloads_count} DLs · {resource.views_count} views
                                </span>
                            </div>
                            <div className="p-3 rounded-lg bg-[#090a0f] border border-[#1b1e2c]">
                                <span className="text-zinc-500 block mb-0.5">Submitted On</span>
                                <span className="font-mono text-zinc-200 block">
                                    {new Date(resource.created_at).toLocaleDateString()}
                                </span>
                            </div>
                            <div className="p-3 rounded-lg bg-[#090a0f] border border-[#1b1e2c]">
                                <span className="text-zinc-500 block mb-0.5">Format Standard</span>
                                <span className="font-mono text-zinc-200 block">
                                    {badgeStyle.label}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Tags */}
                    {resource.tags && resource.tags.length > 0 && (
                        <div>
                            <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-2">
                                Engineering Keywords
                            </h4>
                            <div className="flex flex-wrap gap-1.5">
                                {resource.tags.map((tag, idx) => (
                                    <span
                                        key={idx}
                                        className="text-xs font-mono px-2.5 py-1 rounded bg-[#13151f] text-zinc-300 border border-[#1b1e2c]"
                                    >
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Uploader Card */}
                    <div>
                        <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-2">
                            Contributor
                        </h4>
                        <div className="p-3.5 rounded-lg bg-[#090a0f] border border-[#1b1e2c] flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden flex items-center justify-center shrink-0">
                                {resource.uploader?.profile_image ? (
                                    <img
                                        src={resource.uploader.profile_image}
                                        alt={resource.uploader.username}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <User className="w-5 h-5 text-zinc-400" />
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-white truncate">
                                    {resource.uploader?.full_name || resource.uploader?.username}
                                </p>
                                <p className="text-xs text-zinc-400 truncate font-mono">
                                    @{resource.uploader?.username}
                                    {resource.uploader?.college ? ` · ${resource.uploader.college}` : ''}
                                </p>
                                {resource.uploader?.headline && (
                                    <p className="text-xs text-zinc-500 truncate mt-0.5">
                                        {resource.uploader.headline}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Action Bar */}
                <div className="p-6 border-t border-[#1b1e2c] bg-[#090a0f] flex items-center justify-between gap-3">
                    {/* Admin Moderation Controls */}
                    {isAdmin && resource.status === 'PENDING_APPROVAL' && onApprove && onReject ? (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => onApprove(resource)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-black transition-colors"
                            >
                                <Check className="w-4 h-4" />
                                Approve Asset
                            </button>
                            <button
                                onClick={() => onReject(resource)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-colors"
                            >
                                <X className="w-4 h-4" />
                                Reject
                            </button>
                        </div>
                    ) : (
                        <div className="text-xs font-mono text-zinc-500">
                            Verified ENQUEbet Asset
                        </div>
                    )}

                    {/* Download / Open Link */}
                    {resource.file_type === 'LINK' ? (
                        <button
                            onClick={handleDownload}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-black transition-colors shadow-sm"
                        >
                            <ExternalLink className="w-4 h-4" />
                            Open Resource Link
                        </button>
                    ) : (
                        <button
                            onClick={handleDownload}
                            disabled={downloading}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white transition-colors shadow-sm disabled:opacity-50"
                        >
                            <Download className="w-4 h-4" />
                            {downloading ? 'Downloading...' : 'Download Resource'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
