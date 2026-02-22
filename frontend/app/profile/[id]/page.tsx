"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MapPin, GraduationCap, ArrowLeft, MessageSquare, Users, Check, Briefcase, FolderOpen, ExternalLink, Download } from 'lucide-react';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { api } from '@/lib/api';
import PostCard from '@/components/feed/PostCard';
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
                api.getUserPosts(params.id as string),
                api.getFollowStatus(params.id as string),
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

            // Refresh counts from server (if provided)
            const refreshed = await api.getUser(profileUser.id);
            setProfileUser(refreshed);
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
                <div className="text-text-secondary animate-pulse">Loading profile...</div>
            </div>
        );
    }

    if (error || !profileUser) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="card text-center py-12">
                    <p className="text-red-500 mb-4">{error}</p>
                    <button onClick={() => router.push('/')} className="btn-primary">
                        Back to Feed
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-4xl mx-auto">
                {/* Back button */}
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-text-muted hover:text-primary transition-colors mb-6 text-sm"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                </button>

                {/* Profile Header */}
                <div className="card mb-6 overflow-hidden">
                    {/* Gradient banner */}
                    <div className="h-28 -mx-6 -mt-6 mb-0 bg-gradient-to-r from-purple/20 via-primary/10 to-purple/5" />

                    <div className="flex flex-col items-center -mt-16 relative z-10">
                        {/* Profile Picture */}
                        <div className="w-28 h-28 rounded-full mb-4 border-4 border-bg-card overflow-hidden bg-gradient-to-br from-purple to-purple-dark flex items-center justify-center shadow-lg shadow-purple/20 ring-2 ring-purple/20">
                            {profileUser.avatar_url ? (
                                <img src={profileUser.avatar_url} alt={profileUser.full_name || profileUser.username} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-3xl font-bold text-white">
                                    {(profileUser.full_name || profileUser.username || '?').charAt(0).toUpperCase()}
                                </span>
                            )}
                        </div>

                        {/* Basic Info */}
                        <h1 className="text-2xl font-bold mb-1">{profileUser.full_name || profileUser.username}</h1>
                        <p className="text-text-muted mb-3 text-sm">@{profileUser.username}</p>
                        <p className="text-text-secondary text-center max-w-md mb-5 text-sm leading-relaxed">
                            {profileUser.bio || 'No bio yet'}
                        </p>

                        {/* Location & College */}
                        <div className="flex flex-wrap gap-4 mb-6 text-text-muted text-sm">
                            {profileUser.location && (
                                <div className="flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5" />
                                    <span>{profileUser.location}</span>
                                </div>
                            )}
                            {profileUser.college && (
                                <div className="flex items-center gap-1.5">
                                    <GraduationCap className="w-3.5 h-3.5" />
                                    <span>{profileUser.college}</span>
                                </div>
                            )}
                        </div>

                        {/* Stats */}
                        <div className="flex gap-6 mb-6 bg-bg-hover/50 rounded-xl px-6 py-3">
                            <div className="text-center">
                                <div className="text-xl font-bold">{posts.length}</div>
                                <div className="text-text-muted text-xs uppercase tracking-wider">Posts</div>
                            </div>
                            <div className="w-px bg-border-default" />
                            <button onClick={() => setFollowModal('followers')} className="text-center hover:opacity-80 transition-opacity">
                                <div className="text-xl font-bold">{profileUser.followers_count || 0}</div>
                                <div className="text-text-muted text-xs uppercase tracking-wider">Followers</div>
                            </button>
                            <div className="w-px bg-border-default" />
                            <button onClick={() => setFollowModal('following')} className="text-center hover:opacity-80 transition-opacity">
                                <div className="text-xl font-bold">{profileUser.following_count || 0}</div>
                                <div className="text-text-muted text-xs uppercase tracking-wider">Following</div>
                            </button>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                onClick={handleFollowToggle}
                                disabled={followUpdating}
                                className={following ? 'btn-outline flex items-center gap-2 px-6' : 'btn-primary flex items-center gap-2 px-6'}
                            >
                                {following ? <Check className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                                {followUpdating ? 'Updating...' : (following ? 'Unfollow' : 'Follow')}
                            </button>
                            <button
                                onClick={handleMessage}
                                disabled={sendingMessage}
                                className="btn-outline flex items-center gap-2 px-6"
                            >
                                <MessageSquare className="w-4 h-4" />
                                {sendingMessage ? 'Starting...' : 'Message'}
                            </button>
                        </div>

                        {/* Skills */}
                        {profileUser.skills && profileUser.skills.length > 0 && (
                            <div className="w-full mt-8 pt-6 border-t border-border-default">
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">Skills</h3>
                                <div className="flex flex-wrap gap-2">
                                    {profileUser.skills.map((skill: string, i: number) => (
                                        <span key={i} className="pill">{skill}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Resume / Portfolio Section */}
                {(profileUser.education?.length > 0 || profileUser.experience?.length > 0 || profileUser.projects?.length > 0 || profileUser.linkedin_url || profileUser.github_url || profileUser.portfolio_url || profileUser.resume_file) && (
                    <div className="w-full bg-[#171722] border border-[#252533] rounded-xl p-5 mb-6">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Briefcase className="w-5 h-5 text-purple" />
                            Resume
                        </h2>

                        {profileUser.education?.length > 0 && (
                            <div className="mb-5">
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">Education</h3>
                                <ul className="space-y-1.5">
                                    {profileUser.education.map((item: string, i: number) => (
                                        <li key={i} className="flex items-start gap-2 text-text-secondary text-sm">
                                            <GraduationCap className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {profileUser.experience?.length > 0 && (
                            <div className="mb-5">
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">Experience</h3>
                                <ul className="space-y-1.5">
                                    {profileUser.experience.map((item: string, i: number) => (
                                        <li key={i} className="flex items-start gap-2 text-text-secondary text-sm">
                                            <Briefcase className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {profileUser.projects?.length > 0 && (
                            <div className="mb-5">
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">Projects</h3>
                                <ul className="space-y-1.5">
                                    {profileUser.projects.map((item: string, i: number) => (
                                        <li key={i} className="flex items-start gap-2 text-text-secondary text-sm">
                                            <FolderOpen className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {(profileUser.linkedin_url || profileUser.github_url || profileUser.portfolio_url) && (
                            <div className="mb-5">
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">Links</h3>
                                <div className="flex flex-wrap gap-3">
                                    {profileUser.linkedin_url && (
                                        <a href={profileUser.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-primary hover:text-purple transition-colors">
                                            <ExternalLink className="w-3.5 h-3.5" /> LinkedIn
                                        </a>
                                    )}
                                    {profileUser.github_url && (
                                        <a href={profileUser.github_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-primary hover:text-purple transition-colors">
                                            <ExternalLink className="w-3.5 h-3.5" /> GitHub
                                        </a>
                                    )}
                                    {profileUser.portfolio_url && (
                                        <a href={profileUser.portfolio_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-primary hover:text-purple transition-colors">
                                            <ExternalLink className="w-3.5 h-3.5" /> Portfolio
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}

                        {profileUser.resume_file && (
                            <div>
                                <a
                                    href={profileUser.resume_file}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple/15 text-purple-light hover:bg-purple/25 transition-colors text-sm font-medium"
                                >
                                    <Download className="w-4 h-4" />
                                    Download Resume
                                </a>
                            </div>
                        )}
                    </div>
                )}

                {/* User Posts */}
                <div className="space-y-4">
                    <h2 className="text-lg font-bold px-1">Posts</h2>
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
                        <div className="card text-center py-12">
                            <p className="text-text-muted text-sm">No posts to show.</p>
                        </div>
                    )}
                </div>
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
