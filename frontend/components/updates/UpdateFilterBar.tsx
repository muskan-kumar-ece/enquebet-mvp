"use client";

import { useState, useRef, useEffect } from 'react';
import { 
    Search, 
    X, 
    ChevronDown, 
    Check, 
    ListFilter, 
    LayoutList, 
    FileText 
} from 'lucide-react';

export type ViewMode = 'short' | 'detailed';

export interface CategoryOption {
    value: string;
    label: string;
}

export const UPDATE_CATEGORIES: CategoryOption[] = [
    { value: 'all', label: 'All Categories' },
    { value: 'PRODUCT_RELEASE', label: 'Product Releases' },
    { value: 'ENGINEERING_DISPATCH', label: 'Engineering & Hardware' },
    { value: 'PROTOCOL_NETWORK', label: 'Protocol & Network' },
    { value: 'COMMUNITY_NEWS', label: 'Community & Milestones' },
    { value: 'SECURITY_MAINTENANCE', label: 'Security & Maintenance' },
    { value: 'GENERAL_ANNOUNCEMENT', label: 'General Announcements' },
];

interface UpdateFilterBarProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    activeCategory: string;
    onCategoryChange: (category: string) => void;
    viewMode: ViewMode;
    onViewModeChange: (mode: ViewMode) => void;
    totalResults: number;
}

export function UpdateFilterBar({
    searchQuery,
    onSearchChange,
    activeCategory,
    onCategoryChange,
    viewMode,
    onViewModeChange,
    totalResults,
}: UpdateFilterBarProps) {
    const [isCategoryOpen, setIsCategoryOpen] = useState(false);
    const categoryRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
                setIsCategoryOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedCategoryLabel = UPDATE_CATEGORIES.find(c => c.value === activeCategory)?.label || 'All Categories';
    const hasActiveFilters = activeCategory !== 'all' || searchQuery.trim().length > 0;

    return (
        <div className="space-y-3 mb-6">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                {/* Search Bar */}
                <div className="relative flex-1 min-w-[280px]">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search updates by keyword, protocol, or changelog title..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full pl-10 pr-9 py-2 rounded-lg bg-surface-elevation-1 border border-border-default/80 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-primary/60 focus:ring-1 focus:ring-brand-primary/40 transition-colors"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => onSearchChange('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    {/* Category Dropdown */}
                    <div className="relative" ref={categoryRef}>
                        <button
                            type="button"
                            onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                                activeCategory !== 'all'
                                    ? 'bg-brand-primary/10 border-brand-primary/40 text-brand-light'
                                    : 'bg-surface-elevation-1 border-border-default/80 text-text-secondary hover:text-text-primary hover:border-border-default'
                            }`}
                        >
                            <ListFilter className="w-3.5 h-3.5" />
                            <span>Category: {selectedCategoryLabel}</span>
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${isCategoryOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isCategoryOpen && (
                            <div className="absolute right-0 mt-2 w-64 rounded-xl bg-surface-elevation-2 border border-border-default shadow-2xl py-1.5 z-40 backdrop-blur-md">
                                <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-text-muted border-b border-border-default/50 mb-1">
                                    Filter by Category
                                </div>
                                {UPDATE_CATEGORIES.map((category) => {
                                    const isSelected = activeCategory === category.value;
                                    return (
                                        <button
                                            key={category.value}
                                            type="button"
                                            onClick={() => {
                                                onCategoryChange(category.value);
                                                setIsCategoryOpen(false);
                                            }}
                                            className={`w-full flex items-center justify-between px-3.5 py-2 text-xs text-left transition-colors cursor-pointer ${
                                                isSelected
                                                    ? 'bg-brand-primary/15 text-brand-light font-medium'
                                                    : 'text-text-secondary hover:bg-surface-elevation-3 hover:text-text-primary'
                                            }`}
                                        >
                                            <span>{category.label}</span>
                                            {isSelected && <Check className="w-3.5 h-3.5 text-brand-light" />}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* View Mode Toggle: Short Digest vs Detailed View */}
                    <div className="flex items-center rounded-lg bg-surface-elevation-1 border border-border-default/80 p-0.5">
                        <button
                            type="button"
                            onClick={() => onViewModeChange('short')}
                            title="Short Digest View (Changelog)"
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                                viewMode === 'short'
                                    ? 'bg-brand-primary text-white shadow-sm'
                                    : 'text-text-muted hover:text-text-primary'
                            }`}
                        >
                            <LayoutList className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Short Digest</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => onViewModeChange('detailed')}
                            title="Detailed View (Full Articles)"
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                                viewMode === 'detailed'
                                    ? 'bg-brand-primary text-white shadow-sm'
                                    : 'text-text-muted hover:text-text-primary'
                            }`}
                        >
                            <FileText className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Detailed View</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Active Filter Chips */}
            {hasActiveFilters && (
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                    <span className="text-text-muted font-mono text-[11px]">Filtered by ({totalResults} results):</span>

                    {activeCategory !== 'all' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/25 text-brand-light">
                            <span>Category: {selectedCategoryLabel}</span>
                            <button
                                onClick={() => onCategoryChange('all')}
                                className="hover:text-white transition-colors"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    )}

                    {searchQuery.trim() && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-elevation-2 border border-border-default text-text-primary">
                            <span>"{searchQuery}"</span>
                            <button
                                onClick={() => onSearchChange('')}
                                className="hover:text-brand-light transition-colors"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    )}

                    <button
                        onClick={() => {
                            onCategoryChange('all');
                            onSearchChange('');
                        }}
                        className="text-text-muted hover:text-brand-light text-xs underline underline-offset-2 ml-1 transition-colors cursor-pointer"
                    >
                        Reset all
                    </button>
                </div>
            )}
        </div>
    );
}
