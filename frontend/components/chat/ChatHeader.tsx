"use client";

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Hash, Users, Sparkles } from 'lucide-react';

interface ChatHeaderProps {
    convo: any;
    currentUserId?: string;
    isTyping?: boolean;
    typingUsername?: string;
    onBack?: () => void;
}

export function ChatHeader({
    convo,
    currentUserId,
    isTyping = false,
    typingUsername,
    onBack,
}: ChatHeaderProps) {
    if (!convo) return null;

    const otherMember = convo.members?.find((m: any) => m.id !== currentUserId);
    const title = convo.project_title || convo.name || otherMember?.full_name || otherMember?.username || 'Chat';
    const workspaceId = convo.workspace_id;
    const memberCount = convo.member_count ?? convo.members?.length ?? 2;

    return (
        <div className="h-14 md:h-16 px-3 md:px-6 bg-[#0b0d14] border-b border-[#1e2335] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3 min-w-0">
                {/* Mobile Back Button */}
                {onBack && (
                    <button
                        onClick={onBack}
                        className="md:hidden p-2 -ml-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 active:scale-95 transition-all select-none touch-manipulation cursor-pointer"
                        aria-label="Back to conversations"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                )}

                {/* Avatar / Channel Glyph */}
                {otherMember?.id && !convo.is_group ? (
                    <Link
                        href={`/profile/${otherMember.id}`}
                        className="relative shrink-0 block group cursor-pointer"
                        title={`View @${otherMember.username || otherMember.full_name}'s profile`}
                    >
                        {otherMember?.profile_image ? (
                            <img
                                src={otherMember.profile_image}
                                alt={title}
                                className="w-10 h-10 rounded-full object-cover border border-zinc-700/60 group-hover:border-brand/60 transition-colors"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-[#14192b] text-brand-light font-bold text-xs flex items-center justify-center border border-brand/20 group-hover:border-brand/50 transition-colors">
                                {title.slice(0, 2).toUpperCase()}
                            </div>
                        )}
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#0b0d14]" />
                    </Link>
                ) : (
                    <div className="relative shrink-0">
                        {convo.is_group ? (
                            <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/30 flex items-center justify-center text-brand font-bold">
                                <Hash className="w-5 h-5" />
                            </div>
                        ) : otherMember?.profile_image ? (
                            <img
                                src={otherMember.profile_image}
                                alt={title}
                                className="w-10 h-10 rounded-full object-cover border border-zinc-700/60"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-[#14192b] text-brand-light font-bold text-xs flex items-center justify-center border border-brand/20">
                                {title.slice(0, 2).toUpperCase()}
                            </div>
                        )}
                        {!convo.is_group && (
                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#0b0d14]" />
                        )}
                    </div>
                )}

                {/* Title and Status */}
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        {otherMember?.id && !convo.is_group ? (
                            <Link
                                href={`/profile/${otherMember.id}`}
                                className="hover:underline hover:text-brand-light transition-colors group flex items-center"
                                title={`View @${otherMember.username || otherMember.full_name}'s profile`}
                            >
                                <h2 className="text-sm md:text-base font-bold text-white group-hover:text-brand-light truncate max-w-[200px] sm:max-w-xs md:max-w-md transition-colors">
                                    {title}
                                </h2>
                            </Link>
                        ) : convo.project_id ? (
                            <Link
                                href={`/workspace/${workspaceId || convo.project_id}`}
                                className="hover:underline hover:text-brand-light transition-colors group"
                                title="Open Project Workspace"
                            >
                                <h2 className="text-sm md:text-base font-bold text-white group-hover:text-brand-light truncate max-w-[200px] sm:max-w-xs md:max-w-md transition-colors">
                                    {title}
                                </h2>
                            </Link>
                        ) : (
                            <h2 className="text-sm md:text-base font-bold text-white truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                                {title}
                            </h2>
                        )}
                        {convo.is_group && (
                            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-medium text-brand-light bg-brand/10 px-2 py-0.5 rounded-full border border-brand/20">
                                <Sparkles className="w-2.5 h-2.5" />
                                Project Workspace
                            </span>
                        )}
                    </div>

                    {/* Subtitle / Typing indicator */}
                    <div className="flex items-center gap-2 text-xs">
                        {isTyping ? (
                            <div className="flex items-center gap-1 text-brand font-medium">
                                <span className="animate-pulse">{typingUsername || 'Someone'} is typing</span>
                                <span className="flex gap-0.5">
                                    <span className="w-1 h-1 rounded-full bg-brand animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <span className="w-1 h-1 rounded-full bg-brand animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <span className="w-1 h-1 rounded-full bg-brand animate-bounce" style={{ animationDelay: '300ms' }} />
                                </span>
                            </div>
                        ) : convo.is_group ? (
                            <span className="text-zinc-400 flex items-center gap-1 text-[11px]">
                                <Users className="w-3 h-3" />
                                {memberCount} builders collaborating
                            </span>
                        ) : (
                            <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                Active now
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
                {workspaceId && (
                    <Link
                        href={`/workspace/${workspaceId}`}
                        className="px-3 py-1.5 rounded-lg bg-brand/10 hover:bg-brand/20 border border-brand/30 text-brand-light text-xs font-semibold flex items-center gap-1.5 transition-all"
                    >
                        <span>Workspace</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                )}
            </div>
        </div>
    );
}
