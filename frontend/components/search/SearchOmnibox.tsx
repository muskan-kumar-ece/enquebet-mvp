"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Sparkles, User, Tag, GraduationCap, FolderCode, Clock } from 'lucide-react';
import { api } from '@/lib/api';

interface SearchOmniboxProps {
    query: string;
    onQueryChange: (q: string) => void;
    onSelectSuggestion?: (item: { type: 'skill' | 'college' | 'category' | 'builder'; value: string; extra?: any }) => void;
    placeholder?: string;
}

export function SearchOmnibox({
    query,
    onQueryChange,
    onSelectSuggestion,
    placeholder = 'Search by name, skills, roles, projects, or colleges... (press "/" to focus)',
}: SearchOmniboxProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isFocused, setIsFocused] = useState(false);
    const [suggestions, setSuggestions] = useState<{
        skills: string[];
        colleges: string[];
        categories: string[];
        builders: any[];
    }>({ skills: [], colleges: [], categories: [], builders: [] });
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);

    // Load recent searches from localStorage
    useEffect(() => {
        try {
            const saved = localStorage.getItem('recent_searches');
            if (saved) setRecentSearches(JSON.parse(saved).slice(0, 6));
        } catch {}
    }, []);

    // Save recent search
    const saveRecentSearch = (val: string) => {
        if (!val || val.trim().length < 2) return;
        const updated = Array.from(new Set([val.trim(), ...recentSearches])).slice(0, 6);
        setRecentSearches(updated);
        try {
            localStorage.setItem('recent_searches', JSON.stringify(updated));
        } catch {}
    };

    const clearRecentSearches = () => {
        setRecentSearches([]);
        try {
            localStorage.removeItem('recent_searches');
        } catch {}
    };

    // Hotkeys: '/' to focus, 'Esc' to clear/blur
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (
                e.key === '/' &&
                document.activeElement !== inputRef.current &&
                !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')
            ) {
                e.preventDefault();
                inputRef.current?.focus();
            } else if (e.key === 'Escape' && document.activeElement === inputRef.current) {
                inputRef.current?.blur();
                setIsFocused(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsFocused(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Debounced query for auto-complete suggestions
    useEffect(() => {
        if (!query || query.trim().length < 2) {
            setSuggestions({ skills: [], colleges: [], categories: [], builders: [] });
            return;
        }

        const timer = setTimeout(async () => {
            setLoadingSuggestions(true);
            try {
                const res = await api.getSearchSuggestions(query.trim());
                setSuggestions(res);
            } catch {
                setSuggestions({ skills: [], colleges: [], categories: [], builders: [] });
            } finally {
                setLoadingSuggestions(false);
            }
        }, 150);

        return () => clearTimeout(timer);
    }, [query]);

    const hasSuggestions =
        suggestions.skills.length > 0 ||
        suggestions.colleges.length > 0 ||
        suggestions.categories.length > 0 ||
        suggestions.builders.length > 0;

    const handleSelect = (item: { type: 'skill' | 'college' | 'category' | 'builder'; value: string; extra?: any }) => {
        saveRecentSearch(item.value);
        if (onSelectSuggestion) {
            onSelectSuggestion(item);
        } else {
            onQueryChange(item.value);
        }
        setIsFocused(false);
    };

    return (
        <div ref={containerRef} className="relative w-full">
            {/* Input Container */}
            <div
                className={`relative flex items-center w-full bg-[#0f111a] border rounded-xl transition-all duration-200 ${
                    isFocused
                        ? 'border-brand shadow-sm ring-1 ring-brand/30'
                        : 'border-[#1e2335] hover:border-zinc-700'
                }`}
            >
                <div className="pl-4 pr-2 text-zinc-400">
                    <Search className={`w-4 h-4 transition-colors ${isFocused ? 'text-brand' : 'text-zinc-400'}`} />
                </div>

                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => onQueryChange(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && query.trim()) {
                            saveRecentSearch(query);
                            setIsFocused(false);
                        }
                    }}
                    placeholder={placeholder}
                    className="flex-1 bg-transparent py-3.5 pr-10 text-xs sm:text-sm text-white placeholder-zinc-400 focus:outline-none"
                />

                <div className="flex items-center gap-2 pr-3 shrink-0">
                    {query ? (
                        <button
                            type="button"
                            onClick={() => {
                                onQueryChange('');
                                inputRef.current?.focus();
                            }}
                            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors"
                            title="Clear query"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    ) : (
                        <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono font-medium text-zinc-400 bg-zinc-900 border border-zinc-800 rounded shadow-sm select-none">
                            /
                        </kbd>
                    )}
                </div>
            </div>

            {/* Suggestions & History Dropdown */}
            {isFocused && (hasSuggestions || (!query && recentSearches.length > 0)) && (
                <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-[#0f111a] border border-[#1e2335] rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl divide-y divide-[#1e2335]">
                    {/* Recent Searches (when query is empty) */}
                    {!query && recentSearches.length > 0 && (
                        <div className="p-3">
                            <div className="flex items-center justify-between px-2 mb-2">
                                <span className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5 uppercase tracking-wider">
                                    <Clock className="w-3 h-3" />
                                    Recent Searches
                                </span>
                                <button
                                    onClick={clearRecentSearches}
                                    className="text-[10px] text-zinc-400 hover:text-red-400 transition-colors"
                                >
                                    Clear all
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {recentSearches.map((item) => (
                                    <button
                                        key={item}
                                        onClick={() => {
                                            onQueryChange(item);
                                            setIsFocused(false);
                                        }}
                                        className="px-2.5 py-1 text-xs text-zinc-300 bg-surface hover:bg-brand/10 hover:text-brand-light border border-border hover:border-brand/30 rounded-lg transition-colors flex items-center gap-1.5"
                                    >
                                        <span>{item}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Matching Builders */}
                    {suggestions.builders.length > 0 && (
                        <div className="p-2">
                            <div className="px-2 py-1 text-[11px] font-semibold text-zinc-400 flex items-center gap-1 uppercase tracking-wider">
                                <User className="w-3 h-3 text-brand" />
                                Builders
                            </div>
                            <div className="space-y-0.5">
                                {suggestions.builders.map((builder) => (
                                    <button
                                        key={builder.id}
                                        onClick={() => handleSelect({ type: 'builder', value: builder.username, extra: builder })}
                                        className="w-full px-3 py-2 text-left rounded-lg hover:bg-white/[0.04] transition-colors flex items-center gap-3"
                                    >
                                        <div className="w-7 h-7 rounded-full bg-brand/15 border border-brand/30 flex items-center justify-center text-xs text-brand-light font-bold shrink-0">
                                            {builder.profile_image ? (
                                                <img src={builder.profile_image} alt="" className="w-full h-full rounded-full object-cover" />
                                            ) : (
                                                builder.username.slice(0, 2).toUpperCase()
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-semibold text-white truncate">{builder.full_name}</span>
                                                <span className="text-[11px] text-zinc-400 font-mono truncate">@{builder.username}</span>
                                            </div>
                                            {builder.headline && (
                                                <p className="text-[11px] text-zinc-400 truncate">{builder.headline}</p>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Matching Skills & Tags */}
                    {suggestions.skills.length > 0 && (
                        <div className="p-2">
                            <div className="px-2 py-1 text-[11px] font-semibold text-zinc-400 flex items-center gap-1 uppercase tracking-wider">
                                <Tag className="w-3 h-3 text-emerald-400" />
                                Skills & Tags
                            </div>
                            <div className="flex flex-wrap gap-1.5 px-2 py-1">
                                {suggestions.skills.map((skill) => (
                                    <button
                                        key={skill}
                                        onClick={() => handleSelect({ type: 'skill', value: skill })}
                                        className="px-2.5 py-1 text-xs rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                                    >
                                        #{skill}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Matching Colleges */}
                    {suggestions.colleges.length > 0 && (
                        <div className="p-2">
                            <div className="px-2 py-1 text-[11px] font-semibold text-zinc-400 flex items-center gap-1 uppercase tracking-wider">
                                <GraduationCap className="w-3 h-3 text-amber-400" />
                                Colleges & Universities
                            </div>
                            <div className="space-y-0.5">
                                {suggestions.colleges.map((college) => (
                                    <button
                                        key={college}
                                        onClick={() => handleSelect({ type: 'college', value: college })}
                                        className="w-full px-3 py-1.5 text-left rounded-xl hover:bg-[#16162a] text-xs text-zinc-300 hover:text-white transition-colors flex items-center gap-2"
                                    >
                                        <GraduationCap className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                        <span className="truncate">{college}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Matching Categories */}
                    {suggestions.categories.length > 0 && (
                        <div className="p-2">
                            <div className="px-2 py-1 text-[11px] font-semibold text-zinc-400 flex items-center gap-1 uppercase tracking-wider">
                                <FolderCode className="w-3 h-3 text-cyan-400" />
                                Categories
                            </div>
                            <div className="flex flex-wrap gap-1.5 px-2 py-1">
                                {suggestions.categories.map((cat) => (
                                    <button
                                        key={cat}
                                        onClick={() => handleSelect({ type: 'category', value: cat })}
                                        className="px-2.5 py-1 text-xs rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors"
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
