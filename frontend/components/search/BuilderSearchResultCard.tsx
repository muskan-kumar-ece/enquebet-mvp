"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    MapPin,
    GraduationCap,
    UserPlus,
    UserCheck,
    MessageSquare,
    Sparkles,
} from 'lucide-react';
import { VerificationBadge, ReputationBadge } from '@/components/ui/BuilderBadge';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface BuilderSearchResultCardProps {
    builder: any;
    currentUserId?: string;
    isFollowing?: boolean;
    onFollowToggle?: (builderId: string, isFollowing: boolean) => void;
    followLoading?: boolean;
    searchHighlight?: string;
}

export function BuilderSearchResultCard({
    builder,
    currentUserId,
    isFollowing = false,
    onFollowToggle,
    followLoading = false,
    searchHighlight = '',
}: BuilderSearchResultCardProps) {
    const router = useRouter();
    const [startingChat, setStartingChat] = useState(false);

    const isMe = currentUserId === builder.id;
    const initial = (builder.full_name || builder.username || 'B')[0].toUpperCase();

    // Map availability status to human-readable & badge color
    const getAvailabilityConfig = (status?: string) => {
        switch (status) {
            case 'open_to_cofound':
                return { label: 'Open to Co-found', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' };
            case 'open_to_collaborate':
                return { label: 'Open to Collaborate', color: 'bg-sky-500/15 text-sky-300 border-sky-500/30' };
            case 'hiring':
                return { label: 'Hiring Builders', color: 'bg-blue-500/15 text-blue-300 border-blue-500/30' };
            case 'open_to_work':
                return { label: 'Open to Work', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' };
            default:
                return { label: 'Builder', color: 'bg-zinc-800/60 text-zinc-400 border-zinc-700/40' };
        }
    };

    const avail = getAvailabilityConfig(builder.availability_status);

    const handleMessageClick = async () => {
        if (!currentUserId) {
            toast.error('Please sign in to message builders');
            return;
        }
        setStartingChat(true);
        try {
            const resp = await api.startDM(builder.id);
            if (resp.conversation_id) {
                router.push(`/messages?convo=${resp.conversation_id}`);
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to start direct message');
        } finally {
            setStartingChat(false);
        }
    };

    return (
        <div className="p-4 sm:p-5 rounded-xl bg-[#0f111a] border border-[#1e2335] hover:border-zinc-700 transition-all duration-200 flex flex-col justify-between group shadow-sm">
            {/* Top: Avatar, Name, Badges, Follow */}
            <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                    <Link
                        href={`/profile/${builder.username}`}
                        className="flex items-start gap-3 min-w-0 flex-1 group/author"
                    >
                        {/* Avatar */}
                        <div className="relative shrink-0">
                            {builder.profile_image ? (
                                <img
                                    src={builder.profile_image}
                                    alt={builder.full_name}
                                    className="w-12 h-12 rounded-xl object-cover border border-[#2a2a44] group-hover/author:border-brand/60 transition-colors"
                                />
                            ) : (
                                <div className="w-12 h-12 rounded-xl bg-[#14192b] border border-brand/30 text-brand-light font-bold text-sm flex items-center justify-center shadow-inner">
                                    {initial}
                                </div>
                            )}
                            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-[#0f111a]" />
                        </div>

                        {/* Names & Handle */}
                        <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-sm text-white group-hover/author:text-brand-light transition-colors truncate">
                                    {builder.full_name}
                                </span>
                                <VerificationBadge level={builder.verification_level} />
                            </div>
                            <p className="text-xs text-zinc-400 font-mono truncate">@{builder.username}</p>
                        </div>
                    </Link>

                    {/* Reputation & Availability */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                        <ReputationBadge score={builder.reputation_score || 0} />
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${avail.color}`}>
                            {avail.label}
                        </span>
                    </div>
                </div>

                {/* Headline / Bio */}
                {builder.headline ? (
                    <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed">
                        {builder.headline}
                    </p>
                ) : builder.bio ? (
                    <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                        {builder.bio}
                    </p>
                ) : null}

                {/* College & Location Meta */}
                <div className="flex items-center gap-3 text-xs text-zinc-400 flex-wrap">
                    {builder.college && (
                        <div className="flex items-center gap-1">
                            <GraduationCap className="w-3.5 h-3.5 text-zinc-400" />
                            <span className="truncate max-w-[150px]">{builder.college}</span>
                        </div>
                    )}
                    {builder.location && (
                        <div className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                            <span className="truncate max-w-[120px]">{builder.location}</span>
                        </div>
                    )}
                </div>

                {/* Skills Pills */}
                {builder.skills && builder.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                        {builder.skills.slice(0, 5).map((skill: any, i: number) => {
                            const name = typeof skill === 'string' ? skill : skill.skill_name;
                            const isMatch = searchHighlight && name.toLowerCase().includes(searchHighlight.toLowerCase());
                            return (
                                <span
                                    key={i}
                                    className={`px-2 py-0.5 text-[11px] rounded-md border font-mono ${
                                        isMatch
                                            ? 'bg-brand/15 border-brand/40 text-brand-light font-semibold'
                                            : 'bg-surface border-border text-zinc-400'
                                    }`}
                                >
                                    {name}
                                </span>
                            );
                        })}
                        {builder.skills.length > 5 && (
                            <span className="text-[10px] text-zinc-400 self-center">
                                +{builder.skills.length - 5}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Bottom Actions: Follow & Direct Message */}
            {!isMe && (
                <div className="flex items-center gap-2 pt-4 mt-3 border-t border-border">
                    {onFollowToggle && (
                        <button
                            onClick={() => onFollowToggle(builder.id, isFollowing)}
                            disabled={followLoading}
                            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                                isFollowing
                                    ? 'bg-surface hover:bg-red-500/10 hover:text-red-400 border border-border text-zinc-300'
                                    : 'btn-primary'
                            }`}
                        >
                            {isFollowing ? (
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

                    <button
                        onClick={handleMessageClick}
                        disabled={startingChat}
                        className="py-1.5 px-3 rounded-lg bg-surface hover:bg-surface-hover border border-border text-zinc-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                        title="Send Direct Message"
                    >
                        <MessageSquare className="w-3.5 h-3.5 text-brand" />
                        <span>{startingChat ? 'Connecting...' : 'Message'}</span>
                    </button>
                </div>
            )}
        </div>
    );
}
