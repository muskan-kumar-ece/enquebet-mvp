'use client';

import React from 'react';
import { Search, X, Filter, Code, Brain, Cloud, Cpu, Palette, SlidersHorizontal } from 'lucide-react';
import { CourseCategory } from '@/types/academy';

interface AcademyFilterTabsProps {
    categories: CourseCategory[];
    activeCategory: string;
    onCategoryChange: (slug: string) => void;
    activeDifficulty: string;
    onDifficultyChange: (difficulty: string) => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    resultsCount: number;
}

const CATEGORY_ICON_MAP: Record<string, React.ReactNode> = {
    'web-systems': <Code className="w-3.5 h-3.5" />,
    'ai-ml': <Brain className="w-3.5 h-3.5" />,
    'cloud-devops': <Cloud className="w-3.5 h-3.5" />,
    'embedded-systems': <Cpu className="w-3.5 h-3.5" />,
    'product-design': <Palette className="w-3.5 h-3.5" />,
};

const DIFFICULTIES = [
    { label: 'All Levels', value: 'ALL' },
    { label: 'Beginner', value: 'beginner' },
    { label: 'Intermediate', value: 'intermediate' },
    { label: 'Advanced', value: 'advanced' },
    { label: 'Expert', value: 'expert' },
];

export default function AcademyFilterTabs({
    categories,
    activeCategory,
    onCategoryChange,
    activeDifficulty,
    onDifficultyChange,
    searchQuery,
    onSearchChange,
    resultsCount,
}: AcademyFilterTabsProps) {
    return (
        <div className="mb-6 space-y-4">
            {/* Top Bar: Search Input & Difficulty Selector */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Search Box */}
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Search masterclasses, topics, technologies (Next.js, LLMs, Rust, Docker)..."
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#0c0d15] border border-[#1b1e2c] text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#1864ff] transition-colors"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => onSearchChange('')}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Difficulty Selector */}
                <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-500 hidden sm:block" />
                    <div className="flex items-center bg-[#0c0d15] rounded-xl border border-[#1b1e2c] p-1">
                        {DIFFICULTIES.map((d) => (
                            <button
                                key={d.value}
                                onClick={() => onDifficultyChange(d.value)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                    activeDifficulty === d.value
                                        ? 'bg-[#1864ff]/20 text-white font-semibold border border-[#1864ff]/30'
                                        : 'text-zinc-400 hover:text-white'
                                }`}
                            >
                                {d.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Category Taxonomy Horizontal Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                <button
                    onClick={() => onCategoryChange('ALL')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                        activeCategory === 'ALL'
                            ? 'bg-[#1864ff] text-white shadow-sm'
                            : 'bg-[#0c0d15] text-zinc-400 hover:text-white border border-[#1b1e2c]'
                    }`}
                >
                    <span>All Disciplines</span>
                    <span className="ml-1 text-[10px] font-mono opacity-80">({resultsCount})</span>
                </button>

                {categories.map((cat) => {
                    const isActive = activeCategory === cat.slug;
                    return (
                        <button
                            key={cat.id}
                            onClick={() => onCategoryChange(cat.slug)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-150 ${
                                isActive
                                    ? 'bg-[#1864ff] text-white font-semibold shadow-sm'
                                    : 'bg-[#0c0d15] text-zinc-400 hover:text-white border border-[#1b1e2c] hover:border-[#2a2f45]'
                            }`}
                        >
                            {CATEGORY_ICON_MAP[cat.slug] || <Code className="w-3.5 h-3.5" />}
                            <span>{cat.name}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
