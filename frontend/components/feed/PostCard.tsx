"use client";

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { Heart, MessageCircle, Share2, Users, Bookmark, MoreVertical, Flag } from 'lucide-react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface PostCardProps {
    id: string;
    author: string;
    authorAvatar?: string;
    timeAgo: string;
    title: string;
    description: string;
    tags?: (string | { id: string; tag_name: string })[];
    likes: number;
    comments: number;
    is_liked?: boolean;
    is_saved?: boolean;
    image?: string;
    onRefresh?: () => void;
}

export default function PostCard({
    id,
    author,
    authorAvatar,
    timeAgo,
    title,
    description,
    tags = [],
    likes: initialLikes,
    comments,
    is_liked: initialIsLiked = false,
    is_saved: initialIsSaved = false,
    image,
    onRefresh,
}: PostCardProps) {
    const [likes, setLikes] = useState(initialLikes);
    const [isLiked, setIsLiked] = useState(initialIsLiked);
    const [isSaved, setIsSaved] = useState(initialIsSaved);

    // Sync state with prop updates (e.g. parent re-fetches data)
    useEffect(() => { setLikes(initialLikes); }, [initialLikes]);
    useEffect(() => { setIsLiked(initialIsLiked); }, [initialIsLiked]);
    useEffect(() => { setIsSaved(initialIsSaved); }, [initialIsSaved]);

    const [savingInProgress, setSavingInProgress] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showReportConfirm, setShowReportConfirm] = useState(false);
    const [reportReason, setReportReason] = useState('');
    const [reporting, setReporting] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Normalize tags: backend returns [{id, tag_name}], we just need the string
    const normalizedTags = tags.map((t) =>
        typeof t === 'string' ? t : t.tag_name
    );

    // Close menu on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setShowMenu(false);
            }
        };
        if (showMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showMenu]);

    const handleLike = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        try {
            const result = await api.toggleLike(id);
            setIsLiked(result.liked);
            setLikes(result.liked ? likes + 1 : likes - 1);
        } catch (err) {
            console.error('Failed to like post:', err);
        }
    };

    const handleSave = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (savingInProgress) return;

        setSavingInProgress(true);
        const wasSaved = isSaved;
        setIsSaved(!wasSaved); // optimistic

        try {
            const result = await api.savePost(id);
            setIsSaved(result.saved);
        } catch {
            setIsSaved(wasSaved); // revert
            toast.error('Failed to save post');
        } finally {
            setSavingInProgress(false);
        }
    };

    const handleBuildWith = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        try {
            await api.sendCollaborationRequest(id, 'I would love to collaborate!');
            toast.success('Collaboration request sent!');
        } catch (err: any) {
            toast.error(err.message || 'Failed to send request');
        }
    };

    const handleShare = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const url = `${window.location.origin}/posts/${id}`;
        try {
            await navigator.clipboard.writeText(url);
            toast.success('Link copied to clipboard!');
        } catch {
            toast.error('Failed to copy link');
        }
    };

    const handleMenuToggle = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setShowMenu(!showMenu);
    };

    const handleReportClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setShowMenu(false);
        setShowReportConfirm(true);
    };

    const handleReportSubmit = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (reporting) return;

        setReporting(true);
        try {
            await api.reportPost(id, reportReason || 'Inappropriate content');
            toast.success('Post reported successfully');
            setShowReportConfirm(false);
            setReportReason('');
        } catch (err: any) {
            toast.error(err.message || 'Failed to report post');
        } finally {
            setReporting(false);
        }
    };

    const handleReportCancel = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setShowReportConfirm(false);
        setReportReason('');
    };

    return (
        <Link href={`/posts/${id}`}>
            <div className="w-full bg-[#171722] border border-[#252533] rounded-xl p-4 hover:border-purple/40 hover:shadow-lg hover:shadow-purple/5 transition-all duration-200 cursor-pointer relative group">
                {/* Author & Options */}
                <div className="flex items-center gap-3 mb-4">
                    {authorAvatar ? (
                        <img
                            src={authorAvatar}
                            alt={author}
                            className="w-11 h-11 rounded-full object-cover shrink-0 border-2 border-[#252533]"
                        />
                    ) : (
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple to-purple-dark shrink-0 flex items-center justify-center text-sm font-bold text-white shadow-md shadow-purple/20">
                            {author.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-[0.9375rem]">{author}</h3>
                        <p className="text-text-muted text-xs">{timeAgo}</p>
                    </div>

                    {/* Options Menu */}
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={handleMenuToggle}
                            className="p-1.5 rounded-lg text-text-muted hover:bg-bg-hover hover:text-text-primary transition-all opacity-0 group-hover:opacity-100"
                        >
                            <MoreVertical className="w-4 h-4" />
                        </button>
                        {showMenu && (
                            <div className="absolute right-0 top-full mt-1 w-44 bg-bg-card-elevated border border-border-light rounded-xl shadow-xl shadow-black/30 z-50 animate-scale-in overflow-hidden">
                                <button
                                    onClick={handleReportClick}
                                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-left hover:bg-bg-hover transition-colors text-red-400"
                                >
                                    <Flag className="w-4 h-4" />
                                    Report Post
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Content */}
                <h2 className="text-lg font-bold mb-1.5 leading-snug">{title}</h2>
                <p className="text-text-secondary text-[0.9375rem] mb-4 line-clamp-2 leading-relaxed">{description}</p>

                {/* Post Image */}
                {image && (
                    <div className="mt-1 mb-4 rounded-xl overflow-hidden border border-[#252533]">
                        <img
                            src={image}
                            alt="Post image"
                            className="w-full h-auto max-h-[500px] object-cover hover:scale-[1.01] transition-transform duration-300"
                        />
                    </div>
                )}

                {/* Tags */}
                {normalizedTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                        {normalizedTags.slice(0, 5).map((tag, i) => (
                            <span key={i} className="pill text-xs">#{tag}</span>
                        ))}
                        {normalizedTags.length > 5 && (
                            <span className="text-text-secondary text-sm">+{normalizedTags.length - 5} more</span>
                        )}
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-5 pt-3 border-t border-border-default">
                    <button
                        onClick={handleLike}
                        className={`flex items-center gap-1.5 text-sm transition-colors ${isLiked ? 'text-red-500' : 'text-text-muted hover:text-red-500'
                            }`}
                    >
                        <Heart className={`w-[18px] h-[18px] ${isLiked ? 'fill-current' : ''}`} />
                        <span>{likes}</span>
                    </button>
                    <div className="flex items-center gap-1.5 text-sm text-text-muted">
                        <MessageCircle className="w-[18px] h-[18px]" />
                        <span>{comments}</span>
                    </div>
                    <button
                        onClick={handleShare}
                        className="flex items-center gap-1.5 text-sm text-text-muted hover:text-primary transition-colors"
                    >
                        <Share2 className="w-[18px] h-[18px]" />
                        <span>Share</span>
                    </button>
                    <button
                        onClick={handleSave}
                        className={`flex items-center gap-1.5 text-sm transition-colors ${isSaved ? 'text-yellow-500' : 'text-text-muted hover:text-yellow-500'}`}
                    >
                        <Bookmark className={`w-[18px] h-[18px] ${isSaved ? 'fill-current' : ''}`} />
                    </button>
                    <button
                        onClick={handleBuildWith}
                        className="flex items-center gap-1.5 text-sm text-purple hover:text-purple-light transition-colors ml-auto"
                    >
                        <Users className="w-[18px] h-[18px]" />
                        <span className="font-semibold">Build With</span>
                    </button>
                </div>

                {/* Report Confirmation Modal */}
                {showReportConfirm && (
                    <div
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={handleReportCancel}
                    >
                        <div
                            className="bg-bg-card border border-border-light rounded-2xl p-6 w-full max-w-md animate-scale-in shadow-2xl shadow-black/50"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className="text-lg font-bold mb-4">Report Post</h3>
                            <p className="text-text-secondary text-sm mb-4">
                                Why are you reporting this post?
                            </p>
                            <textarea
                                value={reportReason}
                                onChange={(e) => setReportReason(e.target.value)}
                                className="input w-full resize-none mb-4"
                                rows={3}
                                placeholder="Describe the issue..."
                            />
                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={handleReportCancel}
                                    className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleReportSubmit}
                                    disabled={reporting}
                                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                                >
                                    {reporting ? 'Reporting...' : 'Report'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Link>
    );
}
