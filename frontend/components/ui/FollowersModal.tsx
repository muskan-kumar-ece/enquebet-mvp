"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { X, Users, Search, UserCheck, UserPlus, UserMinus, ShieldAlert, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/contexts/AuthContext';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface FollowersModalProps {
    userId: string;
    username?: string;
    type?: 'followers' | 'following';
    initialTab?: 'followers' | 'following';
    isOwner?: boolean;
    onClose: () => void;
    onCountChange?: (newFollowersCount: number, newFollowingCount: number) => void;
}

export default function FollowersModal({
    userId,
    username,
    type = 'followers',
    initialTab,
    isOwner = false,
    onClose,
    onCountChange
}: FollowersModalProps) {
    const { user: currentUser, updateUser } = useAuth();
    const effectiveIsOwner = isOwner || Boolean(currentUser?.id && currentUser.id === userId);

    const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialTab || type);
    const [followersList, setFollowersList] = useState<any[]>([]);
    const [followingList, setFollowingList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Follow status tracking: user.id -> boolean (whether currentUser follows this user)
    const [followState, setFollowState] = useState<Record<string, boolean>>({});
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const inFlightActionRef = useRef<Set<string>>(new Set());

    // Instagram-style confirmation dialog state for removing a follower
    const [confirmRemoveUser, setConfirmRemoveUser] = useState<any | null>(null);
    const [removingFollower, setRemovingFollower] = useState(false);

    // Fetch lists when modal mounts or userId changes
    const fetchFollowData = useCallback(async () => {
        setLoading(true);
        try {
            const [followersRes, followingRes] = await Promise.all([
                api.getFollowers(userId).catch(() => ({ count: 0, results: [] })),
                api.getFollowing(userId).catch(() => ({ count: 0, results: [] })),
            ]);

            const followers = Array.isArray(followersRes) ? followersRes : (followersRes.results ?? []);
            const following = Array.isArray(followingRes) ? followingRes : (followingRes.results ?? []);

            setFollowersList(followers);
            setFollowingList(following);

            // Pre-populate followState from backend's is_following field
            const stateMap: Record<string, boolean> = {};
            [...followers, ...following].forEach((u: any) => {
                if (u?.id && u.id !== currentUser?.id) {
                    if (typeof u.is_following === 'boolean') {
                        stateMap[u.id] = u.is_following;
                    }
                }
            });

            // If any users don't have is_following yet, fallback check
            const missingStatusIds = [...followers, ...following]
                .filter((u: any) => u?.id && u.id !== currentUser?.id && stateMap[u.id] === undefined)
                .map((u: any) => u.id);

            if (missingStatusIds.length > 0) {
                const uniqueIds = Array.from(new Set(missingStatusIds));
                const statusChecks = await Promise.all(
                    uniqueIds.map(async (targetId) => {
                        try {
                            const res = await api.getFollowStatus(targetId);
                            return { id: targetId, following: Boolean(res?.following) };
                        } catch {
                            return { id: targetId, following: false };
                        }
                    })
                );
                statusChecks.forEach((s) => {
                    stateMap[s.id] = s.following;
                });
            }

            setFollowState(stateMap);
        } catch (err: any) {
            toast.error(err?.message || 'Failed to load follower network');
        } finally {
            setLoading(false);
        }
    }, [userId, currentUser?.id]);

    useEffect(() => {
        fetchFollowData();
    }, [fetchFollowData]);

    // Handle Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (confirmRemoveUser) {
                    setConfirmRemoveUser(null);
                } else {
                    onClose();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [confirmRemoveUser, onClose]);

    // Current active list filtered by search query
    const activeList = useMemo(() => {
        const source = activeTab === 'followers' ? followersList : followingList;
        if (!searchQuery.trim()) return source;
        const q = searchQuery.toLowerCase().trim();
        return source.filter((u: any) => {
            const name = (u.full_name || '').toLowerCase();
            const handle = (u.username || '').toLowerCase();
            const headline = (u.headline || '').toLowerCase();
            return name.includes(q) || handle.includes(q) || headline.includes(q);
        });
    }, [activeTab, followersList, followingList, searchQuery]);

    // Follow / Unfollow Toggle
    const handleFollowToggle = async (targetUser: any) => {
        if (!targetUser?.id || actionLoading || inFlightActionRef.current.has(targetUser.id)) return;
        const targetId = targetUser.id;
        inFlightActionRef.current.add(targetId);
        setActionLoading(targetId);

        const wasFollowing = followState[targetId] || false;
        const willFollow = !wasFollowing;

        // Optimistic UI update
        setFollowState((prev) => ({ ...prev, [targetId]: willFollow }));

        // If I am viewing my own following list and I unfollow, update following list & count
        if (effectiveIsOwner && activeTab === 'following' && !willFollow) {
            const updatedFollowing = followingList.filter((u) => u.id !== targetId);
            setFollowingList(updatedFollowing);
            if (currentUser) {
                const currentCount = typeof currentUser.following_count === 'number' ? currentUser.following_count : followingList.length;
                const newCount = Math.max(0, currentCount - 1);
                updateUser({ ...currentUser, following_count: newCount });
                onCountChange?.(followersList.length, newCount);
            }
        } else if (effectiveIsOwner && willFollow) {
            if (currentUser) {
                const currentCount = typeof currentUser.following_count === 'number' ? currentUser.following_count : followingList.length;
                const newCount = currentCount + 1;
                updateUser({ ...currentUser, following_count: newCount });
                onCountChange?.(followersList.length, newCount);
            }
        }

        try {
            let res: any;
            if (wasFollowing) {
                res = await api.unfollowUser(targetId);
                toast.success(`Unfollowed @${targetUser.username}`);
            } else {
                res = await api.followUser(targetId);
                toast.success(`Following @${targetUser.username}`);
            }
            if (res && currentUser) {
                const canonicalFollowing = typeof res.me_following_count === 'number'
                    ? res.me_following_count
                    : (typeof res.following_count === 'number' && effectiveIsOwner ? res.following_count : undefined);
                if (typeof canonicalFollowing === 'number') {
                    updateUser({ ...currentUser, following_count: canonicalFollowing });
                    onCountChange?.(followersList.length, canonicalFollowing);
                }
            }
        } catch (err: any) {
            // Rollback on error
            setFollowState((prev) => ({ ...prev, [targetId]: wasFollowing }));
            toast.error(err?.message || 'Failed to update follow relationship');
            // Refetch to restore exact backend state
            fetchFollowData();
        } finally {
            inFlightActionRef.current.delete(targetId);
            setActionLoading(null);
        }
    };

    // Instagram-style Remove Follower handler
    const handleConfirmRemoveFollower = async () => {
        if (!confirmRemoveUser || removingFollower) return;
        const targetId = confirmRemoveUser.id;
        const targetUsername = confirmRemoveUser.username;
        setRemovingFollower(true);

        try {
            const res = await api.removeFollower(targetId);
            const updatedFollowers = followersList.filter((u) => u.id !== targetId);
            setFollowersList(updatedFollowers);

            if (currentUser) {
                const canonicalCount = typeof res?.followers_count === 'number'
                    ? res.followers_count
                    : Math.max(0, (typeof currentUser.followers_count === 'number' ? currentUser.followers_count : followersList.length) - 1);
                updateUser({ ...currentUser, followers_count: canonicalCount });
                onCountChange?.(canonicalCount, followingList.length);
            }

            toast.success(`Removed @${targetUsername} from your followers`);
            setConfirmRemoveUser(null);
        } catch (err: any) {
            toast.error(err?.message || 'Failed to remove follower');
        } finally {
            setRemovingFollower(false);
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4 transition-all"
            onClick={onClose}
        >
            <div
                className="bg-[#0d1017] border border-[#1e2230] rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-scale-in"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header with Title & Dismiss */}
                <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-[#1e2230]/60">
                    <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-[#4f8fff]" />
                        <h2 className="text-sm font-bold text-white tracking-wide">
                            {username ? `@${username}'s Network` : 'Follower Network'}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
                        aria-label="Close modal"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Instagram-Style Dual Tabs Header */}
                <div className="grid grid-cols-2 border-b border-[#1e2230] bg-[#090a0f]/60">
                    <button
                        type="button"
                        onClick={() => {
                            setActiveTab('followers');
                            setSearchQuery('');
                        }}
                        className={`py-3 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all relative ${
                            activeTab === 'followers'
                                ? 'text-white border-b-2 border-[#1864ff] bg-[#111420]'
                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.02]'
                        }`}
                    >
                        <span>Followers</span>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
                            activeTab === 'followers'
                                ? 'bg-[#1864ff]/20 text-[#4f8fff] border border-[#1864ff]/30'
                                : 'bg-[#161a26] text-zinc-400 border border-[#23283a]'
                        }`}>
                            {followersList.length}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setActiveTab('following');
                            setSearchQuery('');
                        }}
                        className={`py-3 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all relative ${
                            activeTab === 'following'
                                ? 'text-white border-b-2 border-[#1864ff] bg-[#111420]'
                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.02]'
                        }`}
                    >
                        <span>Following</span>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
                            activeTab === 'following'
                                ? 'bg-[#1864ff]/20 text-[#4f8fff] border border-[#1864ff]/30'
                                : 'bg-[#161a26] text-zinc-400 border border-[#23283a]'
                        }`}>
                            {followingList.length}
                        </span>
                    </button>
                </div>

                {/* Real-Time Search Bar */}
                <div className="p-3 border-b border-[#1e2230] bg-[#0d1017]">
                    <div className="relative flex items-center">
                        <Search className="w-4 h-4 text-zinc-500 absolute left-3 pointer-events-none" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={`Search ${activeTab}...`}
                            className="w-full pl-9 pr-9 py-2 rounded-xl bg-[#141824] border border-[#23283a] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#1864ff] transition-all"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 p-1 rounded-md text-zinc-400 hover:text-white transition-colors"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Users List Stream */}
                <div className="flex-1 overflow-y-auto p-3 space-y-1 divide-y divide-[#1e2230]/40 max-h-[50vh]">
                    {loading ? (
                        <div className="space-y-3 py-6 px-2">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="flex items-center gap-3 animate-pulse">
                                    <div className="w-10 h-10 rounded-full bg-[#1b2030]" />
                                    <div className="flex-1 space-y-1.5">
                                        <div className="h-3 w-32 bg-[#1b2030] rounded" />
                                        <div className="h-2.5 w-20 bg-[#161a26] rounded" />
                                    </div>
                                    <div className="h-7 w-20 bg-[#1b2030] rounded-lg" />
                                </div>
                            ))}
                        </div>
                    ) : activeList.length === 0 ? (
                        <div className="text-center py-12 px-4">
                            <div className="w-12 h-12 rounded-2xl bg-[#141824] border border-[#23283a] flex items-center justify-center text-zinc-500 mx-auto mb-3">
                                <Users className="w-6 h-6 opacity-40" />
                            </div>
                            <h3 className="text-sm font-bold text-zinc-200 mb-1">
                                {searchQuery
                                    ? `No results found for "${searchQuery}"`
                                    : activeTab === 'followers'
                                    ? 'No followers yet'
                                    : 'Not following anyone yet'}
                            </h3>
                            <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                                {searchQuery
                                    ? 'Try checking for typos or searching by full name or handle.'
                                    : activeTab === 'followers'
                                    ? 'When other builders follow this profile, they will appear here.'
                                    : 'Discover active builders, mentors, and collaborative ventures.'}
                            </p>
                        </div>
                    ) : (
                        activeList.map((u: any) => {
                            const isSelf = u.id === currentUser?.id;
                            const isFollowing = followState[u.id] ?? false;
                            const isRowLoading = actionLoading === u.id;

                            return (
                                <div
                                    key={u.id}
                                    className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-[#141824]/60 transition-colors group"
                                >
                                    {/* User Identity Info */}
                                    <Link
                                        href={isSelf ? '/profile' : `/profile/${u.id}`}
                                        onClick={onClose}
                                        className="flex items-center gap-3 min-w-0 flex-1"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-[#161a26] border border-[#272d40] flex items-center justify-center overflow-hidden shrink-0 group-hover:border-[#1864ff]/60 transition-colors">
                                            {u.avatar_url || u.profile_image ? (
                                                <img
                                                    src={u.avatar_url || u.profile_image}
                                                    alt={u.username}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <span className="text-xs font-bold text-zinc-300">
                                                    {(u.full_name || u.username || '?').charAt(0).toUpperCase()}
                                                </span>
                                            )}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5">
                                                <p className="text-xs sm:text-sm font-semibold text-white truncate group-hover:text-[#4f8fff] transition-colors">
                                                    {u.full_name || u.username}
                                                </p>
                                                {u.campus_domain && (
                                                    <span className="text-[10px] font-mono text-zinc-500 hidden sm:inline">
                                                        @{u.campus_domain}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-zinc-400 font-mono truncate">
                                                @{u.username}
                                            </p>
                                            {u.headline && (
                                                <p className="text-[11px] text-zinc-500 truncate hidden sm:block mt-0.5">
                                                    {u.headline}
                                                </p>
                                            )}
                                        </div>
                                    </Link>

                                    {/* Instagram Context-Aware Action Buttons */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        {isSelf ? (
                                            <span className="text-[11px] font-semibold text-zinc-400 bg-white/[0.04] border border-white/[0.06] px-2.5 py-1 rounded-lg">
                                                You
                                            </span>
                                        ) : effectiveIsOwner && activeTab === 'followers' ? (
                                            // Viewing OWN followers: Show mutual follow status + Remove Follower button
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => handleFollowToggle(u)}
                                                    disabled={isRowLoading}
                                                    className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all inline-flex items-center gap-1.5 ${
                                                        isFollowing
                                                            ? 'bg-[#161a26] text-zinc-300 border border-[#272d40] hover:border-zinc-500'
                                                            : 'btn-brand'
                                                    }`}
                                                >
                                                    {isRowLoading ? (
                                                        <span className="animate-spin w-3 h-3 border border-current border-t-transparent rounded-full" />
                                                    ) : isFollowing ? (
                                                        <>
                                                            <UserCheck className="w-3.5 h-3.5 text-zinc-400" />
                                                            <span>Following</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <UserPlus className="w-3.5 h-3.5" />
                                                            <span>Follow Back</span>
                                                        </>
                                                    )}
                                                </button>

                                                {/* Instagram-style Remove Follower action */}
                                                <button
                                                    type="button"
                                                    onClick={() => setConfirmRemoveUser(u)}
                                                    disabled={isRowLoading}
                                                    className="text-xs px-2.5 py-1.5 rounded-lg font-semibold bg-[#161a26] text-zinc-400 border border-[#272d40] hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/10 transition-colors"
                                                    title={`Remove @${u.username} from your followers`}
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        ) : effectiveIsOwner && activeTab === 'following' ? (
                                            // Viewing OWN following list: Show "Following" button that unfollows
                                            <button
                                                type="button"
                                                onClick={() => handleFollowToggle(u)}
                                                disabled={isRowLoading}
                                                className={`text-xs px-3.5 py-1.5 rounded-lg font-semibold transition-all inline-flex items-center gap-1.5 ${
                                                    isFollowing
                                                        ? 'bg-[#161a26] text-zinc-300 border border-[#272d40] hover:border-red-500/50 hover:text-red-400 hover:bg-red-500/10'
                                                        : 'btn-brand'
                                                }`}
                                            >
                                                {isRowLoading ? (
                                                    <span className="animate-spin w-3 h-3 border border-current border-t-transparent rounded-full" />
                                                ) : isFollowing ? (
                                                    <>
                                                        <UserCheck className="w-3.5 h-3.5" />
                                                        <span>Following</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <UserPlus className="w-3.5 h-3.5" />
                                                        <span>Follow</span>
                                                    </>
                                                )}
                                            </button>
                                        ) : (
                                            // Viewing ANOTHER user's network: Show Follow / Following toggle
                                            <button
                                                type="button"
                                                onClick={() => handleFollowToggle(u)}
                                                disabled={isRowLoading}
                                                className={`text-xs px-3.5 py-1.5 rounded-lg font-semibold transition-all inline-flex items-center gap-1.5 ${
                                                    isFollowing
                                                        ? 'bg-[#161a26] text-zinc-300 border border-[#272d40] hover:border-red-500/40 hover:text-red-400 hover:bg-red-500/10'
                                                        : 'btn-brand'
                                                }`}
                                            >
                                                {isRowLoading ? (
                                                    <span className="animate-spin w-3 h-3 border border-current border-t-transparent rounded-full" />
                                                ) : isFollowing ? (
                                                    <>
                                                        <UserCheck className="w-3.5 h-3.5" />
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
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer status summary */}
                <div className="px-5 py-3 border-t border-[#1e2230] bg-[#090a0f] flex items-center justify-between text-xs text-zinc-500">
                    <span>
                        Showing {activeList.length} of {activeTab === 'followers' ? followersList.length : followingList.length}
                    </span>
                    <button
                        onClick={onClose}
                        className="text-zinc-400 hover:text-white transition-colors text-xs font-semibold"
                    >
                        Done
                    </button>
                </div>
            </div>

            {/* Instagram-Style "Remove Follower?" Confirmation Dialog */}
            {confirmRemoveUser && (
                <div
                    className="fixed inset-0 bg-black/80 z-60 flex items-center justify-center p-4 transition-all"
                    onClick={() => setConfirmRemoveUser(null)}
                >
                    <div
                        className="bg-[#111420] border border-[#272d40] rounded-2xl w-full max-w-sm p-5 shadow-2xl animate-scale-in text-center space-y-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                            <UserMinus className="w-7 h-7" />
                        </div>

                        <div className="space-y-1.5">
                            <h3 className="text-base font-bold text-white">
                                Remove follower?
                            </h3>
                            <p className="text-xs text-zinc-400 leading-relaxed">
                                ENQUEbet won't tell <span className="text-zinc-200 font-semibold">@{confirmRemoveUser.username}</span> that they were removed from your followers.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5 pt-2">
                            <button
                                type="button"
                                onClick={() => setConfirmRemoveUser(null)}
                                disabled={removingFollower}
                                className="w-full py-2 px-3 rounded-xl text-xs font-semibold bg-[#161a26] border border-[#272d40] text-zinc-300 hover:bg-[#1f2538] transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmRemoveFollower}
                                disabled={removingFollower}
                                className="w-full py-2 px-3 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                            >
                                {removingFollower ? (
                                    <span className="animate-spin w-3 h-3 border border-current border-t-transparent rounded-full" />
                                ) : (
                                    <span>Remove</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
