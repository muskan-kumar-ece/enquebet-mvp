"use client";

import React, { useState, useEffect } from 'react';
import { 
    ShieldAlert, UserX, Lock, Check, 
    RefreshCw, AlertCircle, Search, ShieldCheck 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';

interface SafetySectionProps {
    user: any;
    onUpdateUser: (data: any) => Promise<void>;
}

export function SafetySection({ user, onUpdateUser }: SafetySectionProps) {
    const [blockedList, setBlockedList] = useState<any[]>([]);
    const [loadingBlocked, setLoadingBlocked] = useState(true);
    const [unblockingId, setUnblockingId] = useState<string | null>(null);

    // Block by username input
    const [targetUsername, setTargetUsername] = useState('');
    const [blockingUser, setBlockingUser] = useState(false);

    // Privacy settings
    const [savingPrivacy, setSavingPrivacy] = useState(false);
    const [isPrivate, setIsPrivate] = useState(Boolean(user?.is_private));

    const loadBlocked = async () => {
        setLoadingBlocked(true);
        try {
            const data = await api.getBlockedUsers();
            setBlockedList(data);
        } catch (err: any) {
            console.error('Failed to load blocked users:', err);
        } finally {
            setLoadingBlocked(false);
        }
    };

    useEffect(() => {
        loadBlocked();
    }, []);

    const handleUnblock = async (blockedUserId: string) => {
        setUnblockingId(blockedUserId);
        try {
            await api.unblockUser(blockedUserId);
            setBlockedList(prev => prev.filter(b => b.blocked_user_id !== blockedUserId));
            toast.success('Builder unblocked successfully');
        } catch (err: any) {
            toast.error(err.message || 'Failed to unblock user');
        } finally {
            setUnblockingId(null);
        }
    };

    const handleBlockByUsername = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!targetUsername.trim()) return;

        setBlockingUser(true);
        try {
            // First search user by username
            const searchResults: any = await api.search(targetUsername.trim(), { type: 'users' });
            const userList = Array.isArray(searchResults) ? searchResults : (searchResults.users || []);
            const matchedUser = userList.find(
                (u: any) => u.username?.toLowerCase() === targetUsername.trim().toLowerCase()
            );

            if (!matchedUser) {
                toast.error(`No builder found with username @${targetUsername}`);
                setBlockingUser(false);
                return;
            }

            await api.blockUser(matchedUser.id, 'Blocked from Settings');
            toast.success(`@${matchedUser.username} has been blocked`);
            setTargetUsername('');
            loadBlocked();
        } catch (err: any) {
            toast.error(err.message || 'Failed to block user');
        } finally {
            setBlockingUser(false);
        }
    };

    const handleSavePrivacy = async () => {
        setSavingPrivacy(true);
        try {
            await onUpdateUser({ is_private: isPrivate });
            toast.success('Privacy settings updated');
        } catch (err: any) {
            toast.error(err.message || 'Failed to update privacy');
        } finally {
            setSavingPrivacy(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="border-b border-[#1e2335] pb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-[#1864ff]" />
                    Safety & Blocked Accounts
                </h2>
                <p className="text-xs text-text-secondary mt-0.5">
                    Manage blocked accounts, direct messaging filters, and profile visibility restrictions.
                </p>
            </div>

            {/* Profile Visibility Controls */}
            <div className="p-6 rounded-2xl bg-[#0b0d14] border border-[#1e2335] space-y-5">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#1864ff]/10 border border-[#1864ff]/20 flex items-center justify-center text-[#1864ff] shrink-0 mt-0.5">
                            <Lock className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white">Private Dossier Mode</h3>
                            <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
                                When enabled, your full career history, education credentials, and code repositories are visible only to builders you follow back.
                            </p>
                        </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                            type="checkbox"
                            checked={isPrivate}
                            onChange={(e) => setIsPrivate(e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-surface peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1864ff]"></div>
                    </label>
                </div>

                <div className="flex justify-end pt-1">
                    <button
                        type="button"
                        disabled={savingPrivacy || isPrivate === Boolean(user?.is_private)}
                        onClick={handleSavePrivacy}
                        className="btn-brand px-4 py-1.5 text-xs font-semibold rounded-xl text-white transition-all disabled:opacity-50"
                    >
                        {savingPrivacy ? 'Saving...' : 'Save Visibility'}
                    </button>
                </div>
            </div>

            {/* Blocked Accounts Manager */}
            <div className="p-6 rounded-2xl bg-[#0b0d14] border border-[#1e2335] space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1e2335] pb-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <UserX className="w-4 h-4 text-rose-400" />
                            <h3 className="text-sm font-bold text-white">Blocked Builders ({blockedList.length})</h3>
                        </div>
                        <p className="text-xs text-text-secondary mt-0.5">
                            Blocked users cannot message you, view your active sprints, or invite you to workspaces.
                        </p>
                    </div>

                    {/* Quick Block Input */}
                    <form onSubmit={handleBlockByUsername} className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-48">
                            <span className="absolute left-2.5 top-2 text-xs text-text-secondary">@</span>
                            <input
                                type="text"
                                value={targetUsername}
                                onChange={(e) => setTargetUsername(e.target.value)}
                                placeholder="username"
                                className="w-full text-xs pl-6 pr-3 py-1.5 rounded-lg bg-[#08090E] border border-[#1e2335] text-white focus:outline-none focus:border-[#1864ff]"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={blockingUser || !targetUsername.trim()}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 transition-all shrink-0 disabled:opacity-50"
                        >
                            {blockingUser ? '...' : 'Block'}
                        </button>
                    </form>
                </div>

                {loadingBlocked ? (
                    <div className="p-8 text-center text-xs text-text-secondary">
                        <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-[#1864ff]" />
                        Loading blocked list...
                    </div>
                ) : blockedList.length === 0 ? (
                    <div className="p-8 text-center rounded-xl bg-[#08090E] border border-[#1e2335] text-xs text-text-secondary">
                        <ShieldCheck className="w-8 h-8 text-emerald-400/40 mx-auto mb-2" />
                        You have not blocked any builders.
                    </div>
                ) : (
                    <div className="divide-y divide-[#1e2335]">
                        {blockedList.map((item) => (
                            <div
                                key={item.id}
                                className="py-3 flex items-center justify-between gap-4"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-8 h-8 rounded-full bg-[#1864ff]/10 text-[#1864ff] font-bold text-xs flex items-center justify-center border border-[#1864ff]/20 shrink-0">
                                        {item.blocked_username?.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-xs font-bold text-white truncate">
                                            @{item.blocked_username}
                                        </div>
                                        <div className="text-[10px] text-text-secondary truncate">
                                            Blocked on {new Date(item.created_at).toLocaleDateString()}
                                            {item.reason && ` · ${item.reason}`}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    disabled={unblockingId === item.blocked_user_id}
                                    onClick={() => handleUnblock(item.blocked_user_id)}
                                    className="px-3 py-1 text-xs font-semibold rounded-lg bg-surface hover:bg-surface-hover text-slate-300 hover:text-white border border-[#1e2335] transition-all shrink-0"
                                >
                                    {unblockingId === item.blocked_user_id ? 'Unblocking...' : 'Unblock'}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
