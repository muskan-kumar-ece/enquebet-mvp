"use client";

import React from 'react';
import {
    Filter,
    X,
    SlidersHorizontal,
    Layers,
    Users,
    Briefcase,
    ShieldCheck,
    Check,
} from 'lucide-react';

export type SearchTab = 'all' | 'builders' | 'projects';

export interface SearchFiltersState {
    category: string;
    location: string;
    college: string;
    skills: string;
    role: string;
    availability: string;
    verified_only: boolean;
    sort_by: string;
}

interface SearchFacetBarProps {
    activeTab: SearchTab;
    onTabChange: (tab: SearchTab) => void;
    filters: SearchFiltersState;
    onFiltersChange: (filters: SearchFiltersState) => void;
    onClearFilters: () => void;
    totalBuilders?: number;
    totalProjects?: number;
    showFilters: boolean;
    onToggleShowFilters: () => void;
}

const CATEGORIES = [
    'all',
    'AI / ML',
    'Web Development',
    'Mobile Apps',
    'FinTech',
    'EdTech',
    'Hardware / IoT',
    'Blockchain',
    'Design',
];

const AVAILABILITY_OPTIONS = [
    { value: '', label: 'Any Status' },
    { value: 'open_to_cofound', label: 'Open to Co-found' },
    { value: 'open_to_collaborate', label: 'Open to Collaborate' },
    { value: 'hiring', label: 'Hiring Builders' },
    { value: 'open_to_work', label: 'Open to Work' },
];

export function SearchFacetBar({
    activeTab,
    onTabChange,
    filters,
    onFiltersChange,
    onClearFilters,
    totalBuilders,
    totalProjects,
    showFilters,
    onToggleShowFilters,
}: SearchFacetBarProps) {
    const activeFilterCount = [
        filters.category !== 'all',
        Boolean(filters.location.trim()),
        Boolean(filters.college.trim()),
        Boolean(filters.skills.trim()),
        Boolean(filters.role.trim()),
        Boolean(filters.availability),
        filters.verified_only,
        filters.sort_by !== 'reputation',
    ].filter(Boolean).length;

    const handleFilterChange = (key: keyof SearchFiltersState, value: any) => {
        onFiltersChange({ ...filters, [key]: value });
    };

    return (
        <div className="space-y-4">
            {/* Top Bar: Tabs + Filter Toggle */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Tabs */}
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#0b0d14] border border-[#1e2335]">
                    <button
                        onClick={() => onTabChange('all')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                            activeTab === 'all'
                                ? 'bg-brand text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]'
                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
                        }`}
                    >
                        <Layers className="w-3.5 h-3.5" />
                        <span>All</span>
                    </button>

                    <button
                        onClick={() => onTabChange('builders')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                            activeTab === 'builders'
                                ? 'bg-brand text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]'
                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
                        }`}
                    >
                        <Users className="w-3.5 h-3.5" />
                        <span>Builders</span>
                        {totalBuilders !== undefined && totalBuilders > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full bg-black/40 border border-white/10 text-white text-[10px] font-mono">
                                {totalBuilders}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => onTabChange('projects')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                            activeTab === 'projects'
                                ? 'bg-brand text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]'
                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
                        }`}
                    >
                        <Briefcase className="w-3.5 h-3.5" />
                        <span>Projects</span>
                        {totalProjects !== undefined && totalProjects > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full bg-black/40 border border-white/10 text-white text-[10px] font-mono">
                                {totalProjects}
                            </span>
                        )}
                    </button>
                </div>

                {/* Filter Toggle and Active Badges */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={onToggleShowFilters}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-xs font-semibold transition-all ${
                            showFilters || activeFilterCount > 0
                                ? 'bg-brand/15 border-brand/40 text-brand-light'
                                : 'bg-[#0f111a] border-[#1e2335] text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                        }`}
                    >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        <span>Filters</span>
                        {activeFilterCount > 0 && (
                            <span className="w-5 h-5 rounded-full bg-brand text-white text-[10px] flex items-center justify-center font-bold">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>

                    {activeFilterCount > 0 && (
                        <button
                            onClick={onClearFilters}
                            className="px-3 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-red-400 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-colors"
                        >
                            Reset
                        </button>
                    )}
                </div>
            </div>

            {/* Expandable Filter Drawer */}
            {showFilters && (
                <div className="p-4 sm:p-5 rounded-xl bg-[#0f111a] border border-[#1e2335] shadow-lg space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {/* Category */}
                        <div>
                            <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                                Category
                            </label>
                            <select
                                value={filters.category}
                                onChange={(e) => handleFilterChange('category', e.target.value)}
                                className="w-full bg-[#0b0d14] border border-[#1e2335] text-xs text-white rounded-lg px-3 py-2 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                            >
                                {CATEGORIES.map((cat) => (
                                    <option key={cat} value={cat}>
                                        {cat === 'all' ? 'All Categories' : cat}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Availability Status (Builders) */}
                        <div>
                            <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                                Availability
                            </label>
                            <select
                                value={filters.availability}
                                onChange={(e) => handleFilterChange('availability', e.target.value)}
                                className="w-full bg-[#0b0d14] border border-[#1e2335] text-xs text-white rounded-lg px-3 py-2 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                            >
                                {AVAILABILITY_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* College Filter */}
                        <div>
                            <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                                College / University
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Stanford, MIT, IIT..."
                                value={filters.college}
                                onChange={(e) => handleFilterChange('college', e.target.value)}
                                className="w-full bg-[#0b0d14] border border-[#1e2335] text-xs text-white placeholder-zinc-500 rounded-lg px-3 py-2 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                            />
                        </div>

                        {/* Location Filter */}
                        <div>
                            <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                                City / Location
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. San Francisco, Remote..."
                                value={filters.location}
                                onChange={(e) => handleFilterChange('location', e.target.value)}
                                className="w-full bg-[#0b0d14] border border-[#1e2335] text-xs text-white placeholder-zinc-500 rounded-lg px-3 py-2 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                            />
                        </div>

                        {/* Specific Skills */}
                        <div>
                            <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                                Skills (comma-separated)
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Rust, PyTorch, React..."
                                value={filters.skills}
                                onChange={(e) => handleFilterChange('skills', e.target.value)}
                                className="w-full bg-[#0b0d14] border border-[#1e2335] text-xs text-white placeholder-zinc-500 rounded-lg px-3 py-2 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                            />
                        </div>

                        {/* Required Role (Projects) */}
                        <div>
                            <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                                Looking for Role
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Backend Lead, Designer..."
                                value={filters.role}
                                onChange={(e) => handleFilterChange('role', e.target.value)}
                                className="w-full bg-[#0b0d14] border border-[#1e2335] text-xs text-white placeholder-zinc-500 rounded-lg px-3 py-2 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                            />
                        </div>

                        {/* Sort Order */}
                        <div>
                            <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                                Sort Order
                            </label>
                            <select
                                value={filters.sort_by}
                                onChange={(e) => handleFilterChange('sort_by', e.target.value)}
                                className="w-full bg-[#0b0d14] border border-[#1e2335] text-xs text-white rounded-lg px-3 py-2 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                            >
                                <option value="reputation">Highest Reputation</option>
                                <option value="newest">Newest Builders</option>
                            </select>
                        </div>

                        {/* Verified Builders Only Toggle */}
                        <div className="flex items-end pb-1">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={filters.verified_only}
                                    onChange={(e) => handleFilterChange('verified_only', e.target.checked)}
                                    className="rounded border-zinc-700 bg-surface accent-brand text-brand focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer"
                                />
                                <span className="text-xs text-zinc-300 font-medium flex items-center gap-1.5">
                                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                    Verified Builders Only
                                </span>
                            </label>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
