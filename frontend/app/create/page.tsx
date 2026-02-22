"use client";

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { api } from '@/lib/api';
import MediaUpload from '@/components/ui/MediaUpload';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import toast from 'react-hot-toast';

export default function CreatePostPage() {
    const router = useRouter();
    useRequireAuth();
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: 'tech',
        view_type: 'public',
        location: '',
        requirements: [''],
        tags: [''],
    });
    const [mediaFiles, setMediaFiles] = useState<File[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const submitPost = useCallback(async () => {
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
            });

            toast.success('Post created successfully!');
            router.push('/');
        } catch (err: any) {
            setError(err.message || 'Failed to create post');
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
                    <div className="grid grid-cols-2 gap-4">
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
                                <option value="public">Public</option>
                                <option value="college">College Only</option>
                                <option value="openidea">Open Idea</option>
                            </select>
                        </div>
                    </div>

                    {/* Location */}
                    <div className="card">
                        <label className="block text-sm font-medium mb-2">Location (Optional)</label>
                        <input
                            type="text"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            className="input w-full"
                            placeholder="e.g., Hyderabad, Bangalore"
                        />
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
                            className="text-purple hover:text-purple-light text-sm mt-2"
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
                            className="text-purple hover:text-purple-light text-sm mt-2"
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
                            className="btn-primary flex-1"
                        >
                            {loading ? 'Creating...' : 'Create Post'}
                        </button>
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="btn-outline"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
