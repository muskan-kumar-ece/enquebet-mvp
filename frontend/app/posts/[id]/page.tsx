"use client";

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Heart, MessageCircle, Share2, Users, Send, ArrowLeft, MessageSquare, Bookmark, Check, Trash2, Kanban } from 'lucide-react';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import PostMediaGallery from '@/components/ui/PostMediaGallery';
import BuildWithModal from '@/components/collaboration/BuildWithModal';

export default function PostDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user, loading: authLoading } = useRequireAuth();

    const [post, setPost] = useState<any>(null);
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [isLiked, setIsLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(0);
    const [isBuildWithOpen, setIsBuildWithOpen] = useState(false);
    const [sendingRequest, setSendingRequest] = useState(false);
    const [sendingMessage, setSendingMessage] = useState(false);
    const [sendingComment, setSendingComment] = useState(false);
    const [error, setError] = useState('');
    const inFlightLikeRef = useRef(false);
    const inFlightCommentRef = useRef(false);

    useEffect(() => {
        if (!authLoading && user) {
            fetchPost();
        }
    }, [params.id, authLoading, user]);

    const fetchPost = async () => {
        setLoading(true);
        setError('');

        try {
            // Fetch post and comments in parallel
            const [postData, commentsData] = await Promise.all([
                api.getPost(params.id as string),
                api.getComments(params.id as string),
            ]);
            setPost(postData);
            setIsLiked(postData.is_liked ?? false);
            setLikesCount(postData.likes_count ?? 0);
            setComments(commentsData);
        } catch (err: any) {
            setError(err.message || 'Failed to load post');
        } finally {
            setLoading(false);
        }
    };

    const handleLike = async () => {
        if (!params.id || inFlightLikeRef.current) return;
        inFlightLikeRef.current = true;

        const nextLiked = !isLiked;
        const prevLikes = likesCount;
        setIsLiked(nextLiked);
        setLikesCount(nextLiked ? prevLikes + 1 : Math.max(0, prevLikes - 1));

        try {
            const result = await api.toggleLike(params.id as string, nextLiked ? 'like' : 'unlike');
            setIsLiked(result.liked);
            if (typeof result.likes_count === 'number') {
                setLikesCount(result.likes_count);
            }
        } catch (err: any) {
            setIsLiked(!nextLiked);
            setLikesCount(prevLikes);
            toast.error('Failed to update like');
        } finally {
            inFlightLikeRef.current = false;
        }
    };

    const handleMessage = async () => {
        if (!post?.user?.id) return;
        setSendingMessage(true);
        try {
            const { conversation_id } = await api.startDM(post.user.id);
            router.push(`/messages?convo=${conversation_id}`);
        } catch (err: any) {
            toast.error(err.message || 'Failed to start conversation');
        } finally {
            setSendingMessage(false);
        }
    };

    const handleCollabRequest = async () => {
        setSendingRequest(true);
        try {
            await api.sendCollaborationRequest(params.id as string, 'I would love to collaborate on this project!');
            toast.success('Collaboration request sent!');
        } catch (err: any) {
            toast.error(err.message || 'Failed to send request');
        } finally {
            setSendingRequest(false);
        }
    };

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard!');
    };

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        const content = newComment.trim();
        if (!content || inFlightCommentRef.current) return;

        inFlightCommentRef.current = true;
        setSendingComment(true);

        const clientCommentId = typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `comm_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

        try {
            const comment = await api.addComment(params.id as string, content, clientCommentId);
            setComments(prev => {
                if (prev.some(c => c.id === comment.id)) return prev;
                return [...prev, comment];
            });
            setNewComment('');
            if (typeof comment.post_comments_count === 'number') {
                setPost((prev: any) => prev ? { ...prev, comments_count: comment.post_comments_count } : prev);
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to add comment');
        } finally {
            setSendingComment(false);
            inFlightCommentRef.current = false;
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        if (!commentId || !params.id) return;
        try {
            await api.deleteComment(params.id as string, commentId);
            setComments(prev => prev.filter(c => c.id !== commentId));
            toast.success('Comment deleted');
        } catch (err: any) {
            console.error('Delete comment error:', err);
            toast.error(err.message || 'Failed to delete comment');
        }
    };

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-text-secondary animate-pulse">Loading post...</div>
            </div>
        );
    }

    if (error || !post) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="card text-center py-12">
                    <p className="text-red-500 mb-4">{error || 'Post not found'}</p>
                    <button onClick={() => router.push('/')} className="btn-primary">
                        Back to Feed
                    </button>
                </div>
            </div>
        );
    }

    const isOwnPost = post.user?.id === user?.id;

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-4xl mx-auto space-y-6">

                {/* Back button */}
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-text-muted hover:text-primary transition-colors text-sm"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                </button>

                {/* Post Card */}
                <div className="card">
                    {/* Author row */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div
                                className="w-11 h-11 rounded-full bg-gradient-to-br from-brand-primary to-brand-dark shrink-0 flex items-center justify-center cursor-pointer ring-2 ring-brand-primary/20 shadow-md"
                                onClick={() => router.push(`/profile/${post.user?.id}`)}
                            >
                                {post.user?.avatar_url ? (
                                    <img src={post.user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                                ) : (
                                    <span className="font-bold text-white">
                                        {(post.user?.full_name || post.user?.username || 'A')[0].toUpperCase()}
                                    </span>
                                )}
                            </div>
                            <div>
                                <h3
                                    className="font-bold text-text-primary cursor-pointer hover:text-brand-light transition-colors"
                                    onClick={() => router.push(`/profile/${post.user?.id}`)}
                                >
                                    {post.user?.full_name || post.user?.username || 'Anonymous'}
                                </h3>
                                <p className="text-text-secondary text-sm">
                                    {post.category} · {new Date(post.created_at).toLocaleDateString()}
                                </p>
                            </div>
                        </div>

                        {/* Message button — only for other users' posts */}
                        {!isOwnPost && (
                            <button
                                onClick={handleMessage}
                                disabled={sendingMessage}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-hover border border-border-default hover:border-brand-primary text-text-secondary hover:text-brand-light transition-all"
                            >
                                <MessageSquare className="w-4 h-4" />
                                <span className="text-sm font-medium">
                                    {sendingMessage ? 'Opening...' : 'Message'}
                                </span>
                            </button>
                        )}
                    </div>

                    {/* Media Gallery */}
                    {(() => {
                        const imageAttachments = (post.attachments || [])
                            .filter((a: any) => a.file_type === 'image' && a.file_url)
                            .map((a: any) => a.file_url);
                        const allImages = imageAttachments.length > 0
                            ? imageAttachments
                            : (post.image || post.image_url ? [post.image || post.image_url] : []);

                        return (
                            <PostMediaGallery
                                images={allImages}
                                altTitle={post.title}
                                className="mb-6"
                                postId={post.id}
                                onDoubleTapLike={() => {
                                    if (!isLiked) {
                                        setIsLiked(true);
                                        setLikesCount((prev) => prev + 1);
                                        api.ensureLiked(post.id).then((res) => {
                                            setIsLiked(res.liked);
                                            if (typeof res.likes_count === 'number') {
                                                setLikesCount(res.likes_count);
                                            }
                                        }).catch(() => {});
                                    }
                                }}
                            />
                        );
                    })()}

                    {/* Title & Description */}
                    <h1 className="text-2xl font-bold mb-3">{post.title}</h1>
                    <p className="text-text-secondary mb-6 leading-relaxed">
                        {post.description}
                    </p>

                    {/* Location / College chips */}
                    {(post.location || post.college) && (
                        <div className="flex flex-wrap gap-2 mb-6">
                            {post.location && (
                                <span className="pill">📍 {post.location}</span>
                            )}
                            {post.college && (
                                <span className="pill">🎓 {post.college}</span>
                            )}
                        </div>
                    )}

                    {/* Requirements */}
                    {post.requirements && post.requirements.length > 0 && (
                        <div className="mb-6 p-4 rounded-xl bg-bg-hover border border-border-default">
                            <h3 className="font-semibold mb-3 flex items-center gap-2">
                                <Users className="w-4 h-4 text-brand-light" />
                                Looking for:
                            </h3>
                            <ul className="space-y-2">
                                {post.requirements.map((req: any, i: number) => (
                                    <li key={i} className="flex items-center gap-2 text-text-secondary">
                                        <span className="w-2 h-2 rounded-full bg-brand-primary shrink-0" />
                                        <span>{typeof req === 'string' ? req : req.role_name}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Tags */}
                    {post.tags && post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-6">
                            {post.tags.map((tag: any, i: number) => (
                                <span key={i} className="pill-brand">#{typeof tag === 'string' ? tag : tag.tag_name}</span>
                            ))}
                        </div>
                    )}

                    {/* Action bar */}
                    <div className="flex items-center gap-6 pt-6 border-t border-border-default">
                        {/* Like */}
                        <button
                            onClick={handleLike}
                            className={`flex items-center gap-2 transition-colors ${isLiked ? 'text-red-500' : 'text-text-secondary hover:text-red-500'}`}
                        >
                            <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                            <span>{likesCount}</span>
                        </button>

                        {/* Comments count */}
                        <button className="flex items-center gap-2 text-text-secondary hover:text-primary transition-colors">
                            <MessageCircle className="w-5 h-5" />
                            <span>{comments.length}</span>
                        </button>

                        {/* Share */}
                        <button
                            onClick={handleShare}
                            className="flex items-center gap-2 text-text-secondary hover:text-primary transition-colors"
                        >
                            <Share2 className="w-5 h-5" />
                            <span>Share</span>
                        </button>

                        {/* Project Workspace Link */}
                        <Link
                            href={`/workspace/${post.id}`}
                            className="btn-secondary text-xs flex items-center gap-1.5 ml-auto py-1.5 px-3"
                        >
                            <Kanban className="w-3.5 h-3.5 text-brand-light" />
                            <span>Workspace</span>
                        </Link>

                        {/* Build With — only for other users' posts */}
                        {!isOwnPost && (
                            <button
                                onClick={() => setIsBuildWithOpen(true)}
                                disabled={post.has_requested_collaboration}
                                className={`flex items-center gap-2 transition-colors font-medium ${post.has_requested_collaboration
                                    ? 'text-emerald-400 cursor-default'
                                    : 'text-brand-light hover:text-white'
                                    }`}
                            >
                                {post.has_requested_collaboration ? (
                                    <>
                                        <Check className="w-5 h-5" />
                                        <span>Request Sent</span>
                                    </>
                                ) : (
                                    <>
                                        <Users className="w-5 h-5" />
                                        <span>Build With</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* Build With Proposal Modal */}
                <BuildWithModal
                    isOpen={isBuildWithOpen}
                    onClose={() => setIsBuildWithOpen(false)}
                    postId={post.id}
                    postTitle={post.title}
                    postRequirements={post.requirements}
                    onRequestSent={() => {
                        setPost((prev: any) => prev ? { ...prev, has_requested_collaboration: true } : prev);
                        toast.success('Build With proposal submitted!');
                    }}
                />

                {/* Comments Section */}
                <div className="card">
                    <h2 className="text-lg font-bold mb-6">Comments ({comments.length})</h2>

                    {/* Add Comment */}
                    <form onSubmit={handleAddComment} className="mb-6">
                        <div className="flex gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-primary to-brand-dark ring-1 ring-white/10 shrink-0 flex items-center justify-center font-bold text-sm text-white">
                                {(user?.full_name || user?.username || 'U')[0].toUpperCase()}
                            </div>
                            <div className="flex-1 flex gap-2">
                                <input
                                    type="text"
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="Write a comment..."
                                    className="input flex-1"
                                    disabled={sendingComment}
                                />
                                <button
                                    type="submit"
                                    disabled={!newComment.trim() || sendingComment}
                                    className="btn-primary flex items-center gap-2 shrink-0"
                                >
                                    <Send className="w-4 h-4" />
                                    <span className="hidden sm:inline">{sendingComment ? '...' : 'Post'}</span>
                                </button>
                            </div>
                        </div>
                    </form>

                    {/* Comments List */}
                    <div className="space-y-4">
                        {comments.map((comment) => (
                            <div key={comment.id} className="flex gap-3">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-primary to-brand-dark ring-1 ring-white/10 shrink-0 flex items-center justify-center font-bold text-sm text-white">
                                    {(comment.user?.full_name || comment.user?.username || 'A')[0].toUpperCase()}
                                </div>
                                <div className="flex-1">
                                    <div className="bg-bg-hover rounded-xl p-4">
                                        <div className="flex items-start justify-between gap-2">
                                            <h4 className="font-semibold text-sm mb-1">
                                                {comment.user?.full_name || comment.user?.username || 'Anonymous'}
                                            </h4>
                                            {comment.user?.id === user?.id && (
                                                <button
                                                    onClick={() => handleDeleteComment(comment.id)}
                                                    className="text-text-muted hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-500/10 shrink-0"
                                                    title="Delete comment"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-text-secondary text-sm">{comment.content}</p>
                                    </div>
                                    <p className="text-text-muted text-xs mt-1 ml-1">
                                        {new Date(comment.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        ))}

                        {comments.length === 0 && (
                            <p className="text-text-secondary text-center py-6">
                                No comments yet. Be the first to comment!
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
