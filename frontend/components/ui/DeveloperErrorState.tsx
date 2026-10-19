"use client";

import React from 'react';
import { AlertCircle, RefreshCw, Terminal } from 'lucide-react';

interface DeveloperErrorStateProps {
    title?: string;
    message?: string;
    errorCode?: string;
    onRetry?: () => void;
    compact?: boolean;
    className?: string;
}

export default function DeveloperErrorState({
    title = 'Execution Pipeline Fault',
    message = 'Failed to resolve remote API endpoint or query payload.',
    errorCode = 'ERR_REMOTE_FETCH_FAILED',
    onRetry,
    compact = false,
    className = ''
}: DeveloperErrorStateProps) {
    if (compact) {
        return (
            <div className={`p-3 rounded-xl bg-[#0d1017] border border-rose-500/20 text-xs font-mono flex items-center justify-between gap-3 ${className}`}>
                <div className="flex items-center gap-2 text-rose-400 min-w-0">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span className="truncate">{title}: {message}</span>
                </div>
                {onRetry && (
                    <button
                        type="button"
                        onClick={onRetry}
                        className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:bg-rose-500/20 transition-colors text-[11px] font-semibold shrink-0"
                    >
                        Retry
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className={`rounded-2xl bg-[#0d1017] border border-[#1e2230] p-6 text-center font-mono shadow-md ${className}`}>
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mx-auto mb-3">
                <AlertCircle className="w-6 h-6" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 mb-2">
                <span>STATUS: {errorCode}</span>
            </div>

            <h3 className="text-sm font-bold text-white mb-1">
                {title}
            </h3>

            <p className="text-xs text-zinc-400 font-sans max-w-md mx-auto mb-5 leading-relaxed">
                {message}
            </p>

            {onRetry && (
                <button
                    type="button"
                    onClick={onRetry}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[#161a26] border border-[#272d40] text-zinc-200 hover:text-white hover:border-[#1864ff] hover:bg-[#1864ff]/10 transition-all shadow-sm"
                >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>$ system.retry()</span>
                </button>
            )}
        </div>
    );
}
