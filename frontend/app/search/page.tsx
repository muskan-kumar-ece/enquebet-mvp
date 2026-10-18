"use client";

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Sparkles, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

import { api } from '@/lib/api';
import { useAuth } from '@/lib/contexts/AuthContext';
import { SearchOmnibox } from '@/components/search/SearchOmnibox';
import {
    SearchFacetBar,
    SearchTab,
    SearchFiltersState,
} from '@/components/search/SearchFacetBar';
import { BuilderSearchResultCard } from '@/components/search/BuilderSearchResultCard';
import { ProjectSearchResultCard } from '@/components/search/ProjectSearchResultCard';
import { TrendingDiscoverySection } from '@/components/search/TrendingDiscoverySection';
import { BrandLogo } from '@/components/ui/BrandLogo';

const INITIAL_FILTERS: SearchFiltersState = {
    category: 'all',
    location: '',
    college: '',
    skills: '',
    role: '',
    availability: '',
    verified_only: false,
    sort_by: 'reputation',
};

function SearchPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();

    // Query & Filter states
    const [query, setQuery] = useState(searchParams.get('q') || '');
    const [activeTab, setActiveTab] = useState<SearchTab>(
        (searchParams.get('type') as SearchTab) || 'all'
    );
    const [filters, setFilters] = useState<SearchFiltersState>(INITIAL_FILTERS);
    const [showFilters, setShowFilters] = useState(false);
    const [page, setPage] = useState(1);

    // Results & Status states
    const [builders, setBuilders] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [pagination, setPagination] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [searched, setSearched] = useState(false);

    // Optimistic Follow state
    const [followState, setFollowState] = useState<Record<string, boolean>>({});
    const [followLoading, setFollowLoading] = useState<Record<string, boolean>>({});

    // Core server search callback
    const performSearch = useCallback(
        async (
            searchQuery: string,
            currentTab: SearchTab,
            currentFilters: SearchFiltersState,
            currentPage: number
        ) => {
            const trimmedQuery = searchQuery.trim();
            const hasFilters = [
                currentTab !== 'all',
                currentFilters.category !== 'all',
                Boolean(currentFilters.location.trim()),
                Boolean(currentFilters.college.trim()),
                Boolean(currentFilters.skills.trim()),
                Boolean(currentFilters.role.trim()),
                Boolean(currentFilters.availability),
                currentFilters.verified_only,
                currentFilters.sort_by !== 'reputation',
            ].some(Boolean);

            if (!trimmedQuery && !hasFilters) {
                setSearched(false);
                setBuilders([]);
                setProjects([]);
                setPagination(null);
                setError('');
                return;
            }

            setLoading(true);
            setError('');
            setSearched(true);

            try {
                const resp = await api.search(trimmedQuery, {
                    type: currentTab,
                    category: currentFilters.category !== 'all' ? currentFilters.category : undefined,
                    location: currentFilters.location.trim() || undefined,
                    college: currentFilters.college.trim() || undefined,
                    skills: currentFilters.skills.trim() || undefined,
                    role: currentFilters.role.trim() || undefined,
                    availability: currentFilters.availability || undefined,
                    verified_only: currentFilters.verified_only || undefined,
                    sort_by: currentFilters.sort_by || undefined,
                    page: currentPage,
                    page_size: currentTab === 'all' ? 6 : 12,
                });

                const loadedBuilders = resp.builders || resp.users || [];
                const loadedProjects = resp.projects || resp.posts || [];

                setBuilders(loadedBuilders);
                setProjects(loadedProjects);
                setPagination(resp.pagination || null);

                // Populate follow states
                const initialFollows: Record<string, boolean> = {};
                loadedBuilders.forEach((b: any) => {
                    initialFollows[b.id] = Boolean(b.is_following);
                });
                setFollowState((prev) => ({ ...initialFollows, ...prev }));
            } catch (err: any) {
                setError(err.message || 'Failed to fetch search results. Please try again.');
                setBuilders([]);
                setProjects([]);
            } finally {
                setLoading(false);
            }
        },
        []
    );

    // Debounced search trigger
    useEffect(() => {
        const timer = setTimeout(() => {
            performSearch(query, activeTab, filters, page);
        }, 250);

        return () => clearTimeout(timer);
    }, [query, activeTab, filters, page, performSearch]);

    // Handle Follow/Unfollow
    const handleFollowToggle = async (builderId: string, currentFollowing: boolean) => {
        if (!user) {
            toast.error('Please sign in to follow builders.');
            return;
        }

        const nextState = !currentFollowing;
        setFollowState((prev) => ({ ...prev, [builderId]: nextState }));
        setFollowLoading((prev) => ({ ...prev, [builderId]: true }));

        try {
            if (currentFollowing) {
                await api.unfollowUser(builderId);
                toast.success('Unfollowed');
            } else {
                await api.followUser(builderId);
                toast.success('Following builder');
            }
        } catch (err: any) {
            setFollowState((prev) => ({ ...prev, [builderId]: currentFollowing }));
            toast.error(err.message || 'Follow action failed');
        } finally {
            setFollowLoading((prev) => ({ ...prev, [builderId]: false }));
        }
    };

    // Preset / Suggestion handlers
    const handleSelectSuggestion = (item: {
        type: 'skill' | 'college' | 'category' | 'builder';
        value: string;
    }) => {
        if (item.type === 'builder') {
            router.push(`/profile/${item.value}`);
            return;
        }
        if (item.type === 'category') {
            setFilters((prev) => ({ ...prev, category: item.value }));
            setActiveTab('projects');
            setPage(1);
            return;
        }
        if (item.type === 'college') {
            setFilters((prev) => ({ ...prev, college: item.value }));
            setPage(1);
            return;
        }
        if (item.type === 'skill') {
            setFilters((prev) => ({ ...prev, skills: item.value }));
            setActiveTab('builders');
            setPage(1);
            return;
        }
    };

    const handleSelectPreset = (preset: { query?: string; category?: string; location?: string }) => {
        if (preset.query) setQuery(preset.query);
        if (preset.category) setFilters((prev) => ({ ...prev, category: preset.category! }));
        if (preset.location) setFilters((prev) => ({ ...prev, location: preset.location! }));
        setPage(1);
    };

    return (
        <div className="min-h-screen bg-[#08090e] bg-blueprint-grid py-6 sm:py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border">
                    <div className="flex items-center gap-3">
                        <BrandLogo size="md" mode="vector" withText={true} subtitle="Global Builder Discovery Protocol" />
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand/10 text-brand-light border border-brand/20 text-xs font-mono font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                            Global Index Active
                        </span>
                    </div>
                </div>

                {/* Search Omnibox */}
                <SearchOmnibox
                    query={query}
                    onQueryChange={(q) => {
                        setQuery(q);
                        setPage(1);
                    }}
                    onSelectSuggestion={handleSelectSuggestion}
                />

                {/* Filter and Tab Facet Bar */}
                <SearchFacetBar
                    activeTab={activeTab}
                    onTabChange={(tab) => {
                        setActiveTab(tab);
                        setPage(1);
                    }}
                    filters={filters}
                    onFiltersChange={(f) => {
                        setFilters(f);
                        setPage(1);
                    }}
                    onClearFilters={() => {
                        setFilters(INITIAL_FILTERS);
                        setPage(1);
                    }}
                    totalBuilders={pagination?.total_users}
                    totalProjects={pagination?.total_posts}
                    showFilters={showFilters}
                    onToggleShowFilters={() => setShowFilters(!showFilters)}
                />

                {/* Error Banner */}
                {error && (
                    <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Zero State: Trending Discovery Section */}
                {!searched && !loading && (
                    <TrendingDiscoverySection
                        onSelectSkill={(skill) => {
                            setFilters((prev) => ({ ...prev, skills: skill }));
                            setActiveTab('builders');
                            setPage(1);
                        }}
                        onSelectCategory={(cat) => {
                            setFilters((prev) => ({ ...prev, category: cat }));
                            setActiveTab('projects');
                            setPage(1);
                        }}
                        onSelectPreset={handleSelectPreset}
                    />
                )}

                {/* Loading Skeleton */}
                {loading && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div
                                key={i}
                                className="p-5 rounded-2xl bg-[#0c0c16] border border-[#1e1e34] animate-pulse space-y-4"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-zinc-800" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 bg-zinc-800 rounded w-3/4" />
                                        <div className="h-3 bg-zinc-800/60 rounded w-1/2" />
                                    </div>
                                </div>
                                <div className="h-3 bg-zinc-800/40 rounded w-full" />
                                <div className="h-3 bg-zinc-800/40 rounded w-2/3" />
                            </div>
                        ))}
                    </div>
                )}

                {/* Search Results */}
                {searched && !loading && (
                    <div className="space-y-8 pt-2">
                        {/* Builders Section */}
                        {(activeTab === 'all' || activeTab === 'builders') && builders.length > 0 && (
                            <div className="space-y-4">
                                {activeTab === 'all' && (
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                                            <span>Builders</span>
                                            <span className="text-xs font-mono text-brand-light">({pagination?.total_users ?? builders.length})</span>
                                        </h2>
                                        {pagination?.has_more_users && (
                                            <button
                                                onClick={() => {
                                                    setActiveTab('builders');
                                                    setPage(1);
                                                }}
                                                className="text-xs text-brand-light hover:text-brand font-medium"
                                            >
                                                View all builders →
                                            </button>
                                        )}
                                    </div>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {builders.map((builder) => (
                                        <BuilderSearchResultCard
                                            key={builder.id}
                                            builder={builder}
                                            currentUserId={user?.id}
                                            isFollowing={Boolean(followState[builder.id])}
                                            onFollowToggle={handleFollowToggle}
                                            followLoading={Boolean(followLoading[builder.id])}
                                            searchHighlight={query || filters.skills}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Projects Section */}
                        {(activeTab === 'all' || activeTab === 'projects') && projects.length > 0 && (
                            <div className="space-y-4">
                                {activeTab === 'all' && (
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                                            <span>Projects</span>
                                            <span className="text-xs font-mono text-brand-light">({pagination?.total_posts ?? projects.length})</span>
                                        </h2>
                                        {pagination?.has_more_posts && (
                                            <button
                                                onClick={() => {
                                                    setActiveTab('projects');
                                                    setPage(1);
                                                }}
                                                className="text-xs text-brand-light hover:text-brand font-medium"
                                            >
                                                View all projects →
                                            </button>
                                        )}
                                    </div>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {projects.map((project) => (
                                        <ProjectSearchResultCard
                                            key={project.id}
                                            project={project}
                                            searchHighlight={query || filters.role}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Empty Results State */}
                        {builders.length === 0 && projects.length === 0 && (
                            <div className="p-12 text-center rounded-2xl bg-[#0c0c16] border border-[#1e1e34] space-y-3">
                                <Sparkles className="w-8 h-8 text-zinc-400 mx-auto opacity-40" />
                                <h3 className="text-base font-bold text-white">No results found</h3>
                                <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
                                    We couldn't find any builders or projects matching your search criteria. Try removing filters or searching a broader skill or keyword.
                                </p>
                                <button
                                    onClick={() => {
                                        setFilters(INITIAL_FILTERS);
                                        setQuery('');
                                        setPage(1);
                                    }}
                                    className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 transition-colors"
                                >
                                    Reset Filters
                                </button>
                            </div>
                        )}

                        {/* Pagination Controls */}
                        {pagination && pagination.total_pages > 1 && (
                            <div className="flex items-center justify-between pt-6 border-t border-[#1a1a2e]">
                                <span className="text-xs text-zinc-400 font-mono">
                                    Page {pagination.page} of {pagination.total_pages}
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                                        disabled={!pagination.has_prev}
                                        className="p-2 rounded-xl bg-[#0c0c16] border border-[#1e1e34] text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setPage((p) => p + 1)}
                                        disabled={!pagination.has_next}
                                        className="p-2 rounded-xl bg-[#0c0c16] border border-[#1e1e34] text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function SearchPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-[#07070d] flex items-center justify-center">
                    <div className="text-xs text-zinc-400 font-mono">Loading Search...</div>
                </div>
            }
        >
            <SearchPageContent />
        </Suspense>
    );
}
