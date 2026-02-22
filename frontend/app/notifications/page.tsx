"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, MessageCircle, UserPlus, Users, Check, X, Bell, MessageSquare, CheckCheck } from 'lucide-react';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { api } from '@/lib/api';
import { useWebSocket } from '@/lib/contexts/WebSocketContext';
import toast from 'react-hot-toast';

export default function NotificationsPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useRequireAuth();
    const { onNotification, clearUnread } = useWebSocket();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [processing, setProcessing] = useState<string | null>(null);
    const [markingAll, setMarkingAll] = useState(false);

    useEffect(() => {
        if (!authLoading && user) {
            fetchNotifications();
            clearUnread();
        }
    }, [authLoading, user]);

    // Real-time: prepend new notifications via WebSocket
    useEffect(() => {
        const unsub = onNotification((data) => {
            if (data.notification) {
                setNotifications((prev) => [data.notification, ...prev]);
            }
        });
        return unsub;
    }, [onNotification]);

    const fetchNotifications = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await api.getNotifications();
            setNotifications(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load notifications');
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async (notif: any) => {
        // reference_id on a collaboration_request notification IS the CollaborationRequest UUID
        const requestId = notif.reference_id;
        if (!requestId) {
            toast.error('Cannot find collaboration request');
            return;
        }

        setProcessing(notif.id);
        try {
            const result = await api.acceptCollaborationRequest(requestId);
            toast.success('Collaboration accepted! Group chat is ready 🎉');

            // Mark as read and responded
            await api.markAsRead(notif.id);

            // Update local state
            setNotifications((prev) =>
                prev.map((n) => n.id === notif.id ? { ...n, is_read: true, _responded: true } : n)
            );

            // Navigate to the group chat
            if (result.group_chat_id) {
                router.push(`/messages?convo=${result.group_chat_id}`);
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to accept');
        } finally {
            setProcessing(null);
        }
    };

    const handleDecline = async (notif: any) => {
        const requestId = notif.reference_id;
        if (!requestId) return;

        setProcessing(notif.id);
        try {
            await api.declineCollaborationRequest(requestId);
            toast.success('Collaboration request declined');
            await api.markAsRead(notif.id);
            setNotifications((prev) =>
                prev.map((n) => n.id === notif.id ? { ...n, is_read: true, _responded: true } : n)
            );
        } catch (err: any) {
            toast.error(err.message || 'Failed to decline');
        } finally {
            setProcessing(null);
        }
    };

    const handleMarkRead = async (notif: any) => {
        if (notif.is_read) return;
        try {
            await api.markAsRead(notif.id);
            setNotifications((prev) =>
                prev.map((n) => n.id === notif.id ? { ...n, is_read: true } : n)
            );
        } catch { /* silent */ }
    };

    const handleMarkAllRead = async () => {
        setMarkingAll(true);
        try {
            await api.markAllRead();
            setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
            clearUnread();
            toast.success('All notifications marked as read');
        } catch (err: any) {
            toast.error(err.message || 'Failed to mark all as read');
        } finally {
            setMarkingAll(false);
        }
    };

    const handleNotifClick = async (notif: any) => {
        await handleMarkRead(notif);
        const type = notif.type;

        if (type === 'like' || type === 'comment') {
            if (notif.reference_id) router.push(`/posts/${notif.reference_id}`);
        } else if (type === 'collaboration_accepted') {
            // reference_id is the collab request ID — go to collaborations page
            router.push('/collaboration');
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'collaboration_request': return <Users className="w-5 h-5 text-purple" />;
            case 'collaboration_accepted': return <Users className="w-5 h-5 text-green-500" />;
            case 'like': return <Heart className="w-5 h-5 text-red-500" />;
            case 'comment': return <MessageCircle className="w-5 h-5 text-primary" />;
            case 'follow': return <UserPlus className="w-5 h-5 text-primary" />;
            case 'message': return <MessageSquare className="w-5 h-5 text-primary" />;
            default: return <Bell className="w-5 h-5 text-text-secondary" />;
        }
    };

    const getSenderName = (notif: any) =>
        notif.sender?.full_name || notif.sender?.username || 'Someone';

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-text-secondary animate-pulse">Loading notifications...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen p-6">
                <div className="max-w-3xl mx-auto card text-center py-12">
                    <p className="text-red-500 mb-4">{error}</p>
                    <button onClick={fetchNotifications} className="btn-primary">Try Again</button>
                </div>
            </div>
        );
    }

    const unreadCount = notifications.filter((n) => !n.is_read).length;

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Notifications</h1>
                        <p className="text-text-muted mt-1 text-sm">
                            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
                        </p>
                    </div>
                    {unreadCount > 0 && (
                        <button
                            onClick={handleMarkAllRead}
                            disabled={markingAll}
                            className="btn-outline flex items-center gap-2 text-xs"
                        >
                            <CheckCheck className="w-3.5 h-3.5" />
                            {markingAll ? 'Marking...' : 'Mark all read'}
                        </button>
                    )}
                </div>

                {/* Notifications List */}
                <div className="space-y-2">
                    {notifications.length === 0 ? (
                        <div className="card text-center py-16">
                            <Bell className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-20" />
                            <p className="font-semibold mb-1 text-sm">No notifications yet</p>
                            <p className="text-text-muted text-xs">When someone likes or comments on your post, you'll see it here.</p>
                        </div>
                    ) : (
                        notifications.map((notif) => {
                            const isRead = notif.is_read;
                            const type = notif.type;
                            const isCollabRequest = type === 'collaboration_request';
                            const isAccepted = type === 'collaboration_accepted';
                            const isProcessing = processing === notif.id;

                            return (
                                <div
                                    key={notif.id}
                                    onClick={() => handleNotifClick(notif)}
                                    className={`card cursor-pointer transition-all hover:border-purple/50 ${!isRead ? 'border-l-4 border-l-purple' : ''
                                        }`}
                                >
                                    <div className="flex gap-4">
                                        {/* Icon */}
                                        <div className="shrink-0 mt-0.5 w-10 h-10 rounded-full bg-bg-hover flex items-center justify-center">
                                            {getIcon(type)}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="text-sm leading-relaxed">
                                                    {notif.message || (
                                                        <>
                                                            <span className="font-semibold">{getSenderName(notif)}</span>
                                                            {' '}{isCollabRequest && 'wants to collaborate with you'}
                                                            {isAccepted && 'accepted your collaboration request 🎉'}
                                                            {type === 'like' && 'liked your post'}
                                                            {type === 'comment' && 'commented on your post'}
                                                        </>
                                                    )}
                                                </p>
                                                {!isRead && (
                                                    <div className="w-2 h-2 bg-purple rounded-full shrink-0 mt-1.5" />
                                                )}
                                            </div>

                                            <p className="text-text-muted text-xs mt-1">
                                                {new Date(notif.created_at).toLocaleString()}
                                            </p>

                                            {/* Accept / Decline for collaboration requests (only if not yet responded) */}
                                            {isCollabRequest && !notif._responded && (
                                                <div
                                                    className="flex gap-3 mt-3"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <button
                                                        onClick={() => handleAccept(notif)}
                                                        disabled={isProcessing}
                                                        className="flex items-center gap-2 btn-primary text-sm py-1.5 px-4"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                        {isProcessing ? 'Accepting...' : 'Accept'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDecline(notif)}
                                                        disabled={isProcessing}
                                                        className="flex items-center gap-2 px-4 py-1.5 border border-red-500 text-red-500 rounded-lg hover:bg-red-500/10 transition-colors text-sm"
                                                    >
                                                        <X className="w-4 h-4" />
                                                        Decline
                                                    </button>
                                                </div>
                                            )}

                                            {/* Show status badge if already processed */}
                                            {isCollabRequest && notif._responded && (
                                                <span className="inline-block mt-2 text-xs text-text-muted px-2 py-0.5 bg-bg-hover rounded-full">
                                                    Responded
                                                </span>
                                            )}

                                            {/* Accepted notification — link to collaboration page */}
                                            {isAccepted && (
                                                <button
                                                    className="mt-2 text-xs text-purple hover:text-purple-light flex items-center gap-1"
                                                    onClick={(e) => { e.stopPropagation(); router.push('/collaboration'); }}
                                                >
                                                    <Users className="w-3 h-3" />
                                                    View collaboration
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
