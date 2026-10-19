'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
    Search,
    X,
    Cpu,
    ShieldCheck,
    Code,
    Users,
    ChevronDown,
    Layers,
    Check,
    Filter,
} from 'lucide-react';
import { RESEARCH_FIELDS } from '@/lib/researchData';

interface ResearchFilterTabsProps {
    activeField: string;
    onSelectField: (field: string) => void;
    searchQuery: string;
    onSearchChange: (q: string) => void;
    filterHasCode: boolean;
    onToggleHasCode: () => void;
    filterHasBOM: boolean;
    onToggleHasBOM: () => void;
    filterReproduced: boolean;
    onToggleReproduced: () => void;
    filterOpenCalls: boolean;
    onToggleOpenCalls: () => void;
}

export default function ResearchFilterTabs({
    activeField,
    onSelectField,
    searchQuery,
    onSearchChange,
    filterHasCode,
    onToggleHasCode,
    filterHasBOM,
    onToggleHasBOM,
    filterReproduced,
    onToggleReproduced,
    filterOpenCalls,
    onToggleOpenCalls,
}: ResearchFilterTabsProps) {
    const [isDisciplineOpen, setIsDisciplineOpen] = useState(false);
    const disciplineRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (disciplineRef.current && !disciplineRef.current.contains(e.target as Node)) {
                setIsDisciplineOpen(false);
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsDisciplineOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const selectedDiscipline = RESEARCH_FIELDS.find((f) => f.id === activeField) || RESEARCH_FIELDS[0];
    const hasActiveFilters = activeField !== 'ALL' || filterHasBOM || filterHasCode || filterReproduced || filterOpenCalls;

    return (
        <div className="space-y-3 mb-6">
            {/* Unified Control Toolbar: Search + Discipline Dropdown + Quick Feature Chips */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
                {/* Search Omnibox */}
                <div className="relative flex-1">
                    <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Search preprints, hypotheses, methodology, authors, or paper code..."
                        className="w-full pl-10 pr-9 py-2 rounded-xl border border-[#1b1e2c] bg-[#0c0d15] text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#1864ff] transition shadow-inner"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => onSearchChange('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-0.5"
                            aria-label="Clear search query"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {/* Right controls: Discipline Dropdown + Feature Chips */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 no-scrollbar">
                    {/* Scientific Discipline Dropdown */}
                    <div className="relative shrink-0" ref={disciplineRef}>
                        <button
                            type="button"
                            onClick={() => setIsDisciplineOpen(!isDisciplineOpen)}
                            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                                activeField !== 'ALL'
                                    ? 'bg-[#1864ff]/15 text-blue-300 border-[#1864ff]/40'
                                    : 'bg-[#0c0d15] text-zinc-300 border-[#1b1e2c] hover:border-[#2a2f45]'
                            }`}
                        >
                            <Layers className="w-3.5 h-3.5 text-zinc-400" />
                            <span className="text-zinc-500">Discipline:</span>
                            <span className="font-semibold text-white max-w-[140px] truncate">
                                {selectedDiscipline.label}
                            </span>
                            <ChevronDown
                                className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${
                                    isDisciplineOpen ? 'rotate-180' : ''
                                }`}
                            />
                        </button>

                        {isDisciplineOpen && (
                            <div className="absolute right-0 mt-1.5 w-72 rounded-xl bg-[#0e1018] border border-[#1b1e2c] shadow-2xl p-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                                <div className="px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-zinc-500 border-b border-[#1b1e2c] mb-1">
                                    Scientific Discipline
                                </div>
                                <div className="max-h-64 overflow-y-auto space-y-0.5">
                                    {RESEARCH_FIELDS.map((field) => {
                                        const isSelected = activeField === field.id;
                                        return (
                                            <button
                                                key={field.id}
                                                type="button"
                                                onClick={() => {
                                                    onSelectField(field.id);
                                                    setIsDisciplineOpen(false);
                                                }}
                                                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                                                    isSelected
                                                        ? 'bg-blue-600/20 text-blue-300 font-semibold'
                                                        : 'text-zinc-300 hover:bg-[#181a26] hover:text-white'
                                                }`}
                                            >
                                                <span className="truncate">{field.label}</span>
                                                {isSelected && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0 ml-2" />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Quick Feature Chips */}
                    <button
                        onClick={onToggleHasBOM}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition border ${
                            filterHasBOM
                                ? 'bg-[#1864ff]/15 text-blue-300 border-[#1864ff]/40'
                                : 'bg-white/[0.02] text-zinc-400 border-[#1b1e2c] hover:bg-white/[0.04] hover:text-zinc-200'
                        }`}
                    >
                        <Cpu className={`w-3.5 h-3.5 ${filterHasBOM ? 'text-blue-400' : 'text-zinc-500'}`} />
                        <span>Hardware BOM</span>
                    </button>

                    <button
                        onClick={onToggleHasCode}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition border ${
                            filterHasCode
                                ? 'bg-[#1864ff]/15 text-blue-300 border-[#1864ff]/40'
                                : 'bg-white/[0.02] text-zinc-400 border-[#1b1e2c] hover:bg-white/[0.04] hover:text-zinc-200'
                        }`}
                    >
                        <Code className={`w-3.5 h-3.5 ${filterHasCode ? 'text-blue-400' : 'text-zinc-500'}`} />
                        <span>Live Code</span>
                    </button>

                    <button
                        onClick={onToggleReproduced}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition border ${
                            filterReproduced
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                : 'bg-white/[0.02] text-zinc-400 border-[#1b1e2c] hover:bg-white/[0.04] hover:text-zinc-200'
                        }`}
                    >
                        <ShieldCheck className={`w-3.5 h-3.5 ${filterReproduced ? 'text-emerald-400' : 'text-zinc-500'}`} />
                        <span>Reproduced</span>
                    </button>

                    <button
                        onClick={onToggleOpenCalls}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition border ${
                            filterOpenCalls
                                ? 'bg-[#1864ff]/15 text-blue-300 border-[#1864ff]/40'
                                : 'bg-white/[0.02] text-zinc-400 border-[#1b1e2c] hover:bg-white/[0.04] hover:text-zinc-200'
                        }`}
                    >
                        <Users className={`w-3.5 h-3.5 ${filterOpenCalls ? 'text-blue-400' : 'text-zinc-500'}`} />
                        <span>Seeking Peers</span>
                    </button>
                </div>
            </div>

            {/* Active Filters Summary Bar */}
            {hasActiveFilters && (
                <div className="flex items-center gap-2 text-xs pt-1">
                    <span className="text-zinc-500 font-mono text-[11px] flex items-center gap-1">
                        <Filter className="w-3 h-3" />
                        Active Filters:
                    </span>

                    {activeField !== 'ALL' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs bg-blue-500/10 text-blue-300 border border-blue-500/25">
                            <span>{selectedDiscipline.label}</span>
                            <button
                                onClick={() => onSelectField('ALL')}
                                className="hover:text-white"
                                title="Reset discipline"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    )}

                    {filterHasBOM && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-blue-500/10 text-blue-300 border border-blue-500/25">
                            <span>Hardware BOM</span>
                            <button onClick={onToggleHasBOM} className="hover:text-white">
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    )}

                    {filterHasCode && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-blue-500/10 text-blue-300 border border-blue-500/25">
                            <span>Live Code</span>
                            <button onClick={onToggleHasCode} className="hover:text-white">
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    )}

                    {filterReproduced && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/25">
                            <span>Reproduced</span>
                            <button onClick={onToggleReproduced} className="hover:text-white">
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    )}

                    {filterOpenCalls && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-blue-500/10 text-blue-300 border border-blue-500/25">
                            <span>Seeking Peers</span>
                            <button onClick={onToggleOpenCalls} className="hover:text-white">
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    )}

                    <button
                        onClick={() => {
                            onSelectField('ALL');
                            if (filterHasBOM) onToggleHasBOM();
                            if (filterHasCode) onToggleHasCode();
                            if (filterReproduced) onToggleReproduced();
                            if (filterOpenCalls) onToggleOpenCalls();
                        }}
                        className="text-[11px] font-mono text-zinc-500 hover:text-zinc-300 ml-1 underline decoration-zinc-700"
                    >
                        Clear all
                    </button>
                </div>
            )}
        </div>
    );
}
