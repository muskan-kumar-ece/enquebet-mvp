"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import {
    MapPin,
    GraduationCap,
    Globe,
    Github,
    Linkedin,
    Share2,
    MessageSquare,
    Users,
    ShieldCheck,
    Star,
    Award,
    Edit3,
    Check,
    Sparkles,
    FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import { BrandMarkSvg } from '@/components/ui/BrandLogo';

interface ProfileHeroProps {
    user: any;
    reputation?: any;
    isOwner: boolean;
    isFollowing?: boolean;
    onFollowToggle?: () => void;
    onOpenEdit?: () => void;
    onExportPdf?: () => void;
    postsCount?: number;
    followersCount?: number;
    followingCount?: number;
    onOpenFollowModal?: (tab: 'followers' | 'following') => void;
}

const AVAILABILITY_CONFIG: Record<string, { label: string; dotColor: string; badgeClass: string }> = {
    open_to_cofound: {
        label: 'Open for Co-founding',
        dotColor: 'bg-emerald-400',
        badgeClass: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 shadow-sm'
    },
    open_to_collaborate: {
        label: 'Open to Collaborate',
        dotColor: 'bg-sky-400',
        badgeClass: 'bg-sky-500/10 text-sky-300 border-sky-500/30 shadow-sm'
    },
    hiring: {
        label: 'Hiring Builders',
        dotColor: 'bg-blue-400',
        badgeClass: 'bg-blue-500/10 text-blue-300 border-blue-500/30 shadow-sm'
    },
    open_to_work: {
        label: 'Open to Work',
        dotColor: 'bg-amber-400',
        badgeClass: 'bg-amber-500/10 text-amber-300 border-amber-500/30 shadow-sm'
    },
    focused: {
        label: 'Deep Focus Mode',
        dotColor: 'bg-zinc-400',
        badgeClass: 'bg-zinc-800/80 text-zinc-300 border-zinc-700'
    }
};

export default function ProfileHero({
    user,
    reputation,
    isOwner,
    isFollowing = false,
    onFollowToggle,
    onOpenEdit,
    onExportPdf,
    postsCount,
    followersCount,
    followingCount,
    onOpenFollowModal
}: ProfileHeroProps) {
    const [copied, setCopied] = useState(false);

    const handleShare = () => {
        if (typeof window !== 'undefined') {
            navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            toast.success('Dossier link copied to clipboard!');
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const availability = AVAILABILITY_CONFIG[user?.availability_status] || AVAILABILITY_CONFIG.open_to_collaborate;
    const tierTitle = reputation?.level?.title || user?.reputation_tier || 'Novice Builder';
    const repScore = reputation?.score ?? user?.reputation_score ?? 0;
    const avgRating = reputation?.verified_stats?.average_peer_rating || 0;
    const peerReviewsCount = reputation?.verified_stats?.peer_reviews_count || 0;
    const completedProjectsCount = reputation?.verified_stats?.completed_projects_count || 0;
    const approvedDeliverablesCount = reputation?.verified_stats?.approved_deliverables_count || 0;

    return (
        <div className="relative w-full rounded-2xl border border-[#1e2230] bg-[#0d1017] overflow-hidden shadow-sm mb-6">
            {/* Top Cover Mesh Banner */}
            <div className="relative h-44 sm:h-56 w-full overflow-hidden bg-gradient-to-r from-[#0a0d18] via-[#0f1424] to-[#12182c] border-b border-[#1e2230]">
                {user?.cover_image ? (
                    <img
                        src={user.cover_image}
                        alt="Cover"
                        className="w-full h-full object-cover opacity-60"
                    />
                ) : (
                    <div className="absolute inset-0 bg-blueprint-grid opacity-30" />
                )}

                {/* ENQUEbet Verified Builder Dossier Watermark Seal */}
                <div className="absolute top-4 right-4 sm:top-5 sm:right-6 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#090b12]/90 backdrop-blur-md border border-[#23283a] shadow-lg select-none">
                    <BrandMarkSvg size={20} />
                    <div className="flex flex-col text-left">
                        <span className="text-[10px] font-bold tracking-tight text-white uppercase font-mono leading-none">
                            ENQUE<span className="text-[#1864ff]">bet</span>
                        </span>
                        <span className="text-[8px] font-mono tracking-widest uppercase text-zinc-400 leading-tight">
                            Verified Dossier
                        </span>
                    </div>
                </div>

                {/* Subtle Grid Accent */}
                <div
                    className="absolute inset-0 opacity-15 pointer-events-none"
                    style={{
                        backgroundImage: `linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px)`,
                        backgroundSize: '24px 24px',
                    }}
                />
            </div>

            {/* Profile Content Container */}
            <div className="px-6 sm:px-8 pb-8 pt-0">
                {/* Avatar & Action Dock Row */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-16 sm:-mt-20 gap-4 mb-6">
                    {/* Avatar with Presence Ring */}
                    <div className="relative group self-start">
                        <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl border-4 border-[#0d1017] overflow-hidden bg-[#161622] shadow-2xl relative">
                            {user?.profile_image ? (
                                <img
                                    src={user.profile_image}
                                    alt={user.full_name || user.username}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-white bg-gradient-to-br from-[#1864ff] to-[#0f4bcc]">
                                    {(user?.full_name || user?.username || 'B')[0].toUpperCase()}
                                </div>
                            )}
                        </div>

                        {/* Verification Level Shield */}
                        {user?.verification_level > 0 && (
                            <div className="absolute -bottom-2 -right-2 bg-gradient-to-tr from-amber-500 to-yellow-400 text-black p-1.5 rounded-xl shadow-lg border-2 border-[#0c0c14]" title={`Verified Builder (Level ${user.verification_level})`}>
                                <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                            </div>
                        )}
                    </div>

                    {/* Action Dock */}
                    <div className="flex items-center flex-wrap gap-2.5 pt-2">
                        {isOwner ? (
                            <>
                                <button
                                    onClick={onOpenEdit}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-white/[0.08] hover:bg-white/[0.12] text-zinc-100 border border-white/[0.1] transition-all hover:border-[#1864ff]/40 shadow-sm"
                                >
                                    <Edit3 className="w-4 h-4 text-[#4f8fff]" />
                                    <span>Edit Dossier</span>
                                </button>
                                <button
                                    onClick={onExportPdf}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.08] transition-all"
                                    title="Export Cryptographic PDF Dossier"
                                >
                                    <FileText className="w-4 h-4 text-zinc-400" />
                                    <span className="hidden sm:inline">Export PDF</span>
                                </button>
                            </>
                        ) : (
                            <>
                                {onFollowToggle && (
                                    <button
                                        onClick={onFollowToggle}
                                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm ${
                                            isFollowing
                                                ? 'bg-zinc-800 text-zinc-200 border border-zinc-700 hover:bg-zinc-700'
                                                : 'btn-brand'
                                        }`}
                                    >
                                        <Users className="w-4 h-4" />
                                        <span>{isFollowing ? 'Following' : 'Follow Builder'}</span>
                                    </button>
                                )}
                                <Link
                                    href={`/messages?user=${user?.id}`}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-white/[0.08] hover:bg-white/[0.12] text-zinc-100 border border-white/[0.1] transition-all hover:border-[#1864ff]/40"
                                >
                                    <MessageSquare className="w-4 h-4 text-[#4f8fff]" />
                                    <span>Message</span>
                                </Link>
                            </>
                        )}

                        <button
                            onClick={handleShare}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.08] transition-all"
                            title="Share Verified Dossier"
                        >
                            {copied ? (
                                <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                                <Share2 className="w-4 h-4 text-zinc-400" />
                            )}
                            <span className="hidden sm:inline">{copied ? 'Copied' : 'Share'}</span>
                        </button>
                    </div>
                </div>

                {/* Identity & Headline Block */}
                <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                            {user?.full_name || user?.username}
                        </h1>
                        <span className="text-zinc-500 font-mono text-sm">@{user?.username}</span>

                        {/* Availability Beacon */}
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${availability.badgeClass}`}>
                            <span className={`w-2 h-2 rounded-full ${availability.dotColor} animate-pulse`} />
                            <span>{availability.label}</span>
                        </div>
                    </div>

                    {/* Headline */}
                    <p className="text-base sm:text-lg text-zinc-300 font-normal leading-relaxed max-w-3xl">
                        {user?.headline || 'Builder on ENQUEbet · Architecting software, systems, and ventures.'}
                    </p>

                    {/* Metadata & Verified Tags Pill Bar */}
                    <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-sm text-zinc-400 pt-1">
                        {/* Campus Domain / College */}
                        {(user?.campus_domain || user?.college) && (
                            <div className="inline-flex items-center gap-1.5 text-zinc-300 bg-white/[0.04] border border-white/[0.06] px-2.5 py-1 rounded-lg">
                                <GraduationCap className="w-4 h-4 text-[#4f8fff]" />
                                <span>{user.college || user.campus_domain}</span>
                                {user?.campus_domain && (
                                    <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                        @{user.campus_domain}
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Location */}
                        {user?.location && (
                            <div className="inline-flex items-center gap-1.5">
                                <MapPin className="w-4 h-4 text-zinc-500" />
                                <span>{user.location}</span>
                            </div>
                        )}

                        {/* Social Links */}
                        {user?.github_url && (
                            <a
                                href={user.github_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors"
                            >
                                <Github className="w-4 h-4" />
                                <span>GitHub</span>
                            </a>
                        )}

                        {user?.linkedin_url && (
                            <a
                                href={user.linkedin_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-sky-400 transition-colors"
                            >
                                <Linkedin className="w-4 h-4" />
                                <span>LinkedIn</span>
                            </a>
                        )}

                        {user?.portfolio_url && (
                            <a
                                href={user.portfolio_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-[#4f8fff] transition-colors"
                            >
                                <Globe className="w-4 h-4" />
                                <span>Portfolio</span>
                            </a>
                        )}
                    </div>

                    {/* Bio excerpt if available */}
                    {user?.bio && (
                        <p className="text-sm text-zinc-400 pt-1 max-w-3xl leading-relaxed whitespace-pre-line">
                            {user.bio}
                        </p>
                    )}

                    {/* Instagram-Style Network Telemetry Row */}
                    <div className="flex items-center gap-6 sm:gap-8 pt-3 pb-1 text-sm border-t border-[#1e2230]/70">
                        <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white text-base font-mono">
                                {postsCount ?? 0}
                            </span>
                            <span className="text-zinc-400 text-xs sm:text-sm font-medium">posts</span>
                        </div>

                        <button
                            type="button"
                            onClick={() => onOpenFollowModal?.('followers')}
                            className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer group focus:outline-none"
                            title="View Followers"
                        >
                            <span className="font-bold text-white text-base font-mono group-hover:text-[#4f8fff] transition-colors">
                                {followersCount ?? user?.followers_count ?? 0}
                            </span>
                            <span className="text-zinc-400 group-hover:text-zinc-200 text-xs sm:text-sm font-medium">
                                followers
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => onOpenFollowModal?.('following')}
                            className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer group focus:outline-none"
                            title="View Following"
                        >
                            <span className="font-bold text-white text-base font-mono group-hover:text-[#4f8fff] transition-colors">
                                {followingCount ?? user?.following_count ?? 0}
                            </span>
                            <span className="text-zinc-400 group-hover:text-zinc-200 text-xs sm:text-sm font-medium">
                                following
                            </span>
                        </button>
                    </div>
                </div>

                {/* Telemetry KPI Cards Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-[#1e2230]">
                    {/* Tier Card */}
                    <div className="p-3.5 rounded-xl bg-[#141824] border border-[#23283a] flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-[#1864ff]/10 border border-[#1864ff]/20 flex items-center justify-center text-[#4f8fff] shrink-0">
                            <Award className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Tier</div>
                            <div className="text-xs font-bold text-zinc-100 truncate">{tierTitle}</div>
                            <div className="text-[11px] font-mono text-[#4f8fff]">{repScore} Rep PTS</div>
                        </div>
                    </div>

                    {/* Peer Rating */}
                    <div className="p-3.5 rounded-xl bg-[#141824] border border-[#23283a] flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                            <Star className="w-4 h-4 fill-amber-400" />
                        </div>
                        <div>
                            <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Teammate Rating</div>
                            <div className="text-xs font-bold text-zinc-100">
                                {avgRating > 0 ? `${avgRating} / 5.0` : 'Unrated'}
                            </div>
                            <div className="text-[11px] text-zinc-400">{peerReviewsCount} Verified Reviews</div>
                        </div>
                    </div>

                    {/* Proofs & Projects */}
                    <div className="p-3.5 rounded-xl bg-[#141824] border border-[#23283a] flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                            <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Delivered PoWs</div>
                            <div className="text-xs font-bold text-zinc-100">{completedProjectsCount} Projects</div>
                            <div className="text-[11px] text-zinc-400">Minted Proof of Work</div>
                        </div>
                    </div>

                    {/* Approved Deliverables */}
                    <div className="p-3.5 rounded-xl bg-[#141824] border border-[#23283a] flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
                            <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Deliverables</div>
                            <div className="text-xs font-bold text-zinc-100">{approvedDeliverablesCount} Approved</div>
                            <div className="text-[11px] text-zinc-400">Shipped on Milestones</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
