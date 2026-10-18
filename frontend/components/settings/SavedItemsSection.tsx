"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
    Bookmark, Trash2, ExternalLink, Search, 
    RefreshCw, MessageSquare, Heart, Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';

export function SavedItemsSection() {
    const [savedPosts, setSavedPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [unsavingId, setUnsavingId] = useState<string | null>(null);

    const loadSaved = async () => {
        setLoading(true);
        try {
            const data = await api.getSavedPosts();
            setSavedPosts(data);
        } catch (err: any) {
            console.error('Failed to load saved posts:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSaved();
    }, []);

    const handleUnsave = async (postId: string) => {
        setUnsavingId(postId);
        try {
            await api.savePost(postId);
            setSavedPosts(prev => prev.filter(p => p.id !== postId));
            toast.success('Removed from saved items');
        } catch (err: any) {
            toast.error('Failed to unsave post');
        } finally {
            setUnsavingId(null);
        }
    };

    const filtered = savedPosts.filter(p => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            p.title?.toLowerCase().includes(q) ||
            p.description?.toLowerCase().includes(q) ||
            p.user?.username?.toLowerCase().includes(q) ||
            p.category?.toLowerCase().includes(q)
        );
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="border-b border-[#1e2335] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Bookmark className="w-5 h-5 text-[#1864ff]" />
                        Saved Things & Bookmarks
                    </h2>
                    <p className="text-xs text-text-secondary mt-0.5">
                        Quick access to engineering articles, project ideas, and discussion threads you bookmarked.
                    </p>
                </div>

                {savedPosts.length > 0 && (
                    <div className="relative w-full sm:w-64">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-text-secondary" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Filter bookmarks..."
                            className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl bg-[#0b0d14] border border-[#1e2335] text-white placeholder-text-secondary/50 focus:outline-none focus:border-[#1864ff]"
                        />
                    </div>
                )}
            </div>

            {loading ? (
                <div className="p-12 text-center text-xs text-text-secondary">
                    <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-[#1864ff]" />
                    Retrieving your saved bookmarks...
                </div>
            ) : filtered.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-[#0b0d14] border border-[#1e2335] space-y-3">
                    <Bookmark className="w-10 h-10 text-slate-600 mx-auto" />
                    <h3 className="text-sm font-bold text-white">No Saved Items Found</h3>
                    <p className="text-xs text-text-secondary max-w-sm mx-auto">
                        {searchQuery 
                            ? 'No bookmarks match your search filter.' 
                            : 'When you find interesting engineering updates, project announcements, or discussions, click the bookmark icon to save them here.'}
                    </p>
                    <Link
                        href="/"
                        className="btn-brand inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl text-white mt-2"
                    >
                        <span>Explore Builder Feed</span>
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3">
                    {filtered.map((post) => (
                        <div
                            key={post.id}
                            className="p-4 rounded-xl bg-[#0b0d14] border border-[#1e2335] hover:border-slate-700 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                            <div className="space-y-1.5 min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    {post.category && (
                                        <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-[#1864ff]/10 text-[#1864ff] border border-[#1864ff]/20">
                                            {post.category}
                                        </span>
                                    )}
                                    <span className="text-[11px] text-text-secondary">
                                        by <strong className="text-slate-300 font-semibold">@{post.user?.username || 'builder'}</strong>
                                    </span>
                                </div>

                                <Link
                                    href={`/posts/${post.id}`}
                                    className="text-sm font-bold text-white hover:text-[#1864ff] transition-colors line-clamp-1 block"
                                >
                                    {post.title}
                                </Link>

                                {post.description && (
                                    <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
                                        {post.description}
                                    </p>
                                )}

                                <div className="flex items-center gap-4 text-[10px] text-text-secondary pt-1">
                                    <span className="flex items-center gap-1">
                                        <Heart className="w-3 h-3 text-rose-400" />
                                        {post.likes_count || 0}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <MessageSquare className="w-3 h-3 text-[#1864ff]" />
                                        {post.comments_count || 0}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {new Date(post.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                <Link
                                    href={`/posts/${post.id}`}
                                    className="p-2 rounded-lg bg-surface hover:bg-surface-hover text-slate-300 hover:text-white border border-[#1e2335] transition-colors"
                                    title="View Post"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                </Link>

                                <button
                                    type="button"
                                    disabled={unsavingId === post.id}
                                    onClick={() => handleUnsave(post.id)}
                                    className="p-2 rounded-lg bg-surface hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 border border-[#1e2335] hover:border-rose-500/30 transition-colors"
                                    title="Remove from Saved"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
