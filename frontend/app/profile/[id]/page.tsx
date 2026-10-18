"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Lock,
    Bookmark,
    Sparkles,
    FileText,
    Activity
} from 'lucide-react';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { api } from '@/lib/api';
import PostCard from '@/components/feed/PostCard';
import FollowersModal from '@/components/ui/FollowersModal';
import ProfileHero from '@/components/profile/ProfileHero';
import BuilderHeatmap from '@/components/profile/BuilderHeatmap';
import PinnedProofSection from '@/components/profile/PinnedProofSection';
import PeerEndorsementWall from '@/components/profile/PeerEndorsementWall';
import ExperienceTimeline from '@/components/profile/ExperienceTimeline';
import ReputationRadar from '@/components/profile/ReputationRadar';
import toast from 'react-hot-toast';

export default function UserProfilePage() {
    const params = useParams();
    const router = useRouter();
    const { user: currentUser, loading: authLoading } = useRequireAuth();

    const [profileUser, setProfileUser] = useState<any>(null);
    const [dossier, setDossier] = useState<any>(null);
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [following, setFollowing] = useState<boolean>(false);
    const [followUpdating, setFollowUpdating] = useState(false);
    const [error, setError] = useState('');
    const [followModal, setFollowModal] = useState<'followers' | 'following' | null>(null);
    const [activeTab, setActiveTab] = useState<'dossier' | 'posts'>('dossier');

    useEffect(() => {
        if (!authLoading && currentUser) {
            // Redirect to /profile if viewing own profile
            if (params.id === currentUser.id) {
                router.replace('/profile');
                return;
            }
            fetchProfile();
        }
    }, [params.id, authLoading, currentUser]);

    const fetchProfile = async () => {
        setLoading(true);
        setError('');
        try {
            const [dossierData, userPosts, status] = await Promise.all([
                api.getUserDossier(params.id as string).catch(async () => {
                    const u = await api.getUser(params.id as string);
                    return {
                        user: u,
                        reputation: {},
                        activity: { weeks: [], total_contributions: 0, current_streak_days: 0, longest_streak_days: 0 },
                        pinned_proofs: [],
                        experiences: [],
                        educations: [],
                        peer_endorsements: []
                    };
                }),
                api.getUserPosts(params.id as string).catch(() => []),
                api.getFollowStatus(params.id as string).catch(() => ({ following: false })),
            ]);
            setDossier(dossierData);
            setProfileUser(dossierData.user);
            setPosts(userPosts);
            setFollowing(Boolean(status?.following));
        } catch (err: any) {
            setError('User not found');
        } finally {
            setLoading(false);
        }
    };

    const handleFollowToggle = async () => {
        if (!profileUser?.id || followUpdating) return;

        setFollowUpdating(true);
        const wasFollowing = following;
        const prevFollowers = Number(profileUser.followers_count || 0);

        // Optimistic UI
        setFollowing(!wasFollowing);
        setProfileUser({
            ...profileUser,
            followers_count: Math.max(0, prevFollowers + (wasFollowing ? -1 : 1)),
        });

        try {
            if (wasFollowing) {
                const resp = await api.unfollowUser(profileUser.id);
                setFollowing(Boolean(resp?.following));
            } else {
                const resp = await api.followUser(profileUser.id);
                setFollowing(Boolean(resp?.following));
            }

            // Refresh user and dossier to update private locked state if applicable
            const refreshedDossier = await api.getUserDossier(profileUser.id);
            setDossier(refreshedDossier);
            setProfileUser(refreshedDossier.user);
            if (!refreshedDossier.user.is_private_locked) {
                const refreshedPosts = await api.getUserPosts(profileUser.id).catch(() => []);
                setPosts(refreshedPosts);
            }
        } catch (err: any) {
            // Revert optimistic state
            setFollowing(wasFollowing);
            setProfileUser({
                ...profileUser,
                followers_count: prevFollowers,
            });
            toast.error(err.message || 'Follow action failed');
        } finally {
            setFollowUpdating(false);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-zinc-400 animate-pulse text-sm">Loading verified builder dossier...</div>
            </div>
        );
    }

    if (error || !profileUser) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="p-8 rounded-2xl bg-[#0c0c14] border border-white/[0.08] text-center max-w-sm">
                    <p className="text-rose-400 mb-4 text-sm">{error || 'User not found'}</p>
                    <button
                        onClick={() => router.push('/')}
                        className="btn-primary px-4 py-2 text-xs font-semibold"
                    >
                        Back to Feed
                    </button>
                </div>
            </div>
        );
    }

    const isLocked = Boolean(profileUser.is_private_locked);

    return (
        <div className="min-h-screen p-4 sm:p-6 pb-24 bg-blueprint-grid">
            <div className="max-w-5xl mx-auto">
                {/* Back navigation */}
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-5 text-sm font-medium"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                </button>

                {/* Hero Header Dock */}
                <ProfileHero
                    user={profileUser}
                    reputation={dossier?.reputation}
                    isOwner={false}
                    isFollowing={following}
                    onFollowToggle={handleFollowToggle}
                />

                {/* Tab Switcher */}
                <div className="flex gap-1.5 p-1 rounded-2xl bg-[#0b0d14] border border-[#1b2030] mb-6 shadow-inner">
                    <button
                        onClick={() => setActiveTab('dossier')}
                        className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all ${
                            activeTab === 'dossier'
                                ? 'bg-[#1864ff] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_2px_6px_rgba(0,0,0,0.4)] border border-[#488eff]/50'
                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                        }`}
                    >
                        Verified Dossier
                    </button>
                    <button
                        onClick={() => setActiveTab('posts')}
                        className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all ${
                            activeTab === 'posts'
                                ? 'bg-[#1864ff] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_2px_6px_rgba(0,0,0,0.4)] border border-[#488eff]/50'
                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                        }`}
                    >
                        Posts & Ideas ({posts.length})
                    </button>
                </div>

                {/* Tab Content */}
                {activeTab === 'dossier' ? (
                    isLocked ? (
                        <div className="w-full rounded-3xl border border-white/[0.08] bg-[#0c0c14]/90 backdrop-blur-xl p-12 text-center shadow-xl">
                            <div className="w-14 h-14 rounded-2xl bg-zinc-800/80 border border-white/10 flex items-center justify-center text-zinc-400 mx-auto mb-4">
                                <Lock className="w-7 h-7" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">This Builder Profile is Private</h3>
                            <p className="text-sm text-zinc-400 max-w-md mx-auto mb-6 leading-relaxed">
                                Follow @{profileUser.username} to unlock their verified contribution ledger, Proof of Work cards, and teammate testimonials.
                            </p>
                            <button
                                onClick={handleFollowToggle}
                                className="btn-brand text-sm px-6 py-2.5 font-semibold inline-flex items-center gap-2"
                            >
                                <span>Follow @{profileUser.username}</span>
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* 365-Day Builder Heatmap */}
                            <BuilderHeatmap activity={dossier?.activity} />

                            {/* Pinned Proof of Work Showcase */}
                            <PinnedProofSection proofs={dossier?.pinned_proofs || []} isOwner={false} />

                            {/* Verified Peer Endorsements Wall */}
                            <PeerEndorsementWall
                                endorsements={dossier?.peer_endorsements || []}
                                averageRating={dossier?.reputation?.verified_stats?.average_peer_rating}
                                totalCount={dossier?.reputation?.verified_stats?.peer_reviews_count}
                            />

                            {/* Chronological Journey & Academic Credentials */}
                            <ExperienceTimeline
                                experiences={dossier?.experiences || []}
                                educations={dossier?.educations || []}
                                isOwner={false}
                            />

                            {/* Reputation Engine Radar */}
                            <ReputationRadar
                                userId={profileUser.id}
                                reputation={dossier?.reputation}
                                isOwner={false}
                            />
                        </>
                    )
                ) : (
                    <div>
                        {isLocked ? (
                            <div className="w-full rounded-3xl border border-white/[0.08] bg-[#0c0c14]/90 backdrop-blur-xl p-12 text-center shadow-xl">
                                <Lock className="w-8 h-8 text-zinc-500 mx-auto mb-3" />
                                <p className="text-sm text-zinc-400">Follow @{profileUser.username} to view their posts.</p>
                            </div>
                        ) : posts.length > 0 ? (
                            <div className="space-y-4">
                                {posts.map((post) => (
                                    <PostCard
                                        key={post.id}
                                        id={post.id}
                                        author={profileUser.full_name || profileUser.username}
                                        timeAgo={new Date(post.created_at).toLocaleDateString()}
                                        title={post.title}
                                        description={post.description}
                                        tags={post.tags || []}
                                        likes={post.likes_count || 0}
                                        comments={post.comments_count || 0}
                                        is_liked={post.is_liked || false}
                                        is_saved={post.is_saved || false}
                                        onRefresh={fetchProfile}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-white/[0.08] bg-[#0c0c14] p-12 text-center text-zinc-500 text-sm">
                                No posts shared yet.
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Followers / Following Modal */}
            {followModal && (
                <FollowersModal
                    userId={profileUser.id}
                    type={followModal}
                    onClose={() => setFollowModal(null)}
                />
            )}
        </div>
    );
}
