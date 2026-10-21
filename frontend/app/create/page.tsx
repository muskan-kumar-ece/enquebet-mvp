"use client";

import { useCallback, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { X, MapPin, Globe, GraduationCap, RefreshCw, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { requestUserCoordinates } from '@/lib/geo';
import MediaUpload from '@/components/ui/MediaUpload';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import toast from 'react-hot-toast';

export default function CreatePostPage() {
    const router = useRouter();
    const { user } = useRequireAuth();
    const isSubmittingRef = useRef(false);
    const clientPostIdRef = useRef<string>(
        typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `post_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    );
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: 'tech',
        view_type: 'public',
        college: '',
        location: '',
        city: '',
        latitude: undefined as number | undefined,
        longitude: undefined as number | undefined,
        is_remote: false,
        requirements: [''],
        tags: [''],
    });
    const [detectingLocation, setDetectingLocation] = useState(false);
    const [mediaFiles, setMediaFiles] = useState<File[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (user?.college && !formData.college) {
            setFormData(prev => ({ ...prev, college: user.college || '' }));
        }
    }, [user, formData.college]);

    const handleDetectLocation = async () => {
        setDetectingLocation(true);
        try {
            const coords = await requestUserCoordinates({ forceRefresh: true });
            if (coords) {
                setFormData(prev => ({
                    ...prev,
                    latitude: coords.latitude,
                    longitude: coords.longitude,
                    city: coords.city || prev.city,
                    location: coords.city || prev.location || `${coords.latitude}, ${coords.longitude}`,
                }));
                toast.success(`Location set: ${coords.city || 'Coarse GPS coordinates captured'}`);
            } else {
                toast.error('Location permission was denied or unavailable');
            }
        } catch {
            toast.error('Could not determine current location');
        } finally {
            setDetectingLocation(false);
        }
    };

    const submitPost = useCallback(async () => {
        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;
        setError('');
        setLoading(true);

        try {
            const cleanedData = {
                ...formData,
                requirements: formData.requirements.filter(r => r.trim()),
                tags: formData.tags.filter(t => t.trim()),
            };

            await api.createPost({
                ...cleanedData,
                media: mediaFiles,
                client_post_id: clientPostIdRef.current,
            });

            toast.success('Post created successfully!');
            router.push('/');
        } catch (err: any) {
            setError(err.message || 'Failed to create post');
            isSubmittingRef.current = false;
        } finally {
            setLoading(false);
        }
    }, [formData, mediaFiles, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await submitPost();
    };

    const addRequirement = () => {
        setFormData({ ...formData, requirements: [...formData.requirements, ''] });
    };

    const updateRequirement = (index: number, value: string) => {
        const newReqs = [...formData.requirements];
        newReqs[index] = value;
        setFormData({ ...formData, requirements: newReqs });
    };

    const removeRequirement = (index: number) => {
        setFormData({
            ...formData,
            requirements: formData.requirements.filter((_, i) => i !== index),
        });
    };

    const addTag = () => {
        setFormData({ ...formData, tags: [...formData.tags, ''] });
    };

    const updateTag = (index: number, value: string) => {
        const newTags = [...formData.tags];
        newTags[index] = value;
        setFormData({ ...formData, tags: newTags });
    };

    const removeTag = (index: number) => {
        setFormData({
            ...formData,
            tags: formData.tags.filter((_, i) => i !== index),
        });
    };

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold">Create New Post</h1>
                    <p className="text-text-secondary mt-2">Share your idea and find collaborators</p>
                </div>

                {/* Form */}
                <form
                    onSubmit={handleSubmit}
                    onKeyDownCapture={(e) => {
                        if (e.key !== 'Enter') return;
                        const target = e.target as HTMLElement | null;
                        const tag = target?.tagName?.toLowerCase();

                        // Allow newline in textarea; allow Ctrl/Cmd+Enter to submit.
                        if (tag === 'textarea') {
                            if (e.ctrlKey || e.metaKey) {
                                e.preventDefault();
                                if (!loading) {
                                    void submitPost();
                                }
                            }
                            return;
                        }

                        // Spec: Enter must NOT submit globally or open file picker.
                        e.preventDefault();
                    }}
                    className="space-y-6"
                >
                    {error && (
                        <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    {/* Title */}
                    <div className="card">
                        <label className="block text-sm font-medium mb-2">Title *</label>
                        <input
                            type="text"
                            required
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="input w-full"
                            placeholder="Looking for a Backend Developer for SaaS Project"
                        />
                    </div>

                    {/* Description */}
                    <div className="card">
                        <label className="block text-sm font-medium mb-2">Description *</label>
                        <textarea
                            required
                            rows={6}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="input w-full resize-none"
                            placeholder="Describe your idea, what you're building, and what kind of help you need..."
                        />
                    </div>

                    {/* Category & View Type */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="card">
                            <label className="block text-sm font-medium mb-2">Category</label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                className="input w-full"
                            >
                                <option value="tech">Technology</option>
                                <option value="business">Business</option>
                                <option value="design">Design</option>
                                <option value="research">Research</option>
                                <option value="social">Social Impact</option>
                                <option value="education">Education</option>
                                <option value="health">Health</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        <div className="card">
                            <label className="block text-sm font-medium mb-2">Visibility</label>
                            <select
                                value={formData.view_type}
                                onChange={(e) => setFormData({ ...formData, view_type: e.target.value })}
                                className="input w-full"
                            >
                                <option value="public">Public (Ripple Discovery)</option>
                                <option value="college">College Only (Campus Exclusive)</option>
                                <option value="openidea">Open Idea (Collaborative brainstorming)</option>
                            </select>
                        </div>
                    </div>

                    {/* College Specification (when College Only is chosen) */}
                    {formData.view_type === 'college' && (
                        <div className="card bg-brand-primary/5 border border-brand-primary/20">
                            <label className="block text-sm font-medium text-brand-light mb-1.5 flex items-center gap-1.5">
                                <GraduationCap className="w-4 h-4" /> University / College Campus
                            </label>
                            <p className="text-text-muted text-xs mb-2.5">
                                Only students from this campus will be able to see and collaborate on this project.
                            </p>
                            <input
                                type="text"
                                value={formData.college}
                                onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                                className="input w-full"
                                placeholder="e.g., IIT Bombay, BITS Pilani, MIT"
                                required
                            />
                        </div>
                    )}

                    {/* Remote or In-Person Proximity */}
                    <div className="card space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <label className="text-sm font-medium text-text-primary flex items-center gap-1.5">
                                    <Globe className="w-4 h-4 text-emerald-400" /> Remote Friendly Project
                                </label>
                                <p className="text-text-muted text-xs mt-0.5">
                                    Allows builders globally to discover and contribute regardless of physical distance.
                                </p>
                            </div>
                            <input
                                type="checkbox"
                                checked={formData.is_remote}
                                onChange={(e) => setFormData({ ...formData, is_remote: e.target.checked })}
                                className="w-4 h-4 rounded text-brand-primary focus:ring-brand-primary cursor-pointer"
                            />
                        </div>

                        {!formData.is_remote && (
                            <div className="pt-3 border-t border-[#252533] space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-text-primary flex items-center gap-1.5">
                                        <MapPin className="w-4 h-4 text-blue-400" /> Physical / Campus Location
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleDetectLocation}
                                        disabled={detectingLocation}
                                        className="text-xs text-brand-light hover:text-white flex items-center gap-1.5 font-medium px-2 py-1 rounded-md hover:bg-brand-primary/10 active:bg-brand-primary/20 active:scale-95 transition-all select-none touch-manipulation disabled:opacity-50"
                                    >
                                        <RefreshCw className={`w-3 h-3 ${detectingLocation ? 'animate-spin' : ''}`} />
                                        <span>{detectingLocation ? 'Detecting...' : 'Detect GPS Coarse'}</span>
                                    </button>
                                </div>
                                <p className="text-text-muted text-xs">
                                    Projects expand in ripple waves (0–5 km first 12h, 5–50 km next 36h, then nationwide). Coarse privacy (~1 km) is strictly enforced.
                                </p>
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    className="input w-full"
                                    placeholder="e.g., Powai, Mumbai or Bangalore"
                                />
                                {formData.latitude !== undefined && formData.longitude !== undefined && (
                                    <div className="text-[11px] text-blue-400/90 flex items-center gap-1 mt-1">
                                        <MapPin className="w-3 h-3" />
                                        <span>Coordinates pinned: {formData.latitude.toFixed(2)}, {formData.longitude.toFixed(2)} {formData.city ? `(${formData.city})` : ''}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Requirements */}
                    <div className="card">
                        <label className="block text-sm font-medium mb-2">Requirements</label>
                        <p className="text-text-secondary text-sm mb-3">
                            What skills or roles are you looking for?
                        </p>

                        {formData.requirements.map((req, index) => (
                            <div key={index} className="flex gap-2 mb-2">
                                <input
                                    type="text"
                                    value={req}
                                    onChange={(e) => updateRequirement(index, e.target.value)}
                                    className="input flex-1"
                                    placeholder="e.g., Backend Developer with Node.js"
                                />
                                {formData.requirements.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeRequirement(index)}
                                        className="px-3 py-2 text-text-secondary hover:text-red-500 transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        ))}

                        <button
                            type="button"
                            onClick={addRequirement}
                            className="text-brand-light hover:text-white text-sm mt-2 font-medium"
                        >
                            + Add Requirement
                        </button>
                    </div>

                    {/* Tags */}
                    <div className="card">
                        <label className="block text-sm font-medium mb-2">Tags</label>
                        <p className="text-text-secondary text-sm mb-3">
                            Add tags to help people find your post
                        </p>

                        {formData.tags.map((tag, index) => (
                            <div key={index} className="flex gap-2 mb-2">
                                <input
                                    type="text"
                                    value={tag}
                                    onChange={(e) => updateTag(index, e.target.value)}
                                    className="input flex-1"
                                    placeholder="e.g., AI, SaaS, Mobile"
                                />
                                {formData.tags.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeTag(index)}
                                        className="px-3 py-2 text-text-secondary hover:text-red-500 transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        ))}

                        <button
                            type="button"
                            onClick={addTag}
                            className="text-brand-light hover:text-white text-sm mt-2 font-medium"
                        >
                            + Add Tag
                        </button>
                    </div>

                    {/* Attachments */}
                    <div className="card">
                        <label className="block text-sm font-medium mb-2">Media (Optional)</label>
                        <p className="text-text-secondary text-sm mb-3">
                            Add images or videos to showcase your idea
                        </p>
                        <MediaUpload
                            files={mediaFiles}
                            onFilesChange={setMediaFiles}
                            disabled={loading}
                        />
                    </div>

                    {/* Submit Buttons */}
                    <div className="flex gap-4">
                        <button
                            type="submit"
                            disabled={loading}
                            data-loading={loading}
                            aria-busy={loading}
                            className="btn-primary flex-1 flex items-center justify-center gap-2 select-none touch-manipulation"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
                            <span>{loading ? 'Creating Post...' : 'Create Post'}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => router.back()}
                            disabled={loading}
                            className="btn-outline select-none touch-manipulation"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
