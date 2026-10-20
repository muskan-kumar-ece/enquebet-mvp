"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Heart,
    MessageCircle,
    UserPlus,
    UserCheck,
    Users,
    Check,
    X,
    Bell,
    MessageSquare,
    CheckCheck,
    Briefcase,
    FileText,
    Award,
    VolumeX,
    Loader2,
    ChevronRight,
} from 'lucide-react';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { api } from '@/lib/api';
import { useWebSocket } from '@/lib/contexts/WebSocketContext';
import toast from 'react-hot-toast';

type TabType = 'all' | 'action' | 'personal' | 'social';

export default function NotificationsPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useRequireAuth();
    const { onNotification, clearUnread, actionCount: wsActionCount } = useWebSocket();

    const [activeTab, setActiveTab] = useState<TabType>('all');
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [error, setError] = useState('');
    const [markingAll, setMarkingAll] = useState(false);
    const [processingAction, setProcessingAction] = useState<string | null>(null);
    const [followingUsers, setFollowingUsers] = useState<Record<string, boolean>>({});

    const seenIdsRef = useRef<Set<string>>(new Set());
    const seenTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Fetch notifications
    const loadNotifications = useCallback(async (tab: TabType, cursor?: string | null) => {
        if (!cursor) {
            setLoading(true);
            setError('');
        } else {
            setLoadingMore(true);
        }

        try {
            const res = await api.getNotifications({
                limit: 20,
                cursor: cursor || undefined,
                priority: tab === 'all' ? undefined : tab,
            });

            if (cursor) {
                setNotifications((prev) => [...prev, ...res.results]);
            } else {
                setNotifications(res.results);
            }

            setNextCursor(res.next_cursor);
            setHasMore(res.has_more);
        } catch (err: any) {
            setError(err.message || 'Failed to load notifications');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, []);

    // Initial load & tab switch
    useEffect(() => {
        if (!authLoading && user) {
            loadNotifications(activeTab, null);
        }
    }, [authLoading, user, activeTab, loadNotifications]);

    // WebSocket real-time subscription for new and updated notifications
    useEffect(() => {
        const unsub = onNotification((data) => {
            if (data.type === 'notification' && data.notification) {
                const incoming = data.notification;
                setNotifications((prev) => {
                    // Check if exists
                    const exists = prev.some((n) => n.id === incoming.id);
                    if (exists) {
                        return prev.map((n) => (n.id === incoming.id ? incoming : n));
                    }
                    // Filter match
                    if (activeTab === 'all' || incoming.priority === activeTab) {
                        return [incoming, ...prev];
                    }
                    return prev;
                });
            } else if (data.type === 'notification_updated' && data.notification) {
                const updated = data.notification;
                setNotifications((prev) =>
                    prev.map((n) => (n.id === updated.id ? updated : n))
                );
            } else if (data.type === 'notification_removed' && data.notification_id) {
                setNotifications((prev) =>
                    prev.filter((n) => n.id !== data.notification_id)
                );
            }
        });
        return unsub;
    }, [onNotification, activeTab]);

    // Viewport seen-tracking observer
    const setupSeenObserver = useCallback(
        (node: HTMLDivElement | null, notifId: string, isSeen: boolean) => {
            if (!node || isSeen || seenIdsRef.current.has(notifId)) return;

            const observer = new IntersectionObserver(
                (entries) => {
                    if (entries[0].isIntersecting) {
                        seenIdsRef.current.add(notifId);
                        observer.disconnect();

                        if (seenTimeoutRef.current) clearTimeout(seenTimeoutRef.current);
                        seenTimeoutRef.current = setTimeout(async () => {
                            const ids = Array.from(seenIdsRef.current);
                            if (ids.length > 0) {
                                try {
                                    await api.markNotificationsSeen(ids);
                                } catch {
                                    // silent
                                }
                            }
                        }, 1200);
                    }
                },
                { threshold: 0.5 }
            );

            observer.observe(node);
        },
        []
    );

    // Handlers
    const handleMarkAllRead = async () => {
        setMarkingAll(true);
        try {
            await clearUnread();
            setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
            toast.success('All notifications marked as read');
        } catch (err: any) {
            toast.error(err.message || 'Failed to mark all as read');
        } finally {
            setMarkingAll(false);
        }
    };

    const handleCardClick = async (notif: any) => {
        if (!notif.is_read) {
            try {
                await api.markAsRead(notif.id);
                setNotifications((prev) =>
                    prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
                );
            } catch {
                // silent
            }
        }

        if (notif.action_url) {
            router.push(notif.action_url);
        }
    };

    const handleFollowBack = async (e: React.MouseEvent, senderId: string, notifId: string) => {
        e.stopPropagation();
        if (!senderId) return;

        setProcessingAction(notifId);
        try {
            const isCurrentlyFollowing = followingUsers[senderId];
            if (isCurrentlyFollowing) {
                await api.unfollowUser(senderId);
                setFollowingUsers((prev) => ({ ...prev, [senderId]: false }));
                toast.success('Unfollowed');
            } else {
                await api.followUser(senderId);
                setFollowingUsers((prev) => ({ ...prev, [senderId]: true }));
                toast.success('Following back! 🎉');
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to update follow status');
        } finally {
            setProcessingAction(null);
        }
    };

    const handleAcceptCollaboration = async (e: React.MouseEvent, notif: any) => {
        e.stopPropagation();
        const requestId = notif.reference_id || notif.target_id;
        if (!requestId) {
            toast.error('Cannot find collaboration request');
            return;
        }

        setProcessingAction(notif.id);
        try {
            const res = await api.acceptCollaborationRequest(requestId);
            toast.success('Collaboration accepted! Workspace ready 🎉');
            await api.markAsRead(notif.id);

            setNotifications((prev) =>
                prev.map((n) => (n.id === notif.id ? { ...n, is_read: true, _responded: 'accepted' } : n))
            );

            if (res.workspace_id) {
                router.push(`/workspace/${res.workspace_id}`);
            } else if (res.group_chat_id) {
                router.push(`/messages?convo=${res.group_chat_id}`);
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to accept collaboration');
        } finally {
            setProcessingAction(null);
        }
    };

    const handleDeclineCollaboration = async (e: React.MouseEvent, notif: any) => {
        e.stopPropagation();
        const requestId = notif.reference_id || notif.target_id;
        if (!requestId) return;

        setProcessingAction(notif.id);
        try {
            await api.declineCollaborationRequest(requestId);
            toast.success('Collaboration request declined');
            await api.markAsRead(notif.id);

            setNotifications((prev) =>
                prev.map((n) => (n.id === notif.id ? { ...n, is_read: true, _responded: 'declined' } : n))
            );
        } catch (err: any) {
            toast.error(err.message || 'Failed to decline request');
        } finally {
            setProcessingAction(null);
        }
    };

    const handleMuteTarget = async (e: React.MouseEvent, notif: any) => {
        e.stopPropagation();
        if (!notif.target_type || !notif.target_id) return;

        try {
            await api.muteNotificationTarget(notif.target_type, notif.target_id);
            toast.success(`Muted notifications for this ${notif.target_type}`);
        } catch {
            toast.error('Failed to mute notifications');
        }
    };

    const getIcon = (type: string, priority: string) => {
        switch (type) {
            case 'like':
                return <Heart className="w-4 h-4 text-rose-500 fill-rose-500/20" />;
            case 'comment':
                return <MessageCircle className="w-4 h-4 text-sky-400" />;
            case 'follow':
                return <UserPlus className="w-4 h-4 text-emerald-400" />;
            case 'collaboration_request':
                return <Users className="w-4 h-4 text-brand-light" />;
            case 'collaboration_accepted':
                return <Check className="w-4 h-4 text-emerald-400" />;
            case 'collaboration_declined':
                return <X className="w-4 h-4 text-zinc-400" />;
            case 'task_assigned':
                return <Briefcase className="w-4 h-4 text-amber-400" />;
            case 'deliverable_review':
                return <FileText className="w-4 h-4 text-indigo-400" />;
            case 'deliverable_approved':
                return <Check className="w-4 h-4 text-emerald-400" />;
            case 'deliverable_changes_requested':
                return <X className="w-4 h-4 text-amber-500" />;
            case 'project_completed':
                return <Award className="w-4 h-4 text-amber-400" />;
            case 'message':
                return <MessageSquare className="w-4 h-4 text-sky-400" />;
            default:
                return priority === 'action' ? (
                    <Bell className="w-4 h-4 text-brand-light" />
                ) : (
                    <Bell className="w-4 h-4 text-text-secondary" />
                );
        }
    };

    const unreadTotal = notifications.filter((n) => !n.is_read).length;

    if (authLoading || (loading && notifications.length === 0)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
                <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
                <p className="text-text-muted text-sm">Loading notification center...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen py-8 px-4 sm:px-6">
            <div className="max-w-3xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border-default/60">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
                            Notifications
                            {unreadTotal > 0 && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-brand-primary/20 text-brand-light font-semibold border border-brand-primary/30">
                                    {unreadTotal} unread
                                </span>
                            )}
                        </h1>
                        <p className="text-text-muted text-xs mt-1">
                            Real-time updates, builder requests, and team activities.
                        </p>
                    </div>

                    {unreadTotal > 0 && (
                        <button
                            onClick={handleMarkAllRead}
                            disabled={markingAll}
                            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-text-secondary hover:text-white bg-bg-card hover:bg-bg-hover border border-border-default transition-all shadow-sm"
                        >
                            <CheckCheck className="w-3.5 h-3.5 text-brand-light" />
                            {markingAll ? 'Marking read...' : 'Mark all read'}
                        </button>
                    )}
                </div>

                {/* Priority Filter Tabs */}
                <div className="flex items-center gap-1.5 p-1 bg-bg-card/70 rounded-xl border border-border-default/60 overflow-x-auto no-scrollbar">
                    {(
                        [
                            { key: 'all', label: 'All', count: undefined },
                            { key: 'action', label: 'Action Required', count: wsActionCount },
                            { key: 'personal', label: 'Personal', count: undefined },
                            { key: 'social', label: 'Social', count: undefined },
                        ] as Array<{ key: TabType; label: string; count?: number }>
                    ).map((tab) => {
                        const isActive = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
                                    isActive
                                        ? 'bg-brand-primary text-white shadow-sm'
                                        : 'text-text-muted hover:text-text-primary hover:bg-white/5'
                                }`}
                            >
                                <span>{tab.label}</span>
                                {tab.count !== undefined && tab.count > 0 && (
                                    <span
                                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                            isActive
                                                ? 'bg-white/20 text-white'
                                                : 'bg-brand-primary/20 text-brand-light'
                                        }`}
                                    >
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Notification List */}
                {error ? (
                    <div className="card text-center py-12 space-y-3">
                        <p className="text-red-400 text-sm">{error}</p>
                        <button
                            onClick={() => loadNotifications(activeTab, null)}
                            className="btn-primary text-xs px-4 py-2"
                        >
                            Retry
                        </button>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="card text-center py-16 space-y-3 bg-bg-card/40 border-dashed">
                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto text-text-muted">
                            <Bell className="w-6 h-6 opacity-40" />
                        </div>
                        <h3 className="font-semibold text-sm text-text-primary">No notifications yet</h3>
                        <p className="text-text-muted text-xs max-w-sm mx-auto">
                            {activeTab === 'action'
                                ? 'You have no pending approvals, reviews, or collaboration requests.'
                                : 'When builders interact with your projects or profile, alerts will appear here.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {notifications.map((notif) => {
                            const isRead = notif.is_read;
                            const isAction = notif.priority === 'action';
                            const isFollow = notif.type === 'follow';
                            const isCollabReq = notif.type === 'collaboration_request';
                            const isDeliverableRev = notif.type === 'deliverable_review';
                            const isProcessing = processingAction === notif.id;

                            const recentActors = notif.recent_actors || [];
                            const hasMultipleActors = (notif.actor_count ?? 1) > 1;

                            return (
                                <div
                                    key={notif.id}
                                    ref={(node) => setupSeenObserver(node, notif.id, Boolean(notif.seen_at))}
                                    onClick={() => handleCardClick(notif)}
                                    className={`group relative flex items-start gap-3.5 p-4 rounded-xl border transition-all cursor-pointer ${
                                        !isRead
                                            ? 'bg-bg-card border-brand-primary/30 shadow-sm'
                                            : 'bg-bg-card/40 border-border-default/50 hover:bg-bg-card hover:border-border-default'
                                    }`}
                                >
                                    {/* Unread Accent Pill */}
                                    {!isRead && (
                                        <div className="absolute left-1 top-4 bottom-4 w-1 bg-brand-primary rounded-full" />
                                    )}

                                    {/* Actor Avatar / Avatar Stack */}
                                    <div className="relative shrink-0 mt-0.5">
                                        {hasMultipleActors && recentActors.length > 1 ? (
                                            <div className="flex -space-x-2 overflow-hidden">
                                                {recentActors.slice(0, 3).map((act: any, idx: number) => (
                                                    <img
                                                        key={act.id || idx}
                                                        src={act.avatar_url || '/default-avatar.png'}
                                                        alt={act.username || 'User'}
                                                        className="inline-block h-8 w-8 rounded-full ring-2 ring-bg-card object-cover"
                                                    />
                                                ))}
                                            </div>
                                        ) : notif.sender?.avatar_url ? (
                                            <img
                                                src={notif.sender.avatar_url}
                                                alt={notif.sender.username}
                                                className="w-10 h-10 rounded-full object-cover ring-1 ring-white/10"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-primary/20 to-brand-primary/10 border border-brand-primary/30 flex items-center justify-center font-bold text-xs text-brand-light">
                                                {notif.sender?.username?.slice(0, 2).toUpperCase() || 'EQ'}
                                            </div>
                                        )}

                                        {/* Type Icon Badge */}
                                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-bg-card border border-border-default flex items-center justify-center shadow-sm">
                                            {getIcon(notif.type, notif.priority)}
                                        </div>
                                    </div>

                                    {/* Text Content & CTAs */}
                                    <div className="flex-1 min-w-0 pr-2">
                                        <div className="flex items-baseline justify-between gap-2">
                                            <p className="text-sm text-text-primary leading-snug">
                                                {notif.message}
                                            </p>
                                            <span className="text-[10px] text-text-muted shrink-0 whitespace-nowrap">
                                                {notif.updated_at
                                                    ? new Date(notif.updated_at).toLocaleDateString([], {
                                                          month: 'short',
                                                          day: 'numeric',
                                                      })
                                                    : ''}
                                            </span>
                                        </div>

                                        {/* Priority & Metadata Subtitle */}
                                        <div className="flex items-center gap-2 mt-1">
                                            {isAction && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                                    Action Required
                                                </span>
                                            )}
                                            {hasMultipleActors && (
                                                <span className="text-[10px] text-text-muted">
                                                    {notif.actor_count} contributors
                                                </span>
                                            )}
                                        </div>

                                        {/* Dynamic Inline Action CTAs */}
                                        {/* 1. Follow Back CTA */}
                                        {isFollow && notif.sender?.id && (
                                            <div className="mt-3 flex items-center gap-2">
                                                <button
                                                    onClick={(e) =>
                                                        handleFollowBack(e, notif.sender.id, notif.id)
                                                    }
                                                    disabled={isProcessing}
                                                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all shadow-sm ${
                                                        followingUsers[notif.sender.id]
                                                            ? 'bg-white/10 text-text-secondary hover:bg-white/15'
                                                            : 'bg-brand-primary text-white hover:bg-brand-primary/90'
                                                    }`}
                                                >
                                                    {followingUsers[notif.sender.id] ? (
                                                        <>
                                                            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                                                            Following
                                                        </>
                                                    ) : (
                                                        <>
                                                            <UserPlus className="w-3.5 h-3.5" />
                                                            Follow back
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        )}

                                        {/* 2. Collaboration Request Review CTAs */}
                                        {isCollabReq && !notif._responded && (
                                            <div className="mt-3 flex items-center gap-2">
                                                <button
                                                    onClick={(e) => handleAcceptCollaboration(e, notif)}
                                                    disabled={isProcessing}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-brand-primary text-white hover:bg-brand-primary/90 transition-all shadow-sm"
                                                >
                                                    <Check className="w-3.5 h-3.5" />
                                                    Accept
                                                </button>
                                                <button
                                                    onClick={(e) => handleDeclineCollaboration(e, notif)}
                                                    disabled={isProcessing}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium text-text-muted hover:text-red-400 bg-white/5 hover:bg-red-500/10 transition-all"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                    Decline
                                                </button>
                                            </div>
                                        )}

                                        {/* 3. Deliverable Review CTA */}
                                        {isDeliverableRev && notif.action_url && (
                                            <div className="mt-3">
                                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-light hover:underline">
                                                    Review submission <ChevronRight className="w-3 h-3" />
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Mute Target Context Action */}
                                    {notif.target_type && notif.target_id && (
                                        <button
                                            title={`Mute updates for this ${notif.target_type}`}
                                            onClick={(e) => handleMuteTarget(e, notif)}
                                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-text-muted hover:text-white hover:bg-white/5 transition-all shrink-0"
                                        >
                                            <VolumeX className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Cursor-based "Load More" Pagination */}
                {hasMore && (
                    <div className="text-center pt-2">
                        <button
                            onClick={() => loadNotifications(activeTab, nextCursor)}
                            disabled={loadingMore}
                            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-medium bg-bg-card hover:bg-bg-hover border border-border-default text-text-primary transition-all shadow-sm"
                        >
                            {loadingMore ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    Loading older notifications...
                                </>
                            ) : (
                                'Load more'
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
