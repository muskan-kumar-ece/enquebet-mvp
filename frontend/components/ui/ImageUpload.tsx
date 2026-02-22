"use client";

import { useRef, useState } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';

const PLACEHOLDER_VALUES = ['your_cloud_name', 'your-cloud-name', '', 'undefined'];

function getCloudinaryConfig() {
    const cloudName = (process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '').trim();
    const uploadPreset = (process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'enquebet_uploads').trim();

    // Detect placeholder values that were never replaced
    const isPlaceholder = !cloudName || PLACEHOLDER_VALUES.includes(cloudName.toLowerCase());

    return {
        cloudName: isPlaceholder ? '' : cloudName,
        uploadPreset,
        isConfigured: !isPlaceholder,
    };
}

/** Try uploading through the backend /api/v1/uploads/image/ endpoint */
async function uploadViaBackend(file: File): Promise<string> {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1';
    const token = typeof window !== 'undefined'
        ? localStorage.getItem('accessToken')
        : null;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'enquebet/avatars');

    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${apiUrl}/uploads/image/`, {
        method: 'POST',
        headers,
        body: formData,
    });

    if (!res.ok) {
        const text = await res.text();
        let msg = `Server upload failed (${res.status})`;
        try {
            const json = JSON.parse(text);
            msg = json?.error || json?.detail || json?.message || msg;
        } catch { /* ignore */ }
        throw new Error(msg);
    }

    const data = await res.json();
    return data.url;
}

async function getCloudinaryErrorMessage(response: Response): Promise<string> {
    const fallback = `Upload failed (${response.status})`;
    try {
        const text = await response.text();
        if (!text) return fallback;
        try {
            const json = JSON.parse(text);
            const msg = json?.error?.message || json?.message || json?.detail;
            return typeof msg === 'string' && msg.trim() ? msg : fallback;
        } catch {
            return text.trim() || fallback;
        }
    } catch {
        return fallback;
    }
}

async function uploadImage(file: File, cloudName: string, uploadPreset: string): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);

    const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: 'POST', body: formData }
    );

    if (!response.ok) {
        const message = await getCloudinaryErrorMessage(response);
        throw new Error(message);
    }

    const data = await response.json();
    return data.secure_url;
}

interface ImageUploadProps {
    onImageUploaded: (url: string) => void;
    currentImage?: string;
    className?: string;
}

export default function ImageUpload({ onImageUploaded, currentImage, className = '' }: ImageUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState<string | null>(currentImage || null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image must be less than 5MB');
            return;
        }

        // Show preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreview(reader.result as string);
        };
        reader.readAsDataURL(file);

        // Upload
        setUploading(true);
        try {
            const { cloudName, uploadPreset, isConfigured } = getCloudinaryConfig();
            let url: string;

            if (isConfigured) {
                // Try Cloudinary direct upload first
                try {
                    url = await uploadImage(file, cloudName, uploadPreset);
                } catch (cloudErr) {
                    console.warn('Cloudinary direct upload failed, trying backend fallback:', cloudErr);
                    url = await uploadViaBackend(file);
                }
            } else {
                // No Cloudinary config on frontend — use backend endpoint
                url = await uploadViaBackend(file);
            }

            onImageUploaded(url);
            toast.success('Image uploaded successfully!');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to upload image';
            console.warn('Image upload failed:', message);
            toast.error(message || 'Failed to upload image');
            setPreview(null);
        } finally {
            setUploading(false);
        }
    };

    const handleRemove = () => {
        setPreview(null);
        onImageUploaded('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className={className}>
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                disabled={uploading}
            />

            {preview ? (
                <div className="relative group">
                    <img
                        src={preview}
                        alt="Upload preview"
                        className="w-full h-48 object-cover rounded-lg border border-border-default"
                    />
                    <button
                        type="button"
                        onClick={handleRemove}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                            }
                        }}
                        className="absolute top-2 right-2 p-2 bg-bg-primary/80 backdrop-blur rounded-full hover:bg-red-500 transition-colors"
                        disabled={uploading}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(e) => {
                        // Spec: file manager opens ONLY on click (not Enter/Space)
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                        }
                    }}
                    disabled={uploading}
                    className="w-full h-48 border-2 border-dashed border-border-default rounded-lg hover:border-purple transition-colors flex flex-col items-center justify-center gap-3 bg-bg-hover/50"
                >
                    {uploading ? (
                        <>
                            <div className="w-8 h-8 border-2 border-purple border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-text-secondary">Uploading...</p>
                        </>
                    ) : (
                        <>
                            <Upload className="w-8 h-8 text-text-secondary" />
                            <div className="text-center">
                                <p className="text-text-primary font-medium">Click to upload image</p>
                                <p className="text-text-secondary text-sm mt-1">PNG, JPG up to 5MB</p>
                            </div>
                        </>
                    )}
                </button>
            )}
        </div>
    );
}

// Simple avatar upload variant
export function AvatarUpload({ onImageUploaded, currentImage }: ImageUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState<string | null>(currentImage || null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image must be less than 5MB');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setPreview(reader.result as string);
        };
        reader.readAsDataURL(file);

        setUploading(true);
        try {
            const { cloudName, uploadPreset, isConfigured } = getCloudinaryConfig();
            let url: string;

            if (isConfigured) {
                try {
                    url = await uploadImage(file, cloudName, uploadPreset);
                } catch (cloudErr) {
                    console.warn('Cloudinary direct upload failed, trying backend fallback:', cloudErr);
                    url = await uploadViaBackend(file);
                }
            } else {
                url = await uploadViaBackend(file);
            }

            onImageUploaded(url);
            toast.success('Profile picture updated!');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to upload image';
            console.warn('Avatar upload failed:', message);
            toast.error(message || 'Failed to upload image');
            setPreview(null);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="relative">
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                disabled={uploading}
            />

            <div
                onClick={() => fileInputRef.current?.click()}
                className="w-32 h-32 rounded-full border-4 border-purple/30 overflow-hidden cursor-pointer hover:border-purple transition-colors relative group"
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                    }
                }}
                role="button"
                tabIndex={0}
            >
                {preview ? (
                    <img src={preview} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-purple flex items-center justify-center">
                        <ImageIcon className="w-12 h-12 text-white/50" />
                    </div>
                )}

                {uploading && (
                    <div className="absolute inset-0 bg-bg-primary/80 flex items-center justify-center">
                        <div className="w-8 h-8 border-2 border-purple border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}

                <div className="absolute inset-0 bg-bg-primary/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                </div>
            </div>
        </div>
    );
}
