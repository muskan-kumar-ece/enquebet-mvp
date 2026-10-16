"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import {
    Search as SearchIcon,
    Filter,
    MapPin,
    GraduationCap,
    X,
    Users,
    Layers,
    Briefcase,
    SlidersHorizontal,
    ChevronLeft,
    ChevronRight,
    UserPlus,
    UserCheck,
    Sparkles,
    Tag,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

import { api } from '@/lib/api';
import { useAuth } from '@/lib/contexts/AuthContext';
import PostCard from '@/components/feed/PostCard';
import { VerificationBadge, ReputationBadge } from '@/components/ui/BuilderBadge';

type SearchTab = 'all' | 'builders' | 'projects';

interface FiltersState {
    category: string;
    location: string;
    college: string;
    skills: string;
    role: string;
}

const INITIAL_FILTERS: FiltersState = {
    category: 'all',
    location: '',
    college: '',
    skills: '',
    role: '',
};

const SUGGESTED_TAGS = [
    'React', 'Next.js', 'Rust', 'Python', 'TypeScript', 'AI', 'Machine Learning', 'Figma', 'Solidity'
];

export default function SearchPage() {
    const { user } = useAuth();
    const searchInputRef = useRef<HTMLInputElement>(null);

    const [query, setQuery] = useState('');
    const [activeTab, setActiveTab] = useState<SearchTab>('all');
    const [filters, setFilters] = useState<FiltersState>(INITIAL_FILTERS);
    const [showFilters, setShowFilters] = useState(false);
    const [page, setPage] = useState(1);

    const [builders, setBuilders] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [pagination, setPagination] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [searched, setSearched] = useState(false);

    // Track follow state optimistically per builder ID
    const [followState, setFollowState] = useState<Record<string, boolean>>({});
    const [followLoading, setFollowLoading] = useState<Record<string, boolean>>({});

    // Check if any filter is currently applied
    const activeFilterCount = [
        filters.category !== 'all',
        Boolean(filters.location.trim()),
        Boolean(filters.college.trim()),
        Boolean(filters.skills.trim()),
        Boolean(filters.role.trim()),
    ].filter(Boolean).length;

    // Hotkey handler: press '/' to focus search input, 'Esc' to clear
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (
                e.key === '/' &&
                document.activeElement !== searchInputRef.current &&
                !['INPUT', 'TEXTAREA'].includes((document.activeElement?.tagName || ''))
            ) {
                e.preventDefault();
                searchInputRef.current?.focus();
            } else if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
                setQuery('');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Core server-side search executor
    const performSearch = useCallback(
        async (searchQuery: string, currentTab: SearchTab, currentFilters: FiltersState, currentPage: number) => {
            const trimmedQuery = searchQuery.trim();
            const hasFilters = [
                currentFilters.category !== 'all',
                Boolean(currentFilters.location.trim()),
                Boolean(currentFilters.college.trim()),
                Boolean(currentFilters.skills.trim()),
                Boolean(currentFilters.role.trim()),
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
                    page: currentPage,
                    page_size: currentTab === 'all' ? 5 : 12,
                });

                const loadedBuilders = resp.builders || resp.users || [];
                const loadedProjects = resp.projects || resp.posts || [];

                setBuilders(loadedBuilders);
                setProjects(loadedProjects);
                setPagination(resp.pagination || null);

                // Initialize follow states from response
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

    // Debounced query and filter trigger
    useEffect(() => {
        const timer = setTimeout(() => {
            performSearch(query, activeTab, filters, page);
        }, 300);

        return () => clearTimeout(timer);
    }, [query, activeTab, filters, page, performSearch]);

    // Reset pagination to page 1 whenever search query, filters, or tab changes
    const handleTabChange = (newTab: SearchTab) => {
        setActiveTab(newTab);
        setPage(1);
    };

    const handleClearFilters = () => {
        setFilters(INITIAL_FILTERS);
        setPage(1);
    };

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

    return (
        <div className="min-h-screen p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="space-y-1">
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary">
                        Discovery & Search
                    </h1>
                    <p className="text-sm text-text-secondary">
                        Find builders by skills and reputation, discover collaborative project opportunities, and form teams.
                    </p>
                </div>

                {/* Hero Search Box */}
                <div className="card space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1 relative">
                            <SearchIcon className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-secondary" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={query}
                                onChange={(e) => {
                                    setQuery(e.target.value);
                                    setPage(1);
                                }}
                                placeholder="Search by name, headline, skills (e.g. Rust, React), tags, or roles..."
                                className="input w-full pl-10 pr-9 text-sm"
                            />
                            {query && (
                                <button
                                    onClick={() => {
                                        setQuery('');
                                        setPage(1);
                                    }}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                                    title="Clear search"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`btn-outline flex items-center justify-center gap-2 px-4 text-sm ${
                                showFilters || activeFilterCount > 0 ? 'border-purple text-purple bg-purple/10' : ''
                            }`}
                        >
                            <SlidersHorizontal className="w-4 h-4" />
                            <span>Filters</span>
                            {activeFilterCount > 0 && (
                                <span className="bg-purple text-white text-[11px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Expandable Filter Drawer */}
                    {showFilters && (
                        <div className="pt-4 border-t border-border-default space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {/* Category */}
                                <div>
                                    <label className="block text-xs font-semibold text-text-secondary mb-1">
                                        Project Category
                                    </label>
                                    <select
                                        value={filters.category}
                                        onChange={(e) => {
                                            setFilters({ ...filters, category: e.target.value });
                                            setPage(1);
                                        }}
                                        className="input w-full text-xs"
                                    >
                                        <option value="all">All Categories</option>
                                        <option value="tech">Technology</option>
                                        <option value="ai">AI & Machine Learning</option>
                                        <option value="design">Design & UI/UX</option>
                                        <option value="business">Business & Product</option>
                                        <option value="research">Research & Science</option>
                                        <option value="social">Social Impact</option>
                                        <option value="web3">Web3 / Crypto</option>
                                    </select>
                                </div>

                                {/* Skills */}
                                <div>
                                    <label className="block text-xs font-semibold text-text-secondary mb-1">
                                        Builder Skill
                                    </label>
                                    <div className="relative">
                                        <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
                                        <input
                                            type="text"
                                            value={filters.skills}
                                            onChange={(e) => {
                                                setFilters({ ...filters, skills: e.target.value });
                                                setPage(1);
                                            }}
                                            placeholder="e.g. React, Rust, Figma"
                                            className="input w-full pl-9 text-xs"
                                        />
                                    </div>
                                </div>

                                {/* Required Role */}
                                <div>
                                    <label className="block text-xs font-semibold text-text-secondary mb-1">
                                        Required Role
                                    </label>
                                    <div className="relative">
                                        <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
                                        <input
                                            type="text"
                                            value={filters.role}
                                            onChange={(e) => {
                                                setFilters({ ...filters, role: e.target.value });
                                                setPage(1);
                                            }}
                                            placeholder="e.g. Frontend Lead"
                                            className="input w-full pl-9 text-xs"
                                        />
                                    </div>
                                </div>

                                {/* Location */}
                                <div>
                                    <label className="block text-xs font-semibold text-text-secondary mb-1">
                                        Location
                                    </label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
                                        <input
                                            type="text"
                                            value={filters.location}
                                            onChange={(e) => {
                                                setFilters({ ...filters, location: e.target.value });
                                                setPage(1);
                                            }}
                                            placeholder="e.g. San Francisco, Remote"
                                            className="input w-full pl-9 text-xs"
                                        />
                                    </div>
                                </div>

                                {/* College */}
                                <div>
                                    <label className="block text-xs font-semibold text-text-secondary mb-1">
                                        College / University
                                    </label>
                                    <div className="relative">
                                        <GraduationCap className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
                                        <input
                                            type="text"
                                            value={filters.college}
                                            onChange={(e) => {
                                                setFilters({ ...filters, college: e.target.value });
                                                setPage(1);
                                            }}
                                            placeholder="e.g. Stanford, MIT"
                                            className="input w-full pl-9 text-xs"
                                        />
                                    </div>
                                </div>
                            </div>

                            {activeFilterCount > 0 && (
                                <div className="flex justify-end pt-2">
                                    <button
                                        onClick={handleClearFilters}
                                        className="text-xs text-text-secondary hover:text-purple transition-colors font-medium flex items-center gap-1.5"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                        <span>Reset All Filters</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Segmented Mode Tabs */}
                <div className="flex items-center gap-2 border-b border-border-default pb-2">
                    <button
                        onClick={() => handleTabChange('all')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                            activeTab === 'all'
                                ? 'bg-purple text-white shadow-sm'
                                : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                        }`}
                    >
                        <Layers className="w-4 h-4" />
                        <span>All Results</span>
                        {searched && (
                            <span className="opacity-80 text-[11px]">
                                ({((pagination?.total_users || 0) + (pagination?.total_posts || 0))})
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => handleTabChange('builders')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                            activeTab === 'builders'
                                ? 'bg-purple text-white shadow-sm'
                                : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                        }`}
                    >
                        <Users className="w-4 h-4" />
                        <span>Builders</span>
                        {searched && (
                            <span className="opacity-80 text-[11px]">
                                ({pagination?.total_users || builders.length})
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => handleTabChange('projects')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                            activeTab === 'projects'
                                ? 'bg-purple text-white shadow-sm'
                                : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                        }`}
                    >
                        <Briefcase className="w-4 h-4" />
                        <span>Projects & Opportunities</span>
                        {searched && (
                            <span className="opacity-80 text-[11px]">
                                ({pagination?.total_posts || projects.length})
                            </span>
                        )}
                    </button>
                </div>

                {/* Active Filter Chips */}
                {activeFilterCount > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-text-secondary">Active filters:</span>
                        {filters.category !== 'all' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple/10 text-purple border border-purple/20">
                                Category: {filters.category}
                                <button onClick={() => setFilters({ ...filters, category: 'all' })}>
                                    <X className="w-3 h-3 hover:opacity-80" />
                                </button>
                            </span>
                        )}
                        {filters.skills.trim() && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple/10 text-purple border border-purple/20">
                                Skill: {filters.skills}
                                <button onClick={() => setFilters({ ...filters, skills: '' })}>
                                    <X className="w-3 h-3 hover:opacity-80" />
                                </button>
                            </span>
                        )}
                        {filters.role.trim() && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple/10 text-purple border border-purple/20">
                                Role: {filters.role}
                                <button onClick={() => setFilters({ ...filters, role: '' })}>
                                    <X className="w-3 h-3 hover:opacity-80" />
                                </button>
                            </span>
                        )}
                        {filters.location.trim() && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple/10 text-purple border border-purple/20">
                                Location: {filters.location}
                                <button onClick={() => setFilters({ ...filters, location: '' })}>
                                    <X className="w-3 h-3 hover:opacity-80" />
                                </button>
                            </span>
                        )}
                        {filters.college.trim() && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple/10 text-purple border border-purple/20">
                                College: {filters.college}
                                <button onClick={() => setFilters({ ...filters, college: '' })}>
                                    <X className="w-3 h-3 hover:opacity-80" />
                                </button>
                            </span>
                        )}
                    </div>
                )}

                {/* Results Section */}
                <div className="space-y-6">
                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="card p-5 animate-pulse space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-bg-hover" />
                                        <div className="space-y-1.5 flex-1">
                                            <div className="h-4 w-32 bg-bg-hover rounded" />
                                            <div className="h-3 w-20 bg-bg-hover rounded" />
                                        </div>
                                    </div>
                                    <div className="h-4 w-3/4 bg-bg-hover rounded" />
                                    <div className="flex gap-2">
                                        <div className="h-6 w-16 bg-bg-hover rounded-full" />
                                        <div className="h-6 w-16 bg-bg-hover rounded-full" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : error ? (
                        <div className="card text-center py-10 space-y-3">
                            <p className="text-sm text-red-400">{error}</p>
                            <button
                                onClick={() => performSearch(query, activeTab, filters, page)}
                                className="btn-primary text-xs px-4 py-2"
                            >
                                Try Again
                            </button>
                        </div>
                    ) : !searched ? (
                        /* Discovery Starter State */
                        <div className="card text-center py-12 px-6 space-y-6">
                            <div className="w-12 h-12 rounded-2xl bg-purple/10 text-purple flex items-center justify-center mx-auto border border-purple/20">
                                <Sparkles className="w-6 h-6" />
                            </div>
                            <div className="space-y-1.5 max-w-md mx-auto">
                                <h3 className="text-base font-bold text-text-primary">
                                    Discover Builders & Open Opportunities
                                </h3>
                                <p className="text-xs text-text-secondary leading-relaxed">
                                    Type a query above or click a popular tag below to instantly find collaborators by skill, college, or project requirements.
                                </p>
                            </div>
                            <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
                                {SUGGESTED_TAGS.map((tag) => (
                                    <button
                                        key={tag}
                                        onClick={() => {
                                            setQuery(tag);
                                            setPage(1);
                                        }}
                                        className="text-xs px-3 py-1.5 rounded-full bg-bg-hover hover:bg-purple/15 text-text-secondary hover:text-purple transition-all border border-border-default"
                                    >
                                        #{tag}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : builders.length === 0 && projects.length === 0 ? (
                        /* Empty Results */
                        <div className="card text-center py-12 space-y-4">
                            <SearchIcon className="w-10 h-10 text-text-muted mx-auto opacity-60" />
                            <div className="space-y-1">
                                <h3 className="text-sm font-semibold text-text-primary">No results found</h3>
                                <p className="text-xs text-text-secondary max-w-sm mx-auto">
                                    We couldn't find anything matching your search. Try broadening your keywords or removing some filters.
                                </p>
                            </div>
                            {activeFilterCount > 0 && (
                                <button
                                    onClick={handleClearFilters}
                                    className="btn-outline text-xs px-4 py-1.5"
                                >
                                    Clear Filters
                                </button>
                            )}
                        </div>
                    ) : (
                        /* Search Results Content */
                        <div className="space-y-8">
                            {/* Builders Section (Visible in 'all' or 'builders') */}
                            {(activeTab === 'all' || activeTab === 'builders') && builders.length > 0 && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary flex items-center gap-2">
                                            <Users className="w-4 h-4 text-purple" />
                                            <span>Builders ({pagination?.total_users || builders.length})</span>
                                        </h2>
                                        {activeTab === 'all' && (pagination?.has_more_users || builders.length >= 5) && (
                                            <button
                                                onClick={() => handleTabChange('builders')}
                                                className="text-xs text-purple hover:underline font-semibold"
                                            >
                                                View all builders &rarr;
                                            </button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {builders.map((b) => {
                                            const isFollowing = followState[b.id] ?? Boolean(b.is_following);
                                            const isSelf = user?.id === b.id;
                                            const isBusy = followLoading[b.id];

                                            return (
                                                <div
                                                    key={b.id}
                                                    className="card p-4 hover:border-purple/40 transition-all flex flex-col justify-between space-y-3"
                                                >
                                                    <div className="space-y-2.5">
                                                        {/* Top row: Avatar + Name + Follow */}
                                                        <div className="flex items-start justify-between gap-3">
                                                            <Link
                                                                href={`/profile/${b.id}`}
                                                                className="flex items-center gap-3 group min-w-0"
                                                            >
                                                                {b.profile_image || b.avatar_url ? (
                                                                    <img
                                                                        src={b.profile_image || b.avatar_url}
                                                                        alt={b.full_name || b.username}
                                                                        className="w-11 h-11 rounded-full object-cover border border-border-default flex-shrink-0"
                                                                    />
                                                                ) : (
                                                                    <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-purple/30 to-purple-light/20 text-purple-light flex items-center justify-center font-bold text-sm flex-shrink-0 border border-purple/30">
                                                                        {(b.full_name || b.username || 'B')[0].toUpperCase()}
                                                                    </div>
                                                                )}
                                                                <div className="min-w-0">
                                                                    <div className="font-bold text-sm text-text-primary group-hover:text-purple transition-colors truncate">
                                                                        {b.full_name || b.username}
                                                                    </div>
                                                                    <div className="text-xs text-text-secondary truncate">
                                                                        @{b.username}
                                                                    </div>
                                                                </div>
                                                            </Link>

                                                            {!isSelf && (
                                                                <button
                                                                    onClick={() => handleFollowToggle(b.id, isFollowing)}
                                                                    disabled={isBusy}
                                                                    className={`text-xs px-3 py-1 rounded-full font-semibold transition-all flex items-center gap-1.5 flex-shrink-0 ${
                                                                        isFollowing
                                                                            ? 'btn-outline text-text-secondary hover:text-red-400 hover:border-red-400/40'
                                                                            : 'btn-primary'
                                                                    }`}
                                                                >
                                                                    {isFollowing ? (
                                                                        <>
                                                                            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                                                                            <span>Following</span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <UserPlus className="w-3.5 h-3.5" />
                                                                            <span>Follow</span>
                                                                        </>
                                                                    )}
                                                                </button>
                                                            )}
                                                        </div>

                                                        {/* Headline */}
                                                        {b.headline && (
                                                            <p className="text-xs text-text-primary font-medium line-clamp-2">
                                                                {b.headline}
                                                            </p>
                                                        )}

                                                        {/* Verification & Reputation Badges */}
                                                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                                            <VerificationBadge level={b.verification_level} />
                                                            <ReputationBadge score={b.reputation_score} />
                                                        </div>

                                                        {/* Meta (College / Location) */}
                                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-text-secondary">
                                                            {b.college && (
                                                                <span className="flex items-center gap-1">
                                                                    <GraduationCap className="w-3 h-3 text-purple" />
                                                                    <span className="truncate max-w-[140px]">{b.college}</span>
                                                                </span>
                                                            )}
                                                            {b.location && (
                                                                <span className="flex items-center gap-1">
                                                                    <MapPin className="w-3 h-3 text-emerald-400" />
                                                                    <span className="truncate max-w-[120px]">{b.location}</span>
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Skills Tags */}
                                                        {Array.isArray(b.skills) && b.skills.length > 0 && (
                                                            <div className="flex flex-wrap gap-1.5 pt-1">
                                                                {b.skills.slice(0, 4).map((skill: any, idx: number) => {
                                                                    const skillName = typeof skill === 'string' ? skill : (skill?.skill_name || skill?.name);
                                                                    const level = typeof skill === 'object' ? skill?.level : undefined;

                                                                    let levelStyle = 'bg-bg-hover text-text-secondary border-border-default';
                                                                    if (level === 'advanced') {
                                                                        levelStyle = 'bg-purple/10 text-purple-light border-purple/30 font-semibold';
                                                                    } else if (level === 'intermediate') {
                                                                        levelStyle = 'bg-blue-500/10 text-blue-400 border-blue-500/30 font-medium';
                                                                    }

                                                                    return (
                                                                        <span
                                                                            key={idx}
                                                                            className={`text-[10px] px-2 py-0.5 rounded-full border ${levelStyle}`}
                                                                        >
                                                                            {skillName}
                                                                            {level && <span className="opacity-70 ml-1">· {level}</span>}
                                                                        </span>
                                                                    );
                                                                })}
                                                                {b.skills.length > 4 && (
                                                                    <span className="text-[10px] text-text-muted self-center">
                                                                        +{b.skills.length - 4} more
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Footer CTA */}
                                                    <div className="pt-2 border-t border-border-default flex justify-end">
                                                        <Link
                                                            href={`/profile/${b.id}`}
                                                            className="text-xs text-purple hover:underline font-semibold"
                                                        >
                                                            View Profile &rarr;
                                                        </Link>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Projects Section (Visible in 'all' or 'projects') */}
                            {(activeTab === 'all' || activeTab === 'projects') && projects.length > 0 && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary flex items-center gap-2">
                                            <Briefcase className="w-4 h-4 text-purple" />
                                            <span>Projects & Opportunities ({pagination?.total_posts || projects.length})</span>
                                        </h2>
                                        {activeTab === 'all' && (pagination?.has_more_posts || projects.length >= 5) && (
                                            <button
                                                onClick={() => handleTabChange('projects')}
                                                className="text-xs text-purple hover:underline font-semibold"
                                            >
                                                View all projects &rarr;
                                            </button>
                                        )}
                                    </div>

                                    <div className="space-y-4">
                                        {projects.map((post) => (
                                            <div key={post.id} className="space-y-2">
                                                <PostCard
                                                    id={post.id}
                                                    author={post.user?.full_name || post.user?.username || 'Builder'}
                                                    authorAvatar={post.user?.profile_image || post.user?.avatar_url}
                                                    timeAgo={new Date(post.created_at).toLocaleDateString()}
                                                    title={post.title}
                                                    description={post.description}
                                                    tags={post.tags || []}
                                                    likes={post.likes_count || 0}
                                                    comments={post.comments_count || 0}
                                                    is_liked={post.is_liked}
                                                    is_saved={post.is_saved}
                                                    onRefresh={() => performSearch(query, activeTab, filters, page)}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Server-Side Pagination Bar */}
                            {activeTab !== 'all' && pagination && (pagination.total_pages > 1 || pagination.has_next || pagination.has_prev) && (
                                <div className="flex items-center justify-between pt-6 border-t border-border-default">
                                    <button
                                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                                        disabled={page <= 1}
                                        className="btn-outline flex items-center gap-1.5 text-xs px-3 py-1.5 disabled:opacity-40"
                                    >
                                        <ChevronLeft className="w-3.5 h-3.5" />
                                        <span>Previous</span>
                                    </button>

                                    <span className="text-xs text-text-secondary font-medium">
                                        Page {page} of {pagination.total_pages || Math.max(1, Math.ceil((activeTab === 'builders' ? pagination.total_users : pagination.total_posts) / pagination.page_size))}
                                    </span>

                                    <button
                                        onClick={() => setPage((p) => p + 1)}
                                        disabled={pagination.total_pages ? page >= pagination.total_pages : !pagination.has_next}
                                        className="btn-outline flex items-center gap-1.5 text-xs px-3 py-1.5 disabled:opacity-40"
                                    >
                                        <span>Next</span>
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
