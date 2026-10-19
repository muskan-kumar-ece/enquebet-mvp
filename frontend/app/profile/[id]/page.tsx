"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Lock,
    Bookmark,
    Sparkles,
    FileText,
    Activity,
    FlaskConical,
    Cpu,
    ShieldCheck,
    ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { api } from '@/lib/api';
import PostCard from '@/components/feed/PostCard';
import FollowersModal from '@/components/ui/FollowersModal';
import ProfileHero from '@/components/profile/ProfileHero';
import BuilderHeatmap from '@/components/profile/BuilderHeatmap';
import FeaturedProjectsSection from '@/components/profile/FeaturedProjectsSection';
import PinnedProofSection from '@/components/profile/PinnedProofSection';
import PeerEndorsementWall from '@/components/profile/PeerEndorsementWall';
import ExperienceTimeline from '@/components/profile/ExperienceTimeline';
import ReputationRadar from '@/components/profile/ReputationRadar';
import SkillsSummaryWidget from '@/components/profile/sidebar/SkillsSummaryWidget';
import CollaborationPreferencesWidget from '@/components/profile/sidebar/CollaborationPreferencesWidget';
import DiscoveryRecommendationsWidget from '@/components/profile/sidebar/DiscoveryRecommendationsWidget';
import toast from 'react-hot-toast';

export default function UserProfilePage() {
    const params = useParams();
    const router = useRouter();
    const { user: currentUser, loading: authLoading } = useRequireAuth();

    const [profileUser, setProfileUser] = useState<any>(null);
    const [dossier, setDossier] = useState<any>(null);
    const [posts, setPosts] = useState<any[]>([]);
    const [researchPapers, setResearchPapers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [following, setFollowing] = useState<boolean>(false);
    const [followUpdating, setFollowUpdating] = useState(false);
    const [error, setError] = useState('');
    const [followModal, setFollowModal] = useState<'followers' | 'following' | null>(null);
    const [activeTab, setActiveTab] = useState<'dossier' | 'posts' | 'research'>('dossier');

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
            const [dossierData, userPosts, status, papersData] = await Promise.all([
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
                api.getResearchPapers({ user: params.id as string }).catch(() => []),
            ]);
            setDossier(dossierData);
            setProfileUser(dossierData.user);
            setPosts(userPosts);
            setFollowing(Boolean(status?.following));
            const plist = (papersData as any)?.results || papersData || [];
            setResearchPapers(Array.isArray(plist) ? plist : []);
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
            <div className="w-full max-w-[1520px] mx-auto px-2 sm:px-4 lg:px-6">
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
                    postsCount={posts.length}
                    followersCount={profileUser?.followers_count}
                    followingCount={profileUser?.following_count}
                    onOpenFollowModal={(tab) => {
                        if (isLocked) {
                            toast.error(`This account is private. Follow @${profileUser?.username} to view their network.`);
                            return;
                        }
                        setFollowModal(tab);
                    }}
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
                        Posts ({posts.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('research')}
                        className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                            activeTab === 'research'
                                ? 'bg-[#1864ff] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_2px_6px_rgba(0,0,0,0.4)] border border-[#488eff]/50'
                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                        }`}
                    >
                        <FlaskConical className="w-3.5 h-3.5" />
                        <span>Research ({researchPapers.length})</span>
                    </button>
                </div>

                {/* Adaptive Two-Column Workspace (Main Content + Contextual Sidebar) */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8 items-start">
                    {/* Main Content Column */}
                    <div className="xl:col-span-8 2xl:col-span-9 space-y-6">
                        {activeTab === 'dossier' && (
                            isLocked ? (
                                <div className="w-full rounded-2xl border border-[#1e2230] bg-[#0d1017] p-12 text-center shadow-sm">
                                    <div className="w-12 h-12 rounded-2xl bg-[#141824] border border-[#23283a] flex items-center justify-center text-zinc-400 mx-auto mb-4">
                                        <Lock className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-base font-bold text-white mb-2">This Builder Profile is Private</h3>
                                    <p className="text-xs text-zinc-400 max-w-md mx-auto mb-5 leading-relaxed">
                                        Follow @{profileUser.username} to unlock their verified contribution ledger, Proof of Work cards, and teammate testimonials.
                                    </p>
                                    <button
                                        onClick={handleFollowToggle}
                                        className="btn-brand text-xs px-5 py-2.5 font-semibold inline-flex items-center gap-2"
                                    >
                                        <span>Follow @{profileUser.username}</span>
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {/* 365-Day Builder Heatmap */}
                                    <BuilderHeatmap activity={dossier?.activity} />

                                    {/* Featured Projects & Ventures Showcase */}
                                    <FeaturedProjectsSection
                                        projects={profileUser.projects || []}
                                        isOwner={false}
                                    />

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
                                        certifications={profileUser.certifications || []}
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
                        )}

                        {activeTab === 'posts' && (
                            <div>
                                {isLocked ? (
                                    <div className="w-full rounded-2xl border border-[#1e2230] bg-[#0d1017] p-12 text-center shadow-sm">
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
                                    <div className="rounded-2xl border border-[#1e2230] bg-[#0d1017] p-12 text-center text-zinc-500 text-sm">
                                        No posts shared yet.
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'research' && (
                            <div className="space-y-6">
                                <div className="p-5 sm:p-6 rounded-2xl border border-[#1e2230] bg-[#0d1017] shadow-sm">
                                    <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-300 px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-[#23283a] mb-2">
                                        <FlaskConical className="w-3.5 h-3.5 text-blue-400" />
                                        <span>Published Studies & Preprints</span>
                                    </div>
                                    <h2 className="text-base font-bold text-white">
                                        {profileUser.full_name || profileUser.username}'s Research Dossier
                                    </h2>
                                    <p className="text-xs text-zinc-400 mt-1 max-w-xl">
                                        Academic papers, algorithmic benchmarks, and hardware-verified studies published with verifiable Proof of Work.
                                    </p>
                                </div>

                                {researchPapers.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {researchPapers.map((paper: any) => (
                                            <div
                                                key={paper.id}
                                                className="rounded-2xl border border-[#1e2230] bg-[#0d1017] p-5 space-y-3 hover:border-[#2e364f] transition shadow-sm flex flex-col justify-between"
                                            >
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-white/[0.05] text-zinc-300 border border-[#23283a]">
                                                            {paper.paper_code}
                                                        </span>
                                                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/[0.04] text-zinc-300 border border-[#23283a]">
                                                            {paper.status_display || paper.status}
                                                        </span>
                                                    </div>

                                                    <h3 className="text-sm font-bold text-white line-clamp-2">
                                                        {paper.title}
                                                    </h3>

                                                    <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                                                        {paper.abstract}
                                                    </p>

                                                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-zinc-500">
                                                        {paper.has_bom && (
                                                            <span className="inline-flex items-center gap-1 text-blue-400 font-medium">
                                                                <Cpu className="w-3 h-3" />
                                                                <span>VenopAI BOM</span>
                                                            </span>
                                                        )}
                                                        {paper.reproducibility_score > 0 && (
                                                            <span className="inline-flex items-center gap-1 text-zinc-300 font-mono">
                                                                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                                                                <span>{paper.reproducibility_score.toFixed(1)}/5.0</span>
                                                            </span>
                                                        )}
                                                        <span>• {new Date(paper.published_at).toLocaleDateString()}</span>
                                                    </div>
                                                </div>

                                                <div className="pt-3 border-t border-[#1e2230] flex items-center justify-end">
                                                    <Link
                                                        href={paper.slug ? `/research/${paper.slug}` : `/research/${paper.paper_code}`}
                                                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-400 hover:text-blue-300 transition"
                                                    >
                                                        <span>Read Paper</span>
                                                        <ExternalLink className="w-3 h-3" />
                                                    </Link>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="rounded-2xl border border-[#1e2230] bg-[#0d1017] p-12 text-center text-zinc-500 text-sm">
                                        <FlaskConical className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                                        <p className="text-zinc-400 font-medium">No research papers or preprints published yet.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Contextual Right Sidebar */}
                    <aside className="xl:col-span-4 2xl:col-span-3 space-y-5">
                        <SkillsSummaryWidget
                            skills={profileUser.skills}
                            skillsDetailed={profileUser.skills_detailed}
                            isOwner={false}
                        />
                        <CollaborationPreferencesWidget
                            user={profileUser}
                            isOwner={false}
                        />
                        <DiscoveryRecommendationsWidget
                            isOwner={false}
                            user={profileUser}
                        />
                    </aside>
                </div>
            </div>

            {/* Followers / Following Modal */}
            {followModal && (
                <FollowersModal
                    userId={profileUser.id}
                    username={profileUser.username}
                    type={followModal}
                    initialTab={followModal}
                    isOwner={false}
                    onClose={() => setFollowModal(null)}
                    onCountChange={(newFollowers, newFollowing) => {
                        setProfileUser((prev: any) => ({
                            ...prev,
                            followers_count: newFollowers,
                            following_count: newFollowing,
                        }));
                    }}
                />
            )}
        </div>
    );
}
