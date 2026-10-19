"use client";

import React from 'react';
import { Search, Plus, ShieldAlert, BookOpen, Download, UserCheck } from 'lucide-react';

interface ResourceHeaderProps {
    searchQuery: string;
    onSearchChange: (q: string) => void;
    onOpenUpload: () => void;
    stats: {
        total_resources: number;
        total_downloads: number;
        pending_count: number;
        my_submissions_count: number;
    };
    isAdmin: boolean;
    isAuthenticated: boolean;
}

export function ResourceHeader({
    searchQuery,
    onSearchChange,
    onOpenUpload,
    stats,
    isAdmin,
    isAuthenticated,
}: ResourceHeaderProps) {
    return (
        <div className="relative border-b border-[#1b1e2c] bg-[#090a0f] pt-8 pb-7">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Top Badge & Telemetry Bar */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            <BookOpen className="w-3.5 h-3.5" />
                            Technical Knowledge Base
                        </span>
                        <span className="text-xs text-zinc-500 font-mono hidden sm:inline-block">
                            Verified Books · System Specs · Code Starters · Slides
                        </span>
                    </div>

                    {/* Stats telemetry */}
                    <div className="flex items-center gap-3 text-xs font-mono">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0f111a] border border-[#1b1e2c] text-zinc-300">
                            <span className="text-zinc-500">Assets:</span>
                            <span className="font-semibold text-white">{stats.total_resources}</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0f111a] border border-[#1b1e2c] text-zinc-300">
                            <Download className="w-3 h-3 text-emerald-400" />
                            <span className="text-zinc-500">Downloads:</span>
                            <span className="font-semibold text-white">{stats.total_downloads}</span>
                        </div>
                        {isAuthenticated && stats.my_submissions_count > 0 && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0f111a] border border-[#1b1e2c] text-zinc-300">
                                <UserCheck className="w-3 h-3 text-blue-400" />
                                <span className="text-zinc-500">My Uploads:</span>
                                <span className="font-semibold text-blue-400">{stats.my_submissions_count}</span>
                            </div>
                        )}
                        {isAdmin && stats.pending_count > 0 && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/25 text-amber-300 animate-pulse">
                                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                                <span>{stats.pending_count} Pending Review</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Heading & Actions */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
                            Engineering Resources
                        </h1>
                        <p className="mt-1.5 text-sm text-zinc-400 max-w-2xl font-normal leading-relaxed">
                            Access and contribute peer-audited engineering books, Word documents, system design architectures,
                            lecture slides, and production-grade starter kits. Submissions undergo technical moderation before public catalog inclusion.
                        </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-3 shrink-0">
                        <button
                            onClick={onOpenUpload}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold tracking-wide text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        >
                            <Plus className="w-4 h-4" />
                            Upload Resource
                        </button>
                    </div>
                </div>

                {/* Quick Search Bar */}
                <div className="mt-6 relative">
                    <div className="relative">
                        <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                            placeholder="Search by book title, system design topic, author, or keyword (e.g. Distributed, FreeRTOS, ZK-SNARKs)..."
                            className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#0c0d15] border border-[#1b1e2c] focus:border-blue-500/60 rounded-lg text-white placeholder-zinc-500 focus:outline-none transition-colors"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => onSearchChange('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-500 hover:text-white"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
