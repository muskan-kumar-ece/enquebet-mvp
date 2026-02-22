"use client";

import { useMemo, useRef } from 'react';
import { Upload, X } from 'lucide-react';

interface MediaUploadProps {
    files: File[];
    onFilesChange: (files: File[]) => void;
    disabled?: boolean;
}

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

export default function MediaUpload({ files, onFilesChange, disabled = false }: MediaUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    const fileSummary = useMemo(() => {
        const totalBytes = files.reduce((sum, f) => sum + (f.size || 0), 0);
        return {
            count: files.length,
            totalBytes,
        };
    }, [files]);

    const openPicker = () => {
        if (disabled) return;
        inputRef.current?.click();
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
                disabled={disabled}
                onChange={(e) => {
                    const nextFiles = Array.from(e.target.files ?? []);
                    onFilesChange(nextFiles);
                }}
            />

            {files.length === 0 ? (
                <button
                    type="button"
                    data-testid="media-upload-button"
                    onClick={openPicker}
                    onKeyDown={(e) => {
                        // Spec: open only on click
                        if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
                    }}
                    disabled={disabled}
                    className="w-full h-48 border-2 border-dashed border-border-default rounded-lg hover:border-purple transition-colors flex flex-col items-center justify-center gap-3 bg-bg-hover/50"
                >
                    <Upload className="w-8 h-8 text-text-secondary" />
                    <div className="text-center">
                        <p className="text-text-primary font-medium">Click to upload media</p>
                        <p className="text-text-secondary text-sm mt-1">Images/videos supported</p>
                    </div>
                </button>
            ) : (
                <div className="border border-border-default rounded-lg p-4 bg-bg-hover/30">
                    <div className="flex items-center justify-between mb-3">
                        <div className="text-sm text-text-secondary">
                            {fileSummary.count} file{fileSummary.count === 1 ? '' : 's'} selected • {formatBytes(fileSummary.totalBytes)}
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                onFilesChange([]);
                                if (inputRef.current) inputRef.current.value = '';
                            }}
                            className="text-text-secondary hover:text-red-500 transition-colors text-sm"
                        >
                            Clear
                        </button>
                    </div>

                    <div className="space-y-2">
                        {files.map((file, idx) => (
                            <div key={`${file.name}-${idx}`} className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="text-sm truncate" data-testid="media-file-name">
                                        {file.name}
                                    </div>
                                    <div className="text-xs text-text-secondary">{formatBytes(file.size)} • {file.type || 'unknown'}</div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onFilesChange(files.filter((_, i) => i !== idx))}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
                                    }}
                                    className="p-2 text-text-secondary hover:text-red-500 transition-colors"
                                    aria-label={`Remove ${file.name}`}
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="mt-3">
                        <button
                            type="button"
                            data-testid="media-upload-button"
                            onClick={openPicker}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
                            }}
                            disabled={disabled}
                            className="text-purple hover:text-purple-light text-sm"
                        >
                            + Add / replace media
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
