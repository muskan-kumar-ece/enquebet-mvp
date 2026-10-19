"use client";

import { useState } from 'react';
import { RefreshCw, AlertTriangle, CheckCircle, ExternalLink, ArrowRight, ShieldAlert, BookOpen, Layers } from 'lucide-react';

interface TechnologyLifecycleRadarProps {
    items: any[];
    loading: boolean;
    onOpenDetail: (update: any) => void;
}

export function TechnologyLifecycleRadar({
    items,
    loading,
    onOpenDetail,
}: TechnologyLifecycleRadarProps) {
    const [statusFilter, setStatusFilter] = useState<string>('all');

    const filteredItems = items.filter((item) => {
        if (statusFilter === 'all') return true;
        const s = item.lifecycle_meta?.status;
        return s === statusFilter;
    });

    const getStatusBadge = (status?: string) => {
        switch (status) {
            case 'end_of_life':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-rose-500/15 border border-rose-500/30 text-rose-400">
                        <AlertTriangle className="w-3 h-3" />
                        End of Life (EOL)
                    </span>
                );
            case 'deprecated':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-400">
                        <ShieldAlert className="w-3 h-3" />
                        Deprecated
                    </span>
                );
            case 'migration_recommended':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-blue-500/15 border border-blue-500/30 text-[#60a5fa]">
                        <RefreshCw className="w-3 h-3" />
                        Migration Recommended
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                        <CheckCircle className="w-3 h-3" />
                        Active Lifecycle
                    </span>
                );
        }
    };

    return (
        <div className="space-y-6">
            {/* Header introduction */}
            <div className="bg-[#0d1017] border border-[#1e2335] rounded-2xl p-5 space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono text-orange-400">
                    <RefreshCw className="w-4 h-4 animate-spin-slow" />
                    <span>TECHNOLOGY LIFECYCLE TRACKER</span>
                </div>
                <h2 className="text-xl font-bold text-white font-mono">
                    Software Releases, Deprecations & Migration Protocols
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-3xl">
                    Never let legacy dependencies break your production deployments or university projects. Track official framework timelines, security deprecations, and verified migration guides.
                </p>

                {/* Status Filter Buttons */}
                <div className="flex items-center gap-2 pt-3 flex-wrap">
                    {[
                        { id: 'all', label: 'All Lifecycle Events' },
                        { id: 'end_of_life', label: 'End of Life (EOL)' },
                        { id: 'deprecated', label: 'Deprecated' },
                        { id: 'migration_recommended', label: 'Migration Recommended' },
                    ].map((f) => (
                        <button
                            key={f.id}
                            onClick={() => setStatusFilter(f.id)}
                            className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                                statusFilter === f.id
                                    ? 'bg-[#1864ff] text-white font-medium'
                                    : 'bg-[#141824] hover:bg-[#1b2233] text-zinc-400 border border-[#1e2335]'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Lifecycle Radar Table / Cards */}
            {loading ? (
                <div className="p-12 text-center text-zinc-500 text-xs font-mono animate-pulse">
                    Scanning technology lifecycle radar...
                </div>
            ) : filteredItems.length === 0 ? (
                <div className="p-12 text-center bg-[#0d1017] border border-[#1e2335] rounded-2xl text-zinc-400 text-xs font-mono">
                    No lifecycle events found matching this filter.
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredItems.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => onOpenDetail(item)}
                            className="group bg-[#0d1017] hover:bg-[#10141f] border border-[#1e2335] hover:border-[#2b3552] rounded-2xl p-4 sm:p-5 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                            <div className="space-y-2 max-w-2xl">
                                <div className="flex items-center gap-2 flex-wrap">
                                    {getStatusBadge(item.lifecycle_meta?.status)}
                                    <span className="text-zinc-500 text-xs font-mono">·</span>
                                    <span className="text-zinc-400 text-xs font-mono">
                                        Published {new Date(item.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                </div>

                                <h3 className="text-base font-bold text-white group-hover:text-[#60a5fa] transition-colors leading-snug">
                                    {item.title}
                                </h3>

                                <p className="text-xs text-zinc-400 line-clamp-2">
                                    {item.summary}
                                </p>

                                {/* Version transition indicator */}
                                {item.lifecycle_meta?.affected_version && (
                                    <div className="flex items-center gap-2 text-xs font-mono pt-1 text-zinc-300">
                                        <span className="px-2 py-0.5 rounded bg-zinc-800 text-rose-300">
                                            {item.lifecycle_meta.affected_version}
                                        </span>
                                        <span>→</span>
                                        <span className="px-2 py-0.5 rounded bg-[#1864ff]/20 text-[#60a5fa] border border-[#1864ff]/30 font-semibold">
                                            Target: {item.lifecycle_meta.recommended_version || 'Latest LTS'}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Right action */}
                            <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                                {item.lifecycle_meta?.migration_url && (
                                    <a
                                        href={item.lifecycle_meta.migration_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141824] hover:bg-[#1b2233] text-zinc-300 hover:text-white text-xs font-mono border border-[#1e2335] transition-colors"
                                    >
                                        <span>Migration Guide</span>
                                        <ExternalLink className="w-3 h-3 text-[#4f8fff]" />
                                    </a>
                                )}
                                <button
                                    onClick={() => onOpenDetail(item)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#1864ff] hover:bg-[#1864ff]/90 text-white text-xs font-mono transition-colors"
                                >
                                    <span>Advisory</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
