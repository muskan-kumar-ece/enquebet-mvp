"use client";

import React, { useState, useRef } from 'react';
import {
    X,
    Upload,
    Link as LinkIcon,
    FileText,
    AlertCircle,
    Loader2,
    ShieldAlert,
} from 'lucide-react';
import { api } from '@/lib/api';
import { RESOURCE_CATEGORIES, FILE_TYPES, formatBytes } from '@/lib/resourcesData';

interface UploadResourceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (resource: any) => void;
}

export function UploadResourceModal({ isOpen, onClose, onSuccess }: UploadResourceModalProps) {
    const [mode, setMode] = useState<'file' | 'link'>('file');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [externalLink, setExternalLink] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<string>('SYSTEM_DESIGN_SPECS');
    const [fileType, setFileType] = useState<string>('PDF');
    const [tagsInput, setTagsInput] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileSelect = (file: File) => {
        setSelectedFile(file);
        setError(null);

        // Auto infer title if empty
        if (!title.trim()) {
            const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
            setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
        }

        // Auto detect file type
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext === 'pdf') setFileType('PDF');
        else if (ext === 'docx' || ext === 'doc') setFileType('DOCX');
        else if (ext === 'pptx' || ext === 'ppt') setFileType('PPTX');
        else if (ext === 'txt') setFileType('TXT');
        else if (ext === 'md') setFileType('MARKDOWN');
        else if (ext === 'epub') setFileType('EPUB');
        else if (ext === 'zip' || ext === 'tar.gz') setFileType('ZIP');
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!title.trim() || title.length < 5) {
            setError('Please provide a title with at least 5 characters.');
            return;
        }

        if (!description.trim() || description.length < 15) {
            setError('Please provide a description of at least 15 characters.');
            return;
        }

        if (mode === 'file' && !selectedFile) {
            setError('Please select or drop a document file to upload.');
            return;
        }

        if (mode === 'link' && (!externalLink.trim() || !externalLink.startsWith('http'))) {
            setError('Please provide a valid web URL starting with http:// or https://');
            return;
        }

        try {
            setIsSubmitting(true);
            let uploadedUrl = '';
            let originalFilename = '';
            let fileSizeBytes: number | undefined = undefined;
            let finalFileType = fileType;

            if (mode === 'file' && selectedFile) {
                setUploadProgress('Uploading document to secure storage...');
                const uploadRes = await api.uploadDocument(selectedFile);
                uploadedUrl = uploadRes.url;
                originalFilename = uploadRes.original_filename;
                fileSizeBytes = uploadRes.file_size_bytes;
                if (uploadRes.file_type) finalFileType = uploadRes.file_type;
            } else {
                uploadedUrl = '';
                finalFileType = 'LINK';
            }

            setUploadProgress('Submitting resource for admin verification...');
            const tags = tagsInput
                .split(',')
                .map((t) => t.trim().toLowerCase())
                .filter(Boolean);

            const payload = {
                title: title.trim(),
                description: description.trim(),
                category,
                file_type: finalFileType,
                file_url: uploadedUrl,
                original_filename: originalFilename,
                file_size_bytes: fileSizeBytes,
                external_link: mode === 'link' ? externalLink.trim() : '',
                tags,
            };

            const created = await api.createResource(payload);
            onSuccess(created);
            onClose();
        } catch (err: any) {
            setError(err?.message || 'Failed to submit resource. Please verify your inputs.');
        } finally {
            setIsSubmitting(false);
            setUploadProgress(null);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
            <div className="relative w-full max-w-2xl bg-[#0e1018] border border-[#1b1e2c] rounded-xl shadow-2xl p-6 my-8">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-[#1b1e2c]">
                    <div>
                        <h2 className="text-lg font-bold text-white">Upload Engineering Resource</h2>
                        <p className="text-xs text-zinc-400 mt-0.5">
                            Contribute books, system architecture specs, whitepapers, or code starters to the community.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="text-zinc-500 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Verification Notice */}
                <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-start gap-2.5">
                    <ShieldAlert className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                        <span className="font-semibold text-blue-200">Admin Approval Notice: </span>
                        To maintain technical quality, community uploads enter the admin review queue before appearing in the public catalog. You can track review status under &ldquo;My Submissions&rdquo;.
                    </div>
                </div>

                {error && (
                    <div className="mt-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                    {/* Mode Toggle: File vs External Link */}
                    <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-[#090a0f] border border-[#1b1e2c]">
                        <button
                            type="button"
                            onClick={() => setMode('file')}
                            className={`flex items-center justify-center gap-2 py-2 rounded-md text-xs font-medium transition-all ${
                                mode === 'file'
                                    ? 'bg-[#181a26] text-white shadow-xs border border-[#262a3e]'
                                    : 'text-zinc-400 hover:text-white'
                            }`}
                        >
                            <Upload className="w-3.5 h-3.5" />
                            Upload File (PDF, DOCX, ZIP, PPTX, TXT)
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('link')}
                            className={`flex items-center justify-center gap-2 py-2 rounded-md text-xs font-medium transition-all ${
                                mode === 'link'
                                    ? 'bg-[#181a26] text-white shadow-xs border border-[#262a3e]'
                                    : 'text-zinc-400 hover:text-white'
                            }`}
                        >
                            <LinkIcon className="w-3.5 h-3.5" />
                            External Link / Git Repo
                        </button>
                    </div>

                    {/* Mode: File Dropzone */}
                    {mode === 'file' ? (
                        <div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf,.docx,.doc,.txt,.md,.pptx,.ppt,.zip,.tar.gz,.epub"
                                className="hidden"
                                onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                        handleFileSelect(e.target.files[0]);
                                    }
                                }}
                            />
                            <div
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                                    selectedFile
                                        ? 'border-blue-500/50 bg-blue-500/5'
                                        : 'border-[#1b1e2c] hover:border-[#2f3552] bg-[#090a0f]'
                                }`}
                            >
                                {selectedFile ? (
                                    <div className="flex items-center justify-center gap-3">
                                        <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                            <FileText className="w-6 h-6" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-xs font-semibold text-white">
                                                {selectedFile.name}
                                            </p>
                                            <p className="text-[11px] font-mono text-zinc-400 mt-0.5">
                                                {formatBytes(selectedFile.size)} · Format: {fileType}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <Upload className="w-7 h-7 text-zinc-500 mx-auto mb-2" />
                                        <p className="text-xs font-medium text-white">
                                            Click to browse or drop document here
                                        </p>
                                        <p className="text-[11px] text-zinc-500 mt-1">
                                            Supports PDF, Word (.docx), Presentation (.pptx), Text, Markdown, ZIP (Max 50MB)
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div>
                            <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1">
                                External Resource URL
                            </label>
                            <input
                                type="url"
                                value={externalLink}
                                onChange={(e) => setExternalLink(e.target.value)}
                                placeholder="https://github.com/... or https://arxiv.org/..."
                                className="w-full px-3 py-2 text-xs bg-[#090a0f] border border-[#1b1e2c] focus:border-blue-500/50 rounded-lg text-white placeholder-zinc-600 focus:outline-none"
                            />
                        </div>
                    )}

                    {/* Title */}
                    <div>
                        <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1">
                            Resource Title *
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Distributed Consensus Protocols in Go & Rust"
                            className="w-full px-3 py-2 text-xs bg-[#090a0f] border border-[#1b1e2c] focus:border-blue-500/50 rounded-lg text-white placeholder-zinc-600 focus:outline-none"
                        />
                    </div>

                    {/* Category & Format Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1">
                                Category *
                            </label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full px-3 py-2 text-xs bg-[#090a0f] border border-[#1b1e2c] focus:border-blue-500/50 rounded-lg text-white focus:outline-none"
                            >
                                {RESOURCE_CATEGORIES.filter((c) => c.id !== 'ALL').map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1">
                                File Format
                            </label>
                            <select
                                value={fileType}
                                onChange={(e) => setFileType(e.target.value)}
                                disabled={mode === 'link'}
                                className="w-full px-3 py-2 text-xs bg-[#090a0f] border border-[#1b1e2c] focus:border-blue-500/50 rounded-lg text-white focus:outline-none disabled:opacity-50"
                            >
                                {FILE_TYPES.filter((f) => f.id !== 'ALL').map((f) => (
                                    <option key={f.id} value={f.id}>
                                        {f.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1">
                            Technical Description / Summary *
                        </label>
                        <textarea
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Detail what this document covers, target audience, prerequisites, or architecture specifics..."
                            className="w-full px-3 py-2 text-xs bg-[#090a0f] border border-[#1b1e2c] focus:border-blue-500/50 rounded-lg text-white placeholder-zinc-600 focus:outline-none"
                        />
                    </div>

                    {/* Tags */}
                    <div>
                        <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1">
                            Tags (comma separated)
                        </label>
                        <input
                            type="text"
                            value={tagsInput}
                            onChange={(e) => setTagsInput(e.target.value)}
                            placeholder="e.g. distributed-systems, rust, freertos, consensus"
                            className="w-full px-3 py-2 text-xs bg-[#090a0f] border border-[#1b1e2c] focus:border-blue-500/50 rounded-lg text-white placeholder-zinc-600 focus:outline-none"
                        />
                    </div>

                    {/* Submit Bar */}
                    <div className="pt-3 border-t border-[#1b1e2c] flex items-center justify-between">
                        <span className="text-[11px] font-mono text-zinc-500">
                            {uploadProgress || 'Will be queued for admin approval'}
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isSubmitting}
                                className="px-3.5 py-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white disabled:opacity-50 transition-colors shadow-xs"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-3.5 h-3.5" />
                                        Submit for Review
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
