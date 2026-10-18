"use client";

import React, { useState, useMemo } from 'react';
import { Search, Users, User, Hash, MessageSquarePlus, RefreshCw } from 'lucide-react';

interface ConversationSidebarProps {
    conversations: any[];
    selectedConvoId: string | null;
    onSelectConvo: (convo: any) => void;
    currentUserId?: string;
    loading?: boolean;
    onRefresh?: () => void;
}

export function ConversationSidebar({
    conversations,
    selectedConvoId,
    onSelectConvo,
    currentUserId,
    loading = false,
    onRefresh,
}: ConversationSidebarProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'all' | 'dms' | 'groups'>('all');

    // Helper to resolve conversation display name
    const getConvoTitle = (convo: any) => {
        if (convo.project_title) return convo.project_title;
        if (convo.name) return convo.name;
        // For 1-on-1 DMs, show the other user's name
        const otherMember = convo.members?.find((m: any) => m.id !== currentUserId);
        return otherMember?.full_name || otherMember?.username || 'Direct Message';
    };

    // Helper to get initials or icon
    const getInitials = (title: string) => {
        if (!title) return 'C';
        const parts = title.trim().split(/\s+/);
        if (parts.length > 1) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return title.slice(0, 2).toUpperCase();
    };

    // Filter by tab and search query
    const filteredConvos = useMemo(() => {
        return conversations.filter((convo) => {
            // Tab filter
            if (activeTab === 'dms' && convo.is_group) return false;
            if (activeTab === 'groups' && !convo.is_group) return false;

            // Search query filter
            if (!searchQuery.trim()) return true;
            const title = getConvoTitle(convo).toLowerCase();
            const lastMsg = (convo.last_message?.content || '').toLowerCase();
            const q = searchQuery.toLowerCase().trim();
            return title.includes(q) || lastMsg.includes(q);
        });
    }, [conversations, activeTab, searchQuery, currentUserId]);

    const dmsCount = useMemo(() => conversations.filter((c) => !c.is_group).length, [conversations]);
    const groupsCount = useMemo(() => conversations.filter((c) => c.is_group).length, [conversations]);

    return (
        <div className="w-full h-full flex flex-col bg-[#0b0d14] border-r border-[#1e2335]">
            {/* Header */}
            <div className="p-4 border-b border-[#1e2335] shrink-0">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <h1 className="text-lg font-bold text-white tracking-tight">Messages</h1>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-brand/10 text-brand-light border border-brand/20">
                            {conversations.length}
                        </span>
                    </div>
                    {onRefresh && (
                        <button
                            onClick={onRefresh}
                            disabled={loading}
                            title="Refresh conversations"
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    )}
                </div>

                {/* Search Bar */}
                <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                        type="text"
                        placeholder="Search chats..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#0f111a] border border-[#1e2335] text-xs text-white placeholder-zinc-400 pl-9 pr-3 py-2 rounded-lg focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors"
                    />
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[#0f111a] border border-[#1e2335]">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${
                            activeTab === 'all'
                                ? 'bg-brand text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]'
                                : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setActiveTab('dms')}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1 ${
                            activeTab === 'dms'
                                ? 'bg-brand text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]'
                                : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                    >
                        <User className="w-3 h-3" />
                        <span>DMs</span>
                        {dmsCount > 0 && <span className="text-[10px] opacity-75">({dmsCount})</span>}
                    </button>
                    <button
                        onClick={() => setActiveTab('groups')}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1 ${
                            activeTab === 'groups'
                                ? 'bg-brand text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]'
                                : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                    >
                        <Hash className="w-3 h-3" />
                        <span>Channels</span>
                        {groupsCount > 0 && <span className="text-[10px] opacity-75">({groupsCount})</span>}
                    </button>
                </div>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#151526]/60">
                {loading && conversations.length === 0 ? (
                    <div className="p-4 space-y-3">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/30 animate-pulse">
                                <div className="w-10 h-10 rounded-full bg-zinc-800" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 bg-zinc-800 rounded w-2/3" />
                                    <div className="h-2.5 bg-zinc-800/60 rounded w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredConvos.length === 0 ? (
                    <div className="p-8 text-center text-zinc-400">
                        <MessageSquarePlus className="w-8 h-8 mx-auto mb-2 opacity-30 text-zinc-400" />
                        <p className="text-xs font-medium text-zinc-400">No conversations found</p>
                        <p className="text-[11px] text-zinc-400 mt-1">
                            {searchQuery ? 'Try matching another name or keyword' : 'Start a chat from any builder profile or project post'}
                        </p>
                    </div>
                ) : (
                    filteredConvos.map((convo) => {
                        const isSelected = selectedConvoId === convo.id;
                        const title = getConvoTitle(convo);
                        const initials = getInitials(title);
                        const lastMsg = convo.last_message;
                        const otherMember = convo.members?.find((m: any) => m.id !== currentUserId);

                        return (
                            <button
                                key={convo.id}
                                onClick={() => onSelectConvo(convo)}
                                className={`w-full text-left p-3.5 transition-all flex items-start gap-3 relative ${
                                    isSelected
                                        ? 'bg-[#131726] border-l-2 border-brand'
                                        : 'hover:bg-white/[0.03] border-l-2 border-transparent'
                                }`}
                            >
                                {/* Avatar */}
                                <div className="relative shrink-0">
                                    {convo.is_group ? (
                                        <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/30 flex items-center justify-center text-brand font-bold text-xs">
                                            <Hash className="w-5 h-5" />
                                        </div>
                                    ) : otherMember?.profile_image ? (
                                        <img
                                            src={otherMember.profile_image}
                                            alt={title}
                                            className="w-10 h-10 rounded-full object-cover border border-zinc-700/60"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-[#14192b] text-brand-light font-bold text-xs flex items-center justify-center border border-brand/20 shadow-inner">
                                            {initials}
                                        </div>
                                    )}
                                    {/* Presence dot for 1-on-1 */}
                                    {!convo.is_group && (
                                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#0b0d14]" />
                                    )}
                                </div>

                                {/* Body */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <span className="font-semibold text-xs text-white truncate max-w-[140px]">
                                                {title}
                                            </span>
                                            {convo.is_group && (
                                                <span className="text-[10px] text-zinc-400 bg-zinc-800/60 px-1.5 py-0.2 rounded border border-zinc-700/50">
                                                    Project
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                                            {lastMsg
                                                ? new Date(lastMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                : new Date(convo.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>

                                    {/* Last message preview */}
                                    <p className="text-[11px] text-zinc-400 truncate">
                                        {lastMsg ? (
                                            <>
                                                {lastMsg.sender?.username && (
                                                    <span className="text-zinc-400 font-medium">{lastMsg.sender.username}: </span>
                                                )}
                                                <span>{lastMsg.content}</span>
                                            </>
                                        ) : (
                                            <span className="italic text-zinc-400">No messages yet</span>
                                        )}
                                    </p>

                                    {convo.is_group && (
                                        <div className="flex items-center gap-1 mt-1 text-[10px] text-zinc-400">
                                            <Users className="w-3 h-3" />
                                            <span>{convo.member_count ?? convo.members?.length ?? 2} builders</span>
                                        </div>
                                    )}
                                </div>
                            </button>
                        );
                    })
                )}
            </div>
        </div>
    );
}
