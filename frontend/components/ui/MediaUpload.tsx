"use client";

import { useMemo, useRef, useEffect } from 'react';
import { Upload, X, Image as ImageIcon, Video, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

interface MediaUploadProps {
    files: File[];
    onFilesChange: (files: File[]) => void;
    disabled?: boolean;
    maxFiles?: number;
    maxSizePerFileBytes?: number;
}

const DEFAULT_MAX_FILES = 6;
const DEFAULT_MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

function formatBytes(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = bytes;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex += 1;
    }
    return `${value.toFixed(value < 10 && unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`;
}

export default function MediaUpload({
    files,
    onFilesChange,
    disabled = false,
    maxFiles = DEFAULT_MAX_FILES,
    maxSizePerFileBytes = DEFAULT_MAX_SIZE_BYTES,
}: MediaUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    // Create object URLs for image thumbnails and cleanly revoke them
    const previews = useMemo(() => {
        const map: Record<string, string> = {};
        files.forEach((file, idx) => {
            if (file.type.startsWith('image/')) {
                map[`${file.name}-${idx}`] = URL.createObjectURL(file);
            }
        });
        return map;
    }, [files]);

    useEffect(() => {
        return () => {
            Object.values(previews).forEach(url => URL.revokeObjectURL(url));
        };
    }, [previews]);

    const fileSummary = useMemo(() => {
        const totalBytes = files.reduce((sum, f) => sum + (f.size || 0), 0);
        return {
            count: files.length,
            totalBytes,
        };
    }, [files]);

    const openPicker = () => {
        if (disabled) return;
        if (inputRef.current) {
            inputRef.current.value = '';
            inputRef.current.click();
        }
    };

    const handleFileSelection = (selectedList: File[]) => {
        if (!selectedList.length) return;

        // 1. Check size limit
        const validSizeFiles: File[] = [];
        const oversizedFiles: File[] = [];

        selectedList.forEach(file => {
            if (file.size > maxSizePerFileBytes) {
                oversizedFiles.push(file);
            } else {
                validSizeFiles.push(file);
            }
        });

        if (oversizedFiles.length > 0) {
            toast.error(
                oversizedFiles.length === 1
                    ? `File "${oversizedFiles[0].name}" exceeds ${formatBytes(maxSizePerFileBytes)} limit.`
                    : `${oversizedFiles.length} files exceed ${formatBytes(maxSizePerFileBytes)} limit.`
            );
        }

        if (validSizeFiles.length === 0) return;

        // 2. Cumulative merge and deduplicate
        const existingKeys = new Set(files.map(f => `${f.name}-${f.size}-${f.lastModified}`));
        const newUniqueFiles = validSizeFiles.filter(f => !existingKeys.has(`${f.name}-${f.size}-${f.lastModified}`));

        const combined = [...files, ...newUniqueFiles];

        if (combined.length > maxFiles) {
            toast.error(`Maximum ${maxFiles} media files allowed. Added first ${maxFiles - files.length}.`);
            onFilesChange(combined.slice(0, maxFiles));
        } else {
            onFilesChange(combined);
        }
    };

    const handleRemove = (indexToRemove: number) => {
        onFilesChange(files.filter((_, idx) => idx !== indexToRemove));
        if (inputRef.current) inputRef.current.value = '';
    };

    return (
        <div>
            <input
                ref={inputRef}
                data-testid="media-input"
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                disabled={disabled || files.length >= maxFiles}
                onChange={(e) => {
                    const nextFiles = Array.from(e.target.files ?? []);
                    handleFileSelection(nextFiles);
                }}
            />

            {files.length === 0 ? (
                <button
                    type="button"
                    data-testid="media-upload-button"
                    onClick={openPicker}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
                    }}
                    disabled={disabled}
                    className="w-full h-48 border-2 border-dashed border-border-default rounded-xl hover:border-brand-primary/80 transition-all flex flex-col items-center justify-center gap-3 bg-bg-hover/30 hover:bg-bg-hover/60 group"
                >
                    <div className="w-12 h-12 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Upload className="w-6 h-6 text-brand-light" />
                    </div>
                    <div className="text-center px-4">
                        <p className="text-text-primary font-medium">Click to upload media</p>
                        <p className="text-text-secondary text-xs mt-1">
                            Up to {maxFiles} images or videos • Max {formatBytes(maxSizePerFileBytes)} each
                        </p>
                    </div>
                </button>
            ) : (
                <div className="border border-border-default rounded-xl p-4 bg-bg-hover/20">
                    {/* Header Summary */}
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-border-default/60">
                        <div className="text-xs font-medium text-text-secondary">
                            <span className="text-brand-light font-semibold">{fileSummary.count}</span> of {maxFiles} files selected • {formatBytes(fileSummary.totalBytes)}
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                onFilesChange([]);
                                if (inputRef.current) inputRef.current.value = '';
                            }}
                            className="text-text-secondary hover:text-red-400 transition-colors text-xs font-medium"
                        >
                            Clear all
                        </button>
                    </div>

                    {/* Thumbnail Preview Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                        {files.map((file, idx) => {
                            const previewUrl = previews[`${file.name}-${idx}`];
                            const isVideo = file.type.startsWith('video/');

                            return (
                                <div
                                    key={`${file.name}-${idx}`}
                                    className="relative group rounded-lg overflow-hidden border border-[#252533] bg-[#0d1017] aspect-video flex flex-col items-center justify-center"
                                >
                                    {previewUrl ? (
                                        <img
                                            src={previewUrl}
                                            alt={file.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : isVideo ? (
                                        <div className="flex flex-col items-center justify-center text-text-secondary">
                                            <Video className="w-8 h-8 text-brand-light mb-1" />
                                            <span className="text-[10px] uppercase font-bold tracking-wider">Video</span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center text-text-secondary">
                                            <ImageIcon className="w-8 h-8 text-text-muted mb-1" />
                                            <span className="text-[10px] uppercase font-bold tracking-wider">Media</span>
                                        </div>
                                    )}

                                    {/* Overlay with info and delete */}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-between">
                                        <div className="flex justify-end">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRemove(idx);
                                                }}
                                                className="w-6 h-6 rounded-full bg-red-500/80 hover:bg-red-500 text-white flex items-center justify-center transition-colors"
                                                aria-label={`Remove ${file.name}`}
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                        <div>
                                            <p className="text-[11px] text-white font-medium truncate" data-testid="media-file-name">
                                                {file.name}
                                            </p>
                                            <p className="text-[10px] text-zinc-300">
                                                {formatBytes(file.size)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Add More Button if under max limit */}
                    {files.length < maxFiles && (
                        <button
                            type="button"
                            data-testid="media-upload-button"
                            onClick={openPicker}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
                            }}
                            disabled={disabled}
                            className="w-full py-2 px-3 border border-dashed border-border-default hover:border-brand-primary/60 rounded-lg text-xs font-medium text-brand-light flex items-center justify-center gap-1.5 hover:bg-brand-primary/5 transition-colors"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add more photos/videos ({maxFiles - files.length} remaining)</span>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
