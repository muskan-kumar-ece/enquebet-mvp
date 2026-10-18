'use client';

import React from 'react';
import { VenopaiCategory } from '@/lib/venopaiCatalog';
import { ArrowUpDown, Layers } from 'lucide-react';

interface CategoryTabsProps {
  categories: VenopaiCategory[];
  activeCategory: string;
  onSelectCategory: (slug: string) => void;
  categoryCounts: Record<string, number>;
  totalCount: number;
  sortBy: string;
  onSortChange: (sort: string) => void;
}

export function CategoryTabs({
  categories,
  activeCategory,
  onSelectCategory,
  categoryCounts,
  totalCount,
  sortBy,
  onSortChange,
}: CategoryTabsProps) {
  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Category Horizontal Scroll Container */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none max-w-full">
          {/* All Hardware Tab */}
          <button
            onClick={() => onSelectCategory('all')}
            type="button"
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
              activeCategory === 'all'
                ? 'bg-brand-primary text-white shadow-sm shadow-brand-primary/20'
                : 'bg-surface-elevated text-text-secondary hover:text-text-primary hover:bg-surface-elevated/80 border border-border-default'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Components</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeCategory === 'all'
                  ? 'bg-white/20 text-white'
                  : 'bg-surface-base text-text-muted border border-border-default'
              }`}
            >
              {totalCount}
            </span>
          </button>

          {/* Canonical Categories */}
          {categories.map((cat) => {
            const isActive = activeCategory === cat.slug;
            const count = categoryCounts[cat.slug] || 0;

            return (
              <button
                key={cat.slug}
                onClick={() => onSelectCategory(cat.slug)}
                type="button"
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                  isActive
                    ? 'bg-brand-primary text-white shadow-sm shadow-brand-primary/20'
                    : 'bg-surface-elevated text-text-secondary hover:text-text-primary hover:bg-surface-elevated/80 border border-border-default'
                }`}
              >
                <span>{cat.name}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-surface-base text-text-muted border border-border-default'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Sort:</span>
          </div>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-surface-elevated border border-border-default text-xs text-text-primary focus:outline-none focus:border-brand-primary transition-all font-sans cursor-pointer"
          >
            <option value="featured">Featured First</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="stock">Stock Available</option>
            <option value="name">Name (A-Z)</option>
          </select>
        </div>
      </div>
    </div>
  );
}
