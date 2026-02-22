"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Check, X, Clock, ChevronRight } from 'lucide-react';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
    pending: { label: 'Pending', className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' },
    accepted: { label: 'Accepted ✓', className: 'bg-green-500/10 text-green-400 border-green-500/30' },
    declined: { label: 'Declined', className: 'bg-red-500/10 text-red-400 border-red-500/30' },
};

export default function CollaborationPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useRequireAuth();
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'received' | 'sent'>('received');
    const [processing, setProcessing] = useState<string | null>(null);

    useEffect(() => {
        if (!authLoading && user) fetchRequests();
    }, [authLoading, user]);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const data = await api.getCollaborationRequests();
            setRequests(data);
        } catch (err: any) {
            toast.error('Failed to load collaboration requests');
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async (req: any) => {
        setProcessing(req.id);
        try {
            const result = await api.acceptCollaborationRequest(req.id);
            toast.success('Accepted! Group chat ready 🎉');
            setRequests((prev) => prev.map((r) => r.id === req.id ? { ...r, status: 'accepted' } : r));
            if (result.group_chat_id) {
                router.push(`/messages?convo=${result.group_chat_id}`);
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to accept');
        } finally {
            setProcessing(null);
        }
    };

    const handleDecline = async (req: any) => {
        setProcessing(req.id);
        try {
            await api.declineCollaborationRequest(req.id);
            toast.success('Declined');
            setRequests((prev) => prev.map((r) => r.id === req.id ? { ...r, status: 'declined' } : r));
        } catch (err: any) {
            toast.error(err.message || 'Failed to decline');
        } finally {
            setProcessing(null);
        }
    };

    const received = requests.filter((r) => r.receiver?.id === user?.id || r.receiver?.username === user?.username);
    const sent = requests.filter((r) => r.sender?.id === user?.id || r.sender?.username === user?.username);
    const displayed = tab === 'received' ? received : sent;

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-text-secondary animate-pulse">Loading collaborations...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Users className="w-8 h-8 text-purple" />
                        Build With
                    </h1>
                    <p className="text-text-secondary mt-2">
                        Manage collaboration requests you've sent and received.
                    </p>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-bg-card border border-border-default rounded-xl p-1 mb-6">
                    {(['received', 'sent'] as const).map((t) => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all capitalize ${tab === t
                                    ? 'bg-purple text-white shadow'
                                    : 'text-text-secondary hover:text-primary'
                                }`}
                        >
                            {t === 'received' ? `Received (${received.length})` : `Sent (${sent.length})`}
                        </button>
                    ))}
                </div>

                {/* Request Cards */}
                <div className="space-y-4">
                    {displayed.length === 0 ? (
                        <div className="card text-center py-16">
                            <Users className="w-12 h-12 text-text-secondary mx-auto mb-3 opacity-30" />
                            <p className="font-semibold mb-1">
                                {tab === 'received'
                                    ? 'No collaboration requests yet'
                                    : "You haven't sent any requests yet"}
                            </p>
                            <p className="text-text-secondary text-sm max-w-xs mx-auto">
                                {tab === 'received'
                                    ? 'When someone clicks "Build With" on your post, it appears here.'
                                    : 'Browse the feed and click "Build With" on a post that excites you.'}
                            </p>
                            {tab === 'sent' && (
                                <button
                                    onClick={() => router.push('/')}
                                    className="btn-primary mt-4"
                                >
                                    Browse Feed
                                </button>
                            )}
                        </div>
                    ) : (
                        displayed.map((req) => {
                            const badge = STATUS_BADGE[req.status] || STATUS_BADGE.pending;
                            const isProcessing = processing === req.id;
                            const otherUser = tab === 'received' ? req.sender : req.receiver;

                            return (
                                <div key={req.id} className="card">
                                    <div className="flex items-start gap-4">
                                        {/* Avatar */}
                                        <div className="w-12 h-12 rounded-full bg-purple shrink-0 flex items-center justify-center font-bold text-lg">
                                            {(otherUser?.full_name || otherUser?.username || 'U')[0].toUpperCase()}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <h3 className="font-semibold">
                                                    {otherUser?.full_name || otherUser?.username || 'Unknown'}
                                                </h3>
                                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${badge.className}`}>
                                                    {badge.label}
                                                </span>
                                            </div>

                                            {/* Post */}
                                            <button
                                                onClick={() => router.push(`/posts/${req.post?.id}`)}
                                                className="text-sm text-text-secondary hover:text-purple transition-colors flex items-center gap-1 mb-2"
                                            >
                                                Re: {req.post?.title || 'Untitled post'}
                                                <ChevronRight className="w-3 h-3" />
                                            </button>

                                            {/* Message */}
                                            {req.message && (
                                                <p className="text-sm text-text-secondary bg-bg-hover rounded-lg p-3 mb-3">
                                                    "{req.message}"
                                                </p>
                                            )}

                                            <p className="text-text-muted text-xs mb-3">
                                                {new Date(req.created_at).toLocaleString()}
                                            </p>

                                            {/* Actions — only for received pending requests */}
                                            {tab === 'received' && req.status === 'pending' && (
                                                <div className="flex gap-3">
                                                    <button
                                                        onClick={() => handleAccept(req)}
                                                        disabled={isProcessing}
                                                        className="flex items-center gap-2 btn-primary text-sm py-1.5 px-4"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                        {isProcessing ? 'Accepting...' : 'Accept & Chat'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDecline(req)}
                                                        disabled={isProcessing}
                                                        className="flex items-center gap-2 px-4 py-1.5 border border-red-500 text-red-500 rounded-lg hover:bg-red-500/10 transition-colors text-sm"
                                                    >
                                                        <X className="w-4 h-4" />
                                                        Decline
                                                    </button>
                                                </div>
                                            )}

                                            {/* Accepted: show link to messages */}
                                            {req.status === 'accepted' && (
                                                <button
                                                    onClick={() => router.push('/messages')}
                                                    className="text-sm text-purple hover:text-purple-light flex items-center gap-1"
                                                >
                                                    Open group chat →
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
