"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    MapPin,
    GraduationCap,
    ArrowLeft,
    MessageSquare,
    Users,
    Check,
    Briefcase,
    FolderOpen,
    ExternalLink,
    Download,
    Lock,
    Globe,
    Building2,
    Calendar
} from 'lucide-react';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { api } from '@/lib/api';
import PostCard from '@/components/feed/PostCard';
import { VerificationBadge, ReputationBadge } from '@/components/ui/BuilderBadge';
import { ReputationCard } from '@/components/ui/ReputationCard';
import FollowersModal from '@/components/ui/FollowersModal';

import toast from 'react-hot-toast';

export default function UserProfilePage() {
    const params = useParams();
    const router = useRouter();
    const { user: currentUser, loading: authLoading } = useRequireAuth();

    const [profileUser, setProfileUser] = useState<any>(null);
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [sendingMessage, setSendingMessage] = useState(false);
    const [following, setFollowing] = useState<boolean>(false);
    const [followUpdating, setFollowUpdating] = useState(false);
    const [error, setError] = useState('');
    const [followModal, setFollowModal] = useState<'followers' | 'following' | null>(null);

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
            const [userData, userPosts, status] = await Promise.all([
                api.getUser(params.id as string),
                api.getUserPosts(params.id as string).catch((err) => {
                    // 403 or error for private accounts
                    return [];
                }),
                api.getFollowStatus(params.id as string).catch(() => ({ following: false })),
            ]);
            setProfileUser(userData);
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

            // Refresh user and posts to update private locked state
            const refreshed = await api.getUser(profileUser.id);
            setProfileUser(refreshed);
            if (!refreshed.is_private_locked) {
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
            toast.error(err.message || 'Failed to update follow status');
        } finally {
            setFollowUpdating(false);
        }
    };

    const handleMessage = async () => {
        if (!profileUser?.id) return;
        setSendingMessage(true);
        try {
            const { conversation_id } = await api.startDM(profileUser.id);
            router.push(`/messages?convo=${conversation_id}`);
        } catch (err: any) {
            toast.error(err.message || 'Failed to start conversation');
        } finally {
            setSendingMessage(false);
        }
    };

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-text-secondary animate-pulse text-sm">Loading builder profile...</div>
            </div>
        );
    }

    if (error || !profileUser) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="card text-center py-12 border border-border-default">
                    <p className="text-red-400 mb-4 text-sm">{error}</p>
                    <button onClick={() => router.push('/')} className="btn-primary text-sm">
                        Back to Feed
                    </button>
                </div>
            </div>
        );
    }

    const isLocked = Boolean(profileUser.is_private_locked);

    const skillsToRender = profileUser.skills_detailed && profileUser.skills_detailed.length > 0
        ? profileUser.skills_detailed
        : (profileUser.skills || []).map((s: string) => ({ skill_name: s, level: 'intermediate' }));

    return (
        <div className="min-h-screen p-4 sm:p-6 pb-24">
            <div className="max-w-4xl mx-auto">
                {/* Back button */}
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors mb-5 text-sm font-medium"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                </button>

                {/* Profile Header Card */}
                <div className="card mb-6 overflow-hidden p-0 border border-border-default">
                    {/* Cover Banner */}
                    <div className="relative w-full h-36 sm:h-48 md:h-56 bg-gradient-to-r from-purple/30 via-primary/20 to-purple/10 overflow-hidden">
                        {profileUser.cover_image ? (
                            <img
                                src={profileUser.cover_image}
                                alt="Cover banner"
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-purple/20 via-bg-card to-primary/10 flex items-center justify-end p-4">
                                <span className="text-[11px] text-text-muted/60 tracking-wider uppercase font-semibold">ENQUEbet Builder</span>
                            </div>
                        )}
                    </div>

                    {/* Identity Container */}
                    <div className="px-6 pb-6 pt-0 relative z-10">
                        {/* Profile Picture & Action Buttons */}
                        <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-16 sm:-mt-20 mb-4 gap-4">
                            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-bg-card overflow-hidden bg-gradient-to-br from-purple to-purple-dark flex items-center justify-center shadow-xl shadow-purple/20 ring-2 ring-purple/20 shrink-0">
                                {profileUser.avatar_url || profileUser.profile_image ? (
                                    <img
                                        src={profileUser.avatar_url || profileUser.profile_image}
                                        alt={profileUser.full_name || profileUser.username}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <span className="text-3xl sm:text-4xl font-bold text-white">
                                        {(profileUser.full_name || profileUser.username || '?').charAt(0).toUpperCase()}
                                    </span>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-3 self-center sm:self-end">
                                <button
                                    onClick={handleFollowToggle}
                                    disabled={followUpdating}
                                    className={
                                        following
                                            ? 'btn-outline flex items-center gap-2 px-5 py-2.5 text-sm'
                                            : 'btn-primary flex items-center gap-2 px-6 py-2.5 text-sm'
                                    }
                                >
                                    {following ? <Check className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                                    <span>{followUpdating ? 'Updating...' : (following ? 'Following' : 'Follow')}</span>
                                </button>
                                <button
                                    onClick={handleMessage}
                                    disabled={sendingMessage}
                                    className="btn-outline flex items-center gap-2 px-5 py-2.5 text-sm"
                                >
                                    <MessageSquare className="w-4 h-4" />
                                    <span>{sendingMessage ? 'Starting...' : 'Message'}</span>
                                </button>
                            </div>
                        </div>

                        {/* Badges Row */}
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                            <VerificationBadge level={profileUser.verification_level} />
                            <ReputationBadge score={profileUser.reputation_score} />
                            {profileUser.is_private && (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-bg-hover text-text-muted text-xs border border-border-default">
                                    <Lock className="w-3.5 h-3.5" />
                                    <span>Private Account</span>
                                </div>
                            )}
                        </div>

                        {/* Full Name & Username */}
                        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight mb-0.5">
                            {profileUser.full_name || profileUser.username}
                        </h1>
                        <p className="text-text-muted text-sm mb-2">@{profileUser.username}</p>

                        {/* Headline */}
                        {profileUser.headline && (
                            <p className="text-text-primary text-base font-medium leading-snug mb-3 max-w-xl">
                                {profileUser.headline}
                            </p>
                        )}

                        {/* Bio */}
                        {profileUser.bio && (
                            <p className="text-text-secondary text-sm leading-relaxed max-w-2xl whitespace-pre-line mb-4">
                                {profileUser.bio}
                            </p>
                        )}

                        {/* Location & College Meta */}
                        <div className="flex flex-wrap items-center gap-4 text-text-muted text-xs sm:text-sm mb-4">
                            {profileUser.location && (
                                <div className="flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5 text-purple-light" />
                                    <span>{profileUser.location}</span>
                                </div>
                            )}
                            {profileUser.college && (
                                <div className="flex items-center gap-1.5">
                                    <GraduationCap className="w-3.5 h-3.5 text-primary" />
                                    <span>{profileUser.college}</span>
                                </div>
                            )}
                        </div>

                        {/* Stats Bar */}
                        <div className="flex gap-6 pt-3 pb-1 border-t border-border-default/60">
                            <div className="text-left">
                                <div className="text-lg font-bold text-text-primary">{isLocked ? '—' : posts.length}</div>
                                <div className="text-text-muted text-xs uppercase tracking-wider">Posts</div>
                            </div>
                            <div className="w-px bg-border-default" />
                            <button
                                onClick={() => setFollowModal('followers')}
                                className="text-left hover:opacity-80 transition-opacity"
                            >
                                <div className="text-lg font-bold text-text-primary">{profileUser.followers_count || 0}</div>
                                <div className="text-text-muted text-xs uppercase tracking-wider">Followers</div>
                            </button>
                            <div className="w-px bg-border-default" />
                            <button
                                onClick={() => setFollowModal('following')}
                                className="text-left hover:opacity-80 transition-opacity"
                            >
                                <div className="text-lg font-bold text-text-primary">{profileUser.following_count || 0}</div>
                                <div className="text-text-muted text-xs uppercase tracking-wider">Following</div>
                            </button>
                        </div>

                        {/* Skills Section with Proficiency Levels */}
                        {!isLocked && skillsToRender.length > 0 && (
                            <div className="pt-4 border-t border-border-default/60">
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2.5">
                                    Skills & Proficiency
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {skillsToRender.map((s: any, i: number) => {
                                        const lvl = (s.level || 'intermediate').toLowerCase();
                                        const lvlBadge =
                                            lvl === 'advanced'
                                                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                                : lvl === 'beginner'
                                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                                : 'bg-purple/15 text-purple-light border-purple/30';

                                        return (
                                            <span
                                                key={i}
                                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-bg-card-elevated border border-border-default text-xs font-medium text-text-primary"
                                            >
                                                <span>{s.skill_name}</span>
                                                <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${lvlBadge}`}>
                                                    {lvl}
                                                </span>
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Locked Private State (Instagram-inspired) */}
                {isLocked ? (
                    <div className="card text-center py-16 px-6 border border-border-default bg-bg-card my-6">
                        <div className="w-16 h-16 rounded-full bg-purple/10 border border-purple/20 flex items-center justify-center mx-auto mb-4 text-purple-light">
                            <Lock className="w-7 h-7" />
                        </div>
                        <h3 className="text-lg font-bold text-text-primary mb-1.5">This Account is Private</h3>
                        <p className="text-text-secondary text-sm max-w-sm mx-auto mb-6 leading-relaxed">
                            Follow @{profileUser.username} to view their projects, experience, and builder contributions.
                        </p>
                        <button
                            onClick={handleFollowToggle}
                            disabled={followUpdating}
                            className="btn-primary inline-flex items-center gap-2 px-8 py-2.5 text-sm"
                        >
                            {following ? <Check className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                            <span>{following ? 'Following' : 'Follow to View'}</span>
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Verified Builder Reputation Card */}
                        {profileUser?.id && (
                            <ReputationCard
                                userId={profileUser.id}
                                isOwner={false}
                                initialScore={profileUser.reputation_score}
                            />
                        )}

                        {/* Resume & Portfolio Structured Section */}

                        {((profileUser.education?.length ?? 0) > 0 ||
                          (profileUser.experience?.length ?? 0) > 0 ||
                          (profileUser.projects?.length ?? 0) > 0 ||
                          profileUser.linkedin_url ||
                          profileUser.github_url ||
                          profileUser.portfolio_url ||
                          profileUser.resume_file) && (
                            <div className="card mb-6 p-6 border border-border-default bg-bg-card">
                                <h2 className="text-base font-bold mb-5 flex items-center gap-2 text-text-primary">
                                    <Briefcase className="w-4 h-4 text-purple-light" />
                                    <span>Builder Experience & Portfolio</span>
                                </h2>

                                {/* Experience */}
                                {(profileUser.experience?.length ?? 0) > 0 && (
                                    <div className="mb-6">
                                        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3 flex items-center gap-1.5">
                                            <Building2 className="w-3.5 h-3.5 text-primary" />
                                            <span>Experience</span>
                                        </h3>
                                        <div className="space-y-3">
                                            {profileUser.experience!.map((item: any, i: number) => {
                                                const isObj = typeof item === 'object' && item !== null;
                                                return (
                                                    <div key={i} className="p-3.5 rounded-xl bg-bg-card-elevated border border-border-default/60">
                                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                                            <div className="font-semibold text-sm text-text-primary">
                                                                {isObj ? item.title : item}
                                                            </div>
                                                            {isObj && (item.start_date || item.end_date) && (
                                                                <div className="text-[11px] text-text-muted flex items-center gap-1">
                                                                    <Calendar className="w-3 h-3" />
                                                                    <span>{item.start_date} – {item.end_date || 'Present'}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        {isObj && item.company && (
                                                            <div className="text-xs text-purple-light font-medium mt-0.5">
                                                                {item.company} {item.location ? `• ${item.location}` : ''}
                                                            </div>
                                                        )}
                                                        {isObj && item.description && (
                                                            <p className="text-xs text-text-secondary mt-2 leading-relaxed">
                                                                {item.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Projects */}
                                {(profileUser.projects?.length ?? 0) > 0 && (
                                    <div className="mb-6">
                                        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3 flex items-center gap-1.5">
                                            <FolderOpen className="w-3.5 h-3.5 text-primary" />
                                            <span>Projects & Workspaces</span>
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {profileUser.projects!.map((item: any, i: number) => {
                                                const isObj = typeof item === 'object' && item !== null;
                                                return (
                                                    <div key={i} className="p-3.5 rounded-xl bg-bg-card-elevated border border-border-default/60 flex flex-col justify-between">
                                                        <div>
                                                            <div className="flex items-center justify-between gap-2">
                                                                <span className="font-semibold text-sm text-text-primary">
                                                                    {isObj ? item.title : item}
                                                                </span>
                                                                {isObj && item.link && (
                                                                    <a
                                                                        href={item.link}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="text-text-muted hover:text-purple transition-colors p-1"
                                                                    >
                                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                                    </a>
                                                                )}
                                                            </div>
                                                            {isObj && item.role && (
                                                                <div className="text-[11px] text-purple-light font-medium mt-0.5">
                                                                    {item.role}
                                                                </div>
                                                            )}
                                                            {isObj && item.description && (
                                                                <p className="text-xs text-text-secondary mt-2 leading-relaxed line-clamp-3">
                                                                    {item.description}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Education */}
                                {(profileUser.education?.length ?? 0) > 0 && (
                                    <div className="mb-6">
                                        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3 flex items-center gap-1.5">
                                            <GraduationCap className="w-3.5 h-3.5 text-primary" />
                                            <span>Education</span>
                                        </h3>
                                        <div className="space-y-2">
                                            {profileUser.education!.map((item: any, i: number) => {
                                                const isObj = typeof item === 'object' && item !== null;
                                                return (
                                                    <div key={i} className="p-3 rounded-xl bg-bg-card-elevated border border-border-default/60 flex items-center justify-between">
                                                        <div>
                                                            <div className="font-semibold text-xs text-text-primary">
                                                                {isObj ? (item.degree ? `${item.degree} — ${item.institution}` : item.institution) : item}
                                                            </div>
                                                            {isObj && item.field_of_study && (
                                                                <div className="text-[11px] text-text-muted mt-0.5">{item.field_of_study}</div>
                                                            )}
                                                        </div>
                                                        {isObj && (item.start_year || item.end_year) && (
                                                            <span className="text-[11px] text-text-muted font-medium">
                                                                {item.start_year} – {item.end_year || 'Present'}
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Links & Resume */}
                                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-border-default/60">
                                    <div className="flex flex-wrap gap-4">
                                        {profileUser.linkedin_url && (
                                            <a
                                                href={profileUser.linkedin_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-purple transition-colors font-medium"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5" /> LinkedIn
                                            </a>
                                        )}
                                        {profileUser.github_url && (
                                            <a
                                                href={profileUser.github_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-purple transition-colors font-medium"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5" /> GitHub
                                            </a>
                                        )}
                                        {profileUser.portfolio_url && (
                                            <a
                                                href={profileUser.portfolio_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-purple transition-colors font-medium"
                                            >
                                                <Globe className="w-3.5 h-3.5" /> Portfolio
                                            </a>
                                        )}
                                    </div>

                                    {profileUser.resume_file && (
                                        <a
                                            href={profileUser.resume_file}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-purple/15 text-purple-light hover:bg-purple/25 transition-colors text-xs font-semibold"
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                            <span>Download Resume</span>
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* User Posts Section */}
                        <div className="space-y-4">
                            <h2 className="text-base font-bold text-text-primary px-1">
                                Posts by {profileUser.full_name || profileUser.username}
                            </h2>
                            {posts.length > 0 ? (
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
                                <div className="card text-center py-12 border border-border-default">
                                    <p className="text-text-muted text-sm">No posts to show.</p>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Followers/Following Modal */}
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
