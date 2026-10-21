"use client";

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { Heart, MessageCircle, Share2, Users, Bookmark, MoreVertical, Flag, MapPin, Globe, GraduationCap, Lightbulb } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDistance } from '@/lib/geo';
import toast from 'react-hot-toast';
import PostMediaGallery from '@/components/ui/PostMediaGallery';
import BuildWithModal from '@/components/collaboration/BuildWithModal';

interface PostCardProps {
    id: string;
    author: string;
    authorAvatar?: string;
    timeAgo: string;
    title: string;
    description: string;
    tags?: (string | { id: string; tag_name: string })[];
    requirements?: string[] | { role?: string; skill?: string }[];
    likes: number;
    comments: number;
    is_liked?: boolean;
    is_saved?: boolean;
    image?: string;
    images?: string[];
    city?: string;
    distance_km?: number | null;
    is_remote?: boolean;
    view_type?: string;
    college?: string;
    category?: string;
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
    requirements = [],
    likes: initialLikes,
    comments,
    is_liked: initialIsLiked = false,
    is_saved: initialIsSaved = false,
    image,
    images,
    city,
    distance_km,
    is_remote,
    view_type,
    college,
    category,
    onRefresh,
}: PostCardProps) {
    const [likes, setLikes] = useState(initialLikes);
    const [isLiked, setIsLiked] = useState(initialIsLiked);
    const [isSaved, setIsSaved] = useState(initialIsSaved);
    const [isBuildWithOpen, setIsBuildWithOpen] = useState(false);
    const inFlightLikeRef = useRef(false);

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
        if (inFlightLikeRef.current) return;
        inFlightLikeRef.current = true;

        const nextLiked = !isLiked;
        const prevLikes = likes;
        // Clamped optimistic update
        setIsLiked(nextLiked);
        setLikes(nextLiked ? prevLikes + 1 : Math.max(0, prevLikes - 1));

        try {
            const result = await api.toggleLike(id, nextLiked ? 'like' : 'unlike');
            setIsLiked(result.liked);
            if (typeof result.likes_count === 'number') {
                setLikes(result.likes_count);
            }
        } catch (err) {
            setIsLiked(!nextLiked);
            setLikes(prevLikes);
            console.error('Failed to like post:', err);
        } finally {
            inFlightLikeRef.current = false;
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

    const handleBuildWith = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsBuildWithOpen(true);
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
        <div className="w-full card p-5 hover:border-brand-primary/40 hover:shadow-[0_4px_24px_rgba(24,100,255,0.08)] transition-all duration-200 relative group">
            {/* Author & Options */}
            <div className="flex items-center gap-3 mb-4">
                <Link href={`/posts/${id}`} className="flex items-center gap-3 flex-1 min-w-0 group/author">
                    {authorAvatar ? (
                        <img
                            src={authorAvatar}
                            alt={author}
                            className="w-11 h-11 rounded-full object-cover shrink-0 border border-border-default/80 ring-1 ring-white/5"
                        />
                    ) : (
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-brand-primary to-brand-dark shrink-0 flex items-center justify-center text-sm font-bold text-white shadow-md shadow-brand-primary/20 ring-1 ring-brand-primary/30">
                            {author.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-[0.9375rem] text-text-primary group-hover/author:text-brand-light transition-colors">{author}</h3>
                        <p className="text-text-muted text-xs">{timeAgo}</p>
                    </div>
                </Link>

                    {/* Options Menu */}
                    <div className="relative" ref={menuRef}>
                        <button
                            type="button"
                            onClick={handleMenuToggle}
                            aria-label="Post options"
                            aria-expanded={showMenu}
                            className="p-1.5 rounded-lg text-text-muted hover:bg-bg-hover hover:text-text-primary active:scale-90 transition-all opacity-70 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
                        >
                            <MoreVertical className="w-4 h-4" />
                        </button>
                        {showMenu && (
                            <div className="absolute right-0 top-full mt-1 w-44 bg-bg-card-elevated border border-border-light rounded-xl shadow-xl shadow-black/30 z-50 animate-scale-in overflow-hidden">
                                <button
                                    type="button"
                                    onClick={handleReportClick}
                                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-left hover:bg-bg-hover active:bg-red-500/10 transition-colors text-red-400"
                                >
                                    <Flag className="w-4 h-4" />
                                    Report Post
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Discovery Badges: Remote, Distance, College, Open Idea */}
                {(is_remote || distance_km !== undefined || city || view_type === 'college' || view_type === 'openidea' || category) && (
                    <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                        {is_remote && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <Globe className="w-3 h-3" /> Remote
                            </span>
                        )}
                        {!is_remote && distance_km !== undefined && distance_km !== null && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                <MapPin className="w-3 h-3" /> {city ? `${city} · ` : ''}{formatDistance(distance_km)}
                            </span>
                        )}
                        {!is_remote && (distance_km === undefined || distance_km === null) && city && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/5 text-text-secondary border border-white/10">
                                <MapPin className="w-3 h-3" /> {city}
                            </span>
                        )}
                        {view_type === 'college' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-primary/10 text-brand-light border border-brand-primary/20">
                                <GraduationCap className="w-3 h-3" /> {college || 'Campus Exclusive'}
                            </span>
                        )}
                        {view_type === 'openidea' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                <Lightbulb className="w-3 h-3" /> Open Idea
                            </span>
                        )}
                        {category && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#212130] text-text-secondary">
                                {category}
                            </span>
                        )}
                    </div>
                )}

            {/* Content */}
            <Link href={`/posts/${id}`} className="block group/content">
                <h2 className="text-lg font-bold mb-1.5 leading-snug group-hover/content:text-brand-light transition-colors">{title}</h2>
                <p className="text-text-secondary text-[0.9375rem] mb-4 line-clamp-2 leading-relaxed">{description}</p>
            </Link>

            {/* Post Media Gallery (Instagram-style Swipeable Carousel) */}
            <PostMediaGallery
                images={images && images.length > 0 ? images : (image ? [image] : [])}
                altTitle={title}
                postId={id}
                onDoubleTapLike={() => {
                    if (!isLiked) {
                        setIsLiked(true);
                        setLikes((prev) => prev + 1);
                        api.ensureLiked(id).then((res) => {
                            setIsLiked(res.liked);
                            if (typeof res.likes_count === 'number') {
                                setLikes(res.likes_count);
                            }
                        }).catch(() => {});
                    }
                }}
            />

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
            <div className="flex items-center gap-3 sm:gap-4 pt-3 border-t border-border-default">
                <button
                    type="button"
                    onClick={handleLike}
                    aria-label={isLiked ? `Unlike post (${likes} likes)` : `Like post (${likes} likes)`}
                    className={`flex items-center gap-1.5 text-sm py-1 px-2 rounded-lg transition-all duration-150 active:scale-90 select-none hover:bg-white/[0.04] ${
                        isLiked ? 'text-red-500 font-medium' : 'text-text-muted hover:text-red-500'
                    }`}
                >
                    <Heart className={`w-[18px] h-[18px] transition-transform duration-200 ${isLiked ? 'fill-current scale-110 text-red-500 animate-tactile-pop' : ''}`} />
                    <span>{likes}</span>
                </button>
                <Link
                    href={`/posts/${id}#comments`}
                    aria-label={`View ${comments} comments`}
                    className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary py-1 px-2 rounded-lg transition-all duration-150 active:scale-90 hover:bg-white/[0.04] select-none"
                >
                    <MessageCircle className="w-[18px] h-[18px]" />
                    <span>{comments}</span>
                </Link>
                <button
                    type="button"
                    onClick={handleShare}
                    aria-label="Share post link"
                    className="flex items-center gap-1.5 text-sm text-text-muted hover:text-primary py-1 px-2 rounded-lg transition-all duration-150 active:scale-90 hover:bg-white/[0.04] select-none"
                >
                    <Share2 className="w-[18px] h-[18px]" />
                    <span>Share</span>
                </button>
                <button
                    type="button"
                    onClick={handleSave}
                    aria-label={isSaved ? "Remove from saved items" : "Save post to bookmarks"}
                    className={`flex items-center gap-1.5 text-sm py-1 px-2 rounded-lg transition-all duration-150 active:scale-90 hover:bg-white/[0.04] select-none ${
                        isSaved ? 'text-yellow-500' : 'text-text-muted hover:text-yellow-500'
                    }`}
                >
                    <Bookmark className={`w-[18px] h-[18px] transition-transform duration-200 ${isSaved ? 'fill-current scale-110 text-yellow-500 animate-tactile-pop' : ''}`} />
                </button>
                <button
                    type="button"
                    onClick={handleBuildWith}
                    className="flex items-center gap-1.5 text-xs text-brand-light bg-brand-primary/10 hover:bg-brand-primary/20 active:bg-brand-primary/30 border border-brand-primary/30 px-3 py-1.5 rounded-lg transition-all ml-auto font-semibold shadow-[0_0_12px_rgba(24,100,255,0.12)] hover:scale-[1.02] active:scale-[0.96] select-none"
                >
                    <Users className="w-3.5 h-3.5 text-brand-light" />
                    <span>Build With</span>
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

            {/* Build With Questionnaire Modal */}
            <BuildWithModal
                isOpen={isBuildWithOpen}
                onClose={() => setIsBuildWithOpen(false)}
                postId={id}
                postTitle={title}
                postRequirements={requirements}
                onRequestSent={() => {
                    toast.success('Build With proposal submitted!');
                    if (onRefresh) onRefresh();
                }}
            />
        </div>
    );
}
