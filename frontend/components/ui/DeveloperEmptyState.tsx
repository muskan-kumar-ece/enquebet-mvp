"use client";

import React from 'react';
import Link from 'next/link';
import { Terminal, Plus, FolderSearch, ArrowRight } from 'lucide-react';

interface DeveloperEmptyStateProps {
    title?: string;
    description?: string;
    commandHint?: string;
    actionLabel?: string;
    actionHref?: string;
    onAction?: () => void;
    compact?: boolean;
    className?: string;
}

export default function DeveloperEmptyState({
    title = 'Query Manifest Returned 0 Records',
    description = 'No matching datasets, files, or entries were found matching the specified parameters.',
    commandHint = 'SELECT * FROM records WHERE active = true',
    actionLabel,
    actionHref,
    onAction,
    compact = false,
    className = ''
}: DeveloperEmptyStateProps) {
    if (compact) {
        return (
            <div className={`p-4 rounded-xl bg-[#0d1017] border border-[#1e2230] text-xs font-mono text-center space-y-2 ${className}`}>
                <p className="text-zinc-400">{title}</p>
                {commandHint && (
                    <div className="text-[11px] text-zinc-500 bg-[#050608] px-2 py-1 rounded inline-block">
                        $ {commandHint}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className={`rounded-2xl bg-[#0d1017] border border-[#1e2230] p-8 text-center font-mono shadow-sm ${className}`}>
            <div className="w-12 h-12 rounded-xl bg-[#141824] border border-[#23283a] flex items-center justify-center text-zinc-400 mx-auto mb-3">
                <FolderSearch className="w-6 h-6 text-[#4f8fff]" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-[#1864ff]/10 text-[#4f8fff] border border-[#1864ff]/20 mb-2">
                <span>QUERY: ZERO_RESULTS</span>
            </div>

            <h3 className="text-sm font-bold text-white mb-1.5">
                {title}
            </h3>

            <p className="text-xs text-zinc-400 font-sans max-w-md mx-auto mb-4 leading-relaxed">
                {description}
            </p>

            {commandHint && (
                <div className="bg-[#050608] border border-[#1b2030] rounded-xl px-3 py-2 text-[11px] text-zinc-400 max-w-sm mx-auto mb-5 truncate font-mono">
                    <span className="text-emerald-400">$ </span>
                    <span>{commandHint}</span>
                </div>
            )}

            {(actionLabel && (actionHref || onAction)) && (
                actionHref ? (
                    <Link
                        href={actionHref}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold btn-brand shadow-sm"
                    >
                        <span>{actionLabel}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                ) : (
                    <button
                        type="button"
                        onClick={onAction}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold btn-brand shadow-sm"
                    >
                        <span>{actionLabel}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                )
            )}
        </div>
    );
}
