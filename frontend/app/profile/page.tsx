"use client";

import { useState, useEffect } from 'react';
import {
    MapPin,
    GraduationCap,
    Edit,
    Plus,
    X,
    Bookmark,
    Download,
    ExternalLink,
    Briefcase,
    FolderOpen,
    Lock,
    Globe,
    Building2,
    Calendar,
    Settings,
    FileText,
    Sparkles
} from 'lucide-react';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { api } from '@/lib/api';
import PostCard from '@/components/feed/PostCard';
import { AvatarUpload, CoverUpload } from '@/components/ui/ImageUpload';
import ProfileCompletenessCard from '@/components/ui/ProfileCompletenessCard';
import FollowersModal from '@/components/ui/FollowersModal';
import ProfileHero from '@/components/profile/ProfileHero';
import BuilderHeatmap from '@/components/profile/BuilderHeatmap';
import PinnedProofSection from '@/components/profile/PinnedProofSection';
import PeerEndorsementWall from '@/components/profile/PeerEndorsementWall';
import ExperienceTimeline from '@/components/profile/ExperienceTimeline';
import ReputationRadar from '@/components/profile/ReputationRadar';
import EditDossierModal from '@/components/profile/EditDossierModal';
import toast from 'react-hot-toast';

interface SkillItem {
    skill_name: string;
    level: 'beginner' | 'intermediate' | 'advanced';
}

export default function ProfilePage() {
    const { user, loading: authLoading, updateUser } = useRequireAuth();
    const [dossier, setDossier] = useState<any>(null);
    const [dossierLoading, setDossierLoading] = useState(true);
    const [userPosts, setUserPosts] = useState<any[]>([]);
    const [savedPosts, setSavedPosts] = useState<any[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [editDossierOpen, setEditDossierOpen] = useState(false);
    const [editData, setEditData] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [activeTab, setActiveTab] = useState<'dossier' | 'posts' | 'saved' | 'settings'>('dossier');
    const [savedLoading, setSavedLoading] = useState(false);
    const [followModal, setFollowModal] = useState<'followers' | 'following' | null>(null);

    useEffect(() => {
        if (!authLoading && user) {
            fetchUserPosts();
            fetchDossier();
            setLoading(false);
        }
    }, [authLoading, user]);

    useEffect(() => {
        if (activeTab === 'saved' && savedPosts.length === 0 && !savedLoading) {
            fetchSavedPosts();
        }
    }, [activeTab]);

    const fetchDossier = async () => {
        setDossierLoading(true);
        try {
            const data = await api.getUserDossier();
            setDossier(data);
        } catch (err) {
            console.error('Failed to load dossier:', err);
        } finally {
            setDossierLoading(false);
        }
    };

    const fetchUserPosts = async () => {
        if (!user?.id) return;
        try {
            const posts = await api.getUserPosts(user.id.toString());
            setUserPosts(posts);
        } catch (err) {
            console.error('Failed to load posts:', err);
            setUserPosts([]);
        }
    };

    const fetchSavedPosts = async () => {
        setSavedLoading(true);
        try {
            const posts = await api.getSavedPosts();
            setSavedPosts(posts);
        } catch (err) {
            console.error('Failed to load saved posts:', err);
            setSavedPosts([]);
        } finally {
            setSavedLoading(false);
        }
    };

    const handleDeleteExperience = async (id: string) => {
        try {
            await api.deleteExperience(id);
            toast.success('Experience removed');
            fetchDossier();
        } catch (err: any) {
            toast.error(err.message || 'Failed to remove experience');
        }
    };

    const handleDeleteEducation = async (id: string) => {
        try {
            await api.deleteEducation(id);
            toast.success('Education removed');
            fetchDossier();
        } catch (err: any) {
            toast.error(err.message || 'Failed to remove education');
        }
    };

    const handlePrintPdf = () => {
        if (typeof window !== 'undefined') {
            window.print();
        }
    };

    const handleEditBasic = () => {
        let initialSkills: SkillItem[] = [];
        if (user?.skills_detailed && user.skills_detailed.length > 0) {
            initialSkills = user.skills_detailed.map((s: any) => ({
                skill_name: s.skill_name,
                level: s.level || 'intermediate',
            }));
        } else if (Array.isArray(user?.skills) && user.skills.length > 0) {
            initialSkills = user.skills.map((s: string) => ({
                skill_name: typeof s === 'string' ? s : (s as any).skill_name || '',
                level: 'intermediate',
            }));
        }

        setEditData({
            full_name: user?.full_name || '',
            headline: user?.headline || '',
            bio: user?.bio || '',
            location: user?.location || '',
            college: user?.college || '',
            city: user?.city || '',
            campus_domain: user?.campus_domain || '',
            is_private: Boolean(user?.is_private),
            skills: initialSkills,
            linkedin_url: user?.linkedin_url || '',
            github_url: user?.github_url || '',
            portfolio_url: user?.portfolio_url || '',
        });
        setActiveTab('settings');
        setIsEditing(true);
    };

    const handleSaveBasic = async () => {
        setUpdating(true);
        try {
            const payload: any = { ...editData };
            if (payload.skills) {
                payload.skills = payload.skills.filter((s: SkillItem) => s.skill_name.trim() !== '');
            }
            const updated = await api.updateProfile(payload);
            updateUser(updated);
            toast.success('Profile updated successfully!');
            setIsEditing(false);
            fetchDossier();
        } catch (err: any) {
            toast.error(err.message || 'Failed to update profile');
        } finally {
            setUpdating(false);
        }
    };

    const addSkillRow = () => {
        setEditData({
            ...editData,
            skills: [...(editData.skills || []), { skill_name: '', level: 'intermediate' }],
        });
    };

    const updateSkillRow = (index: number, key: 'skill_name' | 'level', value: string) => {
        const next = [...(editData.skills || [])];
        next[index] = { ...next[index], [key]: value };
        setEditData({ ...editData, skills: next });
    };

    const removeSkillRow = (index: number) => {
        setEditData({
            ...editData,
            skills: (editData.skills || []).filter((_: any, i: number) => i !== index),
        });
    };

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-zinc-400 animate-pulse text-sm">Loading builder dossier...</div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-zinc-400">User not found</div>
            </div>
        );
    }

    const currentUserData = dossier?.user || user;

    return (
        <div className="min-h-screen p-4 sm:p-6 pb-24 bg-blueprint-grid">
            <div className="max-w-5xl mx-auto">
                {/* Hero Header Dock */}
                <ProfileHero
                    user={currentUserData}
                    reputation={dossier?.reputation}
                    isOwner={true}
                    onOpenEdit={() => setEditDossierOpen(true)}
                    onExportPdf={handlePrintPdf}
                />

                {/* Primary Tab Switcher */}
                <div className="flex gap-1.5 p-1 rounded-2xl bg-[#0b0d14] border border-[#1b2030] mb-6 shadow-inner">
                    <button
                        onClick={() => { setActiveTab('dossier'); setIsEditing(false); }}
                        className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all ${
                            activeTab === 'dossier'
                                ? 'bg-[#1864ff] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_2px_6px_rgba(0,0,0,0.4)] border border-[#488eff]/50'
                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                        }`}
                    >
                        Verified Dossier
                    </button>
                    <button
                        onClick={() => { setActiveTab('posts'); setIsEditing(false); }}
                        className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all ${
                            activeTab === 'posts'
                                ? 'bg-[#1864ff] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_2px_6px_rgba(0,0,0,0.4)] border border-[#488eff]/50'
                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                        }`}
                    >
                        Your Posts ({userPosts.length})
                    </button>
                    <button
                        onClick={() => { setActiveTab('saved'); setIsEditing(false); }}
                        className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all ${
                            activeTab === 'saved'
                                ? 'bg-[#1864ff] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_2px_6px_rgba(0,0,0,0.4)] border border-[#488eff]/50'
                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                        }`}
                    >
                        Saved
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`py-2 px-3 text-xs sm:text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                            activeTab === 'settings'
                                ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                        }`}
                        title="Profile Settings & Completeness"
                    >
                        <Settings className="w-4 h-4" />
                        <span className="hidden sm:inline">Settings</span>
                    </button>
                </div>

                {/* Tab Views */}
                {activeTab === 'dossier' && (
                    <>
                        {/* 365-Day Activity Ledger */}
                        <BuilderHeatmap activity={dossier?.activity} />

                        {/* Pinned Proof of Work Bento Cards */}
                        <PinnedProofSection
                            proofs={dossier?.pinned_proofs || []}
                            isOwner={true}
                            onManagePins={() => setEditDossierOpen(true)}
                        />

                        {/* Verified Teammate Endorsements Wall */}
                        <PeerEndorsementWall
                            endorsements={dossier?.peer_endorsements || []}
                            averageRating={dossier?.reputation?.verified_stats?.average_peer_rating}
                            totalCount={dossier?.reputation?.verified_stats?.peer_reviews_count}
                        />

                        {/* Chronological Journey & Academic Credentials */}
                        <ExperienceTimeline
                            experiences={dossier?.experiences || []}
                            educations={dossier?.educations || []}
                            isOwner={true}
                            onAddExperience={() => setEditDossierOpen(true)}
                            onAddEducation={() => setEditDossierOpen(true)}
                            onDeleteExperience={handleDeleteExperience}
                            onDeleteEducation={handleDeleteEducation}
                        />

                        {/* Explainable Reputation Radar */}
                        <ReputationRadar
                            userId={user.id}
                            reputation={dossier?.reputation}
                            isOwner={true}
                            onRecalculated={(newRep) => setDossier({ ...dossier, reputation: newRep })}
                        />
                    </>
                )}

                {activeTab === 'posts' && (
                    <div className="space-y-4">
                        {userPosts.length > 0 ? (
                            <div className="space-y-4">
                                {userPosts.map((post) => (
                                    <PostCard
                                        key={post.id}
                                        id={post.id}
                                        author={user.full_name || user.username}
                                        timeAgo={new Date(post.created_at).toLocaleDateString()}
                                        title={post.title}
                                        description={post.description}
                                        tags={post.tags || []}
                                        likes={post.likes_count || 0}
                                        comments={post.comments_count || 0}
                                        is_liked={post.is_liked || false}
                                        is_saved={post.is_saved || false}
                                        onRefresh={fetchUserPosts}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-3xl border border-white/[0.08] bg-[#0c0c14] p-12 text-center">
                                <p className="text-zinc-400 text-sm">No posts shared yet. Share your first builder project or idea!</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'saved' && (
                    <div className="space-y-4">
                        {savedLoading ? (
                            <div className="rounded-3xl border border-white/[0.08] bg-[#0c0c14] p-12 text-center text-zinc-400 text-sm animate-pulse">
                                Loading saved posts...
                            </div>
                        ) : savedPosts.length > 0 ? (
                            <div className="space-y-4">
                                {savedPosts.map((post) => (
                                    <PostCard
                                        key={post.id}
                                        id={post.id}
                                        author={post.author_name || post.author?.full_name || 'Unknown'}
                                        timeAgo={new Date(post.created_at).toLocaleDateString()}
                                        title={post.title}
                                        description={post.description}
                                        tags={post.tags || []}
                                        likes={post.likes_count || 0}
                                        comments={post.comments_count || 0}
                                        is_liked={post.is_liked || false}
                                        is_saved={true}
                                        onRefresh={fetchSavedPosts}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-3xl border border-white/[0.08] bg-[#0c0c14] p-12 text-center">
                                <Bookmark className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                                <p className="text-zinc-400 text-sm">No saved posts yet. Bookmark interesting builder ideas to review here.</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="space-y-6">
                        {/* Profile Completeness Telemetry */}
                        <ProfileCompletenessCard
                            user={currentUserData}
                            onStartEdit={() => setIsEditing(true)}
                        />

                        {/* Account & Details Editor Card */}
                        <div className="rounded-3xl border border-white/[0.08] bg-[#0c0c14]/90 backdrop-blur-xl p-6 sm:p-7 shadow-xl">
                            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/[0.08]">
                                <div>
                                    <h2 className="text-base font-bold text-white">Basic Account & Profile Details</h2>
                                    <p className="text-xs text-zinc-400 mt-0.5">
                                        Update your profile avatar, cover, city, bio, and social links.
                                    </p>
                                </div>
                                {!isEditing && (
                                    <button
                                        onClick={handleEditBasic}
                                        className="btn-brand inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold"
                                    >
                                        <Edit className="w-3.5 h-3.5" />
                                        <span>Edit Details</span>
                                    </button>
                                )}
                            </div>

                            {isEditing ? (
                                <div className="space-y-5">
                                    {/* Cover & Avatar Uploaders */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-white/[0.06]">
                                        <div>
                                            <label className="block text-xs font-semibold text-zinc-300 mb-2">Avatar</label>
                                            <AvatarUpload
                                                currentImage={editData.profile_image || user?.profile_image}
                                                onImageUploaded={(url) => setEditData({ ...editData, profile_image: url })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-zinc-300 mb-2">Cover Banner</label>
                                            <CoverUpload
                                                currentImage={editData.cover_image || user?.cover_image}
                                                onImageUploaded={(url) => setEditData({ ...editData, cover_image: url })}
                                            />
                                        </div>
                                    </div>

                                    {/* Name & Headline */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Full Name</label>
                                            <input
                                                type="text"
                                                value={editData.full_name || ''}
                                                onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
                                                className="w-full px-3.5 py-2 rounded-lg bg-surface border border-border text-white text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Headline</label>
                                            <input
                                                type="text"
                                                value={editData.headline || ''}
                                                onChange={(e) => setEditData({ ...editData, headline: e.target.value })}
                                                className="w-full px-3.5 py-2 rounded-lg bg-surface border border-border text-white text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                                            />
                                        </div>
                                    </div>

                                    {/* Bio */}
                                    <div>
                                        <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Bio</label>
                                        <textarea
                                            rows={3}
                                            value={editData.bio || ''}
                                            onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                                            className="w-full px-3.5 py-2 rounded-lg bg-surface border border-border text-white text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand resize-none"
                                        />
                                    </div>

                                    {/* Location & Campus */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Location / City</label>
                                            <input
                                                type="text"
                                                value={editData.location || ''}
                                                onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                                                className="w-full px-3.5 py-2 rounded-lg bg-surface border border-border text-white text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">College / Institution</label>
                                            <input
                                                type="text"
                                                value={editData.college || ''}
                                                onChange={(e) => setEditData({ ...editData, college: e.target.value })}
                                                className="w-full px-3.5 py-2 rounded-lg bg-surface border border-border text-white text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Campus Domain</label>
                                            <input
                                                type="text"
                                                value={editData.campus_domain || ''}
                                                onChange={(e) => setEditData({ ...editData, campus_domain: e.target.value })}
                                                placeholder="e.g. iitb.ac.in"
                                                className="w-full px-3.5 py-2 rounded-lg bg-surface border border-border text-white text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                                            />
                                        </div>
                                    </div>

                                    {/* Social Links */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">GitHub URL</label>
                                            <input
                                                type="url"
                                                value={editData.github_url || ''}
                                                onChange={(e) => setEditData({ ...editData, github_url: e.target.value })}
                                                className="w-full px-3.5 py-2 rounded-lg bg-surface border border-border text-white text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">LinkedIn URL</label>
                                            <input
                                                type="url"
                                                value={editData.linkedin_url || ''}
                                                onChange={(e) => setEditData({ ...editData, linkedin_url: e.target.value })}
                                                className="w-full px-3.5 py-2 rounded-lg bg-surface border border-border text-white text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Portfolio URL</label>
                                            <input
                                                type="url"
                                                value={editData.portfolio_url || ''}
                                                onChange={(e) => setEditData({ ...editData, portfolio_url: e.target.value })}
                                                className="w-full px-3.5 py-2 rounded-lg bg-surface border border-border text-white text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                                            />
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.08]">
                                        <button
                                            type="button"
                                            onClick={() => setIsEditing(false)}
                                            className="px-4 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-white"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleSaveBasic}
                                            disabled={updating}
                                            className="btn-brand px-5 py-2 rounded-lg text-xs font-semibold disabled:opacity-50"
                                        >
                                            {updating ? 'Saving...' : 'Save Changes'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4 text-sm text-zinc-300">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <span className="text-xs text-zinc-500 block">Location</span>
                                            <span>{user.location || 'Not set'}</span>
                                        </div>
                                        <div>
                                            <span className="text-xs text-zinc-500 block">Campus / College</span>
                                            <span>{user.college || user.campus_domain || 'Not set'}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-xs text-zinc-500 block">Bio</span>
                                        <p className="mt-1 text-xs text-zinc-400 leading-relaxed whitespace-pre-line">
                                            {user.bio || 'No bio written yet.'}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Edit Dossier Modal */}
            <EditDossierModal
                isOpen={editDossierOpen}
                onClose={() => setEditDossierOpen(false)}
                user={currentUserData}
                onSaved={fetchDossier}
            />

            {/* Followers / Following Modal */}
            {followModal && (
                <FollowersModal
                    userId={user.id}
                    type={followModal}
                    onClose={() => setFollowModal(null)}
                />
            )}
        </div>
    );
}
