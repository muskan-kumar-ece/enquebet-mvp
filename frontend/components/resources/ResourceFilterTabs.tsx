"use client";

import React, { useState, useRef, useEffect } from 'react';
import { RESOURCE_CATEGORIES, FILE_TYPES, getFileTypeBadgeStyle } from '@/lib/resourcesData';
import {
    ShieldAlert,
    BookOpen,
    Clock,
    ArrowUpDown,
    ChevronDown,
    Layers,
    FileText,
    Check,
    X,
    Filter,
} from 'lucide-react';

interface ResourceFilterTabsProps {
    activeTab: 'catalog' | 'my_submissions' | 'moderation';
    onTabChange: (tab: 'catalog' | 'my_submissions' | 'moderation') => void;
    activeCategory: string;
    onCategoryChange: (cat: string) => void;
    activeFileType: string;
    onFileTypeChange: (ft: string) => void;
    activeOrdering: string;
    onOrderingChange: (ord: string) => void;
    isAdmin: boolean;
    isAuthenticated: boolean;
    pendingCount: number;
    mySubmissionsCount: number;
}

const ORDERING_OPTIONS = [
    { value: '-created_at', label: 'Newest First' },
    { value: '-downloads_count', label: 'Most Downloaded' },
    { value: '-views_count', label: 'Most Viewed' },
    { value: 'title', label: 'Alphabetical (A-Z)' },
];

export function ResourceFilterTabs({
    activeTab,
    onTabChange,
    activeCategory,
    onCategoryChange,
    activeFileType,
    onFileTypeChange,
    activeOrdering,
    onOrderingChange,
    isAdmin,
    isAuthenticated,
    pendingCount,
    mySubmissionsCount,
}: ResourceFilterTabsProps) {
    // Dropdown open states
    const [isCategoryOpen, setIsCategoryOpen] = useState(false);
    const [isFormatOpen, setIsFormatOpen] = useState(false);
    const [isOrderOpen, setIsOrderOpen] = useState(false);

    // Refs for click outside
    const categoryRef = useRef<HTMLDivElement>(null);
    const formatRef = useRef<HTMLDivElement>(null);
    const orderRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
                setIsCategoryOpen(false);
            }
            if (formatRef.current && !formatRef.current.contains(e.target as Node)) {
                setIsFormatOpen(false);
            }
            if (orderRef.current && !orderRef.current.contains(e.target as Node)) {
                setIsOrderOpen(false);
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsCategoryOpen(false);
                setIsFormatOpen(false);
                setIsOrderOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const selectedCategory = RESOURCE_CATEGORIES.find((c) => c.id === activeCategory) || RESOURCE_CATEGORIES[0];
    const selectedFormat = FILE_TYPES.find((f) => f.id === activeFileType) || FILE_TYPES[0];
    const selectedOrder = ORDERING_OPTIONS.find((o) => o.value === activeOrdering) || ORDERING_OPTIONS[0];

    const hasActiveFilters = activeCategory !== 'ALL' || activeFileType !== 'ALL';

    return (
        <div className="border-b border-[#1b1e2c] bg-[#0c0d15] sticky top-0 z-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Unified Filter Toolbar */}
                <div className="py-2.5 flex flex-wrap items-center justify-between gap-3">
                    {/* Left: Mode Segmented Switcher */}
                    <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[#090a0f] border border-[#1b1e2c]">
                        <button
                            onClick={() => onTabChange('catalog')}
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                                activeTab === 'catalog'
                                    ? 'bg-[#181a26] text-white border border-[#2a2f45] shadow-xs'
                                    : 'text-zinc-400 hover:text-white'
                            }`}
                        >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>Catalog</span>
                        </button>

                        {isAuthenticated && (
                            <button
                                onClick={() => onTabChange('my_submissions')}
                                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                                    activeTab === 'my_submissions'
                                        ? 'bg-[#181a26] text-white border border-[#2a2f45] shadow-xs'
                                        : 'text-zinc-400 hover:text-white'
                                }`}
                            >
                                <Clock className="w-3.5 h-3.5" />
                                <span>My Submissions</span>
                                {mySubmissionsCount > 0 && (
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-zinc-800 text-zinc-300">
                                        {mySubmissionsCount}
                                    </span>
                                )}
                            </button>
                        )}

                        {isAdmin && (
                            <button
                                onClick={() => onTabChange('moderation')}
                                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                                    activeTab === 'moderation'
                                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40 shadow-xs'
                                        : 'text-amber-400/80 hover:text-amber-300 hover:bg-amber-500/10'
                                }`}
                            >
                                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                                <span>Moderation</span>
                                {pendingCount > 0 && (
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-amber-500 text-black">
                                        {pendingCount}
                                    </span>
                                )}
                            </button>
                        )}
                    </div>

                    {/* Right: Category, Format & Sort Dropdowns (Relevant in Catalog & My Submissions) */}
                    {activeTab !== 'moderation' && (
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Category Dropdown */}
                            <div className="relative" ref={categoryRef}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsCategoryOpen(!isCategoryOpen);
                                        setIsFormatOpen(false);
                                        setIsOrderOpen(false);
                                    }}
                                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                        activeCategory !== 'ALL'
                                            ? 'bg-blue-600/15 text-blue-300 border-blue-500/40'
                                            : 'bg-[#090a0f] text-zinc-300 border-[#1b1e2c] hover:border-[#2a2f45]'
                                    }`}
                                >
                                    <Layers className="w-3.5 h-3.5 text-zinc-400" />
                                    <span className="text-zinc-500">Category:</span>
                                    <span className="font-semibold text-white max-w-[140px] truncate">
                                        {selectedCategory.label}
                                    </span>
                                    <ChevronDown
                                        className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${
                                            isCategoryOpen ? 'rotate-180' : ''
                                        }`}
                                    />
                                </button>

                                {isCategoryOpen && (
                                    <div className="absolute right-0 sm:left-0 sm:right-auto mt-1.5 w-64 rounded-xl bg-[#0e1018] border border-[#1b1e2c] shadow-2xl p-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                                        <div className="px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-zinc-500 border-b border-[#1b1e2c] mb-1">
                                            Select Category
                                        </div>
                                        <div className="max-h-60 overflow-y-auto space-y-0.5">
                                            {RESOURCE_CATEGORIES.map((cat) => {
                                                const isSelected = activeCategory === cat.id;
                                                return (
                                                    <button
                                                        key={cat.id}
                                                        type="button"
                                                        onClick={() => {
                                                            onCategoryChange(cat.id);
                                                            setIsCategoryOpen(false);
                                                        }}
                                                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                                                            isSelected
                                                                ? 'bg-blue-600/20 text-blue-300 font-semibold'
                                                                : 'text-zinc-300 hover:bg-[#181a26] hover:text-white'
                                                        }`}
                                                    >
                                                        <span className="truncate">{cat.label}</span>
                                                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0 ml-2" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Format Dropdown */}
                            <div className="relative" ref={formatRef}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsFormatOpen(!isFormatOpen);
                                        setIsCategoryOpen(false);
                                        setIsOrderOpen(false);
                                    }}
                                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                        activeFileType !== 'ALL'
                                            ? 'bg-blue-600/15 text-blue-300 border-blue-500/40'
                                            : 'bg-[#090a0f] text-zinc-300 border-[#1b1e2c] hover:border-[#2a2f45]'
                                    }`}
                                >
                                    <FileText className="w-3.5 h-3.5 text-zinc-400" />
                                    <span className="text-zinc-500">Format:</span>
                                    <span className="font-semibold text-white">
                                        {selectedFormat.label}
                                    </span>
                                    <ChevronDown
                                        className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${
                                            isFormatOpen ? 'rotate-180' : ''
                                        }`}
                                    />
                                </button>

                                {isFormatOpen && (
                                    <div className="absolute right-0 mt-1.5 w-56 rounded-xl bg-[#0e1018] border border-[#1b1e2c] shadow-2xl p-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                                        <div className="px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-zinc-500 border-b border-[#1b1e2c] mb-1">
                                            Filter by Format
                                        </div>
                                        <div className="max-h-60 overflow-y-auto space-y-0.5">
                                            {FILE_TYPES.map((ft) => {
                                                const isSelected = activeFileType === ft.id;
                                                const badgeStyle = ft.id !== 'ALL' ? getFileTypeBadgeStyle(ft.id) : null;
                                                return (
                                                    <button
                                                        key={ft.id}
                                                        type="button"
                                                        onClick={() => {
                                                            onFileTypeChange(ft.id);
                                                            setIsFormatOpen(false);
                                                        }}
                                                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                                                            isSelected
                                                                ? 'bg-blue-600/20 text-blue-300 font-semibold'
                                                                : 'text-zinc-300 hover:bg-[#181a26] hover:text-white'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            {badgeStyle && (
                                                                <span
                                                                    className={`px-1.5 py-0.2 rounded text-[10px] font-mono border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}
                                                                >
                                                                    {badgeStyle.label}
                                                                </span>
                                                            )}
                                                            <span className="truncate">{ft.label}</span>
                                                        </div>
                                                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0 ml-2" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Sort Dropdown */}
                            <div className="relative" ref={orderRef}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsOrderOpen(!isOrderOpen);
                                        setIsCategoryOpen(false);
                                        setIsFormatOpen(false);
                                    }}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#090a0f] border border-[#1b1e2c] hover:border-[#2a2f45] text-zinc-300 transition-colors"
                                >
                                    <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500" />
                                    <span className="text-zinc-500">Sort:</span>
                                    <span className="text-white font-medium">{selectedOrder.label}</span>
                                    <ChevronDown
                                        className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${
                                            isOrderOpen ? 'rotate-180' : ''
                                        }`}
                                    />
                                </button>

                                {isOrderOpen && (
                                    <div className="absolute right-0 mt-1.5 w-48 rounded-xl bg-[#0e1018] border border-[#1b1e2c] shadow-2xl p-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                                        <div className="px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-zinc-500 border-b border-[#1b1e2c] mb-1">
                                            Sort By
                                        </div>
                                        <div className="space-y-0.5">
                                            {ORDERING_OPTIONS.map((opt) => {
                                                const isSelected = activeOrdering === opt.value;
                                                return (
                                                    <button
                                                        key={opt.value}
                                                        type="button"
                                                        onClick={() => {
                                                            onOrderingChange(opt.value);
                                                            setIsOrderOpen(false);
                                                        }}
                                                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                                                            isSelected
                                                                ? 'bg-blue-600/20 text-blue-300 font-semibold'
                                                                : 'text-zinc-300 hover:bg-[#181a26] hover:text-white'
                                                        }`}
                                                    >
                                                        <span>{opt.label}</span>
                                                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0 ml-2" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Active Filter Chips Bar (Shown when any filter is active) */}
                {activeTab !== 'moderation' && hasActiveFilters && (
                    <div className="pb-2.5 flex items-center gap-2 text-xs">
                        <span className="text-zinc-500 font-mono text-[11px] flex items-center gap-1">
                            <Filter className="w-3 h-3" />
                            Active Filters:
                        </span>

                        {activeCategory !== 'ALL' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs bg-blue-500/10 text-blue-300 border border-blue-500/25">
                                <span>{selectedCategory.label}</span>
                                <button
                                    onClick={() => onCategoryChange('ALL')}
                                    className="hover:text-white"
                                    title="Remove category filter"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        )}

                        {activeFileType !== 'ALL' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs bg-blue-500/10 text-blue-300 border border-blue-500/25">
                                <span>{selectedFormat.label}</span>
                                <button
                                    onClick={() => onFileTypeChange('ALL')}
                                    className="hover:text-white"
                                    title="Remove format filter"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        )}

                        <button
                            onClick={() => {
                                onCategoryChange('ALL');
                                onFileTypeChange('ALL');
                            }}
                            className="text-[11px] font-mono text-zinc-500 hover:text-zinc-300 ml-1 underline decoration-zinc-700"
                        >
                            Clear all
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
