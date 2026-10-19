"use client";

import React, { useState } from 'react';
import { X, AlertTriangle, Send } from 'lucide-react';

interface AdminRejectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (reason: string) => Promise<void>;
    itemTitle: string;
    itemType: 'resource' | 'paper';
}

export function AdminRejectModal({
    isOpen,
    onClose,
    onSubmit,
    itemTitle,
    itemType,
}: AdminRejectModalProps) {
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reason.trim()) {
            setError('Please provide feedback or the reason for rejection.');
            return;
        }

        try {
            setSubmitting(true);
            setError(null);
            await onSubmit(reason.trim());
            setReason('');
            onClose();
        } catch (err: any) {
            setError(err?.message || 'Failed to submit rejection. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="relative w-full max-w-lg bg-[#0e1018] border border-rose-500/30 rounded-xl shadow-2xl p-6 overflow-hidden">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-white">
                                Reject {itemType === 'paper' ? 'Research Paper' : 'Resource Submission'}
                            </h3>
                            <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">
                                {itemTitle}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        className="text-zinc-500 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                    Provide constructive feedback explaining why this submission cannot be approved at this time.
                    The uploader will receive a notification and will be able to review your feedback.
                </p>

                {error && (
                    <div className="mb-4 p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
                            Rejection Reason / Required Changes
                        </label>
                        <textarea
                            rows={4}
                            value={reason}
                            onChange={(e) => {
                                setReason(e.target.value);
                                if (error) setError(null);
                            }}
                            placeholder="e.g. Missing architectural circuit diagrams, corrupted PDF formatting, or insufficient methodology explanation..."
                            className="w-full px-3 py-2 text-xs bg-[#090a0f] border border-[#1b1e2c] focus:border-rose-500/50 rounded-lg text-white placeholder-zinc-600 focus:outline-none transition-colors"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#1b1e2c]">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={submitting}
                            className="px-3.5 py-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || !reason.trim()}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white disabled:opacity-50 transition-colors"
                        >
                            <Send className="w-3.5 h-3.5" />
                            {submitting ? 'Submitting...' : 'Reject Submission'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
