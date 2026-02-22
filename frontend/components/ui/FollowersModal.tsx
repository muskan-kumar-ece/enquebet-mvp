"use client";

import { useState, useEffect, useCallback } from 'react';
import { X, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/contexts/AuthContext';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface FollowersModalProps {
    userId: string;
    type: 'followers' | 'following';
    onClose: () => void;
}

export default function FollowersModal({ userId, type, onClose }: FollowersModalProps) {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [followLoading, setFollowLoading] = useState<string | null>(null);
    const [followState, setFollowState] = useState<Record<string, boolean>>({});

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            let data: any;
            if (type === 'followers') {
                data = await api.getFollowers(userId);
            } else {
                data = await api.getFollowing(userId);
            }
            const list = Array.isArray(data) ? data : (data.results ?? []);
            setUsers(list);

            // Check follow status for all users in parallel (not sequentially)
            const stateMap: Record<string, boolean> = {};
            const statusPromises = list
                .filter((u: any) => u.id !== currentUser?.id)
                .map(async (u: any) => {
                    try {
                        const status = await api.getFollowStatus(u.id);
                        return { id: u.id, following: Boolean(status?.following) };
                    } catch {
                        return { id: u.id, following: false };
                    }
                });
            const results = await Promise.all(statusPromises);
            for (const r of results) {
                stateMap[r.id] = r.following;
            }
            setFollowState(stateMap);
        } catch {
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    }, [userId, type, currentUser?.id]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleFollowToggle = async (targetId: string) => {
        if (followLoading) return;
        setFollowLoading(targetId);

        const wasFollowing = followState[targetId] || false;
        setFollowState((prev) => ({ ...prev, [targetId]: !wasFollowing }));

        try {
            if (wasFollowing) {
                await api.unfollowUser(targetId);
            } else {
                await api.followUser(targetId);
            }
        } catch {
            setFollowState((prev) => ({ ...prev, [targetId]: wasFollowing }));
            toast.error('Failed to update follow status');
        } finally {
            setFollowLoading(null);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-bg-card-elevated border border-border-default rounded-2xl w-full max-w-md max-h-[70vh] flex flex-col animate-scale-in shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border-default">
                    <h2 className="text-base font-bold capitalize">{type}</h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {loading ? (
                        <div className="text-center py-8">
                            <div className="text-text-muted animate-pulse text-sm">Loading...</div>
                        </div>
                    ) : users.length === 0 ? (
                        <div className="text-center py-8">
                            <Users className="w-10 h-10 text-text-muted mx-auto mb-2 opacity-20" />
                            <p className="text-text-muted text-sm">
                                {type === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
                            </p>
                        </div>
                    ) : (
                        users.map((u) => {
                            const isSelf = u.id === currentUser?.id;
                            const isFollowing = followState[u.id] || false;
                            const isLoading = followLoading === u.id;

                            return (
                                <div key={u.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-bg-hover/50 transition-colors">
                                    <Link href={isSelf ? '/profile' : `/profile/${u.id}`} onClick={onClose}>
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple to-purple-dark flex items-center justify-center overflow-hidden shrink-0 ring-1 ring-purple/20">
                                            {u.avatar_url ? (
                                                <img src={u.avatar_url} alt={u.username} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-sm font-bold text-white">
                                                    {(u.full_name || u.username || '?').charAt(0).toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                    </Link>
                                    <div className="flex-1 min-w-0">
                                        <Link href={isSelf ? '/profile' : `/profile/${u.id}`} onClick={onClose}>
                                            <p className="font-semibold text-sm truncate hover:text-purple transition-colors">
                                                {u.full_name || u.username}
                                            </p>
                                            <p className="text-text-muted text-xs truncate">@{u.username}</p>
                                        </Link>
                                    </div>
                                    {!isSelf && (
                                        <button
                                            onClick={() => handleFollowToggle(u.id)}
                                            disabled={isLoading}
                                            className={`text-xs px-4 py-1.5 rounded-lg font-medium transition-all ${
                                                isFollowing
                                                    ? 'border border-border-default text-text-muted hover:border-red-500/50 hover:text-red-400'
                                                    : 'bg-purple text-white hover:bg-purple-dark shadow-sm shadow-purple/20'
                                            }`}
                                        >
                                            {isLoading ? '...' : isFollowing ? 'Unfollow' : 'Follow'}
                                        </button>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
