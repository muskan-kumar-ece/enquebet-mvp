"use client";

import { useState, useEffect } from 'react';
import { Search as SearchIcon, Filter, MapPin, GraduationCap } from 'lucide-react';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { api } from '@/lib/api';
import PostCard from '@/components/feed/PostCard';
import Link from 'next/link';

export default function SearchPage() {
    const { user, loading: authLoading } = useRequireAuth();
    const [query, setQuery] = useState('');
    const [filters, setFilters] = useState({
        category: 'all',
        location: '',
        college: '',
    });
    const [userResults, setUserResults] = useState<any[]>([]);
    const [postResults, setPostResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [searched, setSearched] = useState(false);

    const applyClientFilters = (input: { users: any[]; posts: any[] }) => {
        const category = filters.category;
        const location = filters.location.trim().toLowerCase();
        const college = filters.college.trim().toLowerCase();

        const filteredPosts = input.posts.filter((p) => {
            if (category && category !== 'all') {
                const pCat = String(p.category || '').toLowerCase();
                if (pCat && pCat !== category.toLowerCase()) return false;
            }
            if (location) {
                const pLoc = String(p.location || '').toLowerCase();
                if (pLoc && !pLoc.includes(location)) return false;
            }
            return true;
        });

        const filteredUsers = input.users.filter((u) => {
            if (!college) return true;
            const uCollege = String(u.college || '').toLowerCase();
            return uCollege.includes(college);
        });

        return { users: filteredUsers, posts: filteredPosts };
    };

    const handleSearch = async (q?: string) => {
        const effectiveQuery = (q ?? query).trim();
        if (!effectiveQuery) return;

        setLoading(true);
        setError('');
        setSearched(true);

        try {
            const resp = await api.search(effectiveQuery, { type: 'all' });
            const filtered = applyClientFilters({
                users: Array.isArray(resp?.users) ? resp.users : [],
                posts: Array.isArray(resp?.posts) ? resp.posts : [],
            });
            setUserResults(filtered.users);
            setPostResults(filtered.posts);
        } catch (err: any) {
            setError(err.message || 'Search failed');
            setUserResults([]);
            setPostResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    // Type-as-you-search (debounced) — also re-triggers when filters change
    useEffect(() => {
        const trimmed = query.trim();
        if (!trimmed) {
            setSearched(false);
            setError('');
            setUserResults([]);
            setPostResults([]);
            return;
        }

        const timer = setTimeout(() => {
            handleSearch(trimmed);
        }, 350);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query, filters.category, filters.location, filters.college]);

    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-text-secondary">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold mb-4">Search</h1>

                    {/* Search Bar */}
                    <div className="flex gap-3">
                        <div className="flex-1 relative">
                            <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-secondary" />
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Search for posts, users, skills..."
                                className="input w-full pl-12"
                            />
                        </div>
                        <button
                            onClick={() => handleSearch()}
                            disabled={!query.trim() || loading}
                            className="btn-primary px-6"
                        >
                            {loading ? 'Searching...' : 'Search'}
                        </button>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`btn-outline flex items-center gap-2 ${showFilters ? 'bg-purple/10' : ''
                                }`}
                        >
                            <Filter className="w-5 h-5" />
                            <span>Filters</span>
                        </button>
                    </div>

                    {/* Filters */}
                    {showFilters && (
                        <div className="card mt-4">
                            <h3 className="font-semibold mb-4">Filters</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Category</label>
                                    <select
                                        value={filters.category}
                                        onChange={(e) =>
                                            setFilters({ ...filters, category: e.target.value })
                                        }
                                        className="input w-full"
                                    >
                                        <option value="all">All Categories</option>
                                        <option value="tech">Technology</option>
                                        <option value="business">Business</option>
                                        <option value="design">Design</option>
                                        <option value="research">Research</option>
                                        <option value="social">Social Impact</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">Location</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-secondary" />
                                        <input
                                            type="text"
                                            value={filters.location}
                                            onChange={(e) =>
                                                setFilters({ ...filters, location: e.target.value })
                                            }
                                            placeholder="e.g., Hyderabad"
                                            className="input w-full pl-10"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">College</label>
                                    <div className="relative">
                                        <GraduationCap className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-secondary" />
                                        <input
                                            type="text"
                                            value={filters.college}
                                            onChange={(e) =>
                                                setFilters({ ...filters, college: e.target.value })
                                            }
                                            placeholder="e.g., IIT Hyderabad"
                                            className="input w-full pl-10"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-4">
                                <button
                                    onClick={() =>
                                        setFilters({ category: 'all', location: '', college: '' })
                                    }
                                    className="text-text-secondary hover:text-text-primary text-sm"
                                >
                                    Clear Filters
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Results */}
                <div className="space-y-4">
                    {loading ? (
                        <div className="card text-center py-12">
                            <div className="text-text-secondary">Searching...</div>
                        </div>
                    ) : error ? (
                        <div className="card text-center py-12">
                            <p className="text-red-500 mb-4">{error}</p>
                            <button onClick={() => handleSearch()} className="btn-primary">
                                Try Again
                            </button>
                        </div>
                    ) : searched ? (
                        <>
                            <div className="text-text-secondary mb-4">
                                Found {userResults.length + postResults.length} result{(userResults.length + postResults.length) !== 1 ? 's' : ''}
                            </div>

                            {/* Users */}
                            <div className="card">
                                <h2 className="text-lg font-bold mb-3">Users</h2>
                                {userResults.length > 0 ? (
                                    <div className="space-y-2">
                                        {userResults.map((u) => (
                                            <Link
                                                key={u.id}
                                                href={`/profile/${u.id}`}
                                                className="block p-3 rounded-lg hover:bg-bg-hover transition-colors"
                                            >
                                                <div className="font-semibold">{u.full_name || u.username}</div>
                                                <div className="text-text-secondary text-sm">@{u.username}</div>
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-text-secondary text-sm">No users found.</p>
                                )}
                            </div>

                            {/* Posts */}
                            <div className="card">
                                <h2 className="text-lg font-bold mb-3">Posts</h2>
                                {postResults.length > 0 ? (
                                    <div className="space-y-4">
                                        {postResults.map((post) => (
                                            <PostCard
                                                key={post.id}
                                                id={post.id}
                                                author={post.user?.full_name || post.user?.username || 'Anonymous'}
                                                timeAgo={new Date(post.created_at).toLocaleDateString()}
                                                title={post.title}
                                                description={post.description}
                                                tags={post.tags || []}
                                                likes={post.likes_count || 0}
                                                comments={post.comments_count || 0}
                                                onRefresh={() => handleSearch()}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-text-secondary text-sm">No posts found.</p>
                                )}
                            </div>

                            {userResults.length === 0 && postResults.length === 0 && (
                                <div className="card text-center py-12">
                                    <p className="text-text-secondary">No results found. Try different keywords.</p>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="card text-center py-12">
                            <SearchIcon className="w-12 h-12 text-text-secondary mx-auto mb-4" />
                            <p className="text-text-secondary">
                                Start searching to find posts, users, and collaborators
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
