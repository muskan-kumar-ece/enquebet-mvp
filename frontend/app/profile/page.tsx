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
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { api } from '@/lib/api';
import PostCard from '@/components/feed/PostCard';
import { AvatarUpload, CoverUpload } from '@/components/ui/ImageUpload';
import ProfileCompletenessCard from '@/components/ui/ProfileCompletenessCard';
import { VerificationBadge, ReputationBadge } from '@/components/ui/BuilderBadge';
import { ReputationCard } from '@/components/ui/ReputationCard';
import FollowersModal from '@/components/ui/FollowersModal';

import toast from 'react-hot-toast';

interface SkillItem {
    skill_name: string;
    level: 'beginner' | 'intermediate' | 'advanced';
}

interface EducationItem {
    institution: string;
    degree?: string;
    field_of_study?: string;
    start_year?: string;
    end_year?: string;
}

interface ExperienceItem {
    title: string;
    company: string;
    location?: string;
    start_date?: string;
    end_date?: string;
    description?: string;
}

interface ProjectItem {
    title: string;
    description: string;
    role?: string;
    link?: string;
}

export default function ProfilePage() {
    const { user, loading: authLoading, updateUser } = useRequireAuth();
    const [userPosts, setUserPosts] = useState<any[]>([]);
    const [savedPosts, setSavedPosts] = useState<any[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [activeTab, setActiveTab] = useState<'posts' | 'saved'>('posts');
    const [savedLoading, setSavedLoading] = useState(false);
    const [followModal, setFollowModal] = useState<'followers' | 'following' | null>(null);

    // Form section toggles for structured editing
    const [showEduForm, setShowEduForm] = useState(false);
    const [newEdu, setNewEdu] = useState<EducationItem>({ institution: '', degree: '', field_of_study: '', start_year: '', end_year: '' });
    const [showExpForm, setShowExpForm] = useState(false);
    const [newExp, setNewExp] = useState<ExperienceItem>({ title: '', company: '', location: '', start_date: '', end_date: '', description: '' });
    const [showProjForm, setShowProjForm] = useState(false);
    const [newProj, setNewProj] = useState<ProjectItem>({ title: '', description: '', role: '', link: '' });

    useEffect(() => {
        if (!authLoading && user) {
            fetchUserPosts();
            setLoading(false);
        }
    }, [authLoading, user]);

    useEffect(() => {
        if (activeTab === 'saved' && savedPosts.length === 0 && !savedLoading) {
            fetchSavedPosts();
        }
    }, [activeTab]);

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

    const handleEdit = (highlightField?: string) => {
        // Parse skills into structured { skill_name, level }
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
            is_private: Boolean(user?.is_private),
            cover_image: user?.cover_image || '',
            avatar_url: user?.avatar_url || user?.profile_image || '',
            skills: initialSkills,
            education: Array.isArray(user?.education) ? [...user.education] : [],
            projects: Array.isArray(user?.projects) ? [...user.projects] : [],
            experience: Array.isArray(user?.experience) ? [...user.experience] : [],
            linkedin_url: user?.linkedin_url || '',
            github_url: user?.github_url || '',
            portfolio_url: user?.portfolio_url || '',
            resume_file: undefined,
        });
        setIsEditing(true);
    };

    const handleSave = async () => {
        setUpdating(true);
        try {
            // Clean skills payload: filter out empty names
            const cleanSkills = (editData.skills || [])
                .filter((s: SkillItem) => s.skill_name && s.skill_name.trim().length > 0)
                .map((s: SkillItem) => ({
                    skill_name: s.skill_name.trim(),
                    level: s.level || 'intermediate',
                }));

            const payload: any = {
                ...editData,
                skills: cleanSkills,
            };

            // Remove resume_file if none was selected
            if (!(payload.resume_file instanceof File)) {
                delete payload.resume_file;
            }

            const updated = await api.updateProfile(payload);
            updateUser(updated);
            setIsEditing(false);
            toast.success('Profile updated successfully!');
        } catch (err: any) {
            toast.error(err.message || 'Failed to update profile');
        } finally {
            setUpdating(false);
        }
    };

    const handleCancel = () => {
        setEditData({});
        setShowEduForm(false);
        setShowExpForm(false);
        setShowProjForm(false);
        setIsEditing(false);
    };

    // Skills helper methods
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

    // Education helper methods
    const addEducationItem = () => {
        if (!newEdu.institution.trim()) {
            toast.error('Institution name is required');
            return;
        }
        setEditData({
            ...editData,
            education: [...(editData.education || []), newEdu],
        });
        setNewEdu({ institution: '', degree: '', field_of_study: '', start_year: '', end_year: '' });
        setShowEduForm(false);
    };

    const removeEducationItem = (index: number) => {
        setEditData({
            ...editData,
            education: (editData.education || []).filter((_: any, i: number) => i !== index),
        });
    };

    // Experience helper methods
    const addExperienceItem = () => {
        if (!newExp.title.trim() || !newExp.company.trim()) {
            toast.error('Title and Company are required');
            return;
        }
        setEditData({
            ...editData,
            experience: [...(editData.experience || []), newExp],
        });
        setNewExp({ title: '', company: '', location: '', start_date: '', end_date: '', description: '' });
        setShowExpForm(false);
    };

    const removeExperienceItem = (index: number) => {
        setEditData({
            ...editData,
            experience: (editData.experience || []).filter((_: any, i: number) => i !== index),
        });
    };

    // Project helper methods
    const addProjectItem = () => {
        if (!newProj.title.trim()) {
            toast.error('Project title is required');
            return;
        }
        setEditData({
            ...editData,
            projects: [...(editData.projects || []), newProj],
        });
        setNewProj({ title: '', description: '', role: '', link: '' });
        setShowProjForm(false);
    };

    const removeProjectItem = (index: number) => {
        setEditData({
            ...editData,
            projects: (editData.projects || []).filter((_: any, i: number) => i !== index),
        });
    };

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-text-secondary animate-pulse text-sm">Loading builder profile...</div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-text-secondary">User not found</div>
            </div>
        );
    }

    // Helper to render skills with proficiency pills
    const skillsToRender = user.skills_detailed && user.skills_detailed.length > 0
        ? user.skills_detailed
        : (user.skills || []).map((s: string) => ({ skill_name: s, level: 'intermediate' }));

    return (
        <div className="min-h-screen p-4 sm:p-6 pb-24">
            <div className="max-w-4xl mx-auto">
                {/* Profile Header Card */}
                <div className="card mb-6 overflow-hidden p-0 border border-border-default">
                    {/* Cover Banner */}
                    {isEditing ? (
                        <div className="relative">
                            <CoverUpload
                                currentImage={editData.cover_image || user?.cover_image}
                                onImageUploaded={(url) => setEditData({ ...editData, cover_image: url })}
                            />
                        </div>
                    ) : (
                        <div className="relative w-full h-36 sm:h-48 md:h-56 bg-gradient-to-r from-purple/30 via-primary/20 to-purple/10 overflow-hidden">
                            {user.cover_image ? (
                                <img
                                    src={user.cover_image}
                                    alt="Cover banner"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="absolute inset-0 bg-gradient-to-br from-purple/20 via-bg-card to-primary/10 flex items-center justify-end p-4">
                                    <span className="text-[11px] text-text-muted/60 tracking-wider uppercase font-semibold">ENQUEbet Builder</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Identity & Main Info Container */}
                    <div className="px-6 pb-6 pt-0 relative z-10">
                        {/* Profile Picture (overlapping banner) */}
                        <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-16 sm:-mt-20 mb-4 gap-4">
                            <div className="flex items-center justify-center sm:justify-start">
                                {isEditing ? (
                                    <div className="relative">
                                        <AvatarUpload
                                            onImageUploaded={(url) => setEditData({ ...editData, avatar_url: url })}
                                            currentImage={editData.avatar_url || user?.avatar_url || user?.profile_image}
                                        />
                                        <p className="text-text-muted text-[11px] text-center mt-1">Change Photo</p>
                                    </div>
                                ) : (
                                    <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-bg-card overflow-hidden bg-gradient-to-br from-purple to-purple-dark flex items-center justify-center shadow-xl shadow-purple/20 ring-2 ring-purple/20 shrink-0">
                                        {user?.avatar_url || user?.profile_image ? (
                                            <img
                                                src={user.avatar_url || user.profile_image}
                                                alt={user.full_name || user.username}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-3xl sm:text-4xl font-bold text-white">
                                                {(user?.full_name || user?.username || '?').charAt(0).toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Edit Profile Action Button */}
                            {!isEditing && (
                                <button
                                    onClick={() => handleEdit()}
                                    className="btn-primary self-center sm:self-end flex items-center gap-2 text-sm px-5 py-2.5"
                                >
                                    <Edit className="w-4 h-4" />
                                    <span>Edit Profile</span>
                                </button>
                            )}
                        </div>

                        {/* View Mode Display */}
                        {!isEditing ? (
                            <div className="space-y-4">
                                {/* Badges Row */}
                                <div className="flex flex-wrap items-center gap-2">
                                    <VerificationBadge level={user.verification_level} />
                                    <ReputationBadge score={user.reputation_score} />
                                    {user.is_private && (
                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-bg-hover text-text-muted text-xs border border-border-default">
                                            <Lock className="w-3.5 h-3.5" />
                                            <span>Private Account</span>
                                        </div>
                                    )}
                                </div>

                                {/* Full Name & Username */}
                                <div>
                                    <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
                                        {user.full_name || user.username}
                                    </h1>
                                    <p className="text-text-muted text-sm mt-0.5">@{user.username}</p>
                                </div>

                                {/* Professional Headline */}
                                {user.headline ? (
                                    <p className="text-text-primary text-base font-medium leading-snug">
                                        {user.headline}
                                    </p>
                                ) : (
                                    <p className="text-text-muted text-sm italic">
                                        No headline added yet. Click &quot;Edit Profile&quot; to add one.
                                    </p>
                                )}

                                {/* Bio */}
                                {user.bio && (
                                    <p className="text-text-secondary text-sm leading-relaxed max-w-2xl whitespace-pre-line">
                                        {user.bio}
                                    </p>
                                )}

                                {/* Location & College Meta */}
                                <div className="flex flex-wrap items-center gap-4 text-text-muted text-xs sm:text-sm pt-1">
                                    {user.location && (
                                        <div className="flex items-center gap-1.5">
                                            <MapPin className="w-3.5 h-3.5 text-purple-light" />
                                            <span>{user.location}</span>
                                        </div>
                                    )}
                                    {user.college && (
                                        <div className="flex items-center gap-1.5">
                                            <GraduationCap className="w-3.5 h-3.5 text-primary" />
                                            <span>{user.college}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Stats Bar */}
                                <div className="flex gap-6 pt-3 pb-1 border-t border-border-default/60">
                                    <div className="text-left">
                                        <div className="text-lg font-bold text-text-primary">{userPosts.length}</div>
                                        <div className="text-text-muted text-xs uppercase tracking-wider">Posts</div>
                                    </div>
                                    <div className="w-px bg-border-default" />
                                    <button
                                        onClick={() => setFollowModal('followers')}
                                        className="text-left hover:opacity-80 transition-opacity"
                                    >
                                        <div className="text-lg font-bold text-text-primary">{user.followers_count || 0}</div>
                                        <div className="text-text-muted text-xs uppercase tracking-wider">Followers</div>
                                    </button>
                                    <div className="w-px bg-border-default" />
                                    <button
                                        onClick={() => setFollowModal('following')}
                                        className="text-left hover:opacity-80 transition-opacity"
                                    >
                                        <div className="text-lg font-bold text-text-primary">{user.following_count || 0}</div>
                                        <div className="text-text-muted text-xs uppercase tracking-wider">Following</div>
                                    </button>
                                </div>

                                {/* Skills Section with Proficiency Levels */}
                                {skillsToRender.length > 0 && (
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
                        ) : (
                            /* Edit Mode Form */
                            <div className="w-full space-y-5 mt-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-text-secondary">Full Name</label>
                                        <input
                                            type="text"
                                            value={editData.full_name}
                                            onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
                                            className="input w-full"
                                            placeholder="Your full name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-text-secondary">Location</label>
                                        <input
                                            type="text"
                                            value={editData.location}
                                            onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                                            className="input w-full"
                                            placeholder="City, Country"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-text-secondary">
                                        Professional Headline
                                    </label>
                                    <input
                                        type="text"
                                        maxLength={200}
                                        value={editData.headline}
                                        onChange={(e) => setEditData({ ...editData, headline: e.target.value })}
                                        className="input w-full"
                                        placeholder="e.g. Full Stack Engineer | React & Django | Building AI tools"
                                    />
                                    <div className="flex justify-between text-[11px] text-text-muted mt-1">
                                        <span>Concise summary of your builder role and stack</span>
                                        <span>{(editData.headline || '').length}/200</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-text-secondary">Bio</label>
                                    <textarea
                                        rows={3}
                                        value={editData.bio}
                                        onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                                        className="input w-full resize-none"
                                        placeholder="Tell other builders about what you love to create..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-text-secondary">College / University</label>
                                    <input
                                        type="text"
                                        value={editData.college}
                                        onChange={(e) => setEditData({ ...editData, college: e.target.value })}
                                        className="input w-full"
                                        placeholder="University or Institution"
                                    />
                                </div>

                                {/* Privacy Toggle */}
                                <div className="p-4 rounded-xl bg-bg-card-elevated border border-border-default flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <Lock className="w-4 h-4 text-purple-light" />
                                            <span className="text-sm font-semibold text-text-primary">Private Account</span>
                                        </div>
                                        <p className="text-xs text-text-muted mt-0.5">
                                            When enabled, only approved followers can view your resume, projects, and posts.
                                        </p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={Boolean(editData.is_private)}
                                        onChange={(e) => setEditData({ ...editData, is_private: e.target.checked })}
                                        className="w-5 h-5 accent-purple rounded cursor-pointer"
                                    />
                                </div>

                                {/* Skills & Proficiency Editor */}
                                <div className="pt-3 border-t border-border-default">
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                                                Skills & Proficiency
                                            </h3>
                                            <p className="text-[11px] text-text-muted">Specify your skill names and honest proficiency levels.</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={addSkillRow}
                                            className="text-xs text-purple-light hover:text-purple font-medium flex items-center gap-1 px-2.5 py-1 rounded bg-purple/10 border border-purple/20"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            <span>Add Skill</span>
                                        </button>
                                    </div>

                                    <div className="space-y-2">
                                        {(editData.skills || []).map((s: SkillItem, index: number) => (
                                            <div key={index} className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={s.skill_name}
                                                    onChange={(e) => updateSkillRow(index, 'skill_name', e.target.value)}
                                                    className="input flex-1 py-1.5 text-sm"
                                                    placeholder="Enter skill"
                                                />
                                                <select
                                                    value={s.level || 'intermediate'}
                                                    onChange={(e) => updateSkillRow(index, 'level', e.target.value as any)}
                                                    className="input py-1.5 text-xs text-text-primary cursor-pointer w-32"
                                                >
                                                    <option value="beginner">Beginner</option>
                                                    <option value="intermediate">Intermediate</option>
                                                    <option value="advanced">Advanced</option>
                                                </select>
                                                <button
                                                    type="button"
                                                    onClick={() => removeSkillRow(index)}
                                                    className="p-2 text-text-secondary hover:text-red-400 transition-colors"
                                                    title="Remove skill"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Structured Education Editor */}
                                <div className="pt-3 border-t border-border-default">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Education</h3>
                                        <button
                                            type="button"
                                            onClick={() => setShowEduForm(!showEduForm)}
                                            className="text-xs text-purple-light hover:text-purple font-medium flex items-center gap-1"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            <span>Add Education</span>
                                        </button>
                                    </div>

                                    {/* Education list */}
                                    <div className="space-y-2 mb-3">
                                        {(editData.education || []).map((edu: any, idx: number) => {
                                            const isObj = typeof edu === 'object' && edu !== null;
                                            return (
                                                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-bg-card-elevated border border-border-default text-xs">
                                                    <div>
                                                        <div className="font-semibold text-text-primary">
                                                            {isObj ? (edu.degree ? `${edu.degree} — ${edu.institution}` : edu.institution) : edu}
                                                        </div>
                                                        {isObj && (edu.start_year || edu.end_year) && (
                                                            <div className="text-text-muted text-[11px] mt-0.5">
                                                                {edu.start_year} – {edu.end_year || 'Present'}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeEducationItem(idx)}
                                                        className="text-text-secondary hover:text-red-400 p-1"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Education Inline Form */}
                                    {showEduForm && (
                                        <div className="p-3 rounded-lg bg-bg-hover/70 border border-purple/30 space-y-2 mb-3">
                                            <input
                                                type="text"
                                                placeholder="Institution / University (e.g. Stanford University)"
                                                value={newEdu.institution}
                                                onChange={(e) => setNewEdu({ ...newEdu, institution: e.target.value })}
                                                className="input w-full text-xs"
                                            />
                                            <div className="grid grid-cols-2 gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="Degree (e.g. B.S., M.S.)"
                                                    value={newEdu.degree}
                                                    onChange={(e) => setNewEdu({ ...newEdu, degree: e.target.value })}
                                                    className="input w-full text-xs"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Field of Study (e.g. Computer Science)"
                                                    value={newEdu.field_of_study}
                                                    onChange={(e) => setNewEdu({ ...newEdu, field_of_study: e.target.value })}
                                                    className="input w-full text-xs"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="Start Year (e.g. 2021)"
                                                    value={newEdu.start_year}
                                                    onChange={(e) => setNewEdu({ ...newEdu, start_year: e.target.value })}
                                                    className="input w-full text-xs"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="End Year (or Present)"
                                                    value={newEdu.end_year}
                                                    onChange={(e) => setNewEdu({ ...newEdu, end_year: e.target.value })}
                                                    className="input w-full text-xs"
                                                />
                                            </div>
                                            <div className="flex justify-end gap-2 pt-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowEduForm(false)}
                                                    className="text-xs px-2.5 py-1 text-text-muted hover:text-text-primary"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={addEducationItem}
                                                    className="btn-primary text-xs px-3 py-1"
                                                >
                                                    Add
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Structured Experience Editor */}
                                <div className="pt-3 border-t border-border-default">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Work & Experience</h3>
                                        <button
                                            type="button"
                                            onClick={() => setShowExpForm(!showExpForm)}
                                            className="text-xs text-purple-light hover:text-purple font-medium flex items-center gap-1"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            <span>Add Experience</span>
                                        </button>
                                    </div>

                                    {/* Experience list */}
                                    <div className="space-y-2 mb-3">
                                        {(editData.experience || []).map((exp: any, idx: number) => {
                                            const isObj = typeof exp === 'object' && exp !== null;
                                            return (
                                                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-bg-card-elevated border border-border-default text-xs">
                                                    <div>
                                                        <div className="font-semibold text-text-primary">
                                                            {isObj ? `${exp.title} — ${exp.company}` : exp}
                                                        </div>
                                                        {isObj && (exp.start_date || exp.end_date) && (
                                                            <div className="text-text-muted text-[11px] mt-0.5">
                                                                {exp.start_date} – {exp.end_date || 'Present'} {exp.location ? `• ${exp.location}` : ''}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeExperienceItem(idx)}
                                                        className="text-text-secondary hover:text-red-400 p-1"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Experience Inline Form */}
                                    {showExpForm && (
                                        <div className="p-3 rounded-lg bg-bg-hover/70 border border-purple/30 space-y-2 mb-3">
                                            <div className="grid grid-cols-2 gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="Role Title (e.g. Lead Frontend Engineer)"
                                                    value={newExp.title}
                                                    onChange={(e) => setNewExp({ ...newExp, title: e.target.value })}
                                                    className="input w-full text-xs"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Company / Team (e.g. Vercel)"
                                                    value={newExp.company}
                                                    onChange={(e) => setNewExp({ ...newExp, company: e.target.value })}
                                                    className="input w-full text-xs"
                                                />
                                            </div>
                                            <div className="grid grid-cols-3 gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="Start Date (e.g. 2023)"
                                                    value={newExp.start_date}
                                                    onChange={(e) => setNewExp({ ...newExp, start_date: e.target.value })}
                                                    className="input w-full text-xs"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="End Date (or Present)"
                                                    value={newExp.end_date}
                                                    onChange={(e) => setNewExp({ ...newExp, end_date: e.target.value })}
                                                    className="input w-full text-xs"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Location (e.g. Remote)"
                                                    value={newExp.location}
                                                    onChange={(e) => setNewExp({ ...newExp, location: e.target.value })}
                                                    className="input w-full text-xs"
                                                />
                                            </div>
                                            <textarea
                                                rows={2}
                                                placeholder="Brief description of contributions..."
                                                value={newExp.description}
                                                onChange={(e) => setNewExp({ ...newExp, description: e.target.value })}
                                                className="input w-full text-xs resize-none"
                                            />
                                            <div className="flex justify-end gap-2 pt-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowExpForm(false)}
                                                    className="text-xs px-2.5 py-1 text-text-muted hover:text-text-primary"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={addExperienceItem}
                                                    className="btn-primary text-xs px-3 py-1"
                                                >
                                                    Add
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Structured Projects Editor */}
                                <div className="pt-3 border-t border-border-default">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Projects</h3>
                                        <button
                                            type="button"
                                            onClick={() => setShowProjForm(!showProjForm)}
                                            className="text-xs text-purple-light hover:text-purple font-medium flex items-center gap-1"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            <span>Add Project</span>
                                        </button>
                                    </div>

                                    {/* Projects list */}
                                    <div className="space-y-2 mb-3">
                                        {(editData.projects || []).map((proj: any, idx: number) => {
                                            const isObj = typeof proj === 'object' && proj !== null;
                                            return (
                                                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-bg-card-elevated border border-border-default text-xs">
                                                    <div>
                                                        <div className="font-semibold text-text-primary">
                                                            {isObj ? proj.title : proj}
                                                        </div>
                                                        {isObj && proj.description && (
                                                            <div className="text-text-muted text-[11px] mt-0.5 line-clamp-1">
                                                                {proj.description}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeProjectItem(idx)}
                                                        className="text-text-secondary hover:text-red-400 p-1"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Project Inline Form */}
                                    {showProjForm && (
                                        <div className="p-3 rounded-lg bg-bg-hover/70 border border-purple/30 space-y-2 mb-3">
                                            <div className="grid grid-cols-2 gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="Project Name (e.g. ENQUEbet)"
                                                    value={newProj.title}
                                                    onChange={(e) => setNewProj({ ...newProj, title: e.target.value })}
                                                    className="input w-full text-xs"
                                                />
                                                <input
                                                    type="text"
                                                    placeholder="Your Role (e.g. Lead Architect)"
                                                    value={newProj.role}
                                                    onChange={(e) => setNewProj({ ...newProj, role: e.target.value })}
                                                    className="input w-full text-xs"
                                                />
                                            </div>
                                            <textarea
                                                rows={2}
                                                placeholder="Project description, architecture, and impact..."
                                                value={newProj.description}
                                                onChange={(e) => setNewProj({ ...newProj, description: e.target.value })}
                                                className="input w-full text-xs resize-none"
                                            />
                                            <input
                                                type="url"
                                                placeholder="Project Link (e.g. https://github.com/...)"
                                                value={newProj.link}
                                                onChange={(e) => setNewProj({ ...newProj, link: e.target.value })}
                                                className="input w-full text-xs"
                                            />
                                            <div className="flex justify-end gap-2 pt-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowProjForm(false)}
                                                    className="text-xs px-2.5 py-1 text-text-muted hover:text-text-primary"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={addProjectItem}
                                                    className="btn-primary text-xs px-3 py-1"
                                                >
                                                    Add
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Social Links & Resume Upload */}
                                <div className="pt-3 border-t border-border-default space-y-3">
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Professional Links & Resume</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-[11px] text-text-muted mb-1">LinkedIn URL</label>
                                            <input
                                                type="url"
                                                value={editData.linkedin_url || ''}
                                                onChange={(e) => setEditData({ ...editData, linkedin_url: e.target.value })}
                                                className="input w-full text-xs"
                                                placeholder="https://linkedin.com/in/..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] text-text-muted mb-1">GitHub URL</label>
                                            <input
                                                type="url"
                                                value={editData.github_url || ''}
                                                onChange={(e) => setEditData({ ...editData, github_url: e.target.value })}
                                                className="input w-full text-xs"
                                                placeholder="https://github.com/..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] text-text-muted mb-1">Portfolio URL</label>
                                            <input
                                                type="url"
                                                value={editData.portfolio_url || ''}
                                                onChange={(e) => setEditData({ ...editData, portfolio_url: e.target.value })}
                                                className="input w-full text-xs"
                                                placeholder="https://yoursite.com"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] text-text-muted mb-1">Resume File (.pdf, .doc, .docx)</label>
                                        <input
                                            type="file"
                                            accept=".pdf,.doc,.docx"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) setEditData({ ...editData, resume_file: file });
                                            }}
                                            className="input w-full text-xs file:mr-3 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-medium file:bg-purple/15 file:text-purple-light hover:file:bg-purple/25 file:cursor-pointer"
                                        />
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-3 pt-4 border-t border-border-default">
                                    <button
                                        onClick={handleSave}
                                        disabled={updating}
                                        className="btn-primary flex-1 py-2.5"
                                    >
                                        {updating ? 'Saving...' : 'Save Changes'}
                                    </button>
                                    <button
                                        onClick={handleCancel}
                                        disabled={updating}
                                        className="btn-outline px-6 py-2.5"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Profile Completeness Card (View Mode) */}
                {!isEditing && (
                    <ProfileCompletenessCard
                        user={user}
                        onStartEdit={(field) => handleEdit(field)}
                    />
                )}

                {/* Verified Builder Reputation Card (View Mode) */}
                {!isEditing && user?.id && (
                    <ReputationCard
                        userId={user.id}
                        isOwner={true}
                        initialScore={user.reputation_score}
                    />
                )}


                {/* Resume & Portfolio Structured Section (View Mode) */}
                {!isEditing && (
                    ((user?.education?.length ?? 0) > 0 ||
                     (user?.experience?.length ?? 0) > 0 ||
                     (user?.projects?.length ?? 0) > 0 ||
                     user?.linkedin_url ||
                     user?.github_url ||
                     user?.portfolio_url ||
                     user?.resume_file) && (
                        <div className="card mb-6 p-6 border border-border-default bg-bg-card">
                            <h2 className="text-base font-bold mb-5 flex items-center gap-2 text-text-primary">
                                <Briefcase className="w-4 h-4 text-purple-light" />
                                <span>Builder Experience & Portfolio</span>
                            </h2>

                            {/* Work Experience */}
                            {(user.experience?.length ?? 0) > 0 && (
                                <div className="mb-6">
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3 flex items-center gap-1.5">
                                        <Building2 className="w-3.5 h-3.5 text-primary" />
                                        <span>Experience</span>
                                    </h3>
                                    <div className="space-y-3">
                                        {user.experience!.map((item: any, i: number) => {
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
                            {(user.projects?.length ?? 0) > 0 && (
                                <div className="mb-6">
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3 flex items-center gap-1.5">
                                        <FolderOpen className="w-3.5 h-3.5 text-primary" />
                                        <span>Projects & Workspaces</span>
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {user.projects!.map((item: any, i: number) => {
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
                            {(user.education?.length ?? 0) > 0 && (
                                <div className="mb-6">
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3 flex items-center gap-1.5">
                                        <GraduationCap className="w-3.5 h-3.5 text-primary" />
                                        <span>Education</span>
                                    </h3>
                                    <div className="space-y-2">
                                        {user.education!.map((item: any, i: number) => {
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

                            {/* Professional Links & Resume Download */}
                            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-border-default/60">
                                <div className="flex flex-wrap gap-4">
                                    {user.linkedin_url && (
                                        <a
                                            href={user.linkedin_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-purple transition-colors font-medium"
                                        >
                                            <ExternalLink className="w-3.5 h-3.5" /> LinkedIn
                                        </a>
                                    )}
                                    {user.github_url && (
                                        <a
                                            href={user.github_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-purple transition-colors font-medium"
                                        >
                                            <ExternalLink className="w-3.5 h-3.5" /> GitHub
                                        </a>
                                    )}
                                    {user.portfolio_url && (
                                        <a
                                            href={user.portfolio_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-purple transition-colors font-medium"
                                        >
                                            <Globe className="w-3.5 h-3.5" /> Portfolio
                                        </a>
                                    )}
                                </div>

                                {user.resume_file && (
                                    <a
                                        href={user.resume_file}
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
                    )
                )}

                {/* Tabs for Posts and Saved */}
                <div className="flex gap-1 bg-bg-card rounded-xl p-1 mb-4 border border-border-default">
                    <button
                        onClick={() => setActiveTab('posts')}
                        className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                            activeTab === 'posts'
                                ? 'bg-purple/15 text-purple-light shadow-sm'
                                : 'text-text-muted hover:text-text-primary'
                        }`}
                    >
                        Your Posts ({userPosts.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('saved')}
                        className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                            activeTab === 'saved'
                                ? 'bg-purple/15 text-purple-light shadow-sm'
                                : 'text-text-muted hover:text-text-primary'
                        }`}
                    >
                        Saved
                    </button>
                </div>

                {/* Tab Content */}
                <div className="space-y-4">
                    {activeTab === 'posts' ? (
                        <>
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
                                <div className="card text-center py-12 border border-border-default">
                                    <p className="text-text-muted text-sm">No posts yet. Share your first builder project or idea!</p>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            {savedLoading ? (
                                <div className="card text-center py-12 border border-border-default">
                                    <div className="text-text-muted animate-pulse text-sm">Loading saved posts...</div>
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
                                <div className="card text-center py-12 border border-border-default">
                                    <Bookmark className="w-10 h-10 text-text-muted mx-auto mb-3 opacity-30" />
                                    <p className="text-text-muted text-sm">No saved posts yet. Bookmark interesting builder ideas to review here.</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Followers/Following Modal */}
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
