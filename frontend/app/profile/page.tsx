"use client";

import { useState, useEffect } from 'react';
import { MapPin, GraduationCap, Edit, Plus, X, Bookmark, Download, ExternalLink, Briefcase, FolderOpen } from 'lucide-react';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { api } from '@/lib/api';
import PostCard from '@/components/feed/PostCard';
import { AvatarUpload } from '@/components/ui/ImageUpload';
import FollowersModal from '@/components/ui/FollowersModal';
import toast from 'react-hot-toast';

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

    const handleEdit = () => {
        setEditData({
            full_name: user?.full_name || '',
            bio: user?.bio || '',
            location: user?.location || '',
            college: user?.college || '',
            skills: user?.skills || [],
            avatar_url: user?.avatar_url || '',
            education: user?.education || [],
            projects: user?.projects || [],
            experience: user?.experience || [],
            linkedin_url: user?.linkedin_url || '',
            github_url: user?.github_url || '',
            portfolio_url: user?.portfolio_url || '',
        });
        setIsEditing(true);
    };

    const handleSave = async () => {
        setUpdating(true);
        try {
            const updated = await api.updateProfile(editData);
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
        setIsEditing(false);
    };

    const addSkill = () => {
        setEditData({
            ...editData,
            skills: [...(editData.skills || []), ''],
        });
    };

    const updateSkill = (index: number, value: string) => {
        const newSkills = [...editData.skills];
        newSkills[index] = value;
        setEditData({ ...editData, skills: newSkills });
    };

    const removeSkill = (index: number) => {
        setEditData({
            ...editData,
            skills: editData.skills.filter((_: any, i: number) => i !== index),
        });
    };

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-text-secondary">Loading...</div>
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

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-4xl mx-auto">
                {/* Profile Header */}
                <div className="card mb-6 overflow-hidden">
                    {/* Gradient banner */}
                    <div className="h-28 -mx-6 -mt-6 mb-0 bg-gradient-to-r from-purple/20 via-primary/10 to-purple/5" />

                    <div className="flex flex-col items-center -mt-16 relative z-10">
                        {/* Profile Picture */}
                        {isEditing ? (
                            <div className="mb-4">
                                <AvatarUpload
                                    onImageUploaded={(url) => setEditData({ ...editData, avatar_url: url })}
                                    currentImage={editData.avatar_url || user?.avatar_url}
                                />
                                <p className="text-text-muted text-xs text-center mt-2">Click to change photo</p>
                            </div>
                        ) : (
                            <div className="w-28 h-28 rounded-full mb-4 border-4 border-bg-card overflow-hidden bg-gradient-to-br from-purple to-purple-dark flex items-center justify-center shadow-lg shadow-purple/20 ring-2 ring-purple/20">
                                {user?.avatar_url ? (
                                    <img src={user.avatar_url} alt={user.full_name || user.username} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-3xl font-bold text-white">
                                        {(user?.full_name || user?.username || '?').charAt(0).toUpperCase()}
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Basic Info */}
                        {!isEditing ? (
                            <>
                                <h1 className="text-2xl font-bold mb-1">{user.full_name || user.username}</h1>
                                <p className="text-text-muted mb-3 text-sm">@{user.username}</p>
                                <p className="text-text-secondary text-center max-w-md mb-5 text-sm leading-relaxed">
                                    {user.bio || 'No bio yet'}
                                </p>

                                {/* Location & College */}
                                <div className="flex flex-wrap gap-4 mb-6 text-text-muted text-sm">
                                    {user.location && (
                                        <div className="flex items-center gap-1.5">
                                            <MapPin className="w-3.5 h-3.5" />
                                            <span>{user.location}</span>
                                        </div>
                                    )}
                                    {user.college && (
                                        <div className="flex items-center gap-1.5">
                                            <GraduationCap className="w-3.5 h-3.5" />
                                            <span>{user.college}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Stats */}
                                <div className="flex gap-6 mb-6 bg-bg-hover/50 rounded-xl px-6 py-3">
                                    <div className="text-center">
                                        <div className="text-xl font-bold">{userPosts.length}</div>
                                        <div className="text-text-muted text-xs uppercase tracking-wider">Posts</div>
                                    </div>
                                    <div className="w-px bg-border-default" />
                                    <button onClick={() => setFollowModal('followers')} className="text-center hover:opacity-80 transition-opacity">
                                        <div className="text-xl font-bold">{user.followers_count || 0}</div>
                                        <div className="text-text-muted text-xs uppercase tracking-wider">Followers</div>
                                    </button>
                                    <div className="w-px bg-border-default" />
                                    <button onClick={() => setFollowModal('following')} className="text-center hover:opacity-80 transition-opacity">
                                        <div className="text-xl font-bold">{user.following_count || 0}</div>
                                        <div className="text-text-muted text-xs uppercase tracking-wider">Following</div>
                                    </button>
                                </div>

                                {/* Skills */}
                                {user.skills && user.skills.length > 0 && (
                                    <div className="w-full">
                                        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">Skills</h3>
                                        <div className="flex flex-wrap gap-2 mb-6">
                                            {user.skills.map((skill: string, i: number) => (
                                                <span key={i} className="pill">{skill}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <button onClick={handleEdit} className="btn-primary flex items-center gap-2">
                                    <Edit className="w-4 h-4" />
                                    <span>Edit Profile</span>
                                </button>
                            </>
                        ) : (
                            <div className="w-full space-y-4 mt-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-text-secondary">Full Name</label>
                                    <input
                                        type="text"
                                        value={editData.full_name}
                                        onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
                                        className="input w-full"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2 text-text-secondary">Bio</label>
                                    <textarea
                                        rows={3}
                                        value={editData.bio}
                                        onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                                        className="input w-full resize-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2 text-text-secondary">Location</label>
                                    <input
                                        type="text"
                                        value={editData.location}
                                        onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                                        className="input w-full"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2 text-text-secondary">College</label>
                                    <input
                                        type="text"
                                        value={editData.college}
                                        onChange={(e) => setEditData({ ...editData, college: e.target.value })}
                                        className="input w-full"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2 text-text-secondary">Skills</label>
                                    {editData.skills?.map((skill: string, index: number) => (
                                        <div key={index} className="flex gap-2 mb-2">
                                            <input
                                                type="text"
                                                value={skill}
                                                onChange={(e) => updateSkill(index, e.target.value)}
                                                className="input flex-1"
                                                placeholder="Enter skill"
                                            />
                                            {editData.skills.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeSkill(index)}
                                                    className="px-3 py-2 text-text-secondary hover:text-red-500 transition-colors"
                                                >
                                                    <X className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={addSkill}
                                        className="text-purple hover:text-purple-light text-sm mt-2 flex items-center gap-1"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add Skill
                                    </button>
                                </div>

                                {/* Resume / Portfolio Fields */}
                                <div className="pt-4 border-t border-border-default">
                                    <h3 className="text-sm font-semibold text-text-secondary mb-4">Resume & Portfolio</h3>

                                    <div className="mb-4">
                                        <label className="block text-sm font-medium mb-2 text-text-secondary">Education (one per line)</label>
                                        <textarea
                                            rows={3}
                                            value={(editData.education || []).join('\n')}
                                            onChange={(e) => setEditData({ ...editData, education: e.target.value.split('\n').filter((s: string) => s.trim()) })}
                                            className="input w-full resize-none"
                                            placeholder="e.g. B.Tech Computer Science — IIT Delhi, 2024"
                                        />
                                    </div>

                                    <div className="mb-4">
                                        <label className="block text-sm font-medium mb-2 text-text-secondary">Experience (one per line)</label>
                                        <textarea
                                            rows={3}
                                            value={(editData.experience || []).join('\n')}
                                            onChange={(e) => setEditData({ ...editData, experience: e.target.value.split('\n').filter((s: string) => s.trim()) })}
                                            className="input w-full resize-none"
                                            placeholder="e.g. Software Intern — Google, Summer 2023"
                                        />
                                    </div>

                                    <div className="mb-4">
                                        <label className="block text-sm font-medium mb-2 text-text-secondary">Projects (one per line)</label>
                                        <textarea
                                            rows={3}
                                            value={(editData.projects || []).join('\n')}
                                            onChange={(e) => setEditData({ ...editData, projects: e.target.value.split('\n').filter((s: string) => s.trim()) })}
                                            className="input w-full resize-none"
                                            placeholder="e.g. ENQUEbet — Collaborative idea platform"
                                        />
                                    </div>

                                    <div className="mb-4">
                                        <label className="block text-sm font-medium mb-2 text-text-secondary">LinkedIn URL</label>
                                        <input
                                            type="url"
                                            value={editData.linkedin_url || ''}
                                            onChange={(e) => setEditData({ ...editData, linkedin_url: e.target.value })}
                                            className="input w-full"
                                            placeholder="https://linkedin.com/in/yourname"
                                        />
                                    </div>

                                    <div className="mb-4">
                                        <label className="block text-sm font-medium mb-2 text-text-secondary">GitHub URL</label>
                                        <input
                                            type="url"
                                            value={editData.github_url || ''}
                                            onChange={(e) => setEditData({ ...editData, github_url: e.target.value })}
                                            className="input w-full"
                                            placeholder="https://github.com/yourname"
                                        />
                                    </div>

                                    <div className="mb-4">
                                        <label className="block text-sm font-medium mb-2 text-text-secondary">Portfolio URL</label>
                                        <input
                                            type="url"
                                            value={editData.portfolio_url || ''}
                                            onChange={(e) => setEditData({ ...editData, portfolio_url: e.target.value })}
                                            className="input w-full"
                                            placeholder="https://yoursite.com"
                                        />
                                    </div>

                                    <div className="mb-4">
                                        <label className="block text-sm font-medium mb-2 text-text-secondary">Resume File</label>
                                        <input
                                            type="file"
                                            accept=".pdf,.doc,.docx"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) setEditData({ ...editData, resume_file: file });
                                            }}
                                            className="input w-full file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-purple/15 file:text-purple-light hover:file:bg-purple/25 file:cursor-pointer"
                                        />
                                        {user?.resume_file && !editData.resume_file && (
                                            <p className="text-text-muted text-xs mt-1">Current file uploaded. Upload a new one to replace.</p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        onClick={handleSave}
                                        disabled={updating}
                                        className="btn-primary flex-1"
                                    >
                                        {updating ? 'Saving...' : 'Save Changes'}
                                    </button>
                                    <button
                                        onClick={handleCancel}
                                        disabled={updating}
                                        className="btn-outline"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Resume / Portfolio Section */}
                {!isEditing && ((user?.education?.length ?? 0) > 0 || (user?.experience?.length ?? 0) > 0 || (user?.projects?.length ?? 0) > 0 || user?.linkedin_url || user?.github_url || user?.portfolio_url || user?.resume_file) && (
                    <div className="w-full bg-[#171722] border border-[#252533] rounded-xl p-5 mb-6">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Briefcase className="w-5 h-5 text-purple" />
                            Resume
                        </h2>

                        {/* Education */}
                        {(user.education?.length ?? 0) > 0 && (
                            <div className="mb-5">
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">Education</h3>
                                <ul className="space-y-1.5">
                                    {user.education!.map((item: string, i: number) => (
                                        <li key={i} className="flex items-start gap-2 text-text-secondary text-sm">
                                            <GraduationCap className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Experience */}
                        {(user.experience?.length ?? 0) > 0 && (
                            <div className="mb-5">
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">Experience</h3>
                                <ul className="space-y-1.5">
                                    {user.experience!.map((item: string, i: number) => (
                                        <li key={i} className="flex items-start gap-2 text-text-secondary text-sm">
                                            <Briefcase className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Projects */}
                        {(user.projects?.length ?? 0) > 0 && (
                            <div className="mb-5">
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">Projects</h3>
                                <ul className="space-y-1.5">
                                    {user.projects!.map((item: string, i: number) => (
                                        <li key={i} className="flex items-start gap-2 text-text-secondary text-sm">
                                            <FolderOpen className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Links */}
                        {(user.linkedin_url || user.github_url || user.portfolio_url) && (
                            <div className="mb-5">
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">Links</h3>
                                <div className="flex flex-wrap gap-3">
                                    {user.linkedin_url && (
                                        <a href={user.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-primary hover:text-purple transition-colors">
                                            <ExternalLink className="w-3.5 h-3.5" /> LinkedIn
                                        </a>
                                    )}
                                    {user.github_url && (
                                        <a href={user.github_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-primary hover:text-purple transition-colors">
                                            <ExternalLink className="w-3.5 h-3.5" /> GitHub
                                        </a>
                                    )}
                                    {user.portfolio_url && (
                                        <a href={user.portfolio_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-primary hover:text-purple transition-colors">
                                            <ExternalLink className="w-3.5 h-3.5" /> Portfolio
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Resume Download */}
                        {user.resume_file && (
                            <div>
                                <a
                                    href={user.resume_file}
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

                {/* Tabs */}
                <div className="flex gap-1 bg-bg-card rounded-xl p-1 mb-4">
                    <button
                        onClick={() => setActiveTab('posts')}
                        className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'posts' ? 'bg-purple/15 text-purple-light shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
                    >
                        Your Posts
                    </button>
                    <button
                        onClick={() => setActiveTab('saved')}
                        className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'saved' ? 'bg-purple/15 text-purple-light shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
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
                                <div className="card text-center py-12">
                                    <p className="text-text-muted text-sm">No posts yet. Share your first idea!</p>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            {savedLoading ? (
                                <div className="card text-center py-12">
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
                                <div className="card text-center py-12">
                                    <Bookmark className="w-10 h-10 text-text-muted mx-auto mb-3 opacity-30" />
                                    <p className="text-text-muted text-sm">No saved posts yet. Bookmark posts to find them here!</p>
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
